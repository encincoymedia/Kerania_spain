#!/usr/bin/env python3
"""Browser audit, interaction checks, HTTP crawl and original/deploy screenshots.

Requires the already installed Python Playwright and local Google Chrome.
The published website itself has no dependencies or build step.
Start serve_preview.py on 8765 (deploy --strict) and 8766 (original) first.
"""
from pathlib import Path
from urllib.parse import quote, urlsplit
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import base64
import hashlib
import json
import os
import sys
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports"
SHOTS = REPORT / "screenshots"
BASE = "http://127.0.0.1:8765/"
ORIGINAL = "http://127.0.0.1:8766/"
COMPARE = """async ({a,b}) => {
  const decode = async data => {
    const img = new Image(); img.src = 'data:image/png;base64,' + data;
    await img.decode(); const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0);
    return {w:img.width,h:img.height,p:ctx.getImageData(0,0,img.width,img.height).data};
  };
  const x=await decode(a), y=await decode(b);
  if(x.w!==y.w || x.h!==y.h) return {equal:false,original:[x.w,x.h],deploy:[y.w,y.h]};
  let changed=0,maxDelta=0;
  for(let i=0;i<x.p.length;i+=4){
    let different=false;
    for(let c=0;c<4;c++){const d=Math.abs(x.p[i+c]-y.p[i+c]);maxDelta=Math.max(maxDelta,d);if(d)different=true;}
    if(different)changed++;
  }
  return {equal:changed===0,width:x.w,height:x.h,changed_pixels:changed,percent:100*changed/(x.w*x.h),max_delta:maxDelta};
}"""


def main():
    SHOTS.mkdir(exist_ok=True)
    result = {"http": [], "pages": [], "interactions": [], "visual": [], "external_requests": [], "failures": []}
    mobile_only = "--mobile-only" in sys.argv
    interactions_only = "--interactions-only" in sys.argv or mobile_only
    if interactions_only:
        result = json.loads((REPORT / "browser-verification.json").read_text())
        old_names = {r["name"] for r in result["interactions"] if not mobile_only or r["name"].startswith("Mobile menu,")}
        result["failures"] = [r for r in result["failures"] if r[0] not in old_names]
        result["interactions"] = [r for r in result["interactions"] if r["name"] not in old_names]
    manifest = json.loads((REPORT / "deploy-manifest.json").read_text())
    pages = sorted(r["path"] for r in manifest if r["path"].endswith(".html"))

    def fetch(row):
        path = row["path"]
        try:
            with urlopen(BASE + quote(path), timeout=20) as response:
                data = response.read()
                return {"path": path, "status": response.status, "sha256_matches": hashlib.sha256(data).hexdigest() == row["sha256"]}
        except Exception as error:
            return {"path": path, "error": str(error)}

    if not interactions_only:
        with ThreadPoolExecutor(max_workers=6) as pool:
            result["http"] = list(pool.map(fetch, manifest))
    for r in result["http"]:
        if r.get("status") != 200 or not r.get("sha256_matches"):
            result["failures"].append(["HTTP", r])
    # Both directory URLs and explicit index.html URLs must remain available.
    for path in ([] if interactions_only else pages):
        directory = path.removesuffix("index.html")
        with urlopen(BASE + directory, timeout=15) as response:
            if response.status != 200:
                result["failures"].append(["Directory URL", directory])
    print(f"HTTP: {len(manifest)} files and {len(pages)} directory URLs checked", flush=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("KERANIA_QA_CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), headless=True, args=["--disable-gpu"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1, reduced_motion="reduce")
        cache = {}

        def external(route):
            url = route.request.url
            if urlsplit(url).hostname in {"127.0.0.1", "localhost"}:
                return route.continue_()
            if url in cache:
                entry = cache[url]
            else:
                try:
                    response = route.fetch(timeout=12000)
                    entry = {"status": response.status, "headers": response.headers, "body": response.body()}
                    result["external_requests"].append({"url": url, "status": response.status})
                except Exception as error:
                    entry = None
                    result["external_requests"].append({"url": url, "error": str(error).splitlines()[0]})
                cache[url] = entry
            if entry:
                route.fulfill(**entry)
            else:
                route.abort("failed")

        context.route("**/*", external)
        comparator = context.new_page()

        def ready(page):
            # Full-page screenshots otherwise capture lazy images before the
            # browser decides to load them. This affects both audit pages only.
            page.evaluate("() => document.querySelectorAll('img[loading]').forEach(i=>i.loading='eager')")
            # Exercise lazy loading and intersection observers throughout the page.
            page.evaluate("""async () => {
              for(let y=0;y<document.documentElement.scrollHeight;y+=Math.max(300,innerHeight-150)){
                scrollTo(0,y); await new Promise(r=>requestAnimationFrame(r));
              }
              scrollTo(0,0);
            }""")
            page.evaluate("""async () => {
              await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,14000))]);
              await Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>
                i.complete ? Promise.resolve() : new Promise(r=>{i.onload=r;i.onerror=r;setTimeout(r,14000)})));
            }""")
            page.wait_for_timeout(2400)
            # Freeze animation only in the audit browser, never in production.
            page.add_style_tag(content="*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}")
            page.evaluate("scrollTo(0,0)")
            page.wait_for_timeout(100)

        for viewport in (() if interactions_only else ({"width": 1440, "height": 1000}, {"width": 390, "height": 844})):
            label = "desktop" if viewport["width"] > 500 else "mobile"
            if label == "mobile":
                context = browser.new_context(viewport=viewport, device_scale_factor=1, reduced_motion="reduce", is_mobile=True, has_touch=True)
                context.route("**/*", external)
            for path in pages:
                shots = []
                for kind, base in (("original", ORIGINAL), ("deploy", BASE)):
                    page = context.new_page()
                    page.set_viewport_size(viewport)
                    page.set_default_timeout(6000)
                    errors, failed, bad_http = [], [], []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.on("requestfailed", lambda req: failed.append({"url": req.url, "error": req.failure}))
                    page.on("response", lambda r: bad_http.append({"url": r.url, "status": r.status}) if r.status >= 400 else None)
                    response = page.goto(base + path, wait_until="domcontentloaded", timeout=30000)
                    ready(page)
                    broken = page.evaluate("""() => [...document.images].filter(i=>i.getAttribute('src') && i.complete && !i.naturalWidth).map(i=>i.src)""")
                    overflow = page.evaluate("({viewport:innerWidth,width:document.documentElement.scrollWidth})")
                    name = (path.removesuffix("/index.html").replace("/", "--").replace(".html", "")) or "home"
                    shot = SHOTS / f"{label}--{name}--{kind}.png"
                    image_bytes = page.screenshot(path=str(shot), full_page=True, animations="disabled")
                    shots.append(image_bytes)
                    entry = {"kind": kind, "viewport": label, "path": path, "status": response.status, "javascript_errors": errors,
                             "failed_requests": failed, "http_errors": bad_http, "broken_images": broken, "dimensions": overflow,
                             "screenshot": shot.relative_to(ROOT).as_posix()}
                    result["pages"].append(entry)
                    if kind == "deploy":
                        internal = [r for r in failed + bad_http if r["url"].startswith(BASE)]
                        internal_images = [v for v in broken if v.startswith(BASE)]
                        if errors or internal or internal_images:
                            result["failures"].append([label, path, errors, internal, internal_images])
                    page.close()
                if shots[0] == shots[1]:
                    diff = {"equal": True, "png_identical": True, "changed_pixels": 0}
                else:
                    diff = comparator.evaluate(COMPARE, {"a": base64.b64encode(shots[0]).decode(), "b": base64.b64encode(shots[1]).decode()})
                result["visual"].append({"viewport": label, "path": path, **diff})
                print(f"VISUAL {label} {path}: {diff}", flush=True)
                (REPORT / "browser-verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")

        def record(name, fn):
            if mobile_only and not name.startswith("Mobile menu,"):
                return
            try:
                details = fn()
                result["interactions"].append({"name": name, "passed": True, "details": details})
                print(f"PASS {name}", flush=True)
            except Exception as error:
                result["interactions"].append({"name": name, "passed": False, "error": str(error)})
                result["failures"].append([name, str(error)])
                print(f"FAIL {name}: {error}", flush=True)

        test_context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        test_context.route("**/*", external)
        page = test_context.new_page()
        page.set_default_timeout(6000)

        def menus():
            mobile_context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, reduced_motion="reduce")
            mobile_context.route("**/*", external)
            page = mobile_context.new_page()
            page.set_default_timeout(6000)
            cases = []
            for path in pages:
                try:
                    page.goto(BASE + path, wait_until="networkidle")
                    page.locator("#menu-toggle").tap()
                    assert page.locator("#menu-toggle").get_attribute("aria-expanded") == "true", path
                    assert page.locator("#mobile-nav").get_attribute("aria-hidden") == "false", path
                    summary = page.locator(".mobile-services-menu summary")
                    summary.tap()
                    assert page.locator(".mobile-services-menu").get_attribute("open") is not None, path
                    link = page.locator(".mobile-services-menu a").first
                    link.tap()
                    page.wait_for_url("**/servicios/instalaciones-revestimientos/index.html")
                    page.locator("h1").wait_for(state="visible")
                    assert page.locator("h1").count() == 1, f"{path}: expected a single h1 after navigation"
                    cases.append({"path": path, "passed": True})
                except Exception as error:
                    cases.append({"path": path, "passed": False, "error": (str(error).splitlines() or [type(error).__name__])[0]})
            result["mobile_menu_cases"] = cases
            mobile_context.close()
            failed = [r["path"] for r in cases if not r["passed"]]
            assert not failed, f"Mobile menu/navigation failed on: {', '.join(failed)}. See mobile-menu-comparison.json for original/deploy comparison."
            return {"mobile_menus_and_service_navigation": len(pages)}

        record("Mobile menu, services submenu and navigation on all pages", menus)

        def desktop_menu():
            page.set_viewport_size({"width": 1440, "height": 1000})
            page.goto(BASE, wait_until="domcontentloaded")
            page.locator(".header__services-menu summary").click()
            assert page.locator(".header__services-menu").get_attribute("open") is not None
            page.keyboard.press("Escape")
            assert page.locator(".header__services-menu").get_attribute("open") is None
            return "Opens and closes with Escape"

        record("Desktop services menu", desktop_menu)

        def galleries():
            page.set_viewport_size({"width": 1440, "height": 1000})
            page.goto(BASE + "proyectos/", wait_until="domcontentloaded")
            slugs = page.locator(".portfolio-card__trigger").evaluate_all("els => els.map(e=>e.dataset.project)")
            counts = {}
            for slug in slugs:
                page.locator(f'.portfolio-card__trigger[data-project="{slug}"]').click()
                page.wait_for_selector("#project-viewer.is-open")
                assert page.url.endswith(f"/{slug}/")
                buttons = page.locator("#viewer-thumbnails button")
                counts[slug] = buttons.count()
                for i in range(buttons.count()):
                    buttons.nth(i).click()
                    page.wait_for_function("() => {const i=document.getElementById('viewer-image'); return i.complete && i.naturalWidth>0}")
                    assert page.locator("#viewer-counter").inner_text().startswith(str(i + 1).zfill(2))
                page.locator("#viewer-next").click()
                assert page.locator("#viewer-counter").inner_text().startswith("01")
                page.keyboard.press("ArrowRight")
                assert page.locator("#viewer-counter").inner_text().startswith("02")
                page.keyboard.press("Escape")
                page.wait_for_function("!document.getElementById('project-viewer').classList.contains('is-open')")
                assert page.url.endswith("/proyectos/")
            return counts

        record("Every gallery image, next button, keyboard, history and close", galleries)

        def filters():
            page.goto(BASE + "proyectos/", wait_until="domcontentloaded")
            buttons = page.locator(".portfolio-filter")
            for i in range(buttons.count()):
                b = buttons.nth(i)
                category = b.get_attribute("data-filter")
                b.click()
                assert b.get_attribute("aria-pressed") == "true"
                visible = page.locator(".portfolio-card:not([hidden])")
                assert visible.count() > 0
                if category != "all":
                    assert all(c == category for c in visible.evaluate_all("els=>els.map(e=>e.dataset.category)"))
            return {"filters_checked": buttons.count()}

        record("Project filters", filters)

        def faq():
            checked = 0
            for path in pages:
                if not path.startswith("servicios/"):
                    continue
                page.goto(BASE + path, wait_until="networkidle")
                items = page.locator(".service-faq__item")
                if items.count() < 2:
                    continue
                items.nth(0).locator("summary").click()
                assert items.nth(0).get_attribute("open") is not None
                items.nth(1).locator("summary").click()
                assert items.nth(1).get_attribute("open") is not None
                page.wait_for_function("!document.querySelector('.service-faq__item').open")
                checked += 1
            return {"service_faqs": checked}

        record("FAQ accordion exclusivity", faq)

        def coverage():
            page.goto(BASE, wait_until="domcontentloaded")
            provinces = page.locator(".coverage-map .provincia")
            assert provinces.count() == 3
            provinces.first.focus()
            page.keyboard.press("Enter")
            assert provinces.first.get_attribute("aria-pressed") == "true"
            page.keyboard.press("Escape")
            assert provinces.first.get_attribute("aria-pressed") == "false"
            return {"provinces": provinces.count(), "keyboard": True}

        record("Interactive coverage map", coverage)

        def form():
            page.goto(BASE + "contacto/", wait_until="networkidle")
            page.locator('button[type="submit"]').click()
            assert page.locator('[aria-invalid="true"]').count() == 6
            page.locator("#name").fill("Prueba local Kerania")
            page.locator("#email").fill("qa@example.com")
            page.locator("#project-type").select_option(label="Otro")
            page.locator("#location").fill("Valencia")
            page.locator("#message").fill("Validación local de la preparación del correo.")
            page.locator("#message").blur()
            page.locator('label[for="privacy"]').click()
            page.wait_for_function("document.getElementById('privacy').checked")
            page.locator('button[type="submit"]').click()
            assert page.locator('[aria-invalid="true"]').count() == 0
            assert "Se abrirá tu aplicación de correo" in page.locator("#form-status").inner_text()
            return "Required fields and prepared-mail status verified; no email sent and external mail client not verified"

        record("Contact form validation and mail preparation", form)
        page.close()
        context.close()
        browser.close()
    result["summary"] = {"http_files": len(manifest), "browser_page_loads": len(result["pages"]),
                         "visual_pairs": len(result["visual"]), "exact_visual_matches": sum(v["equal"] for v in result["visual"]),
                         "interactions_passed": sum(v["passed"] for v in result["interactions"]),
                         "failures": len(result["failures"])}
    (REPORT / "browser-verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result["summary"], indent=2), flush=True)
    raise SystemExit(bool(result["failures"]))


if __name__ == "__main__":
    main()
