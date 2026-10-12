#!/bin/sh
# Checks the VexOS Desktop build configuration without building an ISO.
# Run it before a build:  sh validate.sh
# Exit status is non-zero if any check fails.

cd "$(dirname "$0")" || exit 1
fail=0
pass() { printf 'ok    %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fail=1; }

# 1. Required files exist
for f in auto/config auto/build auto/clean \
         profiles/base.list profiles/desktop.list profiles/dev.list \
         packages/build-debs.sh \
         packages/src/vexpad/DEBIAN/control packages/src/vexpad/usr/bin/vexpad \
         packages/src/vexos-branding/DEBIAN/control \
         packages/src/vexos-devstudio/DEBIAN/control \
         packages/src/vexos-devstudio/usr/bin/vexos-devstudio \
         packages/src/vexos-devstudio/usr/lib/vexos-devstudio/server.py \
         packages/src/vexos-devstudio/usr/share/vexos-devstudio/web/index.html \
         packages/src/vexos-devstudio/usr/share/vexos-devstudio/web/app.js \
         packages/src/vexos-devstudio/usr/share/vexos-devstudio/web/app.css \
         packages/src/vexos-devstudio/usr/share/applications/vexos-devstudio.desktop \
         config/hooks/normal/0100-vexos-branding.hook.chroot \
         config/includes.chroot/usr/bin/vexos-fit-screen \
         config/includes.chroot/etc/xdg/autostart/vexos-fit-screen.desktop \
         config/includes.chroot/etc/skel/Desktop/hello-web.html \
         config/includes.chroot/etc/skel/Desktop/hello.py \
         config/includes.chroot/etc/skel/Desktop/about-vexos.html \
         config/includes.chroot/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml \
         assets/vexos-logo-v2.png assets/vexos-wallpaper-v3.jpg; do
    if [ -f "$f" ]; then pass "exists: $f"; else bad "missing: $f"; fi
done

# 2. Shell scripts parse
for f in auto/config auto/build auto/clean validate.sh packages/build-debs.sh \
         config/hooks/normal/*.hook.chroot packages/src/vexpad/usr/bin/vexpad \
         packages/src/vexos-devstudio/usr/bin/vexos-devstudio; do
    if sh -n "$f" 2>/dev/null; then pass "syntax: $f"; else bad "syntax error: $f"; fi
done

# 3. auto scripts must use 'noauto' to avoid recursion
for f in auto/build auto/clean; do
    if grep -q 'noauto' "$f"; then pass "noauto set: $f"; else bad "missing 'noauto' (would loop): $f"; fi
done

# 4. Executable bits where they matter
for f in auto/config auto/build auto/clean packages/build-debs.sh \
         config/hooks/normal/*.hook.chroot packages/src/vexpad/usr/bin/vexpad \
         packages/src/vexos-devstudio/usr/bin/vexos-devstudio packages/src/vexos-devstudio/usr/lib/vexos-devstudio/server.py \
         config/includes.chroot/usr/bin/vexos-fit-screen; do
    if [ -x "$f" ]; then pass "executable: $f"; else bad "not executable: $f"; fi
done

# 5. Profiles: no duplicate packages within a profile, names well-formed
for p in base desktop dev; do
    pkgs=$(grep -v -e '^#' -e '^[[:space:]]*$' "profiles/$p.list")
    dups=$(printf '%s\n' "$pkgs" | sort | uniq -d)
    if [ -z "$dups" ]; then pass "profile $p: no duplicates"; else bad "profile $p duplicates: $dups"; fi
    badnames=$(printf '%s\n' "$pkgs" | grep -v -E '^[a-z0-9][a-z0-9.+-]*$' || true)
    if [ -z "$badnames" ]; then pass "profile $p: names well-formed"; else bad "profile $p bad names: $badnames"; fi
done

# 6. Package sources have the fields dpkg needs
for c in packages/src/*/DEBIAN/control; do
    for field in Package Version Architecture Description; do
        if grep -q "^$field:" "$c"; then :; else bad "$c missing $field"; fi
    done
    pass "control fields: $c"
done

# 7. XML and assets are sane
if python3 -c "import xml.dom.minidom as m,sys; m.parse(sys.argv[1])" \
    config/includes.chroot/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml 2>/dev/null; then
    pass "xfce desktop XML parses"; else bad "xfce desktop XML is invalid"; fi
size=$(wc -c < assets/vexos-wallpaper-v3.jpg 2>/dev/null || echo 0)
if [ "$size" -gt 10000 ]; then pass "wallpaper present (${size} bytes)"; else bad "wallpaper missing or tiny"; fi

echo
if [ $fail -eq 0 ]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit $fail
