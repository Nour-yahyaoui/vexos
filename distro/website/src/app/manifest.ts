import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} ${site.version}`,
    short_name: "VexOS",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#07060a",
    theme_color: "#07060a",
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
