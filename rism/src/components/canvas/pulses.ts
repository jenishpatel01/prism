import * as THREE from "three";
import { seeded } from "./nodeMaterial";

/** A dot travelling along one link of a graph. */
export type Pulse = { link: number; t: number; speed: number };

export function makePulses(count: number, linkCount: number, seed: number, minSpeed: number, maxSpeed: number): Pulse[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => ({
    link: Math.floor(rand() * linkCount),
    t: rand(),
    speed: minSpeed + rand() * (maxSpeed - minSpeed),
  }));
}

export function makePulseGeometry(count: number, size: number, color: string) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(count).fill(size), 1));
  const c = new Float32Array(count * 3);
  const col = new THREE.Color(color);
  for (let i = 0; i < count; i++) col.toArray(c, i * 3);
  g.setAttribute("aColor", new THREE.BufferAttribute(c, 3));
  return g;
}

const tmp = new THREE.Vector3();

/**
 * Advance pulses along their links and write positions into the points object.
 * `step` picks the next link when a pulse reaches the end of its current one.
 */
export function advancePulses(
  points: THREE.Points,
  pulses: Pulse[],
  ends: (link: number) => [THREE.Vector3, THREE.Vector3],
  linkCount: number,
  delta: number,
  step: number,
) {
  const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
  pulses.forEach((p, i) => {
    p.t += delta * p.speed;
    if (p.t > 1) {
      p.t = 0;
      p.link = (p.link + step) % linkCount;
    }
    const [a, b] = ends(p.link);
    tmp.lerpVectors(a, b, p.t);
    attr.setXYZ(i, tmp.x, tmp.y, tmp.z);
  });
  attr.needsUpdate = true;
}

/** Update pixel ratio and opacity on a node material reached through a points object. */
export function syncNodeMaterial(points: THREE.Points, pixelRatio: number, opacity = 1) {
  const m = points.material as THREE.ShaderMaterial;
  m.uniforms.uPixelRatio.value = pixelRatio;
  m.uniforms.uOpacity.value = opacity;
}
