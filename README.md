# VexOS

VexOS is a small Linux distribution built on the Linux kernel source in this repository.

**[Download VexOS Desktop 1.0 (ISO)](https://github.com/Nour-yahyaoui/vexos/releases/latest/download/vexos-desktop-1.0-amd64.iso)** · [All releases](https://github.com/Nour-yahyaoui/vexos/releases) · [Landing page](distro/website/)

## What is in this repo

| Path | What it is |
|---|---|
| [`distro/vexos-desktop`](distro/vexos-desktop/) | **VexOS Desktop 1.0**: a Debian trixie live desktop with XFCE, Firefox ESR, Python 3, Node.js, git, and apt. Boots in VirtualBox. |
| [`distro/vexos-linux`](distro/vexos-linux/) | **VexOS Linux 1.0**: a terminal-only system built on this kernel, with BusyBox, bash, and the `vpk` package manager. |
| [`distro/website`](distro/website/) | The landing page. Mobile-responsive, static HTML, no build step. |
| `arch/`, `drivers/`, `fs/`, `kernel/`, … | The Linux kernel source. The VexOS builds compile it. |

See [`distro/README.md`](distro/README.md) for an overview of the VexOS projects.

## Quick start: VexOS Desktop in VirtualBox

1. Download the ISO from the link above.
2. Create a VM: Type *Linux*, Version *Debian (64-bit)*, 4 GB RAM, 2 CPUs.
3. Attach the ISO to the optical drive and start the VM.
4. Set **Display → Graphics Controller: VMSVGA** and **Video Memory: 128 MB** so the desktop fills the window.
5. Log in as `user` / `live`.

Changes made in the live session are lost on reboot.

## Build the desktop ISO

The build runs on Debian or Ubuntu, not in a container, and needs about 15 GB of free disk space. It takes 30 to 90 minutes.

```sh
sudo apt install live-build
git clone --depth 1 --filter=blob:none --sparse --branch arena/fd4ab751-vexos \
  https://github.com/Nour-yahyaoui/vexos.git vexos
cd vexos && git sparse-checkout set distro/vexos-desktop
cd distro/vexos-desktop
sh validate.sh
sudo sh auto/config
sudo sh auto/build 2>&1 | tee build.log
```

The result is `live-image-amd64.hybrid.iso`. Details, profiles, and packages are in [`distro/vexos-desktop/README.md`](distro/vexos-desktop/README.md).

## Build VexOS Linux

```sh
cd distro/vexos-linux
./build.sh          # writes out/vexos-linux-1.0.iso
```

See [`distro/vexos-linux/README.md`](distro/vexos-linux/README.md) for the targets and requirements.

## Roadmap

- A signed, hosted apt repository so `apt install vexpad` works on a running system.
- An installer (Calamares) for installing to disk.
- A first-boot tool picker.
- VirtualBox guest additions for clipboard sharing and automatic resizing.

## Kernel

The kernel documentation is in the plain-text [`README`](README) file and in [`Documentation/`](Documentation/). The kernel is licensed under GPL-2.0 (see [`COPYING`](COPYING)).

## Author

Nour-yahyaoui · [github.com/Nour-yahyaoui](https://github.com/Nour-yahyaoui)
