// Shared, mutable animation state. GSAP writes these values and the 3D scene
// reads them every frame, so scroll and intro timing never cause React re-renders.

export const intro = {
  /** 0 → 1: particles travel from scattered to the prism shape. */
  form: 0,
  /** 0 → 1: prism edges and core light fade in. */
  edges: 0,
};

export const hero = {
  /** 0 → 1: scroll progress through the hero section. */
  progress: 0,
};

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
