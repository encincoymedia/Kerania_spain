#!/usr/bin/env python3
"""Independent static validation of the FTP directory; no third-party packages."""
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import posixpath
import re
import subprocess
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
DEPLOY = ROOT / "deploy"
REPORT = ROOT / "reports"
URL = re.compile(r'''url\(\s*["']?([^)"']+)["']?\s*\)''', re.I)
JS = re.compile(r'''(["'])([^"'\r\n]+\.(?:jpe?g|png|webp|svg|woff2?|css|js)(?:[?#][^"'\r\n]*)?)\1''', re.I)
ATTR = re.compile(r'''(\b(?:href|src|poster|action|data-image|xlink:href)\s*=\s*)(["'])(.*?)\2''', re.I)


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.refs, self.ids, self.anchors, self.data = [], set(), [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if d.get("id"):
            self.ids.add(d["id"])
        for key in ("src", "href", "poster", "action", "data-image", "xlink:href"):
            if d.get(key):
                self.refs.append((key, d[key]))
        if d.get("style"):
            self.refs.extend(("style", v) for v in URL.findall(d["style"]))
        # Everything except asset URLs must remain exactly the same.
        self.data.append((tag, [(k, v) for k, v in attrs if k not in {"href", "src", "poster", "action", "data-image", "xlink:href", "style"}]))

    def handle_data(self, data):
        self.data.append(data)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    inventory = json.loads((REPORT / "original-inventory.json").read_text())
    mapping = json.loads((REPORT / "asset-map.json").read_text())
    manifest = json.loads((REPORT / "deploy-manifest.json").read_text())
    files = {p.relative_to(DEPLOY).as_posix(): p for p in DEPLOY.rglob("*") if p.is_file()}
    pages = {p: Document(f.read_text()) for p, f in files.items() if f.suffix == ".html"}
    errors, external, checks, unicode_legacy = [], set(), 0, []

    def resolve(origin, value):
        u = urlsplit(unescape(value))
        if u.scheme or u.netloc:
            external.add(value)
            return None, u
        target = posixpath.normpath(unquote(u.path).lstrip("/") if u.path.startswith("/") else posixpath.join(posixpath.dirname(origin), unquote(u.path))) if u.path else origin
        if target in {"", "."}:
            target = "index.html"
        elif target not in files and target.rstrip("/") + "/index.html" in files:
            target = target.rstrip("/") + "/index.html"
        return target, u

    def check(origin, value, fragment=True):
        nonlocal checks
        target, u = resolve(origin, value)
        if target is None:
            return
        checks += 1
        if target not in files:
            errors.append([origin, value, "Exact path absent (case and Unicode sensitive)"])
        elif fragment and u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:
            errors.append([origin, value, "Missing fragment"])

    for p, page in pages.items():
        original = Document((ROOT / p).read_text())
        if page.data != original.data:
            errors.append([p, "Non-URL HTML content changed"])
        # Strip only asset URL attribute values; this also checks SEO, inline SVG,
        # styles, comments, editorial text and markup byte for byte.
        def skeleton(t):
            t = ATTR.sub(lambda m: m[1] + m[2] + "__URL__" + m[2], t)
            return URL.sub("url(__URL__)", t)
        if skeleton(files[p].read_text()) != skeleton((ROOT / p).read_text()):
            errors.append([p, "Markup, content, or inline style changed"])
        orig_refs = original.refs
        if len(orig_refs) != len(page.refs):
            errors.append([p, "Reference count changed"])
        for (attr, before), (_, after) in zip(orig_refs, page.refs):
            if attr == "href":
                u = urlsplit(before)
                if (u.scheme or u.netloc or not u.path or u.path.endswith((".html", "/"))) and before != after:
                    errors.append([p, before, after, "Navigation or SEO URL changed"])
        for attr, value in page.refs:
            check(p, value)

    project_original = {r["production"]: r["original"] for r in mapping}
    for p, f in files.items():
        if f.suffix == ".css":
            for value in URL.findall(f.read_text()):
                check(p, value, False)
        if f.suffix == ".js":
            result = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
            if result.returncode:
                errors.append([p, "JavaScript syntax", result.stderr])
            original = project_original.get(p, p)
            # JS asset paths resolve against document/pageBaseUrl, not script URL.
            for m in JS.finditer(f.read_text()):
                check(original, m[2], False)
        if p != unicodedata.normalize("NFC", p):
            unicode_legacy.append(p)

    # OS metadata changes independently; Git exclusions are deliberately updated
    # when preparing publication. Neither is a website source or public asset.
    volatile = [r["path"] for r in inventory if Path(r["path"]).name in {".DS_Store", "Thumbs.db", ".gitignore"}]
    for row in inventory:
        if row["path"] in volatile:
            continue
        if sha(ROOT / row["path"]) != row["sha256"]:
            errors.append([row["path"], "Original modified"])
    for row in mapping:
        if Path(row["original"]).suffix not in {".css", ".js"}:
            for key in ("production", "compatibility"):
                if sha(DEPLOY / row[key]) != row["sha256_original"]:
                    errors.append([row[key], "Binary asset bytes changed"])
        elif Path(row["original"]).suffix == ".css":
            before = URL.sub("url(__URL__)", (ROOT / row["original"]).read_text())
            after = URL.sub("url(__URL__)", (DEPLOY / row["production"]).read_text())
            if before != after:
                errors.append([row["production"], "CSS declarations changed"])
        elif Path(row["original"]).suffix == ".js":
            before = JS.sub("'__ASSET_URL__'", (ROOT / row["original"]).read_text())
            after = JS.sub("'__ASSET_URL__'", (DEPLOY / row["production"]).read_text())
            if before != after:
                errors.append([row["production"], "JavaScript logic changed"])
    for row in manifest:
        if sha(DEPLOY / row["path"]) != row["sha256"]:
            errors.append([row["path"], "Deployment differs from manifest"])
    for p in files:
        if Path(p).suffix not in {".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".webp", ".svg", ".woff", ".woff2", ".ico"}:
            errors.append([p, "Unexpected public file"])
    result = {"pages": len(pages), "files": len(files), "local_references_checked": checks,
              "errors": errors, "external_urls_preserved": sorted(external),
              "legacy_decomposed_unicode_filenames": unicode_legacy,
              "original_files_hash_verified": len(inventory) - len(volatile),
              "non_public_metadata_ignored": volatile,
              "html_content_css_js_logic_preserved": not errors,
              "new_asset_paths_ascii": all(r["production"].isascii() for r in mapping)}
    (REPORT / "static-verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in result.items() if k not in {"external_urls_preserved", "legacy_decomposed_unicode_filenames"}}, indent=2))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
