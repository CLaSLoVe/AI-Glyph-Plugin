#!/bin/sh
# Render store/preview-*.html into the PNG sizes the Chrome Web Store asks for.
set -eu
cd "$(dirname "$0")/.."
CHROME=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
do
  if [ -x "$candidate" ]; then
    CHROME="$candidate"
    break
  fi
done
if [ -z "$CHROME" ]; then
  echo "Need Google Chrome or Microsoft Edge to render store images." >&2
  exit 1
fi
ROOT="$(pwd)"
UD="$(mktemp -d)"
mkdir -p store/screenshots/zh_CN store/zh_CN
trap 'rm -rf "$UD"' EXIT

shoot() {
  w="$1"
  h="$2"
  src="$3"
  dest="$4"
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --force-device-scale-factor=1 \
    --no-first-run \
    --no-default-browser-check \
    --user-data-dir="$UD" \
    --window-size="${w},${h}" \
    --virtual-time-budget=8000 \
    --screenshot="$ROOT/$dest" \
    "file://$ROOT/$src"
  python3 - "$ROOT/$dest" "$w" "$h" <<'PY'
import sys
from PIL import Image
path, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
im = Image.open(path)
if im.size == (w * 2, h * 2):
    im = im.resize((w, h), Image.Resampling.LANCZOS)
if im.size != (w, h):
    raise SystemExit(f"{path} is {im.size[0]}x{im.size[1]}, expected {w}x{h}")
if im.mode == "RGBA":
    if im.getchannel("A").getextrema()[0] < 255:
        raise SystemExit(f"{path} has transparent pixels")
    im = im.convert("RGB")
elif im.mode != "RGB":
    im = im.convert("RGB")
im.save(path, "PNG")
print(f"{path} {w}x{h} RGB")
PY
}

render_locale() {
  lang="$1"
  shots="$2"
  small="$3"
  wide="$4"
  shoot 1280 800 "store/preview-compare.html?lang=${lang}" "$shots/01-compare.png"
  shoot 1280 800 "store/preview-popup.html?lang=${lang}" "$shots/02-popup.png"
  shoot 440 280 "store/preview-promo-small.html?lang=${lang}" "$small"
  shoot 1400 560 "store/preview-promo-marquee.html?lang=${lang}" "$wide"
}

render_locale en store/screenshots store/promo-440x280.png store/promo-1400x560.png
render_locale zh-CN store/screenshots/zh_CN store/zh_CN/promo-440x280.png store/zh_CN/promo-1400x560.png
