#!/usr/bin/env python3
"""Render the localized landing pages from one template + per-language strings.

The landing page is authored ONCE as `site/i18n/template.html` with
`{{placeholder}}` slots. This script fills those slots from
`site/i18n/strings/<code>.json` (one file per language; `en.json` is the English
source of truth) and writes a static page per locale:

    _site/index.html         English  (root, canonical)
    _site/en/index.html      English  (alias, canonical -> root)
    _site/de/index.html      Deutsch
    _site/es/index.html      Español
    ... one dir per locale in site/i18n/locales.json ...

Every page gets a full hreflang cluster, `og:locale` alternates, a header
language <select>, and the embedded table the "also available in …" banner
needs — all derived here, so adding a language is just a new
strings/<code>.json plus an entry in locales.json. `sitemap.xml` and the static
assets from `site/` are emitted alongside.

The site is served from a repo subpath (https://mekedron.github.io/OpenTranslate/),
so every in-page link and asset is RELATIVE — `{{rel}}` is "" on the root page and
"../" on a /xx/ page. Only the canonical, og:url, hreflang and sitemap entries are
absolute, and those are built from --base.

Usage (also run by .github/workflows/deploy-pages.yml):
    python3 scripts/build_site.py --out _site
    python3 scripts/build_site.py --out /tmp/ot-site --base http://127.0.0.1:8080
"""
import argparse
import html
import json
import os
import shutil
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
I18N = os.path.join(SITE, "i18n")
STRINGS = os.path.join(I18N, "strings")

PLACEHOLDER_RE = re.compile(r"\{\{\s*([\w.\-]+)\s*\}\}")

# Values that legitimately carry inline markup (<br>, <a>) and so are injected
# verbatim; every other string is HTML-escaped.
HTML_KEYS = {"hero_h1", "foot_attrib"}

# Strings the page's JS needs at runtime (see `var I18N = …` in the template).
JS_KEYS = ("theme_label", "theme_auto", "theme_light", "theme_dark", "theme_hint")


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def esc(s):
    return html.escape(s, quote=True)


def js_literal(obj):
    """JSON for embedding in a <script>; neutralize any </script> break-out."""
    return json.dumps(obj, ensure_ascii=False).replace("<", "\\u003c")


def loc_url(base, code, default):
    """The absolute, canonical URL of a locale's page."""
    return base + "/" if code == default else "%s/%s/" % (base, code)


def render(template, subs):
    """Fill {{key}} slots. One non-rescanning pass: a value may contain markup,
    but a `{{key}}` inside a value is left alone — render it before you pass it."""
    def repl(m):
        key = m.group(1)
        if key not in subs:
            raise KeyError("template placeholder {{%s}} has no value" % key)
        return subs[key]
    return PLACEHOLDER_RE.sub(repl, template)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def load_strings(codes):
    """Merge each locale's strings over the English source of truth.

    A missing key falls back to English with a warning — a half-translated page
    is better than a build that fails on one stale file.
    """
    en = load_json(os.path.join(STRINGS, "en.json"))
    all_strings, warnings = {}, []
    for code in codes:
        path = os.path.join(STRINGS, "%s.json" % code)
        if not os.path.exists(path):
            warnings.append("  strings/%s.json missing — English fallback for all keys" % code)
            data = {}
        else:
            data = load_json(path)
            missing = [k for k in en if k not in data]
            if missing:
                warnings.append("  strings/%s.json missing %d key(s): %s"
                                % (code, len(missing), ", ".join(missing[:8])
                                   + (" …" if len(missing) > 8 else "")))
        merged = dict(en)
        merged.update({k: v for k, v in data.items() if k in en})
        all_strings[code] = merged
    return all_strings, warnings


def sitemap(base, codes, default):
    alts = [("x-default", base + "/")]
    alts += [(c, loc_url(base, c, default)) for c in codes]
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for c in codes:
        out.append("  <url>")
        out.append("    <loc>%s</loc>" % esc(loc_url(base, c, default)))
        for hreflang, href in alts:
            out.append('    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>'
                       % (hreflang, esc(href)))
        out.append("  </url>")
    out.append("</urlset>")
    return "\n".join(out) + "\n"


def build(out_dir, base):
    base = base.rstrip("/")
    with open(os.path.join(I18N, "template.html"), encoding="utf-8") as fh:
        template = fh.read()

    reg = load_json(os.path.join(I18N, "locales.json"))
    default, locales = reg["default"], reg["locales"]
    codes = [l["code"] for l in locales]
    names = {l["code"]: l["name"] for l in locales}
    flags = {l["code"]: l.get("flag", "") for l in locales}

    all_strings, warnings = load_strings(codes)

    # Banner table (constant across pages): code, endonym, flag, and the "also
    # available in …" invitation written IN that language.
    locales_js = js_literal([{"c": c, "n": names[c], "f": flags[c],
                              "b": all_strings[c]["banner"]} for c in codes])

    hreflang_links = "\n".join(
        ['<link rel="alternate" hreflang="x-default" href="%s" />' % (base + "/")]
        + ['<link rel="alternate" hreflang="%s" href="%s" />' % (c, loc_url(base, c, default))
           for c in codes])

    def page(code, at_root):
        """Render one page. `at_root` distinguishes the canonical English page at
        / from its /en/ alias — same strings, different relative depth."""
        s = all_strings[code]
        loc = next(l for l in locales if l["code"] == code)
        rel = "" if at_root else "../"

        # Every locale's home, relative to THIS page. Feeds the switcher options
        # and the banner's link.
        homes = {c: (rel or "./") if c == default else "%s%s/" % (rel, c) for c in codes}

        opts = "".join(
            '<option value="%s"%s>%s</option>'
            % (homes[c], " selected" if c == code else "",
               esc(("%s %s" % (flags[c], names[c])).strip()))
            for c in codes)

        subs = {k: (v if k in HTML_KEYS else esc(v)) for k, v in s.items()}
        subs.update({
            "html_lang": code,
            "code": code,
            "rel": rel,
            "base_url": esc(base),
            "canonical_url": esc(loc_url(base, code, default)),
            "hreflang_links": hreflang_links,
            "og_locale": loc["og_locale"],
            "og_locale_alternates": "\n".join(
                '<meta property="og:locale:alternate" content="%s" />' % l["og_locale"]
                for l in locales if l["code"] != code),
            "lang_options": opts,
            "current_flag": esc(flags[code]),
            "jsonld_description_js": js_literal(s["jsonld_description"]),
            "i18n_js": js_literal({k: s[k] for k in JS_KEYS}),
            "locales_js": locales_js,
            "homes_js": js_literal(homes),
        })
        return render(template, subs)

    write(os.path.join(out_dir, "index.html"), page(default, at_root=True))
    for code in codes:
        write(os.path.join(out_dir, code, "index.html"), page(code, at_root=False))

    write(os.path.join(out_dir, "sitemap.xml"), sitemap(base, codes, default))
    write(os.path.join(out_dir, "robots.txt"),
          "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % base)

    # Static assets: everything under site/ except the i18n sources, the internal
    # README, and the files this build generates.
    skip = {"i18n", "README.md", "index.html", "sitemap.xml", "robots.txt"}
    for name in sorted(os.listdir(SITE)):
        if name in skip:
            continue
        src, dst = os.path.join(SITE, name), os.path.join(out_dir, name)
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            os.makedirs(out_dir, exist_ok=True)
            shutil.copy2(src, dst)

    print("Built %d locales into %s" % (len(codes), out_dir))
    print("  pages: / (root) + " + ", ".join("/%s/" % c for c in codes))
    if warnings:
        print("Warnings:")
        print("\n".join(warnings))


def main():
    ap = argparse.ArgumentParser(description="Render the localized OpenTranslate landing pages.")
    ap.add_argument("--out", required=True, help="output directory (e.g. _site)")
    ap.add_argument("--base", default="https://mekedron.github.io/OpenTranslate",
                    help="canonical origin (including any repo subpath)")
    args = ap.parse_args()
    build(args.out, args.base)


if __name__ == "__main__":
    main()
