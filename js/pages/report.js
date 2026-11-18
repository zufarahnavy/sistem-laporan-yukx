/* =====================================================================
   YukBanyuwangi — Report & Analitik
   1) Pax per bulan  2) Frekuensi pemesanan bulan X (per hari, dari kolom
   TANGGAL PESAN)  3) Top 10 kota asal  4) Sumber info (lingkaran)
   5) Durasi paket terlaris  6) Paket Open Trip paling banyak dipesan.
   Grafik SVG/HTML ringan: satu seri = satu warna, batang ≤ 24 px berujung
   bulat 4 px, garis bantu tipis, tooltip saat disorot, tabel di tiap grafik.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, U = C.U, HT = C.HT;
  var st = { bulan: '', basis: 'trip', tab: '' };
  function niceMax(v) { if (v <= 0) return 4; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function fmt(n) { return Math.round(n).toLocaleString('id-ID'); }

  /** Kolom satu seri. rows: [{label, v, tip, kini}] */
  function kolom(rows, o) {
    o = o || {}; var W = 640, H = o.tinggi || 240, padL = 40, padB = 28, padT = 14, mx = niceMax(Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1])));
    var n = Math.max(rows.length, 1), gw = (W - padL - 6) / n, bw = Math.min(24, gw * 0.62), y = function (v) { return H - padB - (v / mx) * (H - padB - padT); }, g = '';
    for (var i = 0; i <= 4; i++) { var v = mx * i / 4, yy = y(v); g += '<line x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--c-border)" stroke-width="1"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="var(--c-text-muted)">' + fmt(v) + '</text>'; }
    var tiapLabel = n > 16 ? Math.ceil(n / 10) : 1;
    var bars = rows.map(function (r, i) {
      var cx = padL + gw * i + gw / 2, x = cx - bw / 2, top = y(r.v), h = H - padB - top, rr = Math.min(4, h, bw / 2);
      var d = h > 0 ? 'M' + x + ' ' + (H - padB) + 'V' + (top + rr) + 'Q' + x + ' ' + top + ' ' + (x + rr) + ' ' + top + 'H' + (x + bw - rr) + 'Q' + (x + bw) + ' ' + top + ' ' + (x + bw) + ' ' + (top + rr) + 'V' + (H - padB) + 'Z' : '';
      return '<g data-tip="' + esc(r.tip || ('<b>' + esc(r.label) + '</b><br>' + fmt(r.v))) + '"><rect x="' + (cx - gw / 2) + '" y="' + padT + '" width="' + gw + '" height="' + (H - padB - padT) + '" fill="transparent"/>' +
        (d ? '<path class="bar-grow" style="animation-delay:' + (i * 0.025).toFixed(3) + 's" d="' + d + '" fill="' + (o.sorot == null || r.kini ? 'var(--viz-1)' : 'var(--viz-1-redup)') + '"/>' : '') +
        (r.kini && r.v ? '<text x="' + cx + '" y="' + (top - 6) + '" text-anchor="middle" font-size="12" font-weight="700" fill="var(--c-text)">' + fmt(r.v) + '</text>' : '') +
        (i % tiapLabel === 0 || r.kini ? '<text x="' + cx + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11" font-weight="' + (r.kini ? 700 : 500) + '" fill="' + (r.kini ? 'var(--c-text)' : 'var(--c-text-muted)') + '">' + esc(r.label) + '</text>' : '') + '</g>';
    }).join('');
    return '<div class="chart-box" style="aspect-ratio:' + W + '/' + H + '"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || '') + '">' + g + bars + '</svg><div class="chart-tip"></div></div>';
  }
  /** Batang horizontal berperingkat (satu warna; nilai di ujung batang). */
  function peringkat(rows, o) {
    o = o || {}; if (!rows.length) return UI.kosong('chart-column', 'Belum ada data', o.kosong || '');
    var mx = Math.max.apply(null, rows.map(function (r) { return r[o.ukur || 'pax']; }).concat([1]));
    return '<ol class="rank">' + rows.map(function (r) {
      var v = r[o.ukur || 'pax'], p = Math.max(1.5, v / mx * 100);
      return '<li data-tip="' + esc('<b>' + esc(r.label) + '</b><br>' + r.n + ' pemesanan · ' + r.pax + ' pax' + (r.total ? '<br>' + U.rp(r.total) : '')) + '"><span class="rank__l truncate" title="' + esc(r.label) + '">' + esc(r.label) + '</span><span class="rank__trek"><i style="width:' + p + '%"></i></span><span class="rank__v num">' + fmt(v) + ' <small>' + (o.ukur === 'n' ? 'pesanan' : 'pax') + '</small></span></li>';
    }).join('') + '</ol>';
  }
  /** Lingkaran (donut) sumber info — maks. 6 potong, sisanya "Lainnya"; celah 2 px. */
  function donut(rows) {
    if (!rows.length) return UI.kosong('chart-pie', 'Belum ada data');
    var utama = rows.filter(function (r) { return r.label !== 'Tidak diisi'; }), kosong = rows.filter(function (r) { return r.label === 'Tidak diisi'; })[0];
    var seg = utama.slice(0, 5), sisa = utama.slice(5);
    if (sisa.length) seg.push({ label: 'Lainnya (' + sisa.length + ')', n: U.jumlah(sisa, function (r) { return r.n; }), pax: U.jumlah(sisa, function (r) { return r.pax; }), lain: true });
    if (kosong) seg.push({ label: 'Tidak diisi', n: kosong.n, pax: kosong.pax, lain: true });
    var tot = U.jumlah(seg, function (r) { return r.n; }) || 1, R = 70, L = 2 * Math.PI * R, ofs = 0, warna = function (i, r) { return r.lain ? 'var(--viz-lain)' : 'var(--viz-' + (i + 1) + ')'; };
    var arcs = seg.map(function (r, i) {
      var pj = r.n / tot * L, gap = seg.length > 1 ? Math.min(2.2, pj * 0.4) : 0, a = '<circle class="donut__s" cx="90" cy="90" r="' + R + '" fill="none" stroke="' + warna(i, r) + '" stroke-width="26" stroke-dasharray="' + Math.max(0.01, pj - gap) + ' ' + (L - pj + gap) + '" stroke-dashoffset="' + (-ofs) + '" data-tip="' + esc('<b>' + esc(r.label) + '</b><br>' + r.n + ' pemesanan (' + Math.round(r.n / tot * 100) + '%) · ' + r.pax + ' pax') + '"/>';
      ofs += pj; return a;
    }).join('');
    return '<div class="donut"><div class="chart-box donut__box"><svg viewBox="0 0 180 180" role="img" aria-label="Proporsi sumber info"><g transform="rotate(-90 90 90)">' + arcs + '</g><text x="90" y="86" text-anchor="middle" font-size="26" font-weight="800" fill="var(--c-text)">' + fmt(tot) + '</text><text x="90" y="106" text-anchor="middle" font-size="11" fill="var(--c-text-muted)">pemesanan</text></svg><div class="chart-tip"></div></div>' +
      '<ul class="donut__legenda">' + seg.map(function (r, i) { return '<li><i style="background:' + warna(i, r) + '"></i><span class="truncate">' + esc(r.label) + '</span><b class="num">' + Math.round(r.n / tot * 100) + '%</b><small class="muted num">' + r.n + '</small></li>'; }).join('') + '</ul></div>';
  }
  function tabel(rows, kol) { return '<details class="tabel-lihat"><summary>Lihat sebagai tabel</summary><table class="lr-mini"><thead><tr>' + kol.map(function (k) { return '<th class="' + (k.num ? 'num' : '') + '">' + esc(k.l) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + kol.map(function (k) { return '<td class="' + (k.num ? 'num' : '') + '">' + k.f(r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></details>'; }
  function selisih(a, b, satuan) { if (!b) return a ? 'Bulan lalu 0' : 'Sama dengan bulan lalu (0)'; var p = Math.round((a - b) / b * 100); return ic(p >= 0 ? 'trending-up' : 'trending-down', 14) + ' ' + (p > 0 ? '+' : '') + p + '% dari bulan lalu (' + fmt(b) + (satuan ? ' ' + satuan : '') + ')'; }

  var H = window.Halaman.report = {
    render: function (el) {
      var bln = st.bulan || U.hariIni().slice(0, 7), r = HT.report(Store.D, { bulan: bln, basis: st.basis, tab: st.tab, S: Store.S, today: U.hariIni() }), lb = r.label;
      var tabs = U.urutkan(Store.D.Sumber_Tab, function (t) { return Number(t.Urutan); });
      var hari = r.frekuensi.perHari, sibuk = hari.slice().sort(function (a, b) { return b.n - a.n; })[0];
      el.innerHTML = Hal.kepala({ judul: 'Report & Analitik', sub: 'Dihitung langsung dari Database Pemesanan. Pax & trip memakai tanggal trip; frekuensi pemesanan memakai kolom TANGGAL PESAN.',
        aksi: Hal.bulanPilih('rp-bln', bln, { mundur: 23, maju: 6 }) + '<select class="select" id="rp-tab" style="width:auto" aria-label="Kategori"><option value="">Semua kategori</option>' + tabs.map(function (t) { return '<option' + (st.tab === t.Nama ? ' selected' : '') + '>' + esc(t.Nama) + '</option>'; }).join('') + '</select><button class="btn btn--ghost" data-act="pdf">' + ic('file-down', 18) + '<span>PDF</span></button>' }) +
        '<div class="bento two-sm" style="margin-bottom:16px">' +
        UI.stat({ label: 'Pax · ' + lb, nilai: UI.hitung(r.pax.total), hero: true, kaki: '<span>' + selisih(r.pax.total, r.pax.lalu, 'pax') + '</span>' }) +
        UI.stat({ label: 'Pemesanan masuk', nilai: UI.hitung(r.frekuensi.total), ikon: 'inbox', kaki: '<span>' + selisih(r.frekuensi.total, r.frekuensi.lalu, '') + '</span>' }) +
        UI.stat({ label: 'Trip berangkat', nilai: UI.hitung(r.pax.trip), ikon: 'route', kaki: '<span>' + (r.pax.trip ? 'rata-rata ' + (Math.round(r.pax.total / r.pax.trip * 10) / 10).toString().replace('.', ',') + ' pax/pesanan' : '—') + '</span>' }) +
        UI.stat({ label: 'Penjualan', nilai: UI.hitung(r.pax.penjualan, 'rpS'), ikon: 'trending-up', kaki: '<span>nilai TOTAL di sheet</span>' }) + '</div>' +
        '<div class="grid-12" style="align-items:start">' +
        '<section class="card span-8 span-lg-12"><div class="card__head"><div class="card__title"><h2>Pax per bulan</h2><p>12 bulan sampai ' + esc(lb) + ' · berdasarkan tanggal trip</p></div></div>' +
        kolom(r.tren.map(function (t) { return { label: U.BLN[+t.bulan.slice(5, 7) - 1], v: t.pax, kini: t.bulan === bln, tip: '<b>' + esc(U.labelBulan(t.bulan)) + '</b><br>' + fmt(t.pax) + ' pax · ' + t.trip + ' pemesanan<br>' + U.rp(t.penjualan) }; }), { sorot: true, aria: 'Pax per bulan' }) +
        tabel(r.tren, [{ l: 'Bulan', f: function (t) { return U.labelBulan(t.bulan); } }, { l: 'Pax', num: true, f: function (t) { return fmt(t.pax); } }, { l: 'Pemesanan', num: true, f: function (t) { return t.trip; } }, { l: 'Penjualan', num: true, f: function (t) { return U.ribuan(t.penjualan); } }]) + '</section>' +
        '<section class="card span-4 span-lg-12"><div class="card__head"><div class="card__title"><h2>Pax per kategori</h2><p>' + esc(lb) + '</p></div></div><div class="chart-box chart-box--html">' + peringkat(r.pax.perTab) + '<div class="chart-tip"></div></div></section>' +
        '<section class="card span-8 span-lg-12"><div class="card__head"><div class="card__title"><h2>Frekuensi pemesanan · ' + esc(lb) + '</h2><p>' + r.frekuensi.total + ' pemesanan masuk (' + r.frekuensi.pax + ' pax)' + (sibuk && sibuk.n ? ' · tersibuk tanggal ' + sibuk.hari + ' (' + sibuk.n + ')' : '') + '</p></div></div>' +
        kolom(hari.map(function (h) { return { label: String(h.hari), v: h.n, tip: '<b>' + h.hari + ' ' + esc(lb) + '</b><br>' + h.n + ' pemesanan · ' + h.pax + ' pax' }; }), { tinggi: 200, aria: 'Pemesanan per hari' }) +
        (r.frekuensi.tanpaTanggal ? '<p class="help muted" style="margin-top:8px">' + ic('info', 14) + ' ' + r.frekuensi.tanpaTanggal + ' baris belum punya TANGGAL PESAN (data lama) dan tidak dihitung di sini.</p>' : '') + '</section>' +
        '<section class="card span-4 span-lg-12"><div class="card__head"><div class="card__title"><h2>Sumber info</h2><p>' + (st.basis === 'pesan' ? 'Pemesanan masuk' : 'Trip') + ' ' + esc(lb) + '</p></div></div>' + donut(r.sumber) + '</section>' +
        '<section class="card span-12"><div class="between wrap" style="gap:10px;margin-bottom:6px"><div class="card__title"><h2>Asal, durasi & paket</h2><p>Dasar perhitungan:</p></div><div class="seg"><button data-act="basis" data-b="trip" class="' + (st.basis === 'trip' ? 'on' : '') + '">Trip ' + esc(lb) + '</button><button data-act="basis" data-b="pesan" class="' + (st.basis === 'pesan' ? 'on' : '') + '">Dipesan ' + esc(lb) + '</button></div></div>' +
        '<div class="grid-12" style="margin-top:12px"><div class="span-6 span-lg-12"><h3 class="card-h">Top 10 kota asal tamu <small class="muted">' + r.kotaJumlah + ' kota</small></h3><div class="chart-box chart-box--html">' + peringkat(r.kota, { kosong: 'Kolom ASAL belum terisi.' }) + '<div class="chart-tip"></div></div></div>' +
        '<div class="span-6 span-lg-12"><h3 class="card-h">Durasi paket terlaris</h3><div class="chart-box chart-box--html">' + peringkat(r.durasi, { ukur: 'n' }) + '<div class="chart-tip"></div></div></div>' +
        '<div class="span-12"><h3 class="card-h">Paket Open Trip paling banyak dipesan</h3><div class="chart-box chart-box--html">' + peringkat(r.paket, { ukur: 'n', kosong: 'Tidak ada pemesanan Open Trip pada periode ini. Jenis trip per tab diatur di Pengaturan → Sumber Data.' }) + '<div class="chart-tip"></div></div></div></div></section></div>';
      el.onchange = function (e) { if (e.target.id === 'rp-bln') st.bulan = e.target.value; if (e.target.id === 'rp-tab') st.tab = e.target.value; if (/^rp-/.test(e.target.id)) { H.render(el); UI.hitungNaik(el); Grafik.hidupkan(el); } };
      Hal.aksiPeta(el, {
        basis: function (d) { st.basis = d.b; H.render(el); Grafik.hidupkan(el); },
        pdf: async function () { var x = HT.report(Store.D, { bulan: st.bulan || U.hariIni().slice(0, 7), basis: st.basis, tab: st.tab, S: Store.S, today: U.hariIni() }); await Dok.laporanReport(x); C.api('laporan.catat', { jenis: 'report', periode: x.bulan, format: 'pdf' }, { senyap: true }); }
      });
    },
    segarkan: function (el) { var y = scrollY; H.render(el); window.scrollTo(0, y); UI.pasTeks(el); }
  };
})();
