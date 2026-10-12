# VexOS

VexOS is a small Linux distribution built on the Linux kernel in this repository.
It ships as two projects:

| Project | What it is | Status |
|---|---|---|
| [`vexos-desktop`](vexos-desktop/) | **VexOS Desktop 1.0**: a Debian trixie live desktop (XFCE, Firefox ESR, Python 3, Node.js, git, apt). | Ready. Boots in VirtualBox. |
| [`vexos-linux`](vexos-linux/) | **VexOS Linux 1.0**: a terminal-only system. BusyBox, bash, and the `vpk` package manager, in one initramfs. | Working. Kernel build is untested. |
| [`website`](website/) | The landing page and documentation: Next.js, SEO-optimized, light and dark themes, with a download button. | Static export with `npm run build`. |

## Download

Get the latest ISO from the **[Releases page](https://github.com/Nour-yahyaoui/vexos/releases)**.

- Direct link to VexOS Desktop 1.0 (x86_64 ISO): `https://github.com/Nour-yahyaoui/vexos/releases/latest/download/vexos-desktop-1.0-amd64.iso`

## Quick start: VexOS Desktop in VirtualBox

1. Download the ISO.
2. Create a VM: Type *Linux*, Version *Debian (64-bit)*, 4 GB RAM, 2 CPUs.
3. Attach the ISO to the optical drive and start the VM.
4. Set **Display → Graphics Controller: VMSVGA**, **Video Memory: 128 MB**, so the desktop fills the window.
5. Log in as `vex` / `vexos`. Firefox, a terminal, Python 3, and Node.js are installed.

Changes made in the live session are lost on reboot.

## Build it yourself

The build runs on Debian or Ubuntu, not in a container, and needs about 15 GB of disk space.

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

The ISO is `live-image-amd64.hybrid.iso`. The build takes 30 to 90 minutes.
See [`vexos-desktop/README.md`](vexos-desktop/README.md) for profiles and packages.

## Repository layout

```
distro/
├── README.md          this file
├── vexos-desktop/     Debian live ISO (live-build)
├── vexos-linux/       BusyBox initramfs ISO, vpk package manager
└── website/           landing page and docs (Next.js app; see website/README.md)
```

The rest of the repository is the Linux kernel source. The VexOS builds use it.

## Roadmap

1. Hosted apt repository with a signing key, so `apt install vexpad` works on a running system.
2. Installer (Calamares) for installing to disk.
3. First-boot tool picker.
4. VirtualBox guest additions, for clipboard and automatic screen resizing.

## Author

Nour-yahyaoui: [github.com/Nour-yahyaoui](https://github.com/Nour-yahyaoui)

The Linux kernel source is GPL-2.0 (see `../COPYING`). VexOS-specific files do not have a license yet.
