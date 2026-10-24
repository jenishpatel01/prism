# PRISM — See your code differently

Landing experience for PRISM, the code-intelligence platform.

## Run

```bash
npm install
npm run dev
```

## How it is put together

- **One persistent WebGL canvas** (`src/components/canvas/Scene.tsx`) is mounted once in the root layout and never unmounts. Sections place 3D content with Drei's `<View>`, which renders into that canvas at the section's position. This is the react-three-next pattern, and it lets the camera travel between scenes as one continuous experience.
- **Smooth scroll**: Lenis, driven by GSAP's ticker so `ScrollTrigger` stays in sync (`src/components/dom/SmoothScroll.tsx`). Off for `prefers-reduced-motion`.
- **Animation state** lives in plain mutable objects (`src/lib/motion.ts`). GSAP writes them and `useFrame` reads them, so scroll never causes React re-renders.
- **Hero** (`src/components/dom/Hero.tsx` + `src/components/canvas/Prism.tsx`): logo → particles form the prism → edges and core light → copy. The section is 260svh tall with a sticky stage; scrolling dollies the camera into the prism.
- **Design tokens** are in `src/app/globals.css` (`bg-0/1/2`, `fg`, `fg-muted`, `accent`, `accent-violet`, `accent-cyan`, `critical`). Accents are signals, not decoration.

## Adding a scene

1. Create a component under `src/components/canvas/` that returns a `<View>` with its own camera and content.
2. Drop it into a section in `src/app/page.tsx`, positioned with normal CSS.
3. Drive it from scroll by writing progress into a shared object in `src/lib/motion.ts`.

## Sections

- **Repository universe**: 3D graph of a demo repo (`src/components/canvas/Universe.tsx`, data in `src/lib/demoRepo.ts`).
- **Security, performance, architecture, AI core**: animated SVG scenes in `src/components/visuals/`.

## App (`/app`)

- **Layout**: `src/app/app/layout.tsx` with the sidebar in `src/components/app/Sidebar.tsx` (fixed on large screens, slide-out menu on phones). Navigation items live in `src/components/app/nav.ts`.
- **Overview** (`src/app/app/page.tsx`): health score, stats, live 3D repository map, top risks, AI summary, issue breakdown, hotspots, quality trends, pipeline run and history. Widgets are in `src/components/app/overview/`.
- **Other sections** (Repository, Architecture, Security, Performance, Quality, AI Review, History) are placeholder screens built with `ComingSoon.tsx`.
- **Demo data** for every screen is in `src/lib/demoAnalysis.ts`. Its shape mirrors what the analysis pipeline will produce, so real results can replace it.

The landing page lives in the `(marketing)` route group, which adds Lenis smooth scroll; the app scrolls natively. Both share the root layout's 3D canvas and background.

All numbers and files shown are demo data. "Connect GitHub" doesn't do anything yet.
