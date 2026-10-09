import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Captain Cook",
    short_name: "Captain Cook",
    description: "Lični AI kuvar — predlozi jela od namirnica koje imaš.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0d0c",
    theme_color: "#0f0d0c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
