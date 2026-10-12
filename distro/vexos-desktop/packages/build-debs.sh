#!/bin/sh
# Builds the VexOS .deb packages and an apt index (Packages, Packages.gz).
# Usage: sh packages/build-debs.sh [DIR]
#   DIR (optional): also copy the .deb files there, e.g. config/packages.chroot
#   so live-build installs them into the image.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
DISTRO=$(cd "$HERE/.." && pwd)
DIST=$HERE/dist
LIVE_DIR=${1:-}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

rm -rf "$DIST"
mkdir -p "$DIST"

for name in vexpad vexos-branding vexos-devstudio; do
    dst=$WORK/$name
    cp -a "$HERE/src/$name" "$dst"

    # Binary assets come from the desktop's assets/ folder, not from git.
    if [ "$name" = vexos-branding ]; then
        install -Dm644 "$DISTRO/assets/vexos-logo-v2.png" "$dst/usr/share/pixmaps/vexos-logo.png"
        install -Dm644 "$DISTRO/assets/vexos-wallpaper-v3.jpg" "$dst/usr/share/backgrounds/vexos/vexos-wallpaper.jpg"
    fi

    find "$dst" -type d -exec chmod 0755 {} +
    find "$dst" -type f -exec chmod 0644 {} +
    # Launchers in usr/bin and the DevStudio server are executable.
    [ -d "$dst/usr/bin" ] && find "$dst/usr/bin" -type f -exec chmod 0755 {} +
    [ -f "$dst/usr/lib/vexos-devstudio/server.py" ] && chmod 0755 "$dst/usr/lib/vexos-devstudio/server.py" || true

    ver=$(sed -n 's/^Version: //p' "$dst/DEBIAN/control")
    dpkg-deb --root-owner-group --build "$dst" "$DIST/${name}_${ver}_all.deb" >/dev/null
    echo "built ${name}_${ver}_all.deb"
done

# Apt index: this is what a hosted VexOS repository needs.
( cd "$DIST" && dpkg-scanpackages -m . /dev/null > Packages && gzip -9kf Packages )

if [ -n "$LIVE_DIR" ]; then
    mkdir -p "$LIVE_DIR"
    rm -f "$LIVE_DIR"/vexpad_*.deb "$LIVE_DIR"/vexos-branding_*.deb "$LIVE_DIR"/vexos-devstudio_*.deb
    cp "$DIST"/*.deb "$LIVE_DIR"/
    echo "copied packages to $LIVE_DIR"
fi
