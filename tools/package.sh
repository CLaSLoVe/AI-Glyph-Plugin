#!/bin/sh
# Build the Chrome Web Store zip. Runtime files only; manifest.json at the zip root.
set -eu
cd "$(dirname "$0")/.."
ver=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/ai-glyph-${ver}.zip"
mkdir -p dist
rm -f "$out"
COPYFILE_DISABLE=1 zip -r -X "$out" \
  manifest.json \
  cjkdata.js \
  garble.js \
  content.js \
  glyph.css \
  popup.html \
  popup.js \
  popup.css \
  icons/icon16.png \
  icons/icon48.png \
  icons/icon128.png
python3 - "$out" <<'PY'
import json, sys, zipfile
path = sys.argv[1]
z = zipfile.ZipFile(path)
names = z.namelist()
bad = [n for n in names if n.startswith("/") or n.startswith("__MACOSX") or ".." in n.split("/")]
if bad:
    raise SystemExit("unsafe zip entries: " + ", ".join(bad))
banned = [n for n in names if n.startswith(("tools/", "store/", "dist/", "demo")) or n.endswith(".md")]
if banned:
    raise SystemExit("dev files leaked into the package: " + ", ".join(banned))
if "manifest.json" not in names:
    raise SystemExit("manifest.json is not at the zip root")
manifest = json.loads(z.read("manifest.json"))
needed = list(manifest["icons"].values())
needed.append(manifest["action"]["default_popup"])
needed.extend(manifest["action"]["default_icon"].values())
for group in manifest["content_scripts"]:
    needed.extend(group["js"])
    needed.extend(group["css"])
missing = [n for n in needed if n not in names]
if missing:
    raise SystemExit("manifest files missing from zip: " + ", ".join(missing))
print(path)
for info in z.infolist():
    print(f"{info.file_size:8d}  {info.filename}")
PY
