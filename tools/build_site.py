"""GitHub Pages site: the interactive prototype plus the static patent pages, under one project path.

    site/index.html                  landing page
    site/prototype/                  the interactive prototype (dist/LAPaL_patent_coverage_prototype.html)
    site/landscape/patents/ …        the static pages (tools/build_static.py with --base /<repo>/)
    site/downloads/                  the data snapshot

Published by .github/workflows/pages.yml. The static pages keep "noindex" unless --public is passed
(only once MPP has cleared the content for search engines).

Run after build_patents.py and build_prototype.py:  python3 tools/build_site.py [--public]
"""
import argparse, datetime as dt, html, json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
OWNER, REPO = 'Lobnagaa', 'LAPaL-patent-coverage-timeline'


def repo_from_git():
    """Owner and name of the GitHub repository from the 'origin' remote (GitHub Desktop names it after
    the folder), so the Pages path always matches the published repository."""
    try:
        url = subprocess.run(['git', '-C', ROOT, 'remote', 'get-url', 'origin'], capture_output=True, text=True, check=True).stdout.strip()
        owner, name = url.rstrip('/').removesuffix('.git').split('github.com')[-1].lstrip(':/').split('/')[:2]
        return owner, name
    except Exception:
        return OWNER, REPO


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--public', action='store_true', help='let search engines index the pages')
    args = ap.parse_args()
    global OWNER, REPO
    OWNER, REPO = repo_from_git()
    if os.path.exists(SITE):
        shutil.rmtree(SITE)
    cmd = [sys.executable, os.path.join(ROOT, 'tools', 'build_static.py'), '--out', SITE, '--base', '/%s/' % REPO]
    subprocess.run(cmd + (['--public'] if args.public else []), check=True)
    os.makedirs(os.path.join(SITE, 'prototype'))
    shutil.copy2(os.path.join(ROOT, 'dist', 'LAPaL_patent_coverage_prototype.html'), os.path.join(SITE, 'prototype', 'index.html'))
    os.makedirs(os.path.join(SITE, 'downloads'))
    for name in ('patents_data.json', 'build_report.md'):
        shutil.copy2(os.path.join(ROOT, 'data', name), os.path.join(SITE, 'downloads', name))
    open(os.path.join(SITE, '.nojekyll'), 'w').close()  # serve folders as they are

    snap = json.load(open(os.path.join(ROOT, 'data', 'patents_data.json')))['meta']['generated_at'][:10]
    d = dt.date.fromisoformat(snap)
    repo_url = 'https://github.com/%s/%s' % (OWNER, REPO)
    robots = '' if args.public else '<meta name="robots" content="noindex, nofollow">'
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LAPaL patent coverage: prototype and patent pages</title>
<meta name="description" content="Patent status of long-acting therapeutics in low- and middle-income countries: an interactive prototype and crawlable patent pages built for LAPaL (lapal.ch).">
{robots}<link rel="stylesheet" href="assets/patents.css"></head>
<body><header class="site"><a href="https://lapal.ch/">LAPaL</a><span>Patent coverage of LA therapeutics covered by LAPaL: working prototype</span></header>
<main>
<h1>LAPaL patent coverage</h1>
<p class="meta">Data snapshot {d.day} {d.strftime('%B')} {d.year} · Prototype by the Medicines Patent Pool for <a href="https://lapal.ch">LAPaL</a></p>
<section class="summary"><p>Where long-acting medicines, formulations and technologies are patented in low- and middle-income countries,
when those patents are expected to expire, and where voluntary licences may allow generic manufacturing and/or sale.
Patent data come from <a href="https://www.medspal.org">MedsPaL</a> as linked to each LAPaL entry, or, where marked preliminary, from the patent cards on lapal.ch.</p>
<p>This is a working prototype for the LAPaL developers. The official feature will be built on lapal.ch.</p></section>
<h2>Interactive prototype</h2>
<p><a href="prototype/">Open the interactive prototype</a>: a map per entry with a date slider and patent timeline, a landscape by product,
and a landscape by country for HIV long-acting therapeutics.</p>
<h2>Patent pages</h2>
<p><a href="landscape/patents/">Patent landscape</a>: one page per LAPaL entry and per country, readable without JavaScript, as lapal.ch should serve them.</p>
<h2>Data and code</h2>
<ul><li><a href="downloads/patents_data.json">Data snapshot (JSON)</a> · <a href="downloads/build_report.md">Build report</a></li>
<li><a href="{repo_url}">Source code and developer handover on GitHub</a></li></ul>
<div class="sources"><p>Patent information is provided for information only and is not legal advice. Status "as recorded" may lag behind national registers;
dates after today are projections from expected expiry dates.</p></div>
</main></body></html>
"""
    open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(page)
    n = sum(len(f) for _, _, f in os.walk(SITE))
    print('site/ ready: %d files, https://%s.github.io/%s/%s' % (n, OWNER.lower(), REPO, '' if args.public else ' (noindex)'))


if __name__ == '__main__':
    main()
