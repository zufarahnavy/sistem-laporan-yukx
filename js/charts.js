/* =====================================================================
   YukX — charts.js : grafik SVG ringan (tanpa pustaka) bergaya bento:
   batang kapsul (aktif solid, lainnya bermotif diagonal), gauge setengah
   lingkaran, batang per trip + titik laba, dan area tren bulanan.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, U = C.U, esc = C.esc;
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function lblJt(v) { return v >= 1e9 ? (v / 1e9).toFixed(1).replace('.0', '') + 'M' : v >= 1e6 ? Math.round(v / 1e6) + 'jt' : v >= 1e3 ? Math.round(v / 1e3) + 'rb' : String(v); }
  var uid = 0;
  function tipHandler(box) {
    var tip = box.querySelector('.chart-tip');
    box.addEventListener('pointermove', function (e) {
      var t = e.target.closest('[data-tip]'); if (!t) { tip.classList.remove('show'); return; }
      var r = box.getBoundingClientRect(); tip.innerHTML = t.getAttribute('data-tip'); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top - 6) + 'px'; tip.classList.add('show');
    });
    box.addEventListener('pointerleave', function () { tip.classList.remove('show'); });
  }
  function defs(id) {
    return '<defs><pattern id="hatch' + id + '" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="var(--c-primary-tint)"/><line x1="0" y1="0" x2="0" y2="8" stroke="var(--c-primary-soft)" stroke-width="3.2"/></pattern>' +
      '<linearGradient id="area' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c-primary)" stop-opacity=".28"/><stop offset="1" stop-color="var(--c-primary)" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="gauge' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--c-primary-soft)"/><stop offset="1" stop-color="var(--c-primary)"/></linearGradient></defs>';
  }

  /** Batang kapsul ganda: a = pendapatan (solid), b = biaya (bermotif). */
  function kapsul(seri, o) {
    o = o || {}; var id = ++uid, W = 620, H = 300, padL = 44, padB = 34, padT = 14;
    var mx = niceMax(Math.max.apply(null, seri.map(function (s) { return Math.max(s.a, s.b); }).concat([1])));
    var n = Math.max(seri.length, 1), gw = (W - padL - 10) / n, bw = Math.min(36, gw * 0.28), y = function (v) { return H - padB - (v / mx) * (H - padB - padT); };
    var g = '';
    for (var i = 0; i <= 4; i++) { var v = mx * i / 4, yy = y(v); g += '<line x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--c-border)" stroke-dasharray="' + (i ? '4 5' : '0') + '"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="var(--c-text-muted)" font-weight="600">' + lblJt(v) + '</text>'; }
    var bars = seri.map(function (s, i) {
      var cx = padL + gw * i + gw / 2, xa = cx - bw - 3, xb = cx + 3, ya = y(s.a), yb = y(s.b), ha = Math.max(bw, H - padB - ya), hb = Math.max(bw, H - padB - yb), d = (i * 0.07).toFixed(2);
      var tip = '<b>' + esc(s.label) + '</b><br>' + (o.la || 'Pendapatan') + ': ' + U.rp(s.a) + '<br>' + (o.lb || 'Biaya') + ': ' + U.rp(s.b) + (s.a ? '<br>Margin: ' + Math.round((s.a - s.b) / s.a * 100) + '%' : '');
      return '<g data-tip="' + esc(tip) + '" style="cursor:pointer">' +
        '<rect class="bar-grow" style="animation-delay:' + d + 's" x="' + xa + '" y="' + (H - padB - ha) + '" width="' + bw + '" height="' + ha + '" rx="' + bw / 2 + '" fill="' + (s.kini ? 'var(--c-primary)' : 'color-mix(in srgb,var(--c-primary) 55%,var(--c-primary-soft))') + '"/>' +
        '<rect class="bar-grow" style="animation-delay:' + (+d + .05) + 's" x="' + xb + '" y="' + (H - padB - hb) + '" width="' + bw + '" height="' + hb + '" rx="' + bw / 2 + '" fill="url(#hatch' + id + ')" stroke="var(--c-primary-soft)" stroke-width="1"/>' +
        '<rect x="' + (cx - gw / 2) + '" y="' + padT + '" width="' + gw + '" height="' + (H - padB - padT) + '" fill="transparent"/>' +
        '<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" font-weight="' + (s.kini ? 800 : 600) + '" fill="' + (s.kini ? 'var(--c-primary)' : 'var(--c-text-muted)') + '">' + esc(s.label) + (s.kini ? ' (Kini)' : '') + '</text></g>';
    }).join('');
    return '<div class="chart-box" style="aspect-ratio:' + (o.rasio || '620/300') + '"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(o.aria || 'Grafik pendapatan vs biaya') + '">' + defs(id) + g + bars + '</svg><div class="chart-tip"></div></div>';
  }

  /** Gauge setengah lingkaran (persen 0–100). */
  function gauge(pct, label) {
    var id = ++uid, p = Math.max(0, Math.min(100, pct)), r = 90, cx = 110, cy = 104, L = Math.PI * r;
    var ang = Math.PI * (1 - p / 100), dx = cx + r * Math.cos(ang), dy = cy - r * Math.sin(ang);
    return '<div class="gauge"><svg viewBox="0 0 220 120" role="img" aria-label="' + esc(label) + ' ' + p + '%">' + defs(id) +
      '<path d="M20 104 A90 90 0 0 1 200 104" fill="none" stroke="var(--c-primary-tint-2)" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="M20 104 A90 90 0 0 1 200 104" fill="none" stroke="url(#gauge' + id + ')" stroke-width="18" stroke-linecap="round" stroke-dasharray="' + L + '" stroke-dashoffset="' + L + '" style="transition:stroke-dashoffset 1.1s var(--ease)" data-gauge="' + (L * (1 - p / 100)) + '"/>' +
      '<circle cx="' + dx + '" cy="' + dy + '" r="6" fill="var(--c-accent)" stroke="var(--c-surface)" stroke-width="3" style="opacity:0;transition:opacity .4s .9s" data-gauge-dot/></svg>' +
      '<div class="gauge__val"><b class="num">' + C.F.persen(p) + '</b><div class="label" style="text-transform:none;letter-spacing:0">' + esc(label) + '</div></div></div>';
  }
  function hidupkan(root) {
    (root || document).querySelectorAll('[data-gauge]').forEach(function (g) { requestAnimationFrame(function () { requestAnimationFrame(function () { g.style.strokeDashoffset = g.dataset.gauge; }); }); });
    (root || document).querySelectorAll('[data-gauge-dot]').forEach(function (d) { d.style.opacity = 1; });
    (root || document).querySelectorAll('.chart-box').forEach(function (b) { if (!b.dataset.tip) { b.dataset.tip = 1; tipHandler(b); } });
  }

  /** Batang per trip (pendapatan vs biaya) + titik & garis laba. */
  function trip(rows, o) {
    o = o || {}; var id = ++uid, W = 640, H = 300, padL = 46, padB = 46, padT = 14;
    var mx = niceMax(Math.max.apply(null, rows.map(function (r) { return Math.max(r.pendapatan, r.biaya); }).concat([1])));
    var n = Math.max(rows.length, 1), gw = (W - padL - 8) / n, bw = Math.min(26, gw * 0.26), y = function (v) { return H - padB - (Math.max(0, v) / mx) * (H - padB - padT); };
    var g = '', titik = [];
    for (var i = 0; i <= 3; i++) { var v = mx * i / 3, yy = y(v); g += '<line x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--c-border)" stroke-dasharray="3 4"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="var(--c-text-muted)" font-weight="600">' + lblJt(v) + '</text>'; }
    var bars = rows.map(function (r, i) {
      var cx = padL + gw * i + gw / 2, ya = y(r.pendapatan), yb = y(r.biaya), yl = y(r.laba);
      titik.push([cx, yl, r.laba < 0]);
      var nama = r.trip.Nama.replace(/\s\d+D\d+N.*$/, '').split(' ').slice(0, 2).join(' ');
      var tip = '<b>' + esc(r.trip.Nama) + '</b><br>Pendapatan: ' + U.rp(r.pendapatan) + '<br>' + (r.adaRealisasi ? 'Realisasi' : 'Budget') + ': ' + U.rp(r.biaya) + '<br>Laba: ' + U.rp(r.laba) + ' (' + r.margin + '%)';
      return '<g data-tip="' + esc(tip) + '" style="cursor:pointer"><rect x="' + (cx - gw / 2) + '" y="' + padT + '" width="' + gw + '" height="' + (H - padB - padT) + '" fill="transparent"/>' +
        '<rect class="bar-grow" style="animation-delay:' + (i * .06) + 's" x="' + (cx - bw - 2) + '" y="' + ya + '" width="' + bw + '" height="' + Math.max(bw, H - padB - ya) + '" rx="' + bw / 2 + '" fill="var(--c-primary)"/>' +
        '<rect class="bar-grow" style="animation-delay:' + (i * .06 + .05) + 's" x="' + (cx + 2) + '" y="' + yb + '" width="' + bw + '" height="' + Math.max(bw, H - padB - yb) + '" rx="' + bw / 2 + '" fill="' + (r.adaRealisasi ? 'var(--c-primary-soft)' : 'url(#hatch' + id + ')') + '"' + (r.adaRealisasi ? '' : ' stroke="var(--c-primary-soft)" stroke-dasharray="3 3"') + '/>' +
        '<text x="' + cx + '" y="' + (H - 26) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--c-text)">' + esc(nama) + '</text>' +
        '<text x="' + cx + '" y="' + (H - 11) + '" text-anchor="middle" font-size="10.5" fill="' + (r.status === 'Selesai' ? 'var(--c-text-muted)' : 'var(--c-warn)') + '">' + r.pax + ' pax' + (r.status !== 'Selesai' ? ' · ' + r.status : '') + '</text></g>';
    }).join('');
    var garis = titik.length > 1 ? '<path d="M' + titik.map(function (t) { return t[0] + ' ' + t[1]; }).join(' L') + '" fill="none" stroke="var(--c-ok)" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>' : '';
    var dots = titik.map(function (t) { return '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="6" fill="' + (t[2] ? 'var(--c-danger)' : 'var(--c-ok)') + '" stroke="var(--c-surface)" stroke-width="2.5"/>'; }).join('');
    return '<div class="chart-box" style="aspect-ratio:640/300"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafik pendapatan, biaya dan laba per trip">' + defs(id) + g + bars + garis + dots + '</svg><div class="chart-tip"></div></div>';
  }

  /** Area tren bulanan: pendapatan (area), biaya (garis), laba (titik). */
  function area(per, o) {
    o = o || {}; var id = ++uid, W = 640, H = 260, padL = 46, padB = 30, padT = 12;
    if (!per.length) return '<div class="chart-box" style="aspect-ratio:640/260;display:grid;place-items:center" class="muted">Belum ada data periode ini</div>';
    var mx = niceMax(Math.max.apply(null, per.map(function (m) { return Math.max(m.pendapatan, m.biaya); }).concat([1])));
    var n = per.length, x = function (i) { return n === 1 ? (padL + W) / 2 : padL + 12 + (W - padL - 24) * i / (n - 1); }, y = function (v) { return H - padB - (Math.max(0, v) / mx) * (H - padB - padT); };
    var g = ''; for (var i = 0; i <= 3; i++) { var v = mx * i / 3, yy = y(v); g += '<line x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--c-border)" stroke-dasharray="3 4"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="var(--c-text-muted)" font-weight="600">' + lblJt(v) + '</text>'; }
    var pA = per.map(function (m, i) { return x(i) + ',' + y(m.pendapatan); }), pB = per.map(function (m, i) { return x(i) + ',' + y(m.biaya); });
    var areaD = 'M' + x(0) + ',' + (H - padB) + ' L' + pA.join(' L') + ' L' + x(n - 1) + ',' + (H - padB) + ' Z';
    var titik = per.map(function (m, i) {
      var lbl = U.BLN[Number(m.bulan.slice(5, 7)) - 1] + ' ' + m.bulan.slice(2, 4);
      var tip = '<b>' + U.BULAN[Number(m.bulan.slice(5, 7)) - 1] + ' ' + m.bulan.slice(0, 4) + '</b><br>Pendapatan: ' + U.rp(m.pendapatan) + '<br>Biaya: ' + U.rp(m.biaya) + '<br>Laba: ' + U.rp(m.laba) + ' · ' + m.trip + ' trip';
      return '<g data-tip="' + esc(tip) + '"><rect x="' + (x(i) - 24) + '" y="' + padT + '" width="48" height="' + (H - padB - padT) + '" fill="transparent"/><line x1="' + x(i) + '" x2="' + x(i) + '" y1="' + padT + '" y2="' + (H - padB) + '" stroke="var(--c-border)" opacity=".6"/><circle cx="' + x(i) + '" cy="' + y(m.pendapatan) + '" r="5" fill="var(--c-primary)" stroke="var(--c-surface)" stroke-width="2"/><circle cx="' + x(i) + '" cy="' + y(m.laba) + '" r="5" fill="var(--c-ok)" stroke="var(--c-surface)" stroke-width="2"/><text x="' + x(i) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--c-text-muted)">' + lbl + '</text></g>';
    }).join('');
    return '<div class="chart-box" style="aspect-ratio:640/260"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tren laba rugi bulanan">' + defs(id) + g +
      '<path d="' + areaD + '" fill="url(#area' + id + ')" class="fade"/><path d="M' + pA.join(' L') + '" fill="none" stroke="var(--c-primary)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<path d="M' + pB.join(' L') + '" fill="none" stroke="var(--c-primary-soft)" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round"/>' + titik + '</svg><div class="chart-tip"></div></div>';
  }

  /** Batang horizontal proporsi kategori (HTML). */
  function proporsi(map, ikon) {
    var tot = 0; Object.keys(map).forEach(function (k) { tot += map[k]; });
    var warna = ['var(--c-primary)', 'color-mix(in srgb,var(--c-primary) 60%,var(--c-primary-soft))', 'var(--c-accent)', 'var(--c-ok)', 'var(--c-primary-soft)', '#9B8AFB', '#F178B6', 'var(--c-text-soft)', '#5EC2C6'];
    return '<div class="stack" style="gap:14px">' + Object.keys(map).sort(function (a, b) { return map[b] - map[a]; }).map(function (k, i) {
      var p = tot ? Math.round(map[k] / tot * 1000) / 10 : 0;
      return '<div class="hbar"><div class="hbar__top"><span class="row" style="gap:8px">' + C.ic((ikon && ikon[k]) || 'circle-dollar-sign', 16, 'primary') + '<span class="truncate">' + esc(k) + '</span></span><span class="num" style="white-space:nowrap">' + C.F.persen(p) + ' <span class="muted" style="font-weight:500">(' + U.rpRingkas(map[k]) + ')</span></span></div><div class="progress"><i style="width:' + p + '%;background:' + warna[i % warna.length] + ';animation-delay:' + (i * .06) + 's"></i></div></div>';
    }).join('') + '</div>';
  }

  window.Grafik = { kapsul: kapsul, gauge: gauge, trip: trip, area: area, proporsi: proporsi, hidupkan: hidupkan };
})();
