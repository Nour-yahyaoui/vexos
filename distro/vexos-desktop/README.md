# VexOS Desktop 1.0 (Debian trixie based)

A Debian-based live desktop that boots in VirtualBox (BIOS or EFI):

- XFCE desktop, LightDM login, NetworkManager
- Firefox ESR for HTML and JavaScript
- Python 3 (with pip and venv), Node.js and npm
- Full apt package manager (Debian mirrors), git, build-essential
- Full screen: at login the desktop switches to the largest resolution the VM offers (`vexos-fit-screen`). Use VMSVGA with 128 MB video memory. No Guest Additions yet, so the desktop does not follow window resizes and there is no clipboard sharing
- Smooth desktop: XFCE with the Xfwm compositor, vsync, and a Plank dock pinned to Firefox, Terminal, and DevStudio
- VexOS wallpaper, set as the default XFCE background
- `vexpad`, the same terminal editor as VexOS Linux (`vexpad --help`)

The live session user is `vex` with password `vexos`, and has sudo. Change the password with `passwd` after your first login.
Anything you install or change is lost on reboot unless you install to disk.

## Profiles

Pick what goes into the image with `VEXOS_PROFILE` (default `desktop`):

```sh
sudo VEXOS_PROFILE=minimal sh auto/config    # terminal only, 11 packages
sudo VEXOS_PROFILE=desktop sh auto/config    # XFCE + Firefox ESR (default)
sudo VEXOS_PROFILE=dev sh auto/config        # desktop + compilers and Node.js
```

Profiles are plain lists in `profiles/` (`base.list`, `desktop.list`, `dev.list`).
Edit those files, not the generated `config/package-lists/vexos.list.chroot`.

## VexOS packages

Custom packages live in `packages/src/`:

- `vexpad`: the terminal editor (`/usr/bin/vexpad`).
- `vexos-branding`: logo and wallpaper.
- `vexos-devstudio`: the DevStudio web IDE, its server, and its desktop entry.

`auto/config` builds them with `packages/build-debs.sh` into `config/packages.chroot/`,
so the ISO installs them directly. The script also writes an apt index (`packages/dist/Packages`)
for a future hosted repository. Build them alone with:

```sh
sh packages/build-debs.sh
```

To add a package, create `packages/src/<name>/DEBIAN/control` and its files under the same folder.

## Development environment

The desktop ships a ready development setup. All of it is installed by default:

| Area | What is installed |
|---|---|
| C and C++ | gcc, g++, make, gdb, cmake |
| JavaScript | Node.js 20 LTS (Debian `nodejs` 20.19) with npm |
| Rust | rustc and cargo 1.85, rustfmt |
| Python | Python 3 with pip, venv, and development headers |
| Version control | git |
| IDE | **VexOS DevStudio** (see below) |

The `dev` profile adds clang and valgrind on top.

### VexOS DevStudio

A web IDE that runs on this computer. Open it from the desktop icon or the application menu. It starts a local server and opens Firefox.

- **Editor:** tabs, syntax colors (Monaco, the editor from VS Code), Ctrl+S to save.
- **Run:** Ctrl+Enter runs the open file or project. Supported: `.c`, `.cpp`, `.py`, `.js`, `.rs`, `.sh`, and folders with `Cargo.toml`, `package.json` (`dev` or `start` script), `Makefile`, or a `main.c`.
- **Input:** type into the input box under the output to answer a program's questions.
- **Terminal:** the command box runs any shell command in the selected folder (for example `npm install axios`).
- **New project:** C, Python, Node.js, static web page, React (Vite), Next.js (TypeScript, App Router, Tailwind), and Rust (Cargo).
- **Preview:** a running web app (Vite, Next.js, and others) opens in the Preview tab. Open `.html` files there too.
- **AI assistant:** explain code, fix the last error, improve a file, or write tests. Replies can be inserted into the file. Add a Groq API key in Settings.

Workspace: `~/VexProjects`. Settings and the API key: `~/.config/vexos-devstudio/settings.json` (readable only by you).

**AI key.** Create a key at [console.groq.com/keys](https://console.groq.com/keys) and paste it in Settings. The key stays on this computer. It is sent only to `api.groq.com`, and the screen shows only its last four characters. The default model is `llama-3.3-70b-versatile`; you can change it in Settings.

**Security.** The server listens on `127.0.0.1` only, so other computers cannot reach it. Every API call needs a token that the server creates each time it starts. Other websites cannot read it, so they cannot drive the IDE.

**Known limits.**
- The syntax-colored editor loads from the internet on first start. Without internet, DevStudio uses a plain text editor.
- React and Next.js projects download packages from npm when they are created, so they need internet.
- Debian's npm is version 9.2. To update it, run `sudo npm install -g npm@latest`.
- Debugging with gdb is available from the terminal. There is no debugger panel yet.

The package sources are in `packages/src/vexos-devstudio/` (server, web UI, launcher, and desktop entry).

## Check before building

```sh
sh validate.sh      # checks files, scripts, package list, wallpaper; no build
```

## Build (on a Debian or Ubuntu machine, not in the sandbox)

Needs about 25 GB free disk, 4 GB RAM, and an internet connection. The development tools make the image larger than before. A build takes 30-90 minutes.

```sh
sudo apt install live-build
cd distro/vexos-desktop
sudo sh auto/config       # writes the live-build configuration
sudo sh auto/build        # output: live-image-amd64.hybrid.iso
```

If you need to start over: `sudo sh auto/clean`.

On Ubuntu, `live-build` may be an older version. Debian trixie hosts work best.

## Run in VirtualBox

1. New VM: Type *Linux*, Version *Debian (64-bit)*, 4 GB RAM, 2 CPUs, 20 GB disk (optional).
2. Storage: attach `live-image-amd64.hybrid.iso` to the optical drive.
3. Display: set Video Memory to 128 MB and Graphics Controller to VMSVGA (Display settings). System > Enable EFI only if you want UEFI; BIOS works by default.
4. Start the VM. The live desktop boots; a `Desktop/` folder has sample files:
   - `hello-web.html`: open it in Firefox to test JavaScript.
   - `hello.py`: run with `python3 hello.py` in a terminal.

## Layout

```
auto/config                       live-build settings (Debian trixie, amd64, ISO)
auto/build, auto/clean            build and cleanup
config/package-lists/             packages installed into the image
config/hooks/normal/              build hooks (VexOS branding)
config/includes.chroot/etc/skel/  files copied into every new user's home
```

## Notes

- Not built or tested inside the sandbox: its Debian mirror is blocked, so the first real build happens on your machine.
- Firefox is Firefox ESR, not a custom browser. VexOS is a distribution around the existing browser.
- The package list is a starting point. Add packages to `config/package-lists/vexos.list.chroot` and rebuild.
