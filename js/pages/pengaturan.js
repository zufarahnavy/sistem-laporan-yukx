/* =====================================================================
   YukBanyuwangi — Pengaturan (Admin)
   Identitas & tampilan · Sumber data (link Database Pemesanan & Rekap,
   pengaturan per tab, sembunyikan ID) · Perusahaan & invoice (dengan
   pratinjau) · Manifest PDF (teks, logo — dengan pratinjau) · Label rekap ·
   Halaman masuk (slideshow) · WhatsApp & Qontak · Akses menu · Pengguna · Sistem.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { tab: 'tampilan', draft: null, sumber: null, tpl: null, kanal: null };
  var TABS = [['tampilan', 'palette', 'Identitas & tampilan'], ['masuk', 'images', 'Halaman masuk'], ['sumber', 'table-2', 'Sumber data'], ['invoice', 'receipt', 'Perusahaan & invoice'], ['manifest', 'clipboard-list', 'Manifest PDF'], ['rekap', 'chart-column', 'Label rekap'], ['wa', 'message-circle', 'WhatsApp & Qontak'], ['akses', 'shield-check', 'Akses menu'], ['pengguna', 'users-round', 'Pengguna'], ['sistem', 'network', 'Sistem']];
  var LABEL_REKAP = { JUDUL: 'Judul bagian', NO: 'Nomor', KODE: 'Kode trip', QTY: 'Qty / pax', PIC: 'PIC', PRICE: 'Harga', PENJUALAN: 'Penjualan', HPP: 'Grup HPP (kosong = tanpa grup)', PENGELUARAN: 'Pengeluaran', LABA: 'Laba kotor', MARGIN_A: 'Margin — baris 1', MARGIN_B: 'Margin — baris 2', RATAAN_A: 'Rataan — baris 1', RATAAN_B: 'Rataan — baris 2' };

  function draftS() { if (!st.draft) st.draft = Object.assign({}, Store.S); return st.draft; }
  function pratinjauTema() { C.Tema.terapkan(draftS(), false); }
  function kembalikanTema() { st.draft = null; C.Tema.terapkan(Store.S, false); }
  function diubah() { var S = draftS(), kv = {}; YX.PENGATURAN_BOLEH.forEach(function (k) { if (S[k] !== undefined && String(S[k]) !== String(Store.S[k] == null ? '' : Store.S[k])) kv[k] = S[k]; }); return kv; }
  function kartu(judul, sub, isi, o) { o = o || {}; return '<section class="card stack ' + (o.cls || '') + '" style="gap:14px"><div class="between"><div class="card__title"><h2>' + (o.ikon ? ic(o.ikon, 22, 'primary') : '') + esc(judul) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (o.kanan || '') + '</div>' + isi + '</section>'; }
  function gambarSlot(kunci, label, ket, o) {
    var v = draftS()[kunci]; o = o || {};
    return '<div class="aset-slot"><div class="aset-slot__img' + (o.gelap ? ' gelap' : '') + '">' + (v ? '<img src="' + esc(v) + '" alt="' + esc(label) + '">' : '<span class="muted">' + ic('image', 22) + '</span>') + '</div><div class="row__text"><b>' + esc(label) + '</b><small class="muted">' + ket + '</small><div class="row" style="gap:6px;margin-top:6px"><button class="btn btn--soft btn--sm" data-act="unggah" data-k="' + kunci + '" data-kind="' + (o.kind || 'aset') + '">' + ic('upload', 15) + (v ? 'Ganti' : 'Unggah') + '</button>' + (v ? '<button class="btn btn--plain btn--sm" data-act="hapusGbr" data-k="' + kunci + '">Hapus</button>' : '') + '</div></div></div>';
  }

  // ---------------------------------------------------------------- 1. tampilan
  function tabTampilan() {
    var S = draftS(), pal = U.paletAktif(S), cek = U.cekPalet(pal), preset = pal.preset;
    var swatch = function (p) { return '<span class="row" style="gap:4px;margin-top:8px">' + [p.primary, p.primaryDark, p.primarySoft, p.accent].map(function (c) { return '<span style="width:16px;height:16px;border-radius:50%;background:' + c + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)"></span>'; }).join('') + '</span>'; };
    return '<div class="grid-12" style="align-items:start">' +
      kartu('Nama & teks aplikasi', 'Sidebar, judul tab browser, email, dan halaman masuk.', UI.form([{ name: 'APP_NAMA', label: 'Nama aplikasi', wajib: true }, { name: 'APP_TAGLINE', label: 'Tagline' }, { name: 'APP_NAMA_PANJANG', label: 'Nama lengkap', full: true }], S) + '<p class="help muted">Gambar & tulisan halaman masuk diatur di tab <a href="#/pengaturan/masuk">Halaman masuk</a>.</p>', { ikon: 'badge-check', cls: 'span-7 span-lg-12' }) +
      kartu('Logo & ikon', 'Disimpan di folder Aset Aplikasi (Google Drive).', gambarSlot('LOGO_URL', 'Logo aplikasi', 'Sidebar, halaman masuk, kop dokumen. PNG/SVG transparan.', { kind: 'logo' }) + gambarSlot('FAVICON_URL', 'Favicon', 'Ikon tab browser. PNG persegi 512 px.', { kind: 'favicon' }) +
        '<button class="btn btn--ghost btn--sm" data-act="default" data-g="gambar" style="width:max-content">' + ic('rotate-ccw', 16) + 'Pakai logo bawaan</button>', { ikon: 'image', cls: 'span-5 span-lg-12' }) +
      kartu('Warna tema', 'Diterapkan langsung sebagai pratinjau; klik Simpan agar berlaku untuk semua pengguna.', '<div class="bento" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">' + Object.keys(YX.PRESET_PALET).map(function (k) { var p = YX.PRESET_PALET[k]; return '<button class="card card--tight press preset' + (preset === k ? ' on' : '') + '" data-act="preset" data-p="' + k + '"><div class="between"><b>' + esc(p.nama) + '</b>' + (preset === k ? ic('circle-check', 18, 'primary') : '') + '</div>' + swatch(p) + '</button>'; }).join('') +
        '<button class="card card--tight press preset' + (preset === 'kustom' ? ' on' : '') + '" data-act="preset" data-p="kustom"><div class="between"><b>Kustom</b>' + ic('pipette', 18, 'muted') + '</div><small class="muted">Atur HEX sendiri</small></button></div>' +
        (preset === 'kustom' ? '<div class="bento" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">' + [['primary', 'Primer'], ['primaryDark', 'Primer gelap'], ['primarySoft', 'Primer terang'], ['accent', 'Aksen'], ['bg', 'Latar'], ['surface', 'Kartu'], ['text', 'Teks'], ['muted', 'Teks redup']].map(function (x) { return '<label class="card card--tight card--flat stack" style="gap:6px;background:var(--c-surface-2)"><span class="label">' + x[1] + '</span><span class="row" style="gap:8px"><input type="color" data-warna="' + x[0] + '" value="' + pal[x[0]] + '" style="width:36px;height:36px;border:0;background:none;padding:0;cursor:pointer"><span class="mono">' + pal[x[0]].toUpperCase() + '</span></span></label>'; }).join('') + '</div>' : '') +
        '<div class="note ' + (cek.lulus ? 'ok' : 'danger') + '">' + ic(cek.lulus ? 'circle-check' : 'circle-alert') + '<span>' + (cek.lulus ? 'Kontras teks lulus (≥ 4,5:1).' : 'Kontras terlalu rendah — tidak bisa disimpan: ' + esc(cek.masalah.join(' · '))) + '</span></div>', { ikon: 'palette', cls: 'span-7 span-lg-12' }) +
      kartu('Huruf', 'Google Fonts.', UI.form([{ name: 'FONT_BODY', label: 'Huruf isi', type: 'select', opsi: C.Tema.FONTS, full: true }, { name: 'FONT_HEAD', label: 'Huruf judul', type: 'select', opsi: C.Tema.FONTS, full: true }], S) + '<button class="btn btn--ghost btn--sm" data-act="default" data-g="tampilan" style="width:max-content">' + ic('rotate-ccw', 16) + 'Kembalikan warna & huruf bawaan</button>', { ikon: 'type', cls: 'span-5 span-lg-12' }) + '</div>';
  }

  // ---------------------------------------------------------------- 2. sumber data
  function infoFile(x, jenis) {
    if (C.DEMO && jenis === 'pesanan') x = x || { nama: 'Dummy Database Pemesanan YukX', ok: true, samar: '1Dem••••••Pes0' };
    if (!x) return '<div class="sumber-file kosong">' + ic('link', 20) + '<div class="row__text"><b>Belum dihubungkan</b><small class="muted">' + (jenis === 'rekap' ? 'Opsional — rekap tetap tampil & bisa diunduh di aplikasi.' : 'Wajib — semua data pemesanan berasal dari file ini.') + '</small></div></div>';
    return '<div class="sumber-file ' + (x.ok ? 'ok' : 'galat') + '">' + ic(x.ok ? 'file-spreadsheet' : 'circle-alert', 20) + '<div class="row__text"><b class="truncate">' + esc(x.nama || 'File tidak bisa dibuka') + '</b><small class="muted">' + (x.ok ? 'ID ' + esc(x.samar) + (x.diubah ? ' · diubah ' + esc(F.relatif(x.diubah)) : '') : esc(x.pesan || '')) + '</small></div><button class="btn btn--plain btn--sm" data-act="lepas" data-j="' + jenis + '">Lepas</button></div>';
  }
  function tabSumber() {
    var S = draftS(), i = st.sumber, tabAtur = U.parseJson(S.SUMBER_TAB, {}) || {}, tabs = U.urutkan(Store.D.Sumber_Tab, function (t) { return Number(t.Urutan); });
    var akun = i && i.akun ? '<b class="mono">' + esc(i.akun) + '</b>' : 'akun Google pemilik Apps Script';
    return '<div class="grid-12" style="align-items:start">' +
      kartu('Database Pemesanan', 'Spreadsheet klien (boleh milik akun Google lain). Tab = kategori trip, baris = pesanan. Template kolom mengikuti file klien.',
        (i ? infoFile(i.pesanan, 'pesanan') : UI.kerangka(1, 2)) +
        '<div class="row wrap" style="gap:8px"><input class="input grow" id="sm-pes" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" style="min-width:min(100%,280px)"><button class="btn btn--primary" data-act="hubung" data-j="pesanan">' + ic('link', 18) + 'Hubungkan</button></div>' +
        '<ol class="langkah-mini"><li>Buka file Database Pemesanan → <b>Bagikan</b> → tambahkan ' + akun + ' sebagai <b>Editor</b>.</li><li>Tempel link file di atas lalu <b>Hubungkan</b>. Aplikasi menambah kolom <b>TANGGAL PESAN</b> & <b>ID SISTEM</b> di ujung kanan tiap tab (kolom lain tidak diubah).</li><li>Perubahan dari aplikasi langsung tertulis ke sheet; ketikan langsung di sheet masuk ke aplikasi dalam beberapa detik.</li></ol>' +
        '<div class="form"><div class="field"><label for="f-SUMBER_JEDA">Cek perubahan sheet tiap (detik)</label><input class="input" id="f-SUMBER_JEDA" name="SUMBER_JEDA" type="number" min="3" max="60" value="' + esc(S.SUMBER_JEDA) + '"><div class="help">3–60 detik. Makin kecil makin cepat, makin banyak kuota Apps Script terpakai.</div></div>' +
        '<div class="field"><label>Kolom ID SISTEM di sheet</label><label class="switch"><input type="checkbox" id="sm-sembunyi"' + (S.SUMBER_SEMBUNYIKAN_ID === 'YA' ? ' checked' : '') + '><span class="track"></span><span>Sembunyikan</span></label><div class="help">ID dipakai untuk menghubungkan baris dengan kalkulasi, manifest & rekap. Jangan dihapus atau diketik ulang.</div></div></div>' +
        '<button class="btn btn--ghost btn--sm" data-act="siapkan" style="width:max-content">' + ic('sparkles', 16) + 'Periksa & siapkan kolom sistem sekarang</button>', { ikon: 'table-2', cls: 'span-7 span-lg-12', kanan: i && i.trigger ? '<span class="badge ok">' + ic('zap', 14) + 'Sinkron instan</span>' : '' }) +
      kartu('File Rekapitulasi', 'Tujuan penulisan rekap per bulan (format Dummy Rekapitulasi). Satu tab per bulan.', (i ? infoFile(i.rekap, 'rekap') : UI.kerangka(1, 2)) +
        '<div class="row wrap" style="gap:8px"><input class="input grow" id="sm-rek" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" style="min-width:min(100%,240px)"><button class="btn btn--soft" data-act="hubung" data-j="rekap">' + ic('link', 18) + 'Hubungkan</button></div>' +
        UI.form([{ name: 'REKAP_TAB', label: 'Nama tab rekap', help: '{bulan} dan {tahun} diganti otomatis, mis. "Rekap November 2026".', full: true }, { name: 'REKAP_SHEET_AKTIF', label: 'Tulis otomatis ke Google Sheet', type: 'select', opsi: [{ v: 'YA', l: 'Ya — setiap rekap berubah' }, { v: 'TIDAK', l: 'Tidak — hanya di aplikasi' }], full: true }], S), { ikon: 'chart-column', cls: 'span-5 span-lg-12' }) +
      kartu('Kategori (tab sheet)', 'Tiap tab tampil sebagai tabel sendiri di rekap. Pilih jenis kolom rekapnya (YB atau SB) dan jenis trip — dipakai report "Paket Open Trip terlaris".',
        (tabs.length ? '<div class="table-wrap"><table class="tabel-atur"><thead><tr><th>Tab sheet</th><th>Baris</th><th>Kolom rekap</th><th>Jenis trip</th></tr></thead><tbody>' + tabs.map(function (t) {
          var inf = HT.infoTab(S, t.Nama), n = Store.D.Pesanan.filter(function (p) { return p.Tab === t.Nama; }).length;
          return '<tr><td data-label="Tab"><b>' + esc(t.Nama) + '</b><span class="sub">' + (Number(t.Header) > 1 ? 'Kepala 2 baris' : 'Kepala 1 baris') + ' · ' + (U.parseJson(t.Kolom, []) || []).length + ' kolom</span></td><td data-label="Baris" class="num">' + n + '</td>' +
            '<td data-label="Kolom rekap"><select class="select" data-tab="' + esc(t.Nama) + '" data-f="bagian"><option value="YB"' + (inf.bagian === 'YB' ? ' selected' : '') + '>Tipe YB — KEND, BBM, HOTEL…</option><option value="SB"' + (inf.bagian === 'SB' ? ' selected' : '') + '>Tipe SB — KAPTEN & ABK, BBM OLI…</option></select></td>' +
            '<td data-label="Jenis trip"><select class="select" data-tab="' + esc(t.Nama) + '" data-f="jenis"><option' + (inf.jenis === 'Private' ? ' selected' : '') + '>Private</option><option' + (inf.jenis === 'Open Trip' ? ' selected' : '') + '>Open Trip</option></select></td></tr>';
        }).join('') + '</tbody></table></div><p class="help muted">Tebakan awal dari nama tab (mis. "SB" → Sunrise Boat, "Private" → Private). Tab baru di sheet otomatis muncul di sini.</p>' : UI.kosong('table-2', 'Belum ada tab terbaca', 'Hubungkan Database Pemesanan dulu.')), { ikon: 'layers', cls: 'span-12' }) + '</div>';
  }

  // ---------------------------------------------------------------- 3. perusahaan & invoice
  function contohInvoice(S) {
    var inv = U.urutkan(Store.D.Invoice.filter(function (i) { return i.Status !== 'Batal'; }), function (i) { return i.Tanggal; }, true)[0];
    if (inv) return HT.dataInvoice(Store.D, inv.ID_Invoice, S);
    var p = { Nama: 'Nama Pemesan', Trip: 'Private Trip 3D2N Banyuwangi', Tab: '' }, inf = HT.infoPesanan(p, S), items = [{ desk: 'Private Trip 3D2N Banyuwangi', qty: 10, harga: 2500000 }], h = HT.hitungInvoice(items, 0, 10000000);
    return { inv: { No_Invoice: '01' + U.hariIni().slice(5, 7) + U.hariIni().slice(0, 4), Customer_ID: (S.INV_HURUF || 'P') + '/001/XI/2026', Tanggal: U.hariIni(), Note_Judul: S.INV_NOTE_JUDUL, Note_Isi: S.INV_NOTE_TEKS, Status: 'Terbit' }, p: p, inf: inf, items: items, subtotal: h.subtotal, disc: 0, total: h.total, dp: h.dp, sisa: h.sisa, rekening: HT.rekeningDari(S), syarat: HT.syaratDari(S, inf), billTo: ['Nama Pemesan', '0812xxxxxxxx'] };
  }
  function tabInvoice() {
    var S = draftS(), rek = U.parseJson(S.INV_REKENING, []) || [], syarat = U.parseJson(S.INV_SYARAT, null); if (!Array.isArray(syarat)) syarat = [];
    return '<div class="mf-grid"><div class="stack" style="gap:16px">' +
      kartu('Kop perusahaan', 'Tampil di invoice, laporan PDF, dan pesan.', UI.form([{ name: 'PT_NAMA', label: 'Nama badan usaha', full: true }, { name: 'PT_MEREK', label: 'Merek (baris kedua kop)' }, { name: 'KOTA', label: 'Kota' }, { name: 'PT_ALAMAT', label: 'Alamat', full: true }, { name: 'PT_TELP', label: 'Telepon kantor' }, { name: 'PT_WA', label: 'WhatsApp', type: 'tel' }, { name: 'PT_WEB', label: 'Website' }, { name: 'PT_IG', label: 'Instagram' }, { name: 'PT_EMAIL', label: 'Email kantor', type: 'email', full: true }], S), { ikon: 'building-2' }) +
      kartu('Tampilan & penomoran invoice', '', UI.form([{ name: 'INV_JUDUL', label: 'Judul besar' }, { html: '<label for="f-INV_WARNA">Warna pita & judul</label><div class="row" style="gap:8px"><input type="color" id="f-INV_WARNA" name="INV_WARNA" value="' + esc(S.INV_WARNA || '#0094C8') + '" style="width:44px;height:44px;border:0;background:none;padding:0"><span class="mono">' + esc(S.INV_WARNA) + '</span></div>' },
        { name: 'INV_HURUF', label: 'Huruf awal Customer ID', help: 'Contoh: P → P/001/XI/2026', attr: ' maxlength="4" style="text-transform:uppercase"' }, { name: 'INV_BARIS', label: 'Jumlah baris tabel', type: 'number', attr: ' min="5" max="25"' }, { name: 'INV_SISA_LABEL', label: 'Label baris sisa' }, { name: 'INV_TTD_LABEL', label: 'Label di bawah tanda tangan' },
        { name: 'INV_QR', label: 'QR verifikasi kecil', type: 'select', opsi: [{ v: 'TIDAK', l: 'Tidak ditampilkan (sesuai model)' }, { v: 'YA', l: 'Tampilkan di samping tanda tangan' }], full: true }], S), { ikon: 'receipt' }) +
      kartu('Rekening & note', 'NOTE di kiri bawah invoice.', UI.form([{ name: 'INV_NOTE_JUDUL', label: 'Judul note default' }, { name: 'INV_NOTE_TEKS', label: 'Teks note' }, { name: 'INV_ATAS_NAMA', label: 'Atas nama rekening', full: true }], S) +
        '<div class="stack" style="gap:8px" id="pg-rek">' + rek.map(function (r, i) { return '<div class="rek-baris" data-i="' + i + '"><span class="rek-logo">' + (r.logo ? '<img src="' + esc(r.logo) + '" alt="">' : ic('wallet', 18)) + '</span><input class="input" data-r="bank" value="' + esc(r.bank) + '" placeholder="Bank"><input class="input mono" data-r="norek" value="' + esc(r.norek) + '" placeholder="No. rekening"><button class="btn btn--ghost btn--sm" data-act="rekLogo" data-i="' + i + '">' + ic('image', 15) + 'Logo</button><button class="icon-btn" data-act="rekHapus" data-i="' + i + '" aria-label="Hapus rekening">' + ic('x', 18) + '</button></div>'; }).join('') + '</div><button class="btn btn--soft btn--sm" data-act="rekTambah" style="width:max-content">' + ic('plus', 16) + 'Tambah rekening</button>', { ikon: 'wallet' }) +
      kartu('Syarat & ketentuan', 'Tulis <span class="mono">{tglTrip}</span> untuk tanggal hari pertama trip.', '<div class="stack" style="gap:8px" id="pg-syarat">' + syarat.map(function (x, i) { return '<div class="row" style="gap:8px;align-items:flex-start" data-i="' + i + '"><span class="muted" style="padding-top:12px">' + (i + 1) + '.</span><textarea class="textarea" data-sy rows="2">' + esc(x) + '</textarea><button class="icon-btn" data-act="syHapus" data-i="' + i + '" aria-label="Hapus">' + ic('x', 18) + '</button></div>'; }).join('') + '</div><button class="btn btn--soft btn--sm" data-act="syTambah" style="width:max-content">' + ic('plus', 16) + 'Tambah poin</button>', { ikon: 'list' }) +
      kartu('Tanda tangan & cap', 'Diunggah Admin (PNG latar transparan). Tidak diambil dari contoh invoice.', gambarSlot('INV_TTD_URL', 'Tanda tangan', 'PNG transparan, ±600 px lebar.', { kind: 'ttd' }) + gambarSlot('INV_CAP_URL', 'Cap / stempel', 'PNG transparan.', { kind: 'cap' }) +
        '<button class="btn btn--ghost btn--sm" data-act="default" data-g="invoice" style="width:max-content">' + ic('rotate-ccw', 16) + 'Kembalikan pengaturan invoice bawaan</button>', { ikon: 'stamp' }) +
      kartu('Tautan', '', UI.form([{ name: 'APP_URL', label: 'URL aplikasi', full: true, ph: 'https://…github.io/yukbanyuwangi/' }, { name: 'VERIF_URL', label: 'URL halaman verifikasi', full: true, ph: '…/verifikasi.html' }], S), { ikon: 'link' }) +
      '</div><aside class="mf-samping mf-samping--gulir"><div class="card card--pad0 kertas-panel"><div class="kertas-panel__h"><b>Pratinjau invoice</b><small class="muted">dari invoice terakhir</small></div><div id="pg-kertas" class="kertas-tumpuk">' + UI.kerangka(5, 3) + '</div></div></aside></div>';
  }

  // ---------------------------------------------------------------- 4. manifest
  function contohManifest(S) {
    var m = U.urutkan(Store.D.Manifest, function (x) { return (x.Status === 'Terbit' ? '1' : '0') + (x.Diperbarui || ''); }, true)[0], id = m ? m.ID_Pesanan : (Store.D.Pesanan[0] || {}).ID_Pesanan;
    return id ? HT.dataManifest(Store.D, id, S) : null;
  }
  function tabManifest() {
    var S = draftS();
    return '<div class="mf-grid"><div class="stack" style="gap:16px">' +
      kartu('Judul & kop', 'PDF manifest untuk Tim Lapang (terlampir di Google Calendar).', UI.form([{ name: 'MNF_JUDUL', label: 'Judul', full: true }, { name: 'MNF_LOGO', label: 'Logo & kop', type: 'select', opsi: [{ v: 'TIDAK', l: 'Tanpa logo (sesuai model)' }, { v: 'YA', l: 'Tampilkan logo & teks kop' }] }, { name: 'MNF_KOP', label: 'Teks kop di samping logo' }, { name: 'MNF_KAKI', label: 'Teks kaki halaman (opsional)', full: true }], S) +
        gambarSlot('MNF_LOGO_URL', 'Logo khusus manifest', 'Kosong = logo aplikasi.', { kind: 'logo' }), { ikon: 'clipboard-list' }) +
      kartu('Judul tiap bagian', '', UI.form([{ name: 'MNF_L_TIM', label: 'Data tim' }, { name: 'MNF_L_TAMU', label: 'Data tamu' }, { name: 'MNF_L_PESERTA', label: 'Daftar peserta' }, { name: 'MNF_L_CEK', label: 'Checklist' }, { name: 'MNF_L_CATATAN', label: 'Catatan' }, { name: 'MNF_L_ITIN', label: 'Itinerary' }, { name: 'MNF_L_BUDGET', label: 'Budgeting' }], S), { ikon: 'type' }) +
      kartu('Isian bawaan', 'Dipakai saat manifest baru dibuat.', UI.form([{ name: 'MNF_PIC_DEFAULT', label: 'Nama PIC kantor', full: true }, { name: 'MNF_CATATAN_DEFAULT', label: 'Catatan (1 baris = 1 poin)', type: 'textarea', rows: 3, full: true }], S) + '<button class="btn btn--ghost btn--sm" data-act="default" data-g="manifest" style="width:max-content">' + ic('rotate-ccw', 16) + 'Kembalikan pengaturan manifest bawaan</button>', { ikon: 'pencil-line' }) +
      '</div><aside class="mf-samping mf-samping--gulir"><div class="card card--pad0 kertas-panel"><div class="kertas-panel__h"><b>Pratinjau manifest</b><small class="muted">dari manifest terakhir</small></div><div id="pg-kertas" class="kertas-tumpuk">' + UI.kerangka(5, 3) + '</div></div></aside></div>';
  }
  var token = 0;
  async function pratinjauKertas(el) {
    var box = el.querySelector('#pg-kertas'); if (!box) return;
    var t = ++token, S = draftS(), k;
    if (st.tab === 'invoice') k = await Dok.tataInvoice(contohInvoice(S), S);
    else { var m = contohManifest(S); if (!m) { box.innerHTML = UI.kosong('clipboard-list', 'Belum ada pesanan untuk contoh'); return; } k = await Dok.tataManifest(m, S); }
    if (t !== token || !box.isConnected) return;
    Dok.panelHalaman(box, k, { judul: st.tab === 'invoice' ? 'Contoh invoice' : 'Contoh manifest', nama: st.tab === 'invoice' ? 'Contoh_Invoice' : 'Contoh_Manifest', sub: 'Pratinjau pengaturan yang belum disimpan' });
  }
  var pratinjauNanti = C.debounce(pratinjauKertas, 350);

  // ---------------------------------------------------------------- 5. label rekap
  function tabRekap() {
    var simpan = U.parseJson(draftS().REKAP_LABEL, {}) || {}, L = HT.labelRekap(draftS());
    return '<div class="note" style="margin-bottom:16px">' + ic('info') + '<span>Label tabel rekap (aplikasi, Excel, PDF, Google Sheet). Rekap tampil dengan judul di atas, lalu satu tabel per tab master data. HPP, PJ, Insentif, RATAAN dan lainnya bebas diubah. Kosongkan untuk memakai label template.</span></div>' +
      '<div class="grid-12" style="align-items:start;margin-bottom:16px">' + kartu('Judul rekap', 'Tampil paling atas (baris pertama tab rekap).', '<div class="form"><div class="field field--full"><label for="rl-judul">Judul</label><input class="input" id="rl-judul" data-rlj value="' + esc(simpan.JUDUL != null ? simpan.JUDUL : (simpan.YB && simpan.YB.JUDUL) || '') + '" placeholder="YUKBANYUWANGI"></div></div>', { ikon: 'heading', cls: 'span-6 span-lg-12' }) + '</div>' +
      '<div class="grid-12" style="align-items:start">' + ['YB', 'SB'].map(function (b) {
      var s = simpan[b] || {}, def = YX.REKAP_LABEL_DEFAULT[b];
      return kartu(b === 'YB' ? 'Kolom tipe YB (YukBanyuwangi)' : 'Kolom tipe SB (Sunrise Boat)', 'Dipakai tab dengan kolom rekap ' + b + ' (atur di Sumber data).', '<div class="form">' + Object.keys(def).filter(function (k) { return k !== 'JUDUL' || b === 'SB'; }).map(function (k) { return '<div class="field"><label>' + esc(k === 'JUDUL' ? 'Nama kelompok (laba rugi)' : LABEL_REKAP[k] || k) + '</label><input class="input" data-rl="' + b + '" data-k="' + k + '" value="' + esc(s[k] != null ? s[k] : '') + '" placeholder="' + esc(def[k] || '(kosong)') + '"></div>'; }).join('') + '</div>' +
        '<h3 class="form-sub">Kolom pengeluaran (HPP)</h3><div class="form">' + YX.REKAP_KOLOM[b].map(function (k) { return '<div class="field"><label class="mono soft">' + k[0] + '</label><input class="input" data-rl="' + b + '" data-k="' + k[0] + '" value="' + esc(s[k[0]] != null ? s[k[0]] : '') + '" placeholder="' + esc(k[1]) + '"></div>'; }).join('') + '</div>' +
        '<div class="rk-contoh"><span class="label">Hasil</span><div>' + [L[b].L.KODE, L[b].L.QTY, L[b].L.PENJUALAN].concat(L[b].kolom.map(function (k) { return k.l; })).concat([L[b].L.PENGELUARAN, L[b].L.LABA, L[b].L.RATAAN_A]).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div></div>', { cls: 'span-6 span-lg-12' });
    }).join('') + '</div><button class="btn btn--ghost btn--sm" data-act="default" data-g="rekap" style="margin-top:12px">' + ic('rotate-ccw', 16) + 'Kembalikan label template</button>';
  }

  // ---------------------------------------------------------------- 5b. halaman masuk (slideshow)
  function slideDraft() {
    var l = U.parseJson(draftS().LOGIN_SLIDE, null);
    if (!Array.isArray(l) || !l.length) l = YX.LOGIN_SLIDE_DEFAULT.map(function (x) { return Object.assign({}, x); });
    return l;
  }
  function tabMasuk() {
    var S = draftS(), l = slideDraft();
    return '<div class="grid-12" style="align-items:start">' +
      kartu('Gambar & tulisan slide', 'Gambar tampil bergantian di kiri halaman masuk (maks. 8). Tulisan tiap gambar bisa berbeda. Pakai foto lanskap/potret ≥ 1600 px — diperkecil otomatis sebelum diunggah.',
        '<div class="stack" style="gap:12px" id="pg-slide">' + l.map(function (x, i) {
          return '<div class="slide-baris" data-si="' + i + '"><div class="slide-baris__img">' + (x.img ? '<img src="' + esc(x.img) + '" alt="Gambar slide ' + (i + 1) + '" loading="lazy">' : '<span class="muted">' + ic('image', 22) + '</span>') + '<span class="slide-baris__no">' + (i + 1) + '</span></div>' +
            '<div class="slide-baris__isi"><input class="input" data-slide="judul" value="' + esc(x.judul || '') + '" maxlength="140" placeholder="Judul besar, mis. Dari pesanan sampai margin, satu alur." aria-label="Judul slide ' + (i + 1) + '"><textarea class="textarea" rows="3" data-slide="sub" maxlength="300" placeholder="Kalimat pendukung" aria-label="Kalimat slide ' + (i + 1) + '">' + esc(x.sub || '') + '</textarea>' +
            '<div class="row wrap" style="gap:6px"><button class="btn btn--soft btn--sm" data-act="slideGambar" data-i="' + i + '">' + ic('upload', 15) + 'Ganti gambar</button><button class="icon-btn" data-act="slideGeser" data-i="' + i + '" data-d="-1" aria-label="Geser ke atas"' + (i === 0 ? ' disabled' : '') + '>' + ic('arrow-up', 16) + '</button><button class="icon-btn" data-act="slideGeser" data-i="' + i + '" data-d="1" aria-label="Geser ke bawah"' + (i === l.length - 1 ? ' disabled' : '') + '>' + ic('arrow-down', 16) + '</button>' + (l.length > 1 ? '<button class="btn btn--plain btn--sm" data-act="slideHapus" data-i="' + i + '">' + ic('trash-2', 15) + 'Hapus</button>' : '') + '</div></div></div>';
        }).join('') + '</div>' + (l.length < 8 ? '<button class="btn btn--soft btn--sm" data-act="slideTambah" style="width:max-content">' + ic('plus', 16) + 'Tambah gambar</button>' : ''), { ikon: 'images', cls: 'span-7 span-lg-12' }) +
      '<div class="span-5 span-lg-12 stack" style="gap:16px">' +
      kartu('Pratinjau', 'Berubah langsung saat Anda mengetik.', '<div class="pm" id="pg-pm" aria-hidden="true"></div>', { ikon: 'eye' }) +
      kartu('Tayangan & kartu masuk', '', UI.form([{ name: 'LOGIN_INTERVAL', label: 'Lama tiap gambar (detik)', type: 'number', attr: ' min="3" max="30"' }, { name: 'LOGIN_ANIMASI', label: 'Gerakan gambar', type: 'select', opsi: [{ v: 'YA', l: 'Bergerak pelan (zoom & geser)' }, { v: 'TIDAK', l: 'Diam (hanya berganti)' }] },
        { name: 'LOGIN_KARTU_JUDUL', label: 'Judul kartu masuk', full: true }, { name: 'LOGIN_KARTU_SUB', label: 'Kalimat di bawah judul', full: true },
        { name: 'LOGIN_TAUTAN_LABEL', label: 'Teks tautan pojok' }, { name: 'LOGIN_TAUTAN_URL', label: 'Alamat tautan', type: 'url', ph: S.PT_WEB ? 'https://' + S.PT_WEB : 'https://…', help: 'Kosong = website perusahaan (bila diisi), atau tautan disembunyikan.' },
        { name: 'LOGIN_BANTUAN', label: 'Teks bantuan di bawah tombol Masuk', full: true }], S) +
        '<button class="btn btn--ghost btn--sm" data-act="default" data-g="masuk" style="width:max-content">' + ic('rotate-ccw', 16) + 'Kembalikan bawaan</button>', { ikon: 'log-in' }) + '</div></div>';
  }
  function pratinjauMasuk(el) {
    var box = el.querySelector('#pg-pm'); if (!box) return;
    var S = draftS(), l = slideDraft(), i = Math.min(+(box.dataset.i || 0), l.length - 1), det = Math.max(3, Math.min(30, Number(S.LOGIN_INTERVAL) || 6));
    box.innerHTML = l.map(function (x, j) { return '<div class="pm__img' + (j === i ? ' on' : '') + (S.LOGIN_ANIMASI === 'TIDAK' ? '' : ' gerak') + '"><img src="' + esc(x.img) + '" alt=""></div>'; }).join('') +
      '<div class="pm__redup"></div><div class="pm__teks"><b></b><span></span><i class="pm__titik">' + l.map(function () { return '<em></em>'; }).join('') + '</i></div><div class="pm__kartu"><b>' + esc(S.LOGIN_KARTU_JUDUL || '') + '</b><span></span><span></span><i></i></div>';
    function tampil(j) {
      i = (j + l.length) % l.length; box.dataset.i = i;
      box.querySelectorAll('.pm__img').forEach(function (g, x) { g.classList.toggle('on', x === i); });
      box.querySelector('.pm__teks b').textContent = l[i].judul || ''; box.querySelector('.pm__teks > span').textContent = l[i].sub || '';
      box.querySelectorAll('.pm__titik em').forEach(function (e, x) { e.classList.toggle('on', x === i); });
    }
    tampil(i); clearInterval(st.pmT); st.pmT = setInterval(function () { if (!box.isConnected) { clearInterval(st.pmT); return; } tampil(i + 1); }, det * 1000);
  }
  var pratinjauMasukNanti = C.debounce(pratinjauMasuk, 250);

  // ---------------------------------------------------------------- 5c. WhatsApp Business API & Qontak
  var NAMA_VAR = { nama: 'Nama', noInvoice: 'No. invoice', trip: 'Trip', tglTrip: 'Tanggal trip', total: 'Total', sisa: 'Sisa', link: 'Link', perusahaan: 'Perusahaan', rekening: 'Rekening', jatuhTempo: 'Jatuh tempo', nominal: 'Nominal', tamu: 'Nama tamu', pax: 'Pax', oleh: 'Oleh', penjualan: 'Penjualan', pengeluaran: 'Pengeluaran', margin: 'Margin', lebih: 'Info over budget', keputusan: 'Keputusan', catatan: 'Catatan', app: 'Nama aplikasi', pesan: 'Isi pesan blast' };
  function daftarEvent() { return Object.keys(YX.NOTIF_EVENTS).map(function (k) { return { kode: k, label: YX.NOTIF_EVENTS[k].label, target: YX.NOTIF_EVENTS[k].target }; }).concat([{ kode: 'BLAST', label: 'Blast WhatsApp', target: 'Kontak (menu WhatsApp & CRM)' }]); }
  function kunciRahasia(k, label, help) {
    var r = (Store.info.rahasia || {})[k] || {};
    return '<div class="field field--full"><label for="rh-' + k + '"><span>' + esc(label) + '</span>' + (r.ada ? '<span class="badge ok" style="height:20px">' + ic('lock', 12) + 'Tersimpan</span>' : '<span class="badge neutral" style="height:20px">Belum diisi</span>') + '</label>' +
      '<div class="row rh-baris" style="gap:8px"><input class="input mono grow" id="rh-' + k + '" type="password" autocomplete="off" spellcheck="false" placeholder="' + esc(r.ada ? r.samar + ' — tempel nilai baru untuk mengganti' : 'Tempel di sini') + '"><button class="btn btn--soft" data-act="rahasia" data-k="' + k + '">' + ic('save', 16) + 'Simpan</button>' + (r.ada ? '<button class="btn btn--plain btn--sm" data-act="rahasiaHapus" data-k="' + k + '">Hapus</button>' : '') + '</div>' +
      '<div class="help">' + (help || '') + ' Disimpan di Script Properties — tidak pernah dikirim balik ke browser.</div></div>';
  }
  function barisTemplate(e, pv, tp) {
    var t = tp[e.kode] || {}, par = Array.isArray(t.param) ? t.param : [], vars = HT.varsEvent(e.kode), kunci = pv === 'qontak' ? 'id' : 'nama';
    return '<div class="tpl-baris" data-kode="' + e.kode + '"><div class="tpl-baris__info"><b>' + esc(e.label) + '</b><small class="muted">' + esc(e.target) + '</small></div>' +
      '<div class="tpl-baris__isi"><input class="input mono" data-tpl="' + kunci + '" list="pg-tpl-daftar" value="' + esc(t[kunci] || '') + '" placeholder="' + (pv === 'qontak' ? 'ID template Qontak' : 'Nama template Meta') + '" aria-label="Template ' + esc(e.label) + '">' +
      '<select class="select" data-tpl="bahasa" aria-label="Bahasa template">' + ['id', 'en', 'en_US'].map(function (b) { return '<option' + ((t.bahasa || 'id') === b ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select>' +
      (e.kode === 'INVOICE_TERBIT' ? '<label class="switch" title="Template punya header Dokumen"><input type="checkbox" data-tpl="dokumen"' + (t.dokumen ? ' checked' : '') + '><span class="track"></span><span>Lampirkan PDF invoice</span></label>' : '') + '<span class="tpl-cocok" data-cocok></span></div>' +
      '<div class="tpl-baris__var"><span class="label">Variabel berurutan</span><div class="chips">' + par.map(function (v, j) { return '<button class="chip on" data-act="tplVar" data-v="' + v + '" title="Hapus dari daftar">{{' + (j + 1) + '}} ' + esc(NAMA_VAR[v] || v) + ic('x', 13) + '</button>'; }).join('') +
      vars.filter(function (v) { return par.indexOf(v) < 0; }).map(function (v) { return '<button class="chip chip--tambah" data-act="tplVar" data-v="' + v + '">' + ic('plus', 13) + esc(NAMA_VAR[v] || v) + '</button>'; }).join('') + '</div></div></div>';
  }
  function cocokTemplate(el, kode) {
    var row = el.querySelector('[data-kode="' + kode + '"]'); if (!row || !st.tpl) return; var c = row.querySelector('[data-cocok]'); if (!c) return;
    var tp = U.parseJson(draftS().WA_TEMPLATE, {}) || {}, t = tp[kode] || {}, nm = st.tpl.penyedia === 'qontak' ? t.id : t.nama, x = st.tpl.daftar.find(function (d) { return String(d.id) === String(nm) || d.nama === nm; });
    var n = (t.param || []).length;
    c.className = 'tpl-cocok ' + (!nm ? '' : !x ? 'warn' : x.param !== n ? 'warn' : 'ok');
    c.textContent = !nm ? '' : !x ? 'Tidak ada di daftar template' : x.param !== n ? 'Template punya ' + x.param + ' variabel, terpilih ' + n : (x.status || 'cocok') + ' · ' + x.param + ' variabel';
  }
  function waSiapLokal(S) {
    var r = Store.info.rahasia || {}, ada = function (k) { return !!(r[k] && r[k].ada); }, pv = S.WA_PENYEDIA || 'fonnte';
    return pv === 'meta' ? ada('META_TOKEN') && !!S.META_PHONE_ID : pv === 'qontak' ? ada('MEKARI_CLIENT_ID') && ada('MEKARI_CLIENT_SECRET') && !!S.QONTAK_CHANNEL_ID : ada('FONNTE_TOKEN');
  }
  function statusKontak() {
    var k = Store.D.CRM_Kontak.filter(function (x) { return x.Segmen === 'Tamu' && x.Sumber === 'pesanan'; });
    return { total: k.length, ok: k.filter(function (x) { return x.Qontak_ID && x.Qontak_Hash; }).length, gagal: k.filter(function (x) { return /^Gagal/.test(x.Qontak_Pesan || ''); }).length };
  }
  function tabWa() {
    var S = draftS(), pv = YX.WA_PENYEDIA.indexOf(S.WA_PENYEDIA) > -1 ? S.WA_PENYEDIA : 'fonnte', tp = U.parseJson(S.WA_TEMPLATE, {}) || {}, berubah = S.WA_PENYEDIA !== Store.S.WA_PENYEDIA;
    var opsi = [['fonnte', 'smartphone', 'Fonnte', 'WhatsApp lewat perangkat terhubung. Pesan teks bebas — tanpa template.'], ['meta', 'badge-check', 'Meta Cloud API', 'WhatsApp Business API resmi langsung dari Meta. Pesan pakai template yang disetujui.'], ['qontak', 'message-square-text', 'Qontak (Mekari)', 'WhatsApp Business API resmi yang tersambung di Qontak. Pesan pakai template Qontak.']];
    var kartuPenyedia = kartu('Penyedia WhatsApp', 'Dipakai untuk semua notifikasi WhatsApp (invoice, pengingat tagihan, Tim Lapang) dan blast. Simpan perubahan agar berlaku.',
      '<div class="pilih-kartu" role="radiogroup" aria-label="Penyedia WhatsApp">' + opsi.map(function (o) { return '<label class="pilih-kartu__opsi' + (pv === o[0] ? ' on' : '') + '"><input type="radio" name="WA_PENYEDIA" value="' + o[0] + '"' + (pv === o[0] ? ' checked' : '') + '><span class="ic-box">' + ic(o[1]) + '</span><span class="row__text"><b>' + o[2] + '</b><small class="muted">' + o[3] + '</small></span>' + (Store.S.WA_PENYEDIA === o[0] ? '<span class="badge ok" style="height:20px">Aktif</span>' : '') + '</label>'; }).join('') + '</div>' +
      (berubah ? '<div class="note warn">' + ic('pencil') + '<span>Penyedia diganti — klik <b>Simpan perubahan</b> di atas agar berlaku.</span></div>' : ''), { ikon: 'message-circle', cls: 'span-12' });
    var detail;
    if (pv === 'fonnte') detail = kartu('Fonnte', '', kunciRahasia('FONNTE_TOKEN', 'Token Fonnte', 'Dari fonnte.com → Device → Token.') + '<div class="row wrap" style="gap:8px"><button class="btn btn--ghost btn--sm" data-act="waCek">' + ic('plug-zap', 16) + 'Cek perangkat</button><button class="btn btn--ghost btn--sm" data-act="waTes">' + ic('send', 16) + 'Kirim tes</button></div><div id="pg-wa-status"></div>', { ikon: 'smartphone', cls: 'span-7 span-lg-12' });
    else if (pv === 'meta') detail = kartu('Meta Cloud API', 'Dari Meta Business → WhatsApp Manager / developers.facebook.com → aplikasi Anda → WhatsApp → API Setup.',
      kunciRahasia('META_TOKEN', 'Token akses permanen (System User)', 'Buat System User di Business Settings, beri akses WhatsApp, lalu buat token permanen.') +
      UI.form([{ name: 'META_PHONE_ID', label: 'Phone number ID', ph: 'Mis. 1234567890123', attr: ' inputmode="numeric"' }, { name: 'META_WABA_ID', label: 'WhatsApp Business Account ID', ph: 'Untuk memuat daftar template', attr: ' inputmode="numeric"' }, { name: 'META_VERSI', label: 'Versi Graph API', ph: 'v23.0' }, { name: 'WA_NOMOR_BISNIS', label: 'Nomor WhatsApp Business (tampilan)', type: 'tel' }], S) +
      '<div class="row wrap" style="gap:8px"><button class="btn btn--ghost btn--sm" data-act="waCek">' + ic('plug-zap', 16) + 'Cek koneksi</button><button class="btn btn--ghost btn--sm" data-act="waTes">' + ic('send', 16) + 'Kirim tes template</button></div><div id="pg-wa-status"></div>', { ikon: 'badge-check', cls: 'span-7 span-lg-12' });
    else detail = kartu('Qontak (Mekari)', 'Buat aplikasi HMAC di developers.mekari.com dengan akun Admin Qontak (akses qontak-chat & qontak-crm) → salin Client ID & Client Secret.',
      kunciRahasia('MEKARI_CLIENT_ID', 'Client ID Mekari', '') + kunciRahasia('MEKARI_CLIENT_SECRET', 'Client Secret Mekari', '') +
      UI.form([{ name: 'QONTAK_CHANNEL_ID', label: 'Nomor WhatsApp di Qontak (channel_integration_id)', full: true, ph: 'Klik "Muat nomor dari Qontak"', labelKanan: '<button class="link-btn" data-act="kanalMuat" type="button">Muat nomor dari Qontak</button>' }, { name: 'WA_NOMOR_BISNIS', label: 'Nomor WhatsApp Business (tampilan)', type: 'tel' }, { name: 'QONTAK_URL_CHAT', label: 'Alamat API Qontak Chat', type: 'url', help: 'Bawaan Mekari: https://api.mekari.com/qontak/chat/v1' }], S) +
      (st.kanal ? '<div class="chips">' + st.kanal.map(function (k) { return '<button class="chip' + (String(S.QONTAK_CHANNEL_ID) === String(k.id) ? ' on' : '') + '" data-act="kanalPilih" data-id="' + esc(k.id) + '">' + ic('smartphone', 14) + esc(k.nama) + '<span class="n">' + esc(k.status) + '</span></button>'; }).join('') + '</div>' : '') +
      '<div class="row wrap" style="gap:8px"><button class="btn btn--ghost btn--sm" data-act="waCek">' + ic('plug-zap', 16) + 'Cek koneksi</button><button class="btn btn--ghost btn--sm" data-act="waTes">' + ic('send', 16) + 'Kirim tes template</button></div><div id="pg-wa-status"></div>', { ikon: 'message-square-text', cls: 'span-7 span-lg-12' });
    var cadangan = kartu('Cadangan & catatan', '', UI.form([{ name: 'WA_CADANGAN', label: 'Bila template belum diatur', type: 'select', full: true, opsi: [{ v: 'YA', l: 'Kirim teks biasa lewat Fonnte (bila token Fonnte ada)' }, { v: 'TIDAK', l: 'Jangan kirim — tandai gagal di antrean' }] }], S) +
      '<ul class="daftar-catatan"><li>WhatsApp Business API hanya boleh <b>memulai</b> percakapan dengan <b>template yang disetujui</b>. Buat template di ' + (pv === 'qontak' ? 'Qontak → WhatsApp Template' : 'WhatsApp Manager → Message templates') + ', lalu pasangkan di tabel bawah.</li><li>Isi variabel tidak boleh berisi baris baru — aplikasi menggantinya dengan " · " otomatis.</li><li>Notifikasi WA dinyalakan/dimatikan dari menu <a href="#/wa/konfig">WhatsApp & CRM → Konfigurasi</a>.</li></ul>', { ikon: 'info', cls: 'span-5 span-lg-12' });
    var tabelTpl = pv === 'fonnte' ? '' : '<section class="card span-12 card--pad0"><div class="between wrap" style="padding:16px 20px;gap:12px"><div class="card__title"><h2>' + ic('list-plus', 22, 'primary') + 'Template per jenis pesan</h2><p>Pilih template dan urutan variabelnya ({{1}}, {{2}}, …) sesuai isi template di ' + (pv === 'qontak' ? 'Qontak' : 'Meta') + '.</p></div><button class="btn btn--soft" data-act="tplMuat">' + ic('refresh-cw', 16) + 'Muat daftar template</button></div>' +
      (st.tpl ? '<datalist id="pg-tpl-daftar">' + st.tpl.daftar.map(function (d) { return '<option value="' + esc(pv === 'qontak' ? d.id : d.nama) + '">' + esc(d.nama + ' · ' + (d.bahasa || '') + ' · ' + d.param + ' variabel · ' + (d.status || '')) + '</option>'; }).join('') + '</datalist>' : '') +
      '<div class="tpl-daftar">' + daftarEvent().map(function (e) { return barisTemplate(e, pv, tp); }).join('') + '</div></section>';
    var sk = statusKontak(), qAktif = S.QONTAK_KONTAK_AKTIF === 'YA', peta = U.parseJson(S.QONTAK_PETA, null) || {};
    var kontak = kartu('Qontak CRM — kontak pemesan', 'Setiap pemesan di Database Pemesanan dibuat/diperbarui sebagai Kontak di Qontak CRM (satu kontak per nomor HP).',
      UI.form([{ name: 'QONTAK_KONTAK_AKTIF', label: 'Sinkron kontak ke Qontak', type: 'switch', teks: qAktif ? 'Aktif' : 'Nonaktif' }, { name: 'QONTAK_KONTAK_OTOMATIS', label: 'Saat pesanan baru/berubah', type: 'switch', teks: 'Kirim otomatis' }], S) +
      (pv !== 'qontak' ? '<div class="form">' + kunciRahasia('MEKARI_CLIENT_ID', 'Client ID Mekari', '') + kunciRahasia('MEKARI_CLIENT_SECRET', 'Client Secret Mekari', '') + '</div>' : '') +
      UI.form([{ name: 'QONTAK_URL_KONTAK', label: 'Alamat API Kontak Qontak CRM', type: 'url', full: true, help: 'Bawaan Mekari: https://api.mekari.com/qontak/crm/v3.1/contacts — sesuaikan bila dokumentasi Qontak Anda berbeda.' }, { name: 'QONTAK_HP_FORMAT', label: 'Format nomor HP', type: 'select', opsi: [{ v: '62', l: '628123… (internasional)' }, { v: '08', l: '08123…' }, { v: '+62', l: '+628123…' }] }], S) +
      '<div class="field"><label>Isi kontak: kolom Qontak ← data pemesan</label><div class="stack" style="gap:8px">' + Object.keys(peta).map(function (k) { return '<div class="qp-baris" data-qp><input class="input mono" data-qpk value="' + esc(k) + '" placeholder="nama_kolom" aria-label="Nama kolom Qontak"><span class="muted">←</span><select class="select" data-qpv aria-label="Data pemesan">' + Object.keys(YX.QONTAK_SUMBER).map(function (x) { return '<option value="' + x + '"' + (peta[k] === x ? ' selected' : '') + '>' + esc(YX.QONTAK_SUMBER[x]) + '</option>'; }).join('') + '</select><button class="icon-btn" data-act="qpHapus" aria-label="Hapus kolom">' + ic('x', 18) + '</button></div>'; }).join('') +
      '</div><button class="btn btn--plain btn--sm" data-act="qpTambah" style="width:max-content;margin-top:6px">' + ic('plus', 15) + 'Tambah kolom</button><div class="help">Nama kolom mengikuti API Qontak CRM (mis. first_name, telephone, email, city).</div></div>' +
      '<div class="qk-status"><div><b class="num">' + sk.total + '</b><small>kontak pemesan</small></div><div><b class="num ok">' + sk.ok + '</b><small>tersinkron</small></div><div><b class="num ' + (sk.gagal ? 'danger' : '') + '">' + sk.gagal + '</b><small>gagal</small></div></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn btn--ghost btn--sm" data-act="qTes">' + ic('plug-zap', 16) + 'Tes koneksi CRM</button><button class="btn btn--soft btn--sm" data-act="qSinkron"' + (Store.S.QONTAK_KONTAK_AKTIF === 'YA' ? '' : ' disabled title="Aktifkan & simpan dulu"') + '>' + ic('refresh-cw', 16) + 'Sinkron sekarang</button><button class="btn btn--plain btn--sm" data-act="qUlang"' + (Store.S.QONTAK_KONTAK_AKTIF === 'YA' ? '' : ' disabled') + '>Kirim ulang semua</button></div><div id="pg-q-status"></div>', { ikon: 'contact', cls: 'span-12' });
    return '<div class="grid-12" style="align-items:start">' + kartuPenyedia + detail + cadangan + tabelTpl + kontak + '</div>';
  }

  // ---------------------------------------------------------------- 6. akses
  function tabAkses() {
    var a = U.parseJson(draftS().AKSES_MENU, {}) || {};
    return '<div class="grid-12" style="align-items:start">' + kartu('Siapa boleh membuka menu', 'Berlaku langsung setelah disimpan. Aksi tulis tetap dibatasi peran (dicek di server).', '<div class="stack" style="gap:8px">' + Object.keys(YX.MENU_DIATUR).map(function (m) {
      var l = Array.isArray(a[m]) ? a[m] : ['Admin', 'Finance'];
      return '<div class="akses-baris"><b>' + esc(YX.MENU_DIATUR[m]) + '</b><div class="row" style="gap:14px">' + ['Admin', 'Finance'].map(function (p) { return '<label class="check" style="min-height:36px"><input type="checkbox" data-akses="' + m + '" value="' + p + '"' + (l.indexOf(p) > -1 ? ' checked' : '') + '>' + p + '</label>'; }).join('') + '</div></div>';
    }).join('') + '</div>', { ikon: 'shield-check', cls: 'span-6 span-lg-12' }) +
      kartu('Hak tetap per peran', 'Tidak bisa diubah — menjaga pemisahan tugas.', [['Data pemesanan', 'Tambah · ubah · hapus', 'Lihat'], ['Kalkulasi & manifest', 'Susun · terbitkan', '—'], ['Undang Tim Lapang', 'Ya', '—'], ['Invoice', 'Buat · terbitkan · batal', 'Lihat · kirim'], ['Rekap', 'Lengkapi · ajukan', 'Kunci · buka kunci'], ['Pembayaran & pengingat', 'Lihat', 'Catat · kirim'], ['Biaya operasional', 'Lihat', 'Catat'], ['Pengaturan & WhatsApp', 'Penuh', '—']].map(function (r) { return '<div class="akses-baris"><span>' + r[0] + '</span><span class="row" style="gap:6px"><span class="badge" title="Admin">' + r[1] + '</span><span class="badge accent" title="Finance">' + r[2] + '</span></span></div>'; }).join('') + '<div class="legend"><span><i style="background:var(--c-primary-tint-2)"></i>Admin</span><span><i style="background:var(--c-accent)"></i>Finance</span></div>', { ikon: 'users-round', cls: 'span-6 span-lg-12' }) + '</div>';
  }

  // ---------------------------------------------------------------- 7. pengguna
  function tabPengguna() {
    var D = Store.D, kelola = Store.me.pengelola === 'YA';
    return (kelola ? '' : '<div class="note warn" style="margin-bottom:16px">' + ic('lock') + '<span>Hanya akun pengelola yang dapat menambah pengguna, mengubah peran, atau mereset PIN.</span></div>') +
      '<div class="card card--pad0"><div class="between wrap" style="padding:16px 20px"><div class="card__title"><h2>' + ic('users-round', 22, 'primary') + 'Pengguna aplikasi</h2><p>' + D.Pengguna.filter(function (u) { return u.Status === 'Aktif'; }).length + ' dari 5 akun aktif · masuk dengan email + PIN 6 angka.</p></div>' + (kelola ? '<button class="btn btn--primary" data-act="userBaru">' + ic('user-plus', 18) + 'Tambah pengguna</button>' : '') + '</div>' +
      UI.tabel({ baris: D.Pengguna, kolom: [{ label: 'Pengguna', render: function (u) { return '<div class="cell-main">' + UI.avatar(u.Nama, u.Foto_URL) + '<div class="row__text"><b class="truncate">' + esc(u.Nama) + (u.ID_Pengguna === Store.me.id ? ' <span class="badge" style="height:18px">Anda</span>' : '') + '</b><span class="sub truncate">' + esc(u.Email) + '</span></div></div>'; } }, { label: 'Peran', render: function (u) { return '<span class="badge ' + (u.Peran === 'Admin' ? '' : 'accent') + '">' + esc(u.Peran) + '</span>' + (u.Pengelola === 'YA' ? ' <span class="badge ink" style="height:20px">Pengelola</span>' : ''); } }, { label: 'WhatsApp', render: function (u) { return esc(u.No_WA || '—'); } }, { label: 'Masuk terakhir', render: function (u) { return F.relatif(u.Terakhir_Login); } }, { label: 'Status', render: function (u) { return UI.badge(u.Status); } }, { label: '', mlabel: '', render: function (u) { return kelola ? '<button class="btn btn--ghost btn--sm" data-act="userEdit" data-id="' + u.ID_Pengguna + '">' + ic('pencil', 15) + 'Ubah</button> <button class="btn btn--soft btn--sm" data-act="userPin" data-id="' + u.ID_Pengguna + '">' + ic('key-round', 15) + 'Reset PIN</button>' : ''; } }] }) + '</div>';
  }
  function formUser(u) {
    u = u || { Peran: 'Admin', Status: 'Aktif', Pengelola: 'TIDAK' };
    UI.modal({ judul: u.ID_Pengguna ? 'Ubah pengguna' : 'Tambah pengguna', sub: u.ID_Pengguna ? '' : 'PIN awal dibuat acak & tampil sekali.',
      isi: UI.form([{ name: 'Nama', label: 'Nama', wajib: true, full: true }, { name: 'Email', label: 'Email login', type: 'email', wajib: true }, { name: 'No_WA', label: 'No. WhatsApp (notifikasi tim)', type: 'tel' }, { name: 'Peran', label: 'Peran', type: 'select', opsi: ['Admin', 'Finance'] }, { name: 'Status', label: 'Status', type: 'select', opsi: ['Aktif', 'Nonaktif'] }, { name: 'Pengelola', label: 'Pengelola pengguna', type: 'switch', teks: 'Boleh mengelola akun lain', full: true }], Object.assign({}, u, { Pengelola: u.Pengelola === 'YA' })),
      aksi: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'btn--primary', klik: async function (h, b) { if (!UI.cekWajib(h.body)) return false; var v = UI.bacaForm(h.body); v.Pengelola = v.Pengelola ? 'YA' : 'TIDAK'; v.ID_Pengguna = u.ID_Pengguna || ''; var r = await C.aksi('pengguna.simpan', v, { btn: b, diam: true }); if (r.success && r.data.pin) tampilPin(v.Nama, r.data.pin); else UI.toast(r.message, r.success ? 'ok' : 'err'); return r.success; } }] });
  }
  function tampilPin(nama, pin) { UI.modal({ judul: 'PIN awal ' + nama, ukuran: 'sm', isi: '<div class="stack" style="align-items:center;gap:12px;text-align:center"><span class="ic-box" style="width:56px;height:56px">' + ic('key-round', 28) + '</span><div class="mono" style="font-size:36px;font-weight:800;letter-spacing:.3em">' + esc(pin) + '</div><p class="muted">Berikan langsung ke pengguna. PIN ini hanya tampil sekali — minta segera diganti lewat menu Profil.</p></div>', aksi: [{ label: 'Salin PIN', ikon: 'copy', tutup: false, klik: function () { try { navigator.clipboard.writeText(pin).then(function () { UI.toast('PIN disalin.', 'ok'); }); } catch (e) { UI.toast('Salin manual: ' + pin, 'info'); } } }, { label: 'Selesai', kelas: 'btn--primary' }] }); }

  // ---------------------------------------------------------------- 8. sistem
  function tabSistem() {
    var i = Store.info.integrasi || {}, S = draftS();
    var k = [['sumber', 'table-2', 'Database Pemesanan'], ['rekap', 'chart-column', 'File Rekapitulasi'], ['sheets', 'database', 'Database aplikasi'], ['drive', 'folder-open', 'Google Drive'], ['calendar', 'calendar-check', 'Google Calendar'], ['gmail', 'mail', 'Gmail'], ['wa', 'message-circle', 'WhatsApp'], ['qontak', 'contact', 'Qontak CRM']].map(function (x) { var s = i[x[0]] || (x[0] === 'wa' ? i.fonnte : null), t = s ? (s.mati ? 'neutral' : s.ok ? 'ok' : 'warn') : ''; return '<div class="card card--tight stack" style="gap:8px"><div class="between"><span class="ic-box ' + t + '">' + ic(x[1]) + '</span>' + (s ? '<span class="badge ' + t + '">' + (s.mati ? 'Nonaktif' : s.ok ? 'Terhubung' : 'Periksa') + '</span>' : '<span class="badge neutral">' + UI.putar(12) + 'Memeriksa</span>') + '</div><b>' + x[2] + '</b><small class="muted">' + esc(s ? s.info : '…') + '</small></div>'; }).join('');
    return '<div class="bento" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">' + k + '</div>' +
      '<div class="grid-12" style="margin-top:16px;align-items:start">' + kartu('Google Calendar', 'Satu event seharian per nama tamu.', UI.form([{ name: 'CAL_NAMA', label: 'Nama kalender', full: true }], S) + '<div class="row wrap" style="gap:8px"><a class="btn btn--ghost btn--sm" href="#/kalender">' + ic('calendar-days', 16) + 'Buka kalender</a></div>', { ikon: 'calendar-check', cls: 'span-6 span-lg-12' }) +
      kartu(C.DEMO ? 'Data demo' : 'Keamanan', C.DEMO ? 'Semua data contoh tersimpan di perangkat ini.' : 'Rahasia (token, ID file, secret sesi) disimpan di Script Properties — tidak di kode, Sheets, atau browser.',
        C.DEMO ? '<button class="btn btn--danger-ghost" data-act="resetDemo" style="width:max-content">' + ic('rotate-ccw', 18) + 'Reset data demo</button><div class="note">' + ic('info') + '<span>Untuk data asli: pasang backend Apps Script lalu isi <span class="mono">GAS_URL</span> di <span class="mono">js/config.js</span>.</span></div>'
          : ['SESSION_SECRET · PIN_PEPPER', 'SUMBER_PESANAN_ID · SUMBER_REKAP_ID', 'SPREADSHEET_ID · FOLDER_* · CALENDAR_ID', 'FONNTE_TOKEN · META_TOKEN', 'MEKARI_CLIENT_ID · MEKARI_CLIENT_SECRET'].map(function (x) { return '<div class="between" style="padding:6px 0;border-bottom:1px solid var(--c-border)"><span class="mono">' + x + '</span>' + ic('lock', 15, 'muted') + '</div>'; }).join(''), { ikon: C.DEMO ? 'sparkles' : 'key-round', cls: 'span-6 span-lg-12' }) + '</div><p class="muted center" style="margin-top:16px">YukBanyuwangi v' + YX.VERSI + '</p>';
  }

  // ---------------------------------------------------------------- halaman
  var H = window.Halaman.pengaturan = {
    render: function (el, args) {
      if (!Hal.hanyaAdmin()) return;
      st.tab = args[0] && TABS.some(function (t) { return t[0] === args[0]; }) ? args[0] : st.tab; st.draft = null;
      el.innerHTML = Hal.kepala({ judul: 'Pengaturan', sub: 'Semua yang tampil ke klien & Tim Lapang diatur di sini — tanpa menyentuh kode.', aksi: '<span class="badge warn" id="pg-ubah" style="display:none">' + ic('pencil', 14) + 'Ada perubahan</span><button class="btn btn--primary" data-act="simpan" id="pg-simpan">' + ic('save', 18) + '<span>Simpan perubahan</span></button>' }) +
        '<div class="chips-scroll" style="margin-bottom:16px" role="tablist">' + TABS.map(function (t) { return '<button class="chip ' + (st.tab === t[0] ? 'on' : '') + '" data-act="tab" data-t="' + t[0] + '" role="tab">' + ic(t[1], 16) + t[2] + '</button>'; }).join('') + '</div><div id="pg-body"></div>';
      Hal.aksiPeta(el, aksi(el));
      el.oninput = function (e) { masukan(el, e); };
      el.onchange = function (e) { masukan(el, e, true); };
      if (!H._kembali) { H._kembali = true; window.addEventListener('hashchange', function () { if (App.hal !== 'pengaturan' && st.draft) kembalikanTema(); }); }
      H.tab(el);
    },
    tab: function (el, diam) {
      var b = el.querySelector('#pg-body'); if (!b) return;
      var m = { tampilan: tabTampilan, masuk: tabMasuk, sumber: tabSumber, invoice: tabInvoice, manifest: tabManifest, rekap: tabRekap, wa: tabWa, akses: tabAkses, pengguna: tabPengguna, sistem: tabSistem }[st.tab] || tabTampilan;
      var y = scrollY; b.innerHTML = m(); if (!diam) { b.classList.remove('fade'); void b.offsetWidth; b.classList.add('fade'); } else window.scrollTo(0, y);
      UI.siapkanForm(b);
      el.querySelectorAll('[data-act="tab"]').forEach(function (x) { x.classList.toggle('on', x.dataset.t === st.tab); });
      el.querySelector('#pg-simpan').style.visibility = st.tab === 'pengguna' ? 'hidden' : 'visible';
      H.tanda(el);
      if (st.tab === 'invoice' || st.tab === 'manifest') pratinjauKertas(el);
      if (st.tab === 'masuk') pratinjauMasuk(el); else clearInterval(st.pmT);
      if (st.tab === 'wa' && st.tpl) daftarEvent().forEach(function (e) { cocokTemplate(el, e.kode); });
      if (st.tab === 'sumber' && (!st.sumber || !diam)) C.api('sumber.info', {}).then(function (r) { if (r.success) { st.sumber = r.data; if (r.data.tab) Store.D.Sumber_Tab = r.data.tab; if (st.tab === 'sumber' && el.isConnected) H.tab(el, true); } else UI.toast(r.message, 'err'); });
      if (st.tab === 'sistem' && !diam) C.api('sistem.status', {}).then(function (r) { if (r.success) { Store.info.integrasi = r.data; if (st.tab === 'sistem' && el.isConnected) H.tab(el, true); } });
    },
    tanda: function (el) { var n = Object.keys(diubah()).length, t = el.querySelector('#pg-ubah'); if (t) { t.style.display = n ? '' : 'none'; t.innerHTML = ic('pencil', 14) + n + ' perubahan belum disimpan'; } },
    navigasi: function (el, args) { if (args[0] && args[0] !== st.tab) { st.tab = args[0]; H.tab(el); } },
    segarkan: function (el) { if (['pengguna', 'sumber'].indexOf(st.tab) > -1) H.tab(el, true); }
  };

  function masukan(el, e, ubah) {
    var t = e.target, S = draftS();
    if (t.dataset.warna) { var p = Object.assign({}, U.paletAktif(S), { preset: 'kustom' }); p[t.dataset.warna] = t.value; delete p.nama; S.PALET = JSON.stringify(p); pratinjauTema(); if (ubah) H.tab(el, true); H.tanda(el); return; }
    if (t.name && YX.PENGATURAN_BOLEH.indexOf(t.name) > -1) {
      S[t.name] = t.type === 'checkbox' ? (t.checked ? 'YA' : 'TIDAK') : t.hasAttribute('data-rupiah') ? String(t.value).replace(/\D/g, '') : t.name === 'INV_HURUF' ? t.value.toUpperCase() : t.value;
      if (t.name === 'WA_PENYEDIA' && ubah) { st.tpl = null; H.tab(el, true); return; }
      if (/^QONTAK_KONTAK_AKTIF$/.test(t.name) && ubah) { H.tab(el, true); return; }
      if (/^FONT_|^APP_NAMA$/.test(t.name)) { pratinjauTema(); var bn = document.getElementById('brand-nama'); if (bn && t.name === 'APP_NAMA') bn.textContent = t.value; }
      if (t.name === 'INV_WARNA' && t.nextElementSibling) t.nextElementSibling.textContent = t.value.toUpperCase();
    }
    if (t.dataset.tab) { var a = U.parseJson(S.SUMBER_TAB, {}) || {}, x = a[t.dataset.tab] = a[t.dataset.tab] || {}, inf = HT.infoTab(S, t.dataset.tab); x.bagian = x.bagian || inf.bagian; x.jenis = x.jenis || inf.jenis; x[t.dataset.f] = t.value; S.SUMBER_TAB = JSON.stringify(a); }
    if (t.dataset.r) { var rek = U.parseJson(S.INV_REKENING, []) || []; rek[+t.closest('[data-i]').dataset.i][t.dataset.r] = t.value; S.INV_REKENING = JSON.stringify(rek); }
    if (t.hasAttribute('data-sy')) { S.INV_SYARAT = JSON.stringify(Array.from(el.querySelectorAll('[data-sy]')).map(function (x) { return x.value.trim(); }).filter(Boolean)); }
    if (t.dataset.rl) { var rl = U.parseJson(S.REKAP_LABEL, {}) || {}; rl[t.dataset.rl] = rl[t.dataset.rl] || {}; if (t.value.trim()) rl[t.dataset.rl][t.dataset.k] = t.value; else delete rl[t.dataset.rl][t.dataset.k]; S.REKAP_LABEL = JSON.stringify(rl); }
    if (t.hasAttribute('data-rlj')) { var rj = U.parseJson(S.REKAP_LABEL, {}) || {}; if (t.value.trim()) rj.JUDUL = t.value.trim(); else delete rj.JUDUL; if (rj.YB) delete rj.YB.JUDUL; S.REKAP_LABEL = JSON.stringify(rj); }
    if (t.dataset.slide) { var sl = slideDraft(); sl[+t.closest('[data-si]').dataset.si][t.dataset.slide] = t.value; S.LOGIN_SLIDE = JSON.stringify(sl); }
    if (t.dataset.tpl) { var tp = U.parseJson(S.WA_TEMPLATE, {}) || {}, kd = t.closest('[data-kode]').dataset.kode, x2 = tp[kd] = tp[kd] || { bahasa: 'id', param: [] }; x2[t.dataset.tpl] = t.type === 'checkbox' ? t.checked : t.value.trim(); S.WA_TEMPLATE = JSON.stringify(tp); if (t.dataset.tpl === 'nama' || t.dataset.tpl === 'id') cocokTemplate(el, kd); }
    if (t.closest('[data-qp]')) { var pt = {}; el.querySelectorAll('[data-qp]').forEach(function (r) { var k = r.querySelector('[data-qpk]').value.trim(), v = r.querySelector('[data-qpv]').value; if (k) pt[k] = v; }); S.QONTAK_PETA = JSON.stringify(pt); }
    if (t.dataset.akses) { var ak = {}; Object.keys(YX.MENU_DIATUR).forEach(function (m) { ak[m] = Array.from(el.querySelectorAll('[data-akses="' + m + '"]:checked')).map(function (x) { return x.value; }); }); S.AKSES_MENU = JSON.stringify(ak); }
    if (t.id === 'sm-sembunyi' && ubah) { S.SUMBER_SEMBUNYIKAN_ID = t.checked ? 'YA' : 'TIDAK'; }
    H.tanda(el);
    if (st.tab === 'invoice' || st.tab === 'manifest') pratinjauNanti(el);
    if (st.tab === 'masuk') pratinjauMasukNanti(el);
  }
  async function unggahSlide() {
    var g = await UI.pilihGambar({ max: 1920, mime: 'image/webp', q: 0.82 }); if (!g) return '';
    var selesai = UI.proses('Mengunggah gambar halaman masuk'), up = await C.api('aset.unggah', { kind: 'login', file: g }); selesai(up.success);
    if (!up.success) { UI.toast(up.message, 'err'); return ''; }
    UI.toast('Gambar siap — klik Simpan perubahan agar tampil di halaman masuk.', 'ok'); return up.data.url;
  }
  function aksi(el) {
    return {
      tab: function (d) { st.tab = d.t; history.replaceState(null, '', '#/pengaturan/' + d.t); App.args = [d.t]; H.tab(el); },
      preset: function (d) { var S = draftS(); S.PALET = JSON.stringify(d.p === 'kustom' ? Object.assign({}, U.paletAktif(S), { preset: 'kustom', nama: undefined }) : { preset: d.p }); pratinjauTema(); H.tab(el, true); },
      simpan: async function (d, b) {
        var kv = diubah(); if (!Object.keys(kv).length) { UI.toast('Tidak ada perubahan.', 'info'); return; }
        if (kv.PALET && !U.cekPalet(U.paletAktif(draftS())).lulus) { UI.toast('Kontras warna terlalu rendah — penyimpanan diblokir.', 'err'); return; }
        var sembunyi = kv.SUMBER_SEMBUNYIKAN_ID;
        var r = await C.aksi('pengaturan.simpan', { kv: kv }, { btn: b, loadingText: 'Menyimpan…' });
        if (!r.success) return;
        st.draft = null; Object.assign(Store.S, r.data.S); C.Tema.terapkan(Store.S); try { C.LS.del('yb:login'); } catch (e) { } if (!C.DEMO) { Store.info.waSiap = waSiapLokal(Store.S); Store.info.penyedia = Store.S.WA_PENYEDIA; }
        if (sembunyi) { var s2 = UI.proses('Mengatur kolom ID SISTEM di sheet'); var r2 = await C.api('sumber.sembunyi', { sembunyi: sembunyi === 'YA' }); s2(r2.success); if (!r2.success) UI.toast(r2.message, 'err'); }
        if (kv.APP_NAMA || kv.APP_TAGLINE || kv.LOGO_URL || kv.AKSES_MENU) { App.renderShell(); App.route(true); } else H.tab(el, true);
      },
      'default': async function (d, b) {
        var nama = { gambar: 'logo & favicon', tampilan: 'warna & huruf', invoice: 'pengaturan invoice', manifest: 'pengaturan manifest', rekap: 'label rekap', masuk: 'gambar & teks halaman masuk' }[d.g];
        if (!(await UI.konfirmasi({ judul: 'Kembalikan ' + nama + ' bawaan?', teks: 'Berlaku untuk semua pengguna.', ok: 'Kembalikan', ikon: 'rotate-ccw' }))) return;
        var r = await C.aksi('pengaturan.default', { grup: d.g }, { btn: b }); if (r.success) { st.draft = null; Object.assign(Store.S, r.data.S); C.Tema.terapkan(Store.S); if (d.g === 'gambar') { App.renderShell(); App.route(true); } else H.tab(el, true); }
      },
      unggah: async function (d) {
        var png = /^(favicon|ttd|cap|bank)$/.test(d.kind), g = await UI.pilihGambar({ max: d.kind === 'ttd' || d.kind === 'cap' ? 600 : 512, svg: d.kind === 'logo' || d.kind === 'favicon', mime: png ? 'image/png' : 'image/webp' }); if (!g) return;
        var selesai = UI.proses('Mengunggah gambar ke Drive'), up = await C.api('aset.unggah', { kind: d.kind, file: g }); selesai(up.success);
        if (!up.success) { UI.toast(up.message, 'err'); return; }
        if (d.k) { draftS()[d.k] = up.data.url; UI.toast('Gambar siap — klik Simpan perubahan agar dipakai.', 'ok'); H.tab(el, true); }
        return up.data.url;
      },
      hapusGbr: function (d) { draftS()[d.k] = ''; H.tab(el, true); },
      rekTambah: function () { var S = draftS(), r = U.parseJson(S.INV_REKENING, []) || []; r.push({ bank: '', norek: '', logo: '' }); S.INV_REKENING = JSON.stringify(r); H.tab(el, true); },
      rekHapus: function (d) { var S = draftS(), r = U.parseJson(S.INV_REKENING, []) || []; r.splice(+d.i, 1); S.INV_REKENING = JSON.stringify(r); H.tab(el, true); },
      rekLogo: async function (d) { var g = await UI.pilihGambar({ max: 240, mime: 'image/png' }); if (!g) return; var selesai = UI.proses('Mengunggah logo bank'), up = await C.api('aset.unggah', { kind: 'bank', file: g }); selesai(up.success); if (!up.success) { UI.toast(up.message, 'err'); return; } var S = draftS(), r = U.parseJson(S.INV_REKENING, []) || []; r[+d.i].logo = up.data.url; S.INV_REKENING = JSON.stringify(r); H.tab(el, true); },
      syTambah: function () { var S = draftS(), s = U.parseJson(S.INV_SYARAT, []) || []; s.push('Poin baru'); S.INV_SYARAT = JSON.stringify(s); H.tab(el, true); },
      syHapus: function (d) { var S = draftS(), s = U.parseJson(S.INV_SYARAT, []) || []; s.splice(+d.i, 1); S.INV_SYARAT = JSON.stringify(s); H.tab(el, true); },
      hubung: async function (d, b) {
        var url = el.querySelector(d.j === 'rekap' ? '#sm-rek' : '#sm-pes').value.trim(); if (!/docs\.google\.com\/spreadsheets\/d\//.test(url)) { UI.toast('Tempel link Google Sheets (docs.google.com/spreadsheets/d/…).', 'warn'); return; }
        var label = b.innerHTML; b.classList.add('loading'); b.innerHTML = UI.putar(16) + '<span>Membaca file…</span>';
        var selesai = UI.proses(d.j === 'rekap' ? 'Menghubungkan file Rekapitulasi' : 'Membaca seluruh tab Database Pemesanan'), r = await C.api('sumber.atur', { jenis: d.j, url: url }, { timeout: 120000 });
        selesai(r.success); if (b.isConnected) { b.classList.remove('loading'); b.innerHTML = label; }
        UI.toast(r.message, r.success ? 'ok' : 'err', 6000); if (!r.success) return;
        if (!C.DEMO) { var bt = await C.api('boot', {}); if (bt.success) { Store.setBoot(bt.data); App.segarkan(); } }
        st.sumber = null; H.tab(el);
      },
      lepas: async function (d) { if (!(await UI.konfirmasi({ judul: 'Lepas file ' + (d.j === 'rekap' ? 'Rekapitulasi' : 'Database Pemesanan') + '?', teks: 'File tidak dihapus — aplikasi hanya berhenti membaca/menulis ke file itu.', ok: 'Lepas', bahaya: true }))) return; var r = await C.api('sumber.atur', { jenis: d.j, url: '__HAPUS__' }); UI.toast(r.message, r.success ? 'ok' : 'err'); st.sumber = null; H.tab(el); },
      siapkan: async function (d, b) { var label = b.innerHTML; b.innerHTML = UI.putar(16) + 'Memeriksa…'; var selesai = UI.proses('Menyiapkan kolom sistem di sheet'), r = await C.api('sumber.siapkan', {}, { timeout: 120000 }); selesai(r.success); b.innerHTML = label; UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success && !C.DEMO) { Store.src = ''; C.Sinkron.cek(true); } },
      // --- halaman masuk
      slideTambah: async function () { var l = slideDraft(); if (l.length >= 8) return; var url = await unggahSlide(); if (!url) return; l.push({ img: url, judul: '', sub: '' }); draftS().LOGIN_SLIDE = JSON.stringify(l); H.tab(el, true); var j = el.querySelectorAll('[data-slide="judul"]'); if (j.length) j[j.length - 1].focus(); },
      slideGambar: async function (d) { var url = await unggahSlide(); if (!url) return; var l = slideDraft(); l[+d.i].img = url; draftS().LOGIN_SLIDE = JSON.stringify(l); H.tab(el, true); },
      slideGeser: function (d) { var l = slideDraft(), i = +d.i, j = i + Number(d.d); if (j < 0 || j >= l.length) return; var t = l[i]; l[i] = l[j]; l[j] = t; draftS().LOGIN_SLIDE = JSON.stringify(l); H.tab(el, true); },
      slideHapus: function (d) { var l = slideDraft(); l.splice(+d.i, 1); draftS().LOGIN_SLIDE = JSON.stringify(l); H.tab(el, true); },
      // --- WhatsApp & Qontak
      rahasia: async function (d, b) {
        var inp = el.querySelector('#rh-' + d.k), v = inp.value.trim(); if (!v) { UI.toast('Tempel nilainya dulu.', 'warn'); inp.focus(); return; }
        var label = b.innerHTML; b.classList.add('loading'); b.innerHTML = UI.putar(16);
        var r = await C.api('rahasia.simpan', { kunci: d.k, nilai: v }); b.classList.remove('loading'); b.innerHTML = label; inp.value = '';
        UI.toast(r.message, r.success ? 'ok' : 'err'); if (!r.success) return;
        Store.info.rahasia = Store.info.rahasia || {}; Store.info.rahasia[d.k] = { ada: r.data.ada, samar: r.data.samar }; if (d.k === 'FONNTE_TOKEN') Store.info.waToken = r.data.samar; if (!C.DEMO) Store.info.waSiap = waSiapLokal(Store.S);
        H.tab(el, true);
      },
      rahasiaHapus: async function (d) { if (!(await UI.konfirmasi({ judul: 'Hapus kunci ini?', teks: 'Pengiriman lewat penyedia ini berhenti sampai kunci diisi lagi.', ok: 'Hapus', bahaya: true }))) return; var r = await C.api('rahasia.simpan', { kunci: d.k, nilai: '__HAPUS__' }); UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { Store.info.rahasia = Store.info.rahasia || {}; Store.info.rahasia[d.k] = { ada: false, samar: '' }; if (!C.DEMO) Store.info.waSiap = waSiapLokal(Store.S); H.tab(el, true); } },
      waCek: async function (d, b) {
        if (Object.keys(diubah()).some(function (k) { return /^(WA_PENYEDIA|META_|QONTAK_CHANNEL|QONTAK_URL_CHAT)/.test(k); })) { UI.toast('Simpan perubahan dulu — cek koneksi memakai pengaturan yang tersimpan.', 'warn'); return; }
        var box = el.querySelector('#pg-wa-status'), label = b.innerHTML; b.innerHTML = UI.putar(16) + 'Memeriksa…';
        var r = await C.api(Store.S.WA_PENYEDIA === 'fonnte' || !Store.S.WA_PENYEDIA ? 'wa.device' : 'wa.statusApi', {}); b.innerHTML = label;
        if (box) box.innerHTML = '<div class="note ' + (r.success ? 'ok' : 'danger') + '">' + ic(r.success ? 'circle-check' : 'circle-alert') + '<span>' + esc(r.success ? (r.message || (r.data && r.data.device ? 'Perangkat ' + r.data.device + ' · ' + r.data.status : 'Terhubung')) : r.message) + '</span></div>';
        if (r.success && r.data && r.data.kanal) { st.kanal = r.data.kanal; H.tab(el, true); }
      },
      kanalMuat: async function (d, b) { var r = await C.api('wa.statusApi', {}); if (!r.success) { UI.toast(r.message, 'err'); return; } st.kanal = (r.data && r.data.kanal) || []; if (!st.kanal.length) UI.toast('Belum ada nomor WhatsApp terhubung di Qontak.', 'warn'); H.tab(el, true); },
      kanalPilih: function (d) { draftS().QONTAK_CHANNEL_ID = d.id; H.tab(el, true); },
      waTes: async function () {
        var pv = Store.S.WA_PENYEDIA || 'fonnte', ev = daftarEvent();
        var h = UI.modal({ judul: 'Kirim tes WhatsApp', ukuran: 'sm', isi: UI.form([{ name: 'nomor', label: 'Nomor tujuan', type: 'tel', wajib: true, full: true, nilai: Store.me.wa || '' }].concat(pv === 'fonnte' ? [] : [{ name: 'event', label: 'Template jenis pesan', type: 'select', full: true, opsi: ev.map(function (e) { return { v: e.kode, l: e.label }; }) }])),
          aksi: [{ label: 'Batal' }, { label: 'Kirim tes', kelas: 'btn--primary', ikon: 'send', klik: async function (hh, b) { if (!UI.cekWajib(hh.body)) return false; var v = UI.bacaForm(hh.body), r = await C.api('wa.tes', { nomor: v.nomor, event: v.event }); UI.toast(r.message, r.success ? 'ok' : 'err', 6000); return r.success; } }] });
        return h;
      },
      tplMuat: async function (d, b) {
        if (Object.keys(diubah()).some(function (k) { return /^(WA_PENYEDIA|META_|QONTAK_)/.test(k); })) { UI.toast('Simpan perubahan penyedia dulu.', 'warn'); return; }
        var label = b.innerHTML; b.innerHTML = UI.putar(16) + 'Memuat…'; var r = await C.api('wa.templateApi', {}); b.innerHTML = label;
        if (!r.success) { UI.toast(r.message, 'err'); return; }
        st.tpl = r.data; UI.toast(r.data.daftar.length + ' template dimuat dari ' + (r.data.penyedia === 'qontak' ? 'Qontak' : 'Meta') + '.', 'ok'); H.tab(el, true); daftarEvent().forEach(function (e) { cocokTemplate(el, e.kode); });
      },
      tplVar: function (d, b) {
        var S = draftS(), tp = U.parseJson(S.WA_TEMPLATE, {}) || {}, kd = b.closest('[data-kode]').dataset.kode, t = tp[kd] = tp[kd] || { bahasa: 'id', param: [] }; t.param = Array.isArray(t.param) ? t.param : [];
        var i = t.param.indexOf(d.v); if (i > -1) t.param.splice(i, 1); else if (t.param.length < 10) t.param.push(d.v);
        S.WA_TEMPLATE = JSON.stringify(tp); H.tab(el, true); H.tanda(el); cocokTemplate(el, kd);
      },
      qpTambah: function () { var S = draftS(), pt = U.parseJson(S.QONTAK_PETA, {}) || {}, n = 1; while (pt['kolom_' + n]) n++; pt['kolom_' + n] = 'trip'; S.QONTAK_PETA = JSON.stringify(pt); H.tab(el, true); H.tanda(el); },
      qpHapus: function (d, b) { b.closest('[data-qp]').remove(); var pt = {}; el.querySelectorAll('[data-qp]').forEach(function (r) { var k = r.querySelector('[data-qpk]').value.trim(); if (k) pt[k] = r.querySelector('[data-qpv]').value; }); draftS().QONTAK_PETA = JSON.stringify(pt); H.tanda(el); },
      qTes: async function (d, b) { var label = b.innerHTML; b.innerHTML = UI.putar(16) + 'Memeriksa…'; var r = await C.api('qontak.tes', {}); b.innerHTML = label; var box = el.querySelector('#pg-q-status'); if (box) box.innerHTML = '<div class="note ' + (r.success ? 'ok' : 'danger') + '">' + ic(r.success ? 'circle-check' : 'circle-alert') + '<span>' + esc(r.message) + '</span></div>'; },
      qSinkron: async function (d, b) { var r = await C.aksi('qontak.sinkron', {}, { btn: b, proses: 'Menyiapkan sinkron kontak Qontak' }); if (r.success) C.Pekerja.jalan(); },
      qUlang: async function (d, b) { if (!(await UI.konfirmasi({ judul: 'Kirim ulang semua kontak?', teks: 'Semua kontak pemesan dikirim lagi ke Qontak (diperbarui bila sudah ada).', ok: 'Kirim ulang', ikon: 'refresh-cw' }))) return; var r = await C.aksi('qontak.sinkron', { semua: true }, { btn: b, proses: 'Menyiapkan sinkron kontak Qontak' }); if (r.success) C.Pekerja.jalan(); },
      userBaru: function () { formUser(); }, userEdit: function (d) { formUser(Store.get('Pengguna', d.id)); },
      userPin: async function (d, b) { var u = Store.get('Pengguna', d.id); if (!(await UI.konfirmasi({ judul: 'Reset PIN ' + u.Nama + '?', teks: 'PIN lama langsung tidak berlaku.', ok: 'Reset PIN', bahaya: true }))) return; var r = await C.aksi('pengguna.resetPin', { id: d.id }, { btn: b, diam: true }); if (r.success) tampilPin(u.Nama, r.data.pin); else UI.toast(r.message, 'err'); },
      resetDemo: async function () { if (!(await UI.konfirmasi({ judul: 'Reset data demo?', teks: 'Semua perubahan di Mode Demo dihapus dan data contoh dimuat ulang.', ok: 'Reset', bahaya: true }))) return; var r = await C.api('demo.reset', {}); if (r.success) { Store.D = r.data.D; Store.S = Demo.S(Store.D); C.Tema.terapkan(Store.S); UI.toast(r.message, 'ok'); App.renderShell(); App.go('dashboard'); App.route(true); } }
    };
  }
})();
