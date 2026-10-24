import { useId, type ComponentProps } from "react";

/**
 * The PRISM mark: a single white beam (your code) enters a glass prism and
 * leaves as a spectrum (insight). Drawn on a 32×28 grid so it stays crisp small.
 */
export function PrismMark({ size = 22, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  const edge = `edge-${id}`;
  const glass = `glass-${id}`;
  return (
    <svg
      width={(size * 32) / 28}
      height={size}
      viewBox="0 0 32 28"
      fill="none"
      aria-hidden="true"
      className={`prism-mark ${animated ? "prism-mark--animated" : ""} ${className}`}
    >
      <defs>
        <linearGradient id={edge} x1="4" y1="25" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#b9c8ff" />
          <stop offset="1" stopColor="#9d8dff" />
        </linearGradient>
        <linearGradient id={glass} x1="16" y1="3" x2="16" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9d8dff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#5b8cff" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Incoming beam */}
      <path className="prism-beam" d="M0.8 17.2 L9.2 15.3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

      {/* Glass body, back facet and edges */}
      <path d="M16 2.6 L28.6 25 H3.4 Z" fill={`url(#${glass})`} />
      <path d="M16 2.6 L18.6 25" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1" />
      <path d="M9.2 15.3 L22.6 14.2" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.1" />
      <path d="M16 2.6 L28.6 25 H3.4 Z" stroke={`url(#${edge})`} strokeWidth="1.6" strokeLinejoin="round" />

      {/* Spectrum out */}
      <g className="prism-rays" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22.6 14.2 L31.2 10.6" stroke="#5ee6ff" />
        <path d="M22.6 14.2 L31.2 14.4" stroke="#5b8cff" />
        <path d="M22.6 14.2 L31.2 18.2" stroke="#9d8dff" />
      </g>
    </svg>
  );
}

/** Mark + wordmark. `stacked` puts the word under a larger mark (used in the intro). */
export default function Logo({
  className = "",
  stacked = false,
  ...rest
}: ComponentProps<"span"> & { stacked?: boolean }) {
  if (stacked) {
    return (
      <span className={`inline-flex flex-col items-center gap-5 ${className}`} {...rest}>
        <PrismMark size={64} animated className="drop-shadow-[0_0_24px_rgb(141_124_255/0.55)]" />
        <span data-wordmark className="font-mono text-[15px] font-medium tracking-[0.42em] text-white">
          PRISM
        </span>
      </span>
    );
  }
  return (
    <span className={`group inline-flex items-center gap-2.5 ${className}`} {...rest}>
      <PrismMark size={18} className="transition-[filter] duration-300 group-hover:drop-shadow-[0_0_8px_rgb(141_124_255/0.8)]" />
      <span className="font-mono text-[13px] font-medium tracking-[0.32em]">PRISM</span>
    </span>
  );
}
