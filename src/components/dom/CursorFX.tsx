"use client";

import { useEffect, useRef } from "react";

/*
 * Site-wide pointer effects, drawn on one 2D canvas above the page:
 * - a trail of glowing points that link into a fading node network as the mouse moves
 * - a burst (rings, a prism triangle, sparks) on every click or tap
 * - a custom cursor (dot + trailing ring) on mouse devices
 * The loop only runs while something is animating. Off for reduced motion.
 */

type Point = { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number; node: boolean };
type Ring = { x: number; y: number; t: number; max: number; radius: number; color: string };
type Tri = { x: number; y: number; t: number; max: number; rot: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number };

const INTERACTIVE = "a, button, [role='button'], input, select, textarea, label, summary";

export default function CursorFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const dot = dotRef.current;
    const ringEl = ringRef.current;
    if (!canvas || !dot || !ringEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (finePointer) document.documentElement.classList.add("custom-cursor");

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const trail: Point[] = [];
    const rings: Ring[] = [];
    const tris: Tri[] = [];
    const sparks: Spark[] = [];

    const mouse = { x: -200, y: -200 };
    const last = { x: -1, y: -1 };
    const ringPos = { x: -200, y: -200, s: 0.6 };
    let hovering = false;
    let pressed = false;
    let visible = false;
    let counter = 0;
    let raf = 0;
    let prev = performance.now();

    const kick = () => {
      if (!raf) {
        prev = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (e.pointerType !== "mouse") return;
      visible = true;
      hovering = !!(e.target as Element | null)?.closest?.(INTERACTIVE);

      if (last.x < 0) {
        last.x = mouse.x;
        last.y = mouse.y;
      }
      const dx = mouse.x - last.x;
      const dy = mouse.y - last.y;
      const steps = Math.min(Math.floor(Math.hypot(dx, dy) / 8), 10);
      for (let i = 1; i <= steps; i++) {
        counter++;
        const t = i / steps;
        trail.push({
          x: last.x + dx * t + (Math.random() - 0.5) * 6,
          y: last.y + dy * t + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.5) * 14,
          life: 0,
          max: 0.7 + Math.random() * 0.5,
          hue: 228 + 38 * Math.sin(counter * 0.06),
          node: counter % 4 === 0,
        });
      }
      if (steps > 0) {
        last.x = mouse.x;
        last.y = mouse.y;
      }
      if (trail.length > 160) trail.splice(0, trail.length - 160);
      kick();
    };

    const burst = (x: number, y: number) => {
      rings.push({ x, y, t: 0, max: 0.65, radius: 54, color: "255,255,255" });
      rings.push({ x, y, t: -0.08, max: 0.9, radius: 92, color: "141,124,255" });
      tris.push({ x, y, t: 0, max: 0.8, rot: Math.random() * Math.PI });
      const n = 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
        const speed = 150 + Math.random() * 260;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0,
          max: 0.45 + Math.random() * 0.45,
          hue: 200 + Math.random() * 70,
        });
      }
    };

    const onDown = (e: PointerEvent) => {
      pressed = true;
      burst(e.clientX, e.clientY);
      kick();
    };
    const onUp = () => {
      pressed = false;
      kick();
    };
    const onLeave = () => {
      visible = false;
      last.x = -1;
      kick();
    };

    function frame(now: number) {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      ctx!.clearRect(0, 0, w, h);
      ctx!.globalCompositeOperation = "lighter";
      ctx!.lineCap = "round";

      // Trail: age points, link neighbours, then draw the points.
      for (const p of trail) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      while (trail.length && trail[0].life >= trail[0].max) trail.shift();

      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 60) continue;
        const k = 1 - Math.max(a.life / a.max, b.life / b.max);
        ctx!.strokeStyle = `hsla(${b.hue}, 95%, 72%, ${k * 0.55})`;
        ctx!.lineWidth = 1.4 * k + 0.2;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }

      // Every fourth point is a "node"; nearby nodes connect into a small network.
      const nodes = trail.filter((p) => p.node);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 2; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > 90) continue;
          const k = (1 - d / 90) * (1 - Math.max(a.life / a.max, b.life / b.max));
          ctx!.strokeStyle = `hsla(${a.hue}, 90%, 75%, ${k * 0.35})`;
          ctx!.lineWidth = 0.8;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }

      for (const p of trail) {
        const k = 1 - p.life / p.max;
        const r = (p.node ? 2.6 : 1.3) * (0.5 + k * 0.7);
        if (p.node) {
          ctx!.fillStyle = `hsla(${p.hue}, 100%, 70%, ${k * 0.25})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = `hsla(${p.hue}, 100%, ${p.node ? 88 : 76}%, ${k})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Click rings.
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        if (r.t >= r.max) {
          rings.splice(i, 1);
          continue;
        }
        if (r.t < 0) continue;
        const p = r.t / r.max;
        const e = 1 - Math.pow(1 - p, 3);
        ctx!.strokeStyle = `rgba(${r.color}, ${(1 - p) * 0.85})`;
        ctx!.lineWidth = 2 * (1 - p) + 0.3;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, 6 + e * r.radius, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Click triangle: the PRISM mark, spinning outward.
      for (let i = tris.length - 1; i >= 0; i--) {
        const t = tris[i];
        t.t += dt;
        if (t.t >= t.max) {
          tris.splice(i, 1);
          continue;
        }
        const p = t.t / t.max;
        const e = 1 - Math.pow(1 - p, 3);
        const rad = 10 + e * 40;
        const rot = t.rot + e * 1.6;
        ctx!.strokeStyle = `rgba(110, 227, 255, ${(1 - p) * 0.9})`;
        ctx!.lineWidth = 1.4;
        ctx!.beginPath();
        for (let k = 0; k <= 3; k++) {
          const a = rot + (k / 3) * Math.PI * 2 - Math.PI / 2;
          const x = t.x + Math.cos(a) * rad;
          const y = t.y + Math.sin(a) * rad;
          if (k === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
      }

      // Sparks: short streaks that slow down and fade.
      const drag = Math.pow(0.04, dt);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.max) {
          sparks.splice(i, 1);
          continue;
        }
        s.vx *= drag;
        s.vy *= drag;
        const x2 = s.x + s.vx * dt;
        const y2 = s.y + s.vy * dt;
        const k = 1 - s.life / s.max;
        ctx!.strokeStyle = `hsla(${s.hue}, 100%, 75%, ${k})`;
        ctx!.lineWidth = 1.8 * k + 0.4;
        ctx!.beginPath();
        ctx!.moveTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03);
        ctx!.lineTo(x2, y2);
        ctx!.stroke();
        s.x = x2;
        s.y = y2;
      }

      // Custom cursor: dot sits on the pointer, ring follows with a little lag.
      let cursorSettling = false;
      if (finePointer) {
        const follow = 1 - Math.pow(0.0005, dt);
        ringPos.x += (mouse.x - ringPos.x) * follow;
        ringPos.y += (mouse.y - ringPos.y) * follow;
        const targetS = pressed ? 0.45 : hovering ? 1 : 0.6;
        ringPos.s += (targetS - ringPos.s) * (1 - Math.pow(0.001, dt));
        dot!.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%) scale(${hovering ? 0.5 : 1})`;
        ringEl!.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${ringPos.s})`;
        ringEl!.classList.toggle("is-hover", hovering);
        dot!.style.opacity = ringEl!.style.opacity = visible ? "1" : "0";
        cursorSettling = Math.abs(mouse.x - ringPos.x) + Math.abs(mouse.y - ringPos.y) > 0.3 || Math.abs(targetS - ringPos.s) > 0.005;
      }

      const busy = trail.length || rings.length || tris.length || sparks.length || cursorSettling;
      raf = busy ? requestAnimationFrame(frame) : 0;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]" />
      <div ref={ringRef} aria-hidden="true" className="cursor-ring" />
      <div ref={dotRef} aria-hidden="true" className="cursor-dot" />
    </>
  );
}
