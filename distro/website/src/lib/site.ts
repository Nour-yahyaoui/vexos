// Central site facts. Change them here, not in every page.
export const site = {
  name: "VexOS Desktop",
  version: "2.2.1",
  tagline: "A modern full-screen Linux desktop for web development",
  description:
    "VexOS Desktop 2.2.1 is a Debian trixie live desktop with XFCE, Firefox ESR, Python 3, Node.js, Rust, and VexOS DevStudio, a built-in web IDE for C, Python, JavaScript, React, Next.js, and Rust. Boots in VirtualBox.",
  // Public address of the deployed site (Vercel). Override with NEXT_PUBLIC_SITE_URL.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vexos-omega.vercel.app",
  author: "Nour-yahyaoui",
  profile: "https://github.com/Nour-yahyaoui",
  avatar: "https://github.com/Nour-yahyaoui.png?size=240",
  repo: "https://github.com/Nour-yahyaoui/vexos",
  releases: "https://github.com/Nour-yahyaoui/vexos/releases",
  defaultUser: "vex",
  defaultPassword: "vexos",
} as const;
