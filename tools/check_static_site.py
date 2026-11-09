#!/usr/bin/env python3
"""Validate a standalone static delivery at its real public URL prefix.

Uses only Python's standard library and Node's syntax checker. No build step,
private audit files, framework, or package installation is needed.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit
import argparse
import json
import re
import subprocess

CSS_URL = re.compile(r'''url\(\s*["']?([^)"']+)["']?\s*\)''', re.I)
JS_URL = re.compile(r'''(["'])([^"'\r\n]+\.(?:jpe?g|png|webp|svg|woff2?|css|js)(?:[?#][^"'\r\n]*)?)\1''', re.I)
SERVICE_URL = re.compile(r'''["']?serviceHref["']?\s*:\s*["']([^"']+)["']''')


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.refs = set(), []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if d.get("id"):
            self.ids.add(d["id"])
        for a in ("src", "href", "poster", "action", "data-image", "xlink:href"):
            if d.get(a):
                self.refs.append(d[a])
        if d.get("style"):
            self.refs.extend(CSS_URL.findall(d["style"]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--base-path", default="/")
    args = parser.parse_args()
    root = args.directory.resolve()
    prefix = "/" + args.base_path.strip("/") + "/" if args.base_path.strip("/") else "/"
    base = "https://static-check.invalid" + prefix
    files = {p.relative_to(root).as_posix(): p for p in root.rglob("*") if p.is_file()}
    pages = {p: Page(f.read_text()) for p, f in files.items() if f.suffix == ".html"}
    errors, checked = [], 0

    def check(origin, ref, fragment=True):
        nonlocal checked
        u = urlsplit(ref)
        if u.scheme or u.netloc:
            return
        if not u.path and not fragment:
            return
        absolute = urlsplit(urljoin(base + quote(origin), ref))
        if not absolute.path.startswith(prefix):
            errors.append([origin, ref, "Escapes the GitHub Pages project prefix"])
            return
        name = unquote(absolute.path[len(prefix):])
        if not name or name.endswith("/"):
            name += "index.html"
        elif name not in files and name + "/index.html" in files:
            name += "/index.html"
        checked += 1
        if name not in files:
            errors.append([origin, ref, "Missing exact file path"])
        elif fragment and absolute.fragment and name in pages and unquote(absolute.fragment) not in pages[name].ids:
            errors.append([origin, ref, "Missing anchor"])

    for name, page in pages.items():
        for ref in page.refs:
            check(name, ref)
    for name, path in files.items():
        if path.is_symlink():
            errors.append([name, "Symbolic links cannot be published"])
        if path.suffix in {".ai", ".tmp", ".pem", ".key", ".md", ".py"} or path.name in {".DS_Store", "Thumbs.db"} or any(p in {"backups", ".git", "node_modules", "reports"} for p in path.relative_to(root).parts):
            errors.append([name, "Non-public file in delivery"])
        if path.suffix == ".css":
            for ref in CSS_URL.findall(path.read_text()):
                check(name, ref, False)
        if path.suffix == ".js":
            syntax = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
            if syntax.returncode:
                errors.append([name, syntax.stderr])
            # The existing gallery resolves against /proyectos/, not script.src.
            origin = "proyectos/index.html" if path.name == "proyectos.js" else "index.html" if path.name == "script.js" else name
            for m in JS_URL.finditer(path.read_text()):
                check(origin, m[2], False)
            for ref in SERVICE_URL.findall(path.read_text()):
                check(origin, ref)
    if "index.html" not in pages:
        errors.append(["index.html", "Missing homepage"])
    print(json.dumps({"base_path": prefix, "pages": len(pages), "files": len(files),
                      "local_references": checked, "errors": errors}, ensure_ascii=False, indent=2))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
