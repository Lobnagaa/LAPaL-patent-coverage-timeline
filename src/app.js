/* LAPaL patent coverage prototype: entry view (Patent info tab), Landscape by product, Landscape by country (HIV).
 *
 * Data: window.PATENT_DATA, built by tools/build_patents.py and slimmed by tools/build_prototype.py.
 * Status rule (Lobna, 26 Oct 2026): today, a record's MedsPaL status is used as recorded, even past
 * its expiry date, so the map matches medspal.org. The date slider (stage 3) will pass a future
 * `day`: a granted/filed record that has expired by then counts as not in force.
 */
(function () {
  'use strict';
  const D = window.PATENT_DATA;
  const C = D.countries;
  const RANK = { granted: 3, filed: 2, not_in_force: 1 };
  const LABEL = { granted: 'Granted', filed: 'Filed', not_in_force: 'Not in force' };
  const COLOR = { granted: 'var(--granted)', filed: 'var(--filed)', not_in_force: 'var(--nif)' };
  // famFocus: show one patent family only (from a card); open: cards whose other-countries list is open.
  const state = { entryId: null, iso: null, compoundOnly: false, day: null, stop: 0, famFocus: null, open: new Set(), openGroups: new Set() };
  const TODAY = new Date().toISOString().slice(0, 10);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const longDate = iso => iso ? `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : '';
  const nextDay = iso => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

  // ---------- data helpers ----------
  const byId = new Map(D.entries.map(e => [e.id, e]));

  function statusOf(rec, day) {
    const st = rec.status;
    if (day && (st === 'granted' || st === 'filed') && rec.expiry && rec.expiry < day) return 'not_in_force';
    return st || null;
  }
  function families(entry) {
    return entry.families.filter(f => (!state.compoundOnly || f.compound) && (!state.famFocus || f.id === state.famFocus));
  }
  /** iso2 -> {status, records:[{fam, rec, st}]} for the current entry and options. */
  function countryIndex(entry) {
    const idx = new Map();
    for (const fam of families(entry)) {
      for (const c of fam.countries) {
        let slot = idx.get(c.iso2);
        if (!slot) idx.set(c.iso2, slot = { status: null, records: [] });
        for (const rec of c.records) {
          const st = statusOf(rec, state.day);
          slot.records.push({ fam, rec, st });
          if (st && (RANK[st] || 0) > (RANK[slot.status] || 0)) slot.status = st;
        }
      }
    }
    return idx;
  }

  // ---------- formatting ----------
  const flag = iso => (iso && /^[A-Z]{2}$/.test(iso)) ? String.fromCodePoint(...[...iso].map(ch => 127397 + ch.charCodeAt(0))) : '';
  const fmtDate = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '—';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const cname = iso => (C[iso] && C[iso].name) || iso;
  const noDataFill = iso => (C[iso] && C[iso].lmic) ? 'var(--none-lmic)' : 'var(--none-hic)';
  // Low- and middle-income countries only (Lobna, 27 Oct): the build drops high-income records, and
  // high-income countries are greyed out and not clickable here.
  const isHic = iso => !(C[iso] && C[iso].lmic);
  // Voluntary licences (CAB, LEN, alimatravir): the territory may allow generic manufacturing and/or sale.
  const LIC = D.licences || [];
  const licencesFor = id => LIC.filter(l => l.entries.includes(id));
  const LIC_MAY = 'may allow generic manufacturing and/or sale in some territories';
  const fromSummary = rec => rec.source === 'family summary';
  const SUMMARY_NOTE = 'Family-level status from MedsPaL (the summary shown on the LAPaL patent map); no national patent number or country-specific expiry recorded.';

  // ---------- picker ----------
  const search = document.getElementById('entry-search');
  const select = document.getElementById('entry-select');
  function fillPicker(q) {
    q = (q || '').trim().toLowerCase();
    const match = e => !q || e.name.toLowerCase().includes(q) || (e.therapeutic_areas || []).join(' ').toLowerCase().includes(q);
    const groups = [
      ['Patent data from MedsPaL', e => e.source === 'medspal'],
      ['Patent data from LAPaL cards (preliminary)', e => e.source !== 'medspal'],
    ];
    select.innerHTML = '';
    for (const [label, test] of groups) {
      const items = D.entries.filter(e => test(e) && match(e)).sort((a, b) => a.name.localeCompare(b.name));
      if (!items.length) continue;
      const og = document.createElement('optgroup');
      og.label = label + ' (' + items.length + ')';
      for (const e of items) {
        const o = document.createElement('option');
        o.value = e.id;
        o.textContent = e.name + ' · ' + e.type + ((e.therapeutic_areas || []).length ? ' · ' + e.therapeutic_areas.join(', ') : '');
        og.appendChild(o);
      }
      select.appendChild(og);
    }
    if (byId.has(state.entryId) && [...select.options].some(o => o.value === state.entryId)) select.value = state.entryId;
  }
  search.addEventListener('input', () => {
    fillPicker(search.value);
    if (select.options.length && select.value !== state.entryId) setEntry(select.value);
  });
  select.addEventListener('change', () => setEntry(select.value));

  // ---------- map ----------
  const W = 960, H = 470;
  const svg = d3.select('#map').attr('viewBox', `0 0 ${W} ${H}`);
  const gRoot = svg.append('g');
  const features = topojson.feature(window.WORLD, window.WORLD.objects.countries).features;
  const projection = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'FeatureCollection', features });
  const path = d3.geoPath(projection);
  const shapes = gRoot.append('g').selectAll('path').data(features).join('path')
    .attr('class', 'country').attr('d', path);
  const tinyLayer = gRoot.append('g');
  // Countries too small to see or click at world scale get a dot when they have data.
  const TINY_AREA = 12;
  const tinyIso = new Set(features.filter(f => path.area(f) < TINY_AREA && f.properties.iso2).map(f => f.properties.iso2));
  const centroid = new Map(features.filter(f => f.properties.iso2).map(f => [f.properties.iso2, path.centroid(f)]));

  const zoom = d3.zoom().scaleExtent([1, 10]).translateExtent([[0, 0], [W, H]])
    .on('zoom', ev => {
      gRoot.attr('transform', ev.transform);
      tinyLayer.selectAll('circle').attr('r', 3.6 / ev.transform.k);
    });
  svg.call(zoom);
  document.getElementById('zoom-in').onclick = () => svg.transition().call(zoom.scaleBy, 1.6);
  document.getElementById('zoom-out').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.6);
  document.getElementById('zoom-reset').onclick = () => svg.transition().call(zoom.transform, d3.zoomIdentity);

  const tip = document.getElementById('tooltip');
  const wrap = document.getElementById('map-wrap');
  function showTip(ev, iso, slot) {
    if (!iso) { tip.hidden = true; return; }
    if (isHic(iso) && !slot) {
      tip.innerHTML = `<div class="tt-title">${flag(iso)} ${esc(cname(iso))}</div><div class="tt-row" style="color:var(--muted)">High income: not covered in this view</div>`;
    } else {
    const counts = {};
    (slot ? slot.records : []).forEach(r => { if (r.st) counts[r.st] = (counts[r.st] || 0) + 1; });
    const rows = slot
      ? Object.keys(RANK).filter(k => counts[k]).map(k => `${counts[k]} ${LABEL[k].toLowerCase()}`).join(' · ') + ' patent record(s)'
      : 'No patent record for this entry';
    tip.innerHTML = `<div class="tt-title">${flag(iso)} ${esc(cname(iso))}</div>` +
      (slot && slot.status ? `<div class="tt-row"><b>${LABEL[slot.status]}</b></div>` : '') +
      `<div class="tt-row">${rows}</div>` + (slot ? '<div class="tt-row" style="color:var(--muted)">Click for details</div>' : '');
    }
    tip.hidden = false;
    const r = wrap.getBoundingClientRect();
    let x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
    if (x + 270 > r.width) x = ev.clientX - r.left - 270;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }

  let index = new Map();
  function drawMap() {
    const entry = byId.get(state.entryId);
    index = countryIndex(entry);
    shapes
      .attr('fill', f => { const s = index.get(f.properties.iso2); return s && s.status ? COLOR[s.status] : noDataFill(f.properties.iso2); })
      .classed('has-data', f => index.has(f.properties.iso2))
      .classed('selected', f => f.properties.iso2 && f.properties.iso2 === state.iso)
      .on('mousemove', (ev, f) => showTip(ev, f.properties.iso2, index.get(f.properties.iso2)))
      .on('mouseleave', () => { tip.hidden = true; })
      .on('click', (ev, f) => { if (index.has(f.properties.iso2)) selectCountry(f.properties.iso2); });
    const k = d3.zoomTransform(svg.node()).k;
    const dots = [...index.entries()].filter(([iso, s]) => s.status && tinyIso.has(iso) && centroid.has(iso));
    tinyLayer.selectAll('circle').data(dots, d => d[0]).join('circle')
      .attr('class', 'tiny').attr('cx', d => centroid.get(d[0])[0]).attr('cy', d => centroid.get(d[0])[1])
      .attr('r', 3.6 / k).attr('fill', d => COLOR[d[1].status])
      .classed('selected', d => d[0] === state.iso)
      .on('mousemove', (ev, d) => showTip(ev, d[0], d[1]))
      .on('mouseleave', () => { tip.hidden = true; })
      .on('click', (ev, d) => selectCountry(d[0]));
  }

  // ---------- legend & counts ----------
  function drawLegend() {
    const sw = (c, t) => `<span class="swatch"><i style="background:${c}"></i>${t}</span>`;
    document.getElementById('legend').innerHTML =
      `<div class="legend-group"><b>Patent status</b>${sw(COLOR.granted, 'Granted')}${sw(COLOR.filed, 'Filed')}${sw(COLOR.not_in_force, 'Not in force')}</div>` +
      `<div class="legend-group">${sw('var(--none-lmic)', 'No patent record (low &amp; middle income)')}${sw('var(--none-hic)', 'High income: not covered')}</div>`;
  }
  function drawStats() {
    const lmic = { granted: 0, filed: 0, not_in_force: 0 };
    for (const [iso, s] of index) if (s.status && !isHic(iso)) lmic[s.status]++;
    const nLmic = Object.values(C).filter(c => c.lmic).length;
    const block = (title, n) => `<div class="stat-block"><h3>${title}</h3><div class="stat-nums">` +
      Object.keys(LABEL).map(k => `<span class="stat-num"><i style="background:${COLOR[k]}"></i><strong>${n[k]}</strong>${LABEL[k].toLowerCase()}</span>`).join('') +
      `</div></div>`;
    document.getElementById('stats').innerHTML =
      block(`Low- and middle-income countries (of ${nLmic})`, lmic);
  }

  // ---------- plain-text summary of the map (Lobna, 29 Oct: search, AI tools and screen readers) ----------
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  function drawSummary() {
    const e = byId.get(state.entryId);
    const n = { granted: 0, filed: 0, not_in_force: 0 };
    let latest = null;
    for (const [iso, s] of index) {
      if (!s.status || isHic(iso)) continue;
      n[s.status]++;
      for (const r of s.records) if (r.st === 'granted' || r.st === 'filed') {
        const exp = r.rec.expiry || r.fam.expiry;
        if (exp && (!latest || exp > latest)) latest = exp;
      }
    }
    const fam = state.famFocus ? e.families.find(f => f.id === state.famFocus) : null;
    const when = state.day ? `From ${longDate(state.day)} (projected from expected expiry dates)` : `As of ${snapshot()}`;
    const what = (fam ? `patent family ${esc(fam.wo)} of <b>${esc(e.name)}</b>` : `<b>${esc(e.name)}</b>`) + (state.compoundOnly ? ' (compound patents only)' : '');
    const src = e.source === 'medspal' ? 'MedsPaL' : 'LAPaL patent cards (preliminary data)';
    let text;
    if (!n.granted && !n.filed && !n.not_in_force) text = `${when}, ${src} records no patent status for ${what} in any low- or middle-income country.`;
    else if (!n.granted && !n.filed) text = `${when}, ${what} has no granted or filed patent in any low- or middle-income country; patents are no longer in force in ${plural(n.not_in_force, 'country', 'countries')} (${src}).`;
    else {
      const lmic = k => plural(k, 'low- or middle-income country', 'low- and middle-income countries');
      const parts = [n.granted ? `<b>granted in ${lmic(n.granted)}</b>` : '', n.filed ? `<b>filed (pending) in ${n.granted ? n.filed : lmic(n.filed)}</b>` : ''].filter(Boolean);
      text = `${when}, ${what} has patents ${parts.join(' and ')}` + (n.not_in_force ? `; in ${n.not_in_force} more, they are no longer in force` : '') + ` (${src}).` +
      (latest ? ` The latest expected expiry of a granted or filed patent is <b>${longDate(latest)}</b>.` : '');
    }
    const lic = licencesFor(e.id);
    if (lic.length) text += ` A voluntary licence (${esc(lic.map(l => l.licensor).join(', '))}) may allow generic manufacturing and/or sale in some territories.`;
    document.getElementById('map-summary').innerHTML = text;
  }

  // ---------- entry header ----------
  function drawHead() {
    const e = byId.get(state.entryId);
    const nFam = e.families.length;
    document.getElementById('entry-head').innerHTML =
      `<h1>${esc(e.name)}</h1><div class="entry-meta">` +
      // Labelled facts rather than unexplained coloured chips (Lobna, 29 Oct); the data source links to it.
      fact('Type of entry in LAPaL', esc(e.type)) +
      ((e.therapeutic_areas || []).length ? fact(`Therapeutic area${e.therapeutic_areas.length > 1 ? 's' : ''}`, esc(e.therapeutic_areas.join(', '))) : '') +
      fact('Patent data', sourceLink(e)) +
      fact('Patent families', String(nFam)) +
      `<a href="${esc(e.url)}" target="_blank" rel="noopener">Open on lapal.ch ↗</a></div>`;  // medspal.org is linked from "Patent data" (Lobna, 29 Oct)
    const dis = document.getElementById('disclaimer');
    if (e.preliminary) {
      dis.innerHTML = `<span aria-hidden="true">⚠️</span><div><b>Preliminary data.</b> ${esc(D.meta.preliminary_disclaimer)} ` +
        `Countries are read from the patent cards on this page, and one expiry date applies to every country of a family. ` +
        `Filing dates come from Google Patents${e.families.some(f => f.filing_estimated) ? '; where none was found they are estimated (expiry − 20 years) and marked' : ''}.</div>`;
      dis.hidden = false;
    } else dis.hidden = true;
    const ln = document.getElementById('licence-note'), lics = licencesFor(e.id);
    ln.hidden = !lics.length;
    ln.innerHTML = lics.map(l => `<div class="ln-row"><span aria-hidden="true">🤝</span><div><b>Voluntary licence in place.</b> The ${esc(l.label.toLowerCase())} ${esc(l.type)} ` +
      `from ${esc(l.licensor)} ${LIC_MAY} (${Object.keys(l.territory).length} low- and middle-income countries in its territory), ` +
      `whatever the patent status shown here. Select a country to see whether it is in the territory; check the licence terms for what is permitted where.</div></div>`).join('');
  }
  /** One line per licence of the entry: is `iso` in its territory? */
  function licenceLines(entryId, iso) {
    return licencesFor(entryId).map(l => {
      const basis = l.territory[iso];
      return `<div class="licence-line${basis ? ' in' : ''}"><b>${esc(l.label)} licence (${esc(l.licensor)}):</b> ` +
        (basis ? `${esc(cname(iso))} is in the territory${basis !== 'In territory' ? ` (${esc(basis.toLowerCase())})` : ''}. The licence may allow generic manufacturing and/or sale here; check its terms.`
          : `${esc(cname(iso))} is outside the licence territory.`) + '</div>';
    }).join('');
  }

  /* medspal.org opens on a product through a base64 query: btoa('product=' + encoded product name)
   * (the format medspal.org itself writes when a product is picked; checked 29 Oct 2026). These
   * MedsPaL products are not in medspal.org's public product list, so a link would find nothing. */
  const MEDSPAL_NOT_LISTED = new Set(['a1aee039-f2af-4f10-bd0f-9d6e3d210735', '901f036a-7c32-4483-b28b-a4b63bf766af',
    '83eba7dd-1953-4d73-96b0-83a212543c8f', '17222fc8-b02f-4d13-9d64-abaf3fe1bf93', '532416f9-42ee-47a6-893a-937274abaa41',
    '5e0b6eb4-b061-4094-aea5-d00507846656', '306dab01-d14f-4853-beb2-954c9bd4d44b', 'abb61b03-66ac-4787-8452-7710e1650b62',
    '9ec9a281-f69e-4e96-b8b5-d64a19dbd760']);
  const medspalUrl = e => e.medspal_product_name && !MEDSPAL_NOT_LISTED.has(e.medspal_uuid)
    ? 'https://www.medspal.org/?' + btoa(unescape(encodeURIComponent('product=' + encodeURIComponent(e.medspal_product_name)))) : null;
  const fact = (k, v) => `<span class="fact"><span class="fact-k">${k}</span> ${v}</span>`;
  function sourceLink(e) {
    if (e.source !== 'medspal')
      return `<a class="src-card" href="${esc(e.url)}" target="_blank" rel="noopener" title="Patent cards on the entry's lapal.ch page (preliminary)">LAPaL patent cards ↗</a> <span class="est">(preliminary)</span>`;
    const u = medspalUrl(e);
    return u ? `<a href="${esc(u)}" target="_blank" rel="noopener" title="MedsPaL product: ${esc(e.medspal_product_name)}">MedsPaL ↗</a>`
      : `<span title="MedsPaL product “${esc(e.medspal_product_name || '')}” is not in medspal.org's public product list">MedsPaL</span>`;
  }


  // ---------- side panel ----------
  const panel = document.getElementById('panel');
  function typeTags(fam) { return (fam.categories || []).map(c => `<span class="tag type">${esc(c)}</span>`).join(''); }
  function statusTag(st, raw) {
    const cls = st || 'unknown';
    const dot = st ? `<i style="background:${COLOR[st]}"></i>` : '';
    return `<span class="tag status status-${cls}">${dot}${esc(raw || LABEL[st] || 'Unknown')}</span>`;
  }
  function viaText(rec) {
    if (!rec.via) return '';
    const reg = D.meta.regions[rec.via];
    if (rec.how && rec.how.includes('named alone')) return `${rec.via} named on the card without member list — shown for every member state`;
    return reg ? `Regional patent: ${reg.label.split(',')[0]}` : `Regional patent: ${rec.via}`;
  }
  function card({ fam, rec, st }) {
    const pastExpiry = (rec.status === 'granted' || rec.status === 'filed') && rec.expiry && rec.expiry < TODAY;
    const expiredBySlider = st !== rec.status && st === 'not_in_force';
    const number = rec.number || fam.wo;
    const via = fromSummary(rec) ? SUMMARY_NOTE : viaText(rec);
    const tag = expiredBySlider
      ? statusTag(st, `Expires ${fmtDate(rec.expiry)}`) + `<span class="tag">${esc(rec.status_raw)} today</span>`
      : statusTag(st, rec.status_raw);
    return `<article class="pcard">
      <div class="pcard-top"><div class="pcard-num">${esc(number)}${rec.number ? '' : ` <span class="est">(${fromSummary(rec) ? 'family-level status' : 'family'})</span>`}</div></div>
      <div class="pcard-desc">${esc(fam.description)}</div>
      <div class="tags">${tag}${typeTags(fam)}</div>
      <dl class="pcard-meta">
        <dt>Expected expiry</dt><dd>${fmtDate(rec.expiry || (rec.status !== 'not_in_force' ? fam.expiry : null))}${pastExpiry ? ' <span class="est">— date passed; status as recorded in MedsPaL</span>' : ''}</dd>
        <dt>Family</dt><dd>${fam.espacenet ? `<a href="${esc(fam.espacenet)}" target="_blank" rel="noopener">${esc(fam.wo)}</a>` : esc(fam.wo)}</dd>
        <dt>Filed</dt><dd>${fmtDate(fam.filing)}${fam.filing_estimated ? ' <span class="est">(estimated: expiry − 20 y)</span>'
          : fam.filing_source ? ` <a class="est" href="${esc(fam.filing_source)}" target="_blank" rel="noopener">(Google Patents)</a>` : ''}</dd>
        ${fam.holders && fam.holders.length ? `<dt>Holder</dt><dd>${esc(fam.holders.join('; '))}</dd>` : ''}
        ${via ? `<dt>${fromSummary(rec) ? 'Source' : 'Via'}</dt><dd>${esc(via)}</dd>` : ''}
      </dl>${otherCountries(fam, number)}</article>`;
  }
  /** Button on each card: the same patent family in the other countries, on the date shown. */
  function otherCountries(fam, number) {
    const key = fam.id + '|' + number, isOpen = state.open.has(key);
    const best = new Map();
    for (const c of fam.countries) {
      if (c.iso2 === state.iso) continue;
      for (const r of c.records) {
        const st = statusOf(r, state.day);
        if ((RANK[st] || 0) > (RANK[best.get(c.iso2)] || 0)) best.set(c.iso2, st);
      }
    }
    const n = best.size;
    const btn = `<div class="oc-actions"><button type="button" class="oc-btn" data-open="${esc(key)}" aria-expanded="${isOpen}">` +
      `${isOpen ? '▾' : '▸'} Same family in other countries (${n})</button>` +
      (state.famFocus === fam.id ? '' : `<button type="button" class="oc-btn ghost" data-focus="${esc(fam.id)}">Show only this family on the map</button>`) + '</div>';
    if (!isOpen) return btn;
    if (!n) return btn + '<p class="oc-empty">No record of this family in any other country.</p>';
    const groups = Object.keys(LABEL).map(k => [k, [...best].filter(([, s]) => s === k).map(([i]) => i).sort((a, b) => cname(a).localeCompare(cname(b)))]).filter(([, l]) => l.length);
    return btn + `<div class="oc-list">${state.day ? `<p class="oc-empty">Status from ${longDate(state.day)}.</p>` : ''}` + groups.map(([k, list]) =>
      `<div class="oc-group"><span class="oc-label">${statusTag(k, LABEL[k])} ${list.length}</span><div class="tags">` +
      list.map(i => `<button type="button" class="tag" data-go="${i}" title="Open ${esc(cname(i))}">${flag(i)} ${esc(cname(i))}</button>`).join('') +
      '</div></div>').join('') + '</div>';
  }
  function setFocus(famId) {
    state.famFocus = famId;
    const keepDate = state.stop ? stops[state.stop] : null;
    computeStops();
    const k = keepDate ? stops.indexOf(keepDate) : -1;
    state.stop = k > 0 ? k : 0;
    state.day = state.stop ? nextDay(stops[state.stop]) : null;
    redraw();
  }
  function drawPanel() {
    const e = byId.get(state.entryId);
    if (state.iso && index.has(state.iso)) {
      const slot = index.get(state.iso);
      const recs = slot.records.slice().sort((a, b) =>
        (RANK[b.st] || 0) - (RANK[a.st] || 0) || String(b.rec.expiry || '').localeCompare(String(a.rec.expiry || '')));
      const inc = C[state.iso] ? C[state.iso].income + ' income' : '';
      panel.innerHTML = `<h2><span class="flag">${flag(state.iso)}</span>${esc(cname(state.iso))}<button class="clear" type="button" id="clear-country">All countries</button></h2>
        <p class="panel-sub">${esc(inc.replace('Not classified income', 'Income not classified'))} · ${recs.length} patent record${recs.length === 1 ? '' : 's'}</p>
        ${licenceLines(e.id, state.iso)}
        ${recs.map(card).join('')}`;
      document.getElementById('clear-country').onclick = () => selectCountry(null);
      panel.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
        const k = b.dataset.open; state.open.has(k) ? state.open.delete(k) : state.open.add(k); drawPanel();
      });
      panel.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => setFocus(b.dataset.focus));
      panel.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
        // Keep the same family open in the country we move to.
        const fam = b.closest('.pcard').querySelector('[data-open]').dataset.open.split('|')[0];
        selectCountry(b.dataset.go);
        panel.querySelectorAll('[data-open]').forEach(x => { if (x.dataset.open.startsWith(fam + '|')) state.open.add(x.dataset.open); });
        drawPanel();
      });
      return;
    }
    // No country selected: a clickable index of countries (also the non-map way in), plus
    // families that have no country detail.
    const groups = { granted: [], filed: [], not_in_force: [] };
    for (const [iso, s] of index) if (s.status) groups[s.status].push(iso);
    // Each status group is collapsed until clicked (Lobna, 29 Oct); open groups stay open on redraw.
    const list = Object.keys(groups).filter(k => groups[k].length).map(k =>
      `<details class="status-group" data-group="${k}"${state.openGroups.has(k) ? ' open' : ''}><summary class="section-title">` +
      `<i style="background:${COLOR[k]}"></i>${LABEL[k]} (${groups[k].length})</summary><div class="tags">` +
      groups[k].sort((a, b) => cname(a).localeCompare(cname(b))).map(iso =>
        `<button type="button" class="tag" data-iso="${iso}" style="border:0;cursor:pointer">${flag(iso)} ${esc(cname(iso))}</button>`).join('') + '</div></details>').join('');
    const noCountry = families(e).filter(f => !f.countries.length);
    panel.innerHTML = `<h2>Patent coverage by country</h2>
      <div class="panel-empty"><p>Select a country on the map, or open a status below and pick a country, to see the patents relevant to this entry there.</p></div>
      ${list || '<p class="panel-empty">No country-level patent information for this entry.</p>'}
      ${noCountry.length ? `<div class="section-title">Families without country detail (${noCountry.length})</div><ul class="fam-list">` +
        noCountry.map(f => `<li><span class="fam-wo">${esc(f.wo)}</span> — ${esc(f.description)}<div class="tags" style="margin:4px 0 0">${typeTags(f)}${f.family_status ? `<span class="tag">${esc(f.family_status)}</span>` : ''}</div></li>`).join('') + '</ul>' : ''}`;
    panel.querySelectorAll('[data-iso]').forEach(b => b.onclick = () => selectCountry(b.dataset.iso));
    panel.querySelectorAll('details[data-group]').forEach(d => d.ontoggle = () => {
      d.open ? state.openGroups.add(d.dataset.group) : state.openGroups.delete(d.dataset.group);
    });
  }

  // ---------- date slider (AccessPaL-style, future only) ----------
  // Stops: today, then every distinct expiry date still ahead among granted/filed records of
  // the shown families. Choosing an expiry date shows the situation the day after it.
  let stops = ['today'];
  function computeStops() {
    const dates = new Set();
    // All families (compound filter only), not just a selected one, so selecting a family never moves the date.
    for (const fam of byId.get(state.entryId).families.filter(f => !state.compoundOnly || f.compound))
      for (const c of fam.countries)
        for (const r of c.records)
          if ((r.status === 'granted' || r.status === 'filed') && r.expiry && r.expiry >= TODAY) dates.add(r.expiry);
    stops = ['today', ...[...dates].sort()];
  }
  function setStop(i) {
    state.stop = Math.max(0, Math.min(stops.length - 1, i));
    state.day = state.stop === 0 ? null : nextDay(stops[state.stop]);
    redraw();
  }
  function drawSlider() {
    const el = document.getElementById('slider');
    if (stops.length < 2) {
      el.innerHTML = '<div class="slider-empty">No granted or filed patent with a future expiry date for this entry, so there is no timeline to move through.</div>';
      return;
    }
    renderSlider(el, stops, state.stop, setStop, {
      active: s => s === 'today' ? 'Today' : `After ${longDate(s)}`,
      aria: s => s === 'today' ? 'Today' : 'After ' + longDate(s),
      title: s => s === 'today' ? 'Today' : 'Expiry ' + longDate(s),
    });
  }
  /** AccessPaL-style stepper shared by the entry and country views. Stops are evenly spaced:
   *  expiry dates cluster in a few years, and real-time spacing made them impossible to click.
   *  Timelines elsewhere keep real time. `stopsArr[0]` is always 'today'. */
  function renderSlider(el, stopsArr, active, onPick, fmt) {
    const n = stopsArr.length - 1;
    const posOf = i => (i / n) * 100;
    const labelPos = i => Math.min(94, Math.max(6, posOf(i)));   // where labels are actually drawn
    const short = s => s === 'today' ? 'Today' : s.slice(0, 4);
    // The active label; then a year label at the first stop of each year where it does not crowd
    // the active label or the previous one; and the last stop when there is room.
    const shown = new Set([active]);
    let last = -100, lastYear = null;
    stopsArr.forEach((s, i) => {
      const p = labelPos(i), yr = s.slice(0, 4);
      if (yr === lastYear) return;
      lastYear = yr;
      if (i !== active && Math.abs(p - labelPos(active)) < 16) return;
      if (p - last >= 9) { shown.add(i); last = p; }
    });
    const yearShown = [...shown].some(i => i !== n && stopsArr[i].slice(0, 4) === stopsArr[n].slice(0, 4));
    if (n !== active && !yearShown && Math.abs(labelPos(n) - labelPos(active)) >= 16) {
      for (const i of [...shown]) if (i !== active && i !== 0 && i !== n && labelPos(n) - labelPos(i) < 9) shown.delete(i);
      shown.add(n);
    }
    el.innerHTML = `<button type="button" class="arrow" data-step="-1" aria-label="Earlier date" ${active === 0 ? 'disabled' : ''}>‹</button>
      <div class="slider-track"><div class="slider-line"></div>
      ${stopsArr.map((s, i) => `<button type="button" class="slider-stop${i === active ? ' active' : ''}" style="left:${posOf(i)}%"
          data-i="${i}" aria-label="${esc(fmt.aria(s))}" aria-pressed="${i === active}" title="${esc(fmt.title(s))}"></button>`).join('')}
      ${[...shown].map(i => `<button type="button" class="slider-label${i === active ? ' active' : ''}" data-i="${i}" tabindex="-1" style="left:${labelPos(i)}%" title="${esc(fmt.title(stopsArr[i]))}">${esc(i === active ? fmt.active(stopsArr[i]) : short(stopsArr[i]))}</button>`).join('')}
      </div>
      <button type="button" class="arrow" data-step="1" aria-label="Later date" ${active === n ? 'disabled' : ''}>›</button>`;
    const pick = i => { onPick(Math.max(0, Math.min(n, i))); el.querySelector('.slider-stop.active')?.focus(); };
    el.querySelectorAll('.slider-label').forEach(b => { b.onclick = () => onPick(+b.dataset.i); });
    el.querySelectorAll('.slider-stop').forEach(b => {
      b.onclick = () => onPick(+b.dataset.i);
      b.onkeydown = ev => {
        if (ev.key === 'ArrowRight') { pick(active + 1); ev.preventDefault(); }
        if (ev.key === 'ArrowLeft') { pick(active - 1); ev.preventDefault(); }
      };
    });
    el.querySelectorAll('.arrow').forEach(b => b.onclick = () => onPick(Math.max(0, Math.min(n, active + +b.dataset.step))));
  }
  function drawAsOf() {
    const e = byId.get(state.entryId);
    const src = e.source === 'medspal' ? 'MedsPaL' : 'the LAPaL patent card';
    const el = document.getElementById('asof');
    el.classList.toggle('future', !!state.day);
    el.innerHTML = state.day
      ? `Showing <b>from ${longDate(state.day)}</b>: patents expected to have expired by then are shown as not in force. Projection from expected expiry dates only; it assumes no other change in status.`
      : `Showing <b>today</b>: status as recorded in ${src}.`;
    if (state.famFocus) {
      const f = e.families.find(x => x.id === state.famFocus);
      el.insertAdjacentHTML('beforeend', `<div class="focus-note">Showing one patent family only: <b>${esc(f ? f.wo : '')}</b> — ${esc(f ? f.description : '')} ` +
        `<button type="button" id="focus-clear">Show all families</button></div>`);
      document.getElementById('focus-clear').onclick = () => setFocus(null);
    }
  }

  // ---------- patent families in force on the selected date (Lobna, 27 Oct) ----------
  // Which patents are behind the map at the slider date: per family, the countries where it is
  // granted or filed on that date, and the families that have dropped out since today.
  function familyCounts(fam, day) {
    const byCountry = new Map();
    let latest = null;
    for (const c of fam.countries) {
      if (state.iso && c.iso2 !== state.iso) continue;
      for (const r of c.records) {
        const st = statusOf(r, day);
        if ((RANK[st] || 0) > (RANK[byCountry.get(c.iso2)] || 0)) byCountry.set(c.iso2, st);
        if (st === 'granted' || st === 'filed') {
          const exp = r.expiry || fam.expiry;
          if (exp && (!latest || exp > latest)) latest = exp;
        }
      }
    }
    const v = [...byCountry.values()];
    return { granted: v.filter(s => s === 'granted').length, filed: v.filter(s => s === 'filed').length, latest };
  }
  /** Countries of one family by status on `day` (all countries, whatever country is selected). */
  function familyCountries(fam, day) {
    const best = new Map();
    for (const c of fam.countries)
      for (const r of c.records) {
        const st = statusOf(r, day);
        if ((RANK[st] || 0) > (RANK[best.get(c.iso2)] || 0)) best.set(c.iso2, st);
      }
    return Object.keys(LABEL).map(k => [k, [...best].filter(([, st]) => st === k).map(([iso]) => iso)
      .sort((a, b) => cname(a).localeCompare(cname(b)))]).filter(([, l]) => l.length);
  }
  /* Clicking a family row selects it (Lobna, 29 Oct): the map shows that family only, its row opens
   * to list its countries, and the date stays put. Only the expiry link moves the date slider. */
  function drawInForce() {
    const host = document.getElementById('inforce');
    const e = byId.get(state.entryId);
    // All families (compound filter only), so the other rows stay visible while one is selected.
    const fams = e.families.filter(f => !state.compoundOnly || f.compound);
    const where = state.iso ? ` in ${cname(state.iso)}` : '';
    const rows = fams.map(f => ({ f, now: familyCounts(f, state.day), today: familyCounts(f, null) }));
    const live = rows.filter(r => r.now.granted + r.now.filed > 0)
      .sort((a, b) => String(b.now.latest || '').localeCompare(String(a.now.latest || '')));
    const gone = state.day ? rows.filter(r => r.today.granted + r.today.filed > 0 && r.now.granted + r.now.filed === 0) : [];
    const sel = state.famFocus ? fams.find(f => f.id === state.famFocus) : null;
    const title = state.day ? `Patent families still in force from ${longDate(state.day)}${where}` : `Patent families in force today${where}`;
    const sub = `${live.length} of ${fams.length} famil${fams.length === 1 ? 'y has' : 'ies have'} at least one patent granted or filed${where}` +
      (state.day ? ', if expected expiry dates hold.' : ' (status as recorded).') +
      (live.length ? ' Click a family to show it alone on the map and list its countries; click its expiry date to see the map after that date.' : '');
    const n = (k, v) => `<span class="n"><i style="background:${COLOR[k]}"></i>${v} countr${v === 1 ? 'y' : 'ies'}</span>`;
    const detail = f => {
      const groups = familyCountries(f, state.day);
      return `<tr class="if-detail"><td colspan="${state.iso ? 4 : 5}">` + (groups.length ? groups.map(([k, list]) =>
        `<div class="oc-group"><span class="oc-label">${statusTag(k, LABEL[k])} ${list.length}</span><div class="tags">` +
        list.map(i => `<button type="button" class="tag" data-go="${i}" title="Open ${esc(cname(i))}">${flag(i)} ${esc(cname(i))}</button>`).join('') +
        '</div></div>').join('') : '<p class="oc-empty">No country record for this family.</p>') + '</td></tr>';
    };
    const table = live.length ? `<div class="if-wrap"><table class="if${sel ? ' has-sel' : ''}"><thead><tr><th>Patent family</th><th class="hide-sm">Patent type</th>` +
      `<th class="num">${state.iso ? 'Status' : 'Granted in'}</th>${state.iso ? '' : '<th class="num">Filed in</th>'}<th class="num">Expected expiry</th></tr></thead><tbody>` +
      live.map(r => {
        const on = sel && sel.id === r.f.id;
        const status = state.iso ? `<td class="num">${statusTag(r.now.granted ? 'granted' : 'filed', r.now.granted ? 'Granted' : 'Filed')}</td>`
          : `<td class="num">${n('granted', r.now.granted)}</td><td class="num">${n('filed', r.now.filed)}</td>`;
        const exp = r.now.latest && r.now.latest >= TODAY  // past dates are not on the slider
          ? `<button type="button" class="if-exp" data-exp="${esc(r.now.latest)}" title="Move the date slider to just after ${esc(longDate(r.now.latest))}">${fmtDate(r.now.latest)} <span>→ map after this date</span></button>`
          : fmtDate(r.now.latest);
        return `<tr class="if-row${on ? ' selected' : ''}" data-fam="${esc(r.f.id)}" tabindex="0" aria-expanded="${!!on}" ` +
          `title="${on ? 'Show all families again' : 'Show this family alone on the map'}">` +
          `<td><div class="wo"><span class="caret">${on ? '▾' : '▸'}</span>${esc(r.f.wo)}</div><div class="desc">${esc(r.f.description)}</div></td>` +
          `<td class="hide-sm">${(r.f.categories || []).map(c => `<span class="tag type">${esc(c)}</span>`).join(' ')}</td>` +
          `${status}<td class="num">${exp}</td></tr>` + (on ? detail(r.f) : '');
      }).join('') + '</tbody></table></div>'
      : `<p class="panel-empty">No patent family is granted or filed${where} on this date.</p>`;
    const goneHtml = gone.length ? `<p class="if-gone"><b>No longer in force by this date (${gone.length}):</b> ` +
      gone.sort((a, b) => String(b.today.latest).localeCompare(String(a.today.latest))).map(r =>
        `<button type="button" class="tag${sel && sel.id === r.f.id ? ' selected' : ''}" data-fam="${esc(r.f.id)}" title="${esc(r.f.description)} — show this family alone on the map">${esc(r.f.wo)} · expires ${fmtDate(r.today.latest)}</button>`).join(' ') + '</p>' : '';
    const bar = sel ? `<div class="focus-note">Showing <b>${esc(sel.wo)}</b> only — ${esc(sel.description)} <button type="button" data-clear>Show all families</button></div>` : '';
    host.innerHTML = `<h3>${esc(title)}</h3><p class="if-sub">${esc(sub)}</p>${bar}${table}${goneHtml}`;
    const toggle = id => setFocus(state.famFocus === id ? null : id);
    host.querySelectorAll('[data-fam]').forEach(el => {
      el.onclick = () => toggle(el.dataset.fam);
      if (el.tagName === 'TR') el.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { toggle(el.dataset.fam); ev.preventDefault(); } };
    });
    host.querySelector('[data-clear]')?.addEventListener('click', () => setFocus(null));
    host.querySelectorAll('.if-exp').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      const i = stops.indexOf(b.dataset.exp);
      if (i > 0) setStop(i); else redraw();
    });
    host.querySelectorAll('[data-go]').forEach(b => b.onclick = ev => { ev.stopPropagation(); selectCountry(b.dataset.go); });
  }

  // ---------- family timeline (filing year -> expiry), MedsPaL-style grouping ----------
  function famStatus(fam) {
    let best = null;
    for (const c of fam.countries) {
      if (state.iso && c.iso2 !== state.iso) continue;
      for (const r of c.records) {
        const st = statusOf(r, state.day);
        if (st && (RANK[st] || 0) > (RANK[best] || 0)) best = st;
      }
    }
    return best;
  }
  function drawTimeline() {
    const e = byId.get(state.entryId);
    // All families (compound filter only): a selected family is highlighted, the others dimmed, as in
    // the "families in force" table above (Lobna, 29 Oct).
    const fams = e.families.filter(f => !state.compoundOnly || f.compound).slice()
      .sort((a, b) => String(a.filing || '9999').localeCompare(String(b.filing || '9999')) || String(a.wo).localeCompare(String(b.wo)));
    const selId = state.famFocus;
    document.getElementById('tl-scope').textContent =
      `${fams.length} famil${fams.length === 1 ? 'y' : 'ies'}${state.compoundOnly ? ' with a compound patent' : ''}` + (state.iso ? ` · ${cname(state.iso)}` : '');
    document.getElementById('tl-where').textContent = state.iso ? `in ${cname(state.iso)}` : 'in any country';
    const host = document.getElementById('timeline');
    const tls = document.getElementById('tl-summary');
    if (!fams.length) { tls.textContent = ''; host.innerHTML = '<p class="panel-empty">No patent family to show.</p>'; return; }
    {
      const filed = fams.map(f => f.filing).filter(Boolean).sort(), exps = fams.map(f => f.expiry).filter(Boolean).sort();
      const live = fams.filter(f => { const st = famStatus(f); return st === 'granted' || st === 'filed'; }).length;
      tls.textContent = `${plural(fams.length, 'patent family', 'patent families')}` +
        (filed.length ? `, filed ${filed[0].slice(0, 4) === filed[filed.length - 1].slice(0, 4) ? 'in ' + filed[0].slice(0, 4) : 'between ' + filed[0].slice(0, 4) + ' and ' + filed[filed.length - 1].slice(0, 4)}` : '') +
        (exps.length ? `, with expected expiries from ${longDate(exps[0])} to ${longDate(exps[exps.length - 1])}` : '') +
        `. ${state.day ? 'From ' + longDate(state.day) : 'Today'}, ${live} ${live === 1 ? 'has' : 'have'} a granted or filed patent ${state.iso ? 'in ' + cname(state.iso) : 'in at least one low- or middle-income country'}.`;
    }

    const rows = []; let lastYear;
    for (const f of fams) {
      const y = f.filing ? f.filing.slice(0, 4) : 'Filing date unknown';
      if (y !== lastYear) { rows.push({ year: y }); lastYear = y; }
      rows.push({ fam: f });
    }
    const width = Math.max(460, host.clientWidth || 900);
    const LEFT = Math.round(Math.min(300, width * 0.36)), RIGHT = 24, TOP = 28, ROW = 34, YEAR = 24;
    const maxChars = Math.floor((LEFT - 20) / 6.4);
    // The selected family opens below its bar: one wrapped line per status, country names clickable.
    const LINE = 18, CH = 6.6, wrapW = width - RIGHT - 40;
    const detailLines = f => familyCountries(f, state.day).flatMap(([k, list]) => {
      const lines = [{ k, head: `${LABEL[k]} · ${list.length}: `, items: [] }];
      let used = lines[0].head.length * CH;
      list.forEach(iso => {
        const w = (cname(iso).length + 2) * CH;
        if (used + w > wrapW && lines[lines.length - 1].items.length) { lines.push({ k, head: '', items: [] }); used = 0; }
        lines[lines.length - 1].items.push(iso); used += w;
      });
      lines[lines.length - 1].last = true;
      return lines;
    });
    let y = TOP; rows.forEach(r => {
      r.y = y; y += r.year ? YEAR : ROW;
      if (r.fam && r.fam.id === selId) { r.detail = detailLines(r.fam); r.dh = Math.max(1, r.detail.length) * LINE + 34; y += r.dh; }
    });
    const height = y + 30;
    const dates = fams.flatMap(f => [f.filing, f.expiry]).filter(Boolean).concat([TODAY, state.day || TODAY]);
    const parse = s => new Date(s + 'T00:00:00Z');
    const x = d3.scaleUtc()
      .domain([d3.utcYear.floor(parse(d3.min(dates))), d3.utcYear.offset(d3.utcYear.floor(parse(d3.max(dates))), 1)])
      .range([LEFT, width - RIGHT]);
    const colorOf = st => st ? COLOR[st] : (state.iso ? 'var(--none-hic)' : 'var(--none-lmic)');

    host.innerHTML = '';
    const s = d3.select(host).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height)
      .attr('role', 'img').attr('aria-label', 'Timeline of patent families from filing to expected expiry').attr('aria-describedby', 'tl-summary');
    s.append('g').attr('class', 'grid').selectAll('line').data(x.ticks(d3.utcYear.every(5))).join('line')
      .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', TOP - 6).attr('y2', height - 26);
    s.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - 26})`)
      .call(d3.axisBottom(x).ticks(d3.utcYear.every(width > 1000 ? 2 : 5)).tickFormat(d3.utcFormat('%Y')).tickSizeOuter(0));

    const g = s.append('g');
    for (const r of rows) {
      if (r.year) {
        g.append('text').attr('class', 'year-label').attr('x', 4).attr('y', r.y + 16).text(r.year === 'Filing date unknown' ? r.year : 'Filed ' + r.year);
        g.append('line').attr('x1', 4).attr('x2', width - RIGHT).attr('y1', r.y + 21).attr('y2', r.y + 21).attr('stroke', 'var(--line)');
        continue;
      }
      const f = r.fam, st = famStatus(f), cy = r.y + ROW / 2;
      const desc = f.description.length > maxChars ? f.description.slice(0, maxChars - 1) + '…' : f.description;
      const on = f.id === selId;
      const row = g.append('g').attr('class', 'tl-row' + (on ? ' selected' : selId ? ' dim' : '')).attr('tabindex', 0).attr('role', 'button')
        .attr('aria-expanded', String(on)).attr('aria-label', `${f.wo}: ${on ? 'show all families again' : 'show this family alone on the map and list its countries'}`);
      row.append('rect').attr('class', 'tl-row-bg').attr('x', 0).attr('y', r.y).attr('width', width).attr('height', ROW + (on ? r.dh : 0));
      const toggle = () => setFocus(on ? null : f.id);
      row.on('click', toggle).on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
      row.append('title').text(`${f.wo} — ${f.description}\nFiled ${fmtDate(f.filing)}${f.filing_estimated ? ' (estimated)' : ''} · expected expiry ${fmtDate(f.expiry)}\n` +
        (st ? `${LABEL[st]} ${state.iso ? 'in ' + cname(state.iso) : 'in at least one country'}` : (f.countries.length ? 'No record in this country' : 'No country detail')) +
        ((f.categories || []).length ? `\n${f.categories.join(', ')}` : ''));
      // Every patent type, as in the table above (it used to show "compound" only).
      const label = f.wo + ((f.categories || []).length ? ' · ' + f.categories.join(', ') : '');
      row.append('text').attr('class', 'caret').attr('x', 2).attr('y', cy - 2).text(on ? '▾' : '▸');
      row.append('text').attr('class', 'fam-label').attr('x', 14).attr('y', cy - 2)
        .text(label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label);
      row.append('text').attr('class', 'fam-sub').attr('x', 14).attr('y', cy + 12).text(desc);
      if (f.filing && f.expiry) {
        const x0 = x(parse(f.filing)), x1 = x(parse(f.expiry));
        row.append('rect').attr('class', 'bar').attr('x', x0).attr('y', cy - 6).attr('width', Math.max(2, x1 - x0)).attr('height', 12).attr('rx', 3)
          .attr('fill', colorOf(st)).attr('opacity', f.filing_estimated ? 0.55 : 1)
          .attr('stroke', f.filing_estimated ? 'var(--ink-2)' : 'none').attr('stroke-dasharray', f.filing_estimated ? '3 2' : null);
        const stopIndex = stops.indexOf(f.expiry);
        row.append('circle').attr('class', stopIndex > 0 ? 'bar-end' : 'bar-end-static').attr('cx', x1).attr('cy', cy).attr('r', 6)
          .attr('fill', '#fff').attr('stroke', colorOf(st) === 'var(--none-hic)' ? 'var(--muted)' : colorOf(st)).attr('stroke-width', 2.5)
          .on('click', ev => { ev.stopPropagation(); if (stopIndex > 0) setStop(stopIndex); })
          .append('title').text(stopIndex > 0 ? `Expected expiry ${longDate(f.expiry)}: click to see the map after this date` : `Expected expiry ${longDate(f.expiry)}`);
      } else {
        row.append('text').attr('class', 'fam-sub').attr('x', LEFT).attr('y', cy + 4).text(f.expiry ? 'Filing date unknown' : 'No expiry date given');
      }
      if (on) {
        // Countries of the selected family on the date shown; each name opens that country's cards.
        let ly = r.y + ROW + 16;
        const d = row.append('g').attr('class', 'tl-detail');
        if (!r.detail.length) d.append('text').attr('class', 'fam-sub').attr('x', 28).attr('y', ly).text('No country record for this family.');
        r.detail.forEach(line => {
          let xx = 28;
          if (line.head) {
            d.append('rect').attr('x', xx).attr('y', ly - 9).attr('width', 9).attr('height', 9).attr('rx', 2).attr('fill', COLOR[line.k]);
            xx += 14;
            const h = d.append('text').attr('class', 'tl-dhead').attr('x', xx).attr('y', ly).text(line.head);
            xx += h.node().getComputedTextLength() + 4;
          }
          line.items.forEach((iso, k) => {
            const t = d.append('text').attr('class', 'tl-country').attr('x', xx).attr('y', ly).attr('tabindex', 0).attr('role', 'link')
              .text(cname(iso) + (k < line.items.length - 1 || !line.last ? ',' : ''));
            t.append('title').text(`Open ${cname(iso)}`);
            const go = ev => { ev.stopPropagation(); selectCountry(iso); document.getElementById('panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
            t.on('click', go).on('keydown', ev => { if (ev.key === 'Enter') go(ev); });
            xx += t.node().getComputedTextLength() + 6;  // real width; the wrap above uses a safe estimate
          });
          ly += LINE;
        });
        const allBtn = d.append('text').attr('class', 'tl-country tl-all').attr('x', 28).attr('y', ly + 4).attr('tabindex', 0).attr('role', 'button').text('Show all families');
        allBtn.on('click', ev => { ev.stopPropagation(); setFocus(null); }).on('keydown', ev => { if (ev.key === 'Enter') { ev.stopPropagation(); setFocus(null); } });
      }
    }
    const line = (d, cls, text, color) => {
      const xx = x(parse(d));
      s.append('line').attr('class', cls).attr('x1', xx).attr('x2', xx).attr('y1', TOP - 14).attr('y2', height - 26);
      const nearEnd = xx > width - RIGHT - 110;  // keep the label inside the chart near the right edge
      s.append('text').attr('class', 'line-label').attr('x', nearEnd ? xx - 4 : xx + 4).attr('text-anchor', nearEnd ? 'end' : 'start')
        .attr('y', TOP - 16).attr('fill', color).text(text);
    };
    line(TODAY, 'today-line', 'Today', 'var(--ink-2)');
    if (state.day) line(state.day, 'date-line', longDate(state.day), 'var(--accent)');

    const sw = (c, t, extra = '') => `<span class="swatch"><i style="background:${c};${extra}"></i>${t}</span>`;
    host.insertAdjacentHTML('beforeend', `<div class="tl-legend">${sw(COLOR.granted, 'Granted')}${sw(COLOR.filed, 'Filed')}${sw(COLOR.not_in_force, 'Not in force')}` +
      sw(state.iso ? 'var(--none-hic)' : 'var(--none-lmic)', state.iso ? 'No record in this country' : 'No country detail') +
      (fams.some(f => f.filing_estimated) ? sw('var(--granted)', 'Estimated filing date', 'opacity:.55;border:1px dashed var(--ink-2)') : '') + '</div>');
  }

  // ---------- map / table toggle (as on the regulatory landscape) ----------
  let sortKey = 'status';
  function drawTable() {
    const host = document.getElementById('country-table');
    if (state.mt !== 'table') { host.hidden = true; document.getElementById('map-wrap').hidden = false; return; }
    host.hidden = false; document.getElementById('map-wrap').hidden = true;
    const rows = [...index.entries()].filter(([, s]) => s.status).map(([iso, s]) => {
      const live = s.records.filter(r => r.st === 'granted' || r.st === 'filed');
      return { iso, name: cname(iso), income: C[iso] ? C[iso].income : '', status: s.status, n: s.records.length,
        latest: live.map(r => r.rec.expiry || r.fam.expiry).filter(Boolean).sort().pop() || '',
        nums: [...new Set(s.records.map(r => r.rec.number || r.fam.wo))] };
    });
    const cmp = {
      status: (a, b) => RANK[b.status] - RANK[a.status] || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      income: (a, b) => a.income.localeCompare(b.income) || a.name.localeCompare(b.name),
      latest: (a, b) => b.latest.localeCompare(a.latest) || a.name.localeCompare(b.name),
      n: (a, b) => b.n - a.n || a.name.localeCompare(b.name),
    }[sortKey];
    rows.sort(cmp);
    const th = (k, t) => `<th data-k="${k}" aria-sort="${sortKey === k ? 'descending' : 'none'}">${t}${sortKey === k ? ' ▾' : ''}</th>`;
    host.innerHTML = `<table class="ct"><thead><tr>${th('name', 'Country')}${th('income', 'Income level')}${th('status', 'Status')}${th('latest', 'Latest expected expiry')}${th('n', 'Patent records')}<th>Patent numbers</th></tr></thead><tbody>` +
      rows.map(r => `<tr data-iso="${r.iso}" class="${r.iso === state.iso ? 'selected' : ''}"><td>${flag(r.iso)} ${esc(r.name)}</td><td>${esc(r.income)}</td>` +
        `<td>${statusTag(r.status, LABEL[r.status])}</td><td class="num">${fmtDate(r.latest)}</td><td class="num">${r.n}</td>` +
        `<td style="font-size:12px;color:var(--ink-2)">${esc(r.nums.slice(0, 4).join(', '))}${r.nums.length > 4 ? ` +${r.nums.length - 4}` : ''}</td></tr>`).join('') +
      `</tbody></table>` + (rows.length ? '' : '<p class="panel-empty" style="padding:10px">No country-level patent information for this entry.</p>');
    host.querySelectorAll('th[data-k]').forEach(t => t.onclick = () => { sortKey = t.dataset.k; drawTable(); });
    host.querySelectorAll('tr[data-iso]').forEach(t => t.onclick = () => selectCountry(t.dataset.iso));
  }
  document.querySelectorAll('.maptable button').forEach(b => b.onclick = () => {
    state.mt = b.dataset.mt;
    document.querySelectorAll('.maptable button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    drawTable(); writeHash();
  });

  // ---------- Landscape by product: filter column ----------
  const fTa = document.getElementById('f-ta'), fSearch = document.getElementById('f-search'), fList = document.getElementById('f-entries');
  const fPrelim = document.getElementById('f-prelim');
  const allTas = [...new Set(D.entries.flatMap(e => e.therapeutic_areas || []))].sort((a, b) => a.localeCompare(b));
  fTa.insertAdjacentHTML('beforeend', allTas.map(t => `<option>${esc(t)}</option>`).join(''));
  function landscapeEntries() {
    const types = [...document.querySelectorAll('#filters [data-type]')].filter(c => c.checked).map(c => c.dataset.type);
    const ta = fTa.value, q = fSearch.value.trim().toLowerCase();
    return D.entries.filter(e => types.includes(e.type) && (fPrelim.checked || e.source === 'medspal')
      && (!ta || (e.therapeutic_areas || []).includes(ta)) && (!q || e.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  function drawFilters() {
    const items = landscapeEntries();
    fList.innerHTML = items.map(e => `<button type="button" role="option" data-id="${esc(e.id)}" aria-selected="${e.id === state.entryId}">${esc(e.name)}` +
      `<span class="sub">${esc(e.type)}${(e.therapeutic_areas || []).length ? ' · ' + esc(e.therapeutic_areas.join(', ')) : ''}${e.preliminary ? ' · preliminary' : ''}</span></button>`).join('')
      || '<div class="empty">No entry matches these filters.</div>';
    fList.querySelectorAll('button').forEach(b => b.onclick = () => setEntry(b.dataset.id, state.stop ? stops[state.stop] : null));
  }
  [fTa, fPrelim, ...document.querySelectorAll('#filters [data-type]')].forEach(el => el.addEventListener('change', drawFilters));
  fSearch.addEventListener('input', drawFilters);

  // ---------- Landscape by country (HIV, MedsPaL entries; one row per MedsPaL product) ----------
  // Entries that share a MedsPaL product (a compound page and its formulation page) carry the
  // same patent data, so they become one row named after both.
  const hivProducts = (() => {
    const by = new Map();
    for (const e of D.entries.filter(e => e.hiv && e.source === 'medspal')) {
      if (!by.has(e.medspal_uuid)) by.set(e.medspal_uuid, { key: e.medspal_uuid, entries: [], families: e.families });
      by.get(e.medspal_uuid).entries.push(e);
    }
    return [...by.values()].map(p => {
      p.entries.sort((a, b) => (a.type === 'Formulation & regimen' ? 0 : 1) - (b.type === 'Formulation & regimen' ? 0 : 1) || a.name.localeCompare(b.name));
      p.name = p.entries[0].name;
      p.also = p.entries.slice(1).map(e => e.name);
      return p;
    }).sort((a, b) => a.name.localeCompare(b.name));
  })();
  // sort: row order; hidden: product keys the user has hidden (kept in the address bar).
  const cv = { iso: 'ZA', compound: false, stop: 0, day: null, stops: ['today'], sel: null, sort: 'status', hidden: new Set(),
    order: [], hiddenFams: new Set() };  // order: product keys for the manual order; hiddenFams: 'productKey|familyId'
  const famKey = (p, f) => p.key + '|' + f.id;
  const SORT_LABEL = { manual: 'your own order', status: 'status (granted first)', product: 'product name', type: 'patent type (in force; families grouped by type)', 'expiry-late': 'expiry date (latest first)', 'expiry-soon': 'expiry date (soonest first)' };
  // Patent types from the most to the least central to the product; anything else after.
  const TYPE_ORDER = ['Compound', 'Salt', 'Polymorphs', 'Combination', 'Composition', 'Dose/Regimen', 'Use', 'Process', 'Intermediate(s)', 'Device'];
  const typeRank = f => Math.min(99, ...(f.categories || []).map(c => { const i = TYPE_ORDER.indexOf(c); return i < 0 ? 50 : i; }));
  const liveType = r => Math.min(999, ...r.fams.filter(x => x.st === 'granted' || x.st === 'filed').map(x => typeRank(x.f)));
  const latestExp = r => d3.max(r.fams, x => x.expiry) || '';
  const soonestExp = r => d3.min(r.fams, x => x.expiry) || '9999';
  /** Products (rows) and families within them, in the order chosen by the user. */
  function cvSortRows(rows) {
    const byFiling = (a, b) => String(a.f.filing).localeCompare(String(b.f.filing));
    if (cv.sort === 'manual') {
      // Rows in the order the user set; any not placed yet go last, by status.
      const pos = k => { const i = cv.order.indexOf(k); return i < 0 ? 1e6 : i; };
      rows.forEach(r => r.fams.sort(byFiling));
      return rows.sort((a, b) => pos(a.p.key) - pos(b.p.key) || (RANK[b.best] || 0) - (RANK[a.best] || 0) || a.p.name.localeCompare(b.p.name));
    }
    const famCmp = {
      type: (a, b) => typeRank(a.f) - typeRank(b.f) || byFiling(a, b),
      'expiry-late': (a, b) => String(b.expiry || '').localeCompare(String(a.expiry || '')),
      'expiry-soon': (a, b) => String(a.expiry || '9999').localeCompare(String(b.expiry || '9999')),
    }[cv.sort] || byFiling;
    rows.forEach(r => r.fams.sort(famCmp));
    const rowCmp = {
      status: (a, b) => (RANK[b.best] || 0) - (RANK[a.best] || 0) || latestExp(b).localeCompare(latestExp(a)),
      product: (a, b) => a.p.name.localeCompare(b.p.name),
      // Most central type among the families still granted or filed on the date shown; products with none last.
      type: (a, b) => liveType(a) - liveType(b) || a.p.name.localeCompare(b.p.name),
      'expiry-late': (a, b) => latestExp(b).localeCompare(latestExp(a)) || a.p.name.localeCompare(b.p.name),
      'expiry-soon': (a, b) => soonestExp(a).localeCompare(soonestExp(b)) || a.p.name.localeCompare(b.p.name),
    }[cv.sort];
    return rows.sort(rowCmp);
  }
  /** Plain-language description of the user's edits, for the notice and the exports ('' if none). */
  /** Hidden patent families as [key, product, family], for the notice and exports. */
  function cvHiddenFams() {
    const out = [];
    for (const p of hivProducts) for (const f of p.families) if (cv.hiddenFams.has(famKey(p, f))) out.push([famKey(p, f), p, f]);
    return out;
  }
  /** Products shown in the chart for `iso` on `day`, without the rows and families the user hid. */
  function cvRows(iso, day) {
    const shown = hivProducts.filter(p => !cv.hidden.has(p.key)).map(p => {
      const r = { p, ...productIn(p, iso, day) };
      const all = r.fams.length;
      r.fams = r.fams.filter(fx => !cv.hiddenFams.has(famKey(p, fx.f)));
      r.famsHidden = all - r.fams.length;
      r.best = r.fams.reduce((b, fx) => (RANK[fx.st] || 0) > (RANK[b] || 0) ? fx.st : b, null);
      return r;
    });
    return { shown, withRec: cvSortRows(shown.filter(r => r.fams.length)),
      without: shown.filter(r => !r.fams.length && !r.famsHidden), allHidden: shown.filter(r => !r.fams.length && r.famsHidden) };
  }
  function cvEdits() {
    const hid = hivProducts.filter(p => cv.hidden.has(p.key)).map(p => p.name);
    const hf = cvHiddenFams();
    const parts = [];
    if (cv.sort !== 'status') parts.push(cv.sort === 'manual' ? 'rows in your own order' : 'rows ordered by ' + SORT_LABEL[cv.sort]);
    if (hid.length) parts.push(`${hid.length} product${hid.length === 1 ? '' : 's'} hidden (${hid.join(', ')})`);
    if (hf.length) parts.push(`${hf.length} patent famil${hf.length === 1 ? 'y' : 'ies'} hidden (${hf.map(([, p, f]) => f.wo + ' in ' + p.name).join(', ')})`);
    return parts.length ? 'Edited view: ' + parts.join('; ') : '';
  }
  /** Strongest status of one product in one country on `day`, plus the families recorded there. */
  function productIn(p, iso, day) {
    let best = null; const fams = [];
    for (const f of p.families) {
      if (cv.compound && !f.compound) continue;
      const c = f.countries.find(x => x.iso2 === iso);
      if (!c) continue;
      let fb = null, exp = null;
      for (const r of c.records) {
        const st = statusOf(r, day);
        if (st && (RANK[st] || 0) > (RANK[fb] || 0)) fb = st;
        if ((r.status === 'granted' || r.status === 'filed') && r.expiry && (!exp || r.expiry > exp)) exp = r.expiry;
      }
      fams.push({ f, st: fb, expiry: exp || f.expiry, records: c.records });
      if (fb && (RANK[fb] || 0) > (RANK[best] || 0)) best = fb;
    }
    return { best, fams };
  }
  function cvCountries() {
    const set = new Set();
    for (const p of hivProducts) for (const f of p.families) if (!cv.compound || f.compound) for (const c of f.countries) set.add(c.iso2);
    return [...set].sort((a, b) => cname(a).localeCompare(cname(b)));
  }
  function cvComputeStops() {
    // Yearly stops (1 January) from next year to the year after the last expected expiry.
    let maxY = 0;
    for (const p of hivProducts) for (const f of p.families) if (!cv.compound || f.compound)
      for (const c of f.countries) for (const r of c.records)
        if ((r.status === 'granted' || r.status === 'filed') && r.expiry && r.expiry >= TODAY) maxY = Math.max(maxY, +r.expiry.slice(0, 4));
    cv.stops = ['today'];
    for (let y = +TODAY.slice(0, 4) + 1; y <= maxY + 1; y++) cv.stops.push(y + '-01-01');
    if (cv.stop >= cv.stops.length) cv.stop = cv.stops.length - 1;
    cv.day = cv.stop ? cv.stops[cv.stop] : null;
  }
  function drawCountryView() {
    const sel = document.getElementById('cv-country');
    const isos = cvCountries();
    if (!isos.includes(cv.iso)) cv.iso = isos.includes('ZA') ? 'ZA' : isos[0];
    const opt = i => `<option value="${i}">${esc(cname(i))}</option>`;
    sel.innerHTML = isos.map(opt).join('');
    sel.value = cv.iso;
    document.getElementById('cv-asof').innerHTML = cv.day
      ? `Showing <b>on ${longDate(cv.day)}</b>: patents expected to have expired by then are shown as not in force. Projection from expected expiry dates only.`
      : `Showing <b>today</b>: status as recorded in MedsPaL.`;
    renderSlider(document.getElementById('cv-slider'), cv.stops, cv.stop, i => { cv.stop = i; cv.day = i ? cv.stops[i] : null; drawCountryView(); writeHash(); }, {
      active: s => s === 'today' ? 'Today' : longDate(s), aria: s => s === 'today' ? 'Today' : longDate(s), title: s => s === 'today' ? 'Today' : longDate(s),
    });
    drawCvProducts(); drawMatrix(); writeHash();
  }
  function drawCvProducts() {
    const iso = cv.iso;
    document.getElementById('cv-title').innerHTML = `<span class="flag">${flag(iso)}</span> ${esc(cname(iso))}`;
    const { shown: shownRows, withRec, without, allHidden } = cvRows(iso, cv.day);
    const cnt = k => withRec.filter(r => r.best === k).length;
    document.getElementById('cv-scope').textContent =
      `${C[iso] ? C[iso].income + ' income · ' : ''}${shownRows.length} products${cv.hidden.size ? ` shown (${cv.hidden.size} hidden)` : ''}: ${cnt('granted')} granted, ${cnt('filed')} filed, ${cnt('not_in_force')} not in force, ${without.length} no record`;
    // Notice whenever the user has edited the view, with a way back.
    const edit = document.getElementById('cv-edit-note'), hidList = hivProducts.filter(p => cv.hidden.has(p.key)), hidFams = cvHiddenFams();
    edit.hidden = !cvEdits();
    edit.innerHTML = edit.hidden ? '' : `<b>✎ ${esc(cvEdits().split(':')[0])}:</b> ${esc(cvEdits().slice(cvEdits().indexOf(':') + 2))}. ` +
      `The rows below reflect your changes; the overview across countries still shows every product.<br>` +
      hidList.map(p => `<button type="button" data-unhide="${esc(p.key)}">Show ${esc(p.name)}</button>`).join('') +
      hidFams.map(([k, p, f]) => `<button type="button" data-unhidef="${esc(k)}">Show ${esc(f.wo)} (${esc(p.name)})</button>`).join('') +
      `<button type="button" class="all" data-reset>Reset view</button>`;
    edit.querySelectorAll('[data-unhide]').forEach(b => b.onclick = () => { cv.hidden.delete(b.dataset.unhide); drawCvProducts(); writeHash(); });
    edit.querySelectorAll('[data-unhidef]').forEach(b => b.onclick = () => { cv.hiddenFams.delete(b.dataset.unhidef); drawCvProducts(); writeHash(); });
    edit.querySelector('[data-reset]')?.addEventListener('click', () => {
      cv.hidden.clear(); cv.hiddenFams.clear(); cv.order = []; cv.sort = 'status'; document.getElementById('cv-sort').value = 'status'; drawCvProducts(); writeHash();
    });
    // Licence note: which voluntary licences cover this country, for which products.
    const licNote = document.getElementById('cv-hic-note');
    const inTerr = LIC.filter(l => l.territory[iso]).map(l => {
      const ps = hivProducts.filter(p => p.entries.some(en => l.entries.includes(en.id))).map(p => p.name);
      return `<b>${esc(l.label)}</b> (${esc(l.licensor)}, ${esc(l.type)}${ps.length ? '; ' + esc(ps.join(', ')) : ''})`;
    });
    licNote.hidden = !inTerr.length;
    licNote.innerHTML = inTerr.length ? `<span aria-hidden="true">🤝</span> <b>Voluntary licences:</b> ${esc(cname(iso))} is in the territory of ${inTerr.join('; ')}. ` +
      `These licences ${LIC_MAY}, whatever the patent status shown; check the licence terms.` : '';
    // Legend above the chart: bar and dot colours, plus the date lines.
    {
      const sw = c => `<i style="background:${c}"></i>`;
      const ln = (c, dash) => `<i class="ln" style="border-left:2px ${dash ? 'dashed' : 'solid'} ${c}"></i>`;
      document.getElementById('cv-legend').innerHTML = '<b>Bars and dots:</b>' +
        [[COLOR.granted, 'Granted'], [COLOR.filed, 'Filed'], [COLOR.not_in_force, 'Not in force']].map(([c, t]) => `<span class="swatch">${sw(c)}${t}</span>`).join('') +
        `<span class="swatch">${ln('var(--ink-2)', true)}Today</span>` +
        (cv.day ? `<span class="swatch">${ln('var(--accent)')}Selected date</span>` : '') +
        `<span class="cv-legend-note">The dot before each product shows its best status in this country.</span>`;
    }
    const cvs = document.getElementById('cv-summary');
    {
      const live = withRec.filter(r => r.best === 'granted' || r.best === 'filed');
      const latest = live.flatMap(r => r.fams.filter(x => x.st === 'granted' || x.st === 'filed').map(x => ({ r, exp: x.expiry }))).filter(x => x.exp).sort((a, b) => b.exp.localeCompare(a.exp))[0];
      cvs.innerHTML = `${cv.day ? 'On ' + longDate(cv.day) + ' (projected from expected expiry dates)' : 'As of ' + snapshot()}, of the ${shownRows.length} HIV long-acting products ` +
        `${cv.hidden.size || cv.hiddenFams.size ? 'shown (after your edits)' : 'on LAPaL with MedsPaL patent data'}, <b>${cnt('granted')} ${cnt('granted') === 1 ? 'has' : 'have'} a granted patent in ${esc(cname(iso))}</b>, ` +
        `${cnt('filed')} filed (pending) only, ${cnt('not_in_force')} no longer in force, and ${without.length} no patent recorded` +
        (latest ? `. The latest expected expiry of a granted or filed patent is ${longDate(latest.exp)} (${esc(latest.r.p.name)}).` : '.');
    }
    const host = document.getElementById('cv-products');
    if (!withRec.length) { host.innerHTML = `<p class="panel-empty">No patent record for ${cv.hidden.size ? 'the products shown' : 'these products'} in this country.</p>`; return; }

    const width = Math.max(460, host.clientWidth || 900);
    // Each family bar gets its own labelled line (WO number · patent type) and can be hovered or clicked.
    const LEFT = Math.round(Math.min(280, width * 0.34)), RIGHT = 24, TOP = 28, ROWPAD = 10, BAR = 12, GAP = 10;
    const maxChars = Math.floor((LEFT - 70) / 7.2);  // bold 12px, between the status dot and the grip/eye controls
    const parse = s => new Date(s + 'T00:00:00Z');
    let y = TOP;
    withRec.forEach(r => { r.y = y; r.h = Math.max(40, r.fams.length * (BAR + GAP) - GAP + 2 * ROWPAD); y += r.h; });
    if (cv.sel && !withRec.some(r => r.p.key === cv.sel.key && r.fams.some(fx => fx.f.id === cv.sel.fam))) cv.sel = null;
    const height = y + 30;
    const dates = withRec.flatMap(r => r.fams.flatMap(x => [x.f.filing, x.expiry])).filter(Boolean).concat([TODAY, cv.day || TODAY]);
    const x = d3.scaleUtc().domain([d3.utcYear.floor(parse(d3.min(dates))), d3.utcYear.offset(d3.utcYear.floor(parse(d3.max(dates))), 1)]).range([LEFT, width - RIGHT]);
    host.innerHTML = '';
    const s = d3.select(host).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height)
      .attr('role', 'img').attr('aria-label', `Patents recorded in ${cname(iso)} for each HIV long-acting product`).attr('aria-describedby', 'cv-summary');
    s.append('g').attr('class', 'grid').selectAll('line').data(x.ticks(d3.utcYear.every(5))).join('line')
      .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', TOP - 6).attr('y2', height - 26);
    s.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - 26})`)
      .call(d3.axisBottom(x).ticks(d3.utcYear.every(width > 1000 ? 2 : 5)).tickFormat(d3.utcFormat('%Y')).tickSizeOuter(0));
    const dropLine = s.append('line').attr('class', 'cv-drop').attr('x1', 4).attr('x2', width - RIGHT).attr('visibility', 'hidden');
    for (const r of withRec) {
      const g = s.append('g').attr('class', 'cv-row');
      // Transparent backdrop so hovering anywhere on the row reveals its controls.
      g.append('rect').attr('class', 'cv-row-bg').attr('x', 0).attr('y', r.y).attr('width', width).attr('height', r.h);
      g.append('line').attr('x1', 4).attr('x2', width - RIGHT).attr('y1', r.y + r.h).attr('y2', r.y + r.h).attr('stroke', 'var(--line)');
      const nm = r.p.name.length > maxChars ? r.p.name.slice(0, maxChars - 1) + '…' : r.p.name;
      const link = g.append('a').attr('href', '#').on('click', ev => { ev.preventDefault(); openEntry(r.p.entries[0].id, iso); });
      link.append('text').attr('class', 'fam-label').attr('x', 22).attr('y', r.y + 16).attr('font-weight', 600).text(nm);
      g.append('text').attr('class', 'fam-sub').attr('x', 22).attr('y', r.y + 30)
        .text(`${r.best ? LABEL[r.best] : 'Unknown'} · ${r.fams.length} famil${r.fams.length === 1 ? 'y' : 'ies'}${r.famsHidden ? ` (+${r.famsHidden} hidden)` : ''}`);
      g.append('circle').attr('cx', 12).attr('cy', r.y + 12).attr('r', 5).attr('fill', r.best ? COLOR[r.best] : 'var(--none-lmic)');
      g.append('title').text(`${r.p.name}${r.p.also.length ? ' (also: ' + r.p.also.join(', ') + ')' : ''}\nClick the name to open its patent view`);
      // Grip (drag to reorder; Alt+↑/↓ from the keyboard) and eye (hide), as on the LAPaL HIV
      // dashboard: faint until the row is hovered or focused.
      const ri = withRec.indexOf(r);
      const grip = ctl(g, LEFT - 36, r.y + 12, 'grip', `Drag to reorder ${r.p.name}. With it focused, Alt and the arrow keys also work.`);
      grip.on('keydown', ev => {
        if ((ev.key === 'ArrowUp' || ev.key === 'ArrowDown') && true) {
          ev.preventDefault(); const to = ri + (ev.key === 'ArrowUp' ? -1 : 1);
          if (to >= 0 && to < withRec.length) moveRow(withRec, ri, to);
        }
      });
      grip.call(d3.drag()
        .on('start', () => { g.classed('dragging', true); cvTip && (cvTip.hidden = true); })
        .on('drag', ev => {
          const yy = d3.pointer(ev.sourceEvent, s.node())[1];
          const to = dropIndex(withRec, yy);
          const lineY = to < withRec.length ? withRec[to].y : withRec[withRec.length - 1].y + withRec[withRec.length - 1].h;
          dropLine.attr('y1', lineY).attr('y2', lineY).attr('visibility', 'visible').raise();
        })
        .on('end', ev => {
          g.classed('dragging', false); dropLine.attr('visibility', 'hidden');
          let to = dropIndex(withRec, d3.pointer(ev.sourceEvent, s.node())[1]);
          if (to > ri) to -= 1;  // the row leaves its own place first
          if (to !== ri) moveRow(withRec, ri, to);
        }));
      ctl(g, LEFT - 18, r.y + 12, 'eye', `Hide ${r.p.name} from this chart`)
        .on('click', ev => { ev.stopPropagation(); hideRow(r.p); })
        .on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); hideRow(r.p); } });
      r.fams.forEach((fx, k) => {
        const cy = r.y + ROWPAD + k * (BAR + GAP);
        if (!fx.f.filing || !fx.expiry) return;
        const x0 = x(parse(fx.f.filing)), x1 = x(parse(fx.expiry));
        const sel = cv.sel && cv.sel.key === r.p.key && cv.sel.fam === fx.f.id;
        const fg = g.append('g').attr('class', 'cv-fam' + (sel ? ' selected' : '')).attr('tabindex', 0).attr('role', 'button')
          .attr('aria-label', `${fx.f.wo}, ${fx.f.description}: ${fx.st ? LABEL[fx.st] : 'unknown'}. Show details`);
        // Generous hit area: the whole line of the timeline, not just the 12 px bar.
        fg.append('rect').attr('class', 'cv-hit').attr('x', LEFT).attr('y', cy - GAP / 2).attr('width', width - RIGHT - LEFT).attr('height', BAR + GAP).attr('fill', 'transparent');
        fg.append('rect').attr('class', 'cv-bar').attr('x', x0).attr('y', cy).attr('width', Math.max(2, x1 - x0)).attr('height', BAR).attr('rx', 3)
          .attr('fill', fx.st ? COLOR[fx.st] : 'var(--none-lmic)');
        // Label beside the bar where it fits (right, then left); otherwise the WO number alone;
        // inside the bar only as a last resort.
        const full = `${fx.f.wo}${(fx.f.categories || []).length ? ' · ' + fx.f.categories[0] : ''}`;
        const fits = (t, side) => side === 'right' ? x1 + 6 + t.length * 6.2 <= width - 20 : x0 - 6 - t.length * 6.2 >= LEFT - 8;
        let label = full, lx, anchor = 'start', inside = false;
        if (fits(full, 'right')) lx = x1 + 6;
        else if (fits(full, 'left')) { lx = x0 - 6; anchor = 'end'; }
        else if (fits(fx.f.wo, 'right')) { label = fx.f.wo; lx = x1 + 6; }
        else if (fits(fx.f.wo, 'left')) { label = fx.f.wo; lx = x0 - 6; anchor = 'end'; }
        else { label = fx.f.wo; lx = x0 + 6; inside = true; }
        fg.append('text').attr('class', 'cv-bar-label' + (inside ? ' inside' : '')).attr('x', lx).attr('y', cy + BAR - 2)
          .attr('text-anchor', anchor).text(label);
        ctl(fg, width - 12, cy + BAR / 2, 'eye', `Hide ${fx.f.wo} for ${r.p.name}`)
          .on('click', ev => { ev.stopPropagation(); hideFam(r.p, fx.f); })
          .on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); hideFam(r.p, fx.f); } });
        fg.on('mousemove', ev => showCvTip(ev, r.p, fx))
          .on('mouseleave', () => { cvTip.hidden = true; })
          .on('click', () => selectCvFamily(r.p.key, fx.f.id))
          .on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectCvFamily(r.p.key, fx.f.id); } });
      });
    }
    const vline = (d, cls, text, color) => {
      const xx = x(parse(d)), nearEnd = xx > width - RIGHT - 110;
      s.append('line').attr('class', cls).attr('x1', xx).attr('x2', xx).attr('y1', TOP - 14).attr('y2', height - 26);
      s.append('text').attr('class', 'line-label').attr('x', nearEnd ? xx - 4 : xx + 4).attr('text-anchor', nearEnd ? 'end' : 'start').attr('y', TOP - 16).attr('fill', color).text(text);
    };
    vline(TODAY, 'today-line', 'Today', 'var(--ink-2)');
    if (cv.day) vline(cv.day, 'date-line', longDate(cv.day), 'var(--accent)');
    host.insertAdjacentHTML('beforeend', '<div class="tooltip" id="cv-tip" hidden></div><div id="cv-detail"></div>');
    cvTip = document.getElementById('cv-tip');
    if (without.length) host.insertAdjacentHTML('beforeend', `<p class="tl-note" style="margin-top:8px">No patent record in ${esc(cname(iso))}: ${without.map(r => esc(r.p.name)).join(', ')}.</p>`);
    if (allHidden.length) host.insertAdjacentHTML('beforeend', `<p class="tl-note">All patents hidden by you: ${allHidden.map(r => esc(r.p.name)).join(', ')}.</p>`);
    drawCvDetail();
  }
  /** Small round button drawn in the chart SVG (keyboard accessible). */
  /** Faint grip or eye-slash control drawn in the chart (icons from the LAPaL HIV dashboard). */
  function ctl(g, x, y, kind, label) {
    const b = g.append('g').attr('class', 'cv-ctl ' + kind).attr('tabindex', 0).attr('role', 'button').attr('aria-label', label)
      .attr('transform', `translate(${x},${y})`);
    b.append('title').text(label);
    b.append('rect').attr('x', -8).attr('y', -9).attr('width', 16).attr('height', 18).attr('rx', 3).attr('class', 'cv-ctl-hit');
    if (kind === 'grip') {
      for (const [cx, cy] of [[-3, -5], [3, -5], [-3, 0], [3, 0], [-3, 5], [3, 5]]) b.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 1.2);
    } else {
      const ic = b.append('g').attr('transform', 'translate(-7,-7) scale(0.5833)');
      ic.append('path').attr('d', 'M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8');
      ic.append('path').attr('d', 'M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a12 12 0 01-2.4 3.3M6.2 6.7C3.9 8.2 3 10.4 3 12c0 2.5 4 7 9 7a9.6 9.6 0 003.6-.7');
    }
    return b;
  }
  /** Row boundary nearest to y: 0 = above the first row, n = below the last. */
  function dropIndex(rowsOnScreen, y) {
    let k = 0;
    while (k < rowsOnScreen.length && y > rowsOnScreen[k].y + rowsOnScreen[k].h / 2) k++;
    return k;
  }
  function moveRow(rowsOnScreen, from, to) {
    const keys = rowsOnScreen.map(r => r.p.key);
    const [k] = keys.splice(from, 1); keys.splice(to, 0, k);
    // Products not on screen here (hidden or no record) keep their place after these.
    cv.order = [...keys, ...cv.order.filter(x => !keys.includes(x))];
    cv.sort = 'manual'; document.getElementById('cv-sort').value = 'manual';
    drawCvProducts(); writeHash();
    // Keep keyboard focus on the moved row's grip.
    document.querySelector(`#cv-products .cv-ctl.grip[aria-label^="Drag to reorder ${CSS.escape(rowsOnScreen[from].p.name)}."]`)?.focus();
  }
  function hideRow(p) { cv.hidden.add(p.key); cvTip && (cvTip.hidden = true); drawCvProducts(); writeHash(); }
  function hideFam(p, f) {
    cv.hiddenFams.add(famKey(p, f));
    if (cv.sel && cv.sel.key === p.key && cv.sel.fam === f.id) cv.sel = null;
    cvTip && (cvTip.hidden = true); drawCvProducts(); writeHash();
  }
  let cvTip = null;
  function showCvTip(ev, p, fx) {
    const host = document.getElementById('cv-products');
    cvTip.innerHTML = `<div class="tt-title">${esc(fx.f.wo)}${(fx.f.categories || []).length ? ' · ' + esc(fx.f.categories.join(', ')) : ''}</div>` +
      `<div class="tt-row">${esc(fx.f.description)}</div><div class="tt-row" style="color:var(--muted)">${esc(p.name)}</div>` +
      fx.records.map(rr => `<div class="tt-row">${esc(rr.number || (fromSummary(rr) ? 'Family-level status' : ''))} — <b>${esc(rr.status_raw)}</b>${rr.expiry ? ', expires ' + fmtDate(rr.expiry) : ''}</div>`).join('') +
      `<div class="tt-row">Filed ${fmtDate(fx.f.filing)}</div><div class="tt-row" style="color:var(--muted)">Click for details</div>`;
    cvTip.hidden = false;
    const r = host.getBoundingClientRect();
    let xx = ev.clientX - r.left + host.scrollLeft + 14, yy = ev.clientY - r.top + 14;
    if (xx + 270 > r.width + host.scrollLeft) xx = ev.clientX - r.left + host.scrollLeft - 280;
    cvTip.style.left = xx + 'px'; cvTip.style.top = yy + 'px';
  }
  function selectCvFamily(key, famId) {
    cv.sel = cv.sel && cv.sel.key === key && cv.sel.fam === famId ? null : { key, fam: famId };
    drawCvProducts();
    if (cv.sel) document.getElementById('cv-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  /** Details of the clicked bar: the family and its national patents in this country. */
  function drawCvDetail() {
    const host = document.getElementById('cv-detail');
    if (!host) return;
    if (!cv.sel) { host.innerHTML = ''; return; }
    const p = hivProducts.find(x => x.key === cv.sel.key);
    const fx = productIn(p, cv.iso, cv.day).fams.find(x => x.f.id === cv.sel.fam);
    if (!fx) { host.innerHTML = ''; return; }
    const f = fx.f;
    const rows = fx.records.map(rr => `<tr><td class="wo">${fromSummary(rr) ? '<span class="est">Family-level status (MedsPaL summary)</span>' : esc(rr.number || f.wo)}</td><td>${statusTag(rr.status, rr.status_raw)}</td>` +
      (cv.day ? `<td>${statusTag(statusOf(rr, cv.day), LABEL[statusOf(rr, cv.day)] || '—')}</td>` : '') +
      `<td class="num">${fmtDate(rr.expiry || (rr.status !== 'not_in_force' ? f.expiry : null))}</td><td>${esc(rr.via ? viaText(rr) : '')}</td></tr>`).join('');
    host.innerHTML = `<div class="cv-detail">
      <button type="button" class="cvd-close" aria-label="Close details">×</button>
      <div class="cvd-product">${esc(p.name)}${p.also.length ? ' <span class="est">(also: ' + esc(p.also.join(', ')) + ')</span>' : ''} · ${flag(cv.iso)} ${esc(cname(cv.iso))}</div>
      <h3>${f.espacenet ? `<a href="${esc(f.espacenet)}" target="_blank" rel="noopener">${esc(f.wo)}</a>` : esc(f.wo)} — ${esc(f.description)}</h3>
      <div class="tags">${typeTags(f)}</div>
      <dl class="pcard-meta"><dt>Filed</dt><dd>${fmtDate(f.filing)}</dd>${f.holders && f.holders.length ? `<dt>Holder</dt><dd>${esc(f.holders.join('; '))}</dd>` : ''}</dl>
      <div class="if-wrap"><table class="if"><thead><tr><th>Patent in ${esc(cname(cv.iso))}</th><th>Status (as recorded)</th>${cv.day ? `<th>On ${esc(longDate(cv.day))}</th>` : ''}<th class="num">Expected expiry</th><th>Via</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="oc-actions"><button type="button" class="oc-btn ghost" id="cvd-hide">Hide this patent family</button><button type="button" class="oc-btn" id="cvd-open">Open ${esc(p.name)} in ${esc(cname(cv.iso))} — see this family in other countries</button></div>
    </div>`;
    host.querySelector('.cvd-close').onclick = () => { cv.sel = null; drawCvProducts(); };
    document.getElementById('cvd-hide').onclick = () => hideFam(p, f);
    document.getElementById('cvd-open').onclick = () => {
      const iso = cv.iso;
      openEntry(p.entries[0].id, iso);
      // Open the family's "other countries" list on its cards in the product view.
      document.querySelectorAll('#panel [data-open]').forEach(b => { if (b.dataset.open.startsWith(f.id + '|')) state.open.add(b.dataset.open); });
      drawPanel();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }
  function drawMatrix() {
    const isos = cvCountries().filter(i => !isHic(i));
    const rows = isos.map(iso => {
      const cells = hivProducts.map(p => productIn(p, iso, cv.day).best);
      return { iso, cells, live: cells.filter(s => s === 'granted' || s === 'filed').length };
    }).sort((a, b) => b.live - a.live || cname(a.iso).localeCompare(cname(b.iso)));
    document.getElementById('cv-matrix-scope').textContent = `${rows.length} countries × ${hivProducts.length} products${cv.compound ? ' · compound patents only' : ''}`;
    const short = p => p.name.length > 30 ? p.name.slice(0, 29) + '…' : p.name;
    const head = `<thead><tr><th class="corner">Country</th>${hivProducts.map(p => `<th title="${esc(p.name + (p.also.length ? ' (also: ' + p.also.join(', ') + ')' : ''))}"><span class="rot"><span>${esc(short(p))}</span></span></th>`).join('')}<th class="count">Products granted / filed</th></tr></thead>`;
    const body = rows.map(r => `<tr class="${r.iso === cv.iso ? 'selected' : ''}"><th scope="row" data-iso="${r.iso}" title="Open ${esc(cname(r.iso))}">${flag(r.iso)} ${esc(cname(r.iso))}</th>` +
      r.cells.map((st, k) => `<td class="cell" title="${esc(hivProducts[k].name)} in ${esc(cname(r.iso))}: ${st ? LABEL[st] : 'no patent record'}"><i class="${st ? '' : 'none'}" style="${st ? 'background:' + COLOR[st] : ''}"></i></td>`).join('') +
      `<td class="count">${r.live}</td></tr>`).join('');
    const host = document.getElementById('cv-matrix');
    host.innerHTML = `<table class="mx">${head}<tbody>${body}</tbody></table>`;
    host.querySelectorAll('th[data-iso]').forEach(t => t.onclick = () => { cv.iso = t.dataset.iso; drawCountryView(); document.getElementById('cv-title').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const sw = (c, t, cls = '') => `<span class="swatch"><i class="${cls}" style="${c ? 'background:' + c : ''}"></i>${t}</span>`;
    if (host.previousElementSibling && host.previousElementSibling.matches('.mx-legend')) host.previousElementSibling.remove();
    host.insertAdjacentHTML('beforebegin', `<div class="mx-legend">${sw(COLOR.granted, 'Granted')}${sw(COLOR.filed, 'Filed')}${sw(COLOR.not_in_force, 'Not in force')}${sw('', 'No patent record', 'none')}</div>`);
  }
  document.getElementById('cv-country').addEventListener('change', ev => { cv.iso = ev.target.value; drawCountryView(); });
  document.getElementById('cv-sort').onchange = ev => { cv.sort = ev.target.value; drawCvProducts(); writeHash(); };
  document.querySelectorAll('input[name="cv-scope"]').forEach(i => i.addEventListener('change', () => { cv.compound = i.value === 'compound' && i.checked; cvComputeStops(); drawCountryView(); }));
  function openEntry(id, iso) {
    state.iso = iso || null;
    setView('product');
    setEntry(id);
  }

  // ---------- exports: PNG, CSV, print ----------
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Saved ' + name);
  }
  function downloadCsv(name, rows) {
    const cell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    // UTF-8 byte-order mark so Excel opens country names and dashes correctly.
    saveBlob(new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), name);
  }
  /** Rasterise an on-screen SVG with a title, subtitle, legend and source line. CSS variables and
   *  classes do not survive serialisation, so computed fills/strokes are copied onto the clone. */
  function svgToPng(svgEl, { title, subtitle, legend, footer, filename }) {
    const vb = svgEl.viewBox.baseVal;
    const W = vb && vb.width ? vb.width : svgEl.clientWidth, H = vb && vb.height ? vb.height : svgEl.clientHeight;
    const clone = svgEl.cloneNode(true);
    const src = [svgEl, ...svgEl.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
    src.forEach((el, i) => {
      const cs = getComputedStyle(el), d = dst[i];
      for (const p of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'font-weight', 'text-anchor'])
        d.setAttribute(p, cs.getPropertyValue(p));
      if (el.tagName === 'text') d.setAttribute('font-family', cs.fontFamily);
      d.removeAttribute('class');
    });
    // On-screen controls (▲ ▼ ✕) are not part of the picture.
    src.forEach((el, i) => { if (el.classList && el.classList.contains('cv-ctl')) dst[i].remove(); });
    const subLines = wrapText(subtitle, W).length;
    clone.setAttribute('x', 0); clone.setAttribute('y', 64 + (subLines - 1) * 15); clone.setAttribute('width', W); clone.setAttribute('height', H);
    clone.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const font = getComputedStyle(document.body).fontFamily.replace(/"/g, "'");
    const resolve = c => c && c.startsWith('var(') ? getComputedStyle(document.documentElement).getPropertyValue(c.slice(4, -1)).trim() : c;
    let lx = 16;
    const leg = legend.map(l => {
      const g = `<rect x="${lx}" y="${H + 76 + (subLines - 1) * 15}" width="12" height="12" rx="3" fill="${l.color ? resolve(l.color) : '#fff'}" ${l.dashed ? 'stroke="#b9bcc4" stroke-dasharray="2 2"' : ''}/>` +
        `<text x="${lx + 17}" y="${H + 86 + (subLines - 1) * 15}" font-size="12" fill="#4a5164" font-family="${font}">${esc(l.label)}</text>`;
      lx += 30 + l.label.length * 6.6; return g;
    }).join('');
    const total = H + 124 + (subLines - 1) * 15;
    // LAPaL and MedsPaL logos, top right; a long title gets a smaller font so it stays clear of them.
    const LG = window.LOGOS || {}, LH = 30;
    let logoX = W - 16;
    const logos = ['medspal', 'lapal'].filter(k => LG[k]).map(k => {
      const w = Math.round(LG[k].w * LH / LG[k].h); logoX -= w;
      const tag = `<image href="${LG[k].src}" x="${logoX}" y="10" width="${w}" height="${LH}"/>`;
      logoX -= 14; return tag;
    }).join('');
    const titleSize = Math.min(18, Math.floor((logoX - 16) / (title.length * 0.56)));
    const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${total}" viewBox="0 0 ${W} ${total}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      ${logos}<text x="16" y="28" font-size="${titleSize}" font-weight="700" fill="#1F2A6B" font-family="${font}">${esc(title)}</text>
      ${wrapText(subtitle, W).map((line, k) => `<text x="16" y="${50 + k * 15}" font-size="12" fill="#4a5164" font-family="${font}">${esc(line)}</text>`).join('')}
      ${new XMLSerializer().serializeToString(clone)}${leg}
      <text x="16" y="${total - 12}" font-size="11" fill="#6b7183" font-family="${font}">${esc(footer)}</text></svg>`;
    const img = new Image();
    img.onload = () => {
      const scale = 2, cv = document.createElement('canvas');
      cv.width = W * scale; cv.height = total * scale;
      const ctx = cv.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
      cv.toBlob(b => saveBlob(b, filename), 'image/png');
    };
    img.onerror = () => toast('Could not create the image in this browser');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out);
  }
  /** Split a subtitle into lines that fit the image width (about 6.4 px per character at 12 px). */
  function wrapText(text, W) {
    const max = Math.max(30, Math.floor((W - 32) / 6.4)), words = text.split(' '), lines = [''];
    for (const w of words) {
      if ((lines[lines.length - 1] + ' ' + w).trim().length > max) lines.push(w);
      else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
    }
    return lines;
  }
  const snapshot = () => document.getElementById('snapshot-date').textContent;
  // Links written into the exports: Espacenet for a patent number, and the family's own page
  // (Espacenet from MedsPaL, else Google Patents for card families, else an Espacenet search).
  const espLink = num => num ? 'https://worldwide.espacenet.com/patent/search?q=pn%3D' + encodeURIComponent(String(num).replace(/\s+/g, '')) : '';
  const famLink = f => f.espacenet || f.filing_source || espLink(f.wo);
  const LAPAL = 'https://lapal.ch', MEDSPAL = 'https://medspal.org';
  const dateTag = () => state.day ? state.day : 'today';
  const statusLegend = (extra) => [{ color: COLOR.granted, label: 'Granted' }, { color: COLOR.filed, label: 'Filed' }, { color: COLOR.not_in_force, label: 'Not in force' }, ...extra];

  document.getElementById('x-map-png').onclick = () => {
    const e = byId.get(state.entryId);
    svgToPng(document.getElementById('map'), {
      title: `${e.name} — patent status by country`,
      subtitle: `${state.day ? 'Projected from ' + longDate(state.day) : 'Today (status as recorded)'} · ${state.compoundOnly ? 'compound patents only' : 'any patent'}${e.preliminary ? ' · PRELIMINARY DATA (LAPaL cards)' : ''}`,
      legend: statusLegend([{ color: 'var(--none-lmic)', label: 'No record, LMIC' },
        { color: 'var(--none-hic)', label: 'High income: not covered' }]),
      footer: `Source: ${e.source === 'medspal' ? 'MedsPaL via LAPaL' : 'LAPaL patent cards'}, snapshot ${snapshot()} · Working prototype · ${e.url}`,
      filename: `lapal-patent-map_${slug(e.name)}_${dateTag()}.png`,
    });
  };
  document.getElementById('x-map-csv').onclick = () => {
    const e = byId.get(state.entryId);
    const rows = [['Entry', e.name], ['LAPaL page', e.url], ['Data source', e.source === 'medspal' ? 'MedsPaL' : 'LAPaL patent cards (preliminary)'],
      ['Date shown', state.day ? 'Projected from ' + state.day : 'Today, status as recorded'], ['Scope', state.compoundOnly ? 'Compound patents only' : 'Any patent'],
      ['Snapshot', snapshot()], [],
      ['Country', 'ISO2', 'Income level', 'LMIC', 'Country status on date shown', 'Patent number', 'Record status (as recorded)', 'Record status on date shown',
        'Expected expiry', 'Regional office', 'Family (representative)', 'Family description', 'Patent type', 'Filing date', 'Filing date estimated',
        'Patent record link (Espacenet)', 'Family link']];
    [...index.entries()].sort((a, b) => cname(a[0]).localeCompare(cname(b[0]))).forEach(([iso, s]) => s.records.forEach(({ fam, rec, st }) => rows.push([
      cname(iso), iso, C[iso] ? C[iso].income : '', C[iso] && C[iso].lmic ? 'yes' : 'no', LABEL[s.status] || '', rec.number || '', rec.status_raw || '', LABEL[st] || '',
      rec.expiry || (rec.status !== 'not_in_force' ? fam.expiry : '') || '', rec.via || '', fam.wo, fam.description, (fam.categories || []).join('; '), fam.filing || '', fam.filing_estimated ? 'yes' : 'no',
      espLink(rec.number), famLink(fam)])));
    downloadCsv(`lapal-patents_${slug(e.name)}_${dateTag()}.csv`, rows);
  };
  document.querySelectorAll('#x-print, .x-print').forEach(b => b.onclick = () => window.print());
  document.getElementById('x-cv-png').onclick = () => {
    // Redraw at a fixed 1000 px so the image does not depend on the window size, then restore.
    const host = document.getElementById('cv-products');
    host.style.width = '1000px'; drawCvProducts();
    const svg = host.querySelector('svg');
    if (!svg) { host.style.width = ''; drawCvProducts(); toast('Nothing to save for this country'); return; }
    svgToPng(svg, {
      title: `${cname(cv.iso)} — patents across HIV long-acting products`,
      subtitle: `${cv.day ? 'Projected to ' + longDate(cv.day) : 'Today (status as recorded in MedsPaL)'} · ${cv.compound ? 'compound patents only' : 'any patent'} · bars run from filing to expected expiry` +
        (cvEdits() ? ` · ${cvEdits()}` : ''),
      legend: statusLegend([]),
      footer: `Source: LAPaL entries with MedsPaL patent data, snapshot ${snapshot()} · Working prototype · ${LAPAL} · ${MEDSPAL}`,
      filename: `lapal-hiv-patents_${slug(cname(cv.iso))}_${cv.day || 'today'}.png`,
    });
    host.style.width = ''; drawCvProducts();
  };
  document.getElementById('x-cv-csv').onclick = () => {
    const rows = [['Country', cname(cv.iso)], ['Date shown', cv.day ? 'Projected to ' + cv.day : 'Today, status as recorded'], ['Scope', cv.compound ? 'Compound patents only' : 'Any patent'], ['Snapshot', snapshot()],
      ['Rows ordered by', SORT_LABEL[cv.sort]], ['Products hidden by user', hivProducts.filter(p => cv.hidden.has(p.key)).map(p => p.name).join('; ') || 'none'],
      ['Patent families hidden by user', cvHiddenFams().map(([, p, f]) => f.wo + ' (' + p.name + ')').join('; ') || 'none'], [],
      ['Product', 'Also listed as', 'Product status on date shown', 'Family (representative)', 'Family description', 'Patent type', 'Patent number', 'Record status (as recorded)', 'Record status on date shown', 'Filing date', 'Expected expiry',
        'LAPaL page', 'Patent record link (Espacenet)', 'Family link']];
    // Same rows and order as on screen: hidden products left out, products without a record last.
    const cr = cvRows(cv.iso, cv.day);
    for (const r of [...cr.withRec, ...cr.without]) {
      const p = r.p;
      if (!r.fams.length) { rows.push([p.name, p.also.join('; '), 'No patent record', '', '', '', '', '', '', '', '', p.entries[0].url]); continue; }
      for (const fx of r.fams) for (const rec of fx.records) rows.push([p.name, p.also.join('; '), LABEL[r.best] || '', fx.f.wo, fx.f.description, (fx.f.categories || []).join('; '),
        rec.number || '', rec.status_raw || '', LABEL[statusOf(rec, cv.day)] || '', fx.f.filing || '', rec.expiry || fx.expiry || '',
        p.entries[0].url, espLink(rec.number), famLink(fx.f)]);
    }
    downloadCsv(`lapal-hiv-patents_${slug(cname(cv.iso))}_${cv.day || 'today'}.csv`, rows);
  };
  document.getElementById('x-mx-csv').onclick = () => {
    const isos = cvCountries().filter(i => !isHic(i));
    const rows = [['Date shown', cv.day ? 'Projected to ' + cv.day : 'Today, status as recorded'], ['Scope', cv.compound ? 'Compound patents only' : 'Any patent'], ['Snapshot', snapshot()], [],
      ['Country', 'ISO2', 'Income level', ...hivProducts.map(p => p.name), 'Products granted or filed']];
    for (const iso of isos) {
      const cells = hivProducts.map(p => productIn(p, iso, cv.day).best);
      rows.push([cname(iso), iso, C[iso] ? C[iso].income : '', ...cells.map(s => s ? LABEL[s] : 'No record'), cells.filter(s => s === 'granted' || s === 'filed').length]);
    }
    rows.push([], ['Product', 'LAPaL page'], ...hivProducts.map(p => [p.name, p.entries.map(en => en.url).join(' ; ')]));
    downloadCsv(`lapal-hiv-patents_overview_${cv.day || 'today'}.csv`, rows);
  };

  document.getElementById('x-tl-png').onclick = () => {
    const e = byId.get(state.entryId), host = document.getElementById('timeline');
    host.style.width = '1000px'; drawTimeline();
    const svg = host.querySelector('svg');
    if (!svg) { host.style.width = ''; drawTimeline(); toast('No timeline to save for this entry'); return; }
    svgToPng(svg, {
      title: `${e.name} — timeline of patent families`,
      subtitle: `Filing to expected expiry · colour: ${state.day ? 'status from ' + longDate(state.day) : 'status today'}${state.iso ? ' in ' + cname(state.iso) : ' in any country'}` +
        ` · ${state.compoundOnly ? 'compound patents only' : 'any patent'}${state.famFocus ? ' · one family only' : ''}${e.preliminary ? ' · PRELIMINARY DATA (LAPaL cards)' : ''}`,
      legend: statusLegend([{ color: state.iso ? 'var(--none-hic)' : 'var(--none-lmic)', label: state.iso ? 'No record in this country' : 'No country detail' }]),
      footer: `Source: ${e.source === 'medspal' ? 'MedsPaL via LAPaL' : 'LAPaL patent cards; filing dates from Google Patents'}, snapshot ${snapshot()} · Working prototype · ${e.url}`,
      filename: `lapal-patent-timeline_${slug(e.name)}_${dateTag()}.png`,
    });
    host.style.width = ''; drawTimeline();
  };
  document.getElementById('x-tl-csv').onclick = () => {
    const e = byId.get(state.entryId);
    const rows = [['Entry', e.name], ['LAPaL page', e.url], ['Data source', e.source === 'medspal' ? 'MedsPaL (' + MEDSPAL + ')' : 'LAPaL patent cards (preliminary)'],
      ['Date shown', state.day ? 'Projected from ' + state.day : 'Today, status as recorded'], ['Country', state.iso ? cname(state.iso) : 'All'],
      ['Scope', state.compoundOnly ? 'Compound patents only' : 'Any patent'], ['Snapshot', snapshot()], [],
      ['Family (representative)', 'Description', 'Patent type', 'Holder', 'Filing date', 'Filing date estimated', 'Filing date source', 'Expected expiry',
        `Status on date shown${state.iso ? ' in ' + cname(state.iso) : ' (strongest in any country)'}`, 'Countries granted', 'Countries filed', 'Family link']];
    for (const f of families(e).slice().sort((a, b) => String(a.filing || '9999').localeCompare(String(b.filing || '9999')))) {
      const n = familyCounts(f, state.day), st = famStatus(f);
      rows.push([f.wo, f.description, (f.categories || []).join('; '), (f.holders || []).join('; '), f.filing || '', f.filing_estimated ? 'yes' : 'no',
        f.filing_source || (e.source === 'medspal' ? 'MedsPaL' : ''), f.expiry || '', LABEL[st] || (f.countries.length ? 'No record' : 'No country detail'),
        n.granted, n.filed, famLink(f)]);
    }
    downloadCsv(`lapal-patent-timeline_${slug(e.name)}_${dateTag()}.csv`, rows);
  };
  // Printed pages end with the sources and links of what is shown.
  window.addEventListener('beforeprint', () => {
    const lines = [`Snapshot ${snapshot()} · Working prototype`];
    if (state.view === 'country') {
      lines.push(`Data: LAPaL entries with MedsPaL patent data (${LAPAL}, ${MEDSPAL}).`);
      hivProducts.forEach(p => lines.push(`${p.name}: ${p.entries.map(en => en.url).join(' ; ')}`));
    } else if (state.entryId) {
      const e = byId.get(state.entryId);
      lines.push(`${e.name}: ${e.url}`, `Data: ${e.source === 'medspal' ? 'MedsPaL (' + MEDSPAL + '), as linked to the LAPaL entry' : 'LAPaL patent cards (preliminary); filing dates from Google Patents'}.`);
      families(e).forEach(f => lines.push(`${f.wo}: ${famLink(f)}`));
    }
    document.getElementById('print-sources').innerHTML = '<p><b>Sources</b></p>' + lines.map(l => `<p>${esc(l)}</p>`).join('');
  });

  // ---------- views ----------
  function setView(v) {
    state.view = v;
    document.querySelectorAll('.views button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    document.getElementById('product-views').hidden = v === 'country';
    document.getElementById('country-view').hidden = v !== 'country';
    document.getElementById('picker').hidden = v !== 'entry';
    document.getElementById('landscape-intro').hidden = v !== 'product';
    document.getElementById('filters').hidden = v !== 'product';
    document.getElementById('layout').classList.toggle('with-filters', v === 'product');
    if (v === 'country') { cvComputeStops(); drawCountryView(); }
    else if (state.entryId) { if (v === 'product') drawFilters(); redraw(); }
  }
  document.querySelectorAll('.views button').forEach(b => b.onclick = () => setView(b.dataset.view));

  // ---------- state ----------
  function writeHash() {
    const p = new URLSearchParams({ view: state.view });
    if (state.view === 'country') {
      p.set('c', cv.iso);
      if (cv.compound) p.set('scope', 'compound');
      if (cv.stop > 0) p.set('on', cv.stops[cv.stop]);
      if (cv.sort !== 'status') p.set('sort', cv.sort);
      if (cv.hidden.size) p.set('hide', [...cv.hidden].join(','));
      if (cv.sort === 'manual' && cv.order.length) p.set('order', cv.order.join(','));
      if (cv.hiddenFams.size) p.set('hidef', [...cv.hiddenFams].join(','));
    } else {
      p.set('entry', state.entryId);
      if (state.iso) p.set('country', state.iso);
      if (state.compoundOnly) p.set('scope', 'compound');
      if (state.stop > 0) p.set('after', stops[state.stop]);
      if (state.mt === 'table') p.set('mt', 'table');
    }
    history.replaceState(null, '', '#' + p.toString());
  }
  function redraw() {
    if (state.view === 'country') return;
    index = countryIndex(byId.get(state.entryId));
    drawAsOf(); drawSlider(); drawMap(); drawSummary(); drawTable(); drawStats(); drawInForce(); drawPanel(); drawTimeline(); writeHash();
    if (state.view === 'product') fList.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.id === state.entryId)));
  }
  function selectCountry(iso) {
    state.iso = iso;
    redraw();
  }
  function setEntry(id, keepDate) {
    if (!byId.has(id)) return;
    state.entryId = id;
    state.famFocus = null; state.open.clear();
    if (select.value !== id) { search.value = ''; fillPicker(''); select.value = id; }
    computeStops();
    const keep = keepDate ? stops.indexOf(keepDate) : -1;
    state.stop = keep > 0 ? keep : 0;
    state.day = state.stop ? nextDay(stops[state.stop]) : null;
    index = countryIndex(byId.get(id));
    if (state.iso && !index.has(state.iso)) state.iso = null;
    drawHead(); drawLegend(); redraw();
  }
  document.querySelectorAll('#toggle input').forEach(inp => inp.addEventListener('change', () => {
    state.compoundOnly = inp.value === 'compound' && inp.checked;
    const keepDate = state.stop ? stops[state.stop] : null;
    computeStops();
    const k = keepDate ? stops.indexOf(keepDate) : -1;
    state.stop = k > 0 ? k : 0;
    state.day = state.stop ? nextDay(stops[state.stop]) : null;
    redraw();
  }));
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.view === 'country') drawCvProducts(); else drawTimeline(); }, 150);
  });

  document.getElementById('snapshot-date').textContent = new Date(D.meta.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  drawLegend();
  const hash = new URLSearchParams(location.hash.slice(1));
  const start = byId.has(hash.get('entry')) ? hash.get('entry') : 'formulations/mk-8591d-islatravir-and-lenacapavir';
  state.view = ['entry', 'product', 'country'].includes(hash.get('view')) ? hash.get('view') : 'entry';
  state.mt = hash.get('mt') === 'table' ? 'table' : 'map';
  document.querySelectorAll('.maptable button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.mt === state.mt)));
  if (state.view === 'country') {
    cv.iso = hash.get('c') || 'ZA';
    cv.compound = hash.get('scope') === 'compound';
    cv.sort = SORT_LABEL[hash.get('sort')] ? hash.get('sort') : 'status';
    document.getElementById('cv-sort').value = cv.sort;
    cv.hidden = new Set((hash.get('hide') || '').split(',').filter(k => hivProducts.some(p => p.key === k)));
    cv.order = (hash.get('order') || '').split(',').filter(k => hivProducts.some(p => p.key === k));
    cv.hiddenFams = new Set((hash.get('hidef') || '').split(',').filter(k => hivProducts.some(p => p.families.some(f => famKey(p, f) === k))));
    document.querySelector(`input[name="cv-scope"][value="${cv.compound ? 'compound' : 'any'}"]`).checked = true;
    cvComputeStops();
    const k = cv.stops.indexOf(hash.get('on'));
    cv.stop = k > 0 ? k : 0; cv.day = cv.stop ? cv.stops[cv.stop] : null;
  } else {
    state.iso = hash.get('country');
    state.compoundOnly = hash.get('scope') === 'compound';
  }
  document.querySelector(`#toggle input[value="${state.compoundOnly ? 'compound' : 'any'}"]`).checked = true;
  fillPicker('');
  const view0 = state.view;
  state.view = 'entry';
  setEntry(byId.has(start) ? start : D.entries[0].id, hash.get('after'));
  setView(view0);
})();
