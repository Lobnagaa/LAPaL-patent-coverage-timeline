"""Product attributes for the "Landscape by country (HIV)" filters: innovator, indication, most advanced
development phase, drug class and route of administration.

Source, in order:
  1. the LAPaL HIV dashboard (https://lapal.ch/hiv-dashboard), whose dataset is embedded in the page
     (`:dataset` attribute), matched to our HIV entries by their lapal.ch URL;
  2. for HIV entries not on the dashboard (the parent compounds and the technologies), the lapal.ch entry
     page itself: Developer(s), Drug class/category, Use case(s), Administration route, and the most
     advanced phase from its clinical trials list ("Marketed" if a trial is marked Marketed or the
     approval / regulatory text says "approved"), else the technology's "Development stage".

Writes data/hiv_attributes.json (keyed by lapal.ch URL). Pages are cached in cache/hiv_attributes/;
pass --refresh to download them again.

Run after build_patents.py:  python3 tools/fetch_hiv_attributes.py [--refresh]
"""
import argparse, datetime as dt, html, json, os, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'cache', 'hiv_attributes')
OUT = os.path.join(ROOT, 'data', 'hiv_attributes.json')
DASHBOARD = 'https://lapal.ch/hiv-dashboard'

PHASES = ['Pre-clinical', 'Phase I', 'Phase I/II', 'Phase II', 'Phase II/III', 'Phase III', 'Marketed']
ROUTE_CODES = {'oral': 'PO', 'subcutaneous': 'SC', 'intramuscular': 'IM', 'intravenous': 'IV',
               'topical (vaginal)': 'VR', 'vaginal': 'VR', 'transdermal': 'TD'}
ROUTE_LABELS = {'PO': 'Oral', 'SC': 'Subcutaneous', 'IM': 'Intramuscular', 'IV': 'Intravenous',
                'VR': 'Vaginal', 'TD': 'Transdermal'}
# Entry-page class wording -> the dashboard's class names.
CLASS_WORDS = [('integrase', 'INSTI'), ('insti', 'INSTI'), ('nnrti', 'NNRTI'), ('nrtti', 'NRTTI'),
               ('capsid', 'Capsid inhibitor')]


def fetch(url, refresh):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, re.sub(r'[^a-z0-9]+', '_', url.lower()).strip('_') + '.html')
    if refresh or not os.path.exists(path):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (LAPaL patent prototype build)'})
        open(path, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
    return open(path, encoding='utf-8').read()


def norm_url(u):
    return u.rstrip('/').lower()


def from_dashboard(e):
    use = (e.get('use_case_raw') or '').lower()
    return {
        'source': 'HIV dashboard',
        'innovators': e.get('developers_full') or [],
        'treatment': bool(e.get('is_treatment')) or use in ('treatment', 'both'),
        'prevention': bool(e.get('is_prevention')) or use in ('prevention', 'both'),
        'phase': e.get('highest_phase'),
        'on_hold': bool(e.get('on_hold')),
        'classes': [c.strip() for c in (e.get('class_group') or '').split('+') if c.strip()],
        'routes': e.get('routes') or [],
    }


def page_lines(s):
    t = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', '', s, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', '\n', t))
    return [l.strip() for l in t.split('\n') if l.strip()]


def field(lines, label, stop):
    """Values listed under a label on the entry page, up to the next label in `stop`."""
    if label not in lines:
        return []
    out = []
    for l in lines[lines.index(label) + 1:]:
        if l in stop or len(out) > 8:
            break
        out.append(l)
    return out


def from_entry_page(url, s):
    lines = page_lines(s)
    labels = {'Developer(s)', 'Sponsor(s)', 'Drug information', 'export_notes', 'Lifecycle status', 'Summary',
              'Administration route', 'Associated long-acting platforms', 'Potential associated API(s)',
              'Development state and regulatory approval', 'Clinical trial(s)', 'Use case(s)'}
    dev = field(lines, 'Developer(s)', labels)
    uses = ' '.join(field(lines, 'Use case(s)', labels)).lower()
    routes = []
    for r in ', '.join(field(lines, 'Administration route', labels)).split(','):
        code = ROUTE_CODES.get(r.strip().lower())
        if code and code not in routes:
            routes.append(code)
    cls_text = ' '.join(field(lines, 'Drug class/category', labels)).lower()
    classes = [c for w, c in CLASS_WORDS if w in cls_text]
    classes = list(dict.fromkeys(classes)) or (['Technology platform'] if '/technology/' in url else [])
    # Most advanced phase: the trial list embedded in the page, then the approval texts, then the stage field.
    raw = html.unescape(s)
    phases = set(re.findall(r'"phase":"([^"]+)"', raw))
    approved = re.search(r'"(?:approval_status|regulatory_authorities)":"[^"]*\bapproved\b', raw, re.I)
    if 'Marketed' in phases or approved:
        phase, basis = 'Marketed', 'trial marked Marketed' if 'Marketed' in phases else 'approval text on the entry page'
    elif phases & set(PHASES):
        phase, basis = max(phases & set(PHASES), key=PHASES.index), 'most advanced trial on the entry page'
    else:
        stage = field(lines, 'Development stage', labels | {'Development stage'})
        phase = stage[0] if stage and stage[0] in PHASES else None
        basis = 'development stage on the entry page' if phase else 'not stated'
    return {'source': 'entry page', 'innovators': dev, 'treatment': 'treatment' in uses,
            'prevention': 'prep' in uses or 'prevention' in uses or 'pre-exposure' in uses,
            'phase': phase, 'phase_basis': basis, 'on_hold': False, 'classes': classes, 'routes': routes}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--refresh', action='store_true', help='download the dashboard and entry pages again')
    args = ap.parse_args()
    page = fetch(DASHBOARD, args.refresh)
    m = re.search(r':dataset="([^"]*)"', page)
    if not m:
        raise SystemExit('No :dataset attribute on %s; the page layout has changed.' % DASHBOARD)
    dash = json.loads(html.unescape(m.group(1)))
    by_url = {norm_url(e['lapal_url']): e for e in dash['entries'] if e.get('lapal_url')}

    snap = json.load(open(os.path.join(ROOT, 'data', 'patents_data.json')))
    out = {}
    for e in snap['entries']:
        if not (e.get('hiv') and e.get('source') == 'medspal'):
            continue
        d = by_url.get(norm_url(e['url']))
        out[e['url']] = from_dashboard(d) if d else from_entry_page(e['url'], fetch(e['url'], args.refresh))
        out[e['url']]['name'] = e['name']

    meta = dash['meta']
    result = {
        'meta': {'fetched_at': dt.date.today().isoformat(), 'dashboard': DASHBOARD,
                 'phase_order': meta.get('phase_order') or PHASES,
                 'class_order': [c for c in (meta.get('class_singles') or []) if c != 'Combination'] + ['Technology platform'],
                 'route_labels': ROUTE_LABELS},
        'entries': out,
    }
    json.dump(result, open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    n_dash = sum(v['source'] == 'HIV dashboard' for v in out.values())
    print('data/hiv_attributes.json: %d HIV entries, %d from the dashboard, %d from their entry pages' % (len(out), n_dash, len(out) - n_dash))
    for url, v in out.items():
        if v['source'] == 'entry page':
            print('  entry page: %-45s phase %-12s (%s) | %s | %s | %s' % (v['name'][:45], v['phase'], v['phase_basis'],
                  ', '.join(v['innovators']), '+'.join(v['classes']), ','.join(v['routes'])))


if __name__ == '__main__':
    main()
