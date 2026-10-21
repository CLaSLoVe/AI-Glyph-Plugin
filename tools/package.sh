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
  icons/icon128.png \
  _locales/en/messages.json \
  _locales/zh_CN/messages.json
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
if manifest.get("default_locale") != "en":
    raise SystemExit("default_locale must be en")
if manifest.get("name") != "__MSG_extName__" or manifest.get("description") != "__MSG_extDescription__":
    raise SystemExit("manifest name and description must use __MSG_*__")
if manifest.get("action", {}).get("default_title") != "__MSG_extName__":
    raise SystemExit("action.default_title must use __MSG_extName__")
bundles = {}
for code in ("en", "zh_CN"):
    name = f"_locales/{code}/messages.json"
    if name not in names:
        raise SystemExit("missing " + name)
    bundles[code] = json.loads(z.read(name))
en_keys = set(bundles["en"])
for code, data in bundles.items():
    if set(data) != en_keys:
        raise SystemExit(code + " message keys differ from en")
    for key, entry in data.items():
        if not entry.get("message"):
            raise SystemExit(f"{code}.{key} has an empty message")
    desc = data["extDescription"]["message"]
    if len(desc) > 132:
        raise SystemExit(f"{code} extDescription is {len(desc)} characters; store limit is 132")
print(path)
for info in z.infolist():
    print(f"{info.file_size:8d}  {info.filename}")
PY
