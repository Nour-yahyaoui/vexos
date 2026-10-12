# VexOS Linux 1.0

A small, terminal-only Linux for VirtualBox. It is built on the Linux kernel
in this repository, plus BusyBox for userland.

## What you get in 1.0

- Boots in VirtualBox (BIOS or EFI), from a single ISO. No disk needed.
- A root shell (BusyBox `sh`) on the console and on the serial port.
- File and folder work: `ls`, `mkdir`, `cp`, `mv`, `rm`, `cat`, `find`, `grep`, `tar`, `gzip`, and about 400 more tools.
- `vexpad`, the built-in text editor for editing code in the terminal (`vexpad --help` for a cheat sheet).
- Run scripts: `sh script.sh`, or `chmod +x` and `./script.sh`.
- Networking: DHCP on the first NIC (VirtualBox's default E1000 or virtio).

Added in this build:
- **bash** (GNU bash 5.3, static, built from source) is the login shell.
- **vpk**, a package manager for VexOS Linux:
  ```sh
  vpk update               # refresh package lists from /etc/vpk/sources.list
  vpk search WORD          # find packages
  vpk install NAME...      # installs dependencies too; verifies checksums first
  vpk remove NAME...       # refuses if another package needs it
  vpk list
  ```

Not yet: Python (planned as the next big build). Packages come from a repository
you host (see below); the default source list is empty until you add one.

## Build

Build on a Linux machine (Debian/Ubuntu example):

```sh
sudo apt install build-essential flex bison bc libelf-dev libssl-dev \
     busybox-static grub-pc-bin grub-efi-amd64-bin grub-common xorriso mtools
cd distro/vexos-linux
./build.sh bash       # static bash from source (needs internet, ~5 min)
./build.sh          # bash + kernel + rootfs + ISO -> out/vexos-linux-1.0.iso
./build.sh repo     # package bash as a vpk repository in out/repo/
```

Targets: `./build.sh bash | kernel | rootfs | iso | repo | clean`.
To reuse an existing bash binary: `BASH_STATIC=/path/to/bash ./build.sh bash`.
The kernel is built from the repository root (the kernel source), using
`kernel/vexos.config` as a fragment on top of `defconfig`.

## Run in VirtualBox

1. New VM: Type *Linux*, Version *Other Linux (64-bit)*, 512 MB RAM, 1 CPU.
2. Storage: attach `out/vexos-linux-1.0.iso` to the optical drive.
3. (Optional) System > Enable EFI for UEFI boot.
4. Start the VM. You get a `vexos:~$` prompt.

## Hosting packages

`./build.sh repo` writes `out/repo/` with an `INDEX` and the `.vpk` packages. Upload that folder
to any web server (or GitHub Pages), then add its URL to `/etc/vpk/sources.list` on the VM and run `vpk update`.

## Layout

```
build.sh               build script (kernel, rootfs, initrd, ISO)
kernel/vexos.config    kernel config fragment
boot/grub.cfg          GRUB menu for the ISO
rootfs/                files copied into the system
  init                 PID 1 bootstrap
  etc/inittab          BusyBox init table
  etc/init.d/rcS       startup (hostname, network, banner)
  etc/profile          shell environment and prompt
  usr/bin/vexpad       editor wrapper
  etc/vpk/sources.list package sources for vpk
vpk/vpk                package manager (POSIX sh, runs on BusyBox)
```

## Notes

- v1.0 has no user passwords. It is meant for local VMs. Do not expose it to a public network.
- The initramfs (`initrd.gz`) holds the entire system, so changes made at runtime are lost on reboot.
