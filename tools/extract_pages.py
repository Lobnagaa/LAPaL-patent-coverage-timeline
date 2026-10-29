import re, html, json, glob, sys
out = []
for fn in sorted(glob.glob(sys.argv[1] + '/*.html')):
    x = open(fn, encoding='utf-8', errors='replace').read()
    t = re.search(r'<title>(.*?)</title>', x, re.S)
    title = html.unescape(t.group(1)).strip() if t else ''
    m = re.search(r':medspal="([^"]*)"', x)
    uuid = None
    if m:
        try:
            d = json.loads(html.unescape(m.group(1)))
            uuid = d.get('uuid') if isinstance(d, dict) else None
        except Exception:
            uuid = 'unparsed'
    cards = x.count('Representative patent')
    url = 'https://lapal.ch/' + fn.split('/')[-1][:-5].replace('__', '/')
    out.append(dict(url=url, title=title, medspal_uuid=uuid, card_blocks=cards))
json.dump(out, open(sys.argv[2], 'w'), indent=1)
