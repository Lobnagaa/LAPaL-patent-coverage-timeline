"""Static, crawlable patent pages for lapal.ch, built from data/patents_data.json.

The interactive prototype draws everything with JavaScript, which most AI crawlers do not run.
These pages carry the same facts as plain HTML (summary sentences, tables, FAQ) plus the tags
search engines and AI tools read (title, description, canonical, Open Graph, schema.org JSON-LD),
at lapal.ch-style addresses:

    compounds/<slug>/patents/            one page per LAPaL entry
    landscape/patents/<country-slug>/    one page per LMIC, HIV long-acting products with MedsPaL data

Each page folder also gets patents.csv. Pages are "noindex" until MPP clears the content for
publication; --public removes it (Lobna, 29 Oct 2026: the content will go on lapal.ch).

Run:  python3 tools/build_static.py [--sample] [--public]
      --sample  builds Lenacapavir (LEN) and South Africa only, for review
"""
import argparse, csv, datetime as dt, html, io, json, os, re, shutil
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'static')
BASE = '/'  # site root of the internal links: '/' on lapal.ch, '/<repo>/' on a GitHub Pages project site
SITE = 'https://lapal.ch'
RANK = {'granted': 3, 'filed': 2, 'not_in_force': 1}
LABEL = {'granted': 'Granted', 'filed': 'Filed', 'not_in_force': 'Not in force'}
SAMPLE = {'entry': 'compounds/lenacapavir-len', 'country': 'ZA'}
# medspal.org products not in its public product list (see app.js MEDSPAL_NOT_LISTED).
MEDSPAL_NOT_LISTED = {'a1aee039-f2af-4f10-bd0f-9d6e3d210735', '901f036a-7c32-4483-b28b-a4b63bf766af',
                      '83eba7dd-1953-4d73-96b0-83a212543c8f', '17222fc8-b02f-4d13-9d64-abaf3fe1bf93',
                      '532416f9-42ee-47a6-893a-937274abaa41', '5e0b6eb4-b061-4094-aea5-d00507846656',
                      '306dab01-d14f-4853-beb2-954c9bd4d44b', 'abb61b03-66ac-4787-8452-7710e1650b62',
                      '9ec9a281-f69e-4e96-b8b5-d64a19dbd760'}

esc = lambda s: html.escape(str(s if s is not None else ''), quote=True)


def long_date(iso):
    if not iso:
        return ''
    d = dt.date.fromisoformat(iso[:10])
    return '%d %s %d' % (d.day, d.strftime('%B'), d.year)


def slug(s):
    s = re.sub(r"[’']", '', s.lower())
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def plural(n, one, many=None):
    return '%d %s' % (n, one if n == 1 else (many or one + 's'))


def have(n):
    return 'has' if n == 1 else 'have'


def listing(items):
    items = list(items)
    return items[0] if len(items) == 1 else ', '.join(items[:-1]) + ' and ' + items[-1] if items else ''


def medspal_url(e):
    import base64, urllib.parse
    if not e.get('medspal_product_name') or e.get('medspal_uuid') in MEDSPAL_NOT_LISTED:
        return None
    q = 'product=' + urllib.parse.quote(e['medspal_product_name'], safe='')
    return 'https://www.medspal.org/?' + base64.b64encode(q.encode()).decode()


# --- facts ------------------------------------------------------------------------------------

def country_status(entry):
    """iso2 -> {status, latest (expiry of granted/filed), numbers, families} today, as recorded."""
    out = {}
    for f in entry['families']:
        for c in f['countries']:
            slot = out.setdefault(c['iso2'], {'status': None, 'latest': None, 'numbers': [], 'families': set(), 'summary_only': True})
            for r in c['records']:
                st = r.get('status')
                if st and RANK[st] > RANK.get(slot['status'], 0):
                    slot['status'] = st
                exp = r.get('expiry') or (f['expiry'] if st in ('granted', 'filed') else None)
                if st in ('granted', 'filed') and exp and (not slot['latest'] or exp > slot['latest']):
                    slot['latest'] = exp
                if r.get('number'):
                    slot['numbers'].append(r['number'])
                if r.get('source') != 'family summary':
                    slot['summary_only'] = False
                slot['families'].add(f['representative_patent'])
    return out


def family_counts(f):
    best = {}
    for c in f['countries']:
        for r in c['records']:
            st = r.get('status')
            if st and RANK[st] > RANK.get(best.get(c['iso2']), 0):
                best[c['iso2']] = st
    n = Counter(best.values())
    return n['granted'], n['filed'], n['not_in_force']


def expiry_outlook(entry, cs):
    """Countries still with a granted/filed patent after each year in which one expires."""
    years = sorted({int(v['latest'][:4]) for v in cs.values() if v['latest'] and v['latest'] >= TODAY})
    rows = []
    for y in years:
        still = sum(1 for v in cs.values() if v['latest'] and v['latest'] > '%d-12-31' % y)
        rows.append((y, still))
    return rows


def licences_for(data, entry_id):
    return [l for l in data.get('licences', []) if entry_id in l['entries']]


# --- page shell -------------------------------------------------------------------------------

CSS = """
:root { --ink:#212529; --ink-2:#4a5164; --muted:#6b7183; --line:#e3e5ea; --accent:#93266B; --navy:#1F2A6B;
  --granted:#E8A33D; --filed:#4AA3DF; --nif:#2B3480; --warn-bg:#FFF6E5; --warn-line:#E8A33D; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PT Sans", Roboto, Helvetica, Arial, sans-serif;
  color: var(--ink); background: #fff; line-height: 1.5; font-size: 15px; }
header.site { border-bottom: 1px solid var(--line); padding: 12px 20px; display: flex; gap: 12px; align-items: baseline; }
header.site a { color: var(--accent); font-weight: 800; font-size: 22px; text-decoration: none; }
header.site span { color: var(--navy); font-weight: 600; }
main { max-width: 1040px; margin: 0 auto; padding: 16px 20px 40px; }
nav.crumbs { font-size: 13px; color: var(--muted); }
nav.crumbs a { color: var(--muted); }
h1 { color: var(--navy); font-size: 26px; margin: 8px 0 4px; }
h2 { color: var(--navy); font-size: 19px; margin: 28px 0 8px; }
.meta { color: var(--ink-2); font-size: 14px; margin: 0 0 12px; }
.summary { font-size: 16px; background: #f7f8fb; border-left: 4px solid var(--navy); padding: 12px 16px; margin: 12px 0; }
.summary p { margin: 0 0 6px; }
.note { background: var(--warn-bg); border-left: 4px solid var(--warn-line); padding: 10px 14px; margin: 12px 0; font-size: 14px; }
.licence { background: #F6EEF3; border-left: 4px solid var(--accent); padding: 10px 14px; margin: 12px 0; font-size: 14px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; margin: 6px 0 4px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--ink-2); font-weight: 600; background: #fafbfc; }
td.num, th.num { text-align: right; white-space: nowrap; }
.st { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.st i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.st-granted i { background: var(--granted); } .st-filed i { background: var(--filed); } .st-not_in_force i { background: var(--nif); }
.small { font-size: 13px; color: var(--muted); }
a { color: #1E5A8A; }
dl.faq dt { font-weight: 600; margin-top: 12px; } dl.faq dd { margin: 4px 0 0; }
.sources { font-size: 13px; color: var(--ink-2); border-top: 1px solid var(--line); margin-top: 28px; padding-top: 10px; }
.table-wrap { overflow-x: auto; }
"""


def page(path, title, description, body, jsonld, public):
    canonical = SITE + '/' + path
    robots = '' if public else '\n  <meta name="robots" content="noindex, nofollow">  <!-- internal until cleared: build with --public -->'
    head = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">{robots}
  <link rel="canonical" href="{esc(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="LAPaL">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{esc(canonical)}">
  <link rel="stylesheet" href="/assets/patents.css">
  <script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False, indent=1)}</script>
</head>
<body>
<header class="site"><a href="{SITE}/">LAPaL</a><span>Long-Acting Therapeutics Patents and Licences Database</span></header>
<main>
{body}
</main>
</body>
</html>
"""
    if BASE != '/':  # internal links and the stylesheet live under the project path (canonical stays lapal.ch)
        head = head.replace('href="/', 'href="' + BASE)
    dest = os.path.join(OUT, path, 'index.html')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w', encoding='utf-8').write(head)
    return dest


def write_csv(path, rows):
    dest = os.path.join(OUT, path, 'patents.csv')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'w', encoding='utf-8-sig', newline='') as fh:
        csv.writer(fh).writerows(rows)


def status_cell(st):
    return f'<span class="st st-{st}"><i aria-hidden="true"></i>{LABEL[st]}</span>' if st else '—'


def dataset_ld(name, description, url, csv_url, keywords, spatial=None):
    d = {'@type': 'Dataset', 'name': name, 'description': description, 'url': url,
         'creator': {'@type': 'Organization', 'name': 'Medicines Patent Pool', 'url': 'https://medicinespatentpool.org'},
         'publisher': {'@type': 'Organization', 'name': 'LAPaL — Long-Acting Therapeutics Patents and Licences Database', 'url': SITE},
         'dateModified': SNAPSHOT, 'temporalCoverage': SNAPSHOT + '/..',
         'isBasedOn': ['https://www.medspal.org', SITE], 'keywords': keywords,
         'isAccessibleForFree': True,
         'distribution': {'@type': 'DataDownload', 'encodingFormat': 'text/csv', 'contentUrl': csv_url}}
    if spatial:
        d['spatialCoverage'] = {'@type': 'Place', 'name': spatial}
    return d


def faq_ld(qas):
    return {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q,
            'acceptedAnswer': {'@type': 'Answer', 'text': re.sub('<[^>]+>', '', a)}} for q, a in qas]}


def crumbs_ld(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


SOURCES = ('<div class="sources"><p><b>Sources.</b> Patent status: <a href="https://www.medspal.org">MedsPaL</a>, the Medicines '
           'Patents and Licences Database, as linked to each LAPaL entry; for entries marked preliminary, the patent cards on '
           'the LAPaL entry page. Country income levels: World Bank (current classification). Voluntary licence territories: '
           'Medicines Patent Pool. Data snapshot: {snap}.</p><p>Patent information is provided for information only and is not '
           'legal advice. Status "as recorded" may lag behind national registers; dates after today are projections from '
           'expected expiry dates and assume no other change.</p></div>')


# --- entry page -------------------------------------------------------------------------------

def entry_page(data, e, public, country_pages):
    C = data['countries']
    path = e['id'] + '/patents/'
    url = SITE + '/' + path
    cs = country_status(e)
    n = Counter(v['status'] for v in cs.values() if v['status'])
    live = {k: v for k, v in cs.items() if v['status'] in ('granted', 'filed')}
    latest = max((v['latest'] for v in live.values() if v['latest']), default=None)
    latest_fam = next((f['representative_patent'] for f in e['families']
                       if any(r.get('expiry') == latest or (not r.get('expiry') and f['expiry'] == latest)
                              for c in f['countries'] for r in c['records'] if r.get('status') in ('granted', 'filed'))), None)
    types = Counter(t for f in e['families'] for t in (f['categories'] or ['type not given']))
    src = 'MedsPaL' if e['source'] == 'medspal' else 'the patent cards on its LAPaL page (preliminary data)'
    name = e['name']
    lics = licences_for(data, e['id'])

    has_lmic = any(v['status'] for v in cs.values())
    fam_latest = max((f['expiry'] for f in e['families'] if f.get('expiry')), default=None)
    verb = 'records' if e['source'] == 'medspal' else 'record'
    if has_lmic and not (n['granted'] or n['filed']):
        s1 = (f'As of {long_date(SNAPSHOT)}, {src} {verb} <b>no granted or filed patent for {esc(name)} in any low- or middle-income country</b>; '
              f'in {plural(n["not_in_force"], "country", "countries")}, its patents are no longer in force.')
        s2 = ''
    elif has_lmic:
        s1 = (f'As of {long_date(SNAPSHOT)}, {src} {verb} patents for <b>{esc(name)}</b> as <b>granted in {plural(n["granted"], "low- or middle-income country", "low- and middle-income countries")}</b>'
              + (f' and <b>filed (pending) in {n["filed"]}</b>' if n['filed'] else '')
              + (f'; in {n["not_in_force"]} more, the patents are no longer in force.' if n['not_in_force'] else '.'))
        s2 = (f'The latest expected expiry of a granted or filed patent is <b>{long_date(latest)}</b>'
              f'{f" (patent family {esc(latest_fam)})" if latest_fam else ""}.') if latest else 'No granted or filed patent with an expected expiry date is recorded.'
    else:
        # Thin data (mostly preliminary card entries whose countries are all high-income, or none given).
        s1 = (f'As of {long_date(SNAPSHOT)}, {src} {verb} <b>no patent status for {esc(name)} in any low- or middle-income country</b>.')
        s2 = (f'The latest expected expiry among its patent families is <b>{long_date(fam_latest)}</b>.' if fam_latest
              else 'No expected expiry date is given for its patent families.')
    s3 = (f'{plural(len(e["families"]), "patent family", "patent families")} {"is" if len(e["families"]) == 1 else "are"} linked to this entry: '
          + 'by patent type, ' + listing(f'{k.lower()} ({v})' for k, v in types.most_common())
          + ('. A family can cover several types.' if sum(types.values()) > len(e['families']) else '.'))
    lic_html = ''.join(
        f'<div class="licence"><b>Voluntary licence.</b> The {esc(l["label"].lower())} {esc(l["type"])} from {esc(l["licensor"])} may allow '
        f'generic manufacturing and/or sale in some territories ({len(l["territory"])} low- and middle-income countries in its territory), '
        f'whatever the patent status shown here. Check the licence terms for what is permitted where.</div>' for l in lics)
    prelim = ('<div class="note"><b>Preliminary data.</b> Countries are read from the patent cards on the LAPaL entry page and one '
              'expiry date applies to every country of a family. Full country-level coverage from MedsPaL is being added.</div>'
              if e['preliminary'] else '')

    # Tables
    rows = sorted(cs.items(), key=lambda kv: (-RANK.get(kv[1]['status'], 0), C.get(kv[0], {}).get('name', kv[0])))
    def cname_cell(iso):
        nm = esc(C.get(iso, {}).get('name', iso))
        return f'<a href="/landscape/patents/{slug(C[iso]["name"])}/">{nm}</a>' if iso in country_pages else nm
    ctab = ''.join(
        f'<tr><td>{cname_cell(iso)}</td><td>{esc(C.get(iso, {}).get("income", ""))}</td><td>{status_cell(v["status"])}'
        f'{" <span class=small>(family-level)</span>" if v["summary_only"] else ""}</td>'
        f'<td class="num">{long_date(v["latest"]) if v["status"] in ("granted", "filed") else "—"}</td>'
        f'<td class="small">{esc(", ".join(sorted(set(v["numbers"]))[:6]) + (" …" if len(set(v["numbers"])) > 6 else ""))}</td></tr>'
        for iso, v in rows if v['status'])
    fams = sorted(e['families'], key=lambda f: f.get('filing_date') or '9999')
    ftab = ''
    for f in fams:
        g, fi, nf = family_counts(f)
        link = f.get('espacenet_url') or f.get('filing_source')
        wo = f'<a href="{esc(link)}" rel="nofollow">{esc(f["representative_patent"])}</a>' if link else esc(f['representative_patent'])
        ftab += (f'<tr><td>{wo}</td><td>{esc(f["description"])}</td><td>{esc(", ".join(f["categories"]))}</td>'
                 f'<td>{esc("; ".join(f.get("holders") or []))}</td><td class="num">{long_date(f.get("filing_date"))}'
                 f'{" (est.)" if f.get("filing_estimated") else ""}</td><td class="num">{long_date(f.get("expiry"))}</td>'
                 f'<td class="num">{g}</td><td class="num">{fi}</td></tr>')
    outlook = expiry_outlook(e, cs)
    otab = ''.join(f'<tr><td>After {y}</td><td class="num">{k}</td></tr>' for y, k in outlook)

    lmic_total = sum(1 for c in C.values() if c['lmic'])
    no_rec = lmic_total - len([1 for v in cs.values() if v['status']])
    granted_names = [C[i]['name'] for i, v in rows if v['status'] == 'granted']
    qas = [
        (f'In which countries is {name} patented?',
         f'As of {long_date(SNAPSHOT)}, LAPaL records no patent status for {name} in any low- or middle-income country.' if not has_lmic else
         f'As of {long_date(SNAPSHOT)}, patents for {name} are granted in {n["granted"]} low- and middle-income countries'
         + ((f' ({", ".join(granted_names[:12])} and {len(granted_names) - 12} others)' if len(granted_names) > 12
             else f' ({listing(granted_names)})') if granted_names else '')
         + f' and filed in {n["filed"]}, according to {"MedsPaL" if e["source"] == "medspal" else "LAPaL patent cards (preliminary)"}. '
           f'No patent is recorded in {no_rec} of the {lmic_total} low- and middle-income countries.'),
        (f'When do {name} patents expire?',
         (f'The latest expected expiry of a granted or filed patent for {name} is {long_date(latest)}. ' if latest else '')
         + ('Expected expiry by family: ' + '; '.join(f'{f["representative_patent"]} ({", ".join(f["categories"]).lower() or "type not given"}): {long_date(f.get("expiry"))}' for f in fams if f.get('expiry')) + '. ')
         + 'Expiry dates can change, for example with term extensions or litigation.'),
    ]
    if lics:
        qas.append((f'Is there a voluntary licence for {name}?',
                    ' '.join(f'Yes: the {l["label"].lower()} {l["type"]} from {l["licensor"]} may allow generic manufacturing and/or sale '
                             f'in some territories ({len(l["territory"])} low- and middle-income countries in its territory). Check the licence terms.' for l in lics)))
    faq = ''.join(f'<dt>{esc(q)}</dt><dd>{a}</dd>' for q, a in qas)

    desc = re.sub('<[^>]+>', '', f'{name}: patents granted in {n["granted"]} and filed in {n["filed"]} low- and middle-income countries'
                  + (f'; latest expected expiry {long_date(latest)}' if latest else '') + f' ({"MedsPaL" if e["source"] == "medspal" else "preliminary"} data, {long_date(SNAPSHOT)}).')
    title = f'{name} patents: status by country and expiry dates | LAPaL'
    ms = medspal_url(e)
    body = f"""<nav class="crumbs" aria-label="Breadcrumb"><a href="{SITE}/">LAPaL</a> › <a href="{esc(e['url'])}">{esc(name)}</a> › Patents</nav>
<h1>{esc(name)}: patent status by country</h1>
<p class="meta">{esc(e['type'])} · {esc(', '.join(e['therapeutic_areas']))} · Data snapshot {long_date(SNAPSHOT)} ·
<a href="{esc(e['url'])}">Entry on LAPaL</a>{f' · <a href="{esc(ms)}">Product on MedsPaL</a>' if ms else ''} · <a href="patents.csv">Download CSV</a></p>
<section class="summary" aria-label="Summary"><p>{s1}</p>{f"<p>{s2}</p>" if s2 else ""}<p>{s3}</p></section>
{prelim}{lic_html}
{'' if not has_lmic else f'''<h2>Patent status by country</h2>
<p class="small">Low- and middle-income countries with a patent record, strongest status first. Status as recorded today; "family-level" means
MedsPaL has no national record, only the family summary.</p>
<div class="table-wrap"><table><caption class="small" style="text-align:left">{esc(name)}: patent status in {len([1 for v in cs.values() if v['status']])} low- and middle-income countries, {long_date(SNAPSHOT)}</caption>
<thead><tr><th>Country</th><th>Income level</th><th>Status</th><th class="num">Latest expected expiry</th><th>Patent numbers</th></tr></thead>
<tbody>{ctab}</tbody></table></div>'''}
<h2>Patent families</h2>
<div class="table-wrap"><table><thead><tr><th>Family</th><th>Description</th><th>Patent type</th><th>Holder</th><th class="num">Filed</th>
<th class="num">Expected expiry</th><th class="num">Granted in</th><th class="num">Filed in</th></tr></thead><tbody>{ftab}</tbody></table></div>
{f'''<h2>Expiry outlook</h2>
<p class="small">Projection from expected expiry dates only: number of low- and middle-income countries still with a granted or filed patent at the end of each year.</p>
<table style="max-width:420px"><thead><tr><th>Date</th><th class="num">Countries with a patent in force</th></tr></thead><tbody>{otab}</tbody></table>''' if outlook else ''}
<h2>Questions and answers</h2>
<dl class="faq">{faq}</dl>
<p class="small">Explore the interactive map and timeline on the <a href="{esc(e['url'])}">Patent info tab of the LAPaL entry</a>.</p>
{SOURCES.format(snap=long_date(SNAPSHOT))}"""
    ld = {'@context': 'https://schema.org', '@graph': [
        dataset_ld(f'{name}: patent status by country', desc, url, url + 'patents.csv',
                   [name, 'patent', 'patent status', 'patent expiry', 'long-acting', 'low- and middle-income countries'] + e['therapeutic_areas']),
        crumbs_ld([('LAPaL', SITE + '/'), (name, e['url']), ('Patents', url)]), faq_ld(qas)]}
    page(path, title, desc, body, ld, public)

    csvrows = [['Entry', name], ['LAPaL page', e['url']], ['Data snapshot', SNAPSHOT], ['Source', 'MedsPaL' if e['source'] == 'medspal' else 'LAPaL patent cards (preliminary)'], [],
               ['Country', 'ISO2', 'Income level', 'Country status (as recorded)', 'Patent family', 'Patent type', 'Patent number', 'Record status',
                'Expected expiry', 'Family-level status (no national record)']]
    for iso, v in rows:
        for f in e['families']:
            for c in f['countries']:
                if c['iso2'] != iso:
                    continue
                for r in c['records']:
                    csvrows.append([C.get(iso, {}).get('name', iso), iso, C.get(iso, {}).get('income', ''), LABEL.get(v['status'], ''),
                                    f['representative_patent'], '; '.join(f['categories']), r.get('number') or '', r.get('status_raw') or '',
                                    r.get('expiry') or (f['expiry'] if r.get('status') in ('granted', 'filed') else '') or '',
                                    'yes' if r.get('source') == 'family summary' else 'no'])
    write_csv(path, csvrows)
    return path


# --- country page -----------------------------------------------------------------------------

def hiv_products(data):
    groups = defaultdict(list)
    for e in data['entries']:
        if e['hiv'] and e['source'] == 'medspal':
            groups[e['medspal_uuid']].append(e)
    return sorted(groups.values(), key=lambda es: es[0]['name'].lower())


def country_page(data, iso, public, entry_pages):
    C = data['countries']
    cname = C[iso]['name']
    path = f'landscape/patents/{slug(cname)}/'
    url = SITE + '/' + path
    prods = []
    for es in hiv_products(data):
        e = es[0]
        st, latest, fams = None, None, []
        for f in e['families']:
            c = next((x for x in f['countries'] if x['iso2'] == iso), None)
            if not c:
                continue
            fb, fexp = None, None
            for r in c['records']:
                s = r.get('status')
                if s and RANK[s] > RANK.get(fb, 0):
                    fb = s
                exp = r.get('expiry') or (f['expiry'] if s in ('granted', 'filed') else None)
                if s in ('granted', 'filed') and exp and (not fexp or exp > fexp):
                    fexp = exp
            fams.append((f, fb, fexp))
            if fb and RANK[fb] > RANK.get(st, 0):
                st = fb
            if fexp and (not latest or fexp > latest):
                latest = fexp
        lics = [l for l in data.get('licences', []) if iso in l['territory'] and any(x['id'] in l['entries'] for x in es)]
        prods.append({'es': es, 'e': e, 'status': st, 'latest': latest, 'fams': fams, 'lics': lics})
    n = Counter(p['status'] for p in prods)
    none = [p for p in prods if not p['status']]
    lic_all = [l for l in data.get('licences', []) if iso in l['territory']]
    granted_names = [p['e']['name'] for p in prods if p['status'] == 'granted']

    s1 = (f'As of {long_date(SNAPSHOT)}, of the {len(prods)} HIV long-acting products on LAPaL with MedsPaL patent data, '
          f'<b>{n["granted"]} {have(n["granted"])} at least one patent granted in {esc(cname)}</b>, {n["filed"]} {have(n["filed"])} patents filed (pending) only, '
          f'{n["not_in_force"]} {have(n["not_in_force"])} patents that are no longer in force, and {len(none)} {have(len(none))} no patent recorded there.')
    live = [p for p in prods if p['status'] in ('granted', 'filed') and p['latest']]
    s2 = ('The latest expected expiry among granted or filed patents is ' +
          f'{long_date(max(p["latest"] for p in live))} ({esc(max(live, key=lambda p: p["latest"])["e"]["name"])}).') if live else ''
    lic_html = (f'<div class="licence"><b>Voluntary licences.</b> {esc(cname)} is in the territory of the '
                + listing(f'{esc(l["label"].lower())} {esc(l["type"])} ({esc(l["licensor"])})' for l in lic_all)
                + '. These licences may allow generic manufacturing and/or sale in some territories, whatever the patent status shown; check the licence terms.</div>') if lic_all else ''

    order = sorted(prods, key=lambda p: (-RANK.get(p['status'], 0), p['e']['name'].lower()))
    ptab = ''
    for p in order:
        e = p['e']
        link = f'/{e["id"]}/patents/' if e['id'] in entry_pages else e['url']
        fam_txt = '; '.join(f'{f["representative_patent"]} ({", ".join(f["categories"]).lower() or "type not given"}, {LABEL.get(fb, "no status").lower()})' for f, fb, _ in p['fams'])
        ptab += (f'<tr><td><a href="{esc(link)}">{esc(e["name"])}</a>' + (f'<div class="small">also: {esc(", ".join(x["name"] for x in p["es"][1:]))}</div>' if len(p['es']) > 1 else '')
                 + f'</td><td>{status_cell(p["status"]) if p["status"] else "No patent recorded"}</td>'
                 f'<td class="num">{long_date(p["latest"]) or "—"}</td><td class="small">{esc(fam_txt) or "—"}</td>'
                 f'<td>{"Yes: " + esc(", ".join(l["label"] for l in p["lics"])) if p["lics"] else "—"}</td></tr>')
    qas = [
        (f'Which HIV long-acting medicines are patented in {cname}?',
         f'As of {long_date(SNAPSHOT)}, MedsPaL records at least one granted patent in {cname} for {n["granted"]} of the {len(prods)} HIV long-acting '
         f'products on LAPaL with patent data' + (f': {listing(granted_names)}.' if granted_names else '.')),
    ]
    if lic_all:
        qas.append((f'Do voluntary licences cover {cname}?',
                    f'Yes. {cname} is in the territory of the ' + listing(f'{l["label"].lower()} {l["type"]} from {l["licensor"]}' for l in lic_all)
                    + ', which may allow generic manufacturing and/or sale. Check the licence terms.'))
    faq = ''.join(f'<dt>{esc(q)}</dt><dd>{a}</dd>' for q, a in qas)
    desc = (f'Patent status in {cname} of {len(prods)} HIV long-acting products: {n["granted"]} with a granted patent, '
            f'{n["filed"]} filed only, {n["not_in_force"]} no longer in force, {len(none)} with no patent recorded (MedsPaL data, {long_date(SNAPSHOT)}).')
    title = f'HIV long-acting medicines: patents in {cname} | LAPaL'
    body = f"""<nav class="crumbs" aria-label="Breadcrumb"><a href="{SITE}/">LAPaL</a> › <a href="/landscape/patents/">Patent landscape</a> › {esc(cname)}</nav>
<h1>Patents in {esc(cname)} for HIV long-acting therapeutics</h1>
<p class="meta">{esc(C[iso]['income'])} income · Data snapshot {long_date(SNAPSHOT)} · <a href="patents.csv">Download CSV</a></p>
<section class="summary" aria-label="Summary"><p>{s1}</p>{f"<p>{s2}</p>" if s2 else ""}</section>
{lic_html}
<h2>Patent status of each product in {esc(cname)}</h2>
<div class="table-wrap"><table><caption class="small" style="text-align:left">HIV long-acting products on LAPaL: patent status in {esc(cname)}, {long_date(SNAPSHOT)}</caption>
<thead><tr><th>Product</th><th>Status in {esc(cname)}</th><th class="num">Latest expected expiry</th><th>Patent families recorded (type, status)</th><th>Voluntary licence covers {esc(cname)}</th></tr></thead>
<tbody>{ptab}</tbody></table></div>
<h2>Questions and answers</h2>
<dl class="faq">{faq}</dl>
{SOURCES.format(snap=long_date(SNAPSHOT))}"""
    ld = {'@context': 'https://schema.org', '@graph': [
        dataset_ld(f'Patent status in {cname} of HIV long-acting medicines', desc, url, url + 'patents.csv',
                   ['HIV', 'long-acting', 'patent', 'patent status', cname, 'PrEP', 'voluntary licence'], spatial=cname),
        crumbs_ld([('LAPaL', SITE + '/'), ('Patent landscape', SITE + '/landscape/patents/'), (cname, url)]), faq_ld(qas)]}
    page(path, title, desc, body, ld, public)

    csvrows = [['Country', cname], ['Data snapshot', SNAPSHOT], ['Source', 'MedsPaL, as linked to LAPaL entries'], [],
               ['Product', 'LAPaL page', 'Product status in country', 'Patent family', 'Patent type', 'Family status in country', 'Expected expiry', 'Voluntary licence covers country']]
    for p in order:
        if not p['fams']:
            csvrows.append([p['e']['name'], p['e']['url'], 'No patent recorded', '', '', '', '', ', '.join(l['label'] for l in p['lics'])])
        for f, fb, fexp in p['fams']:
            csvrows.append([p['e']['name'], p['e']['url'], LABEL.get(p['status'], ''), f['representative_patent'], '; '.join(f['categories']),
                            LABEL.get(fb, ''), fexp or '', ', '.join(l['label'] for l in p['lics'])])
    write_csv(path, csvrows)
    return path


# --- landscape index, sitemap, llms.txt -------------------------------------------------------

def entry_facts(e):
    cs = country_status(e)
    n = Counter(v['status'] for v in cs.values() if v['status'])
    latest = max((v['latest'] for v in cs.values() if v['status'] in ('granted', 'filed') and v['latest']), default=None)
    return n, latest


def landscape_index(data, entries, isos, public):
    C = data['countries']
    path = 'landscape/patents/'
    url = SITE + '/' + path
    by_ta = defaultdict(list)
    for e in entries:
        for t in e['therapeutic_areas'] or ['Other']:
            by_ta[t].append(e)
    med = [e for e in entries if e['source'] == 'medspal']
    rows_csv = [['Data snapshot', SNAPSHOT], [], ['Entry', 'Type', 'Therapeutic areas', 'Patent data', 'Granted in (LMICs)', 'Filed in (LMICs)',
                'Not in force in (LMICs)', 'Latest expected expiry', 'Patent page', 'LAPaL page']]
    sections = ''
    for ta in sorted(by_ta, key=str.lower):
        trs = ''
        for e in sorted(by_ta[ta], key=lambda x: x['name'].lower()):
            n, latest = entry_facts(e)
            trs += (f'<tr><td><a href="/{e["id"]}/patents/">{esc(e["name"])}</a></td><td>{esc(e["type"])}</td>'
                    f'<td class="num">{n["granted"]}</td><td class="num">{n["filed"]}</td><td class="num">{long_date(latest) or "—"}</td>'
                    f'<td>{"MedsPaL" if e["source"] == "medspal" else "LAPaL cards (preliminary)"}</td></tr>')
        sections += (f'<h3>{esc(ta)} ({len(by_ta[ta])})</h3><div class="table-wrap"><table><thead><tr><th>Entry</th><th>Type</th>'
                     f'<th class="num">Granted in</th><th class="num">Filed in</th><th class="num">Latest expected expiry</th><th>Patent data</th></tr></thead><tbody>{trs}</tbody></table></div>')
    for e in sorted(entries, key=lambda x: x['name'].lower()):
        n, latest = entry_facts(e)
        rows_csv.append([e['name'], e['type'], '; '.join(e['therapeutic_areas']), 'MedsPaL' if e['source'] == 'medspal' else 'LAPaL cards (preliminary)',
                         n['granted'], n['filed'], n['not_in_force'], latest or '', f'{SITE}/{e["id"]}/patents/', e['url']])
    clinks = ', '.join(f'<a href="/landscape/patents/{slug(C[i]["name"])}/">{esc(C[i]["name"])}</a>' for i in sorted(isos, key=lambda i: C[i]['name']))
    s1 = (f'LAPaL tracks the patent status of {len(entries)} long-acting medicines, formulations and technologies in low- and middle-income countries '
          f'({len(med)} from MedsPaL, {len(entries) - len(med)} from preliminary LAPaL patent cards), across {len(by_ta)} therapeutic areas. '
          f'Data snapshot: {long_date(SNAPSHOT)}.')
    desc = (f'Patent status of {len(entries)} long-acting therapeutics in low- and middle-income countries: granted, filed and expired patents, '
            f'expiry dates and voluntary licences, by product and by country (LAPaL, {long_date(SNAPSHOT)}).')
    title = 'Patent landscape of long-acting therapeutics in low- and middle-income countries | LAPaL'
    body = f"""<nav class="crumbs" aria-label="Breadcrumb"><a href="{SITE}/">LAPaL</a> › Patent landscape</nav>
<h1>Patent landscape of long-acting therapeutics</h1>
<p class="meta">Low- and middle-income countries · Data snapshot {long_date(SNAPSHOT)} · <a href="patents.csv">Download CSV (all entries)</a></p>
<section class="summary" aria-label="Summary"><p>{s1}</p>
<p>Each entry has a page with its patent status by country, its patent families and expected expiry dates. For HIV long-acting products with MedsPaL data,
each country also has a page comparing the products.</p></section>
<h2>By country: HIV long-acting therapeutics ({len(isos)} countries)</h2>
<p>{clinks}</p>
<h2>By product</h2>
<p class="small">"Granted in" and "Filed in" count low- and middle-income countries, status as recorded on {long_date(SNAPSHOT)}.</p>
{sections}
{SOURCES.format(snap=long_date(SNAPSHOT))}"""
    ld = {'@context': 'https://schema.org', '@graph': [
        dataset_ld('Patent landscape of long-acting therapeutics in low- and middle-income countries', desc, url, url + 'patents.csv',
                   ['long-acting', 'patent', 'patent landscape', 'low- and middle-income countries', 'HIV', 'voluntary licence'] + sorted(by_ta)),
        {'@type': 'CollectionPage', 'name': title, 'url': url, 'hasPart': [{'@type': 'WebPage', 'url': f'{SITE}/{e["id"]}/patents/', 'name': e['name']} for e in entries]},
        crumbs_ld([('LAPaL', SITE + '/'), ('Patent landscape', url)])]}
    page(path, title, desc, body, ld, public)
    write_csv(path, rows_csv)
    return path


def sitemap(paths):
    urls = ''.join(f'  <url><loc>{SITE}/{p}</loc><lastmod>{SNAPSHOT}</lastmod></url>\n' for p in paths)
    open(os.path.join(OUT, 'sitemap-patents.xml'), 'w').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')


def llms(data, entries, isos):
    C = data['countries']
    lines = ['# LAPaL — patent landscape of long-acting therapeutics', '',
             f'> Patent status of {len(entries)} long-acting medicines, formulations and technologies in low- and middle-income countries: '
             'granted, filed (pending) and no-longer-in-force patents, expected expiry dates and voluntary licences, by product and by country. '
             f'Published by the Medicines Patent Pool (MPP). Data snapshot: {SNAPSHOT}.', '',
             'Patent status comes from MedsPaL (https://www.medspal.org) as linked to each LAPaL entry, or, where marked preliminary, '
             'from the patent cards on the LAPaL entry page. Status is "as recorded"; future dates are projections from expected expiry dates. '
             'Voluntary licences "may allow" generic manufacturing and/or sale in some territories; the licence terms decide. '
             'Patent information is for information only, not legal advice. Please quote the snapshot date with any figure.', '',
             '## Overview', '', f'- [Patent landscape (all entries)]({SITE}/landscape/patents/): index of entry and country pages',
             f'- [All entries, CSV]({SITE}/landscape/patents/patents.csv)', '', '## Entries', '']
    for e in sorted(entries, key=lambda x: x['name'].lower()):
        n, latest = entry_facts(e)
        any_lmic = n['granted'] + n['filed'] + n['not_in_force'] > 0
        lines.append(f'- [{e["name"]} patents]({SITE}/{e["id"]}/patents/): '
                     + (f'granted in {n["granted"]}, filed in {n["filed"]} LMICs' if any_lmic else 'patent families listed; no LMIC country status recorded')
                     + (f'; latest expected expiry {latest}' if latest else '') + ('' if e['source'] == 'medspal' else ' (preliminary)'))
    lines += ['', '## Countries (HIV long-acting therapeutics)', '']
    lines += [f'- [{C[i]["name"]}]({SITE}/landscape/patents/{slug(C[i]["name"])}/)' for i in sorted(isos, key=lambda i: C[i]['name'])]
    open(os.path.join(OUT, 'llms-patents.txt'), 'w').write('\n'.join(lines) + '\n')


def main():
    global SNAPSHOT, TODAY, OUT, BASE
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', help='output folder (default: static/)')
    ap.add_argument('--base', default='/', help="site root for internal links, e.g. '/lapal-patent-coverage/' on GitHub Pages")
    ap.add_argument('--sample', action='store_true')
    ap.add_argument('--public', action='store_true', help='drop "noindex" (only once MPP has cleared the content)')
    args = ap.parse_args()
    OUT = os.path.abspath(args.out) if args.out else OUT
    BASE = args.base if args.base.endswith('/') else args.base + '/'
    data = json.load(open(os.path.join(ROOT, 'data', 'patents_data.json'), encoding='utf-8'))
    SNAPSHOT = data['meta']['generated_at'][:10]
    TODAY = SNAPSHOT
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'assets'))
    open(os.path.join(OUT, 'assets', 'patents.css'), 'w').write(CSS.strip() + '\n')

    entries = [e for e in data['entries'] if e['families']]
    isos = sorted({c['iso2'] for es in hiv_products(data) for e in es for f in e['families'] for c in f['countries']})
    if args.sample:
        entries = [e for e in entries if e['id'] == SAMPLE['entry']]
        isos = [SAMPLE['country']]
    entry_ids = {e['id'] for e in entries}
    pages = [entry_page(data, e, args.public, set(isos)) for e in entries]
    pages += [country_page(data, iso, args.public, entry_ids) for iso in isos]
    if not args.sample:
        pages.insert(0, landscape_index(data, entries, isos, args.public))
        sitemap(pages); llms(data, entries, isos)
        # To merge into lapal.ch's own robots.txt (which already allows all crawlers) once public.
        open(os.path.join(OUT, 'robots-snippet.txt'), 'w').write(
            f'# Add to https://lapal.ch/robots.txt once the patent pages are public:\nSitemap: {SITE}/sitemap-patents.xml\n')
    print('wrote %d pages to %s%s' % (len(pages), os.path.relpath(OUT, ROOT), '' if args.public else ' (noindex: internal)'))
    for p in pages[:5]:
        print('  /' + p)


if __name__ == '__main__':
    main()
