# site — the OpenTranslate landing page

Deployed to **GitHub Pages** at <https://mekedron.github.io/OpenTranslate/> by
[`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml).

## Localized from one source — no per-language clones

The page is authored once and rendered into every language at deploy time.
[`scripts/build_site.py`](../scripts/build_site.py) fills one template with
per-language strings and writes the root (English) plus one `/xx/` page per
locale:

| Path | Language |
| --- | --- |
| `/` | English (canonical) |
| `/en/` `/de/` `/fr/` `/es/` `/it/` `/pt/` `/nl/` `/pl/` `/uk/` `/cs/` `/hu/` `/ro/` `/el/` `/tr/` `/sv/` `/da/` `/no/` `/fi/` `/is/` `/ru/` | one page per locale (order set in `locales.json`) |

Everything lives in [`i18n/`](i18n/):

| File | What it is |
| --- | --- |
| `i18n/template.html` | the page, with `{{placeholder}}` slots — **edit structure, styles & markup here** |
| `i18n/strings/en.json` | English source of truth for every string |
| `i18n/strings/<code>.json` | one translation per language (identical keys to `en.json`) |
| `i18n/locales.json` | locale registry: endonym, flag, `og:locale` |

Every page is generated with a header language `<select>`, a full hreflang
cluster (`en` and `x-default` → root), `og:locale` alternates, localized
JSON-LD, and a "this site is also available in …" banner driven by the
visitor's browser language. `sitemap.xml` and `robots.txt` are generated
alongside — don't commit them by hand.

### Editing copy
- **English wording** → edit the value in `i18n/strings/en.json`
  (and `i18n/template.html` if you're changing markup or styles).
- **A translation** → edit `i18n/strings/<code>.json`.
- **Add a language** → add an entry to `i18n/locales.json` and drop a matching
  `i18n/strings/<code>.json`. Nothing else to wire up. (A missing key falls back
  to English with a build warning.)

Two values carry inline markup and are injected raw — `hero_h1` (its `<br />`)
and `foot_attrib` (the read-frog link). Everything else is HTML-escaped, so
write `&` and `<` as themselves.

The site is served from a **repo subpath**, not a domain root, so every in-page
link and asset is relative: `{{rel}}` is `""` on the root page and `"../"` on a
`/xx/` page. Only the canonical, `og:url`, hreflang and sitemap entries are
absolute, built from `--base`.

## Preview locally

```sh
python3 scripts/build_site.py --out /tmp/ot-site --base http://127.0.0.1:8080
python3 -m http.server 8080 --directory /tmp/ot-site
# → http://127.0.0.1:8080/      (English root)
# → http://127.0.0.1:8080/de/   (Deutsch), /ru/, /el/, …
```
