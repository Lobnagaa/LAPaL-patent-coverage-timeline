"""Propose a lapal.ch URL for every Follow-up row that has patent info, for Lobna to confirm.

Usage: python3 match_urls.py <MASTER workbook.xlsx> <lapal_pages.json> <output.xlsx>
lapal_pages.json comes from extract_pages.py run over the pages listed in lapal.ch/sitemap.xml.

Assumptions (flagged in the sheet rather than resolved silently):
- A row with a MedsPaL uuid (column K) belongs on a page whose embedded MedsPaL JSON has that uuid.
  Several pages can share one uuid (a compound page and its formulation page), so among them we
  pick by name, with a small bonus for the section matching the row's category.
- A "Cards" row is matched by name only, against pages that show patent cards and no MedsPaL JSON.
"""
import collections, difflib, json, re, sys
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

SECTION = {'Compounds': '/compounds/', 'Formulations & regimens': '/formulations/',
           'Technologies': '/technology/', '[Complex product]': '/formulations/'}

def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower().split('|')[0])

def score(name, page):
    return difflib.SequenceMatcher(None, norm(name), norm(page['title'])).ratio()

def ranked(name, pool, section):
    # Name similarity decides; a page in the section matching the row category gets a small
    # bonus, enough to separate a compound page from its formulation page with a similar name.
    return sorted(pool, key=lambda p: -(score(name, p) + (0.15 if section and section in p['url'] else 0)))

def main(master, pages_json, out_path):
    pages = json.load(open(pages_json))
    wb = openpyxl.load_workbook(master, read_only=True)
    out = []
    for i, r in enumerate(wb['LAPaL Follow-up'].iter_rows(min_row=2, values_only=True), start=2):
        if not any(r):
            continue
        name, cat, ta, src, uuid = r[2], r[1], r[5], str(r[9] or ''), str(r[10] or '').strip()
        section = SECTION.get(cat, '')
        if uuid:
            pool = [p for p in pages if p['medspal_uuid'] == uuid]
            how = 'uuid matches the page' if pool else 'no LAPaL page carries this uuid; best name match'
            cands = ranked(name, pool or pages, section)
            kind = 'MedsPaL JSON'
        elif 'Card' in src:
            pool = [p for p in pages if p['card_blocks'] and not p['medspal_uuid']]
            cands = ranked(name, pool, section)
            how = 'name match, %d patent card(s) on page' % cands[0]['card_blocks']
            kind = 'LAPaL card'
        else:
            continue
        p1 = cands[0]; p2 = cands[1] if len(cands) > 1 else None
        s1 = round(score(name, p1), 2)
        if uuid and pool and len(pool) > 1:
            how += ' (%d pages share this uuid)' % len(pool)
        if section and section not in p1['url']:
            how += '; page is in a different section than the row category'
        check = (not pool and uuid) or s1 < 0.8 or (section and section not in p1['url'])
        out.append([i, name, ta, kind, uuid, p1['url'], p1['title'], how, s1, p2['url'] if p2 else '', 'CHECK' if check else 'OK'])
    cnt = collections.Counter(o[5] for o in out)
    for o in out:
        if cnt[o[5]] > 1:
            o[7] += '; same page as another row'
            o[10] = 'CHECK'
    matched = {o[5] for o in out}
    orphans = [p for p in pages if (p['medspal_uuid'] or p['card_blocks']) and p['url'] not in matched]
    write(out, orphans, out_path)
    return out, orphans

def write(out, orphans, out_path):
    nb = openpyxl.Workbook(); ws = nb.active; ws.title = 'Confirm URLs'
    ws.append(['Follow-up row', 'Product / technology (workbook)', 'TA', 'Patent source', 'MedsPaL uuid',
               'Proposed LAPaL URL', 'LAPaL page title', 'How matched', 'Name score', 'Runner-up URL',
               'Needs a look?', 'CONFIRM (Y/N)', 'Corrected URL (if N)', 'Your notes'])
    for o in sorted(out, key=lambda o: (o[10] != 'CHECK', o[3], o[0])):
        ws.append(o + ['', '', ''])
    yellow = PatternFill('solid', fgColor='FFF2CC'); grey = PatternFill('solid', fgColor='D9D9D9'); blue = PatternFill('solid', fgColor='DDEBF7')
    for c in ws[1]:
        c.font = Font(bold=True); c.fill = grey; c.alignment = Alignment(wrap_text=True, vertical='top')
    for row in ws.iter_rows(min_row=2):
        if row[10].value == 'CHECK':
            for c in row[:11]: c.fill = yellow
        for c in row[11:]: c.fill = blue
        row[5].hyperlink = row[5].value; row[5].font = Font(color='0563C1', underline='single')
    dv = DataValidation(type='list', formula1='"Y,N"', allow_blank=True); ws.add_data_validation(dv); dv.add('L2:L%d' % ws.max_row)
    for col, w in zip('ABCDEFGHIJKLMN', [10, 42, 18, 14, 38, 58, 40, 50, 9, 50, 10, 12, 40, 30]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = 'C2'; ws.auto_filter.ref = ws.dimensions
    w2 = nb.create_sheet('LAPaL pages not matched')
    w2.append(['LAPaL URL', 'Page title', 'MedsPaL uuid on page', 'Patent cards on page'])
    for p in orphans: w2.append([p['url'], p['title'], p['medspal_uuid'] or '', p['card_blocks']])
    for c in w2[1]: c.font = Font(bold=True); c.fill = grey
    for col, w in zip('ABCD', [60, 50, 40, 14]): w2.column_dimensions[col].width = w
    w3 = nb.create_sheet('How to use')
    for line in ['One row per row of the LAPaL Follow-up tab that has patent info (MedsPaL JSON or Cards).',
                 'Yellow rows need a look: uuid on no page, weak name match, page in another section, or two rows pointing to one page.',
                 'Mark CONFIRM Y if the proposed URL is right, or N and paste the right URL in "Corrected URL".',
                 'To leave a row out of the prototype: mark N and write "exclude" in Corrected URL.',
                 '"LAPaL pages not matched" lists pages with patent data that no workbook row points to.',
                 'Built 26 Oct 2026 from lapal.ch/sitemap.xml (167 entry pages) and LAPAL_Patent info_MASTER-copy.xlsx.']:
        w3.append([line])
    w3.column_dimensions['A'].width = 120
    nb.save(out_path)

if __name__ == '__main__':
    out, orphans = main(*sys.argv[1:4])
    print(collections.Counter(o[10] for o in out), 'unmatched pages:', len(orphans))
    for o in out:
        if o[10] == 'CHECK':
            print(o[0], '|', str(o[1]).replace('\n', ' '), '|', o[5], '|', o[7], o[8])
    for p in orphans:
        print('UNMATCHED PAGE', p['url'], p['medspal_uuid'], p['card_blocks'])
