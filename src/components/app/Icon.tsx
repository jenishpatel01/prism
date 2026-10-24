/** Thin line icons for the app, drawn on a 20×20 grid. */

const paths: Record<string, React.ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="9" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="14" width="6" height="3" rx="1.5" />
    </>
  ),
  repository: (
    <>
      <circle cx="5" cy="4.5" r="1.8" />
      <circle cx="15" cy="10" r="1.8" />
      <circle cx="5" cy="15.5" r="1.8" />
      <path d="M5 6.3v7.4M6.6 5.4 13.4 9M6.6 14.6l6.8-3.6" />
    </>
  ),
  architecture: (
    <>
      <path d="M10 2.8 17 6.4 10 10 3 6.4 10 2.8Z" />
      <path d="m3 10 7 3.6 7-3.6M3 13.6l7 3.6 7-3.6" />
    </>
  ),
  security: (
    <>
      <path d="M10 2.6 16 5v4.6c0 3.7-2.6 6.4-6 7.8-3.4-1.4-6-4.1-6-7.8V5l6-2.4Z" />
      <path d="m7.4 10 1.8 1.8 3.6-3.8" />
    </>
  ),
  performance: (
    <>
      <path d="M3.5 13.5a6.5 6.5 0 1 1 13 0" />
      <path d="m10 13.5 3.2-4.2" />
      <circle cx="10" cy="13.5" r="1" />
    </>
  ),
  quality: (
    <>
      <path d="M10 2.8 12 7l4.6.6-3.4 3.2.9 4.6L10 13.2l-4.1 2.2.9-4.6L3.4 7.6 8 7l2-4.2Z" />
    </>
  ),
  ai: (
    <>
      <path d="M10 2.8 16.4 15H3.6L10 2.8Z" />
      <path d="M10 2.8V15M6.8 9h6.4" strokeOpacity=".5" />
    </>
  ),
  history: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.2l2.8 1.8" />
    </>
  ),
  settings: (
    <>
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 2.8v2M10 15.2v2M2.8 10h2M15.2 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
    </>
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5.2" />
      <path d="m13 13 3.8 3.8" />
    </>
  ),
  menu: <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />,
  close: <path d="m5 5 10 10M15 5 5 15" />,
  chevron: <path d="m7 8 3 3 3-3" />,
  arrow: <path d="M5 10h10m-4-4 4 4-4 4" />,
  refresh: (
    <>
      <path d="M16 10a6 6 0 1 1-1.8-4.3" />
      <path d="M16 3.5v3.2h-3.2" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="4.5" r="1.6" />
      <circle cx="6" cy="15.5" r="1.6" />
      <circle cx="14" cy="7" r="1.6" />
      <path d="M6 6.1v7.8M14 8.6c0 3-3 3.4-6.6 5.4" />
    </>
  ),
  export: (
    <>
      <path d="M10 3v9M6.5 6.5 10 3l3.5 3.5" />
      <path d="M4 12v3.5h12V12" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export default function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
