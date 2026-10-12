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

BASH_REF=${BASH_REF:-bash-5.3}

# Static GNU bash, built from source (GitHub mirror of the official repo).
# BASH_STATIC=/path/to/bash skips the download and build.
build_bash() {
    log "Bash ($BASH_REF, static, from source)"
    mkdir -p "$OUT/src"
    if [ -n "${BASH_STATIC:-}" ]; then
        cp "$BASH_STATIC" "$OUT/bash"
        log "using $BASH_STATIC"
        return
    fi
    for t in make gcc curl tar strip; do need $t; done
    src=$OUT/src/bash
    rm -rf "$src"; mkdir -p "$src"
    curl -fsSL -o "$OUT/src/bash.tgz" \
        "https://codeload.github.com/bash-collection/bash/tar.gz/refs/tags/$BASH_REF"
    tar -xzf "$OUT/src/bash.tgz" -C "$src" --strip-components=1
    ( cd "$src" && ./configure --enable-static-link --disable-nls --without-bash-malloc \
        --without-libintl-prefix --disable-net-redirections --disable-progcomp >/dev/null \
        && make -j"$JOBS" >/dev/null )
    cp "$src/bash" "$OUT/bash"
    strip "$OUT/bash"
    log "bash ready: $OUT/bash ($(du -h "$OUT/bash" | cut -f1))"
}

# Package the built bash as a vpk package, so `vpk` can reinstall it and the
# repository can be hosted later.
build_repo() {
    log "vpk repository"
    [ -f "$OUT/bash" ] || die "missing $OUT/bash (run: ./build.sh bash)"
    stage=$OUT/pkg/bash
    rm -rf "$stage"; mkdir -p "$stage/.vpk" "$stage/bin"
    cp "$OUT/bash" "$stage/bin/bash"; chmod 755 "$stage/bin/bash"
    printf 'Name: bash\nVersion: %s-1\nDepends:\nDescription: GNU Bourne-Again shell (static build)\n' \
        "${BASH_REF#bash-}" > "$stage/.vpk/control"
    rm -rf "$OUT/repo"; mkdir -p "$OUT/repo"
    VPK_ROOT= sh "$HERE/vpk/vpk" mkpkg "$stage" "$OUT/repo"
    sh "$HERE/vpk/vpk" mkindex "$OUT/repo"
    log "repository ready: $OUT/repo"
}

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
    # Real bash as the login shell (busybox sh remains for system scripts)
    if [ -f "$OUT/bash" ]; then
        cp "$OUT/bash" "$ROOTFS/bin/bash"
        chmod 755 "$ROOTFS/bin/bash"
    else
        log "warning: no bash binary in $OUT; the login shell will be busybox sh (run ./build.sh bash)"
        sed -i 's|/bin/bash -l|/bin/sh -l|' "$ROOTFS/etc/inittab"
        sed -i 's|/bin/bash$|/bin/sh|' "$ROOTFS/etc/passwd"
    fi
    printf '/bin/sh\n/bin/bash\n' > "$ROOTFS/etc/shells"
    # vpk package manager
    install -Dm755 "$HERE/vpk/vpk" "$ROOTFS/usr/bin/vpk"
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
    all)    build_bash; build_kernel; build_rootfs; build_iso ;;
    bash)   build_bash ;;
    kernel) build_kernel ;;
    rootfs) build_rootfs ;;
    iso)    build_iso ;;
    repo)   build_repo ;;
    clean)  rm -rf "$OUT" ;;
    *)      die "unknown target: $1" ;;
esac
