"use client";

import { Canvas } from "@react-three/fiber";
import { Preload, View } from "@react-three/drei";

/**
 * The one WebGL canvas for the whole site (the react-three-next pattern).
 * It stays mounted across sections and routes. Each section places 3D content
 * with <View>, which renders into this canvas at that section's position,
 * so the camera can travel between scenes without reloading anything.
 */
export default function Scene() {
  return (
    <Canvas
      eventSource={document.body}
      eventPrefix="client"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100lvh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <View.Port />
      <Preload all />
    </Canvas>
  );
}
