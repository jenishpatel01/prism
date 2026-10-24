/**
 * Layers of the demo repository shown in the universe scene.
 * Shared by the 3D scene (client) and the page legend (server).
 * Positions form a loose ring so the map reads as a galaxy, not a line.
 */
export const CLUSTERS = [
  { name: "Frontend", pos: [-2.7, 1.5, 0.6], color: "#a9bcff", count: 36 },
  { name: "Components", pos: [0.3, 2.4, -1.0], color: "#d6dcf5", count: 50 },
  { name: "Services", pos: [2.7, 0.5, 0.4], color: "#8d7cff", count: 34 },
  { name: "API", pos: [1.5, -2.1, -0.6], color: "#5ee6ff", count: 26 },
  { name: "Database", pos: [-1.6, -1.8, 0.2], color: "#5b8cff", count: 14 },
] as const;
