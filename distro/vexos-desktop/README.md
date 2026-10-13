# VexOS Desktop 2.2.1 (Debian trixie based)

VexOS Desktop is a live Linux desktop built from Debian trixie. It boots from one ISO in VirtualBox (BIOS or UEFI) and runs entirely from memory. It is set up for web, C, Python, and Rust development.

**Status:** release candidate. The ISO build is being finalised, and testing in VirtualBox is in progress.

## What it includes

- **Desktop:** XFCE with the Xfwm compositor and vsync, styled like Ubuntu: a top bar (applications menu, clock, system tray), a Plank dock on the left pinned to Firefox, Terminal, and DevStudio, the Yaru theme (red dark variant) and Yaru icons, and the Ubuntu font. LightDM login with autologin, NetworkManager, and the VexOS wallpaper.
- **Full screen:** at login, `vexos-fit-screen` switches to the largest resolution the VM offers. Use VMSVGA with 128 MB of video memory.
- **Browser:** Firefox ESR.
- **Development toolchains:** gcc, g++, make, gdb, cmake; Node.js 20 LTS with npm; Rust with cargo and rustfmt; Python 3 with pip, venv, and development headers; git; build-essential.
- **VexOS packages:**
  - `vexpad`: terminal editor. `vexpad --help` shows About and system info; `vexpad --guide` shows the editor cheat sheet.
  - `vexos-branding`: logo, wallpaper, and OS identity (`/etc/os-release` reports VexOS Desktop 2.2.1).
  - `vexos-devstudio`: the DevStudio web IDE.
- **Package manager:** full apt, with the Debian archive (main, contrib, non-free, non-free-firmware).

The live session user is `vex` with password `vexos`, and has sudo. Change the password with `passwd` after the first login.

Anything you install or change is lost on reboot. The ISO has no installer to disk yet.

## Profiles

Choose what goes into the image with `VEXOS_PROFILE` (default `desktop`):

```sh
sudo VEXOS_PROFILE=minimal sh auto/config    # terminal only
sudo VEXOS_PROFILE=desktop sh auto/config    # XFCE + Firefox ESR + dev tools (default)
sudo VEXOS_PROFILE=dev sh auto/config        # desktop + clang and valgrind
```

Profiles are plain lists in `profiles/` (`base.list`, `desktop.list`, `dev.list`). Edit those files, not the generated `config/package-lists/vexos.list.chroot`.

## VexOS packages

Custom packages live in `packages/src/`:

- `vexpad`, `vexos-branding`, `vexos-devstudio`

`auto/config` builds them with `packages/build-debs.sh` into `config/packages.chroot/`, so the ISO installs them directly. The script also writes an apt index (`packages/dist/Packages`) for a future hosted repository. Build them alone with:

```sh
sh packages/build-debs.sh
```

To add a package, create `packages/src/<name>/DEBIAN/control` and its files under the same folder.

## VexOS DevStudio

A web IDE that runs on this computer. Open it from the dock or the application menu. It starts a local server and opens Firefox.

- **Editor:** tabs, syntax colours (Monaco, the editor from VS Code), Ctrl+S to save.
- **Run:** Ctrl+Enter runs the open file or project. Supported: `.c`, `.cpp`, `.py`, `.js`, `.rs`, `.sh`, and folders with `Cargo.toml`, `package.json` (`dev` or `start` script), `Makefile`, or `main.c`.
- **Input:** type into the input box under the output to answer a program's questions.
- **Terminal:** the command box runs any shell command in the selected folder (for example `npm install axios`).
- **New project:** C, Python, Node.js, static web page, React (Vite), Next.js (TypeScript, App Router, Tailwind), and Rust (Cargo).
- **Preview:** a running web app opens in the Preview tab. Open `.html` files there too.
- **AI assistant:** explain code, fix the last error, improve a file, or write tests. Add a Groq API key in Settings.

Workspace: `~/VexProjects`. Settings and the API key: `~/.config/vexos-devstudio/settings.json` (readable only by you).

**AI key.** Create a key at [console.groq.com/keys](https://console.groq.com/keys) and paste it in Settings. The key stays on this computer. It is sent only to `api.groq.com`, and the screen shows only its last four characters. The default model is `llama-3.3-70b-versatile`.

**Security.** The server listens on `127.0.0.1` only. Every API call needs a token that the server creates each time it starts.

**Known limits.**
- The syntax-coloured editor loads from the internet on first start. Without internet, DevStudio uses a plain text editor.
- React and Next.js projects download packages from npm when created, so they need internet.
- Debian's npm is version 9.2. To update it, run `sudo npm install -g npm@latest`.
- Debugging with gdb is available from the terminal. There is no debugger panel yet.

## Installing software in the live session

- **System packages:** `sudo apt update`, then `sudo apt install <name>`.
- **Node.js:** `npm install <package>` inside a project folder.
- **Python:** use a virtual environment (`python3 -m venv .venv`). Debian blocks system-wide pip installs.
- **VexOS packages:** `sudo apt install ./name.deb`. A hosted VexOS package repository is planned.

Installed packages last until you reboot.

## Build the ISO

The build runs on a Debian or Ubuntu machine, not in a container. Requirements:

- About **25 GB** of free disk, 4 GB RAM, and an internet connection.
- A build takes 30 to 90 minutes.
- **Use a native Debian machine or a Debian 64-bit VirtualBox VM.** The build depends on real mounts, loop devices, and squashfs. WSL often cannot provide these, and failures there look like `/proc` or `chroot` errors.

```sh
sudo apt install live-build
cd distro/vexos-desktop
sh validate.sh                 # checks files and scripts; no build
sudo sh auto/config            # writes the live-build configuration
sudo sh auto/build             # output: live-image-amd64.hybrid.iso
```

**Resuming a build.** `auto/build` writes to `build.log`, and live-build skips the stages that already finished. After a failure, fix the cause and run `sudo sh auto/build` again. Don't run `auto/clean` unless you want a full reset: it deletes the chroot and build output.

Before you rerun after a failure, unmount any leftover chroot mounts:

```sh
findmnt -R chroot              # if this prints anything:
sudo umount -Rl chroot
```

Never `rm -rf chroot` while those mounts exist.

If a stage has to run again, delete its stamp file in `.build/` (for example `.build/chroot_install-packages.install`) and rerun `sudo sh auto/build`. Only that stage and the stages after it run again.

**Check the result** before you test:

```sh
ls -lh live-image-amd64.hybrid.iso          # well over 1 GB
grep -n -E "E: |Unable to|Errors were" build.log | head
```

## Run in VirtualBox

1. New VM: Type *Linux*, Version *Debian (64-bit)*, 4 GB RAM, 2 CPUs. Hard disk: none needed.
2. Display: Video Memory 128 MB, Graphics Controller VMSVGA. EFI is optional; BIOS works by default.
3. Storage: attach `live-image-amd64.hybrid.iso` to the optical drive.
4. Start the VM. A `Desktop/` folder has samples: `hello-web.html` (open it in Firefox) and `hello.py` (`python3 hello.py`).

## Layout

```
auto/config                       live-build settings (Debian trixie, amd64, ISO)
auto/build, auto/clean            build (keeps build.log) and cleanup
profiles/                         package lists per profile
packages/src/                     VexOS .deb sources
config/hooks/normal/              build hooks (branding, default user)
config/includes.chroot/etc/skel/  files copied into every new user's home
```

## Notes

- Firefox is Firefox ESR. VexOS is a distribution around the existing browser.
- The package list is a starting point. Add packages to `profiles/*.list`, then rebuild with `sudo sh auto/config` and `sudo sh auto/build`.
