"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { intro } from "@/lib/motion";
import { createNodeMaterial, seeded } from "./nodeMaterial";
import { advancePulses, makePulseGeometry, makePulses, syncNodeMaterial, type Pulse } from "./pulses";

const PALETTE = ["#a9bcff", "#8d7cff", "#5ee6ff", "#ffffff", "#7aa2ff"].map((c) => new THREE.Color(c));
const PULSES = 28;

type Link = { a: THREE.Vector3; b: THREE.Vector3 };

/**
 * Repository nodes floating around the prism. Some link to the prism's corners,
 * some to each other, and small pulses travel inward along the links:
 * the codebase being pulled into PRISM for analysis.
 */
export default function Network({ anchors, count = 56 }: { anchors: THREE.Vector3[]; count?: number }) {
  const nodesRef = useRef<THREE.Points>(null);
  const pulsesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const pulseState = useRef<Pulse[]>([]);

  const nodeMat = useMemo(() => createNodeMaterial(260), []);
  const pulseMat = useMemo(() => createNodeMaterial(260), []);
  const pulseGeo = useMemo(() => makePulseGeometry(PULSES, 0.32, "#bfefff"), []);

  const { nodeGeo, lineGeo, links } = useMemo(() => {
    const rand = seeded(7);
    const positions: THREE.Vector3[] = [];
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 2.1 + rand() * 1.9;
      const y = (rand() - 0.5) * 3.6;
      positions.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      sizes[i] = 0.25 + Math.pow(rand(), 3) * 0.75;
      PALETTE[Math.floor(rand() * PALETTE.length)].toArray(colors, i * 3);
    }

    const linkList: Link[] = [];
    positions.forEach((p, i) => {
      // Every other node connects to its nearest prism corner.
      if (i % 2 === 0) {
        const nearest = [...anchors].sort((a, b) => a.distanceTo(p) - b.distanceTo(p))[0];
        linkList.push({ a: p, b: nearest });
      }
      // And each node connects to its nearest neighbour.
      let best = -1;
      let bestDist = Infinity;
      positions.forEach((q, j) => {
        const d = q.distanceTo(p);
        if (j !== i && d < bestDist) {
          bestDist = d;
          best = j;
        }
      });
      if (best >= 0) linkList.push({ a: p, b: positions[best] });
    });

    const nodeGeo = new THREE.BufferGeometry().setFromPoints(positions);
    nodeGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    nodeGeo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linkList.flatMap((l) => [l.a, l.b]));
    return { nodeGeo, lineGeo, links: linkList };
  }, [anchors, count]);

  useEffect(() => {
    pulseState.current = makePulses(PULSES, links.length, 19, 0.25, 0.6);
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
    const nodes = nodesRef.current;
    const pulses = pulsesRef.current;
    const lines = linesRef.current;
    if (!nodes || !pulses || !lines) return;

    const pr = state.gl.getPixelRatio();
    const reveal = intro.edges;
    syncNodeMaterial(nodes, pr, reveal);
    syncNodeMaterial(pulses, pr, reveal);
    (lines.material as THREE.LineBasicMaterial).opacity = reveal * 0.22;

    advancePulses(pulses, pulseState.current, (i) => [links[i].a, links[i].b], links.length, delta, 7);
  });

  return (
    <group>
      <lineSegments ref={linesRef} geometry={lineGeo}>
        <lineBasicMaterial color="#9fb2ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points ref={nodesRef} geometry={nodeGeo} material={nodeMat} frustumCulled={false} />
      <points ref={pulsesRef} geometry={pulseGeo} material={pulseMat} frustumCulled={false} />
    </group>
  );
}
