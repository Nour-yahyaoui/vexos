#!/bin/sh
# VexOS Linux 1.0 - build script
#
# Builds a bootable ISO (BIOS + UEFI) that runs in VirtualBox:
#   1. kernel   : built from the Linux source tree this repo contains
#                 (defconfig + vexos.config fragment)
#   2. userland : BusyBox (static) + the rootfs/ overlay (init, vexpad, ...)
#   3. initrd   : the whole system packed as an initramfs (no disk needed)
#   4. ISO      : GRUB rescue image wrapping kernel + initrd
#
# Usage:  ./build.sh            full build
#         ./build.sh kernel     only the kernel
#         ./build.sh rootfs     only the rootfs + initrd
#         ./build.sh iso        only the ISO (needs kernel + rootfs first)
#         ./build.sh clean      remove out/
#
# Host tools needed (Debian/Ubuntu):
#   sudo apt install build-essential flex bison bc libelf-dev libssl-dev \
#        cpio busybox-static grub-pc-bin grub-efi-amd64-bin grub-common \
#        xorriso mtools

set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
KERNEL_SRC=${KERNEL_SRC:-$(cd "$HERE/../.." && pwd)}   # the repo root = kernel source
OUT=${OUT:-$HERE/out}
JOBS=${JOBS:-$(nproc)}
VERSION=1.0
ISO_NAME=vexos-linux-$VERSION.iso

KBUILD=$OUT/kbuild
ROOTFS=$OUT/rootfs
ISODIR=$OUT/iso

log()  { printf '\033[1;35m==>\033[0m %s\n' "$*"; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing tool: $1 (see header of build.sh)"; }

build_kernel() {
    log "Kernel: $KERNEL_SRC"
    for t in make gcc flex bison bc; do need $t; done
    [ -f "$KERNEL_SRC/Makefile" ] || die "KERNEL_SRC does not look like a kernel tree"
    mkdir -p "$KBUILD"
    make -C "$KERNEL_SRC" O="$KBUILD" defconfig
    # Merge the VexOS fragment on top of defconfig, then resolve dependencies.
    "$KERNEL_SRC/scripts/kconfig/merge_config.sh" -m -O "$KBUILD" \
        "$KBUILD/.config" "$HERE/kernel/vexos.config"
    make -C "$KERNEL_SRC" O="$KBUILD" olddefconfig
    make -C "$KERNEL_SRC" O="$KBUILD" -j"$JOBS" bzImage
    cp "$KBUILD/arch/x86/boot/bzImage" "$OUT/vmlinuz"
    log "Kernel ready: $OUT/vmlinuz"
}

build_rootfs() {
    log "Rootfs"
    BB=${BUSYBOX:-$(command -v busybox || true)}
    [ -n "$BB" ] || die "busybox not found (install busybox-static or set BUSYBOX=/path)"
    if ldd "$BB" 2>/dev/null | grep -q 'not a dynamic\|=>'; then
        log "warning: $BB is dynamically linked; the image needs a static busybox"
    fi
    rm -rf "$ROOTFS"
    mkdir -p "$ROOTFS"
    # Base directory layout
    mkdir -p "$ROOTFS"/bin "$ROOTFS"/sbin "$ROOTFS"/usr/bin "$ROOTFS"/usr/sbin \
             "$ROOTFS"/usr/share/udhcpc "$ROOTFS"/etc/init.d "$ROOTFS"/dev \
             "$ROOTFS"/proc "$ROOTFS"/sys "$ROOTFS"/tmp "$ROOTFS"/run \
             "$ROOTFS"/root "$ROOTFS"/home "$ROOTFS"/var/log "$ROOTFS"/mnt
    # VexOS overlay (init, vexpad, config files)
    cp -a "$HERE/rootfs/." "$ROOTFS/"
    # BusyBox + every applet as a RELATIVE symlink (so the image is relocatable)
    cp "$BB" "$ROOTFS/bin/busybox"
    chmod 755 "$ROOTFS/bin/busybox"
    for applet in $("$BB" --list); do
        [ "$applet" = busybox ] && continue
        ln -sf busybox "$ROOTFS/bin/$applet"
    done
    ln -sf ../bin/busybox "$ROOTFS/sbin/init"
    chmod 755 "$ROOTFS"/init "$ROOTFS"/etc/init.d/* "$ROOTFS"/usr/bin/* \
              "$ROOTFS"/usr/share/udhcpc/* 2>/dev/null || true
    chmod 1777 "$ROOTFS/tmp"
    chmod 700 "$ROOTFS/root"
    # Initramfs
    # Use BusyBox's cpio so the build does not depend on the host's cpio
    ( cd "$ROOTFS" && find . | "$BB" cpio -o -H newc 2>/dev/null | gzip -9 ) > "$OUT/initrd.gz"
    [ -s "$OUT/initrd.gz" ] || die "initrd creation failed"
    log "Initrd ready: $OUT/initrd.gz ($(du -h "$OUT/initrd.gz" | cut -f1))"
}

build_iso() {
    log "ISO"
    for t in grub-mkrescue xorriso; do need $t; done
    [ -f "$OUT/vmlinuz" ] || die "missing $OUT/vmlinuz (run: ./build.sh kernel)"
    [ -f "$OUT/initrd.gz" ] || die "missing $OUT/initrd.gz (run: ./build.sh rootfs)"
    rm -rf "$ISODIR"
    mkdir -p "$ISODIR/boot/grub"
    cp "$OUT/vmlinuz" "$ISODIR/boot/vmlinuz"
    cp "$OUT/initrd.gz" "$ISODIR/boot/initrd.gz"
    cp "$HERE/boot/grub.cfg" "$ISODIR/boot/grub/grub.cfg"
    grub-mkrescue -o "$OUT/$ISO_NAME" "$ISODIR" -volid VEXOS
    log "ISO ready: $OUT/$ISO_NAME"
}

case "${1:-all}" in
    all)    build_kernel; build_rootfs; build_iso ;;
    kernel) build_kernel ;;
    rootfs) build_rootfs ;;
    iso)    build_iso ;;
    clean)  rm -rf "$OUT" ;;
    *)      die "unknown target: $1" ;;
esac
