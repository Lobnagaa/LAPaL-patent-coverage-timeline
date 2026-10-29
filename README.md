# LAPaL patent coverage — working prototype

Where long-acting therapeutics listed on [LAPaL](https://lapal.ch) are patented in low- and
middle-income countries, when those patents are expected to expire, and where voluntary licences may
allow generic manufacturing and/or sale. Built by the Medicines Patent Pool as a prototype for the
lapal.ch developers.

**Site:** https://lobnagaa.github.io/lapal-patent-coverage/
- `prototype/` — interactive prototype: map per entry with date slider and patent timeline, landscape
  by product, landscape by country for HIV long-acting therapeutics.
- `landscape/patents/` — static pages, one per entry and per country, readable without JavaScript:
  the HTML lapal.ch should serve so search engines and AI tools can read the data.

Patent data: [MedsPaL](https://www.medspal.org) as linked to each LAPaL entry, or, where marked
preliminary, the patent cards on lapal.ch. Snapshot date is shown on every page. Patent information
is provided for information only and is not legal advice.

## For developers

Start with [`docs/DEVELOPER_HANDOVER.md`](docs/DEVELOPER_HANDOVER.md): data sources, status rules,
screen behaviour, and section 5 on search and AI discoverability.

| Path | |
|---|---|
| `src/` | Prototype source (`index.html`, `app.css`, `app.js`; d3 7.9.0, topojson-client 3.1.0) |
| `tools/build_patents.py` | Builds `data/patents_data.json` from lapal.ch, MedsPaL and Google Patents |
| `tools/build_prototype.py` | Bundles `dist/LAPaL_patent_coverage_prototype.html` (self-contained) |
| `tools/build_static.py` | Builds the static, crawlable patent pages |
| `tools/build_site.py` | Builds `site/` (prototype + static pages) for GitHub Pages |
| `data/` | Data snapshot, build report, card status review |
| `site/` | What GitHub Pages serves (`.github/workflows/pages.yml`) |

Rebuild: `build_patents.py` → `build_prototype.py` → `build_site.py`, then push. `build_patents.py`
needs MPP working files that are not in this repository (the LAPaL patent-info workbook and the
confirmed URL list); the other steps run from what is here.

The static pages carry `noindex` until MPP clears the content for search engines
(`build_site.py --public`).
