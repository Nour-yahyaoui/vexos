import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Boxes,
  Code2,
  Cpu,
  Download,
  Layers,
  Monitor,
  Package,
  Sparkles,
  Terminal,
  Wrench,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "VexOS Desktop 1.0: Full-Screen Linux for Web Development",
  description: site.description,
  alternates: { canonical: "/" },
};

const features = [
  {
    icon: Zap,
    title: "Smooth by default",
    text: "XFCE with the Xfwm compositor and vsync, a clean dark theme, and a dock pinned to your tools.",
  },
  {
    icon: Code2,
    title: "VexOS DevStudio",
    text: "A web IDE on your own machine: editor, run button, live preview, terminal, and project templates.",
  },
  {
    icon: Sparkles,
    title: "AI assistant",
    text: "Explain code, fix the last error, or write tests with Groq. Your key stays on this computer.",
  },
  {
    icon: Boxes,
    title: "Ready toolchains",
    text: "Node.js with npm, Rust with cargo, Python 3, gcc and g++, gdb, and cmake are installed.",
  },
  {
    icon: ShieldCheck,
    title: "Built from source",
    text: "Debian trixie packages, a reproducible live-build recipe, and every script in this repository.",
  },
];

const devTools = [
  ["C and C++", "gcc, g++, make, gdb, cmake", "Compile and run with one click in DevStudio"],
  ["JavaScript", "Node.js 20 LTS with npm", "Run scripts, build React and Next.js apps"],
  ["Rust", "rustc and cargo 1.85, rustfmt", "Create and run Cargo projects"],
  ["Python", "Python 3, pip, venv, dev headers", "Run scripts and create virtual environments"],
  ["Web", "Firefox ESR and DevStudio preview", "Open HTML pages and running dev servers"],
  ["Version control", "git", "Clone, commit, and push from the terminal"],
];

const steps = [
  {
    title: "Download the ISO",
    text: "Get the latest VexOS Desktop release from GitHub Releases, then check the file size.",
  },
  {
    title: "Create a VirtualBox VM",
    text: "Type Linux, version Debian (64-bit), 4 GB RAM, 2 CPUs. Under Display, set VMSVGA and 128 MB of video memory.",
  },
  {
    title: "Boot the live desktop",
    text: "Attach the ISO and start the VM. Log in as vex with the password vexos.",
  },
  {
    title: "Start building",
    text: "Open VexOS DevStudio from the dock, create a React or C project, and press Run.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${site.name} ${site.version}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Linux (Debian trixie live ISO), VirtualBox",
    description: site.description,
    url: site.url,
    downloadUrl: site.releases,
    codeRepository: site.repo,
    author: { "@type": "Person", name: site.author, url: site.profile },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.author,
    url: site.profile,
    sameAs: [site.profile, site.repo],
    image: site.avatar,
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="hero-inner">
            <img src="/logo.png" alt="" width={64} height={64} style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 14 }} />
            <p className="eyebrow">Version {site.version} · Debian trixie · VirtualBox</p>
            <h1 id="hero-title">VexOS Desktop: a modern full-screen Linux for web development</h1>
            <p className="lead">
              A live desktop with a built-in IDE for C, Python, JavaScript, React, Next.js, and Rust.
              Boot it in VirtualBox, write code in your browser-style editor, and preview your apps
              without installing anything on your computer.
            </p>
            <div className="hero-actions">
              <a className="btn" href={site.releases} rel="noopener" target="_blank">
                <Download size={18} aria-hidden="true" /> Download the ISO
              </a>
              <Link className="btn btn-ghost" href="/docs/">
                <BookOpen size={18} aria-hidden="true" /> Read the docs
              </Link>
            </div>
            <ul className="facts">
              <li>XFCE desktop</li>
              <li>Firefox ESR</li>
              <li>Node.js + npm</li>
              <li>Rust + cargo</li>
              <li>Python 3</li>
              <li>Full apt</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="explained" className="section" aria-labelledby="explained-title">
        <div className="container split">
          <div>
            <p className="eyebrow">What it is</p>
            <h2 id="explained-title">A desktop that is ready to code the moment it boots</h2>
            <p className="muted">
              VexOS Desktop is a live Linux system built from Debian trixie. You download one ISO, boot it,
              and get a full desktop with a browser, a terminal, and development tools. Nothing is installed
              on your computer, and changes disappear on reboot unless you install the system to disk.
            </p>
            <p className="muted">
              The point is speed: the compilers, runtimes, and the IDE are already set up, so you spend your
              time on code, not on setup. Everything is open source and built from the scripts in this repository.
            </p>
          </div>
          <figure className="shot">
            <img src="/wallpaper.jpg" alt="VexOS Desktop wallpaper: a red-lit ghostly figure in a dark tech room" width={1920} height={1080} loading="lazy" />
            <figcaption>The VexOS Desktop wallpaper, the default background of the live desktop.</figcaption>
          </figure>
        </div>
      </section>

      <section id="architecture" className="section" aria-labelledby="arch-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">How VexOS is built</p>
            <h2 id="arch-title">From the Linux kernel up to your editor</h2>
            <p className="muted">
              VexOS Desktop is a Debian trixie system. Each layer below is a standard Debian or Linux
              component, with VexOS choosing the pieces and adding a few of its own.
            </p>
          </div>
          <ol className="steps">
            <li>
              <h3>Linux kernel</h3>
              <p>
                Debian&apos;s amd64 kernel package (<code>linux-image-amd64</code>) runs the hardware. It includes the
                vmwgfx graphics driver, which handles the VMSVGA display that VirtualBox provides.
              </p>
            </li>
            <li>
              <h3>Debian trixie base</h3>
              <p>
                glibc, systemd, dpkg, and apt come from Debian trixie, with security updates from
                security.debian.org. Any package in the Debian archive can be installed.
              </p>
            </li>
            <li>
              <h3>Live boot image</h3>
              <p>
                live-build packs the system into a compressed, read-only filesystem and writes a hybrid ISO that
                boots on BIOS and UEFI. At boot, the live session adds a writable layer in RAM for your changes.
              </p>
            </li>
            <li>
              <h3>Desktop</h3>
              <p>
                XFCE with the Xfwm compositor, LightDM login, NetworkManager, Firefox ESR, and a Plank dock.
                At login, <code>vexos-fit-screen</code> switches to the largest resolution VirtualBox offers.
              </p>
            </li>
            <li>
              <h3>Developer toolchains</h3>
              <p>
                gcc, g++, make, gdb, and cmake; Node.js 20 LTS with npm; Rust with cargo and rustfmt; Python 3
                with pip and venv; and git. The <code>dev</code> profile adds clang and valgrind.
              </p>
            </li>
            <li>
              <h3>VexOS packages</h3>
              <p>
                <code>vexpad</code> (terminal editor), <code>vexos-branding</code> (logo and wallpaper), and
                <code> vexos-devstudio</code> (the web IDE). Each one is a .deb built from this repository.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section id="where-it-runs" className="section alt" aria-labelledby="where-title">
        <div className="container split">
          <div>
            <p className="eyebrow">Where it lives</p>
            <h2 id="where-title">One ISO file, running in a virtual machine</h2>
            <p className="muted">
              The build produces a single file, <code>live-image-amd64.hybrid.iso</code>. You download it from
              GitHub Releases and attach it to a VirtualBox virtual machine. Your own computer&apos;s system
              and disk are not changed.
            </p>
            <p className="muted">
              Each boot loads the whole system from the ISO. What you change during a session lives in RAM, so a
              reboot returns the system to its starting state. This is what makes it safe to experiment.
            </p>
          </div>
          <div className="card">
            <h3><Layers size={18} aria-hidden="true" /> Boot path</h3>
            <pre><code>{`VirtualBox VM
 └─ BIOS or UEFI loads the hybrid ISO
     └─ Linux kernel + initramfs (live-boot)
         └─ squashfs root + RAM overlay
             └─ LightDM autologin as vex
                 └─ XFCE session, DevStudio in the dock`}</code></pre>
          </div>
        </div>
      </section>

      <section id="why-advanced" className="section" aria-labelledby="why-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Why it fits advanced work</p>
            <h2 id="why-title">A real Debian system you can take apart</h2>
          </div>
          <div className="grid">
            <article className="card">
              <div className="card-icon" aria-hidden="true"><Cpu size={22} /></div>
              <h3>Real Debian packages</h3>
              <p>Not a mini distro. The same archive, the same apt, and the same packages a Debian server uses.</p>
            </article>
            <article className="card">
              <div className="card-icon" aria-hidden="true"><Boxes size={22} /></div>
              <h3>Profiles you choose</h3>
              <p>Build <code>minimal</code> (terminal only), <code>desktop</code> (default), or <code>dev</code> (adds clang and valgrind).</p>
            </article>
            <article className="card">
              <div className="card-icon" aria-hidden="true"><ShieldCheck size={22} /></div>
              <h3>Reproducible from source</h3>
              <p>The image is built from the scripts in this repository. Every package list is a plain text file you can review.</p>
            </article>
            <article className="card">
              <div className="card-icon" aria-hidden="true"><Terminal size={22} /></div>
              <h3>Safe to break</h3>
              <p>Use sudo and try anything. A reboot restores the clean system, so a bad experiment costs you a restart.</p>
            </article>
          </div>
          <p className="muted small" style={{ marginTop: 18 }}>
            Limits to know: the live system has no installer to disk yet, so anything you want to keep must be saved
            outside the session. There are no VirtualBox Guest Additions, so the desktop does not follow window
            resizes and clipboard sharing is not available.
          </p>
        </div>
      </section>

      <section id="platforms" className="section alt" aria-labelledby="platforms-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Web, mobile, and desktop</p>
            <h2 id="platforms-title">What you can build on it</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Target</th>
                  <th scope="col">Ready in the image</th>
                  <th scope="col">How it works</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Web</strong></td>
                  <td>Node.js and npm, Firefox ESR, DevStudio templates for React (Vite), Next.js, and static pages</td>
                  <td className="muted">Create a project in DevStudio, press Run, and check it in the Preview tab. Firefox&apos;s responsive design mode (Ctrl+Shift+M) tests screen sizes.</td>
                </tr>
                <tr>
                  <td><strong>Mobile</strong></td>
                  <td>The web tools above. Android and iOS SDKs and emulators are not included.</td>
                  <td className="muted">Build responsive pages and installable web apps (PWAs), and test them in Firefox at phone sizes. Native mobile tooling is added by you with apt or npm.</td>
                </tr>
                <tr>
                  <td><strong>Desktop and systems</strong></td>
                  <td>gcc, g++, make, cmake, gdb, Rust with cargo, Python 3, git</td>
                  <td className="muted">Write C and C++ programs with make or cmake, debug them with gdb, and build Rust crates with cargo.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="packages" className="section" aria-labelledby="packages-title">
        <div className="container split">
          <div>
            <p className="eyebrow">Installing software</p>
            <h2 id="packages-title">Add packages with apt, npm, or pip</h2>
            <ul className="muted">
              <li><strong>System packages:</strong> run <code>sudo apt update</code>, then <code>sudo apt install &lt;name&gt;</code>. The full Debian archive is available, including contrib, non-free, and non-free-firmware.</li>
              <li><strong>Node.js:</strong> <code>npm install &lt;package&gt;</code> inside a project folder.</li>
              <li><strong>Python:</strong> use a virtual environment. Debian blocks system-wide pip installs, so run <code>python3 -m venv .venv</code> first.</li>
              <li><strong>VexOS packages:</strong> install a downloaded .deb with <code>sudo apt install ./name.deb</code>. A hosted VexOS package repository is planned but not live yet.</li>
            </ul>
            <p className="small muted">Installed packages stay until you reboot. The live session does not keep changes on the ISO.</p>
          </div>
          <div className="card">
            <h3><Package size={18} aria-hidden="true" /> Example</h3>
            <pre><code>{`sudo apt update
sudo apt install sqlite3
npm install zod          # inside a project
python3 -m venv .venv && . .venv/bin/activate
pip install requests`}</code></pre>
          </div>
        </div>
      </section>

      <section id="features" className="section alt" aria-labelledby="features-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Features</p>
            <h2 id="features-title">Everything in one full-screen workspace</h2>
            <p className="muted">Each part is built to stay out of your way and keep the desktop fast.</p>
          </div>
          <div className="grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="card" key={title}>
                <div className="card-icon" aria-hidden="true">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="dev-tools" className="section" aria-labelledby="dev-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Developer tools</p>
            <h2 id="dev-title">Preinstalled toolchains</h2>
            <p className="muted">
              Versions come from Debian trixie. Check them with <code>gcc --version</code>, <code>node -v</code>, and <code>cargo --version</code>.
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Area</th>
                  <th scope="col">Installed</th>
                  <th scope="col">What you do with it</th>
                </tr>
              </thead>
              <tbody>
                {devTools.map(([area, installed, use]) => (
                  <tr key={area}>
                    <td><strong>{area}</strong></td>
                    <td>{installed}</td>
                    <td className="muted">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="devstudio" className="section alt" aria-labelledby="ds-title">
        <div className="container split">
          <div>
            <p className="eyebrow">VexOS DevStudio</p>
            <h2 id="ds-title">A web IDE that runs on your machine</h2>
            <p className="muted">
              DevStudio starts a small server that only your computer can reach, then opens in Firefox.
              Create a project, edit files with syntax colors, press Run, and see the output or the live preview.
            </p>
            <ul className="muted">
              <li>New projects: C, Python, Node.js, static page, React (Vite), Next.js, Rust</li>
              <li>Run C, C++, Python, JavaScript, Rust, and shell scripts</li>
              <li>Terminal box for any command in the project folder</li>
              <li>AI assistant with your own Groq API key</li>
            </ul>
            <p><Link href="/docs/#devstudio">Read the DevStudio guide</Link></p>
          </div>
          <div className="card">
            <h3><Terminal size={18} aria-hidden="true" /> Quick start</h3>
            <pre><code>{`# in the VexOS terminal
cd ~/VexProjects
# create a React app from DevStudio, then:
#   Run  →  open the Preview tab`}</code></pre>
            <p className="small muted">The server listens on 127.0.0.1 only. The AI key is saved on this computer and never shown in full.</p>
          </div>
        </div>
      </section>

      <section id="get-started" className="section" aria-labelledby="start-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Get started</p>
            <h2 id="start-title">From download to first build in four steps</h2>
          </div>
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <p style={{ marginTop: 24 }}>
            <Link className="btn btn-ghost" href="/docs/#install">
              <Monitor size={18} aria-hidden="true" /> Full VirtualBox setup
            </Link>
          </p>
        </div>
      </section>

      <section id="learn" className="section alt" aria-labelledby="learn-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Learn</p>
            <h2 id="learn-title">Documentation and tutorials</h2>
            <p className="muted">Step-by-step guides for your first session, your first projects, and building the ISO yourself.</p>
          </div>
          <div className="grid">
            <Link className="card" href="/docs/#install" style={{ borderBottom: 0 }}>
              <div className="card-icon" aria-hidden="true"><Monitor size={22} /></div>
              <h3>Install in VirtualBox</h3>
              <p>VM settings, display setup, and first boot.</p>
            </Link>
            <Link className="card" href="/docs/#tutorials" style={{ borderBottom: 0 }}>
              <div className="card-icon" aria-hidden="true"><Code2 size={22} /></div>
              <h3>Ten tutorials</h3>
              <p>Python, Node.js, C, React, Next.js, Rust, and AI-assisted fixes.</p>
            </Link>
            <Link className="card" href="/docs/#build" style={{ borderBottom: 0 }}>
              <div className="card-icon" aria-hidden="true"><Wrench size={22} /></div>
              <h3>Build the ISO</h3>
              <p>A sparse clone, live-build, and what to expect from the output.</p>
            </Link>
            <Link className="card" href="/docs/#troubleshooting" style={{ borderBottom: 0 }}>
              <div className="card-icon" aria-hidden="true"><Layers size={22} /></div>
              <h3>Troubleshooting and FAQ</h3>
              <p>Small screen, slow system, lost files, and common questions.</p>
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="section" aria-labelledby="about-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">About</p>
            <h2 id="about-title">Built by {site.author}</h2>
          </div>
          <div className="card profile">
            <img className="avatar" src={site.avatar} alt={`${site.author} on GitHub`} width={120} height={120} loading="lazy" />
            <div>
              <h3>{site.author}</h3>
              <p className="muted">
                Developer and maintainer of VexOS. The source code, build scripts, issues, and releases
                are all public on GitHub.
              </p>
              <div className="profile-actions">
                <a className="btn" href={site.profile} rel="noopener" target="_blank">GitHub profile</a>
                <a className="btn btn-ghost" href={site.repo} rel="noopener" target="_blank">Repository</a>
                <a className="btn btn-ghost" href={site.releases} rel="noopener" target="_blank">Releases</a>
              </div>
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 18 }}>
            <Cpu size={14} aria-hidden="true" /> The desktop build is a Debian trixie live ISO. The repository also contains the Linux kernel source that the terminal edition builds on.
          </p>
        </div>
      </section>
    </>
  );
}
