"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import * as THREE from "three";
import type { RepoGraph } from "@/lib/analysisTypes";
import { createNodeMaterial } from "./nodeMaterial";
import { syncNodeMaterial } from "./pulses";
import { layoutRepo } from "./Universe";

/*
 * Interactive repository explorer. Drag to orbit, scroll to zoom, click a file.
 * The selected file grows and turns white, its imports light up, everything
 * else dims, and the camera flies to it.
 */

type Props = {
  graph: RepoGraph;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onHover: (index: number | null) => void;
};

type Controls = { target: THREE.Vector3; update: () => void };

function ExplorerGraph({ graph, selected, onSelect, onHover }: Props) {
  const nodesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const fly = useRef<{ target: THREE.Vector3; until: number } | null>(null);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;

  const material = useMemo(() => createNodeMaterial(340), []);
  const { nodes, links } = useMemo(() => layoutRepo(graph), [graph]);

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(nodes.map((n) => n.p));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(nodes.map((n) => n.size)), 1));
    const c = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => n.color.toArray(c, i * 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(c, 3));
    return g;
  }, [nodes]);

  const lineGeo = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    links.forEach(([a, b]) => {
      pos.push(...nodes[a].p.toArray(), ...nodes[b].p.toArray());
      col.push(...nodes[a].color.toArray(), ...nodes[b].color.toArray());
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [nodes, links]);

  // Bright lines for the selected file's imports and importers.
  const focusGeo = useMemo(() => {
    const pos: number[] = [];
    if (selected !== null) {
      for (const [a, b] of links) if (a === selected || b === selected) pos.push(...nodes[a].p.toArray(), ...nodes[b].p.toArray());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [selected, links, nodes]);

  useEffect(() => () => focusGeo.dispose(), [focusGeo]);
  useEffect(
    () => () => {
      material.dispose();
      nodeGeo.dispose();
      lineGeo.dispose();
    },
    [material, nodeGeo, lineGeo],
  );

  // Highlight: selected node big and white, neighbours normal, the rest dimmed.
  useEffect(() => {
    const pts = nodesRef.current;
    if (!pts) return;
    const size = pts.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const color = pts.geometry.getAttribute("aColor") as THREE.BufferAttribute;
    const near = new Set<number>();
    if (selected !== null) for (const [a, b] of links) if (a === selected) near.add(b); else if (b === selected) near.add(a);
    const tmp = new THREE.Color();
    nodes.forEach((n, i) => {
      const isSel = i === selected;
      size.setX(i, isSel ? n.size * 2.2 : n.size);
      tmp.copy(isSel ? new THREE.Color("#ffffff") : n.color);
      if (selected !== null && !isSel && !near.has(i)) tmp.multiplyScalar(0.25);
      color.setXYZ(i, tmp.r, tmp.g, tmp.b);
    });
    size.needsUpdate = true;
    color.needsUpdate = true;
    if (linesRef.current) (linesRef.current.material as THREE.LineBasicMaterial).opacity = selected === null ? 0.3 : 0.08;
    if (selected !== null) fly.current = { target: nodes[selected].p.clone(), until: performance.now() + 1400 };
  }, [selected, nodes, links]);

  useFrame((state, delta) => {
    // Points are tiny, so pick with a tight radius.
    if (state.raycaster.params.Points?.threshold !== 0.14) state.raycaster.params.Points = { threshold: 0.14 };
    if (nodesRef.current) syncNodeMaterial(nodesRef.current, state.gl.getPixelRatio());
    const f = fly.current;
    if (!f || !controls) return;
    // Ease the orbit target onto the node and bring the camera within a comfortable distance.
    const k = 1 - Math.pow(0.002, delta);
    controls.target.lerp(f.target, k);
    const cam = state.camera;
    const offset = cam.position.clone().sub(controls.target);
    const want = Math.min(offset.length(), 4.5);
    offset.setLength(THREE.MathUtils.lerp(offset.length(), want, k));
    cam.position.copy(controls.target).add(offset);
    controls.update();
    if (performance.now() > f.until) fly.current = null;
  });

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => (typeof e.index === "number" ? e.index : null);

  return (
    <group>
      <lineSegments ref={linesRef} geometry={lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <lineSegments geometry={focusGeo}>
        <lineBasicMaterial color="#9fefff" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points
        ref={nodesRef}
        geometry={nodeGeo}
        material={material}
        frustumCulled={false}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pick(e));
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onHover(pick(e));
        }}
        onPointerOut={() => onHover(null)}
      />
    </group>
  );
}

export default function ExplorerScene({ className, ...props }: Props & { className?: string }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault fov={45} position={[0, 0, 11]} />
      <ExplorerGraph {...props} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} autoRotate={props.selected === null} autoRotateSpeed={0.35} minDistance={1.5} maxDistance={22} />
    </View>
  );
}
