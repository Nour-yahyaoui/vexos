// SEO facts and structured data, in one place. The FAQ below is both shown on
// the landing page and written to the page's FAQPage JSON-LD, so the two match.
import { site } from "@/lib/site";

export const keywords = [
  "VexOS", "VexOS Desktop", "VexOS Desktop 2.2.1", "Nour-yahyaoui",
  "Linux distro", "Linux distribution", "Linux image", "Linux live ISO", "live ISO",
  "Debian trixie", "Debian live ISO", "Linux for web development", "Linux for developers",
  "Linux distro for web development", "Linux VirtualBox image", "VirtualBox Linux",
  "XFCE desktop", "Ubuntu-style Linux", "Yaru theme", "Firefox ESR", "Node.js", "npm",
  "Rust cargo", "Python 3", "gcc", "DevStudio", "web IDE", "React", "Next.js",
  "Groq AI", "build Debian live ISO",
];

export const faq = [
  {
    q: "What is VexOS Desktop?",
    a: "VexOS Desktop is a free Linux distribution and live ISO built on Debian trixie. It boots in VirtualBox and runs from memory, with the XFCE desktop, Firefox ESR, Node.js, Rust, Python 3, and the DevStudio web IDE.",
  },
  {
    q: "Is VexOS a Linux distro?",
    a: "Yes. VexOS is a Debian-based Linux distribution. It uses Debian's kernel and packages, and adds its own desktop configuration, developer tools, and packages on top.",
  },
  {
    q: "Is VexOS Desktop free to download?",
    a: "Yes. The ISO can be downloaded from GitHub Releases at no cost, and the source code and build scripts are public on GitHub.",
  },
  {
    q: "How do I run a Linux live image in VirtualBox?",
    a: "Create a VM with type Linux and version Debian (64-bit), 4 GB of RAM, and 2 CPUs. Set the display to VMSVGA with 128 MB of video memory, attach the ISO to the optical drive, and start the VM. Log in as vex with the password vexos.",
  },
  {
    q: "Which Linux distro is good for web development?",
    a: "VexOS Desktop comes with Node.js and npm, Rust with cargo, Python 3, git, and Firefox ESR. The DevStudio web IDE creates React (Vite), Next.js, and static web projects, and previews them in the browser.",
  },
  {
    q: "Who made VexOS?",
    a: `VexOS is made by ${site.author}, a developer. The code, build scripts, and releases are on GitHub at ${site.profile.replace("https://", "")}.`,
  },
  {
    q: "Can I install more software on VexOS Desktop?",
    a: "Yes. Use sudo apt update and sudo apt install with the full Debian archive, or npm and pip for language packages. Changes last until you reboot, because the live system runs from memory.",
  },
];

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    alternateName: ["VexOS", "VexOS Linux Desktop"],
    url: site.url,
    description: site.description,
    inLanguage: "en",
    publisher: { "@id": `${site.url}/#person` },
  };
}

export function personLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${site.url}/#person`,
    name: site.author,
    alternateName: ["Nour Yahyaoui"],
    url: site.profile,
    image: site.avatar,
    sameAs: [site.profile, site.repo],
    jobTitle: "Developer",
    knowsAbout: ["Linux", "Debian", "Web development", "Rust", "Node.js", "C"],
    description: `Creator of ${site.name}, a Linux distribution for web development.`,
  };
}

export function softwareLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${site.name} ${site.version}`,
    alternateName: "VexOS",
    applicationCategory: "DeveloperApplication",
    applicationSuite: "VexOS",
    operatingSystem: "Linux (Debian trixie live ISO), VirtualBox",
    description: site.description,
    url: site.url,
    downloadUrl: site.releases,
    softwareVersion: site.version,
    codeRepository: site.repo,
    author: { "@id": `${site.url}/#person` },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function faqLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
