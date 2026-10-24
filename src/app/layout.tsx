import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SceneLoader from "@/components/canvas/SceneLoader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "PRISM — See your code differently", template: "%s · PRISM" },
  description:
    "Code intelligence for your whole repository: security, architecture, dependencies and performance, mapped in three dimensions.",
};

export const viewport: Viewport = {
  themeColor: "#050507",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <div aria-hidden="true" className="ambient pointer-events-none fixed inset-0 z-0" />
        {/* Page content sits above the canvas; 3D shows through its transparent areas. */}
        <div className="relative z-10">{children}</div>
        <SceneLoader />
      </body>
    </html>
  );
}
