"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroScene from "@/components/canvas/HeroScene";
import { hero, intro, prefersReducedMotion } from "@/lib/motion";
import Logo from "./Logo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Hero sequence:
 * black screen → logo → particles form the prism → edges light → copy appears.
 * The section is 260svh tall with a sticky stage; scrolling through it moves
 * the camera into the prism, ending on the threshold of the repository universe.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const copy = q("[data-intro='copy']");
      const nav = document.querySelector("[data-intro='nav']");

      if (prefersReducedMotion()) {
        intro.form = 1;
        intro.edges = 1;
        gsap.set([...copy, nav], { opacity: 1 });
      } else {
        // Start from scattered particles, even when returning from another page.
        intro.form = 0;
        intro.edges = 0;
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        // Logo: the mark draws itself (CSS), the wordmark opens up, then it all fades into the scene.
        tl.fromTo(q("[data-intro='mark']"), { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1.1 }, 0.2)
          .fromTo(q("[data-wordmark]"), { letterSpacing: "0.1em", opacity: 0 }, { letterSpacing: "0.42em", opacity: 1, duration: 1.2 }, 0.9)
          .to(q("[data-intro='mark']"), { opacity: 0, scale: 1.06, duration: 0.7, ease: "power2.in" }, 2.3)
          .to(intro, { form: 1, duration: 3.4, ease: "power2.inOut" }, 2.4)
          .to(intro, { edges: 1, duration: 1.6, ease: "power2.out" }, 4.8)
          .fromTo(copy, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 4.6)
          .to(nav, { opacity: 1, duration: 1 }, 4.9);
      }

      // Scroll drives the camera through the prism.
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          hero.progress = self.progress;
        },
      });

      // Copy leaves early so the object owns the screen during the fly-in.
      gsap.to(q("[data-hero='text']"), {
        opacity: 0,
        y: -48,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "22% top", scrub: true },
      });

      // Threshold label as the camera enters the object.
      gsap.fromTo(
        q("[data-hero='threshold']"),
        { opacity: 0 },
        {
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "82% bottom", end: "97% bottom", scrub: true },
        },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[260svh]" aria-label="Introduction">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <HeroScene className="absolute inset-0" />

        {/* Readability falloff behind the copy, kept subtle. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-bg-0/90 via-bg-0/35 to-transparent" />

        {/* Opening mark, shown on the black screen before the object forms. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Logo stacked className="opacity-0" data-intro="mark" />
        </div>

        <div
          data-hero="text"
          className="absolute inset-x-0 bottom-0 grid items-end gap-8 px-4 pb-10 md:grid-cols-12 md:px-10 md:pb-14"
        >
          <div className="md:col-span-8">
            <p data-intro="copy" className="label mb-6 opacity-0">
              Code intelligence platform
            </p>
            <h1
              data-intro="copy"
              className="text-[clamp(46px,8.6vw,132px)] font-medium leading-[0.92] tracking-[-0.045em] opacity-0"
            >
              See your code
              <br />
              <span className="text-spectrum">differently.</span>
            </h1>
          </div>

          <div className="md:col-span-4 md:justify-self-end md:pb-3">
            <p data-intro="copy" className="max-w-[22rem] text-[15px] leading-relaxed text-fg-muted opacity-0">
              Analyze your entire codebase through a new dimension. Security,
              architecture, dependencies and performance, mapped as one system.
            </p>
            <div data-intro="copy" className="mt-7 flex flex-wrap gap-3 opacity-0">
              {/* Starts GitHub sign-in (or opens the analyze page if sign-in isn't set up). */}
              { }
              <a
                href="/api/auth/login"
                className="inline-flex h-11 items-center gap-2.5 rounded-md bg-fg px-5 font-mono text-[12px] font-medium tracking-[0.12em] text-bg-0 transition-colors hover:bg-white"
              >
                <GitHubMark />
                CONNECT GITHUB
              </a>
              <Link
                href="/app"
                className="inline-flex h-11 items-center rounded-md border border-line-strong px-5 font-mono text-[12px] tracking-[0.12em] text-fg transition-colors hover:border-fg-muted"
              >
                EXPLORE DEMO
              </Link>
            </div>
          </div>
        </div>

        <p
          data-hero="threshold"
          className="label pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center opacity-0"
        >
          Entering repository — 4,812 files
        </p>
      </div>
    </section>
  );
}

function GitHubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
