# LAPaL patent coverage — proposed approach

Draft, updated 26 Oct 2026. Internal MPP use only: not for public hosting.

**Deliverable:** a working prototype, as one self-contained HTML file shared via SharePoint, for the
lapal.ch developers to rebuild on the site. It mirrors the two places the feature will live.

## 1. Entry view — the "Patent info" tab of each LAPaL entry

One product per map, never overlaid.

- World map: each country coloured Granted / Filed / Not in force; no record → grey by income
  level (LMIC grey, high income pale grey), as in the MedsPaL legend.
- Date slider under the map (AccessPaL style), future only. Stops = today, then each expiry date.
  Moving it forward drops expired patents: "still in force on this date, if nothing changes".
- Toggle (MedsPaL "Display jurisdiction"): *at least one patent granted/filed* vs *at least one
  compound patent granted/filed*.
- Click a country → side panel of patent cards (deck slide 8): flag + country, patent number,
  family description, **status tag**, **patent-type tag**, expected expiry date. No product summary.
- Timeline of families grouped by filing year (MedsPaL style); follows the selected country.
- Entries whose data comes from LAPaL cards rather than a MedsPaL JSON show a disclaimer:
  data are preliminary and full coverage is being added soon.

## 2. Global view — Landscape menu, like "Regulatory landscape"

Same layout as `lapal.ch/landscape/regulatory-status`: filter panel on the left (Map / Table toggle,
entry-type checkboxes, entry picker, therapeutic area, route, developer, country, income level,
patent status), map on the right, legend below, statistics panel.

- **By product:** pick one entry → its map, slider and country cards, as in the entry view.
  Only entries for which the view is available are listed.
- **By country:** pick a country → matrix of the HIV long-acting entries that have a MedsPaL JSON
  (rows) against their patent families, each cell showing status, patent type and expiry date;
  ordered by latest expiry. Answers "where are the patents across HIV LA products" without
  overlaying products on one map.

## Data sources

| Source | Entries | Filing date | Country detail | Expiry |
|---|---|---|---|---|
| MedsPaL product JSON + per-patent JSON (`assets.medspal.org/patent/<uuid>.json`) | 45 with a uuid | real | per country, 7 statuses | per country |
| LAPaL card (patent block on the lapal.ch entry page) | 79 "Cards" rows | none: expiry − 20 y, labelled as estimated | parsed from the Status line | one per family |

Status mapping:

- Granted → **Granted**
- Filed, Filed (opposed), Pending → **Filed**
- Withdrawn, Rejected, Rejected – under appeal, Expired, Not in force → **Not in force**

Detailed status kept in tooltips and on the cards. Regional offices (AP/ARIPO, EA/EAPO, OA/OAPI,
EP/EPO, GCC…) are expanded to all member countries, both when a member list is given and when the
office is named alone.

## How MedsPaL data are read (stage 1 findings, 26 Oct)

- MedsPaL stores one record per document per country. The build merges the representative
  patent of each family with every in-force record named by MedsPaL's own report JSON
  (`assets.medspal.org/reports/patent/any|compound/<uuid>.json`), and keeps only records MedsPaL
  has linked to the product (1,219 unlinked family records left out, as on medspal.org).
- Check against medspal.org: 32/46 products identical today; 38/46 identical under MedsPaL's
  rules. The gap comes from two rules, both open decisions for Lobna:
  1. MedsPaL keeps showing "Granted" after the expiry date has passed; we show not in force
     once the expiry date is past (and the slider does the same for future dates).
  2. MedsPaL counts "Rejected – under appeal" as filed (e.g. Egypt); we follow Lobna's rule:
     rejected = not in force.
- The 8 remaining products differ by a few countries (AZ, KG, MW, BA, BG, MK, GM) on regional
  EA / ARIPO / EP patents where a country has several records; MedsPaL seems to keep the weaker one.
- The product JSON's `areas` summary is not used: it disagrees with the records and includes WO.

## Build round-trip

`build_patents.py` reads the follow-up workbook plus the confirmed URL list → fetches the MedsPaL
JSONs and LAPaL entry pages → parses, expands regional offices → validates → writes one dated
snapshot `patents_data.json` and a review report (unparsed status lines, estimated dates).

## Stages (check-in after each)

1. URL matching, confirmed by Lobna → data snapshot + review report
2. Entry view: map + country cards + disclaimer
3. Slider + filing-year timeline + compound toggle
4. Global view: by product and by country
5. Export (PNG / PDF) and packaging as one HTML file
