"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import * as THREE from "three";
import type { RepoGraph } from "@/lib/analysisTypes";
import { CLUSTERS } from "@/lib/demoRepo";
import { createNodeMaterial, seeded } from "./nodeMaterial";
import { advancePulses, makePulseGeometry, makePulses, syncNodeMaterial, type Pulse } from "./pulses";

const PULSES = 90;

/*
 * Repository universe. Each point is a file; clusters are folders (or, in the
 * demo, layers of the app). Node size stands for complexity, links for imports,
 * and red marks high-risk files. With a real analysis it draws that repo's graph.
 */

const RISK = new THREE.Color("#ff4d5e");

type Node = { p: THREE.Vector3; size: number; color: THREE.Color; cluster: number; hub: boolean };

/** Lay out a real repository graph: one cluster per folder group, arranged on a ring. */
export function layoutRepo(graph: RepoGraph) {
  const rand = seeded(graph.nodes.length + 7);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const k = graph.groups.length;
  const total = graph.nodes.length;
  const centers = graph.groups.map((g, i) => {
    if (k === 1) return new THREE.Vector3();
    const a = (i / k) * Math.PI * 2 + 0.6;
    const r = 2.5;
    return new THREE.Vector3(Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.85, (rand() - 0.5) * 1.6);
  });
  const groupIndex = new Map(graph.groups.map((g, i) => [g.name, i]));
  const maxCx = Math.max(1, ...graph.nodes.map((n) => n.complexity));

  const nodes: Node[] = graph.nodes.map((n) => {
    const gi = groupIndex.get(n.group) ?? 0;
    // Bigger groups spread wider so dense folders don't collapse into a blob.
    const spread = 0.6 + Math.sqrt(graph.groups[gi].count / Math.max(1, total)) * 1.6;
    return {
      p: centers[gi].clone().add(new THREE.Vector3(gauss() * spread, gauss() * spread * 0.85, gauss() * spread)),
      // Small repos get bigger nodes so the map never looks empty.
      size: (0.32 + Math.sqrt(n.complexity / maxCx) * 1.0) * (total < 120 ? 1.5 : total < 300 ? 1.2 : 1),
      color: n.risk >= 70 ? RISK.clone() : new THREE.Color(graph.groups[gi].color),
      cluster: gi,
      hub: false,
    };
  });
  return { nodes, links: graph.links };
}

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

function UniverseGraph({ graph }: { graph?: RepoGraph }) {
  const group = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.Points>(null);
  const pulsesRef = useRef<THREE.Points>(null);
  const pulseState = useRef<Pulse[]>([]);
  const nodeMat = useMemo(() => createNodeMaterial(320), []);
  const pulseMat = useMemo(() => createNodeMaterial(320), []);
  const { nodes, links } = useMemo(() => (graph && graph.nodes.length ? layoutRepo(graph) : buildGraph()), [graph]);

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
    // No links (a repo with no internal imports): hide the pulses.
    syncNodeMaterial(pulsePoints, pr, links.length ? 1 : 0);
    if (links.length && pulseState.current.length) {
      advancePulses(
        pulsePoints,
        pulseState.current,
        (i) => [nodes[links[i][0]].p, nodes[links[i][1]].p],
        links.length,
        delta,
        13,
      );
    }

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

export default function Universe({ className, graph }: { className?: string; graph?: RepoGraph }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault fov={40} position={[0, 0, 10.5]} />
      <UniverseGraph graph={graph} />
    </View>
  );
}
