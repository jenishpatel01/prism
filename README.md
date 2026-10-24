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

`/app` shows demo data. Real analyses live at `/app/r/<owner>/<repo>`.

## Analysis engine (backend)

Open `/app/new`, paste a public GitHub repository, and PRISM analyzes it on the server. The engine lives in `src/server/analysis/`:

| File | What it does |
|---|---|
| `fetchRepo.ts` | Looks up the repo on GitHub and downloads its default branch as a tarball, unpacked in memory. Skips `node_modules`, build output, binaries and files over 400 KB. Limits: 150 MB repo, 6,000 files, 40 MB of source. |
| `parse.ts` | Parses JS/TS with the TypeScript compiler (real syntax trees) and Python line by line. Extracts functions, cyclomatic complexity, classes and imports, and flags risky patterns: SQL or shell commands built from strings, `eval`, awaited queries inside loops (N+1), blocking `*Sync` calls, `innerHTML`, unsafe `pickle`/`yaml`. |
| `secrets.ts` | Finds committed credentials (AWS, GitHub, Stripe, Slack, Google keys, private keys, hardcoded passwords, committed `.env` files). Values are always masked. |
| `graph.ts` | Resolves imports between project files into a dependency graph and finds circular dependencies. |
| `deps.ts` | Checks `package.json` / `package-lock.json` / `requirements.txt` versions against [OSV.dev](https://osv.dev), the free open vulnerability database. |
| `index.ts` | Runs every stage with timings, computes the health score, hotspots, quality metrics and 3D graph, and writes the summary. Results are cached per repo for hours with `"use cache"`; failures for minutes. |

Tests, `examples/`, `docs/` and `scripts/` are drawn on the map but don't count toward risk or quality.

**Settings:** copy `.env.example` to `.env.local`. `GITHUB_TOKEN` is optional but recommended: without it GitHub allows 60 requests per hour and each analysis uses 2. On Vercel, add it under Project → Settings → Environment Variables.

## Accounts, history and AI (phase 2)

Set-up steps for the three services are in **[SETUP.md](SETUP.md)**. Every feature checks for its keys and degrades gracefully when they're missing; `/app/setup` shows live status.

| Feature | Files | Needs |
|---|---|---|
| GitHub sign-in | `src/app/api/auth/*`, `src/server/session.ts` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AUTH_SECRET` |
| Private repos | `src/server/loadRepo.ts`, `analyzeWithToken` | sign-in with the `repo` scope (asked separately) |
| Saved history | `src/server/db.ts`, `supabase/schema.sql` | `DATABASE_URL` (Supabase transaction pooler) |
| Claude summary + AI Review | `src/server/ai.ts` | `ANTHROPIC_API_KEY` |

- **Sessions** are an AES-256-GCM encrypted, HTTP-only cookie. The GitHub token inside it never reaches browser JavaScript.
- **Private repositories** are never put in the shared cache. They're analyzed with the user's own token, saved to their history, and reused for 30 minutes.
- **Claude** (`claude-sonnet-5-5`, high effort, structured output) receives only analysis facts, never source code, and must cite issue ids. Reviews are cached per repo and commit. A server-side fallback model handles the rare safety refusal.
- **Repository** is a 3D explorer (orbit, zoom, click or search a file). **Architecture** orders folders into layers by import direction and flags upward imports and cycles.
