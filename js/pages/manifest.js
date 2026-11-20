/* =====================================================================
   YukBanyuwangi — Manifest Tim Lapang
   Susun manifest (data tim, tamu, daftar peserta, checklist, catatan,
   itinerary dari Google Docs, budgeting dari menu Budgeting TL) → pratinjau A4
   langsung → terbitkan PDF (Drive) → otomatis terlampir di event Google
   Calendar pesanan → undang email Tim Lapang.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, U = C.U, HT = C.HT;
  var st = { daftar: 'dekat', id: '', kotor: false };

  // ---------------------------------------------------------------- draft
  function muat(id) {
    var m = HT.dataManifest(Store.D, id, Store.S); if (!m) return false;
    st.id = id; st.kotor = false;
    st.pic = m.pic; st.durasi = m.durasi; st.tl = m.tl.slice();
    if (!st.tl.length) { var g = (U.parseJson(m.p.Checklist, {}) || {}).GUIDE; if (g) { var t = Store.D.Tim_Lapang.find(function (x) { return x.Status === 'Aktif' && x.Nama.toLowerCase() === String(g).trim().toLowerCase(); }); if (t) st.tl = [{ id: t.ID_TL, nama: t.Nama, email: t.Email, hp: t.No_HP, peran: t.Peran }]; } }
    st.tamu = Object.assign({}, m.tamu); st.cek = m.cek.map(function (c) { return { item: c.item, detail: c.detail }; });
    st.catatan = m.catatan.join('\n'); st.itin = String(m.itinTeks || '').replace(/\u000b/g, '\n'); st.tampilBudget = m.tampilBudget;
    st.peserta = m.peserta.map(function (x) { return [x.nama, x.hp, x.ket].filter(Boolean).join(' - '); }).join('\n');
    return true;
  }
  var reHP = /(\+?62|0)\s?8[\d\s-]{7,14}\d/;
  function pesertaParse() {
    return String(st.peserta || '').split('\n').map(function (l) { return l.replace(/^\s*\d+[.)]\s*/, '').trim(); }).filter(Boolean).map(function (l) {
      var hp = (l.match(reHP) || [''])[0], sisa = hp ? l.replace(hp, '|') : l, bag = sisa.split(/\s*[-–,;|\t]\s*/).filter(function (x) { return x.trim(); });
      return { nama: (bag[0] || '').trim(), hp: hp.replace(/[\s-]/g, ''), ket: bag.slice(1).join(', ').trim() };
    }).filter(function (x) { return x.nama; });
  }
  function payload() { return { ID_Pesanan: st.id, PIC_Kantor: st.pic, TL: st.tl, Durasi: st.durasi, Data_Tamu: st.tamu, Checklist: st.cek, Catatan: st.catatan, Itinerary: st.itin, Peserta: pesertaParse(), Tampil_Budget: st.tampilBudget }; }
  function dataDraft() {
    var m0 = Store.get('Manifest', st.id) || {};
    var row = { ID_Pesanan: st.id, PIC_Kantor: st.pic, TL: JSON.stringify(st.tl), Durasi: st.durasi, Data_Tamu: JSON.stringify(st.tamu), Checklist: JSON.stringify(st.cek), Catatan: st.catatan, Itinerary: st.itin, Peserta: JSON.stringify(pesertaParse()), Tampil_Budget: st.tampilBudget ? 'YA' : 'TIDAK', Status: m0.Status || 'Draft', Versi: m0.Versi, Link_PDF: m0.Link_PDF, File_ID: m0.File_ID, Diundang: m0.Diundang };
    var D = Object.assign({}, Store.D, { Manifest: Store.D.Manifest.filter(function (m) { return m.ID_Pesanan !== st.id; }).concat([row]) });
    return HT.dataManifest(D, st.id, Store.S);
  }

  // ---------------------------------------------------------------- pratinjau langsung
  var token = 0;
  async function pratinjau(el) {
    var box = el.querySelector('#mf-kertas'); if (!box) return;
    var t = ++token, m = dataDraft(), k = await Dok.tataManifest(m);
    if (t !== token || !box.isConnected) return;
    Dok.panelHalaman(box, k, { judul: 'Manifest ' + (m.tamu.nama || m.p.Nama), nama: m.namaFile, sub: k.hal.length + ' halaman A4 · pratinjau dari isian saat ini (termasuk yang belum disimpan)' });
    var nh = el.querySelector('#mf-nhal'); if (nh) nh.textContent = k.hal.length + ' halaman';
    st.kanvas = k;
  }
  var pratinjauNanti = C.debounce(function (el) { pratinjau(el); }, 380);

  // ---------------------------------------------------------------- terbit & undang
  async function terbit(el) {
    var L = UI.langkah('Menerbitkan manifest', ['Menyimpan draft manifest', 'Membuat PDF A4', 'Menyimpan PDF ke Google Drive', 'Melampirkan ke event Google Calendar']);
    L.aktif(0);
    var r = await C.aksi('manifest.simpan', payload(), { diam: true, diamProses: true });
    if (!r.success) { L.gagal(0, r.message); L.tutup(false); return; }
    st.kotor = false; L.aktif(1);
    try {
      var m = HT.dataManifest(Store.D, st.id, Store.S), k = await Dok.tataManifest(m), b64 = await Dok.pdfBase64(k);
      L.aktif(2);
      var res = await C.api('dokumen.simpan', { jenis: 'manifest', ref: st.id, file: { name: m.namaFile + '.pdf', mime: 'application/pdf', b64: b64 } });
      if (!res.success) { L.gagal(2, res.message); L.tutup(false); return; }
      Store.terapkan(res); L.aktif(3); await C.sleep(220);
      if (res.kalender && !res.kalender.ok) { L.gagal(3, 'PDF tersimpan, tetapi Calendar: ' + res.kalender.pesan + ' — dicoba lagi otomatis.'); L.tutup(false); }
      else L.tutup(true, res.message);
      App.segarkan(); if (res.nq || (res.jobs && res.jobs.length)) C.Pekerja.jalan();
      muat(st.id); H.editor(el);
    } catch (e) { L.gagal(1, e.message); L.tutup(false); }
  }
  async function undang(el, b) {
    var emails = Array.from(el.querySelectorAll('[data-undang]:checked')).map(function (x) { return x.value; });
    if (!emails.length) { UI.toast('Centang minimal satu email Tim Lapang.', 'warn'); return; }
    var wa = el.querySelector('#mf-wa') && el.querySelector('#mf-wa').checked;
    var label = b.innerHTML; b.classList.add('loading'); b.innerHTML = UI.putar(16) + '<span>Mengundang…</span>';
    var selesai = UI.proses('Mengirim undangan Google Calendar');
    var r = await C.api('kalender.undang', { idPesanan: st.id, emails: emails, kabari: wa, wa: wa });
    selesai(r.success && !r.peringatan, r.success ? emails.length + ' email diundang' : '');
    if (b.isConnected) { b.classList.remove('loading'); b.innerHTML = label; }
    UI.toast(r.message, r.success ? (r.peringatan ? 'warn' : 'ok') : 'err');
    if (r.success) { Store.terapkan(r); App.segarkan(); if (r.nq) C.Pekerja.jalan(); }
  }
  function tlBaru(cb) {
    UI.modal({ judul: 'Anggota Tim Lapang baru', ukuran: 'sm', isi: UI.form([{ name: 'Nama', label: 'Nama', wajib: true, full: true }, { name: 'Peran', label: 'Peran', ph: 'TL / Guide / Driver / Dokumentasi', nilai: 'TL' }, { name: 'No_HP', label: 'No HP / WA', type: 'tel' }, { name: 'Email', label: 'Email Google (untuk undangan Calendar)', type: 'email', full: true }]),
      aksi: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'btn--primary', ikon: 'user-plus', klik: async function (h, b) { if (!UI.cekWajib(h.body)) return false; var r = await C.aksi('tl.simpan', UI.bacaForm(h.body), { btn: b }); if (r.success && cb) cb(r.data); return r.success; } }] });
  }

  // ---------------------------------------------------------------- daftar
  function daftarRows() {
    var S = Store.S, today = U.hariIni(), ix = HT.indeks(Store.D);
    var rows = Store.D.Pesanan.map(function (p) { var i = HT.infoPesanan(p, S); i.p = p; i.m = ix.mnf[p.ID_Pesanan]; i.bt = HT.budgetTL(ix, p.ID_Pesanan); i.ev = ix.evt[p.ID_Pesanan]; i.h = i.mulai ? U.selisihHari(today, i.mulai) : null; return i; });
    if (st.daftar === 'dekat') rows = rows.filter(function (i) { return i.h !== null && i.selesai >= today && i.h <= 14; });
    if (st.daftar === 'mendatang') rows = rows.filter(function (i) { return i.selesai && i.selesai >= today; });
    if (st.daftar === 'ulang') rows = rows.filter(function (i) { return i.m && i.m.Status === 'Berubah'; });
    return U.urutkan(rows, function (i) { return st.daftar === 'semua' ? (i.mulai || '0') : (i.mulai || '9999'); }, st.daftar === 'semua');
  }
  function tabelDaftar() {
    return UI.tabel({ baris: daftarRows(), klik: function (i) { return i.id; }, kosong: st.daftar === 'dekat' ? 'Tidak ada trip 14 hari ke depan' : 'Tidak ada data', kosongIkon: 'calendar-check',
      kolom: [
        { label: 'Tamu', render: function (i) { return '<div class="cell-main"><span class="psn-ava ' + (i.bagian === 'SB' ? 'sb' : '') + '">' + ic(i.bagian === 'SB' ? 'sailboat' : 'mountain', 18) + '</span><div class="row__text"><b class="truncate">' + esc(i.p.Nama) + '</b><span class="sub truncate">' + esc(i.p.Trip) + '</span></div></div>'; } },
        { label: 'Jadwal', render: function (i) { return esc(i.jadwal || '-') + (i.h !== null && i.h >= 0 ? '<span class="sub">' + (i.h === 0 ? 'Hari ini' : 'H-' + i.h) + '</span>' : i.mulai && i.selesai >= U.hariIni() ? '<span class="sub">Berjalan</span>' : ''); } },
        { label: 'Pax', num: true, render: function (i) { return i.pax; } },
        { label: 'Tim Lapang', render: function (i) { var t = i.m ? (U.parseJson(i.m.TL, []) || []) : []; return t.length ? esc(t.map(function (x) { return x.nama; }).join(', ')) : '<span class="muted">—</span>'; } },
        { label: 'Budgeting TL', render: function (i) { return i.bt.ada ? UI.badge(i.bt.tersimpan ? 'Ada' : 'Kalkulasi lama', i.bt.tersimpan ? 'ok' : 'warn') + '<span class="sub">' + U.rpRingkas(i.bt.terima) + '</span>' : UI.badge('Belum', 'neutral'); } },
        { label: 'Manifest', render: function (i) { return i.m ? UI.badge(i.m.Status === 'Terbit' ? 'Terbit' : i.m.Status, null) + (i.m.Status === 'Terbit' ? '<span class="sub">v' + i.m.Versi + '</span>' : '') : UI.badge('Belum Dibuat'); } },
        { label: 'Calendar', render: function (i) { var u = i.m ? (U.parseJson(i.m.Diundang, []) || []).length : 0; return !i.mulai ? '<span class="muted">—</span>' : i.ev && i.ev.Status === 'OK' ? '<span class="ok">' + ic('calendar-check', 18) + '</span>' + (u ? '<span class="sub">' + u + ' diundang</span>' : '') : i.ev && i.ev.Status === 'Gagal' ? '<span class="danger" title="' + esc(i.ev.Pesan) + '">' + ic('calendar-x', 18) + '</span>' : '<span class="muted" title="Menunggu sinkron">' + ic('clock', 18) + '</span>'; } }
      ] });
  }
  function tabelTL() {
    var rows = U.urutkan(Store.D.Tim_Lapang, function (t) { return (t.Status === 'Aktif' ? '0' : '1') + t.Nama; });
    return '<div class="between" style="margin-bottom:14px"><p class="muted">Daftar Tim Lapang (TL, guide, driver, dokumentasi, korlap). Email dipakai untuk undangan Google Calendar & berbagi PDF manifest.</p><button class="btn btn--primary btn--sm" data-act="tlBaru">' + ic('user-plus', 16) + 'Tambah</button></div>' +
      '<div class="card card--pad0">' + UI.tabel({ baris: rows, klik: function (t) { return 'tl:' + t.ID_TL; }, kolom: [
        { label: 'Nama', render: function (t) { return '<div class="cell-main">' + UI.avatar(t.Nama, '', 'sm') + '<div class="row__text"><b>' + esc(t.Nama) + '</b><span class="sub">' + esc(t.Peran || '-') + '</span></div></div>'; } },
        { label: 'No HP', render: function (t) { return esc(t.No_HP || '-'); } }, { label: 'Email', render: function (t) { return t.Email ? esc(t.Email) : '<span class="warn">Belum ada — tidak bisa diundang</span>'; } },
        { label: 'Tugas', num: true, render: function (t) { return Store.D.Manifest.filter(function (m) { return (U.parseJson(m.TL, []) || []).some(function (x) { return x.id === t.ID_TL; }); }).length; } },
        { label: 'Status', render: function (t) { return UI.badge(t.Status); } }] }) + '</div>';
  }
  function ubahTL(t) {
    UI.modal({ judul: 'Ubah ' + t.Nama, ukuran: 'sm', isi: UI.form([{ name: 'Nama', label: 'Nama', wajib: true, full: true }, { name: 'Peran', label: 'Peran' }, { name: 'No_HP', label: 'No HP / WA', type: 'tel' }, { name: 'Email', label: 'Email Google', type: 'email', full: true }, { name: 'Status', label: 'Status', type: 'select', opsi: ['Aktif', 'Nonaktif'] }, { name: 'Catatan', label: 'Catatan', full: true }], t),
      aksi: [{ label: 'Hapus', kelas: 'btn--danger-ghost', ikon: 'trash-2', klik: async function (h, b) { if (!(await UI.konfirmasi({ judul: 'Hapus ' + t.Nama + '?', teks: 'Bila pernah bertugas di manifest, data dinonaktifkan saja.', ok: 'Hapus', bahaya: true }))) return false; return (await C.aksi('tl.hapus', { id: t.ID_TL }, { btn: b })).success; } },
        { label: 'Batal' }, { label: 'Simpan', kelas: 'btn--primary', ikon: 'save', klik: async function (h, b) { if (!UI.cekWajib(h.body)) return false; var d = UI.bacaForm(h.body); d.ID_TL = t.ID_TL; return (await C.aksi('tl.simpan', d, { btn: b })).success; } }] });
  }

  // ---------------------------------------------------------------- editor
  function cekHTML() {
    return st.cek.map(function (c, i) { return '<div class="cek-baris" data-i="' + i + '"><input class="input" data-c="item" value="' + esc(c.item) + '" placeholder="Item (mis. Kendaraan)"><input class="input" data-c="detail" value="' + esc(c.detail) + '" placeholder="Detail (mis. Hiace Kantor)"><button class="icon-btn" data-act="cekHapus" data-i="' + i + '" aria-label="Hapus baris">' + ic('x', 18) + '</button></div>'; }).join('') +
      '<button class="btn btn--soft btn--sm" data-act="cekTambah">' + ic('plus', 16) + 'Tambah baris</button>';
  }
  function tlHTML() {
    var dipilih = {}; st.tl.forEach(function (t) { dipilih[t.id || t.nama] = 1; });
    var aktif = U.urutkan(Store.D.Tim_Lapang.filter(function (t) { return t.Status === 'Aktif'; }), function (t) { return t.Nama; });
    return '<div class="chips">' + aktif.map(function (t) { var on = dipilih[t.ID_TL]; return '<button class="chip' + (on ? ' on' : '') + '" data-act="tl" data-id="' + t.ID_TL + '" aria-pressed="' + !!on + '">' + (on ? ic('check', 15) : '') + esc(t.Nama) + '<span class="n">' + esc(t.Peran || 'TL') + '</span></button>'; }).join('') +
      '<button class="chip" data-act="tlBaru">' + ic('user-plus', 15) + 'Anggota baru</button></div>' +
      (st.tl.some(function (t) { return !t.email; }) ? '<p class="help warn" style="margin-top:8px">' + ic('triangle-alert', 14) + ' ' + esc(st.tl.filter(function (t) { return !t.email; }).map(function (t) { return t.nama; }).join(', ')) + ' belum punya email — tidak bisa diundang ke Calendar.</p>' : '');
  }
  function panelTerbit() {
    var m = Store.get('Manifest', st.id), ev = Store.get('Kalender_Event', st.id), diundang = m ? (U.parseJson(m.Diundang, []) || []) : [];
    var status = !m ? 'Belum Dibuat' : m.Status;
    var calTeks = ev ? (ev.Status === 'OK' ? 'Event Calendar aktif' + (ev.Lampiran ? ' · PDF terlampir' : '') : 'Calendar: ' + (ev.Pesan || ev.Status)) : 'Event Calendar dibuat otomatis saat sinkron';
    return '<div class="between" style="margin-bottom:10px"><b>Status</b>' + UI.badge(status) + '</div>' +
      (m && m.Status !== 'Draft' && m.Link_PDF ? '<a class="menu-item" href="' + esc(m.Link_PDF) + '" target="_blank" rel="noopener">' + ic('file-text', 18) + '<span class="row__text"><b>Manifest v' + m.Versi + '.pdf</b><small class="muted" style="display:block">Terbit ' + esc(C.F.waktu(m.Diterbitkan)) + '</small></span>' + ic('external-link', 16, 'muted') + '</a>' : '') +
      '<p class="muted" style="font-size:13px;margin:6px 0 12px">' + ic(ev && ev.Status === 'Gagal' ? 'calendar-x' : 'calendar-check', 15) + ' ' + esc(calTeks) + '</p>' +
      (status === 'Berubah' ? '<div class="note warn" style="margin-bottom:12px">' + ic('triangle-alert') + '<span>Ada perubahan (manifest atau budgeting TL) setelah terbit. Terbitkan ulang agar PDF di Calendar ikut diperbarui.</span></div>' : '') +
      '<div class="stack" style="gap:8px"><button class="btn btn--primary btn--block" data-act="terbit">' + ic('send', 18) + '<span>' + (m && m.Versi > 0 ? 'Terbitkan ulang (v' + (Number(m.Versi) + 1) + ')' : 'Terbitkan PDF ke Calendar') + '</span></button>' +
      '<div class="row" style="gap:8px"><button class="btn btn--ghost grow" data-act="simpan">' + ic('save', 18) + '<span>Simpan draft</span></button><button class="btn btn--ghost" data-act="besar" aria-label="Pratinjau besar & unduh">' + ic('maximize-2', 18) + '</button></div></div>' +
      (m && m.Status !== 'Draft' && m.File_ID ? '<div class="undang"><b>Undang Tim Lapang ke Calendar</b>' + (st.tl.length ? st.tl.map(function (t) {
        var sudah = t.email && diundang.indexOf(t.email) > -1;
        return '<label class="check"><input type="checkbox" data-undang value="' + esc(t.email || '') + '"' + (!t.email ? ' disabled' : sudah ? '' : ' checked') + '><span class="row__text"><b>' + esc(t.nama) + '</b><small class="muted" style="display:block">' + esc(t.email || 'tanpa email') + (sudah ? ' · sudah diundang' : '') + '</small></span></label>';
      }).join('') + '<label class="switch" style="min-height:36px"><input type="checkbox" id="mf-wa"><span class="track"></span><span>Kabari juga lewat WhatsApp</span></label><button class="btn btn--soft btn--block" data-act="undang">' + ic('mail', 18) + '<span>Kirim undangan</span></button>' : '<p class="muted">Pilih Tim Lapang dulu.</p>') + '</div>' : '');
  }

  var H = window.Halaman.manifest = {
    render: function (el, args, q) {
      if (args[0]) { if (Hal.hanyaAdmin()) { H.renderEditor(el, args[0]); return; } }
      el.innerHTML = Hal.kepala({ judul: 'Manifest Tim Lapang', sub: 'PDF manifest diterbitkan ke Google Drive dan otomatis terlampir di event Google Calendar trip. Tim Lapang diundang lewat email.' }) +
        '<div class="tabs" role="tablist">' + [['dekat', '14 hari ke depan'], ['mendatang', 'Semua mendatang'], ['ulang', 'Perlu terbit ulang'], ['semua', 'Semua'], ['tl', 'Tim Lapang']].map(function (t) { return '<button data-act="daftar" data-t="' + t[0] + '" class="' + (st.daftar === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="mf-isi"></div>';
      Hal.aksiPeta(el, { daftar: function (d) { st.daftar = d.t; el.querySelectorAll('[data-act="daftar"]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === st.daftar); }); H.isiDaftar(el); }, tlBaru: function () { tlBaru(); } },
        function (e) { var r = e.target.closest('tr[data-row]'); if (!r) return; var v = r.dataset.row; if (v.indexOf('tl:') === 0) { if (Hal.hanyaAdmin()) ubahTL(Store.get('Tim_Lapang', v.slice(3))); } else if (Store.isAdmin()) App.go('manifest/' + v); else UI.toast('Manifest disusun oleh Admin.', 'info'); });
      H.isiDaftar(el);
    },
    isiDaftar: function (el) { var b = el.querySelector('#mf-isi'); if (b) b.innerHTML = st.daftar === 'tl' ? tabelTL() : '<div class="card card--pad0">' + tabelDaftar() + '</div>'; },
    navigasi: function (el, args, q) { H.render(el, args, q); },
    segarkan: function (el, args) {
      if (args[0] && el.querySelector('#mf-form')) { var p = el.querySelector('#mf-panel'); if (p) p.innerHTML = panelTerbit(); if (!st.kotor) { var tl = el.querySelector('#mf-tl'); if (tl) tl.innerHTML = tlHTML(); } pratinjauNanti(el); return; }
      if (!args[0]) H.isiDaftar(el); else H.render(el, args, {});
    },
    renderEditor: function (el, id) {
      if (!Store.get('Pesanan', id)) { el.innerHTML = UI.kosong('search', 'Pesanan tidak ditemukan', '<a href="#/manifest">Kembali ke daftar</a>'); return; }
      if (st.id !== id || !st.kotor) muat(id);
      el.innerHTML = '<div id="mf"></div>'; H.editor(el);
    },
    editor: function (el) {
      var box = el.querySelector('#mf'); if (!box) return;
      var p = Store.get('Pesanan', st.id), inf = HT.infoPesanan(p, Store.S), bt = HT.budgetTL(HT.indeks(Store.D), st.id), S = Store.S;
      box.innerHTML = Hal.kepala({ crumbs: ['Manifest', p.Tab], judul: p.Nama, sub: esc(p.Trip) + ' · ' + esc(inf.jadwal || 'tanpa tanggal') + ' · ' + inf.pax + ' pax', aksi: '<a class="btn btn--ghost" href="#/manifest">' + ic('arrow-left', 18) + '<span>Daftar</span></a>' }) + Hal.alurHTML(p) +
        '<div class="mf-grid"><div class="stack" id="mf-form" style="gap:16px">' +
        '<section class="card"><h2 class="card-h">' + esc(S.MNF_L_TIM || 'Data tim') + '</h2><div class="form"><div class="field"><label for="mf-pic">Nama PIC (kantor)</label><input class="input" id="mf-pic" data-s="pic" value="' + esc(st.pic) + '"></div><div class="field"><label for="mf-dur">Durasi trip</label><input class="input" id="mf-dur" data-s="durasi" value="' + esc(st.durasi) + '"></div></div>' +
        '<div class="field" style="margin-top:14px"><label>Tim Lapang bertugas</label><div id="mf-tl">' + tlHTML() + '</div></div></section>' +
        '<section class="card"><h2 class="card-h">' + esc(S.MNF_L_TAMU || 'Data tamu') + '</h2><div class="form">' + [['nama', 'Nama', 'text', true], ['pax', 'Pax', 'number'], ['hp', 'No HP', 'tel'], ['jemput', 'Penjemputan'], ['drop', 'Drop']].map(function (f) { return '<div class="field' + (f[3] ? ' field--full' : '') + '"><label for="mf-t-' + f[0] + '">' + f[1] + '</label><input class="input" id="mf-t-' + f[0] + '" data-t="' + f[0] + '" type="' + (f[2] || 'text') + '" value="' + esc(st.tamu[f[0]]) + '"></div>'; }).join('') + '</div></section>' +
        '<section class="card"><h2 class="card-h">' + esc(S.MNF_L_PESERTA || 'Daftar peserta') + ' <span class="badge neutral" id="mf-np">' + pesertaParse().length + ' nama</span></h2><p class="muted" style="margin-bottom:8px">Satu nama per baris. Boleh ditambah nomor HP atau keterangan: <span class="mono">Budi Santoso - 0812xxxx - vegetarian</span></p><textarea class="textarea" id="mf-ps" data-s="peserta" rows="6" placeholder="Tempel daftar nama peserta di sini">' + esc(st.peserta) + '</textarea></section>' +
        '<section class="card"><h2 class="card-h">' + esc(S.MNF_L_CEK || 'Check list trip') + '</h2><p class="muted" style="margin-bottom:10px">Terisi dari kolom CHECK LIST KEBUTUHAN di sheet (bisa diubah).</p><div class="stack" id="mf-cek" style="gap:8px">' + cekHTML() + '</div></section>' +
        '<section class="card"><h2 class="card-h">' + esc(S.MNF_L_CATATAN || 'Catatan') + '</h2><textarea class="textarea" id="mf-cat" data-s="catatan" rows="3" placeholder="Satu baris = satu poin">' + esc(st.catatan) + '</textarea></section>' +
        '<section class="card"><div class="between wrap" style="margin-bottom:10px"><h2 class="card-h" style="margin:0">' + esc(S.MNF_L_ITIN || 'Itinerary') + ' <span class="badge neutral" id="mf-ni"></span></h2><button class="btn btn--soft btn--sm" data-act="itin">' + ic('file-text', 16) + 'Ambil dari Google Docs</button></div>' +
        '<div class="input-ic" style="margin-bottom:8px">' + ic('link', 18) + '<input class="input" id="mf-itl" type="url" placeholder="Link Google Docs itinerary" value="' + esc(p.Link_Itinerary || '') + '"></div>' +
        '<textarea class="textarea mono-ringan" id="mf-itin" data-s="itin" rows="10" placeholder="Hari Pertama&#10;07:00 Penjemputan di stasiun…">' + esc(st.itin) + '</textarea><p class="help muted" style="margin-top:6px">Baris diawali "Hari Pertama/Kedua…" menjadi judul hari (tanggal ditambahkan otomatis), baris diawali jam (07:00) menjadi kegiatan.</p></section>' +
        '<section class="card"><div class="between"><div><h2 class="card-h" style="margin:0">' + esc(S.MNF_L_BUDGET || 'Budgeting') + '</h2><p class="muted" style="margin-top:4px">' + (bt.ada ? bt.n + ' baris · budget ' + U.rp(bt.total) + ' · terima TL ' + U.rp(bt.terima) + (bt.tersimpan ? '' : ' (dari kalkulasi versi lama)') : 'Budgeting TL belum diisi.') + ' <a href="#/budgettl/' + st.id + '">' + (bt.ada ? 'Ubah di Budgeting TL' : 'Isi Budgeting TL') + '</a></p></div><label class="switch"><input type="checkbox" id="mf-bud"' + (st.tampilBudget ? ' checked' : '') + '><span class="track"></span><span class="hide-sm">Tampilkan</span></label></div></section>' +
        '</div><aside class="mf-samping mf-samping--gulir"><div class="card card--pad0 kertas-panel"><div class="kertas-panel__h"><b>Pratinjau A4</b><small class="muted" id="mf-nhal">Sama persis dengan PDF</small></div><div id="mf-kertas" class="kertas-tumpuk">' + UI.kerangka(6, 3) + '</div></div><div class="card card--tight" id="mf-panel">' + panelTerbit() + '</div></aside></div>';
      var form = box.querySelector('#mf-form');
      function ubah() { st.kotor = true; pratinjauNanti(el); var np = box.querySelector('#mf-np'); if (np) np.textContent = pesertaParse().length + ' nama'; var ni = box.querySelector('#mf-ni'); if (ni) ni.textContent = HT.parseItinerary(st.itin, inf.mulai).length + ' hari'; }
      form.addEventListener('input', function (e) {
        var t = e.target;
        if (t.dataset.s) st[t.dataset.s] = t.value;
        if (t.dataset.t) st.tamu[t.dataset.t] = t.value;
        if (t.dataset.c) st.cek[+t.closest('.cek-baris').dataset.i][t.dataset.c] = t.value;
        if (t.id === 'mf-itl') return;
        ubah();
      });
      form.addEventListener('change', function (e) { if (e.target.id === 'mf-bud') { st.tampilBudget = e.target.checked; ubah(); } });
      Hal.aksiPeta(el, {
        tl: function (d) {
          var t = Store.get('Tim_Lapang', d.id), i = st.tl.findIndex(function (x) { return x.id === d.id; });
          if (i > -1) st.tl.splice(i, 1); else st.tl.push({ id: t.ID_TL, nama: t.Nama, email: t.Email, hp: t.No_HP, peran: t.Peran });
          box.querySelector('#mf-tl').innerHTML = tlHTML(); ubah();
        },
        tlBaru: function () { tlBaru(function (t) { if (t && t.ID_TL) st.tl.push({ id: t.ID_TL, nama: t.Nama, email: t.Email, hp: t.No_HP, peran: t.Peran }); setTimeout(function () { var x = box.querySelector('#mf-tl'); if (x) x.innerHTML = tlHTML(); ubah(); }, 50); }); },
        cekTambah: function () { st.cek.push({ item: '', detail: '' }); box.querySelector('#mf-cek').innerHTML = cekHTML(); var r = box.querySelectorAll('.cek-baris input'); if (r.length) r[r.length - 2].focus(); ubah(); },
        cekHapus: function (d) { st.cek.splice(+d.i, 1); box.querySelector('#mf-cek').innerHTML = cekHTML(); ubah(); },
        itin: async function (d, b) {
          var url = box.querySelector('#mf-itl').value.trim(); if (!/docs\.google\.com\/document\/d\//.test(url)) { UI.toast('Tempel link Google Docs itinerary.', 'warn'); return; }
          if (st.itin.trim() && !(await UI.konfirmasi({ judul: 'Ganti itinerary?', teks: 'Isi itinerary saat ini diganti dengan isi Google Docs.', ok: 'Ganti', ikon: 'file-text' }))) return;
          var label = b.innerHTML; b.classList.add('loading'); b.innerHTML = UI.putar(16) + '<span>Membaca…</span>';
          var selesai = UI.proses('Membaca Google Docs'), r = await C.api('itinerary.baca', { url: url });
          selesai(r.success, r.success ? 'Itinerary terbaca' : ''); b.classList.remove('loading'); b.innerHTML = label;
          if (!r.success) { UI.toast(r.message, 'err'); return; }
          st.itin = String(r.data.teks || '').replace(/\u000b/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); box.querySelector('#mf-itin').value = st.itin; ubah();
          UI.toast('Itinerary "' + (r.data.judul || 'Google Docs') + '" dimasukkan — ' + HT.parseItinerary(st.itin, inf.mulai).length + ' hari.', 'ok');
        },
        simpan: async function (d, b) { var r = await C.aksi('manifest.simpan', payload(), { btn: b }); if (r.success) { st.kotor = false; box.querySelector('#mf-panel').innerHTML = panelTerbit(); } },
        terbit: function () { terbit(el); },
        undang: function (d, b) { undang(el, b); },
        besar: async function () { var m = dataDraft(), k = await Dok.tataManifest(m); Dok.penampil(k, { judul: 'Manifest ' + p.Nama, nama: m.namaFile, sub: k.hal.length + ' halaman A4 · pratinjau dari isian saat ini (termasuk yang belum disimpan)' }); }
      });
      var ni = box.querySelector('#mf-ni'); if (ni) ni.textContent = HT.parseItinerary(st.itin, inf.mulai).length + ' hari';
      pratinjau(el);
    }
  };
})();
