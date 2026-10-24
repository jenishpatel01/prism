"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { hero, intro } from "@/lib/motion";
import Network from "./Network";

/**
 * Placeholder hero object: a triangular crystal column built from particles.
 * Particles start scattered and travel into the prism's edges and faces
 * (intro.form), then the edges and inner core fade in (intro.edges).
 * Scrolling (hero.progress) pulls the camera toward and into the object.
 */

const RADIUS = 1.15;
const HEIGHT = 2.9;

// Three corners of the triangle, at the top (+y) and bottom (-y).
function corners() {
  const top: THREE.Vector3[] = [];
  const bottom: THREE.Vector3[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const x = Math.sin(a) * RADIUS;
    const z = Math.cos(a) * RADIUS;
    top.push(new THREE.Vector3(x, HEIGHT / 2, z));
    bottom.push(new THREE.Vector3(x, -HEIGHT / 2, z));
  }
  return { top, bottom };
}

function edgeList() {
  const { top, bottom } = corners();
  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    edges.push([top[i], bottom[i]]); // vertical
    edges.push([top[i], top[j]]); // top ring
    edges.push([bottom[i], bottom[j]]); // bottom ring
  }
  return edges;
}

function buildParticles(count: number) {
  const { top, bottom } = corners();
  const edges = edgeList();
  const start = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const p = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const r = Math.random();
    if (r < 0.55) {
      // On an edge, with slight jitter so the lines read as dense, not perfect.
      const [a, b] = edges[Math.floor(Math.random() * edges.length)];
      p.lerpVectors(a, b, Math.random());
      p.x += (Math.random() - 0.5) * 0.02;
      p.y += (Math.random() - 0.5) * 0.02;
      p.z += (Math.random() - 0.5) * 0.02;
    } else if (r < 0.9) {
      // On a side face: blend between two vertical edges.
      const f = Math.floor(Math.random() * 3);
      const g = (f + 1) % 3;
      const u = Math.random();
      const v = Math.random();
      const lower = new THREE.Vector3().lerpVectors(bottom[f], bottom[g], u);
      const upper = new THREE.Vector3().lerpVectors(top[f], top[g], u);
      p.lerpVectors(lower, upper, v);
    } else {
      // Inside: a loose cloud around the core.
      p.set(
        (Math.random() - 0.5) * RADIUS * 0.8,
        (Math.random() - 0.5) * HEIGHT * 0.8,
        (Math.random() - 0.5) * RADIUS * 0.8,
      );
    }
    target.set([p.x, p.y, p.z], i * 3);

    // Scattered start positions on a wide shell around the scene.
    const dir = new THREE.Vector3().randomDirection();
    const dist = 6 + Math.random() * 10;
    start.set([dir.x * dist, dir.y * dist * 0.6, dir.z * dist], i * 3);

    seed[i] = Math.random();
  }
  return { start, target, seed };
}

const vertexShader = /* glsl */ `
  attribute vec3 aStart;
  attribute float aSeed;
  uniform float uForm;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uMouse;        // cursor, in the prism's local space
  uniform float uMouseActive; // 0 → 1
  uniform vec3 uShockOrigin;  // where the last click hit
  uniform float uShockTime;   // seconds since that click
  varying float vSeed;
  varying float vDepth;
  varying float vGlow;

  float easeOutCubic(float t) { return 1.0 - pow(1.0 - t, 3.0); }

  void main() {
    // Each particle starts a little later than the last, so the shape assembles.
    float t = clamp((uForm - aSeed * 0.45) / 0.55, 0.0, 1.0);
    t = easeOutCubic(t);
    vec3 pos = mix(aStart, position, t);

    // A faint idle drift once formed keeps the object alive.
    pos += 0.012 * vec3(
      sin(uTime * 0.6 + aSeed * 40.0),
      cos(uTime * 0.5 + aSeed * 31.0),
      sin(uTime * 0.7 + aSeed * 23.0)
    );

    // Cursor: particles near the pointer move aside and brighten.
    vec3 toMouse = pos - uMouse;
    float md = length(toMouse);
    float push = smoothstep(1.15, 0.0, md) * uMouseActive;
    pos += (toMouse / max(md, 0.0001)) * push * (0.35 + aSeed * 0.25);

    // Click: a shockwave ring travels outward from the hit point and fades.
    vec3 toShock = pos - uShockOrigin;
    float sd = length(toShock);
    float front = uShockTime * 3.4;
    float wave = exp(-pow((sd - front) * 2.4, 2.0)) * exp(-uShockTime * 1.5);
    pos += (toShock / max(sd, 0.0001)) * wave * 0.55;

    vGlow = push * 0.9 + wave * 1.4;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = mix(2.0, 3.6, aSeed);
    gl_PointSize = size * (1.0 + vGlow * 0.6) * uPixelRatio * (6.0 / -mv.z);
    vSeed = aSeed;
    vDepth = -mv.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vSeed;
  varying float vDepth;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.0, d);
    // White core of points with a blue/violet tint on roughly half of them.
    vec3 color = mix(vec3(1.0), mix(uColorA, uColorB, vSeed) * 1.3, step(0.5, vSeed) * 0.9);
    // Disturbed particles flare cyan.
    color = mix(color, vec3(0.55, 0.95, 1.0) * 1.6, clamp(vGlow, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha * uOpacity * (1.0 + vGlow));
  }
`;

// Fewer particles on small screens keeps phones smooth. This component only
// ever renders inside the canvas, so window is always available here.
function defaultCount() {
  return window.matchMedia("(max-width: 767px)").matches ? 7000 : 14000;
}

// Soft light at the centre: a bright pinpoint with a wide violet falloff.
const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float halo = pow(max(1.0 - d, 0.0), 2.2) * 0.7;
    float point = pow(max(1.0 - d * 6.0, 0.0), 2.0);
    // Alpha follows brightness so the transparent canvas never shows a dark square.
    float a = clamp(halo + point, 0.0, 1.0);
    vec3 color = mix(vec3(0.6, 0.53, 1.0), vec3(1.0), point / max(a, 0.001));
    gl_FragColor = vec4(color, a);
  }
`;

export default function Prism({ count: countProp }: { count?: number }) {
  const count = useMemo(() => countProp ?? defaultCount(), [countProp]);
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const edgeMat = useRef<THREE.LineBasicMaterial>(null);
  const core = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const { start, target, seed } = buildParticles(count);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(target, 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    // Bounds must include the scattered start positions, or points get culled.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
    return g;
  }, [count]);

  const anchors = useMemo(() => {
    const { top, bottom } = corners();
    return [...top, ...bottom];
  }, []);

  const edgeGeometry = useMemo(() => {
    const pts = edgeList().flat();
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const uniforms = useMemo(
    () => ({
      uForm: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color("#5b8cff") },
      uColorB: { value: new THREE.Color("#8d7cff") },
      uMouse: { value: new THREE.Vector3(99, 99, 99) },
      uMouseActive: { value: 0 },
      uShockOrigin: { value: new THREE.Vector3() },
      uShockTime: { value: 100 },
    }),
    [],
  );

  // Pointer tracking: where the cursor meets a plane through the prism, facing the camera.
  const pointer = useRef({
    raycaster: new THREE.Raycaster(),
    plane: new THREE.Plane(),
    hit: new THREE.Vector3(),
    local: new THREE.Vector3(99, 99, 99),
    normal: new THREE.Vector3(),
    center: new THREE.Vector3(),
    lastMove: -10,
    lastXY: "",
    shockPending: false,
    shockStart: -100,
  });

  useEffect(() => {
    const onDown = () => {
      pointer.current.shockPending = true;
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    const g0 = group.current;
    if (u && g0) {
      u.uForm.value = intro.form;
      u.uTime.value = state.clock.elapsedTime;
      u.uPixelRatio.value = state.gl.getPixelRatio();
      // Fade particles slightly as the camera passes through the object.
      u.uOpacity.value = 1 - THREE.MathUtils.smoothstep(hero.progress, 0.75, 1) * 0.85;

      // Find the cursor in the prism's own space so the effect follows its rotation.
      const pt = pointer.current;
      const now = state.clock.elapsedTime;
      const xy = `${state.pointer.x.toFixed(3)},${state.pointer.y.toFixed(3)}`;
      if (xy !== pt.lastXY) {
        pt.lastXY = xy;
        pt.lastMove = now;
      }
      g0.getWorldPosition(pt.center);
      state.camera.getWorldDirection(pt.normal);
      pt.plane.setFromNormalAndCoplanarPoint(pt.normal, pt.center);
      pt.raycaster.setFromCamera(state.pointer, state.camera);
      if (pt.raycaster.ray.intersectPlane(pt.plane, pt.hit)) {
        pt.local.copy(pt.hit);
        g0.worldToLocal(pt.local);
        u.uMouse.value.lerp(pt.local, 1 - Math.pow(0.0001, delta));
      }
      // Active while the cursor is moving; eases off a couple of seconds after it stops.
      const active = now - pt.lastMove < 2 ? intro.edges : 0;
      u.uMouseActive.value = THREE.MathUtils.damp(u.uMouseActive.value, active, 4, delta);

      if (pt.shockPending) {
        pt.shockPending = false;
        pt.shockStart = now;
        u.uShockOrigin.value.copy(u.uMouse.value);
      }
      u.uShockTime.value = now - pt.shockStart;
    }
    if (edgeMat.current) edgeMat.current.opacity = intro.edges * 0.8;
    if (core.current) {
      const s = intro.edges * (0.9 + Math.sin(state.clock.elapsedTime * 1.4) * 0.06);
      core.current.scale.setScalar(Math.max(s, 0.0001));
    }

    const g = group.current;
    if (!g) return;
    // Slow rotation plus a small tilt that follows the pointer.
    g.rotation.y += delta * 0.08;
    const px = state.pointer.x;
    const py = state.pointer.y;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, py * -0.12, 3, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, px * -0.06, 3, delta);

    // Camera dolly: scroll moves the camera toward, then into, the prism.
    const cam = state.camera;
    const p = hero.progress;
    const e = THREE.MathUtils.smootherstep(p, 0, 1);
    const targetZ = THREE.MathUtils.lerp(9.5, 0.4, e);
    // Camera rises to the prism's centre as it moves in.
    const lookY = THREE.MathUtils.lerp(-0.2, 0.45, e);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, targetZ, 6, delta);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, px * 0.25, 2, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, lookY + py * 0.15, 2, delta);
    cam.lookAt(0, lookY, 0);
  });

  return (
    <group ref={group} position={[0, 0.45, 0]}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial ref={edgeMat} color="#e3e9ff" transparent opacity={0} />
      </lineSegments>
      {/* Repository nodes connecting to the prism once it has formed. */}
      <Network anchors={anchors} />
      {/* Inner core: where the AI intelligence scene will later begin. */}
      <Billboard>
        <mesh ref={core} scale={0}>
          <planeGeometry args={[3.4, 3.4]} />
          <shaderMaterial
            vertexShader={glowVertex}
            fragmentShader={glowFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
