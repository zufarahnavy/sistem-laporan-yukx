/* =====================================================================
   YukBanyuwangi — Kalkulasi Budget
   Per pesanan: impor dari file Kalkulasi CS (link di sheet), pakai paket
   template, atau isi sendiri. Tiap item ditandai: masuk manifest TL (grup &
   TERIMA TL) atau dieksekusi langsung Admin (kendaraan, penginapan, paket
   pulau…), serta kolom rekap tujuannya. BUDGET mengalir ke draft rekap.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, U = C.U, HT = C.HT;
  var st = { daftar: 'perlu', id: '', items: [], pax: 0, sumber: 'Manual', link: '', paket: '', catatan: '', simpanPaket: false, namaPaket: '', kotor: false };

  function n(v) { return Number(String(v == null ? '' : v).replace(/[^0-9-]/g, '')) || 0; }
  function budget(it, pax) { return Math.round(n(it.Tetap) + n(it.Per_Pax) * (pax || 0)); }
  function terima(it, pax) { return it.Ke_TL === 'YA' ? (it.T === '' || it.T == null ? budget(it, pax) : n(it.T)) : 0; }
  function rp0(v) { return v ? Number(v).toLocaleString('id-ID') : ''; }
  function labelKolom(bagian) { return HT.labelRekap(Store.S)[bagian].kolom; }

  // ---------------------------------------------------------------- tabel item (dipakai editor & paket)
  function barisItem(it, i, bagian, o) {
    var kol = labelKolom(bagian), tl = it.Ke_TL === 'YA', b = budget(it, o.pax);
    return '<div class="ki' + (tl ? ' ki--tl' : '') + '" data-i="' + i + '">' +
      '<label class="ki__uraian"><span class="sr-only">Uraian</span><input class="input" data-f="Uraian" value="' + esc(it.Uraian) + '" placeholder="Nama item, mis. JEEP BALURAN" autocomplete="off"></label>' +
      '<label class="ki__uang"><span class="ki__l">Tetap</span><input class="input num" data-f="Tetap" inputmode="numeric" value="' + rp0(it.Tetap) + '" placeholder="0"></label>' +
      '<label class="ki__uang"><span class="ki__l">Per pax</span><input class="input num" data-f="Per_Pax" inputmode="numeric" value="' + rp0(it.Per_Pax) + '" placeholder="0"></label>' +
      (o.budget ? '<span class="ki__budget num" data-out="b"><span class="ki__l">Budget</span>' + U.ribuan(b) + '</span>' : '') +
      '<label class="ki__tl switch" title="Masuk manifest Tim Lapang"><input type="checkbox" data-f="Ke_TL"' + (tl ? ' checked' : '') + '><span class="track"></span><span class="ki__l">Ke TL</span></label>' +
      '<label class="ki__grup"><span class="ki__l">Grup manifest</span><select class="select" data-f="Grup"' + (tl ? '' : ' disabled') + '>' + (tl ? '' : '<option value="">—</option>') + YX.GRUP_TL.map(function (g) { return '<option' + (it.Grup === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label>' +
      (o.terima ? '<label class="ki__uang"><span class="ki__l">Terima TL</span><input class="input num" data-f="T" inputmode="numeric" value="' + (tl ? (it.T === '' || it.T == null ? '' : rp0(it.T)) : '') + '" placeholder="' + (tl ? U.ribuan(b) : '—') + '"' + (tl ? '' : ' disabled') + '></label>' : '') +
      '<label class="ki__kol"><span class="ki__l">Kolom rekap</span><select class="select" data-f="Kolom">' + kol.map(function (k) { return '<option value="' + k.k + '"' + (it.Kolom === k.k ? ' selected' : '') + '>' + esc(k.l) + '</option>'; }).join('') + '</select></label>' +
      '<button class="icon-btn ki__hapus" data-ki="hapus" aria-label="Hapus item">' + ic('trash-2', 18) + '</button></div>';
  }
  function tabelItem(items, bagian, o) {
    return '<div class="ki-kepala hide-sm"><span>Uraian</span><span>Tetap (Rp)</span><span>Per pax (Rp)</span>' + (o.budget ? '<span class="num">Budget</span>' : '') + '<span>Ke TL</span><span>Grup manifest</span>' + (o.terima ? '<span>Terima TL</span>' : '') + '<span>Kolom rekap</span><span></span></div>' +
      '<div class="ki-daftar">' + (items.length ? items.map(function (it, i) { return barisItem(it, i, bagian, o); }).join('') : '<div class="ki-kosong muted">Belum ada item. Impor dari Kalkulasi CS, pakai paket, atau tambah baris.</div>') + '</div>' +
      '<button class="btn btn--soft btn--sm" data-ki="tambah" style="margin-top:10px">' + ic('plus', 16) + 'Tambah item</button>';
  }
  /** Ikat input item → state; onUbah(ringan) dipanggil tanpa render ulang (fokus tetap). */
  function ikatItem(root, items, bagian, o, onUbah, onRender) {
    root.addEventListener('input', function (e) {
      var x = e.target.closest('[data-f]'), row = e.target.closest('.ki'); if (!x || !row) return;
      var it = items[+row.dataset.i], f = x.dataset.f;
      if (f === 'Uraian') { it.Uraian = x.value; if (!it._kolomManual) { var s = HT.saranItem(HT.indeks(Store.D), bagian, x.value); if (s.diingat || it.Asal !== 'CS') { it.Kolom = it.Ke_TL === 'YA' ? HT.tebakKolom(bagian, x.value, it.Grup) : s.Kolom; var sk = row.querySelector('[data-f="Kolom"]'); if (sk) sk.value = it.Kolom; } } }
      else if (f === 'Tetap' || f === 'Per_Pax' || f === 'T') { var v = x.value.replace(/\D/g, ''); x.value = v ? Number(v).toLocaleString('id-ID') : ''; it[f] = f === 'T' ? (v === '' ? '' : Number(v)) : Number(v) || 0; }
      var ob = row.querySelector('[data-out="b"]'); if (ob) ob.innerHTML = '<span class="ki__l">Budget</span>' + U.ribuan(budget(it, o.pax));
      var t = row.querySelector('[data-f="T"]'); if (t && it.Ke_TL === 'YA') t.placeholder = U.ribuan(budget(it, o.pax));
      onUbah();
    });
    root.addEventListener('change', function (e) {
      var x = e.target.closest('[data-f]'), row = e.target.closest('.ki'); if (!x || !row) return;
      var it = items[+row.dataset.i], f = x.dataset.f;
      if (f === 'Ke_TL') { it.Ke_TL = x.checked ? 'YA' : 'TIDAK'; it.Grup = x.checked ? (it.Grup || HT.tebakGrup(it.Uraian)) : ''; if (!it._kolomManual) it.Kolom = HT.tebakKolom(bagian, it.Uraian, it.Grup); onRender(); return; }
      if (f === 'Grup') { it.Grup = x.value; if (!it._kolomManual) { it.Kolom = HT.tebakKolom(bagian, it.Uraian, it.Grup); row.querySelector('[data-f="Kolom"]').value = it.Kolom; } }
      if (f === 'Kolom') { it.Kolom = x.value; it._kolomManual = true; }
      onUbah();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ki]'); if (!b) return;
      if (b.dataset.ki === 'tambah') { items.push({ Uraian: '', Tetap: 0, Per_Pax: 0, Ke_TL: 'YA', Grup: 'KARCIS', Kolom: HT.tebakKolom(bagian, '', 'KARCIS'), T: '', Asal: 'Manual' }); onRender(); var r = root.querySelectorAll('.ki'); var last = r[r.length - 1]; if (last) last.querySelector('input').focus(); }
      if (b.dataset.ki === 'hapus') { items.splice(+b.closest('.ki').dataset.i, 1); onRender(); }
      onUbah();
    });
  }

  // ---------------------------------------------------------------- muat & simpan
  function dariSimpan(id) {
    var ix = HT.indeks(Store.D), k = HT.ringkasKalkulasi(ix, id), p = ix.psn[id], inf = HT.infoPesanan(p, Store.S);
    st.id = id; st.kotor = false; st.simpanPaket = false;
    st.items = k.items.map(function (i) { return { Uraian: i.Uraian, Tetap: Number(i.Tetap) || 0, Per_Pax: Number(i.Per_Pax) || 0, Ke_TL: i.Ke_TL, Grup: i.Grup, Kolom: i.Kolom, T: Number(i.Terima_TL) === Number(i.Budget) ? '' : Number(i.Terima_TL), Asal: i.Asal, _kolomManual: true }; });
    st.pax = k.ada ? (Number(k.k.Pax) || inf.pax) : inf.pax; st.sumber = k.ada ? k.k.Sumber : 'Manual'; st.link = k.ada ? (k.k.Link_CS || p.Link_Kalkulasi || '') : (p.Link_Kalkulasi || '');
    st.paket = k.ada ? k.k.Paket : ''; st.catatan = k.ada ? k.k.Catatan : ''; st.namaPaket = p.Trip || '';
  }
  function paketCocok(p, bagian) { var t = YX.normalHeader(p.Trip); return Store.D.Paket_Kalkulasi.filter(function (k) { return k.Bagian === bagian; }).sort(function (a, b) { return (YX.normalHeader(b.Nama) === t) - (YX.normalHeader(a.Nama) === t) || String(a.Nama).localeCompare(b.Nama); }); }
  function dariPaket(pk, bagian) {
    return (U.parseJson(pk.Item, []) || []).map(function (i) { return { Uraian: i.Uraian, Tetap: Number(i.Tetap) || 0, Per_Pax: Number(i.Per_Pax) || 0, Ke_TL: i.Ke_TL, Grup: i.Grup, Kolom: HT.kolomValid(bagian, i.Kolom) || HT.tebakKolom(bagian, i.Uraian, i.Grup), T: '', Asal: 'Paket', _kolomManual: true }; });
  }
  async function imporCS(el, url, bagian) {
    if (!/docs\.google\.com\/spreadsheets\/d\//.test(url || '')) { UI.toast('Tempel link Google Sheets file Kalkulasi CS.', 'warn'); return; }
    if (st.items.length && !(await UI.konfirmasi({ judul: 'Ganti item dengan isi Kalkulasi CS?', teks: st.items.length + ' item yang ada akan diganti.', ok: 'Ganti', ikon: 'file-spreadsheet' }))) return;
    var selesai = UI.proses('Membaca file Kalkulasi CS');
    var r = await C.api('kalkulasi.baca', { url: url });
    selesai(r.success, r.success ? r.data.items.length + ' item terbaca' : '');
    if (!r.success) { UI.toast(r.message, 'err'); return; }
    var ix = HT.indeks(Store.D), d = r.data;
    st.items = d.items.map(function (x) {
      var s = HT.saranItem(ix, bagian, x.uraian), keTL = x.grup ? 'YA' : s.Ke_TL, grup = keTL === 'YA' ? (x.grup || s.Grup || HT.tebakGrup(x.uraian)) : '';
      return { Uraian: x.uraian, Tetap: x.budget, Per_Pax: 0, Ke_TL: keTL, Grup: grup, Kolom: s.diingat ? s.Kolom : HT.tebakKolom(bagian, x.uraian, grup), T: x.terima == null ? '' : x.terima, Asal: 'CS', _kolomManual: s.diingat };
    });
    if (d.pax && d.pax !== st.pax) { UI.toast('Pax di file CS: ' + d.pax + ' (sheet: ' + st.pax + '). Nilai pax kalkulasi disamakan dengan file CS.', 'info', 5200); st.pax = d.pax; }
    st.sumber = 'CS'; st.link = url; st.kotor = true; H.editor(el);
  }
  async function simpan(el, b) {
    var p = Store.get('Pesanan', st.id); if (!p) return;
    var items = st.items.filter(function (i) { return String(i.Uraian || '').trim(); });
    if (!items.length) { UI.toast('Isi minimal satu item dengan uraian.', 'warn'); return; }
    var r = await C.aksi('kalkulasi.simpan', { ID_Pesanan: st.id, Sumber: st.sumber, Link_CS: st.link, Pax: st.pax, Paket: st.paket, Catatan: st.catatan, simpanPaket: st.simpanPaket, namaPaket: st.namaPaket,
      items: items.map(function (i) { return { Uraian: i.Uraian, Tetap: i.Tetap, Per_Pax: i.Per_Pax, Ke_TL: i.Ke_TL, Grup: i.Grup, Kolom: i.Kolom, Terima_TL: i.Ke_TL === 'YA' ? i.T : 0, Asal: i.Asal }; }) }, { btn: b });
    if (r.success) { dariSimpan(st.id); H.editor(el); }
  }

  // ---------------------------------------------------------------- ringkasan
  function ringkas(p) {
    var inf = HT.infoPesanan(p, Store.S), tot = 0, tl = 0, tr = 0, non = 0;
    st.items.forEach(function (i) { var b = budget(i, st.pax); tot += b; if (i.Ke_TL === 'YA') { tl += b; tr += terima(i, st.pax); } else non += b; });
    var jual = inf.pax * inf.harga || inf.total, laba = jual - tot;
    return '<div class="ringkas-kal"><div><span class="label">Total budget</span><b class="num">' + U.rp(tot) + '</b></div>' +
      '<div><span class="label">Masuk manifest TL</span><b class="num">' + U.rp(tl) + '</b><small class="muted">Terima TL ' + U.rp(tr) + '</small></div>' +
      '<div><span class="label">Dieksekusi Admin</span><b class="num">' + U.rp(non) + '</b><small class="muted">Kendaraan, penginapan, dll.</small></div>' +
      '<div><span class="label">Estimasi margin</span><b class="num ' + (laba < 0 ? 'danger' : 'ok') + '">' + U.rp(laba) + '</b><small class="muted">Penjualan ' + U.rpRingkas(jual) + (jual ? ' · ' + (Math.round(laba / jual * 1000) / 10).toString().replace('.', ',') + '%' : '') + '</small></div></div>';
  }

  // ---------------------------------------------------------------- daftar
  function daftarRows() {
    var S = Store.S, today = U.hariIni(), ix = HT.indeks(Store.D);
    var rows = Store.D.Pesanan.map(function (p) { var i = HT.infoPesanan(p, S); i.p = p; i.k = HT.ringkasKalkulasi(ix, p.ID_Pesanan); i.h = i.mulai ? U.selisihHari(today, i.mulai) : null; return i; });
    if (st.daftar === 'perlu') rows = rows.filter(function (i) { return i.h !== null && i.h >= 0 && i.h <= 30 && !i.k.ada; });
    if (st.daftar === 'mendatang') rows = rows.filter(function (i) { return i.selesai && i.selesai >= today; });
    if (st.daftar === 'ada') rows = rows.filter(function (i) { return i.k.ada; });
    return U.urutkan(rows, function (i) { return st.daftar === 'ada' ? (i.k.k.Diperbarui || '') : (i.mulai || '9999'); }, st.daftar === 'ada');
  }
  function tabelDaftar() {
    var rows = daftarRows();
    return UI.tabel({ baris: rows, kosong: st.daftar === 'perlu' ? 'Semua trip 30 hari ke depan sudah punya kalkulasi' : 'Tidak ada data', kosongIkon: st.daftar === 'perlu' ? 'circle-check' : 'inbox', klik: function (i) { return i.id; },
      kolom: [
        { label: 'Tamu', render: function (i) { return '<div class="cell-main"><span class="psn-ava ' + (i.bagian === 'SB' ? 'sb' : '') + '">' + ic(i.bagian === 'SB' ? 'sailboat' : 'mountain', 18) + '</span><div class="row__text"><b class="truncate">' + esc(i.p.Nama) + '</b><span class="sub truncate">' + esc(i.p.Trip) + '</span></div></div>'; } },
        { label: 'Jadwal', render: function (i) { return esc(i.jadwal || '-') + (i.h !== null && i.h >= 0 && i.h <= 30 ? '<span class="sub">H-' + i.h + '</span>' : ''); } },
        { label: 'Kategori', render: function (i) { return esc(i.tab); } },
        { label: 'Pax', num: true, render: function (i) { return i.pax; } },
        { label: 'Kalkulasi', render: function (i) { return i.k.ada ? UI.badge(i.k.k.Sumber === 'CS' ? 'Dari CS' : i.k.k.Sumber === 'Paket' ? 'Paket' : 'Manual', 'ok') + '<span class="sub">' + i.k.items.length + ' item</span>' : (i.p.Link_Kalkulasi ? UI.badge('Link CS ada', 'info', 'link') : UI.badge('Belum', 'neutral')); } },
        { label: 'Budget', num: true, render: function (i) { return i.k.ada ? U.ribuan(i.k.total) + '<span class="sub">TL ' + U.ribuan(i.k.totalTL) + '</span>' : '<span class="muted">—</span>'; } },
        { label: 'Est. margin', num: true, render: function (i) { if (!i.k.ada) return '<span class="muted">—</span>'; var l = (i.pax * i.harga || i.total) - i.k.total; return '<span class="' + (l < 0 ? 'danger' : '') + '">' + U.ribuan(l) + '</span>'; } }
      ] });
  }
  function daftarPaket() {
    var pk = U.urutkan(Store.D.Paket_Kalkulasi, function (k) { return k.Bagian + k.Nama; });
    return '<div class="between" style="margin-bottom:14px"><p class="muted">Paket dipakai untuk trip berulang (Open Trip, Sunrise Boat). Saat membuat kalkulasi, paket dengan nama sama seperti kolom TRIP disarankan otomatis.</p><button class="btn btn--primary btn--sm" data-act="paketBaru">' + ic('plus', 16) + 'Paket baru</button></div>' +
      (pk.length ? '<div class="paket-grid">' + pk.map(function (k) {
        var it = U.parseJson(k.Item, []) || [], tot = it.reduce(function (a, i) { return a + (Number(i.Tetap) || 0); }, 0), pp = it.reduce(function (a, i) { return a + (Number(i.Per_Pax) || 0); }, 0);
        return '<button class="card card--tight paket-kartu" data-act="paket" data-id="' + k.ID_Paket + '"><span class="badge ' + (k.Bagian === 'SB' ? 'info' : 'neutral') + '">' + (k.Bagian === 'SB' ? 'Sunrise Boat' : 'YukBanyuwangi') + '</span><b>' + esc(k.Nama) + '</b><small class="muted">' + it.length + ' item' + (tot ? ' · tetap ' + U.rpRingkas(tot) : '') + (pp ? ' · ' + U.rpRingkas(pp) + '/pax' : '') + '</small></button>';
      }).join('') + '</div>' : UI.kosong('package', 'Belum ada paket', 'Simpan kalkulasi sebagai paket, atau buat paket baru.'));
  }
  function editorPaket(pk) {
    var items = pk ? dariPaket(pk, pk.Bagian) : [], bagian = pk ? pk.Bagian : 'YB';
    var h = UI.modal({ judul: pk ? 'Ubah paket' : 'Paket kalkulasi baru', ukuran: 'xl',
      isi: '<div class="form" style="margin-bottom:16px"><div class="field"><label for="pk-nama">Nama paket (samakan dengan kolom TRIP)</label><input class="input" id="pk-nama" value="' + esc(pk ? pk.Nama : '') + '" placeholder="Open Trip Menjangan Tabuhan"></div><div class="field"><label for="pk-bag">Bagian rekap</label><select class="select" id="pk-bag"><option value="YB"' + (bagian === 'YB' ? ' selected' : '') + '>YukBanyuwangi</option><option value="SB"' + (bagian === 'SB' ? ' selected' : '') + '>Sunrise Boat</option></select></div></div><div id="pk-item"></div>',
      aksi: (pk ? [{ label: 'Hapus', kelas: 'btn--danger-ghost', ikon: 'trash-2', klik: async function (hh, b) { if (!(await UI.konfirmasi({ judul: 'Hapus paket ' + pk.Nama + '?', ok: 'Hapus', bahaya: true }))) return false; var r = await C.aksi('paket.hapus', { id: pk.ID_Paket }, { btn: b }); return r.success; } }] : []).concat([{ label: 'Batal' }, { label: 'Simpan paket', kelas: 'btn--primary', ikon: 'save', klik: async function (hh, b) {
        var r = await C.aksi('paket.simpan', { ID_Paket: pk ? pk.ID_Paket : '', Nama: hh.el.querySelector('#pk-nama').value, Bagian: hh.el.querySelector('#pk-bag').value, items: items.map(function (i) { return { Uraian: i.Uraian, Tetap: i.Tetap, Per_Pax: i.Per_Pax, Ke_TL: i.Ke_TL, Grup: i.Grup, Kolom: i.Kolom }; }) }, { btn: b });
        return r.success;
      } }]) });
    var box = h.el.querySelector('#pk-item'), o = { pax: 0, budget: false, terima: false };
    function gambar() { box.innerHTML = tabelItem(items, bagian, o); }
    ikatItem(box, items, bagian, o, function () { }, gambar); gambar();
    h.el.querySelector('#pk-bag').onchange = function (e) { bagian = e.target.value; items.forEach(function (i) { i.Kolom = HT.tebakKolom(bagian, i.Uraian, i.Ke_TL === 'YA' ? i.Grup : ''); }); gambar(); };
  }

  // ---------------------------------------------------------------- halaman
  var H = window.Halaman.kalkulasi = {
    render: function (el, args, q) {
      if (args[0]) { if (!Hal.hanyaAdmin()) { args = []; } else { H.renderEditor(el, args[0]); return; } }
      el.innerHTML = Hal.kepala({ judul: 'Kalkulasi Budget', sub: 'Budget per pesanan. Item bertanda <b>Ke TL</b> masuk manifest Tim Lapang; item lain dieksekusi langsung oleh Admin. Total BUDGET menjadi draft rekap.' }) +
        '<div class="tabs" role="tablist">' + [['perlu', 'Perlu dibuat'], ['mendatang', 'Trip mendatang'], ['ada', 'Sudah ada'], ['semua', 'Semua'], ['paket', 'Paket template']].map(function (t) { return '<button data-act="daftar" data-t="' + t[0] + '" class="' + (st.daftar === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="kl-isi"></div>';
      Hal.aksiPeta(el, {
        daftar: function (d) { st.daftar = d.t; el.querySelectorAll('[data-act="daftar"]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === st.daftar); }); H.isiDaftar(el); },
        paket: function (d) { editorPaket(Store.get('Paket_Kalkulasi', d.id)); }, paketBaru: function () { editorPaket(null); }
      }, function (e) { var r = e.target.closest('tr[data-row]'); if (r) App.go('kalkulasi/' + r.dataset.row); });
      H.isiDaftar(el);
    },
    renderUlang: false,
    isiDaftar: function (el) { var b = el.querySelector('#kl-isi'); if (!b) return; b.innerHTML = st.daftar === 'paket' ? daftarPaket() : '<div class="card card--pad0">' + tabelDaftar() + '</div>'; },
    segarkan: function (el, args) {
      if (args[0] && el.querySelector('#ke-item')) { if (!st.kotor) { dariSimpan(args[0]); H.editor(el); } else H.ringkasUlang(el); return; }
      if (!args[0]) H.isiDaftar(el); else H.render(el, args, {});
    },
    navigasi: function (el, args, q) { H.render(el, args, q); },
    renderEditor: function (el, id) {
      var p = Store.get('Pesanan', id); if (!p) { el.innerHTML = UI.kosong('search', 'Pesanan tidak ditemukan', 'Mungkin barisnya dihapus di Google Sheets. <a href="#/kalkulasi">Kembali</a>'); return; }
      if (st.id !== id || !st.kotor) dariSimpan(id);
      el.innerHTML = '<div id="ke"></div>';
      H.editor(el);
    },
    editor: function (el) {
      var box = el.querySelector('#ke'); if (!box) return;
      var p = Store.get('Pesanan', st.id), inf = HT.infoPesanan(p, Store.S), bagian = inf.bagian, rk = Store.get('Rekap', st.id), kunci = rk && rk.Status === 'Terkunci';
      var pk = paketCocok(p, bagian), cocok = pk.filter(function (k) { return YX.normalHeader(k.Nama) === YX.normalHeader(p.Trip); })[0], k0 = Store.get('Kalkulasi', st.id);
      var o = { pax: st.pax, budget: true, terima: true };
      box.innerHTML = Hal.kepala({ crumbs: ['Kalkulasi Budget', p.Tab], judul: p.Nama, sub: esc(p.Trip) + ' · ' + esc(inf.jadwal || 'tanpa tanggal') + ' · ' + inf.pax + ' pax · bagian rekap <b>' + (bagian === 'SB' ? 'Sunrise Boat' : 'YukBanyuwangi') + '</b>',
        aksi: '<a class="btn btn--ghost" href="#/kalkulasi">' + ic('arrow-left', 18) + '<span>Daftar</span></a>' + (k0 ? '<a class="btn btn--soft" href="#/manifest/' + st.id + '">' + ic('clipboard-list', 18) + '<span>Lanjut ke manifest</span></a>' : '') }) +
        Hal.alurHTML(p) +
        (kunci ? '<div class="note ok" style="margin:16px 0">' + ic('lock') + '<span>Margin trip ini sudah dikunci Finance — kalkulasi hanya bisa dilihat. Minta Finance membuka kunci bila perlu koreksi.</span></div>' : '') +
        '<div class="grid-12" style="margin-top:16px"><div class="card span-8 span-lg-12"><div class="card__head"><div class="card__title"><h2>Sumber kalkulasi</h2><p>Pilih salah satu — item tetap bisa diubah setelahnya.</p></div>' + (st.kotor ? '<span class="badge warn">' + ic('pencil', 14) + 'Belum disimpan</span>' : k0 ? '<span class="badge ok">' + ic('check', 14) + 'Tersimpan ' + esc(C.F.relatif(k0.Diperbarui)) + '</span>' : '') + '</div>' +
        '<div class="sumber-kal">' +
        '<div class="sumber-kal__opsi' + (st.sumber === 'CS' ? ' on' : '') + '"><b>' + ic('file-spreadsheet', 18) + 'File Kalkulasi CS</b><div class="row" style="gap:8px"><input class="input" id="ke-link" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value="' + esc(st.link) + '"><button class="btn btn--primary" data-act="impor"' + (kunci ? ' disabled' : '') + '>' + ic('download', 18) + '<span>Impor</span></button></div><small class="muted">' + (p.Link_Kalkulasi ? 'Link diambil dari kolom KALKULASI di sheet.' : 'Kolom KALKULASI di sheet kosong — tempel link file CS di sini.') + ' Format kolom KETERANGAN & BUDGET (boleh dengan TERIMA TL).</small></div>' +
        '<div class="sumber-kal__opsi' + (st.sumber === 'Paket' ? ' on' : '') + '"><b>' + ic('package', 18) + 'Paket template</b><div class="row" style="gap:8px"><select class="select" id="ke-paket"><option value="">' + (pk.length ? 'Pilih paket…' : 'Belum ada paket ' + bagian) + '</option>' + pk.map(function (k) { return '<option value="' + k.ID_Paket + '"' + ((st.paket === k.Nama) || (!st.paket && cocok && cocok.ID_Paket === k.ID_Paket) ? ' selected' : '') + '>' + esc(k.Nama) + (cocok && cocok.ID_Paket === k.ID_Paket ? ' · cocok dengan trip' : '') + '</option>'; }).join('') + '</select><button class="btn btn--ghost" data-act="pakai"' + (kunci || !pk.length ? ' disabled' : '') + '>' + ic('copy', 18) + '<span>Pakai</span></button></div><small class="muted">Untuk Open Trip & Sunrise Boat berulang. Biaya per pax dihitung dari ' + st.pax + ' pax.</small></div></div>' +
        '<div class="field" style="max-width:220px;margin-top:16px"><label for="ke-pax">Pax untuk kalkulasi</label><input class="input num" id="ke-pax" type="number" min="1" value="' + st.pax + '"><div class="help">Pax di sheet: ' + inf.pax + '</div></div></div>' +
        '<div class="card span-4 span-lg-12 card--ringkas" id="ke-ringkas">' + ringkas(p) + '</div></div>' +
        '<div class="card" style="margin-top:16px"><div class="card__head"><div class="card__title"><h2>Item kalkulasi</h2><p>Item <b>Ke TL</b> tampil di BUDGETING manifest (dikelompokkan per grup). Kosongkan TERIMA TL bila sama dengan budget.</p></div></div><div id="ke-item"' + (kunci ? ' class="terkunci"' : '') + '></div>' +
        '<div class="field" style="margin-top:16px"><label for="ke-cat">Catatan kalkulasi</label><textarea class="textarea" id="ke-cat" rows="2" placeholder="Opsional">' + esc(st.catatan) + '</textarea></div>' +
        '<div class="between wrap" style="margin-top:16px;gap:12px"><label class="check"><input type="checkbox" id="ke-sp"' + (st.simpanPaket ? ' checked' : '') + '><span>Simpan juga sebagai paket</span></label><input class="input" id="ke-np" style="max-width:320px;' + (st.simpanPaket ? '' : 'display:none') + '" value="' + esc(st.namaPaket) + '" placeholder="Nama paket">' +
        '<div class="toolbar" style="margin-left:auto">' + (k0 && !kunci ? '<button class="btn btn--plain" data-act="hapus">' + ic('trash-2', 18) + 'Hapus kalkulasi</button>' : '') + '<button class="btn btn--primary" data-act="simpan"' + (kunci ? ' disabled' : '') + '>' + ic('save', 18) + '<span>Simpan kalkulasi</span></button></div></div></div>';
      var itemBox = box.querySelector('#ke-item');
      function gambar() { o.pax = st.pax; itemBox.innerHTML = tabelItem(st.items, bagian, o); H.ringkasUlang(el); }
      function ubah() { st.kotor = true; H.ringkasUlang(el); var bd = box.querySelector('.card__head .badge'); if (bd && !bd.classList.contains('warn')) bd.outerHTML = '<span class="badge warn">' + ic('pencil', 14) + 'Belum disimpan</span>'; }
      ikatItem(itemBox, st.items, bagian, o, ubah, gambar); gambar();
      box.querySelector('#ke-pax').oninput = function (e) { st.pax = Math.max(1, Number(e.target.value) || 1); o.pax = st.pax; itemBox.querySelectorAll('.ki').forEach(function (r) { var it = st.items[+r.dataset.i], ob = r.querySelector('[data-out="b"]'); if (ob) ob.innerHTML = '<span class="ki__l">Budget</span>' + U.ribuan(budget(it, st.pax)); }); ubah(); };
      box.querySelector('#ke-link').oninput = function (e) { st.link = e.target.value.trim(); };
      box.querySelector('#ke-cat').oninput = function (e) { st.catatan = e.target.value; ubah(); };
      box.querySelector('#ke-sp').onchange = function (e) { st.simpanPaket = e.target.checked; box.querySelector('#ke-np').style.display = st.simpanPaket ? '' : 'none'; };
      box.querySelector('#ke-np').oninput = function (e) { st.namaPaket = e.target.value; };
      Hal.aksiPeta(el, {
        impor: function () { imporCS(el, st.link, bagian); },
        pakai: async function () {
          var idp = box.querySelector('#ke-paket').value, k = Store.get('Paket_Kalkulasi', idp); if (!k) { UI.toast('Pilih paket dulu.', 'warn'); return; }
          if (st.items.length && !(await UI.konfirmasi({ judul: 'Ganti item dengan paket "' + k.Nama + '"?', teks: st.items.length + ' item yang ada akan diganti.', ok: 'Pakai paket', ikon: 'package' }))) return;
          st.items.length = 0; dariPaket(k, bagian).forEach(function (i) { st.items.push(i); }); st.sumber = 'Paket'; st.paket = k.Nama; st.kotor = true; H.editor(el);
        },
        simpan: function (d, b) { simpan(el, b); },
        hapus: async function (d, b) { if (!(await UI.konfirmasi({ judul: 'Hapus kalkulasi?', teks: 'Item kalkulasi dihapus; rekap kembali tanpa budget.', ok: 'Hapus', bahaya: true }))) return; var r = await C.aksi('kalkulasi.hapus', { id: st.id }, { btn: b }); if (r.success) { dariSimpan(st.id); H.editor(el); } }
      });
    },
    ringkasUlang: function (el) { var p = Store.get('Pesanan', st.id), r = el.querySelector('#ke-ringkas'); if (p && r) r.innerHTML = ringkas(p); }
  };
})();
