import * as THREE from "three";

/**
 * Glowing round nodes drawn as points: a bright core with a soft halo.
 * Each point carries its own size (aSize) and colour (aColor).
 */
const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uScale;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale * uPixelRatio / -mv.z;
    vColor = aColor;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.32, 0.0, d);
    float halo = pow(1.0 - d, 2.4) * 0.6;
    vec3 c = vColor * (halo + core) + vec3(1.0) * core * 0.55;
    gl_FragColor = vec4(c, (halo + core) * uOpacity);
  }
`;

export function createNodeMaterial(scale = 300) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPixelRatio: { value: 1 },
      uScale: { value: scale },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Small deterministic random generator, so layouts are the same on every load. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
