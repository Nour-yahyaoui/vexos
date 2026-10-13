import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Documentation: Linux Live ISO Guide",
  description:
    "VexOS Desktop docs: run the Linux live ISO in VirtualBox, first login, the DevStudio web IDE, ten web and C tutorials, building the Debian trixie ISO, and FAQ.",
  alternates: { canonical: "/docs/" },
  openGraph: {
    title: "VexOS Desktop documentation: Linux live ISO in VirtualBox",
    description: "Install the VexOS Linux distro in VirtualBox, learn the DevStudio IDE, and build the ISO from source.",
  },
};

const toc = [
  ["install", "Install in VirtualBox"],
  ["first-login", "First login"],
  ["desktop", "The desktop"],
  ["devstudio", "VexOS DevStudio"],
  ["tutorials", "Tutorials"],
  ["build", "Build the ISO"],
  ["troubleshooting", "Troubleshooting"],
  ["faq", "FAQ"],
] as const;

export default function DocsPage() {
  return (
    <div className="container docs-layout">
      <aside className="toc" aria-label="On this page">
        <h2>On this page</h2>
        <ol>
          {toc.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ol>
      </aside>

      <article className="doc">
        <p className="eyebrow">Documentation</p>
        <h1>VexOS Desktop {site.version}</h1>
        <p className="muted">
          VexOS Desktop is a Debian trixie live desktop for web development. This page covers installing it,
          using DevStudio, the tutorials, building the ISO, and common problems.
        </p>

        <section id="install">
          <h2>Install in VirtualBox</h2>
          <ol>
            <li>
              <strong>Download the ISO</strong> from <a href={site.releases} rel="noopener" target="_blank">GitHub Releases</a>.
              Check that the download finished before you continue.
            </li>
            <li>
              <strong>Create the VM.</strong> Type Linux, version Debian (64-bit), 4 GB RAM (more is better), and 2 CPUs.
              A disk is optional because this is a live system.
            </li>
            <li>
              <strong>Set the display.</strong> Under Display, set Graphics Controller to <code>VMSVGA</code> and Video Memory
              to <code>128 MB</code>. The desktop uses the largest resolution the VM offers at login.
            </li>
            <li>
              <strong>Attach the ISO</strong> to the optical drive, then start the VM. BIOS works by default. Enable EFI only if you need UEFI.
            </li>
          </ol>
          <div className="callout">
            <strong>Window size</strong>
            The image has no VirtualBox Guest Additions yet, so the desktop does not resize when you resize the VM window.
            If it stays small, open Settings &gt; Display and pick the largest resolution.
          </div>
        </section>

        <section id="first-login">
          <h2>First login</h2>
          <p>
            The live user is <code>{site.defaultUser}</code> with the password <code>{site.defaultPassword}</code>, and it has sudo.
            Change the password after your first login with <code>passwd</code>.
          </p>
          <p>
            Changes you make in the live session are lost on reboot. To keep files, copy them to a shared folder or
            install the system to disk when that option is available.
          </p>
        </section>

        <section id="desktop">
          <h2>The desktop</h2>
          <ul>
            <li><strong>Top bar:</strong> applications menu, clock, and system tray.</li>
            <li><strong>Dock:</strong> on the left, with Firefox, Terminal, and VexOS DevStudio.</li>
            <li><strong>Look:</strong> the Yaru dark theme in VexOS red, Yaru icons, and the Ubuntu font.</li>
            <li><strong>Desktop folder:</strong> sample files. <code>hello-web.html</code> runs JavaScript in Firefox, <code>hello.py</code> runs with <code>python3 hello.py</code>, and <code>about-vexos.html</code> shows the About page.</li>
            <li><strong>vexpad:</strong> a small terminal editor. <code>vexpad --help</code> shows About and system information. <code>vexpad --guide</code> shows the editor cheat sheet.</li>
            <li><strong>Packages:</strong> apt works on Debian mirrors. For example, <code>sudo apt install htop</code>.</li>
          </ul>
        </section>

        <section id="devstudio">
          <h2>VexOS DevStudio</h2>
          <p>
            DevStudio is a web IDE that runs on your computer. Open it from the dock or the application menu. It starts a
            local server on <code>127.0.0.1:8765</code> and opens Firefox. Only this computer can reach it.
          </p>
          <h3>What you can do</h3>
          <ul>
            <li><strong>Edit</strong> files with tabs, syntax colors, and Ctrl+S to save.</li>
            <li><strong>Run</strong> with Ctrl+Enter: C and C++ (gcc and g++), Python, JavaScript (Node.js), Rust, and shell scripts. Answer a program&apos;s questions in the input box.</li>
            <li><strong>Create projects</strong> from the New project menu: C, Python, Node.js, static web page, React (Vite), Next.js, and Rust (Cargo).</li>
            <li><strong>Preview</strong> running web apps in the Preview tab.</li>
            <li><strong>Use the terminal box</strong> for any command in the selected folder, for example <code>npm install axios</code>.</li>
            <li><strong>Ask the AI</strong> to explain code, fix the last error, improve a file, or write tests.</li>
          </ul>
          <p>Projects live in <code>~/VexProjects</code>.</p>

          <h3>Add your Groq API key</h3>
          <ol>
            <li>Create a key at <a href="https://console.groq.com/keys" rel="noopener" target="_blank">console.groq.com/keys</a>.</li>
            <li>In DevStudio, open <strong>Settings</strong>, paste the key, and click <strong>Save</strong>.</li>
          </ol>
          <div className="callout">
            <strong>Where the key goes</strong>
            The key is saved only on this computer, in a file that only your user can read. The screen shows only its last
            characters. It is sent only to <code>api.groq.com</code>, when you ask the AI something.
          </div>

          <h3>Known limits</h3>
          <ul>
            <li>The syntax-colored editor loads from the internet the first time. Without internet, DevStudio uses a plain text editor.</li>
            <li>React and Next.js projects download packages when they are created, so they need internet.</li>
            <li>Debian&apos;s npm is version 9.2. To update it, run <code>sudo npm install -g npm@latest</code>.</li>
            <li>There is no debugger panel yet. Use gdb from the terminal.</li>
          </ul>
        </section>

        <section id="tutorials">
          <h2>Tutorials</h2>

          <h3>1. Your first Python project</h3>
          <ol>
            <li>Choose <strong>Python project</strong>, click <strong>New project</strong>, and name it <code>hello-py</code>.</li>
            <li>Open <code>main.py</code>, change the message, and save with Ctrl+S.</li>
            <li>Press <strong>Run</strong>. The output panel shows what the script printed.</li>
          </ol>

          <h3>2. A Node.js script</h3>
          <ol>
            <li>Choose <strong>Node.js project</strong> and name it <code>hello-node</code>.</li>
            <li>Edit <code>index.js</code> and press <strong>Run</strong>.</li>
            <li>To add a package, type <code>npm install lodash</code> in the terminal box.</li>
          </ol>

          <h3>3. Install software with apt</h3>
          <pre><code>{`sudo apt update
sudo apt install htop
htop`}</code></pre>

          <h3>4. Edit text with vexpad</h3>
          <pre><code>{`vexpad notes.txt
# i to type, Esc to stop, :wq to save and quit`}</code></pre>

          <h3>5. Compile and run C</h3>
          <ol>
            <li>Choose <strong>C project</strong>, create <code>hello-c</code>, and open <code>main.c</code>.</li>
            <li>Change the message to <code>printf(&quot;Hello, VexOS!\n&quot;);</code>.</li>
            <li>Press <strong>Run</strong>. Compiler warnings appear with their line numbers, and errors stop the program from running.</li>
          </ol>

          <h3>6. Build a React app</h3>
          <ol>
            <li>Choose <strong>React (Vite)</strong> and create <code>my-react</code>. This downloads packages, so it needs internet.</li>
            <li>Open <code>src/App.jsx</code>, edit the text, and save.</li>
            <li>Press <strong>Run</strong>. The app opens in the Preview tab, and each save reloads it. Press <strong>Stop</strong> when you are finished.</li>
          </ol>

          <h3>7. Build a Next.js app</h3>
          <p>
            Choose <strong>Next.js app</strong> and name it <code>my-next</code>. The project uses TypeScript, the App Router,
            Tailwind, and ESLint. Run it the same way as the React app. It opens in Preview on port 3000.
          </p>

          <h3>8. Rust with Cargo</h3>
          <ol>
            <li>Choose <strong>Rust (Cargo)</strong> and create <code>hello-rust</code>.</li>
            <li>Press <strong>Run</strong>. Cargo builds and runs <code>src/main.rs</code>.</li>
            <li>To add a crate, type <code>cargo add serde</code> in the terminal box, inside the project folder.</li>
          </ol>

          <h3>9. Ask the AI about an error</h3>
          <ol>
            <li>Make a mistake on purpose and press <strong>Run</strong>.</li>
            <li>Press <strong>Fix error</strong> in the AI panel. The assistant reads the file and the last output, then explains the problem and gives a fix.</li>
            <li>Press <strong>Replace file</strong> to apply the fix, or <strong>Insert at cursor</strong> to add it where you are typing.</li>
          </ol>

          <h3>10. Make a web page</h3>
          <ol>
            <li>Choose <strong>Static web page</strong> and create <code>my-site</code>.</li>
            <li>Edit <code>index.html</code> and open it in the Preview tab.</li>
            <li>To try it in Firefox directly, open the file from the Desktop folder or the project folder.</li>
          </ol>
        </section>

        <section id="build">
          <h2>Build the ISO</h2>
          <p>
            You can build the ISO from source on a Debian or Ubuntu machine, or in a Debian virtual machine. WSL often cannot run the build. Needs about 25 GB of
            free disk, 4 GB of RAM, and an internet connection. A build takes 30 to 90 minutes.
          </p>
          <h3>1. Install the build tools</h3>
          <pre><code>{`sudo apt update
sudo apt install -y git live-build dpkg-dev`}</code></pre>
          <h3>2. Download only the desktop folder</h3>
          <pre><code>{`git clone --filter=blob:none --sparse --depth 1 --branch arena/fd4ab751-vexos \\
  ${site.repo}.git vexos
cd vexos
git sparse-checkout set distro/vexos-desktop
cd distro/vexos-desktop`}</code></pre>
          <h3>3. Check, configure, and build</h3>
          <pre><code>{`sh validate.sh          # checks files and scripts, builds nothing
sudo sh auto/config     # builds the VexOS packages and the live-build config
sudo sh auto/build      # output: live-image-amd64.hybrid.iso`}</code></pre>
          <p>
            The log is saved to <code>build.log</code>. The ISO is written to the same folder. Check its size with
            <code> ls -lh *.iso</code>. To start over, run <code>sudo sh auto/clean</code>.
          </p>
          <h3>What to expect</h3>
          <ul>
            <li>A file named <code>live-image-amd64.hybrid.iso</code> in <code>distro/vexos-desktop/</code>. It is large because it includes the development tools.</li>
            <li>If the build stops, the last lines of <code>build.log</code> show the failing package.</li>
          </ul>
        </section>

        <section id="troubleshooting">
          <h2>Troubleshooting</h2>
          <h3>The desktop is small and does not fill the window</h3>
          <p>
            Set Display to VMSVGA with 128 MB of video memory, then log in again. Without Guest Additions the desktop
            follows the VM&apos;s display mode, not the window. Use Settings &gt; Display to choose a larger resolution.
          </p>
          <h3>The VM does not boot the ISO</h3>
          <p>Check that the ISO is attached to the optical drive and that it is first in the boot order. Try BIOS mode first.</p>
          <h3>The system is slow</h3>
          <p>Give the VM more RAM and two or more CPUs. Close apps you do not use.</p>
          <h3>Copy and paste does not work between my computer and the VM</h3>
          <p>Clipboard sharing needs VirtualBox Guest Additions, which this image does not include yet.</p>
          <h3>Something I installed disappeared</h3>
          <p>The live system resets on reboot. Save your files to a shared folder, or install the system to disk.</p>
          <h3>DevStudio does not open</h3>
          <p>Open the terminal and run <code>vexos-devstudio</code>. The server log is in <code>~/.local/state/vexos-devstudio/server.log</code>.</p>
        </section>

        <section id="faq">
          <h2>FAQ</h2>
          <h3>Is VexOS a Debian distribution?</h3>
          <p>Yes. VexOS Desktop is built on Debian trixie with live-build, and it uses Debian packages and apt.</p>
          <h3>Is it free?</h3>
          <p>The project is open source. Check the repository for the license terms.</p>
          <h3>Can I install it on a real computer?</h3>
          <p>The ISO is a live system, so it runs from the disk without changing it. Installing to disk is not part of this release yet.</p>
          <h3>Where is the source?</h3>
          <p>
            On GitHub at <a href={site.repo} rel="noopener" target="_blank">{site.repo.replace("https://", "")}</a>, by{" "}
            <a href={site.profile} rel="noopener" target="_blank">{site.author}</a>.
          </p>
          <h3>Where do I start?</h3>
          <p>
            Read <a href="#install">Install in VirtualBox</a>, then try <a href="#tutorials">tutorial 5</a> or <a href="#tutorials">tutorial 6</a>.
            Back to the <Link href="/">home page</Link>.
          </p>
        </section>
      </article>
    </div>
  );
}
