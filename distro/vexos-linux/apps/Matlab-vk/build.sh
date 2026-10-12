#!/bin/sh
# Builds Matlab-vk-VERSION.vpk from stage/ and writes the repo INDEX.
# Result: ../../repo/ (commit it, then host that folder for vpk).
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
VPK="$HERE/../../vpk/vpk"
REPO="$HERE/../../repo"

chmod 0755 "$HERE/stage/usr/bin/Matlab-vk"
mkdir -p "$REPO"
rm -f "$REPO"/Matlab-vk-*.vpk
sh "$VPK" mkpkg "$HERE/stage" "$REPO"
sh "$VPK" mkindex "$REPO"
