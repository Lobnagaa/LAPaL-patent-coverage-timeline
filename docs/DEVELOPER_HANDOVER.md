# LAPaL patent coverage — developer handover

Prototype by MPP (Lobna Gaayeb), October 2026, for the lapal.ch developers.

The prototype (`LAPaL_patent_coverage_prototype_<date>.html`) is a single offline HTML file built
with d3 7.9.0. It is a reference for behaviour and data rules, not code to ship: please rebuild it
in the lapal.ch stack (Laravel + Vue, as the current entry pages use).

Two deliverables, one goal: **the interactive prototype** shows how the feature behaves for people;
**the static pages** (`for developers/static pages/`, section 5) show the HTML lapal.ch must send so
search engines and AI tools can read every fact without running JavaScript. MPP wants the published
version picked up as widely as possible, so the static output is a requirement, not an option: build
the interactive view on top of server-rendered text and tables, never instead of them.

## 1. Where the feature lives

| Place | What it shows |
|---|---|
| **Entry page → Patent info tab** (every entry with patent data) | Map of the entry's patent status by country, date slider, compound toggle, country side panel with patent cards, family timeline. |
| **Landscape menu → new "Patent landscape" page** | Same map for one entry at a time, chosen from a filter column laid out like `/landscape/regulatory-status`, with a Map / Table switch. |
| **Landscape → "by country" (HIV)** | For one country: one row per HIV long-acting product with that country's patents; plus a country × product overview grid. Products are never overlaid on one map. |

## 2. Data sources

### 2.1 Entries with MedsPaL data (preferred)
The LAPaL entry page already embeds the MedsPaL product JSON in the Vue `:medspal` prop; its `uuid`
is the product id. Three MedsPaL files are used:

| File | Used for |
|---|---|
| `https://assets.medspal.org/product/<product uuid>.json` | Families (`simple_families`): description, abstract, `categories`, representative patent (`patent.publication_number`, `expiry_date`, `applicants`, `espacenet_url`). |
| `https://assets.medspal.org/reports/patent/any/<product uuid>.json` (and `/compound/`) | What medspal.org's own report map uses. `filters[]` with `status` = a document number lists the **countries of every patent record linked to this product** (expired ones included); `filters` `granted` / `filed` are the country sets on the map; `documents[]` gives, per country, the uuid of each in-force record. The `compound` file drives the compound toggle. |
| `https://assets.medspal.org/patent/<record uuid>.json` | One record = one patent document in one country: `status`, `expiration_date`, `date` (filing), `simple_family_uuid`, `number`. Its `related_patents[]` lists the **other** records of the family (never the record itself). |

**Entry header**: labelled facts — Type of entry in LAPaL, Therapeutic area, Patent data, Patent
families — then "Open on lapal.ch ↗". "Patent data: MedsPaL ↗" links to medspal.org (no separate
medspal link); for card entries "LAPaL patent cards ↗ (preliminary)" links to the lapal.ch page.
The medspal.org link opens filtered on
one product with `https://www.medspal.org/?` + base64(`product=` + URL-encoded MedsPaL product name),
the format medspal.org itself writes when a product is picked (checked 29 Oct 2026). Nine MedsPaL
products linked from LAPaL are not in medspal.org's public product list (e.g. "Cabotegravir", "Lenacapavir 1
(LAI candidate)", "Bictegravir 1 LAPAL", the LAI-candidate records); for those "MedsPaL" is shown without
a link, with the reason on hover (`MEDSPAL_NOT_LISTED` in app.js). On lapal.ch this list
would be better read from MedsPaL.

Note: the `medspal_url` fields point to `www.medspal.org/...json`, which returns 404; the same path on
`assets.medspal.org` works.

**Merge rule** (reproduces medspal.org): collect records from (a) each family's representative
patent JSON (top-level record + `related_patents`) and (b) every in-force record uuid named in the
report's `documents[]` (same). De-duplicate by record uuid. Keep only (number, country) pairs that
appear in the report's document `filters` — records MedsPaL has not linked to the product are left
out, as on medspal.org. Assign each record to a family by `simple_family_uuid`.

**Low- and middle-income countries only (MPP decision, 27 Oct):** the views cover LMICs only (World
Bank low, lower-middle and upper-middle income). Drop every high-income and unclassified country from
the data; on the map they are greyed out ("High income: not covered") and cannot be clicked.

**Family-level statuses (MPP decision, 27 Oct):** for any LMIC where a family has no national record,
use the family-level status from the product JSON `areas[]` summary (`legal_status` g / f / n =
Granted / Filed / Not in force), the same summary the current LAPaL patent map draws. National records
always win where they exist. Family-level statuses carry no national patent number and use the family
expiry date; the prototype labels them "family-level status". This adds 704 LMIC family × country
statuses (282 granted, 60 filed, 362 not in force). Because medspal.org's report map uses national
records only, a few products then differ from medspal.org (DcNP, the SDN platform, the PSI implant).
Ignore `WO` in `areas[]`.
Map MedsPaL `KV` to `XK` (Kosovo). Records under former states (`YU`, `CS`, `SU`) are not mapped.

### 2.2 Entries without MedsPaL data (preliminary)
Patent cards on the entry's Patent info tab (Description, Brief description, Representative patent,
Category, Patent holder, Exclusivity, Expiration date, Status). The **Status** line is free text,
e.g. `Granted: CN, EPO (BE, CH, DE, FR, GB, IE) / Pending: CA, JP, MX, US / Not in force: EAPO`.
The prototype parses it; each line and its reading are in `card_status_review.xlsx` for checking.
These entries show a "preliminary data" banner. One expiry date applies to every country of a family.
The card has no filing date, so the build looks up the representative patent on Google Patents
(`https://patents.google.com/patent/<number>/en`, `<meta name="DC.date" scheme="dateSubmitted">`:
the international filing date for a WO publication, as MedsPaL uses; the application filing date
otherwise). Only where that lookup fails is the filing date estimated (expiry − 20 years) and flagged.
On lapal.ch, the simplest route is to add a filing date field to the patent card. Long term these
entries should move to MedsPaL so the cards no longer need parsing.

Regional offices named on a card **without** a member list are shown for all members (MPP decision):
EP = 39 EPO member states; EA = AM AZ BY KG KZ RU TJ TM; AP = BW GH GM KE LR LS MW MZ NA RW SD SL
ST SZ TZ UG ZM ZW; OA = BF BJ CF CG CI CM GA GN GQ GW KM ML MR NE SN TD TG; GC = AE BH KW OM QA SA.
With a member list in brackets, only those members.

### 2.3 Voluntary licences
Three products have voluntary licences that may allow generic manufacturing and/or sale in some
territories: cabotegravir (ViiV Healthcare, MPP licence), lenacapavir (Gilead Sciences, bilateral) and
alimatravir (MSD, bilateral). The entries they apply to are listed in `licences[].entries` of
`patents_data.json` (CAB: Cabotegravir, CAB-LA; LEN: Lenacapavir, LEN 6-monthly, LEN once-yearly;
alimatravir: Alimatravir MK-8527). Combinations and other formulations (CAB Q4M, LEN pacfosacil,
CAB + LEN, ISL + LEN) are left out until MPP confirms them. `licences[].territory` maps each LMIC in
the territory to its basis (CAB: Direct / Direct with royalties / Indirect). Source: MPP's licence
territory workbook (`HIV_PrEP_licence_territories_v2_3.xlsx`, the sheets the licence dashboard uses).

On screen: a banner on the entry page says a licence is in place; the country panel says whether the
selected country is in the territory; the by-country view lists the licences covering that country.
The wording always says the licence *may* allow manufacturing and/or sale and points to the licence
terms.

### 2.4 HIV product attributes (filters of the by-country view)

`tools/fetch_hiv_attributes.py` writes `data/hiv_attributes.json`: innovator, indication, most advanced
development phase, drug class and route for each HIV entry with MedsPaL data. It reads the dataset that
https://lapal.ch/hiv-dashboard embeds in its page (`:dataset` attribute), matched on the lapal.ch URL
(13 of 21 entries). The 8 entries not on the dashboard (bictegravir, cabotegravir, dapivirine,
islatravir and lenacapavir as compounds, rilpivirine 2-monthly, DcNP, EXPD) are read from their entry
page: Developer(s), Drug class/category (mapped to the dashboard's class names; technologies get
"Technology platform"), Use case(s), Administration route, and the phase: "Marketed" when a linked
trial is marked Marketed or the approval / regulatory text says "approved", else the most advanced
trial phase, else the technology's "Development stage". On lapal.ch the same fields come from the
database. A product row joins its entries: lists are merged and the most advanced phase is kept.
Indication is "Treatment only", "PrEP (prevention) only" or "Both".

Country regions for the overview filter are the World Bank regions used on the LA PrEP licence
territories page (`data/wb_regions.json`, copied from that page's data).

## 3. Status rules

| Record status | Map class |
|---|---|
| Granted, Granted (opposed), Granted (claims amended), Restored, Term extended, Term extensions filed | **Granted** |
| Filed, Filed (opposed), Pending | **Filed** |
| Withdrawn, Rejected, Rejected – under appeal, Expired, Lapsed, Ceased, Abandoned, Revoked, Not in force | **Not in force** |

- A country's status for an entry = the strongest status among its records (Granted > Filed > Not in force). All records stay visible on the country cards.
- **Today** uses each record's status **as recorded**, even when its expiry date has passed, so the map matches medspal.org (MPP decision).
- **Future dates** (slider): a Granted/Filed record whose expected expiry is before the chosen date counts as Not in force. The projection uses expiry dates only.
- "Rejected – under appeal" is Not in force here (MPP decision); medspal.org counts it as filed. With a few regional EA / ARIPO / EP records and the family-level statuses above, these are the known differences from medspal.org (see `build_report.md`).
- A family counts as a **compound** patent if any of its records appears in MedsPaL's compound report (for card entries: the card category is "Compound").

## 4. Screen behaviour (see the prototype)

**Colours** (from the LAPaL/MedsPaL patent map legend): Granted `#E8A33D`, Filed `#4AA3DF`,
Not in force `#2B3480`; no record (LMIC) `#BABCC1`; high income, not covered `#EFEFF1`. Income levels: World Bank
current classification (LMIC = low, lower-middle, upper-middle). Status is never shown by colour
alone: tags carry the word.

**Map**: hover tooltip (country, status, record counts); click opens the country panel; zoom and
pan; countries too small to click get a dot when they have data. Counts under the map for all
countries and for LMICs only.

**Date slider** (AccessPaL style): stops = Today + each distinct future expiry date of Granted/Filed
records; evenly spaced (real-time spacing clusters them); a stop shows the situation the day after
that expiry. Arrows and keyboard ←/→. In the by-country view, stops are 1 January of each year.

**Compound toggle** (MedsPaL wording): "With at least one patent granted/filed" / "With at least one
compound patent granted/filed". Filters map, counts, cards, timeline and slider stops.

**Country panel** (spec slide 8): flag + country, then one card per patent record: patent number,
family description, status tag, patent-type tag(s), expected expiry (dd/mm/yyyy), family WO with
Espacenet link, filing date, holder, regional office if any. After a future date passes a record's
expiry, its tag reads "Expires dd/mm/yyyy" next to "Granted today". No product summary in the panel.

**Families in force on the selected date** (under the map counts): one row per family with at least
one Granted/Filed record on that date — patent type, number of countries granted and filed (or the
status in the selected country), latest expected expiry; plus "No longer in force by this date" for
families in force today but not on that date. Clicking a row selects the family (MPP decision,
29 Oct): the map shows that family alone, the row opens to list its countries by status (each opens
that country's cards), the other rows are dimmed but stay clickable, and the date does not change.
Clicking the row again, or "Show all families", clears it. Only the expiry date, a link
("→ map after this date"), moves the slider. Slider stops come from all families, so selecting a
family never moves the date. The family timeline labels each family with all its patent types and behaves the same way: clicking a
family row selects it (map shows it alone, the row is highlighted and the others dimmed) and opens,
below its bar, its countries by status on the date shown, each name opening that country's cards,
plus "Show all families"; clicking the bar's end circle moves the slider to just after that expiry.
Table and timeline share one selection (`famFocus`).

**Card actions**: "Same family in other countries (n)" expands the family's other countries grouped
by status on the selected date (each country clickable; the family stays open in the new country);
"Show only this family on the map" restricts map, counts, slider and timeline to that family, with a
"Show all families" control.

**Family timeline**: one bar per family, filing → expected expiry, grouped by filing year; colour =
strongest status (in the selected country, or anywhere) on the selected date; today line and selected
date line; clicking a bar end moves the slider there.

**By country (HIV)**: products = HIV entries with MedsPaL data, grouped by MedsPaL product (entries
sharing a product, e.g. a compound page and its formulation page, are one row). Each family bar is labelled
with its representative WO number and first patent type; hovering shows the national patent numbers
in that country with their status and expiry; clicking opens a detail box (family, holder, filing
date, each national patent with status as recorded and on the selected date, regional office) with a
link to the product's patent view in that country, where the family's other countries are listed. Overview grid sorted
by number of products granted/filed; LMICs only.

Users can reorder and hide the product rows, and hide single patent families (MPP decision, 29 Oct).
Controls follow the LAPaL HIV dashboard: a dotted grip and a crossed-out eye beside each product,
faint until the row is hovered or focused. Dragging the grip moves the row (an accent line shows where
it will land; with the grip focused, ↑/↓ also move it). This switches "Order rows by" to "Your own
order", starting from the order on screen (`order=` in the address bar). The eye hides the product. A
faint eye at the end of each patent line, or "Hide this patent family" in its details, hides that family
for that product only (`hidef=productKey|familyId`); the row's status and family count are recomputed
and say "(+n hidden)"; a product whose families are all hidden is listed under the chart. The controls
are left out of the PNG. "Order rows by" offers: status
(default), product name, patent type in force (products ranked by their most central granted/filed
family: Compound, Salt, Polymorphs, Combination, Composition, Dose/Regimen, Use, Process,
Intermediate(s), Device; families within a row grouped by type), expiry date latest first, expiry
date soonest first (families within a row follow the same order). Each row has a ✕ to hide it. Any
change shows an "Edited view" notice above the chart that says what changed, with a "Show …"
button per hidden product or family and "Reset view". Edits are kept in the address bar (`sort=`, `hide=`), are
stated in the PNG subtitle and the CSV header ("Rows ordered by", "Products hidden by user",
"Patent families hidden by user"), and hidden products and families are left out of the chart and its CSV. The country overview grid is not affected.

**Product filters** (side panel, "Filter products"): Innovator, Indication, Most advanced phase,
Drug class, Route of administration; each is a collapsible checkbox list with the number of products
per value and "All" / "n selected" on its header. Within a filter any ticked value matches; a product
must match every filter in use. The filters apply to the chart rows and to the overview table's
columns, show in the "Edited view" notice, the summary sentence and the counts ("n of 19 products"),
the address bar (`inn=`, `ind=`, `ph=`, `cls=`, `rt=`, values separated by `|`), the PNG subtitle and
the CSV headers; both CSVs carry the attribute columns and their source.

**Overview table**: product names in the header link to that product's patent map
(`#view=product&entry=<entry id>`, the first entry of the product). Region and income-group checkboxes
above the table (as on the LA PrEP licence territories page) narrow its rows; they are kept in the
address bar (`reg=`, `inc=`) and stated in its CSV.

**Status filter** (side panel, "Show patents"): three checkboxes, Granted, Filed and Not in force, each
with its status colour swatch (the same colours as the bars, dots, map and overview grid; an unticked
status is greyed). All are ticked by default and at least one stays ticked. Status is judged on the
date selected on the slider. Patent families outside the ticked statuses are dropped before the row
status is computed, so a product row only shows, and is coloured by, the families kept; a product
left with nothing is listed under the chart as "filtered out", not as "no patent record". Unlike row
edits, the filter also applies to the country overview grid (empty cells then read "none granted",
etc.). It shows in the "Edited view" notice (reset by "Reset view"), the header counts and the summary
sentence (only the ticked statuses are counted), the address bar (`st=granted,filed`), the PNG subtitle
and both CSV headers ("Patent statuses shown").

**Exports** (PNG, CSV and Print on every chart: map, family timeline, by-country chart; CSV and Print on the country overview; links in every export: lapal.ch page, Espacenet search per patent number `https://worldwide.espacenet.com/patent/search?q=pn%3D<number>`, family link = MedsPaL's Espacenet link, else Google Patents for card families; printed pages end with a Sources block): PNG (title, date shown, legend, source line with URL, LAPaL and MedsPaL logos top right), CSV (one row per patent record, with a
header block: entry, date shown, scope, snapshot), print stylesheet. Shareable state in the URL hash.

## 5. Search and AI discoverability (before going public)

The prototype is not built to be found: everything is drawn in the browser by JavaScript (map and
charts as SVG), views live in the URL hash (`#view=…`), which search engines treat as one page, and
CSV/PNG files only exist once someone clicks. Most AI crawlers do not run JavaScript, so they see none
of it. Checked on 29 Oct 2026: lapal.ch's `robots.txt` allows every crawler, AI crawlers included, and
points to `sitemap.xml`. Entry pages have a `<title>` and Open Graph tags but no meta description and
no structured data, and the MedsPaL data reach the page only as a JSON attribute (`:medspal`) that Vue
renders in the browser.

**Working reference: `for developers/static pages/`** (built by `tools/build_static.py` from the same
snapshot; preview them with any static web server). lapal.ch should output the same HTML, with the
interactive map added on top for people. What is there:

| Address on lapal.ch | Pages | Content |
|---|---|---|
| `/landscape/patents/` | 1 | Index: summary, links to every country page, every entry by therapeutic area with counts; CSV of all entries. |
| `/<compounds\|formulations\|technology>/<slug>/patents/` | 124 | One per entry: summary sentences, voluntary licence note, table of countries (status, latest expected expiry, patent numbers), table of families (type, holder, filing and expiry dates, Espacenet link), expiry outlook, questions and answers, sources; `patents.csv`. |
| `/landscape/patents/<country-slug>/` | 102 | One per low- or middle-income country with an HIV record: summary, licence note, one row per HIV long-acting product (status, latest expiry, families, licence cover), questions and answers; `patents.csv`. |
| `/sitemap-patents.xml` | | Every page above with `lastmod` = snapshot date; add `Sitemap: https://lapal.ch/sitemap-patents.xml` to lapal.ch's robots.txt (`robots-snippet.txt`). |
| `/llms-patents.txt` | | Guide for AI tools: what the data are, the caveats, and one line per entry and country page. Merge into a site-wide `/llms.txt`. |

Every page has a unique `<title>` and meta description, a canonical URL, Open Graph tags, and JSON-LD
with `Dataset` (creator MPP, `dateModified`, `isBasedOn` MedsPaL and LAPaL, CSV `distribution`),
`BreadcrumbList` and `FAQPage`. No JavaScript is needed to read anything. Entries with no status in any
low- or middle-income country (mostly preliminary card entries) say so plainly instead of "granted in 0".
**All pages carry `<meta name="robots" content="noindex, nofollow">` until MPP decides they should be indexed;
`build_static.py --public` removes it. lapal.ch must not serve the noindex version once cleared.**

Recommended for the lapal.ch rebuild, most important first (all shown in the reference pages):

1. **Server-rendered facts in plain text.** *(Reference: the summary block of each static page; the
   prototype's `#map-summary` is the same sentence, kept live.)* Open each Patent info tab with sentences generated on the
   server, e.g. "As of 27 Oct 2026, lenacapavir has granted patents in 63 low- and middle-income
   countries and filed applications in 7; the latest expected expiry is 17 Aug 2037. A voluntary licence
   (Gilead Sciences) may allow generic manufacturing and/or sale in some territories." Render the Table
   view (country, status, latest expected expiry, patent numbers) as a real HTML `<table>` in the initial
   HTML, not only built by JavaScript. Do the same for the by-country view (one sentence per product).
2. **Real URLs instead of the hash**, e.g. `/compounds/lenacapavir-len/patents` and
   `/landscape/patents/south-africa`, each with a canonical link and listed in `sitemap.xml` with
   `lastmod` set to the data snapshot date. Keep the hash only for view state on top of these pages
   (slider date, selected family, sort, hidden rows).
3. **Downloadable data at stable URLs.** Publish the CSVs (per entry, per country, and the country ×
   product overview) as files with permanent links, linked from the page, so crawlers and researchers
   can reach them without clicking through the interface.
4. **Descriptions and structured data.** A `<meta name="description">` on every page (built from the
   sentence in point 1). On the landscape pages and per-entry patent pages, JSON-LD of type
   `schema.org/Dataset` with `name`, `description`, `creator` (Medicines Patent Pool), `dateModified`
   (snapshot date), `isBasedOn` (MedsPaL, LAPaL), `license` and `distribution` (the CSV URLs).
5. **Caveats next to the facts.** AI tools quote single sentences out of context, so the snapshot date,
   the source and the qualifiers must sit in the same sentence or line as the number: "projected from
   expected expiry dates", "family-level status (no national record)", "preliminary data from LAPaL
   patent cards", "licence may allow". This matters most for the preliminary card entries and the
   licence notes.
6. **Text alternatives for the map and charts.** *(In the prototype: `#map-summary`, `#tl-summary` and
   `#cv-summary`, live sentences above the map, the family timeline and the by-country chart, linked
   with `aria-describedby`; they follow the date slider, compound scope, selected family and the
   user's edits, and use the same wording as the static pages.)* A caption under each (`<figcaption>` or
   `aria-describedby`) stating what it shows and the key counts, for crawlers and screen readers alike.
7. **Optional: `llms.txt`** at the site root: a short plain-text guide for AI tools to the main LAPaL
   sections, the landscape pages and the data files. An emerging convention, not yet widely read, but
   cheap to add.

The noindex tag stays until MPP decides the pages should be indexed; apply the above on lapal.ch.

## 6. Files in this package

| File | |
|---|---|
| `LAPaL_patent_coverage_prototype_<date>.html` | The prototype (offline, self-contained). |
| `patents_data.json` | The data snapshot the prototype was built from (all entries, families, per-country records, rules). |
| `build_report.md` | Build checks: exclusions, merges, comparison with medspal.org, card parsing issues. |
| `card_status_review.xlsx` | Every LAPaL card status line and how it was read. |

The build scripts (`tools/build_patents.py`, `tools/build_prototype.py`) are kept by MPP and can be
shared on request.
