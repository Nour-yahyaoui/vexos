// Central site facts. Change them here, not in every page.
export const site = {
  name: "VexOS Desktop",
  version: "1.0",
  tagline: "A modern full-screen Linux desktop for web development",
  description:
    "VexOS Desktop 1.0 is a Debian trixie live desktop with XFCE, Firefox ESR, Python 3, Node.js, Rust, and VexOS DevStudio, a built-in web IDE for C, Python, JavaScript, React, Next.js, and Rust. Boots in VirtualBox.",
  // Public address of the deployed site. Set NEXT_PUBLIC_SITE_URL at build time.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nour-yahyaoui.github.io",
  author: "Nour-yahyaoui",
  profile: "https://github.com/Nour-yahyaoui",
  avatar: "https://github.com/Nour-yahyaoui.png?size=240",
  repo: "https://github.com/Nour-yahyaoui/vexos",
  releases: "https://github.com/Nour-yahyaoui/vexos/releases",
  defaultUser: "vex",
  defaultPassword: "vexos",
} as const;
