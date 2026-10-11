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

Not in 1.0 (planned for 1.1): Python, bash, and a package manager. Python
cannot be installed inside 1.0 yet, so run scripts with `sh` for now.

## Build

Build on a Linux machine (Debian/Ubuntu example):

```sh
sudo apt install build-essential flex bison bc libelf-dev libssl-dev \
     busybox-static grub-pc-bin grub-efi-amd64-bin grub-common xorriso mtools
cd distro/vexos-linux
./build.sh          # kernel + rootfs + ISO -> out/vexos-linux-1.0.iso
```

Targets: `./build.sh kernel | rootfs | iso | clean`.
The kernel is built from the repository root (the kernel source), using
`kernel/vexos.config` as a fragment on top of `defconfig`.

## Run in VirtualBox

1. New VM: Type *Linux*, Version *Other Linux (64-bit)*, 512 MB RAM, 1 CPU.
2. Storage: attach `out/vexos-linux-1.0.iso` to the optical drive.
3. (Optional) System > Enable EFI for UEFI boot.
4. Start the VM. You get a `vexos:~$` prompt.

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
```

## Notes

- v1.0 has no user passwords. It is meant for local VMs. Do not expose it to a public network.
- The initramfs (`initrd.gz`) holds the entire system, so changes made at runtime are lost on reboot.
