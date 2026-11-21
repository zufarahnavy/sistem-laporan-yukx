/* =====================================================================
   YukBanyuwangi — Laba Rugi
   Penjualan & HPP dari rekap yang SUDAH DIKUNCI Finance, dikurangi biaya
   operasional perusahaan (gaji, sewa, iklan, dll.) yang diinput Finance.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { mode: 'bulan', periode: '' };

  function periode() { if (st.periode) return st.periode; var t = U.hariIni(); return st.mode === 'tahun' ? t.slice(0, 4) : st.mode === 'kuartal' ? 'Q' + Math.ceil(+t.slice(5, 7) / 3) + '-' + t.slice(0, 4) : t.slice(0, 7); }
  function pilihPeriode() {
    var t = U.hariIni(), y = +t.slice(0, 4), o = [];
    if (st.mode === 'bulan') for (var k = 0; k < 18; k++) { var b = HT.geserBulan(t.slice(0, 7), -k); o.push([b, U.labelBulan(b)]); }
    if (st.mode === 'kuartal') for (var yy = y; yy >= y - 2; yy--) for (var q = 4; q >= 1; q--) o.push(['Q' + q + '-' + yy, 'Kuartal ' + q + ' ' + yy]);
    if (st.mode === 'tahun') for (var z = y; z >= y - 4; z--) o.push([String(z), 'Tahun ' + z]);
    return '<select class="select" id="lr-per" style="width:auto">' + o.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === periode() ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>';
  }
  function persen(x) { return (Math.round(x * 1000) / 10).toString().replace('.', ',') + '%'; }

  function laporan(lr) {
    var T = lr.total, L = lr.label, b = [];
    function br(l, v, kls, ind) { b.push('<tr class="' + (kls || '') + '"><td' + (ind ? ' class="lr-ind"' : '') + '>' + l + '</td><td class="num">' + v + '</td></tr>'); }
    br('<b>Penjualan trip</b> <span class="muted">' + T.trip + ' trip terkunci · ' + T.pax + ' pax</span>', '<b>' + U.rp(T.penjualan) + '</b>', 'lr-grup');
    ['YB', 'SB'].forEach(function (g) { var pb = lr.perBagian[g]; if (pb.n) br(esc(L[g].L.JUDUL) + ' <span class="muted">(' + pb.n + ' trip)</span>', U.rp(pb.penjualan), '', true); });
    br('<b>Pengeluaran trip (HPP)</b>', '<b>(' + U.rp(T.pengeluaran) + ')</b>', 'lr-grup');
    ['YB', 'SB'].forEach(function (g) { HT.kolomDenganKustom(L, g, Object.keys(lr.hpp[g] || {})).forEach(function (k) { var v = lr.hpp[g][k.k]; if (v) br(esc(L[g].L.JUDUL) + ' · ' + esc(k.l), U.rp(v), '', true); }); });
    br('<b>Laba kotor</b> <span class="muted">margin ' + persen(T.marginKotor) + '</span>', '<b>' + U.rp(T.labaKotor) + '</b>', 'lr-total');
    br('<b>Biaya operasional perusahaan</b>', '<b>(' + U.rp(T.operasional) + ')</b>', 'lr-grup');
    Object.keys(lr.opsKat).sort().forEach(function (k) { br(esc(k), U.rp(lr.opsKat[k]), '', true); });
    if (!Object.keys(lr.opsKat).length) br('<span class="muted">Belum ada biaya operasional pada periode ini</span>', '—', '', true);
    br('<b>Laba / rugi bersih</b> <span class="muted">margin ' + persen(T.marginBersih) + '</span>', '<b>' + U.rp(T.labaBersih) + '</b>', 'lr-total ' + (T.labaBersih < 0 ? 'lr-rugi' : 'lr-laba'));
    return '<table class="lr-tabel"><tbody>' + b.join('') + '</tbody></table>';
  }
  function tabelOps(lr, fin) {
    return UI.tabel({ baris: lr.ops, kosong: 'Belum ada biaya operasional', kosongIkon: 'wallet', kosongTeks: fin ? 'Catat gaji, sewa kantor, iklan, dan biaya rutin lainnya.' : '', klik: fin ? function (o) { return o.ID_Biaya; } : null, kolom: [
      { label: 'Bulan', render: function (o) { return U.labelBulan(o.Bulan) + (o.Tanggal ? '<span class="sub">' + U.tglId(o.Tanggal) + '</span>' : ''); } },
      { label: 'Kategori', render: function (o) { return UI.badge(o.Kategori, 'neutral', false); } },
      { label: 'Uraian', render: function (o) { return esc(o.Uraian) + (o.Catatan ? '<span class="sub">' + esc(o.Catatan) + '</span>' : ''); } },
      { label: 'Nominal', num: true, render: function (o) { return U.ribuan(o.Nominal); } },
      { label: 'Dicatat', render: function (o) { return esc(o.Dibuat_Oleh || '-'); } }] });
  }
  function formBiaya(o) {
    var bln = o ? o.Bulan : (st.mode === 'bulan' ? periode() : U.hariIni().slice(0, 7));
    UI.modal({ judul: o ? 'Ubah biaya operasional' : 'Catat biaya operasional', ukuran: 'sm',
      isi: UI.form([{ name: 'Bulan', label: 'Bulan', type: 'month', wajib: true, nilai: bln }, { name: 'Tanggal', label: 'Tanggal (opsional)', type: 'date' }, { name: 'Kategori', label: 'Kategori', type: 'select', opsi: YX.BIAYA_OPS_KATEGORI, nilai: 'Lain-lain' }, { name: 'Nominal', label: 'Nominal', type: 'rupiah', wajib: true }, { name: 'Uraian', label: 'Uraian', wajib: true, full: true, ph: 'Gaji staf kantor Oktober' }, { name: 'Catatan', label: 'Catatan', full: true }], o || {}),
      onBuka: function (h) { UI.siapkanForm(h.body); },
      aksi: (o ? [{ label: 'Hapus', kelas: 'btn--danger-ghost', ikon: 'trash-2', klik: async function (h, b) { if (!(await UI.konfirmasi({ judul: 'Hapus biaya ini?', ok: 'Hapus', bahaya: true }))) return false; return (await C.aksi('biaya.hapus', { id: o.ID_Biaya }, { btn: b })).success; } }] : []).concat([{ label: 'Batal' }, { label: 'Simpan', kelas: 'btn--primary', ikon: 'save', klik: async function (h, b) { if (!UI.cekWajib(h.body)) return false; var d = UI.bacaForm(h.body); if (o) d.ID_Biaya = o.ID_Biaya; return (await C.aksi('biaya.simpan', d, { btn: b })).success; } }]) });
  }

  var H = window.Halaman.labarugi = {
    render: function (el) {
      var lr = HT.labaRugi(Store.D, { periode: periode(), S: Store.S, today: U.hariIni() }), T = lr.total, fin = Store.isFin();
      el.innerHTML = Hal.kepala({ judul: 'Laba Rugi', sub: 'Hanya trip yang margin-nya sudah dikunci Finance, dikurangi biaya operasional perusahaan.',
        aksi: '<div class="seg">' + [['bulan', 'Bulanan'], ['kuartal', 'Kuartal'], ['tahun', 'Tahunan']].map(function (m) { return '<button data-act="mode" data-m="' + m[0] + '" class="' + (st.mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div>' + pilihPeriode() + '<button class="btn btn--ghost" data-act="pdf">' + ic('file-down', 18) + '<span>PDF</span></button>' }) +
        '<div class="bento two-sm" style="margin-bottom:16px">' +
        UI.stat({ label: 'Laba bersih · ' + lr.periode.label, nilai: UI.hitung(T.labaBersih, 'rp'), hero: true, kaki: '<span>Margin bersih ' + persen(T.marginBersih) + '</span>' }) +
        UI.stat({ label: 'Penjualan (terkunci)', nilai: UI.hitung(T.penjualan, 'rp'), ikon: 'trending-up', kaki: '<span>' + T.trip + ' trip · ' + T.pax + ' pax</span>' }) +
        UI.stat({ label: 'Laba kotor trip', nilai: UI.hitung(T.labaKotor, 'rp'), ikon: 'chart-column', tone: T.labaKotor < 0 ? 'danger' : 'ok', kaki: '<span>Margin ' + persen(T.marginKotor) + (T.rugi ? ' · ' + T.rugi + ' trip rugi' : '') + '</span>' }) +
        UI.stat({ label: 'Biaya operasional', nilai: UI.hitung(T.operasional, 'rp'), ikon: 'wallet', tone: 'warn', kaki: '<span>' + lr.ops.length + ' catatan</span>' }) + '</div>' +
        (lr.tertunda.length ? '<div class="note warn" style="margin-bottom:16px">' + ic('clock') + '<span><b>' + lr.tertunda.length + ' trip</b> pada periode ini belum dikunci (estimasi laba ' + U.rp(lr.totalTertunda.laba) + ') — belum masuk laporan. <a href="#/rekap' + (st.mode === 'bulan' ? '?bulan=' + periode() : '') + '">Buka rekap</a></span></div>' : '') +
        '<div class="grid-12" style="align-items:start"><section class="card span-7 span-lg-12"><div class="card__head"><div class="card__title"><h2>Ikhtisar laba rugi</h2><p>' + esc(lr.periode.label) + '</p></div></div>' + laporan(lr) + '</section>' +
        '<section class="card span-5 span-lg-12"><div class="card__head"><div class="card__title"><h2>Per bulan</h2><p>Penjualan vs pengeluaran (trip + operasional)</p></div></div>' +
        (lr.perBulan.length ? Grafik.kapsul(lr.perBulan.map(function (x) { return { label: U.BLN[+x.bulan.slice(5, 7) - 1] || x.bulan, a: x.penjualan, b: x.pengeluaran + x.operasional }; }), { la: 'Penjualan', lb: 'Pengeluaran + operasional', aria: 'Penjualan vs pengeluaran per bulan' }) + '<div class="legend" style="margin-top:8px"><span><i style="background:var(--c-primary)"></i>Penjualan</span><span><i style="background:var(--c-primary-soft)"></i>Pengeluaran + operasional</span></div>' +
          '<table class="lr-mini"><thead><tr><th>Bulan</th><th class="num">Laba bersih</th></tr></thead><tbody>' + lr.perBulan.map(function (x) { return '<tr><td>' + U.labelBulan(x.bulan) + ' <span class="muted">(' + x.trip + ' trip)</span></td><td class="num ' + (x.labaBersih < 0 ? 'danger' : '') + '">' + U.rp(x.labaBersih) + '</td></tr>'; }).join('') + '</tbody></table>' : UI.kosong('chart-column', 'Belum ada data terkunci')) + '</section></div>' +
        '<section class="card card--pad0" style="margin-top:16px"><div class="between" style="padding:20px 20px 12px"><div class="card__title"><h2>Biaya operasional</h2><p>Diinput Finance · dikelompokkan per kategori</p></div>' + (fin ? '<button class="btn btn--primary btn--sm" data-act="biaya">' + ic('plus', 16) + 'Catat biaya</button>' : '') + '</div>' + tabelOps(lr, fin) + '</section>';
      el.onchange = function (e) { if (e.target.id === 'lr-per') { st.periode = e.target.value; H.render(el); UI.hitungNaik(el); Grafik.hidupkan(el); } };
      Hal.aksiPeta(el, {
        mode: function (d) { st.mode = d.m; st.periode = ''; H.render(el); UI.hitungNaik(el); Grafik.hidupkan(el); },
        pdf: async function () { await Dok.laporanLabaRugi(HT.labaRugi(Store.D, { periode: periode(), S: Store.S, today: U.hariIni() })); C.api('laporan.catat', { jenis: 'laba rugi', periode: periode(), format: 'pdf' }, { senyap: true }); },
        biaya: function () { formBiaya(null); }
      }, function (e) { var r = e.target.closest('tr[data-row]'); if (r && fin) formBiaya(Store.get('Biaya_Operasional', r.dataset.row)); });
    },
    segarkan: function (el) { var y = scrollY; H.render(el); window.scrollTo(0, y); UI.pasTeks(el); }
  };
})();
