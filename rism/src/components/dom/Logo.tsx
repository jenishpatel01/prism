import type { ComponentProps } from "react";

/** PRISM wordmark: a thin triangle glyph plus spaced letters. */
export default function Logo({ className = "", ...rest }: ComponentProps<"span">) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} {...rest}>
      <svg width="15" height="14" viewBox="0 0 15 14" fill="none" aria-hidden="true">
        <path d="M7.5 1 14 13H1L7.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M7.5 1v12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
      </svg>
      <span className="font-mono text-[13px] font-medium tracking-[0.32em]">PRISM</span>
    </span>
  );
}
