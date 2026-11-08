/* YukX — Halaman Kalkulasi Budget berversi (RAB) */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { trip: '', ver: '', tab: 'item', a: '', b: '' }, ed = null;

  function ikonKat() { var o = {}; Store.D.Kategori_Biaya.forEach(function (k) { o[k.Nama] = k.Ikon; }); return o; }
  function versi(idTrip) { return U.urutkan(Store.D.Budget_Header.filter(function (h) { return h.ID_Trip === idTrip; }), function (h) { return h.Versi; }); }
  function items(idB) { return U.urutkan(Store.D.Budget_Item.filter(function (i) { return i.ID_Budget === idB; }), function (i) { return i.Urutan; }); }
  function tripDefault() {
    var today = U.hariIni(), t = U.urutkan(Store.D.Trip.filter(function (x) { return x.Status !== 'Batal' && x.Tgl_Pulang >= today; }), function (x) { return x.Tgl_Berangkat; })[0];
    return (t || U.urutkan(Store.D.Trip, function (x) { return x.Tgl_Berangkat; }, true)[0] || {}).ID_Trip || '';
  }
  function pilihVer(vs) {
    if (st.ver && vs.some(function (h) { return h.ID_Budget === st.ver; })) return vs.find(function (h) { return h.ID_Budget === st.ver; });
    return vs.filter(function (h) { return ['Draft', 'Menunggu', 'Ditolak'].indexOf(h.Status) > -1; })[0] || vs.filter(function (h) { return h.Status === 'Aktif'; })[0] || vs[vs.length - 1] || null;
  }

  function tabelItem(h, bisaEdit) {
    var list = bisaEdit ? ed.items : items(h.ID_Budget), kat = U.kelompok(list, 'Kategori'), ik = ikonKat();
    var urutKat = Store.D.Kategori_Biaya.map(function (k) { return k.Nama; }).filter(function (k) { return kat[k]; }).concat(Object.keys(kat).filter(function (k) { return !Store.D.Kategori_Biaya.some(function (x) { return x.Nama === k; }); }));
    var rows = [], no = 0;
    urutKat.forEach(function (k, ki) {
      var sub = U.jumlah(kat[k], function (i) { return (+i.Qty || 0) * (+i.Harga_Satuan || 0); });
      rows.push({ __grup: '<div class="between"><span class="row" style="gap:8px">' + ic(ik[k] || 'circle-dollar-sign', 18) + (ki + 1) + '. ' + esc(k) + ' <small class="muted" style="font-weight:600">(' + kat[k].length + ' item)</small></span><span class="num">Subtotal ' + U.rp(sub) + '</span></div>' });
      kat[k].forEach(function (i, j) { no++; rows.push(Object.assign({ __no: (ki + 1) + '.' + (j + 1), __idx: list.indexOf(i) }, i)); });
    });
    var kolom = bisaEdit ? [
      { label: 'No', render: function (i) { return '<span class="muted mono">' + i.__no + '</span>'; } },
      { label: 'Uraian kebutuhan', render: function (i) { return '<input class="input" data-e="Uraian" data-i="' + i.__idx + '" value="' + esc(i.Uraian) + '" style="min-height:38px;font-weight:700"><input class="input" data-e="Keterangan" data-i="' + i.__idx + '" value="' + esc(i.Keterangan) + '" placeholder="Keterangan / vendor" style="min-height:34px;margin-top:4px;font-size:13px">'; } },
      { label: 'Qty', num: true, render: function (i) { return '<input class="input num" type="number" min="0" step="1" data-e="Qty" data-i="' + i.__idx + '" value="' + i.Qty + '" style="width:76px;min-height:38px;text-align:right">'; } },
      { label: 'Satuan', render: function (i) { return '<input class="input" data-e="Satuan" data-i="' + i.__idx + '" value="' + esc(i.Satuan) + '" style="width:100px;min-height:38px">'; } },
      { label: 'Harga satuan', num: true, render: function (i) { return '<input class="input num" inputmode="numeric" data-e="Harga_Satuan" data-i="' + i.__idx + '" value="' + Number(i.Harga_Satuan).toLocaleString('id-ID') + '" style="width:140px;min-height:38px;text-align:right">'; } },
      { label: 'Subtotal', num: true, render: function (i) { return '<b class="num" data-sub="' + i.__idx + '">' + U.rp((+i.Qty || 0) * (+i.Harga_Satuan || 0)) + '</b>' + (i.__beda ? '<span class="sub ' + i.__beda.cls + '">' + i.__beda.t + '</span>' : ''); } },
      { label: '', mlabel: '', render: function (i) { return '<button class="btn btn--plain btn--sm btn--icon" data-act="hapusItem" data-i="' + i.__idx + '" aria-label="Hapus item">' + ic('trash-2', 16) + '</button>'; } }
    ] : [
      { label: 'No', render: function (i) { return '<span class="muted mono">' + i.__no + '</span>'; } },
      { label: 'Uraian kebutuhan', render: function (i) { return '<b>' + esc(i.Uraian) + '</b>' + (i.Keterangan ? '<span class="sub">' + esc(i.Keterangan) + '</span>' : ''); } },
      { label: 'Qty', num: true, render: function (i) { return i.Qty; } }, { label: 'Satuan', key: 'Satuan' },
      { label: 'Harga satuan', num: true, render: function (i) { return F.rpTip(i.Harga_Satuan); } },
      { label: 'Subtotal', num: true, render: function (i) { return '<b>' + F.rpTip(i.Subtotal) + '</b>'; } }
    ];
    var total = U.jumlah(list, function (i) { return (+i.Qty || 0) * (+i.Harga_Satuan || 0); });
    return UI.tabel({ kolom: kolom, baris: rows, tanpaMain: true, kosong: 'Belum ada item biaya', kosongTeks: bisaEdit ? 'Klik "Tambah item biaya" untuk mulai.' : '', kosongIkon: 'calculator',
      foot: '<tfoot><tr><td colspan="' + (kolom.length - (bisaEdit ? 2 : 1)) + '" data-label="">GRAND TOTAL BUDGET (VERSI ' + h.Versi + ' · ' + h.Status.toUpperCase() + ')</td><td class="num" data-label="Total" style="font-size:20px;color:var(--c-primary)" id="bg-total">' + U.rp(total) + '</td>' + (bisaEdit ? '<td></td>' : '') + '</tr></tfoot>' });
  }

  function formItemBaru(el) {
    var kat = Store.D.Kategori_Biaya.filter(function (k) { return k.Aktif !== 'TIDAK'; }).map(function (k) { return k.Nama; });
    UI.modal({ judul: 'Tambah item biaya', ukuran: 'md', isi: UI.form([{ name: 'Kategori', label: 'Kategori', type: 'select', opsi: kat, full: true }, { name: 'Uraian', label: 'Uraian kebutuhan', wajib: true, full: true, ph: 'contoh: Sewa kapal phinisi 4D3N' }, { name: 'Keterangan', label: 'Keterangan / vendor', full: true }, { name: 'Qty', label: 'Qty', type: 'number', nilai: 1, wajib: true }, { name: 'Satuan', label: 'Satuan', nilai: 'Pax' }, { name: 'Harga_Satuan', label: 'Harga satuan', type: 'rupiah', wajib: true, full: true }]),
      onBuka: function (h) { UI.siapkanForm(h.body); },
      aksi: [{ label: 'Batal' }, { label: 'Tambahkan', kelas: 'btn--primary', ikon: 'plus', klik: function (h) { if (!UI.cekWajib(h.body)) return false; var v = UI.bacaForm(h.body); v.Qty = +v.Qty || 0; ed.items.push(v); ed.ubah = true; H.isi(el); UI.toast('Item ditambahkan — jangan lupa Simpan.', 'info'); } }] });
  }

  async function aksi(jenis, el, b) {
    var t = Store.get('Trip', st.trip), vs = versi(st.trip), h = pilihVer(vs);
    if (jenis === 'buat') {
      var lain = Store.D.Trip.filter(function (x) { return x.ID_Trip !== st.trip && HT.budgetAktif(HT.indeks(Store.D), x.ID_Trip); });
      UI.modal({ judul: 'Buat budget v1 — ' + t.Nama, ukuran: 'sm', isi: UI.form([{ name: 'sumber', label: 'Mulai dari', type: 'select', full: true, opsi: [{ v: '', l: 'Kosong' }].concat(lain.map(function (x) { return { v: x.ID_Trip, l: 'Salin item dari: ' + x.Nama }; })) }, { name: 'alasan', label: 'Catatan', full: true, nilai: 'Budget awal berdasarkan quotation vendor' }]),
        aksi: [{ label: 'Batal' }, { label: 'Buat draft v1', kelas: 'btn--primary', klik: async function (hh, bb) { var v = UI.bacaForm(hh.body), its = []; if (v.sumber) { var ba = HT.budgetAktif(HT.indeks(Store.D), v.sumber); its = items(ba.ID_Budget).map(function (i) { return { Kategori: i.Kategori, Uraian: i.Uraian, Keterangan: i.Keterangan, Qty: i.Qty, Satuan: i.Satuan, Harga_Satuan: i.Harga_Satuan }; }); } var r = await C.aksi('budget.buat', { ID_Trip: st.trip, alasan: v.alasan, items: its }, { btn: bb }); if (r.success) st.ver = ''; return r.success; } }] });
    }
    if (jenis === 'revisi') {
      UI.modal({ judul: 'Ajukan perubahan RAB', sub: t.Nama + ' · RAB v' + (vs.filter(function (x) { return x.Status === 'Aktif'; })[0] || {}).Versi + ' sudah disetujui & terkunci', ukuran: 'md',
        isi: '<div class="note">' + ic('info') + '<span>RAB yang sudah disetujui Finance tidak bisa diubah langsung. Sistem membuat <b>draft v' + (vs.length + 1) + '</b> dari versi aktif; perbaiki itemnya lalu ajukan — versi lama tetap berlaku sampai Finance menyetujui.</span></div>' +
          UI.form([{ name: 'jenis', label: 'Alasan perubahan', type: 'select', full: true, opsi: ['Kesalahan penulisan RAB', 'Perubahan harga vendor', 'Perubahan jumlah peserta', 'Perubahan itinerary / layanan', 'Lainnya'] }, { name: 'detail', label: 'Jelaskan yang salah / berubah', type: 'textarea', rows: 3, wajib: true, full: true, ph: 'contoh: Harga satuan hotel tertulis 1.200.000, seharusnya 1.020.000' }]),
        aksi: [{ label: 'Batal' }, { label: 'Buat draft perubahan', kelas: 'btn--primary', ikon: 'git-compare', klik: async function (hh, bb) { if (!UI.cekWajib(hh.body)) return false; var v = UI.bacaForm(hh.body); var r = await C.aksi('budget.revisi', { ID_Trip: st.trip, alasan: v.jenis + ': ' + v.detail }, { btn: bb }); if (r.success) { st.ver = r.data.ID_Budget; st.tab = 'item'; ed = null; H.isi(el); } return r.success; } }] });
    }
    if (jenis === 'simpan') { await simpan(b); }
    if (jenis === 'ajukan') { if (ed && ed.ubah && !(await simpan(b))) return; var r2 = await C.aksi('budget.ajukan', { ID_Budget: h.ID_Budget }, { btn: b }); if (r2.success) ed = null; }
    if (jenis === 'setujui') { var ct = await UI.konfirmasi({ judul: 'Setujui & aktifkan v' + h.Versi + '?', teks: 'Versi aktif sebelumnya menjadi riwayat (Digantikan). Rekap & laba rugi dihitung ulang otomatis.', input: { label: 'Catatan persetujuan (opsional)' }, ok: 'Setujui & kunci versi', ikon: 'shield-check' }); if (ct !== false) C.aksi('budget.setujui', { ID_Budget: h.ID_Budget, catatan: ct === true ? '' : ct }); }
    if (jenis === 'tolak') { var tl = await UI.konfirmasi({ judul: 'Tolak budget v' + h.Versi + '?', teks: 'Budget dikembalikan ke Admin untuk diperbaiki.', input: { label: 'Alasan penolakan', wajib: true, area: true }, ok: 'Tolak', bahaya: true }); if (tl) C.aksi('budget.tolak', { ID_Budget: h.ID_Budget, catatan: tl }); }
    if (jenis === 'hapusDraft') { if (await UI.konfirmasi({ judul: 'Hapus draft v' + h.Versi + '?', teks: 'Versi aktif tidak terpengaruh.', ok: 'Hapus draft', bahaya: true })) { var r3 = await C.aksi('budget.hapusDraft', { ID_Budget: h.ID_Budget }); if (r3.success) { st.ver = ''; ed = null; } } }
    if (jenis === 'batalUbah') { ed = null; H.isi(el); }
  }
  async function simpan(b) {
    var h = Store.get('Budget_Header', ed.id);
    var r = await C.aksi('budget.simpanItem', { ID_Budget: h.ID_Budget, items: ed.items.map(function (i) { return { ID_Item: i.ID_Item, Kategori: i.Kategori, Uraian: i.Uraian, Keterangan: i.Keterangan, Qty: +i.Qty || 0, Satuan: i.Satuan, Harga_Satuan: +i.Harga_Satuan || 0 }; }) }, { btn: b, loadingText: 'Menyimpan…' });
    if (r.success) ed = null; return r.success;
  }

  var H = {
    judul: 'Kalkulasi Budget',
    render: function (el, args, q) {
      st.trip = args[0] || st.trip || tripDefault(); if (q.v) st.ver = q.v; if (q.tab) st.tab = q.tab; ed = null;
      el.innerHTML = '<div id="bg-head"></div><div id="bg-body"></div>';
      Realisasi.pasang(el, function () { return st.trip; });
      Hal.aksiPeta(el, {
        tab: function (d) { st.tab = d.t; H.isi(el); }, ver: function (d) { st.ver = d.id; ed = null; H.isi(el); },
        tambah: function () { formItemBaru(el); },
        hapusItem: function (d) { ed.items.splice(+d.i, 1); ed.ubah = true; H.isi(el); },
        aksi: function (d, b) { aksi(d.j, el, b); },
        diff: function () { st.tab = 'banding'; H.isi(el); }
      });
      el.oninput = function (e) {
        var i = e.target.closest('[data-e]'); if (!i || !ed) return; var it = ed.items[+i.dataset.i], k = i.dataset.e;
        if (k === 'Harga_Satuan') { var n = Number(i.value.replace(/\D/g, '')) || 0; i.value = n ? n.toLocaleString('id-ID') : ''; it[k] = n; } else it[k] = k === 'Qty' ? (+i.value || 0) : i.value;
        ed.ubah = true; var s = el.querySelector('[data-sub="' + i.dataset.i + '"]'); if (s) s.textContent = U.rp((+it.Qty || 0) * (+it.Harga_Satuan || 0));
        var tot = U.jumlah(ed.items, function (x) { return (+x.Qty || 0) * (+x.Harga_Satuan || 0); }); var t = el.querySelector('#bg-total'); if (t) t.textContent = U.rp(tot);
        var bar = el.querySelector('#bg-savebar'); if (bar) bar.hidden = false;
      };
      el.onchange = function (e) { if (e.target.id === 'bg-trip') { App.go('budget/' + e.target.value); } if (e.target.id === 'bg-a') { st.a = e.target.value; H.isi(el); } if (e.target.id === 'bg-b') { st.b = e.target.value; H.isi(el); } };
      H.isi(el);
    },
    navigasi: function (el, args, q) { st.trip = args[0] || st.trip; st.ver = q.v || ''; if (q.tab) st.tab = q.tab; ed = null; H.isi(el); },
    segarkan: function (el) { if (ed && ed.ubah) { var h0 = Store.get('Budget_Header', ed.id); if (h0 && ['Draft', 'Ditolak'].indexOf(h0.Status) > -1) { H.kpi(el); return; } } ed = null; H.isi(el); },
    kpi: function () { },
    isi: function (el) {
      var D = Store.D, t = Store.get('Trip', st.trip); if (!t) { st.trip = tripDefault(); t = Store.get('Trip', st.trip); }
      if (!t) { el.innerHTML = UI.kosong('calculator', 'Belum ada trip', 'Tambah trip di Pengaturan → Master Data.'); return; }
      var vs = versi(t.ID_Trip), h = pilihVer(vs), admin = Store.isAdmin(), fin = Store.isFin(), ix = HT.indeks(D), rk = HT.rekapTrip(D, ix, t, U.hariIni());
      var draft = h && ['Draft', 'Ditolak'].indexOf(h.Status) > -1, bisaEdit = draft && admin;
      if (bisaEdit && (!ed || ed.id !== h.ID_Budget)) ed = { id: h.ID_Budget, items: items(h.ID_Budget).map(function (i) { return Object.assign({}, i); }), ubah: false };
      if (!bisaEdit) ed = null;
      var aktif = vs.filter(function (x) { return x.Status === 'Aktif'; })[0], terbuka = vs.some(function (x) { return ['Draft', 'Menunggu', 'Ditolak'].indexOf(x.Status) > -1; });
      var tombol = '';
      if (admin && !vs.length) tombol += '<button class="btn btn--primary" data-act="aksi" data-j="buat">' + ic('plus', 18) + 'Buat budget v1</button>';
      var kunciPermanen = rk.final || rk.statusAudit === 'Diajukan';
      if (admin && aktif && !terbuka) tombol += kunciPermanen ? '<button class="btn btn--ghost" disabled title="' + (rk.final ? 'Realisasi sudah final — RAB terkunci permanen' : 'Realisasi sedang diaudit Finance') + '">' + ic('lock', 18) + 'RAB terkunci</button>' : '<button class="btn btn--ghost" data-act="aksi" data-j="revisi">' + ic('git-compare', 18) + 'Ajukan perubahan RAB</button>';
      if (bisaEdit) tombol += '<button class="btn btn--ghost" data-act="tambah">' + ic('circle-plus', 18) + 'Tambah item biaya</button><button class="btn btn--primary" data-act="aksi" data-j="ajukan">' + ic('send', 18) + 'Ajukan ke Finance</button>';
      if (fin && h && h.Status === 'Menunggu') tombol += '<button class="btn btn--danger-ghost" data-act="aksi" data-j="tolak">' + ic('circle-x', 18) + 'Tolak</button><button class="btn btn--primary" data-act="aksi" data-j="setujui">' + ic('shield-check', 18) + 'Setujui & kunci versi</button>';
      el.querySelector('#bg-head').innerHTML = Hal.kepala({ crumbs: ['Transaksi & operasional', 'Kalkulasi budget & realisasi', t.Kode], judul: 'Kalkulasi Budget Trip', sub: 'Admin menyusun RAB → Finance menyetujui (terkunci) → Admin mencatat realisasi & melaporkannya setelah trip → Finance mengaudit. Hanya realisasi final yang masuk laba rugi.', aksi: tombol }) +
        '<div class="card card--tight row wrap" style="margin-bottom:16px;gap:12px">' + Hal.tripFoto(t) + '<div class="grow" style="min-width:220px">' + Hal.pilihTrip('bg-trip', t.ID_Trip) + '<small class="muted" style="display:block;margin-top:6px">' + F.rentang(t.Tgl_Berangkat, t.Tgl_Pulang) + ' · ' + rk.pax + '/' + t.Kuota + ' pax terdaftar · ' + esc(t.Akomodasi) + '</small></div>' +
        (h ? '<div class="row wrap" style="gap:6px">' + UI.badge('Versi ' + h.Versi + ' · ' + h.Status, h.Status === 'Aktif' ? 'ok' : h.Status === 'Menunggu' ? 'warn' : h.Status === 'Ditolak' ? 'danger' : 'neutral', h.Status === 'Aktif' ? 'lock' : h.Status === 'Menunggu' ? 'hourglass' : 'pencil') + (h.Status === 'Aktif' ? '<span class="badge neutral">' + ic('lock', 14) + 'Terkunci</span>' : '') + Realisasi.badgeStatus(rk.statusAudit) + Realisasi.tanda(rk, true) + '</div>' : '') + '</div>';
      var body = el.querySelector('#bg-body');
      if (!h) { body.innerHTML = '<div class="card">' + UI.kosong('calculator', 'Trip ini belum punya budget', admin ? 'Buat budget v1 — bisa mulai kosong atau menyalin item dari trip lain.' : 'Menunggu Admin membuat budget.', admin ? '<button class="btn btn--primary" data-act="aksi" data-j="buat">' + ic('plus', 18) + 'Buat budget v1</button>' : '') + '</div>'; return; }
      var totalView = ed ? U.jumlah(ed.items, function (x) { return (+x.Qty || 0) * (+x.Harga_Satuan || 0); }) : h.Total, beda = aktif && h.ID_Budget !== aktif.ID_Budget ? totalView - aktif.Total : 0;
      var prev = vs.filter(function (x) { return x.Versi < h.Versi && (x.Status === 'Aktif' || x.Status === 'Digantikan'); }).slice(-1)[0];
      var dVsPrev = prev && h.Status === 'Aktif' ? h.Total - prev.Total : beda, est = rk.pendapatan - totalView, mg = rk.pendapatan ? est / rk.pendapatan * 100 : 0, mob = innerWidth <= 720;
      var kpi = '<div class="bento two-sm stagger">' + UI.stat({ hero: true, label: 'Estimasi laba bersih', nilai: mob ? U.rpRingkas(est) : U.rp(est), valTitle: U.rp(est), kaki: '<span class="badge glass">Margin ' + F.persen(mg) + '</span><span>' + (mg >= 25 ? 'Di atas target (min 25%)' : 'Di bawah target 25%') + '</span>' }) +
        UI.stat({ label: 'Total pendapatan (omset)', ikon: 'wallet', nilai: mob ? U.rpRingkas(rk.pendapatan) : U.rp(rk.pendapatan), valTitle: U.rp(rk.pendapatan), kaki: '<span class="badge ok">' + Math.round(rk.pax / Math.max(1, t.Kuota) * 100) + '% terisi (' + rk.pax + ' pax)</span><span>Rata-rata ' + U.rpRingkas(rk.pax ? rk.pendapatan / rk.pax : 0) + '/pax</span>' }) +
        UI.stat({ label: 'Total budget v' + h.Versi + (ed && ed.ubah ? ' (belum disimpan)' : ''), ikon: 'calculator', nilai: mob ? U.rpRingkas(totalView) : U.rp(totalView), valTitle: U.rp(totalView), kaki: dVsPrev ? '<span class="badge ' + (dVsPrev < 0 ? 'ok' : 'warn') + '">' + ic(dVsPrev < 0 ? 'trending-down' : 'trending-up', 14) + (dVsPrev > 0 ? '+' : '') + U.rpRingkas(dVsPrev) + ' vs v' + (prev && h.Status === 'Aktif' ? prev.Versi : aktif.Versi) + '</span><span>HPP & operasional</span>' : '<span>HPP & operasional</span>' }) +
        UI.stat({ label: 'Realisasi vs RAB disetujui', ikon: rk.overBudget ? 'triangle-alert' : 'gauge', tone: rk.overBudget ? 'danger' : 'ok', go: 'budget/' + t.ID_Trip + '?tab=realisasi', nilai: rk.realisasi ? (mob ? U.rpRingkas(rk.realisasi) : U.rp(rk.realisasi)) : '<small>Belum ada</small>', kaki: '<div class="progress ' + (rk.overBudget ? 'danger' : 'ok') + ' grow"><i style="width:' + Math.min(100, rk.budget ? rk.realisasi / rk.budget * 100 : 0) + '%"></i></div><span class="' + (rk.overBudget ? 'danger' : '') + '">' + (rk.budget ? Math.round(rk.realisasi / rk.budget * 100) : 0) + '%</span>' }) + '</div>';
      var tabs = '<div class="tabs" style="margin-top:20px">' + [['item', 'Item RAB', items(h.ID_Budget).length + ' item'], ['realisasi', 'Realisasi anggaran', rk.nota ? rk.nota + ' nota' : ''], ['riwayat', 'Riwayat revisi', vs.length + ' versi'], ['banding', 'Bandingkan versi', '']].map(function (x) { return '<button data-act="tab" data-t="' + x[0] + '" class="' + (st.tab === x[0] ? 'on' : '') + '">' + x[1] + (x[2] ? ' <span class="badge neutral" style="height:20px">' + x[2] + '</span>' : '') + '</button>'; }).join('') + '</div>';
      var kiri;
      if (st.tab === 'item') {
        kiri = '<div class="card card--pad0"><div class="between wrap" style="padding:16px 20px"><div class="card__title"><h3 class="row" style="gap:8px">' + ic('file-text', 20, 'primary') + 'Rincian Rencana Anggaran Biaya (RAB)</h3><p>' + (bisaEdit ? 'Mode edit draft — ubah langsung di tabel.' : 'Kalkulasi berbasis ' + rk.pax + ' pax · terkunci setelah disetujui Finance.') + '</p></div><div class="chips-scroll">' + vs.map(function (x) { return '<button class="chip ' + (x.ID_Budget === h.ID_Budget ? 'on' : '') + '" data-act="ver" data-id="' + x.ID_Budget + '">v' + x.Versi + ' <span class="n">' + esc(x.Status) + '</span></button>'; }).join('') + '</div></div>' +
          (admin && h.Status === 'Aktif' ? '<div class="note" style="margin:0 16px 12px">' + ic('lock') + '<span>RAB v' + h.Versi + ' sudah disetujui Finance dan terkunci. ' + (kunciPermanen ? (rk.final ? 'Realisasi sudah final — tidak bisa diubah lagi.' : 'Realisasi sedang diaudit Finance.') : 'Bila ada kesalahan penulisan, klik <b>Ajukan perubahan RAB</b>.') + '</span></div>' : '') +
          tabelItem(h, bisaEdit) + (h.Status === 'Ditolak' ? '<div class="note danger" style="margin:12px 16px">' + ic('circle-x') + '<span>Ditolak ' + esc(h.Disetujui_Oleh) + ': ' + esc(h.Catatan_Keputusan) + '</span></div>' : '') +
          (bisaEdit ? '<div class="between wrap" id="bg-savebar" style="position:sticky;bottom:calc(76px + env(safe-area-inset-bottom));padding:12px 16px;background:var(--c-surface);border-top:1px solid var(--c-border);gap:8px"><small class="muted">' + ic('info', 14) + ' Perubahan disimpan ke draft v' + h.Versi + ' — versi aktif tetap aman.</small><div class="row" style="gap:8px"><button class="btn btn--plain btn--sm" data-act="aksi" data-j="hapusDraft">' + ic('trash-2', 16) + 'Hapus draft</button><button class="btn btn--ghost btn--sm" data-act="aksi" data-j="batalUbah">Batalkan perubahan</button><button class="btn btn--primary btn--sm" data-act="aksi" data-j="simpan">' + ic('save', 16) + 'Simpan item</button></div></div>' : '') +
          '<div class="between wrap" style="padding:14px 20px;gap:8px"><small class="muted">' + (h.Status === 'Aktif' ? 'Disetujui ' + esc(h.Disetujui_Oleh) + ' · ' + F.waktu(h.Tgl_Disetujui) : 'Dibuat ' + esc(h.Dibuat_Oleh) + ' · ' + F.waktu(h.Tgl_Dibuat)) + '</small><div class="row" style="gap:8px">' + (vs.length > 1 ? '<button class="btn btn--ghost btn--sm" data-act="diff">' + ic('git-compare', 16) + 'Bandingkan versi</button>' : '') + '<button class="btn btn--soft btn--sm" id="bg-pdf">' + ic('file-down', 16) + 'Cetak anggaran (PDF)</button><button class="btn btn--ghost btn--sm" id="bg-xls">' + ic('file-spreadsheet', 16) + 'Excel</button></div></div></div>';
      } else if (st.tab === 'realisasi') {
        kiri = Realisasi.panel(t.ID_Trip);
      } else if (st.tab === 'riwayat') {
        var logs = D.Log_Revisi_Budget.filter(function (l) { return l.ID_Trip === t.ID_Trip && !/^REALISASI — /.test(l.Item); });
        kiri = '<div class="card"><div class="timeline">' + vs.slice().reverse().map(function (x) { var lg = logs.filter(function (l) { return l.ID_Budget === x.ID_Budget; }); return '<div class="tl ' + (x.Status === 'Aktif' ? 'on' : x.Status === 'Digantikan' ? 'mute' : '') + '"><div class="between wrap"><b>Versi ' + x.Versi + ' · ' + UI.badge(x.Status) + '</b><small class="muted">' + F.waktu(x.Tgl_Disetujui || x.Tgl_Dibuat) + '</small></div><small>Diajukan ' + esc(x.Dibuat_Oleh) + (x.Disetujui_Oleh ? ' · diputuskan ' + esc(x.Disetujui_Oleh) : '') + ' · total <b>' + U.rp(x.Total) + '</b></small><div class="quote">"' + esc(x.Alasan_Revisi) + '"' + (x.Catatan_Keputusan ? '<br><b>Catatan:</b> ' + esc(x.Catatan_Keputusan) : '') + '</div>' + (lg.length ? '<div class="stack" style="margin-top:8px;gap:6px">' + lg.map(function (l) { return '<div class="kv" style="grid-template-columns:1fr;gap:2px"><b style="font-size:12.5px">' + esc(l.Item) + '</b><small class="muted"><s>' + esc(l.Nilai_Lama) + '</s> → <b class="primary">' + esc(l.Nilai_Baru) + '</b></small></div>'; }).join('') + '</div>' : '') + '</div>'; }).join('') + '</div></div>';
      } else {
        if (!st.a || !vs.some(function (x) { return x.ID_Budget === st.a; })) st.a = (vs[vs.length - 2] || vs[0]).ID_Budget;
        if (!st.b || !vs.some(function (x) { return x.ID_Budget === st.b; })) st.b = vs[vs.length - 1].ID_Budget;
        var A = items(st.a), B = items(st.b), kunci = {}, baris = [];
        A.forEach(function (i) { kunci[(i.Kategori + '|' + i.Uraian).toLowerCase()] = { a: i }; }); B.forEach(function (i) { var k = (i.Kategori + '|' + i.Uraian).toLowerCase(); (kunci[k] = kunci[k] || {}).b = i; });
        Object.keys(kunci).forEach(function (k) { var x = kunci[k], sa = x.a ? x.a.Subtotal : 0, sb = x.b ? x.b.Subtotal : 0; baris.push({ it: x.b || x.a, a: sa, b: sb, d: sb - sa, st: !x.a ? 'Baru' : !x.b ? 'Dihapus' : sa !== sb ? 'Berubah' : 'Sama' }); });
        baris = U.urutkan(baris, function (r) { return (r.st === 'Sama' ? 1 : 0) + r.it.Kategori; });
        var opsi = function (id, nilai) { return '<select class="select" id="' + id + '" style="width:auto">' + vs.map(function (x) { return '<option value="' + x.ID_Budget + '"' + (x.ID_Budget === nilai ? ' selected' : '') + '>v' + x.Versi + ' · ' + x.Status + '</option>'; }).join('') + '</select>'; };
        kiri = '<div class="card card--pad0"><div class="row wrap" style="padding:16px 20px;gap:10px"><b>Bandingkan</b>' + opsi('bg-a', st.a) + ic('arrow-right', 18) + opsi('bg-b', st.b) + '<span class="badge ' + (U.jumlah(baris, function (r) { return r.d; }) <= 0 ? 'ok' : 'warn') + '">Selisih total ' + U.rp(U.jumlah(baris, function (r) { return r.d; })) + '</span></div>' +
          UI.tabel({ kolom: [{ label: 'Item', render: function (r) { return '<b>' + esc(r.it.Uraian) + '</b><span class="sub">' + esc(r.it.Kategori) + '</span>'; } }, { label: 'Versi A', num: true, render: function (r) { return U.rp(r.a); } }, { label: 'Versi B', num: true, render: function (r) { return U.rp(r.b); } }, { label: 'Selisih', num: true, render: function (r) { return r.d ? '<b class="' + (r.d < 0 ? 'ok' : 'danger') + '">' + (r.d > 0 ? '+' : '') + U.rp(r.d) + '</b>' : '<span class="muted">—</span>'; } }, { label: 'Status', render: function (r) { return UI.badge(r.st, r.st === 'Sama' ? 'neutral' : r.st === 'Baru' ? 'info' : r.st === 'Dihapus' ? 'danger' : 'warn', false); } }], baris: baris }) + '</div>';
      }
      // kolom kanan
      var mf = (ix.pjPerTrip[t.ID_Trip] || []).filter(function (p) { return p.Status !== 'Batal'; }), paxT = U.jumlah(mf, function (p) { return p.Jumlah_Pax; });
      var ang = mf.reduce(function (s, p) { return s.concat(ix.angPerPj[p.ID_Penjualan] || []); }, []), lengkap = ang.filter(function (a) { return a.Nama && a.Identitas; }).length, pct = paxT ? Math.round(lengkap / paxT * 100) : 0;
      var final = mf.filter(function (p) { return ix.mnfPerPj[p.ID_Penjualan] && ix.mnfPerPj[p.ID_Penjualan].Status === 'Final'; }).length;
      var kanan = '<div class="card stack" style="gap:12px"><div class="between"><div class="card__title"><span class="label">PRD F5 · Operational manifest</span><h3>Status Draft Manifest Trip</h3></div><span class="badge ' + (final === mf.length && mf.length ? 'ok' : 'warn') + '">' + final + '/' + mf.length + ' final</span></div>' +
        '<div class="stack" style="gap:6px"><div class="between" style="font-size:13px"><span class="muted">Kelengkapan data tamu</span><b class="primary">' + pct + '% terpenuhi</b></div><div class="progress ok"><i style="width:' + pct + '%"></i></div></div>' +
        '<div class="form" style="gap:8px;font-size:12.5px"><span class="row" style="gap:6px">' + ic('check', 15, 'ok') + lengkap + ' identitas KTP/paspor</span><span class="row" style="gap:6px">' + ic('check', 15, 'ok') + ang.filter(function (a) { return a.No_HP; }).length + ' nomor WhatsApp</span><span class="row" style="gap:6px">' + ic('check', 15, 'ok') + ang.filter(function (a) { return a.Ukuran_Baju; }).length + ' ukuran baju</span><span class="row" style="gap:6px">' + ic('check', 15, 'ok') + ang.filter(function (a) { return a.Kamar; }).length + ' rooming</span></div>' +
        '<div class="note">' + ic('calendar-check') + '<span>Auto-sync Google Calendar: file manifest otomatis dilampirkan ke event customer begitu ditandai Final.</span></div><a class="btn btn--primary btn--block" href="#/manifest/' + t.ID_Trip + '">' + ic('clipboard-check', 18) + 'Kelola manifest & rooming</a></div>' +
        '<div class="card"><div class="card__head"><div class="card__title"><span class="label">RAB disetujui vs realisasi</span><h3>Per kategori</h3></div><button class="btn btn--plain btn--sm" data-act="tab" data-t="realisasi">Detail ' + ic('arrow-right', 15) + '</button></div>' + perKategori(t) + '</div>';
      body.innerHTML = kpi + tabs + '<div class="grid-12" style="align-items:start"><div class="span-8 span-lg-12">' + kiri + '</div><div class="span-4 span-lg-12 stack" style="gap:16px">' + kanan + '</div></div>';
      var pdf = body.querySelector('#bg-pdf'); if (pdf) pdf.onclick = function () { Dok.laporanRAB(t.ID_Trip, h.ID_Budget).catch(function (e) { UI.toast(e.message, 'err'); }); };
      var xls = body.querySelector('#bg-xls'); if (xls) xls.onclick = function () { Dok.excel('RAB ' + t.Kode + ' v' + h.Versi, [{ nama: 'RAB v' + h.Versi, rows: [['Kategori', 'Uraian', 'Keterangan', 'Qty', 'Satuan', 'Harga Satuan', 'Subtotal']].concat(items(h.ID_Budget).map(function (i) { return [i.Kategori, i.Uraian, i.Keterangan, i.Qty, i.Satuan, i.Harga_Satuan, i.Subtotal]; })).concat([['', 'TOTAL', '', '', '', '', h.Total]]), lebar: [24, 40, 30, 8, 12, 16, 16] }]).catch(function (e) { UI.toast(e.message, 'err'); }); };
    }
  };
  function perKategori(t) {
    var ks = HT.rabVsRealisasi(HT.indeks(Store.D), t.ID_Trip); if (!ks.length) return '<small class="muted">Belum ada RAB disetujui.</small>';
    return '<div class="stack" style="gap:12px">' + ks.map(function (k) { return '<div class="hbar"><div class="hbar__top"><span class="truncate">' + (k.over ? ic('triangle-alert', 14, 'danger') + ' ' : '') + esc(k.kategori) + '</span><span class="num ' + (k.over ? 'danger' : 'muted') + '" style="white-space:nowrap">' + U.rpRingkas(k.realisasi) + ' / ' + U.rpRingkas(k.rab) + '</span></div><div class="progress ' + (k.over ? 'danger' : 'ok') + ' thin"><i style="width:' + Math.min(100, k.persen) + '%"></i></div></div>'; }).join('') + '</div>';
  }
  window.Halaman.budget = H;
})();
