"""Assemble the SharePoint package (internal MPP use) after building the snapshot and the prototype.

Usage (from the project folder):
    python3 tools/build_patents.py && python3 tools/build_prototype.py && python3 tools/package_share.py

Writes share/LAPaL_patent_coverage_<snapshot date>/ and a .zip of it. Nothing is uploaded: copy the
folder (or the zip) into the restricted MPP SharePoint/Teams location yourself.
"""
import json, os, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    snap = json.load(open(os.path.join(ROOT, 'data', 'patents_data.json'), encoding='utf-8'))
    day = snap['meta']['generated_at'][:10]
    name = 'LAPaL_patent_coverage_' + day
    out = os.path.join(ROOT, 'share', name)
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, 'for developers'))
    files = {
        ('dist', 'LAPaL_patent_coverage_prototype.html'): 'LAPaL_patent_coverage_prototype_%s.html' % day,
        ('docs', 'HOW_TO_OPEN.txt'): 'README - how to open.txt',
        ('docs', 'DEVELOPER_HANDOVER.md'): os.path.join('for developers', 'Developer handover.md'),
        ('data', 'patents_data.json'): os.path.join('for developers', 'patents_data.json'),
        ('data', 'build_report.md'): os.path.join('for developers', 'build_report.md'),
        ('data', 'card_status_review.xlsx'): os.path.join('for developers', 'card_status_review.xlsx'),
    }
    for src, dst in files.items():
        shutil.copy2(os.path.join(ROOT, *src), os.path.join(out, dst))
    # Static, crawlable pages (tools/build_static.py): the reference for what lapal.ch should serve.
    if os.path.isdir(os.path.join(ROOT, 'static')):
        shutil.copytree(os.path.join(ROOT, 'static'), os.path.join(out, 'for developers', 'static pages'))
    zpath = out + '.zip'
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for folder, _, names in os.walk(out):
            for n in names:
                full = os.path.join(folder, n)
                z.write(full, os.path.relpath(full, os.path.dirname(out)))
    for folder, _, names in os.walk(out):
        if 'static pages' in folder:  # hundreds of files: summarised below
            continue
        for n in sorted(names):
            p = os.path.join(folder, n)
            print('  %-70s %7.1f KB' % (os.path.relpath(p, os.path.join(ROOT, 'share')), os.path.getsize(p) / 1024))
    sp = os.path.join(out, 'for developers', 'static pages')
    if os.path.isdir(sp):
        n = sum(len(f) for _, _, f in os.walk(sp))
        print('  %-70s %d files' % (os.path.relpath(sp, os.path.join(ROOT, 'share')) + '/', n))
    print('zip: %s (%.1f MB)' % (os.path.relpath(zpath, ROOT), os.path.getsize(zpath) / 1e6))

if __name__ == '__main__':
    main()
