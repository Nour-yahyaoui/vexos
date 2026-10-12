#!/bin/sh
# Checks the VexOS Desktop build configuration without building anything.
# Run it before a build:  sh validate.sh
# Exit status is non-zero if any check fails.

cd "$(dirname "$0")" || exit 1
fail=0
pass() { printf 'ok    %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fail=1; }

# 1. Required files exist
for f in auto/config auto/build auto/clean \
         config/package-lists/vexos.list.chroot \
         config/hooks/normal/0100-vexos-branding.hook.chroot \
         config/includes.chroot/etc/skel/Desktop/hello-web.html \
         config/includes.chroot/etc/skel/Desktop/hello.py \
         config/includes.chroot/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml \
         config/includes.chroot/usr/share/backgrounds/vexos/vexos-wallpaper.jpg \
         config/includes.chroot/usr/local/bin/vexpad; do
    if [ -f "$f" ]; then pass "exists: $f"; else bad "missing: $f"; fi
done

# 2. Shell scripts parse
for f in auto/config auto/build auto/clean validate.sh \
         config/hooks/normal/*.hook.chroot config/includes.chroot/usr/local/bin/vexpad; do
    if sh -n "$f" 2>/dev/null; then pass "syntax: $f"; else bad "syntax error: $f"; fi
done

# 2b. auto scripts must use 'noauto' to avoid recursion
for f in auto/build auto/clean; do
    if grep -q 'noauto' "$f"; then pass "noauto set: $f"; else bad "missing 'noauto' (would loop): $f"; fi
done

# 3. Executable bits where they matter
for f in auto/config auto/build auto/clean config/hooks/normal/*.hook.chroot \
         config/includes.chroot/usr/local/bin/vexpad; do
    if [ -x "$f" ]; then pass "executable: $f"; else bad "not executable: $f"; fi
done

# 4. Package list: no duplicates, no blank-looking entries, plausible names
list=config/package-lists/vexos.list.chroot
pkgs=$(grep -v '^[[:space:]]*#' "$list" | grep -v '^[[:space:]]*$')
dups=$(printf '%s\n' "$pkgs" | sort | uniq -d)
if [ -z "$dups" ]; then pass "package list has no duplicates"; else bad "duplicate packages: $(echo $dups)"; fi
badnames=$(printf '%s\n' "$pkgs" | grep -v -E '^[a-z0-9][a-z0-9.+-]*$' || true)
if [ -z "$badnames" ]; then pass "package names well-formed ($(printf '%s\n' "$pkgs" | wc -l) packages)"; else bad "malformed package names: $badnames"; fi

# 5. XML and wallpaper are sane
if python3 -c "import xml.dom.minidom as m,sys; m.parse(sys.argv[1])" \
    config/includes.chroot/etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml 2>/dev/null; then
    pass "xfce desktop XML parses"; else bad "xfce desktop XML is invalid"; fi
size=$(wc -c < config/includes.chroot/usr/share/backgrounds/vexos/vexos-wallpaper.jpg 2>/dev/null || echo 0)
if [ "$size" -gt 10000 ]; then pass "wallpaper present (${size} bytes)"; else bad "wallpaper missing or tiny"; fi

echo
if [ $fail -eq 0 ]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit $fail
