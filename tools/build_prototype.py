"""Bundle the prototype into one self-contained HTML file (offline; published on GitHub Pages via tools/build_site.py).

Usage (from the project folder, after tools/build_patents.py):
    python3 tools/build_prototype.py

Reads   src/index.html, src/app.css, src/app.js, data/patents_data.json,
        cache/vendor/ (d3, topojson-client, world-atlas 50m, world-countries; downloaded once)
Writes  dist/LAPaL_patent_coverage_prototype.html

Map assumptions:
- world-atlas identifies countries by ISO numeric code; world-countries gives the ISO alpha-2 for
  each. A few shapes have no code and are attached by name: Kosovo -> XK, Somaliland -> SO,
  N. Cyprus -> CY (shown with the country that the patent offices treat as covering them).
"""
import json, os, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR = os.path.join(ROOT, 'cache', 'vendor')
LIBS = {
    'd3': 'd3@7.9.0/dist/d3.min.js',
    'topojson': 'topojson-client@3.1.0/dist/topojson-client.min.js',
    'atlas': 'world-atlas@2.0.2/countries-50m.json',
    'codes': 'world-countries@5.1.0/countries.json',
}
NO_CODE = {'Kosovo': 'XK', 'Somaliland': 'SO', 'N. Cyprus': 'CY'}

def vendor(key):
    path = os.path.join(VENDOR, LIBS[key].replace('@', '_').replace('/', '_'))
    if not os.path.exists(path):
        os.makedirs(VENDOR, exist_ok=True)
        urllib.request.urlretrieve('https://cdn.jsdelivr.net/npm/' + LIBS[key], path)
    return open(path, encoding='utf-8').read()

def world():
    atlas = json.loads(vendor('atlas'))
    num_to_a2 = {c['ccn3']: c['cca2'] for c in json.loads(vendor('codes')) if c.get('ccn3')}
    geoms = []
    for g in atlas['objects']['countries']['geometries']:
        name = g['properties']['name']
        if name == 'Antarctica':
            continue
        iso2 = num_to_a2.get(g.get('id')) or NO_CODE.get(name)
        g['properties'] = {'name': name, 'iso2': iso2}
        geoms.append(g)
    atlas['objects']['countries']['geometries'] = geoms
    atlas['objects'].pop('land', None)
    return atlas

def slim(snapshot):
    """Keep only what the prototype reads, to keep the HTML small."""
    keep_rec = ('number', 'status', 'status_raw', 'expiry', 'via', 'how', 'source')
    entries = []
    for e in snapshot['entries']:
        fams = []
        for f in e['families']:
            fams.append({
                'id': f['id'], 'description': f['description'], 'brief': f.get('brief_description', ''),
                'wo': f['representative_patent'], 'espacenet': f.get('espacenet_url'),
                'categories': f['categories'], 'holders': f['holders'], 'expiry': f['expiry'],
                'filing': f['filing_date'], 'filing_estimated': f['filing_estimated'], 'filing_source': f.get('filing_source'),
                'family_status': f.get('family_status'), 'status_text': f.get('status_text'),
                'compound': f['compound_patent'],
                'countries': [{'iso2': c['iso2'], 'records': [{k: r.get(k) for k in keep_rec if r.get(k) is not None}
                                                               for r in c['records']]} for c in f['countries']],
            })
        entries.append({k: e.get(k) for k in ('id', 'url', 'name', 'type', 'therapeutic_areas', 'hiv', 'source', 'preliminary', 'medspal_uuid', 'medspal_product_name')}
                       | {'families': fams})
    countries = {k: {'name': c['name'], 'income': c['income'], 'lmic': c['lmic']} for k, c in snapshot['countries'].items()}
    meta = {k: snapshot['meta'][k] for k in ('generated_at', 'preliminary_disclaimer', 'regions')}
    return {'meta': meta, 'countries': countries, 'licences': snapshot.get('licences', []), 'entries': entries}

def logos():
    """LAPaL and MedsPaL logos for the PNG exports, inlined as data URIs with their pixel size."""
    import base64, struct
    out = {}
    for name in ('lapal', 'medspal'):
        raw = open(os.path.join(ROOT, 'assets', 'logos', name + '.png'), 'rb').read()
        w, h = struct.unpack('>II', raw[16:24])
        out[name] = {'src': 'data:image/png;base64,' + base64.b64encode(raw).decode(), 'w': w, 'h': h}
    return out

def main():
    snapshot = json.load(open(os.path.join(ROOT, 'data', 'patents_data.json'), encoding='utf-8'))
    page = open(os.path.join(ROOT, 'src', 'index.html'), encoding='utf-8').read()
    data = json.dumps(slim(snapshot), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    atlas = json.dumps(world(), separators=(',', ':'))
    parts = {
        '/*__CSS__*/': open(os.path.join(ROOT, 'src', 'app.css'), encoding='utf-8').read(),
        '/*__D3__*/': vendor('d3'),
        '/*__TOPOJSON__*/': vendor('topojson'),
        '/*__DATA__*/': 'window.PATENT_DATA=' + data + ';window.WORLD=' + atlas + ';window.LOGOS=' + json.dumps(logos()) + ';',
        '/*__APP__*/': open(os.path.join(ROOT, 'src', 'app.js'), encoding='utf-8').read(),
    }
    for k, v in parts.items():
        assert page.count(k) == 1, k
        page = page.replace(k, v)
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    out = os.path.join(ROOT, 'dist', 'LAPaL_patent_coverage_prototype.html')
    open(out, 'w', encoding='utf-8').write(page)
    print('wrote %s (%.1f MB)' % (os.path.relpath(out, ROOT), os.path.getsize(out) / 1e6))

if __name__ == '__main__':
    main()
