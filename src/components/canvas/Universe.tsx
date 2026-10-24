"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import * as THREE from "three";
import { CLUSTERS } from "@/lib/demoRepo";
import { createNodeMaterial, seeded } from "./nodeMaterial";
import { advancePulses, makePulseGeometry, makePulses, syncNodeMaterial, type Pulse } from "./pulses";

const PULSES = 90;

/*
 * Demo repository universe. Each point is a file; clusters are layers of the
 * app (frontend → components → services → API → database). Node size stands
 * for complexity, links for imports, and red marks high-risk files.
 * Later this takes real data from PRISM's dependency graph.
 */


const RISK = new THREE.Color("#ff4d5e");

type Node = { p: THREE.Vector3; size: number; color: THREE.Color; cluster: number; hub: boolean };

function buildGraph() {
  const rand = seeded(42);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const nodes: Node[] = [];
  const hubs: number[] = [];

  CLUSTERS.forEach((c, ci) => {
    const center = new THREE.Vector3(...c.pos);
    hubs.push(nodes.length);
    nodes.push({ p: center, size: 1.25, color: new THREE.Color(c.color), cluster: ci, hub: true });
    for (let i = 0; i < c.count - 1; i++) {
      const p = center.clone().add(new THREE.Vector3(gauss() * 1.4, gauss() * 1.2, gauss() * 1.4));
      const risky = rand() < 0.05;
      nodes.push({
        p,
        size: 0.28 + Math.pow(rand(), 2.5) * 0.85,
        color: risky ? RISK.clone() : new THREE.Color(c.color),
        cluster: ci,
        hub: false,
      });
    }
  });

  const links: [number, number][] = [];
  nodes.forEach((n, i) => {
    if (!n.hub) links.push([i, hubs[n.cluster]]);
  });
  // The main flow between layers.
  for (let i = 0; i < hubs.length - 1; i++) links.push([hubs[i], hubs[i + 1]]);
  // Cross-layer imports between neighbouring clusters.
  for (let k = 0; k < 70; k++) {
    const a = Math.floor(rand() * nodes.length);
    const next = nodes.filter((n) => n.cluster === nodes[a].cluster + 1);
    if (!next.length) continue;
    const b = nodes.indexOf(next[Math.floor(rand() * next.length)]);
    links.push([a, b]);
  }
  return { nodes, links };
}

function UniverseGraph() {
  const group = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.Points>(null);
  const pulsesRef = useRef<THREE.Points>(null);
  const pulseState = useRef<Pulse[]>([]);
  const nodeMat = useMemo(() => createNodeMaterial(320), []);
  const pulseMat = useMemo(() => createNodeMaterial(320), []);
  const { nodes, links } = useMemo(() => buildGraph(), []);

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(nodes.map((n) => n.p));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(nodes.map((n) => n.size)), 1));
    const colors = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => n.color.toArray(colors, i * 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
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

  const pulseGeo = useMemo(() => makePulseGeometry(PULSES, 0.3, "#e6f6ff"), []);

  useEffect(() => {
    pulseState.current = makePulses(PULSES, links.length, 5, 0.2, 0.7);
  }, [links]);

  useEffect(
    () => () => {
      nodeMat.dispose();
      pulseMat.dispose();
      pulseGeo.dispose();
    },
    [nodeMat, pulseMat, pulseGeo],
  );

  useFrame((state, delta) => {
    const g = group.current;
    const nodePoints = nodesRef.current;
    const pulsePoints = pulsesRef.current;
    if (!g || !nodePoints || !pulsePoints) return;

    const pr = state.gl.getPixelRatio();
    syncNodeMaterial(nodePoints, pr);
    syncNodeMaterial(pulsePoints, pr);
    advancePulses(
      pulsePoints,
      pulseState.current,
      (i) => [nodes[links[i][0]].p, nodes[links[i][1]].p],
      links.length,
      delta,
      13,
    );

    g.rotation.y += delta * 0.05;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, state.pointer.y * -0.15, 2.5, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, state.pointer.x * -0.05, 2.5, delta);
  });

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points ref={nodesRef} geometry={nodeGeo} material={nodeMat} frustumCulled={false} />
      <points ref={pulsesRef} geometry={pulseGeo} material={pulseMat} frustumCulled={false} />
    </group>
  );
}

export default function Universe({ className }: { className?: string }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault fov={40} position={[0, 0, 10.5]} />
      <UniverseGraph />
    </View>
  );
}
