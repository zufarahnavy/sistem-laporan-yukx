/* =====================================================================
   YukBanyuwangi — Rekapitulasi
   Tabel per bulan persis template "Dummy Rekapitulasi" (bagian
   YukBanyuwangi & Sunrise Boat). Draft rekap = BUDGET kalkulasi; setelah
   trip Admin menambah over budget (KONSUM / LL…) & pengeluaran yang tidak
   lewat manifest (kendaraan, penginapan, paket pulau), lalu mengajukan.
   Finance mengecek & mengunci margin. Unduh Excel/PDF, tulis ke Google Sheet.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { bulan: '', ed: null, drawer: null };

  function bulan() { return st.bulan || U.hariIni().slice(0, 7); }
  function data() { var per = HT.rentangPeriode(bulan(), U.hariIni()); return { per: per, rows: HT.rekapDaftar(Store.D, { dari: per.dari, sampai: per.sampai, S: Store.S, today: U.hariIni() }), L: HT.labelRekap(Store.S) }; }
  function persen(x) { return (Math.round(x * 10000) / 100).toFixed(2).replace('.', ',') + '%'; }
  function u(v) { return v ? U.ribuan(v) : ''; }

  function tabelBagian(b, rows, L) {
    var lb = L[b].L, kol = L[b].kolom, adaHpp = !!String(lb.HPP || '').trim();
    var h1 = '<tr><th rowspan="2" class="num">' + esc(lb.NO) + '</th><th rowspan="2" class="rk__kode">' + esc(lb.KODE) + '</th><th rowspan="2" class="num">' + esc(lb.QTY) + '</th><th rowspan="2">' + esc(lb.PIC) + '</th><th rowspan="2" class="num">' + esc(lb.PRICE) + '</th><th rowspan="2" class="num rk__jual">' + esc(lb.PENJUALAN) + '</th>' +
      (adaHpp ? '<th colspan="' + kol.length + '" class="center rk__hpp">' + esc(lb.HPP) + '</th>' : kol.map(function (k) { return '<th rowspan="2" class="num">' + esc(k.l) + '</th>'; }).join('')) +
      '<th rowspan="2" class="num rk__peng">' + esc(lb.PENGELUARAN) + '</th><th rowspan="2" class="num">' + esc(lb.LABA) + '</th><th class="num">' + esc(lb.MARGIN_A) + '</th><th class="num">' + esc(lb.RATAAN_A) + '</th></tr>';
    var h2 = '<tr>' + (adaHpp ? kol.map(function (k) { return '<th class="num">' + esc(k.l) + '</th>'; }).join('') : '') + '<th class="num">' + esc(lb.MARGIN_B) + '</th><th class="num">' + esc(lb.RATAAN_B) + '</th></tr>';
    var t = HT.totalRekap(rows), tk = {}; rows.forEach(function (r) { kol.forEach(function (k) { tk[k.k] = (tk[k.k] || 0) + (r.kol[k.k] || 0); }); });
    var body = rows.map(function (r, i) {
      var cls = 'rk-' + (r.kunci ? 'kunci' : r.status === 'Siap Dicek' ? 'siap' : 'draft') + (r.rugi ? ' rk-rugi' : '');
      return '<tr class="click ' + cls + '" data-id="' + r.id + '" tabindex="0"><td class="num">' + (i + 1) + '</td><td class="rk__kode"><b class="truncate" style="display:block">' + esc(r.kode) + '</b><span class="rk__st">' + (r.kunci ? ic('lock', 12) + 'Terkunci' : r.status === 'Siap Dicek' ? ic('clock', 12) + 'Siap dicek' : r.selesai ? 'Draft' : 'Estimasi · trip belum selesai') + (r.over ? ' · over ' + U.rpRingkas(r.over) : '') + (!r.adaKalkulasi && !r.kunci ? ' · tanpa kalkulasi' : '') + '</span></td>' +
        '<td class="num">' + r.inf.pax + '</td><td>' + esc(b === 'SB' ? r.kapal : r.p.PIC) + '</td><td class="num">' + u(r.inf.harga) + '</td><td class="num rk__jual">' + u(r.penjualan) + '</td>' +
        kol.map(function (k) { var a = r.asal && r.asal[k.k]; return '<td class="num' + (a && a.tambahan ? ' rk__tamb' : '') + '"' + (a && a.tambahan ? ' title="Termasuk tambahan ' + U.rp(a.tambahan) + '"' : '') + '>' + u(r.kol[k.k]) + '</td>'; }).join('') +
        '<td class="num rk__peng">' + u(r.pengeluaran) + '</td><td class="num ' + (r.rugi ? 'danger' : '') + '">' + U.ribuan(r.laba) + '</td><td class="num ' + (r.rugi ? 'danger' : '') + '">' + U.ribuan(r.laba) + '</td><td class="num">' + persen(r.margin) + '</td></tr>';
    }).join('');
    var foot = '<tfoot><tr><td></td><td><b>TOTAL</b></td><td class="num">' + t.pax + '</td><td></td><td></td><td class="num">' + u(t.penjualan) + '</td>' + kol.map(function (k) { return '<td class="num">' + u(tk[k.k]) + '</td>'; }).join('') + '<td class="num">' + u(t.pengeluaran) + '</td><td class="num">' + U.ribuan(t.laba) + '</td><td class="num">' + U.ribuan(t.laba) + '</td><td class="num">' + persen(t.margin) + '</td></tr></tfoot>';
    return '<section class="card card--pad0 rk-bagian"><div class="rk-bagian__h"><h2>' + esc(lb.JUDUL) + '</h2><span class="muted">' + rows.length + ' trip · ' + t.terkunci + ' terkunci · margin ' + persen(t.margin) + '</span></div>' +
      (rows.length ? '<div class="lembar-wrap"><table class="lembar rk"><thead>' + h1 + h2 + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div>' : '<div style="padding:8px 20px 20px">' + UI.kosong('chart-column', 'Tidak ada trip ' + lb.JUDUL + ' bulan ini') + '</div>') + '</section>';
  }

  // ---------------------------------------------------------------- editor drawer
  function rkDraft(id) {
    var p = Store.get('Pesanan', id), lama = Store.get('Rekap', id);
    if (!p) { var all = HT.rekapDaftar(Store.D, { S: Store.S, today: U.hariIni() }); return all.find(function (r) { return r.id === id; }) || null; }
    if (!st.ed || st.ed.id !== id) return HT.rekapPesanan(Store.D, HT.indeks(Store.D), p, Store.S, U.hariIni());
    var row = Object.assign({ ID_Pesanan: id, Status: 'Draft', Riwayat: '[]' }, lama || {}, { Tambahan: JSON.stringify(st.ed.tambahan), Kode_Trip: st.ed.kode, Kapal: st.ed.kapal });
    var D = Object.assign({}, Store.D, { Rekap: Store.D.Rekap.filter(function (r) { return r.ID_Pesanan !== id; }).concat([row]) });
    return HT.rekapPesanan(D, HT.indeks(D), p, Store.S, U.hariIni());
  }
  function mulaiEdit(id) { var r = HT.rekapPesanan(Store.D, HT.indeks(Store.D), Store.get('Pesanan', id) || {}, Store.S, U.hariIni()), row = Store.get('Rekap', id) || {}; st.ed = { id: id, tambahan: (r.tambahan || []).map(function (t) { return Object.assign({}, t); }), kode: r.kode, kapal: row.Kapal || '', catatan: row.Catatan || '', kotor: false }; }
  function isiEditor(id) {
    var r = rkDraft(id); if (!r) return UI.kosong('search', 'Data rekap tidak ditemukan');
    var L = HT.labelRekap(Store.S)[r.bagian], kol = L.kolom, adm = Store.isAdmin(), fin = Store.isFin(), kunci = r.kunci, ro = kunci || !adm, ed = st.ed;
    var riw = (U.parseJson(r.row && r.row.Riwayat, []) || []).slice().reverse();
    var JENIS = YX.JENIS_TAMBAHAN, saranKol = r.bagian === 'SB' ? 'LAIN' : 'KONSUM';
    return '<div class="card card--tight"><div class="mini-kpi"><div><span class="label">Penjualan</span><b class="num">' + U.rp(r.penjualan) + '</b></div><div><span class="label">Pengeluaran</span><b class="num">' + U.rp(r.pengeluaran) + '</b></div><div><span class="label">Laba kotor</span><b class="num ' + (r.rugi ? 'danger' : 'ok') + '">' + U.rp(r.laba) + '</b></div><div><span class="label">Margin</span><b class="num">' + persen(r.margin) + '</b></div></div>' +
      (r.budgetKalkulasi ? '<p class="help muted" style="margin-top:8px">Budget kalkulasi ' + U.rp(r.budgetKalkulasi) + (r.over ? ' · over budget ' + U.rp(r.over) : '') + (adm && !kunci ? ' · <a href="#/kalkulasi/' + r.id + '">ubah kalkulasi</a>' : '') + '</p>' : '<div class="note warn" style="margin-top:8px">' + ic('triangle-alert') + '<span>Belum ada kalkulasi — pengeluaran hanya dari tambahan di bawah.' + (adm && !kunci ? ' <a href="#/kalkulasi/' + r.id + '">Buat kalkulasi</a>' : '') + '</span></div>') + '</div>' +
      '<div class="card card--tight"><div class="form">' +
      '<div class="field field--full"><label for="rk-kode">' + esc(L.L.KODE) + '</label><input class="input" id="rk-kode" data-e="kode" value="' + esc(ro ? r.kode : ed.kode) + '"' + (ro ? ' disabled' : '') + '></div>' +
      (r.bagian === 'SB' ? '<div class="field field--full"><label for="rk-kapal">' + esc(L.L.PIC) + ' (kapal)</label><input class="input" id="rk-kapal" data-e="kapal" value="' + esc(ro ? r.kapal : ed.kapal) + '"' + (ro ? ' disabled' : '') + ' placeholder="Nama kapal"></div>' : '') + '</div></div>' +
      '<div class="card card--tight"><b style="display:block;margin-bottom:8px">Rincian per kolom</b><table class="rk-rinci"><thead><tr><th>Kolom</th><th class="num">Kalkulasi</th><th class="num">Tambahan</th><th class="num">Total</th></tr></thead><tbody>' +
      kol.map(function (k) { var a = r.asal ? r.asal[k.k] : null, tot = r.kol[k.k] || 0; if (!tot && !(a && (a.kalkulasi || a.tambahan))) return ''; return '<tr><td>' + esc(k.l) + '</td><td class="num">' + (a ? u(a.kalkulasi) : '—') + '</td><td class="num">' + (a ? u(a.tambahan) : '—') + '</td><td class="num"><b>' + U.ribuan(tot) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card card--tight"><div class="between" style="margin-bottom:6px"><b>Pengeluaran tambahan</b>' + (ed && ed.kotor ? '<span class="badge warn">Belum disimpan</span>' : '') + '</div><p class="help muted" style="margin-bottom:10px">Over budget setelah trip (masukkan ke kolom ' + esc(kol.find(function (k) { return k.k === saranKol; }).l) + ' atau ' + esc(kol.find(function (k) { return k.k === (r.bagian === 'SB' ? 'LAIN' : 'LL'); }).l) + ') dan pengeluaran yang dieksekusi Admin langsung — kendaraan, penginapan, paket pulau.</p>' +
      '<div class="stack" id="rk-tamb" style="gap:8px">' + (ro ? (r.tambahan || []) : ed.tambahan).map(function (t, i) {
        return '<div class="tamb" data-i="' + i + '"><select class="select" data-t="jenis"' + (ro ? ' disabled' : '') + '>' + JENIS.map(function (j) { return '<option' + (t.jenis === j ? ' selected' : '') + '>' + j + '</option>'; }).join('') + '</select><select class="select" data-t="kolom"' + (ro ? ' disabled' : '') + '>' + kol.map(function (k) { return '<option value="' + k.k + '"' + (t.kolom === k.k ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '</select>' +
          '<input class="input" data-t="uraian" value="' + esc(t.uraian) + '" placeholder="Uraian, mis. Tambahan makan malam"' + (ro ? ' disabled' : '') + '><input class="input num" data-t="nominal" inputmode="numeric" value="' + (t.nominal ? Number(t.nominal).toLocaleString('id-ID') : '') + '" placeholder="Nominal"' + (ro ? ' disabled' : '') + '>' + (ro ? '' : '<button class="icon-btn" data-x="tHapus" data-i="' + i + '" aria-label="Hapus">' + ic('x', 18) + '</button>') + '</div>';
      }).join('') + (!(ro ? r.tambahan : ed.tambahan).length ? '<p class="muted">Belum ada tambahan.</p>' : '') + '</div>' +
      (ro ? '' : '<div class="row wrap" style="gap:6px;margin-top:10px"><button class="btn btn--soft btn--sm" data-x="tTambah" data-j="Over budget" data-k="' + saranKol + '">' + ic('plus', 16) + 'Over budget</button><button class="btn btn--soft btn--sm" data-x="tTambah" data-j="Non-manifest" data-k="' + (r.bagian === 'SB' ? 'LAIN' : 'KEND') + '">' + ic('plus', 16) + 'Non-manifest</button><button class="btn btn--ghost btn--sm" data-x="tTambah" data-j="Lainnya" data-k="' + (r.bagian === 'SB' ? 'LAIN' : 'LL') + '">' + ic('plus', 16) + 'Lainnya</button></div>') + '</div>' +
      '<div class="card card--tight"><label for="rk-cat" style="font-weight:700;display:block;margin-bottom:6px">Catatan</label><textarea class="textarea" id="rk-cat" data-e="catatan" rows="2"' + (ro ? ' disabled' : '') + '>' + esc(ro ? (r.row && r.row.Catatan || '') : ed.catatan) + '</textarea></div>' +
      (riw.length ? '<div class="card card--tight"><b style="display:block;margin-bottom:10px">Riwayat</b><div class="timeline">' + riw.slice(0, 8).map(function (h) { return '<div class="tl ' + (/Kunci margin/.test(h.a) ? 'on' : /Buka/.test(h.a) ? 'bad' : '') + '"><b>' + esc(h.a) + '</b><small>' + esc(h.o) + ' · ' + esc(F.waktu(h.w)) + '</small>' + (h.k ? '<div class="quote">' + esc(h.k) + '</div>' : '') + '</div>'; }).join('') + '</div></div>' : '') +
      (r.hilangDiSheet ? '<div class="note warn">' + ic('info') + '<span>Baris pesanan ini sudah tidak ada di sheet — rekap terkunci dipertahankan sebagai arsip.</span></div>' : '');
  }
  function kakiEditor(id) {
    var r = rkDraft(id); if (!r) return '';
    if (Store.isFin()) return r.kunci ? '<button class="btn btn--ghost" data-x="buka">' + ic('lock-open', 18) + 'Buka kunci</button>' : '<button class="btn btn--ok" data-x="kunci">' + ic('lock', 18) + 'Kunci margin</button>';
    if (!Store.isAdmin() || r.kunci) return '';
    return '<button class="btn btn--ghost" data-x="simpan">' + ic('save', 18) + 'Simpan</button><button class="btn btn--primary" data-x="ajukan">' + ic('send', 18) + (r.status === 'Siap Dicek' ? 'Ajukan ulang' : 'Ajukan ke Finance') + '</button>';
  }
  function bukaEditor(id) {
    var p = Store.get('Pesanan', id), r = rkDraft(id); if (!r) { UI.toast('Data rekap tidak ditemukan.', 'warn'); return; }
    if (st.drawer && !st.drawer.h.ditutup) st.drawer.h.tutup();
    mulaiEdit(id);
    var h = UI.drawer({ kepala: '<div class="between"><span class="label">Rekap · ' + esc(r.bagian === 'SB' ? 'Sunrise Boat' : 'YukBanyuwangi') + '</span><div class="row" style="gap:6px">' + UI.badge(r.status) + '<button class="icon-btn" data-tutup aria-label="Tutup">' + ic('x') + '</button></div></div>' + Hal.kartuPesanan(r.p),
      isi: isiEditor(id), kaki: kakiEditor(id), onTutup: function () { st.drawer = null; st.ed = null; if (/[?&]id=/.test(location.hash)) history.replaceState(null, '', '#/rekap?bulan=' + bulan()); } });
    st.drawer = { h: h, id: id };
    function segar(semua) { var b = h.el.querySelector('.drawer__body'), y = b.scrollTop; if (semua) b.innerHTML = isiEditor(id); else { var tmp = document.createElement('div'); tmp.innerHTML = isiEditor(id); var tc = tmp.querySelectorAll(':scope > .card'), bc = b.querySelectorAll(':scope > .card'); if (tc.length !== bc.length) { b.innerHTML = tmp.innerHTML; } else { bc[0].replaceWith(tc[0]); bc[2].replaceWith(tc[2]); bc[3].querySelector('.between').innerHTML = tc[3].querySelector('.between').innerHTML; } } b.scrollTop = y; if (semua) { var f = h.el.querySelector('.drawer__foot'); if (f) f.innerHTML = kakiEditor(id); } }
    h.segar = segar;
    h.el.addEventListener('input', function (e) {
      var t = e.target; if (!st.ed) return;
      if (t.dataset.e) { st.ed[t.dataset.e] = t.value; st.ed.kotor = true; return; }
      if (t.dataset.t) { var it = st.ed.tambahan[+t.closest('.tamb').dataset.i]; if (t.dataset.t === 'nominal') { var v = t.value.replace(/\D/g, ''); t.value = v ? Number(v).toLocaleString('id-ID') : ''; it.nominal = Number(v) || 0; } else it[t.dataset.t] = t.value; st.ed.kotor = true; segar(false); }
    });
    h.el.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' && t.dataset.t && st.ed) { st.ed.tambahan[+t.closest('.tamb').dataset.i][t.dataset.t] = t.value; st.ed.kotor = true; segar(false); } });
    h.el.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; var x = b.dataset.x;
      if (x === 'tTambah') { st.ed.tambahan.push({ jenis: b.dataset.j, kolom: b.dataset.k, uraian: '', nominal: 0 }); st.ed.kotor = true; segar(true); var u2 = h.el.querySelectorAll('[data-t="uraian"]'); if (u2.length) u2[u2.length - 1].focus(); }
      if (x === 'tHapus') { st.ed.tambahan.splice(+b.dataset.i, 1); st.ed.kotor = true; segar(true); }
      if (x === 'simpan' || x === 'ajukan') {
        var r1 = await C.aksi('rekap.simpan', { ID_Pesanan: id, Tambahan: st.ed.tambahan, Kode_Trip: st.ed.kode, Kapal: st.ed.kapal, Catatan: st.ed.catatan }, { btn: x === 'simpan' ? b : null, diam: x === 'ajukan' });
        if (!r1.success) { if (x === 'ajukan') UI.toast(r1.message, 'err'); return; }
        st.ed.kotor = false;
        if (x === 'ajukan') { var c2 = await UI.konfirmasi({ judul: 'Ajukan rekap ke Finance?', teks: 'Finance mendapat notifikasi untuk mengecek & mengunci margin.', ok: 'Ajukan', ikon: 'send', input: { label: 'Catatan untuk Finance (opsional)', area: true } }); if (c2 !== false) { var r2 = await C.aksi('rekap.ajukan', { ID_Pesanan: id, Catatan: c2 === true ? '' : c2 }, { proses: 'Mengajukan ke Finance' }); if (r2.success) C.Pekerja.jalan(); } }
        mulaiEdit(id); segar(true);
      }
      if (x === 'kunci') { var c3 = await UI.konfirmasi({ judul: 'Kunci margin trip ini?', teks: 'Angka rekap dibekukan & masuk laporan laba rugi. Bisa dibuka lagi dengan alasan.', ok: 'Kunci margin', ikon: 'lock', input: { label: 'Catatan (opsional)' } }); if (c3 === false) return; var r3 = await C.aksi('rekap.kunci', { ID_Pesanan: id, catatan: c3 === true ? '' : c3 }, { btn: b, proses: 'Mengunci margin' }); if (r3.success) { C.Pekerja.jalan(); mulaiEdit(id); segar(true); } }
      if (x === 'buka') { var a = await UI.konfirmasi({ judul: 'Buka kunci margin?', teks: 'Admin bisa memperbaiki rekap lagi; laba rugi berubah sampai dikunci ulang.', ok: 'Buka kunci', bahaya: true, input: { label: 'Alasan (min. 5 karakter)', wajib: true } }); if (!a) return; var r4 = await C.aksi('rekap.buka', { ID_Pesanan: id, alasan: a }, { btn: b }); if (r4.success) { C.Pekerja.jalan(); mulaiEdit(id); segar(true); } }
    });
  }

  function unduhExcel(btn) {
    var y = bulan().slice(0, 4), L = HT.labelRekap(Store.S);
    UI.popover(btn, '<button class="menu-item" data-x="bln">' + ic('file-spreadsheet') + 'Bulan ' + esc(U.labelBulan(bulan())) + '</button><button class="menu-item" data-x="thn">' + ic('files') + 'Tahun ' + y + ' (satu tab per bulan)</button>', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; UI.tutupPopover();
      var selesai = UI.proses('Membuat Excel rekap'), list = [];
      try {
        if (b.dataset.x === 'bln') list = [HT.dataRekapSheet(Store.D, Store.S, U.hariIni(), bulan())];
        else for (var m = 1; m <= 12; m++) { var d = HT.dataRekapSheet(Store.D, Store.S, U.hariIni(), y + '-' + U.pad(m, 2)); if (d.YB.length || d.SB.length) list.push(d); }
        if (!list.length) { selesai(false); UI.toast('Tidak ada data rekap.', 'warn'); return; }
        await Dok.excelRekap('Rekapitulasi ' + (b.dataset.x === 'bln' ? U.labelBulan(bulan()) : y), list, L); selesai(true, 'Excel diunduh');
        C.api('laporan.catat', { jenis: 'rekap', periode: b.dataset.x === 'bln' ? bulan() : y, format: 'xlsx' }, { senyap: true });
      } catch (err) { selesai(false); UI.toast(err.message, 'err'); }
    });
  }

  var H = window.Halaman.rekap = {
    render: function (el, args, q) {
      if (q && /^\d{4}-\d{2}$/.test(q.bulan || '')) st.bulan = q.bulan;
      var d = data(), t = HT.totalRekap(d.rows), fin = Store.isFin(), adm = Store.isAdmin(), siap = d.rows.filter(function (r) { return r.status === 'Siap Dicek'; });
      el.innerHTML = Hal.kepala({ judul: 'Rekapitulasi', sub: 'Format persis template rekap — per bulan tanggal trip. Laba rugi hanya memakai rekap yang sudah dikunci Finance.',
        aksi: Hal.bulanPilih('rk-bln', bulan(), { maju: 6, mundur: 18 }) + '<button class="btn btn--ghost" data-act="excel">' + ic('file-spreadsheet', 18) + '<span>Excel</span></button><button class="btn btn--ghost" data-act="pdf">' + ic('file-down', 18) + '<span>PDF</span></button>' +
          (Store.S.REKAP_SHEET_AKTIF === 'YA' ? '<button class="btn btn--soft" data-act="sheet" title="Tulis ulang tab rekap bulan ini di file Google Sheets Rekapitulasi">' + ic('table-2', 18) + '<span class="hide-sm">Tulis ke Google Sheet</span></button>' : '') }) +
        '<div class="bento two-sm" style="margin-bottom:16px">' +
        UI.stat({ label: 'Laba kotor ' + U.labelBulan(bulan()), nilai: UI.hitung(t.laba, 'rp'), hero: true, kaki: '<span>Margin ' + persen(t.margin) + ' · ' + t.n + ' trip</span>' }) +
        UI.stat({ label: 'Penjualan', nilai: UI.hitung(t.penjualan, 'rp'), ikon: 'trending-up', kaki: '<span>' + t.pax + ' pax</span>' }) +
        UI.stat({ label: 'Pengeluaran', nilai: UI.hitung(t.pengeluaran, 'rp'), ikon: 'wallet', tone: 'warn', kaki: '<span>' + (t.over ? 'Over budget ' + U.rpRingkas(t.over) : 'Tanpa over budget') + '</span>' }) +
        UI.stat({ label: 'Terkunci Finance', nilai: t.terkunci + '<small> / ' + t.n + '</small>', ikon: 'lock', tone: t.terkunci === t.n && t.n ? 'ok' : '', kaki: '<span>' + t.siap + ' siap dicek' + (t.rugi ? ' · ' + t.rugi + ' rugi' : '') + '</span>' }) + '</div>' +
        (fin && siap.length ? '<div class="note warn between" style="margin-bottom:16px">' + '<span class="row" style="gap:8px">' + ic('clock') + '<span><b>' + siap.length + ' rekap</b> diajukan Admin dan menunggu dicek.</span></span><button class="btn btn--ok btn--sm" data-act="kunciSemua">' + ic('lock', 16) + 'Kunci semua (' + siap.length + ')</button></div>' : '') +
        '<div class="legend" style="margin-bottom:12px"><span><i class="rk-leg draft"></i>Draft / estimasi</span><span><i class="rk-leg siap"></i>Siap dicek</span><span><i class="rk-leg kunci"></i>Terkunci</span><span><i class="rk-leg tamb"></i>Termasuk pengeluaran tambahan</span></div>' +
        '<div class="stack" style="gap:16px" id="rk-isi">' + ['YB', 'SB'].map(function (b) { return tabelBagian(b, d.rows.filter(function (r) { return r.bagian === b; }), d.L); }).join('') + '</div>';
      el.onchange = function (e) { if (e.target.id === 'rk-bln') { st.bulan = e.target.value; history.replaceState(null, '', '#/rekap?bulan=' + st.bulan); H.render(el, [], {}); UI.hitungNaik(el); } };
      Hal.aksiPeta(el, {
        excel: function (dd, b) { unduhExcel(b); },
        pdf: async function () { var x = data(); await Dok.laporanRekap(x.rows, x.L, x.per.label); C.api('laporan.catat', { jenis: 'rekap', periode: bulan(), format: 'pdf' }, { senyap: true }); },
        sheet: async function (dd, b) { var r = await C.aksi('rekap.tulisSheet', { bulan: bulan() }, { btn: b, proses: 'Menjadwalkan tulis rekap ke Google Sheet', loadingText: 'Menulis…' }); if (r.success) C.Pekerja.jalan(); },
        kunciSemua: async function (dd, b) { var ids = data().rows.filter(function (r) { return r.status === 'Siap Dicek'; }).map(function (r) { return r.id; }); if (!(await UI.konfirmasi({ judul: 'Kunci ' + ids.length + ' rekap sekaligus?', teks: 'Margin dibekukan & masuk laba rugi.', ok: 'Kunci semua', ikon: 'lock' }))) return; var r = await C.aksi('rekap.kunci', { ids: ids }, { btn: b, proses: 'Mengunci margin' }); if (r.success) C.Pekerja.jalan(); }
      }, function (e) { var r = e.target.closest('tr[data-id]'); if (r) bukaEditor(r.dataset.id); });
      el.onkeydown = function (e) { if (e.key === 'Enter') { var r = e.target.closest('tr[data-id]'); if (r) bukaEditor(r.dataset.id); } };
      if (q && q.id) setTimeout(function () { bukaEditor(q.id); }, 60);
    },
    navigasi: function (el, args, q) { var bl = q && q.bulan; if (bl && bl !== bulan()) { st.bulan = bl; H.render(el, [], q); UI.hitungNaik(el); return; } if (q && q.id) bukaEditor(q.id); },
    segarkan: function (el) {
      var y = scrollY; H.render(el, [], {}); window.scrollTo(0, y); UI.pasTeks(el);
      if (st.drawer && !st.drawer.h.ditutup && st.drawer.h.segar) { if (st.ed && !st.ed.kotor) mulaiEdit(st.drawer.id); st.drawer.h.segar(true); }
    }
  };
})();
