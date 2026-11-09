#!/usr/bin/env python3
"""Package the existing static site without changing any original file.

Uses Python's standard library only. Run from any directory. The reports and
maintenance tools deliberately remain outside deploy/.
"""
from collections import Counter, defaultdict
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit
import hashlib
import json
import posixpath
import re
import shutil
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports"
DEPLOY = ROOT / "deploy"
STAGING = ROOT / ".deploy-staging"
GENERATED = {".git", "tools", "reports", "deploy", ".deploy-staging"}
ATTR = re.compile(r'''(?P<lead>\b(?:href|src|poster|action|data-image|xlink:href)\s*=\s*)(?P<q>["'])(?P<url>.*?)(?P=q)''', re.I)
CSS_URL = re.compile(r'''url\(\s*(?P<q>["']?)(?P<url>[^)"']+)(?P=q)\s*\)''', re.I)
JS_URL = re.compile(r'''(?P<q>["'])(?P<url>[^"'\r\n]+\.(?:jpe?g|png|webp|svg|woff2?|css|js)(?:[?#][^"'\r\n]*)?)(?P=q)''', re.I)
PUBLIC_TYPES = {".css", ".js", ".jpg", ".jpeg", ".png", ".webp", ".svg", ".woff", ".woff2", ".ico"}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dump(name, value):
    (REPORT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.refs, self.ids, self.forms, self.seo = [], [], [], []
        self.lang = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "form":
            self.forms.append(attrs)
        if tag in {"meta", "title"} or (tag == "link" and (attrs.get("rel") == "canonical" or "hreflang" in attrs)):
            self.seo.append([tag, attrs])
        for key in ("href", "src", "poster", "action", "data-image", "xlink:href"):
            if attrs.get(key):
                self.refs.append({"tag": tag, "attribute": key, "url": attrs[key]})
        if attrs.get("style"):
            self.refs.extend({"tag": tag, "attribute": "style", "url": m["url"]} for m in CSS_URL.finditer(attrs["style"]))


def main():
    files = sorted(p for p in ROOT.rglob("*") if p.is_file() and not set(p.relative_to(ROOT).parts) & GENERATED)
    paths = {p.relative_to(ROOT).as_posix(): p for p in files}
    # macOS often stores decomposed accents; source references use composed ones.
    normalized = {unicodedata.normalize("NFC", p): p for p in paths}
    assert len(normalized) == len(paths), "Ambiguous Unicode source paths"
    hashes = {p: digest(f) for p, f in paths.items()}

    def resolve(origin, url):
        u = urlsplit(unescape(url))
        if not u.path or u.scheme or u.netloc:
            return None
        name = posixpath.normpath(unquote(u.path).lstrip("/") if u.path.startswith("/") else posixpath.join(posixpath.dirname(origin), unquote(u.path)))
        if (ROOT / name).is_dir():
            name = posixpath.join(name, "index.html")
        return normalized.get(unicodedata.normalize("NFC", name))

    pages = {p: Page(f.read_text()) for p, f in paths.items() if f.suffix == ".html" and not p.startswith("backups/")}
    dependencies, missing, external = {}, [], set()
    for p, f in paths.items():
        refs = []
        if p in pages:
            refs = pages[p].refs
        elif f.suffix in {".css", ".js", ".svg"} and not p.startswith("backups/"):
            text = f.read_text()
            pattern = CSS_URL if f.suffix == ".css" else JS_URL if f.suffix == ".js" else ATTR
            refs = [{"url": m["url"], "attribute": f.suffix} for m in pattern.finditer(text)]
        dependencies[p] = []
        for ref in refs:
            u = urlsplit(unescape(ref["url"]))
            if u.scheme or u.netloc:
                if u.scheme in {"http", "https"} or u.netloc:
                    external.add(ref["url"])
                continue
            if not u.path:
                continue
            target = resolve(p, ref["url"])
            if target:
                dependencies[p].append({**ref, "target": target})
            else:
                missing.append({"source": p, **ref})
    assert not missing, f"Unresolved local dependencies: {missing}"

    used = set(pages)
    pending = list(pages)
    while pending:
        for ref in dependencies[pending.pop()]:
            target = ref["target"]
            if target not in used:
                used.add(target)
                pending.append(target)

    duplicates = defaultdict(list)
    for p, sha in hashes.items():
        duplicates[sha].append(p)
    REPORT.mkdir(exist_ok=True)
    dump("original-inventory.json", [{"path": p, "bytes": paths[p].stat().st_size, "sha256": hashes[p]} for p in paths])
    dump("audit.json", {
        "files": len(paths), "bytes": sum(f.stat().st_size for f in paths.values()),
        "types": dict(Counter(f.suffix.lower() or "(none)" for f in paths.values())),
        "pages": [{"path": p, "language": a.lang, "forms": a.forms, "seo": a.seo} for p, a in pages.items()],
        "dependencies": {p: d for p, d in dependencies.items() if d},
        "external_urls": sorted(external), "missing": missing,
        "duplicates": [v for v in duplicates.values() if len(v) > 1],
    })

    def slug(value):
        value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
        return re.sub(r"[^a-z0-9.]+", "-", value).strip("-")

    def destination(p):
        f = paths[p]
        if f.suffix == ".css":
            return "assets/css/" + slug(f.name)
        if f.suffix == ".js":
            name = "servicios.js" if p.startswith("servicios/") else slug(f.name)
            return "assets/js/" + name
        if f.suffix in {".woff", ".woff2"}:
            return "assets/fonts/" + slug(f.name)
        if p.startswith("Logos kerania nueva web/"):
            group = "logos/kerania"
        elif p.startswith("Imagenes/logos_clientes/"):
            group = "logos/clientes"
        elif p.startswith("Imagenes/instalaciones-revestimientos/"):
            group = "servicios/instalaciones-revestimientos"
        elif p.startswith("Imagenes/"):
            group = "generales"
        elif p.startswith("proyectos/"):
            group = "proyectos/" + slug(Path(p).parts[1])
        elif p.startswith("servicios/"):
            group = "servicios/" + slug(Path(p).parts[1])
        else:
            group = "generales"
        return "assets/img/" + group + "/" + slug(f.name)

    mapping, by_content = {}, {}
    for p in sorted(used):
        if p in pages:
            continue
        assert paths[p].suffix in PUBLIC_TYPES, f"Non-public dependency: {p}"
        key = (paths[p].suffix, hashes[p])
        mapping[p] = by_content.setdefault(key, destination(p))
    # Distinct content must never silently overwrite the same destination.
    destinations = defaultdict(set)
    for p, dest in mapping.items():
        destinations[dest].add(hashes[p])
    assert all(len(v) == 1 for v in destinations.values()), "Destination collision"

    edits = []

    def rewrite_url(origin, output, url, is_html=False, js=False):
        target = resolve(origin, url)
        if target not in mapping:
            return url
        u = urlsplit(unescape(url))
        # Existing project JS deliberately resolves images against /proyectos/,
        # independently of its script URL, including after history.pushState.
        base = posixpath.dirname(origin) if js else posixpath.dirname(output)
        rewritten = quote(posixpath.relpath(mapping[target], base or "."), safe="/.-_")
        rewritten = urlunsplit(("", "", rewritten, u.query, u.fragment))
        if is_html:
            rewritten = escape(rewritten, quote=True)
        if rewritten != url:
            edits.append({"source": origin, "output": output, "before": url, "after": rewritten})
        return rewritten

    def transform(origin, output):
        text = paths[origin].read_text()
        suffix = paths[origin].suffix
        if suffix == ".html":
            text = ATTR.sub(lambda m: m["lead"] + m["q"] + rewrite_url(origin, output, m["url"], True) + m["q"], text)
            text = CSS_URL.sub(lambda m: "url(" + m["q"] + rewrite_url(origin, output, m["url"], True) + m["q"] + ")", text)
        elif suffix == ".css":
            text = CSS_URL.sub(lambda m: "url(" + m["q"] + rewrite_url(origin, output, m["url"]) + m["q"] + ")", text)
        elif suffix == ".js":
            text = JS_URL.sub(lambda m: m["q"] + rewrite_url(origin, output, m["url"], js=True) + m["q"], text)
        return text

    if STAGING.exists():
        raise SystemExit("Remove or inspect the existing .deploy-staging directory first.")
    if DEPLOY.exists():
        raise SystemExit("deploy/ already exists. Preserve it elsewhere before regenerating.")
    STAGING.mkdir()
    for p in sorted(pages):
        out = STAGING / p
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(transform(p, p))
    for p, dest in mapping.items():
        for output in (dest, p):
            out = STAGING / output
            out.parent.mkdir(parents=True, exist_ok=True)
            if paths[p].suffix in {".css", ".js"}:
                out.write_text(transform(p, output))
            else:
                shutil.copyfile(paths[p], out)
    # Optional existing public SEO/configuration files are copied verbatim.
    for name in ("robots.txt", "sitemap.xml", ".htaccess", "web.config"):
        if name in paths:
            shutil.copyfile(paths[name], STAGING / name)
    STAGING.rename(DEPLOY)

    excluded = []
    for p in sorted(set(paths) - used):
        f = paths[p]
        if p.startswith("backups/"):
            reason = "Copia de seguridad"
        elif f.name.startswith(".") or f.suffix == ".tmp":
            reason = "Metadatos, configuración local o archivo temporal"
        elif f.suffix == ".ai":
            reason = "Documento editable de diseño"
        elif f.suffix == ".js":
            reason = "Sin referencias desde ninguna página o dependencia activa"
        else:
            reason = "Recurso sin referencias activas, incluidas galerías JavaScript y CSS"
        excluded.append({"path": p, "bytes": f.stat().st_size, "reason": reason,
                         "identical_used_files": [x for x in duplicates[hashes[p]] if x in used]})
    dump("asset-map.json", [{"original": p, "production": d, "compatibility": p, "sha256_original": hashes[p]} for p, d in mapping.items()])
    dump("rewritten-references.json", edits)
    dump("excluded-files.json", excluded)
    output_files = sorted(p for p in DEPLOY.rglob("*") if p.is_file())
    dump("deploy-manifest.json", [{"path": p.relative_to(DEPLOY).as_posix(), "bytes": p.stat().st_size, "sha256": digest(p)} for p in output_files])
    rows = ["original\tproduccion\tcompatibilidad"] + [f"{p}\t{d}\t{p}" for p, d in mapping.items()]
    (REPORT / "asset-map.tsv").write_text("\n".join(rows) + "\n")
    assert all(digest(f) == hashes[p] for p, f in paths.items()), "Original file changed during packaging"
    print(json.dumps({"pages": len(pages), "used_original_resources": len(mapping),
                      "centralized_resources": len(set(mapping.values())), "excluded": len(excluded),
                      "deploy_files": len(output_files), "deploy_bytes": sum(p.stat().st_size for p in output_files),
                      "rewritten_references": len(edits), "originals_unchanged": True}, indent=2))


if __name__ == "__main__":
    main()
