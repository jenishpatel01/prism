"use client";

import { PerspectiveCamera, View } from "@react-three/drei";
import Prism from "./Prism";

/** Places the prism scene behind the hero section. */
export default function HeroScene({ className }: { className?: string }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault fov={35} position={[0, 0, 9.5]} />
      <Prism />
    </View>
  );
}
