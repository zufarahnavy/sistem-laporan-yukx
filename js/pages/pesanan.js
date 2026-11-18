/* =====================================================================
   YukBanyuwangi — Data Pemesanan
   Cermin dua arah spreadsheet "Database Pemesanan" klien: satu tab sheet =
   satu kategori trip, satu baris = satu pesanan. Kolom tampil persis urutan
   sheet. Tambah/ubah/hapus di sini langsung tertulis ke Google Sheets.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, U = C.U, HT = C.HT;
  var UANG = { Harga: 1, Total: 1, DP: 1, Sisa: 1, Setoran: 1 }, TGL = { Tgl_Mulai: 1, Tgl_Selesai: 1, Tgl_Pesan: 1 }, LINK = { Link_Bukti_TF: 1, Link_Itinerary: 1, Link_Kalkulasi: 1 };
  var st = { tab: '', q: '', status: '', urut: '', idTampil: false, batas: 150, drawer: null };

  function tabs() { return U.urutkan(Store.D.Sumber_Tab || [], function (t) { return Number(t.Urutan) || 0; }); }
  function kolom(tab) { var t = (Store.D.Sumber_Tab || []).find(function (x) { return x.Nama === tab; }); return t ? (U.parseJson(t.Kolom, []) || []) : []; }
  function cekGrup(k) { return !!k.grup && /CHECK|CEK/i.test(k.grup); }
  function nilai(p, k) {
    if (k.kunci) return p[k.kunci];
    var j = U.parseJson(cekGrup(k) ? p.Checklist : p.Lain, {}) || {}; return j[k.label];
  }
  function aman(u) { return /^https?:\/\//i.test(String(u || '')); }
  function tampil(p, k) {
    var v = nilai(p, k), kk = k.kunci;
    if (v === '' || v == null || String(v).trim() === '') return '<span class="kosong">—</span>';
    if (UANG[kk]) return '<span class="num">' + U.ribuan(v) + '</span>';
    if (TGL[kk]) return '<span class="nw">' + esc(U.tglId(U.tgl(v)) || v) + '</span>';
    if (LINK[kk] || aman(v)) return aman(v) ? '<a href="' + esc(v) + '" target="_blank" rel="noopener" class="tautan">' + ic('external-link', 14) + 'Buka</a>' : esc(v);
    if (kk === 'No_HP') return '<span class="nw num">' + esc(U.hp08(v) || v) + '</span>';
    if (kk === 'ID_Pesanan') return '<span class="mono soft">' + esc(v) + '</span>';
    if (kk === 'Pax') return '<span class="num">' + esc(v) + '</span>';
    return esc(v);
  }
  function teksCari(p) { return [p.Nama, p.PIC, p.No_HP, p.Trip, p.Asal, p.Email, p.Instagram, p.Tab, p.ID_Pesanan, p.Sumber_Info, p.Penjemputan, p.Checklist, p.Lain].join(' ').toLowerCase(); }

  function daftar() {
    var S = Store.S, today = U.hariIni(), q = st.q.trim().toLowerCase();
    var rows = Store.D.Pesanan.filter(function (p) {
      if (st.tab && p.Tab !== st.tab) return false;
      if (q && teksCari(p).indexOf(q) < 0) return false;
      if (st.status && HT.statusTrip(HT.infoPesanan(p, S), today) !== st.status) return false;
      return true;
    });
    var urut = st.urut || (st.tab ? 'sheet' : 'tanggal');
    if (urut === 'sheet') rows = U.urutkan(rows, function (p) { return (st.tab ? '' : p.Tab) + U.pad(Number(p.Baris) || 0, 6); });
    else if (urut === 'tanggal') rows = U.urutkan(rows, function (p) { var t = U.tgl(p.Tgl_Mulai) || '9999'; return (t >= today ? '0' + t : '1' + (99999999 - Number(t.replace(/-/g, '')))); });
    else rows = U.urutkan(rows, function (p) { return U.tgl(p.Tgl_Pesan) || ''; }, true);
    return rows;
  }

  // ---------------------------------------------------------------- tabel lembar
  var SEMUA_KOL = [{ kunci: 'Nama', label: 'Nama' }, { kunci: 'Tab', label: 'Kategori' }, { kunci: 'Trip', label: 'Trip' }, { kunci: 'Tgl_Mulai', label: 'Tanggal trip' }, { kunci: 'Pax', label: 'Pax' }, { kunci: 'No_HP', label: 'No HP' }, { kunci: 'Total', label: 'Total' }, { kunci: 'DP', label: 'DP' }, { kunci: 'Tgl_Pesan', label: 'Tgl pesan' }];
  function lembar(rows) {
    var kol = st.tab ? kolom(st.tab) : SEMUA_KOL, S = Store.S, ix = HT.indeks(Store.D), today = U.hariIni();
    kol = kol.filter(function (k) { return st.idTampil || k.kunci !== 'ID_Pesanan'; });
    var iNama = Math.max(0, kol.findIndex(function (k) { return k.kunci === 'Nama'; }));
    if (!rows.length) return '<div class="card">' + UI.kosong(st.q ? 'search' : 'table-2', st.q ? 'Tidak ada yang cocok' : 'Belum ada pesanan di kategori ini', st.q ? 'Coba kata kunci lain atau pilih kategori Semua.' : (Store.isAdmin() ? 'Tambah pesanan di sini atau langsung di Google Sheets — keduanya tersinkron.' : 'Pesanan baru dari Google Sheets akan muncul otomatis.')) + '</div>';
    var grupAda = kol.some(function (k) { return k.grup; }), g1 = '', g2 = '', gPrev = null, span = 0;
    if (grupAda) {
      var sel = [];
      kol.forEach(function (k, i) { var g = k.grup || ''; if (g === gPrev && g) sel[sel.length - 1].n++; else sel.push({ g: g, n: 1 }); gPrev = g; });
      g1 = '<tr class="lembar__grup"><th class="lembar__no" rowspan="2">#</th>' + sel.map(function (s) { return s.g ? '<th colspan="' + s.n + '" class="center">' + esc(s.g) + '</th>' : '<th colspan="' + s.n + '"></th>'; }).join('') + '<th rowspan="2" class="lembar__alur">Alur</th></tr>';
    }
    var head = (grupAda ? g1 + '<tr>' : '<tr><th class="lembar__no">#</th>') + kol.map(function (k, i) { return '<th class="' + (UANG[k.kunci] || k.kunci === 'Pax' ? 'num' : '') + (i === iNama ? ' lembar__nama' : '') + '"' + (k.rumus ? ' title="Kolom rumus di sheet — dihitung otomatis"' : '') + '>' + esc(k.label) + (k.rumus ? ' <span class="rumus">ƒ</span>' : '') + '</th>'; }).join('') + (grupAda ? '</tr>' : '<th class="lembar__alur">Alur</th></tr>');
    var tampilRows = rows.slice(0, st.batas);
    var body = tampilRows.map(function (p, i) {
      var inf = HT.infoPesanan(p, S), s = HT.statusTrip(inf, today), kal = ix.kal[p.ID_Pesanan], m = ix.mnf[p.ID_Pesanan], r = ix.rek[p.ID_Pesanan];
      var titik = '<span class="alur-mini" title="Kalkulasi · Manifest · Rekap"><i class="' + (kal ? 'ok' : '') + '"></i><i class="' + (m && m.Status === 'Terbit' ? 'ok' : m && m.Status === 'Berubah' ? 'bad' : m ? 'half' : '') + '"></i><i class="' + (r && r.Status === 'Terkunci' ? 'ok' : r && r.Status === 'Siap Dicek' ? 'half' : '') + '"></i></span>';
      return '<tr class="click s-' + s.replace(/\s/g, '').toLowerCase() + '" data-id="' + esc(p.ID_Pesanan) + '" tabindex="0"><td class="lembar__no num">' + (st.tab && p.Baris ? p.Baris : i + 1) + '</td>' + kol.map(function (k, j) {
        var v = j === iNama ? '<b>' + esc(nilai(p, k) || '—') + '</b>' : tampil(p, k);
        return '<td class="' + (UANG[k.kunci] || k.kunci === 'Pax' ? 'num' : '') + (j === iNama ? ' lembar__nama' : '') + '">' + v + '</td>';
      }).join('') + '<td class="lembar__alur">' + titik + '</td></tr>';
    }).join('');
    var lagi = rows.length > st.batas ? '<div class="center" style="padding:14px"><button class="btn btn--ghost btn--sm" data-act="lagi">' + ic('chevrons-down', 16) + 'Tampilkan ' + Math.min(150, rows.length - st.batas) + ' baris lagi</button></div>' : '';
    return '<div class="lembar-wrap"><table class="lembar"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' + lagi;
  }
  function kartuMobile(rows) {
    if (!rows.length) return lembar(rows);
    var S = Store.S, today = U.hariIni();
    return '<div class="stack psn-list">' + rows.slice(0, st.batas).map(function (p) {
      var inf = HT.infoPesanan(p, S), s = HT.statusTrip(inf, today);
      return '<button class="psn-baris" data-id="' + esc(p.ID_Pesanan) + '"><span class="psn-baris__tgl"><b>' + (inf.mulai ? Number(inf.mulai.slice(8, 10)) : '—') + '</b><small>' + (inf.mulai ? U.BLN[Number(inf.mulai.slice(5, 7)) - 1] : '') + '</small></span><span class="row__text grow"><span class="psn-baris__atas"><b class="psn-baris__nama">' + esc(p.Nama) + '</b>' + UI.badge(s) + '</span><small class="truncate">' + esc(p.Trip || '-') + '</small><small class="muted">' + inf.pax + ' pax · ' + esc(p.Tab) + (inf.total ? ' · ' + U.rpRingkas(inf.total) : '') + '</small></span></button>';
    }).join('') + '</div>' + (rows.length > st.batas ? '<div class="center" style="padding:14px"><button class="btn btn--ghost btn--sm" data-act="lagi">' + ic('chevrons-down', 16) + 'Tampilkan lebih banyak</button></div>' : '');
  }
  var mq = matchMedia('(max-width:720px)');

  // ---------------------------------------------------------------- form tambah/ubah
  function opsiUnik(field, tab) { var o = {}; Store.D.Pesanan.forEach(function (p) { if ((!tab || p.Tab === tab) && String(p[field] || '').trim() && p[field] !== '-') o[String(p[field]).trim()] = 1; }); return Object.keys(o).sort().slice(0, 120); }
  function bukaForm(tab, p) {
    if (!Hal.hanyaAdmin()) return;
    var baru = !p; tab = p ? p.Tab : (tab || st.tab || (tabs()[0] || {}).Nama);
    if (!tab) { UI.toast('Belum ada kategori. Hubungkan Database Pemesanan di Pengaturan → Sumber Data.', 'warn'); return; }
    var kol = kolom(tab), v = {}, adaRumus = {};
    kol.forEach(function (k) {
      if (k.kunci === 'ID_Pesanan') return;
      var nm = 'k' + k.idx, x = p ? nilai(p, k) : '';
      if (TGL[k.kunci]) x = U.tgl(x) || ''; if (k.kunci === 'No_HP' && x) x = U.hp08(x) || x;
      if (baru && k.kunci === 'Tgl_Pesan') x = U.hariIni();
      v[nm] = x == null ? '' : x; if (k.rumus) adaRumus[k.kunci] = 1;
    });
    var dl = { Trip: opsiUnik('Trip', tab), PIC: opsiUnik('PIC'), Sumber_Info: opsiUnik('Sumber_Info'), Asal: opsiUnik('Asal'), Penjemputan: opsiUnik('Penjemputan', tab) };
    var utama = [], cek = [], lain = [];
    kol.forEach(function (k) {
      if (k.kunci === 'ID_Pesanan') return;
      var f = { name: 'k' + k.idx, label: k.label };
      if (k.kunci === 'Nama') { f.wajib = true; f.full = true; }
      if (k.kunci === 'Pax') { f.type = 'number'; f.wajib = true; f.attr = ' min="1" step="1" inputmode="numeric"'; }
      if (TGL[k.kunci]) { f.type = 'date'; if (k.kunci === 'Tgl_Mulai') f.wajib = true; if (k.kunci === 'Tgl_Pesan') f.help = 'Kolom tambahan sistem — dipakai untuk laporan frekuensi pemesanan.'; }
      if (k.kunci === 'No_HP') { f.type = 'tel'; f.ph = '0812xxxxxxxx'; }
      if (k.kunci === 'Email') { f.type = 'email'; }
      if (UANG[k.kunci]) { f.type = 'rupiah'; }
      if (k.rumus) { f.disabled = true; f.help = 'Rumus di sheet · dihitung otomatis'; }
      if (LINK[k.kunci]) { f.type = 'url'; f.ph = 'https://docs.google.com/…'; f.full = true; }
      if (k.kunci === 'Trip') f.full = true;
      if (dl[k.kunci]) f.attr = (f.attr || '') + ' list="dl-' + k.kunci + '" autocomplete="off"';
      (cekGrup(k) ? cek : k.kunci ? utama : lain).push(f);
    });
    var isi = '<div class="note" style="margin-bottom:16px">' + ic('table-2') + '<span>Disimpan langsung ke tab <b>' + esc(tab) + '</b> di Google Sheets' + (baru ? ' sebagai baris baru (rumus & format baris di atasnya ikut disalin).' : ' pada baris ' + (p.Baris || '-') + '. Kolom rumus tidak ditimpa.') + '</span></div>' +
      UI.form(utama, v) +
      (lain.length ? '<h3 class="form-sub">Kolom lain di tab ini</h3>' + UI.form(lain, v) : '') +
      (cek.length ? '<h3 class="form-sub">' + esc(cek[0] ? kol.find(function (k) { return 'k' + k.idx === cek[0].name; }).grup : '') + '</h3>' + UI.form(cek, v) : '') +
      Object.keys(dl).map(function (k) { return '<datalist id="dl-' + k + '">' + dl[k].map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>'; }).join('');
    var h = UI.modal({ judul: baru ? 'Tambah pesanan' : 'Ubah pesanan', sub: esc(tab) + (p ? ' · ' + esc(p.ID_Pesanan) : ''), ukuran: 'lg', isi: isi,
      aksi: [{ label: 'Batal' }, { label: baru ? 'Simpan ke Google Sheets' : 'Simpan perubahan', kelas: 'btn--primary', ikon: 'save', klik: async function (hh, b) {
        if (!UI.cekWajib(hh.body)) return false;
        var raw = UI.bacaForm(hh.body), d = { Tab: tab, Checklist: {}, Lain: {} };
        if (p) d.ID_Pesanan = p.ID_Pesanan;
        kol.forEach(function (k) {
          if (k.kunci === 'ID_Pesanan' || k.rumus) return;
          var x = raw['k' + k.idx]; if (x === undefined) return;
          if (k.kunci) d[k.kunci] = x; else if (cekGrup(k)) d.Checklist[k.label] = x; else d.Lain[k.label] = x;
        });
        if (p) { var c0 = U.parseJson(p.Checklist, {}) || {}, l0 = U.parseJson(p.Lain, {}) || {}; Object.keys(c0).forEach(function (x) { if (d.Checklist[x] === undefined) d.Checklist[x] = c0[x]; }); Object.keys(l0).forEach(function (x) { if (d.Lain[x] === undefined) d.Lain[x] = l0[x]; }); }
        var r = await C.aksi('pesanan.simpan', d, { btn: b, loadingText: 'Menulis ke sheet…' });
        if (!r.success) return false;
        if (baru && r.data && r.data.ID_Pesanan) setTimeout(function () { bukaDetail(r.data.ID_Pesanan); }, 320);
      } }] });
    UI.siapkanForm(h.body);
    // pratinjau rumus Total & Sisa
    function k2n(kunci) { var k = kol.find(function (x) { return x.kunci === kunci; }); return k ? h.body.querySelector('[name="k' + k.idx + '"]') : null; }
    var iPax = k2n('Pax'), iH = k2n('Harga'), iDP = k2n('DP'), iT = k2n('Total'), iS = k2n('Sisa');
    function hitung() {
      var pax = Number(iPax && iPax.value) || 0, hg = Number(String(iH ? iH.value : '').replace(/\D/g, '')) || 0, dp = Number(String(iDP ? iDP.value : '').replace(/\D/g, '')) || 0;
      if (iT && adaRumus.Total) iT.value = (pax * hg).toLocaleString('id-ID'); if (iS && adaRumus.Sisa) iS.value = (pax * hg - dp).toLocaleString('id-ID');
    }
    [iPax, iH, iDP].forEach(function (x) { if (x) { x.addEventListener('input', hitung); x.addEventListener('rupiah', hitung); } }); hitung();
    var iM = k2n('Tgl_Mulai'), iSel = k2n('Tgl_Selesai'); if (iM && iSel) iM.addEventListener('change', function () { if (!iSel.value || iSel.value < iM.value) iSel.min = iM.value; });
  }

  // ---------------------------------------------------------------- detail (drawer)
  function isiDetail(p) {
    var S = Store.S, inf = HT.infoPesanan(p, S), tg = HT.tagihanPesanan(Store.D, HT.indeks(Store.D), p, S, U.hariIni()), adm = Store.isAdmin();
    var kol = kolom(p.Tab).filter(function (k) { return k.kunci !== 'Nama'; });
    var inv = U.urutkan(Store.D.Invoice.filter(function (i) { return i.ID_Pesanan === p.ID_Pesanan; }), function (i) { return Number(i.Urutan); });
    var tombol = [
      adm ? ['kalkulasi/' + p.ID_Pesanan, 'calculator', 'Kalkulasi'] : null, adm ? ['manifest/' + p.ID_Pesanan, 'clipboard-list', 'Manifest'] : null,
      ['invoice?pesanan=' + p.ID_Pesanan + (adm ? '&baru=1' : ''), 'receipt', adm ? 'Buat invoice' : 'Invoice'], Store.boleh('tagihan') ? ['tagihan?id=' + p.ID_Pesanan, 'hand-coins', 'Tagihan'] : null, ['rekap?bulan=' + (inf.bulan || '') + '&id=' + p.ID_Pesanan, 'chart-column', 'Rekap']
    ].filter(Boolean);
    return Hal.alurHTML(p, true) +
      '<div class="aksi-grid">' + tombol.map(function (t) { return '<a class="aksi-tile" href="#/' + t[0] + '">' + ic(t[1], 20) + '<span>' + esc(t[2]) + '</span></a>'; }).join('') + '</div>' +
      '<div class="card card--tight"><div class="between" style="margin-bottom:10px"><b>Pembayaran</b>' + UI.badge(tg.status) + '</div><div class="progress ' + (tg.lunas ? 'ok' : '') + '"><i style="width:' + tg.persen + '%"></i></div>' +
      '<dl class="kv" style="margin-top:10px"><dt>Total</dt><dd>' + U.rp(tg.total) + '</dd><dt>DP (sheet)</dt><dd>' + U.rp(tg.dp) + '</dd>' + (tg.bayar ? '<dt>Dicatat Finance</dt><dd>' + U.rp(tg.bayar) + '</dd>' : '') + '<dt>Sisa</dt><dd class="' + (tg.sisa ? 'warn' : 'ok') + '">' + U.rp(tg.sisa) + '</dd></dl></div>' +
      '<div class="card card--tight"><b style="display:block;margin-bottom:8px">Isi baris di sheet</b><dl class="kv kv--isi">' + kol.map(function (k) { return '<dt>' + esc(k.label) + (k.grup ? '<small>' + esc(k.grup) + '</small>' : '') + '</dt><dd>' + tampil(p, k) + '</dd>'; }).join('') + '</dl></div>' +
      (inv.length ? '<div class="card card--tight"><b style="display:block;margin-bottom:8px">Invoice</b>' + inv.map(function (i) { var di = HT.dataInvoice(Store.D, i.ID_Invoice, S); return '<a class="menu-item" href="#/invoice/' + i.ID_Invoice + '">' + ic('receipt', 18) + '<span class="row__text"><b>' + esc(i.Judul) + ' · ' + esc(i.No_Invoice) + '</b><small class="muted" style="display:block">' + esc(i.Customer_ID) + ' · ' + U.rp(di ? di.total : 0) + '</small></span>' + UI.badge(i.Status) + '</a>'; }).join('') + '</div>' : '');
  }
  function bukaDetail(id) {
    var p = Store.get('Pesanan', id); if (!p) { UI.toast('Pesanan tidak ditemukan — mungkin barisnya baru dihapus di sheet.', 'warn'); return; }
    if (st.drawer && !st.drawer.h.ditutup) st.drawer.h.tutup();
    var adm = Store.isAdmin();
    var h = UI.drawer({ kepala: '<div class="between" style="align-items:flex-start"><span class="label">' + esc(p.Tab) + ' · <span class="mono">' + esc(p.ID_Pesanan) + '</span></span><button class="icon-btn" data-tutup aria-label="Tutup">' + ic('x') + '</button></div><div id="dw-kartu">' + Hal.kartuPesanan(p) + '</div>',
      isi: isiDetail(p), kaki: adm ? '<button class="btn btn--danger-ghost" data-x="hapus">' + ic('trash-2', 18) + 'Hapus baris</button><button class="btn btn--primary" data-x="ubah">' + ic('pencil', 18) + 'Ubah</button>' : '',
      onTutup: function () { st.drawer = null; if (/^#\/pesanan\//.test(location.hash)) history.replaceState(null, '', '#/pesanan' + (st.tab ? '?tab=' + encodeURIComponent(st.tab) : '')); } });
    st.drawer = { h: h, id: id };
    h.el.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#/"],[data-go]'); if (a) { h.tutup(); return; }
      var b = e.target.closest('[data-x]'); if (!b) return;
      var pp = Store.get('Pesanan', id); if (!pp) return;
      if (b.dataset.x === 'ubah') bukaForm(pp.Tab, pp);
      if (b.dataset.x === 'hapus') hapus(pp, h);
    });
  }
  async function hapus(p, h) {
    var ok = await UI.konfirmasi({ judul: 'Hapus baris pesanan?', teks: '<b>' + esc(p.Nama) + '</b> di tab ' + esc(p.Tab) + ' akan dihapus dari Google Sheets beserta kalkulasi & manifestnya. Tindakan ini tidak bisa dibatalkan dari aplikasi.', ok: 'Hapus dari sheet', bahaya: true, ikon: 'trash-2' });
    if (!ok) return;
    var r = await C.aksi('pesanan.hapus', { id: p.ID_Pesanan }, { diam: true, proses: 'Menghapus baris di Google Sheets' });
    if (!r.success && /paksa/i.test(r.message)) {
      var ok2 = await UI.konfirmasi({ judul: 'Tetap hapus?', teks: esc(r.message.replace(/ Centang.*$/, '')) + ' Lanjutkan hapus paksa?', ok: 'Hapus paksa', bahaya: true });
      if (!ok2) return; r = await C.aksi('pesanan.hapus', { id: p.ID_Pesanan, paksa: true }, { diam: true, proses: 'Menghapus baris di Google Sheets' });
    }
    UI.toast(r.message, r.success ? 'ok' : 'err');
    if (r.success && h) h.tutup();
  }

  // ---------------------------------------------------------------- halaman
  var H = window.Halaman.pesanan = {
    render: function (el, args, q) {
      if (q && q.tab !== undefined) st.tab = q.tab;
      if (st.tab && !tabs().some(function (t) { return t.Nama === st.tab; })) st.tab = '';
      var adm = Store.isAdmin(), info = Store.info;
      el.innerHTML = Hal.kepala({ judul: 'Data Pemesanan', sub: 'Isi spreadsheet <b>' + esc(info.sumberNama || 'Database Pemesanan') + '</b> — satu tab sheet untuk tiap kategori trip, satu baris untuk tiap pemesan.',
        aksi: '<button class="btn btn--ghost" data-act="tarik">' + ic('refresh-cw', 18) + '<span>Tarik dari sheet</span></button>' + (adm ? '<button class="btn btn--primary" data-act="baru">' + ic('plus', 18) + '<span>Tambah pesanan</span></button>' : '') }) +
        '<div id="ps-peringatan"></div>' +
        '<div class="tab-sheet" id="ps-tabs" role="tablist" aria-label="Kategori (tab sheet)"></div>' +
        '<div class="card card--pad0 lembar-card"><div class="lembar-alat"><div class="input-ic grow" style="max-width:420px">' + ic('search', 18) + '<input class="input" id="ps-q" type="search" placeholder="Cari nama, HP, trip, asal…" value="' + esc(st.q) + '" aria-label="Cari pesanan"></div>' +
        '<select class="select" id="ps-status" style="width:auto" aria-label="Status trip"><option value="">Semua status</option>' + ['Akan Datang', 'Berjalan', 'Selesai', 'Tanpa Tanggal'].map(function (s) { return '<option' + (st.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
        '<select class="select" id="ps-urut" style="width:auto" aria-label="Urutkan"><option value="">Urutan bawaan</option><option value="sheet"' + (st.urut === 'sheet' ? ' selected' : '') + '>Urutan baris sheet</option><option value="tanggal"' + (st.urut === 'tanggal' ? ' selected' : '') + '>Tanggal trip terdekat</option><option value="pesan"' + (st.urut === 'pesan' ? ' selected' : '') + '>Terbaru dipesan</option></select>' +
        '<label class="check hide-sm" style="min-height:36px;margin-left:auto"><input type="checkbox" id="ps-id"' + (st.idTampil ? ' checked' : '') + '><span>Kolom ID SISTEM</span></label></div><div id="ps-isi"></div></div>';
      el.oninput = C.debounce(function (e) { if (e.target.id === 'ps-q') { st.q = e.target.value; st.batas = 150; H.isi(el); } }, 160);
      el.onchange = function (e) { if (e.target.id === 'ps-status') { st.status = e.target.value; H.isi(el); } if (e.target.id === 'ps-urut') { st.urut = e.target.value; H.isi(el); } if (e.target.id === 'ps-id') { st.idTampil = e.target.checked; H.isi(el); } };
      Hal.aksiPeta(el, {
        baru: function () { bukaForm(st.tab); },
        tab: function (d) { st.tab = d.t; st.batas = 150; history.replaceState(null, '', '#/pesanan' + (st.tab ? '?tab=' + encodeURIComponent(st.tab) : '')); H.tabs(el); H.isi(el); },
        lagi: function () { st.batas += 150; H.isi(el); },
        tarik: async function (d, b) {
          b.classList.add('loading'); b.innerHTML = UI.putar(18) + '<span>Menarik…</span>';
          if (C.DEMO) { await C.sleep(600); UI.kilat('Data contoh sudah terbaru'); } else { Store.src = ''; await C.Sinkron.cek(true); }
          b.classList.remove('loading'); b.innerHTML = ic('refresh-cw', 18) + '<span>Tarik dari sheet</span>';
        }
      }, function (e) { var r = e.target.closest('tr[data-id],.psn-baris'); if (r && !e.target.closest('a')) bukaDetail(r.dataset.id); });
      el.onkeydown = function (e) { if (e.key === 'Enter') { var r = e.target.closest('tr[data-id]'); if (r) bukaDetail(r.dataset.id); } };
      if (!H._mq) { H._mq = true; mq.addEventListener('change', function () { if (App.hal === 'pesanan') H.isi(App.el); }); }
      H.tabs(el); H.isi(el); H.navigasi(el, args, q);
    },
    navigasi: function (el, args, q) {
      if (q && q.tab !== undefined && q.tab !== st.tab) { st.tab = q.tab; H.tabs(el); H.isi(el); }
      if (args && args[0]) setTimeout(function () { bukaDetail(args[0]); }, 60);
      if (q && q.baru) { history.replaceState(null, '', '#/pesanan'); setTimeout(function () { bukaForm(q.tab || st.tab); }, 80); }
    },
    segarkan: function (el) {
      H.tabs(el); H.isi(el);
      if (st.drawer && !st.drawer.h.ditutup) { var p = Store.get('Pesanan', st.drawer.id); if (!p) { st.drawer.h.tutup(); UI.toast('Baris pesanan ini dihapus di Google Sheets.', 'warn'); return; } var b = st.drawer.h.el.querySelector('.drawer__body'), k = st.drawer.h.el.querySelector('#dw-kartu'); if (b) b.innerHTML = isiDetail(p); if (k) k.innerHTML = Hal.kartuPesanan(p); }
    },
    tabs: function (el) {
      var box = el.querySelector('#ps-tabs'); if (!box) return;
      var hit = {}; Store.D.Pesanan.forEach(function (p) { hit[p.Tab] = (hit[p.Tab] || 0) + 1; });
      box.innerHTML = '<button role="tab" data-act="tab" data-t="" class="' + (!st.tab ? 'on' : '') + '" aria-selected="' + !st.tab + '">' + ic('layers', 16) + 'Semua<span class="n">' + Store.D.Pesanan.length + '</span></button>' +
        tabs().map(function (t) { var inf = HT.infoTab(Store.S, t.Nama); return '<button role="tab" data-act="tab" data-t="' + esc(t.Nama) + '" class="' + (st.tab === t.Nama ? 'on' : '') + '" aria-selected="' + (st.tab === t.Nama) + '"><i class="tab-sheet__w ' + (inf.bagian === 'SB' ? 'sb' : 'yb') + '"></i>' + esc(t.Nama) + '<span class="n">' + (hit[t.Nama] || 0) + '</span></button>'; }).join('');
      var on = box.querySelector('.on'); if (on && on.scrollIntoView && box.scrollWidth > box.clientWidth) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      var w = el.querySelector('#ps-peringatan'), i = Store.info;
      w.innerHTML = i.sumberOk === false && !C.DEMO ? '<div class="note danger" style="margin-bottom:16px">' + ic('circle-alert') + '<span><b>Database Pemesanan belum bisa dibaca.</b> ' + esc(i.sumberPesan || '') + (Store.isAdmin() ? ' <a href="#/pengaturan/sumber">Buka Pengaturan → Sumber Data</a>' : ' Hubungi Admin.') + (Store.D.Pesanan.length ? ' Data terakhir yang berhasil dibaca tetap ditampilkan.' : '') + '</span></div>' : '';
    },
    isi: function (el) {
      var box = el.querySelector('#ps-isi'); if (!box) return;
      if (!Store.D.Sumber_Tab.length && !C.DEMO) { box.innerHTML = C.Sinkron.status === 'menarik' ? UI.kerangka(8, 7) : UI.kosong('table-2', 'Belum terhubung ke Database Pemesanan', Store.isAdmin() ? 'Tempel link Google Sheets klien di <a href="#/pengaturan/sumber">Pengaturan → Sumber Data</a>.' : 'Admin perlu menghubungkan spreadsheet sumber.'); return; }
      var rows = daftar();
      box.innerHTML = mq.matches ? kartuMobile(rows) : lembar(rows);
      var info = el.querySelector('.lembar-alat'); if (info) info.dataset.n = rows.length + ' baris';
    }
  };
  Halaman.pesanan.bukaDetail = bukaDetail;
})();
