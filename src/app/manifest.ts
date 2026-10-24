import type { MetadataRoute } from "next";

/** Makes PRISM installable from the browser ("Install app" / "Add to Home Screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "PRISM: code intelligence",
    short_name: "PRISM",
    description: "Security, architecture, dependencies and performance of your repositories, mapped as one system.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#050507",
    theme_color: "#050507",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Your repositories", url: "/app/repos" },
      { name: "New analysis", url: "/app/new" },
    ],
  };
}
