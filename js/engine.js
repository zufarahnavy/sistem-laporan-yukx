/**
 * ============================================================================
 *  YukBanyuwangi — LOGIKA.gs  ·  Mesin Logika Bisnis Bersama  ·  v2.0.0
 * ============================================================================
 *  Berkas ini dipakai di DUA tempat TANPA perubahan:
 *    1) Backend Google Apps Script  → Logika.gs
 *    2) Frontend (GitHub Pages)     → js/engine.js  (Mode Demo + hitungan tampilan)
 *
 *  Karena itu berkas ini TIDAK memakai SpreadsheetApp / DriveApp / DOM.
 *  Semua akses data & layanan luar lewat objek "host" (H) yang disuntikkan:
 *    H.db   : { all(t), insert(t, rows), update(t, key, id, patch) -> row, remove(t, key, id) }
 *    H.now(): Date      H.uuid(): string      H.hash(pin, salt): string
 *    H.waSiap(): boolean   H.sisaEmail(): number
 *
 *  SUMBER DATA UTAMA = spreadsheet "Database Pemesanan" milik klien (akun Google
 *  lain). Tabel virtual "Pesanan" & "Sumber_Tab" diisi host dari spreadsheet itu;
 *  tulis ke tabel virtual diteruskan host ke spreadsheet klien (dua arah).
 *  Tabel lain (kalkulasi, manifest, rekap, invoice, tagihan, dst.) disimpan di
 *  database aplikasi dan dikaitkan lewat kolom "ID SISTEM" (ID_Pesanan).
 * ============================================================================
 */
var YX = (function () {
  'use strict';

  var VERSI = '2.0.0';
  var TZ_MENIT = 420; // WIB (UTC+7)

  // ==========================================================================
  // 1. SKEMA DATABASE
  // ==========================================================================
  var SKEMA = {
    // ---- tabel VIRTUAL (spreadsheet klien) — tidak disimpan di database aplikasi
    Pesanan: { key: 'ID_Pesanan', prefix: 'PSN', pendek: true, virtual: true, cols: ['ID_Pesanan', 'Tab', 'Baris', 'No', 'Nama', 'PIC', 'No_HP', 'Pax', 'Trip', 'Tgl_Mulai', 'Tgl_Selesai', 'Asal', 'Sumber_Info', 'Email', 'Instagram', 'Penjemputan', 'Lokasi_Drop', 'Harga', 'Total', 'DP', 'Sisa', 'Setoran', 'Link_Bukti_TF', 'Link_Itinerary', 'Link_Kalkulasi', 'Tgl_Pesan', 'Checklist', 'Lain', 'Rumus', 'H'] },
    Sumber_Tab: { key: 'Nama', prefix: '', virtual: true, cols: ['Nama', 'Urutan', 'Header', 'Kolom', 'Jumlah', 'Ada_ID', 'Ada_Tgl_Pesan'] },
    // ---- tabel aplikasi
    Pengguna: { key: 'ID_Pengguna', prefix: 'USR', cols: ['ID_Pengguna', 'Nama', 'Email', 'Peran', 'Pengelola', 'Hash_PIN', 'Salt', 'Status', 'No_WA', 'Foto_URL', 'Terakhir_Login', 'Dibuat'] },
    Tim_Lapang: { key: 'ID_TL', prefix: 'TL', cols: ['ID_TL', 'Nama', 'Peran', 'No_HP', 'Email', 'Status', 'Catatan', 'Dibuat'] },
    Kalkulasi: { key: 'ID_Pesanan', prefix: '', cols: ['ID_Pesanan', 'Sumber', 'Link_CS', 'Pax', 'Paket', 'Catatan', 'Dibuat_Oleh', 'Diperbarui'] },
    Kalkulasi_Item: { key: 'ID_Item', prefix: 'KLI', acak: true, cols: ['ID_Item', 'ID_Pesanan', 'Uraian', 'Tetap', 'Per_Pax', 'Budget', 'Terima_TL', 'Ke_TL', 'Grup', 'Kolom', 'Asal', 'Urutan'] },
    Peta_Item: { key: 'Kunci', prefix: '', cols: ['Kunci', 'Uraian', 'Bagian', 'Ke_TL', 'Grup', 'Kolom', 'Diperbarui'] },
    Paket_Kalkulasi: { key: 'ID_Paket', prefix: 'PKT', cols: ['ID_Paket', 'Nama', 'Bagian', 'Item', 'Catatan', 'Diperbarui'] },
    Manifest: { key: 'ID_Pesanan', prefix: '', cols: ['ID_Pesanan', 'PIC_Kantor', 'TL', 'Durasi', 'Data_Tamu', 'Checklist', 'Catatan', 'Itinerary', 'Peserta', 'Tampil_Budget', 'Status', 'Versi', 'Link_PDF', 'File_ID', 'Diterbitkan', 'Diundang', 'Dibuat_Oleh', 'Diperbarui'] },
    Kalender_Event: { key: 'ID_Pesanan', prefix: '', cols: ['ID_Pesanan', 'Event_ID', 'Hash', 'Lampiran', 'Tamu', 'Status', 'Pesan', 'Diperbarui'] },
    Rekap: { key: 'ID_Pesanan', prefix: '', cols: ['ID_Pesanan', 'Bagian', 'Kode_Trip', 'Kapal', 'Tambahan', 'Status', 'Catatan', 'Diajukan_Oleh', 'Tgl_Ajukan', 'Dikunci_Oleh', 'Tgl_Kunci', 'Snapshot', 'Penjualan_Final', 'Pengeluaran_Final', 'Laba_Final', 'Riwayat', 'Diperbarui'] },
    Pembayaran: { key: 'ID_Bayar', prefix: 'BYR', cols: ['ID_Bayar', 'ID_Pesanan', 'Tanggal', 'Nominal', 'Jenis', 'Metode', 'Link_Bukti', 'Catatan', 'Dicatat_Oleh', 'Dibuat'] },
    Tagihan: { key: 'ID_Pesanan', prefix: '', cols: ['ID_Pesanan', 'Status_Manual', 'Jatuh_Tempo', 'Catatan', 'Terakhir_Diingatkan', 'Jumlah_Pengingat', 'Oleh', 'Diperbarui'] },
    Invoice: { key: 'ID_Invoice', prefix: 'INV', cols: ['ID_Invoice', 'ID_Pesanan', 'No_Invoice', 'Customer_ID', 'Urutan', 'Judul', 'Tanggal', 'Bill_To', 'Item', 'Disc', 'DP', 'Note_Judul', 'Note_Isi', 'Status', 'Link_PDF', 'File_ID', 'Kode_Verifikasi', 'Dibuat_Oleh', 'Dibuat', 'Diperbarui'] },
    Biaya_Operasional: { key: 'ID_Biaya', prefix: 'OPS', cols: ['ID_Biaya', 'Bulan', 'Tanggal', 'Kategori', 'Uraian', 'Nominal', 'Catatan', 'Dibuat_Oleh', 'Dibuat'] },
    Pengaturan: { key: 'Kunci', prefix: '', cols: ['Kunci', 'Nilai', 'Keterangan'] },
    Log_Aktivitas: { key: 'ID_Log', prefix: 'LOG', acak: true, cols: ['ID_Log', 'Waktu', 'Pengguna', 'Peran', 'Aksi', 'Kategori', 'Objek', 'Detail'] },
    Antrean_Tugas: { key: 'ID_Tugas', prefix: 'TGS', acak: true, cols: ['ID_Tugas', 'Jenis', 'Ref', 'Payload', 'Status', 'Percobaan', 'Hasil', 'Dibuat', 'Selesai'] },
    AntrianNotif: { key: 'AntrianID', prefix: 'ANT', acak: true, cols: ['AntrianID', 'Kanal', 'Tujuan', 'NamaPenerima', 'Subjek', 'Pesan', 'Lampiran', 'Event', 'RefID', 'BlastID', 'Status', 'Percobaan', 'Respon', 'DibuatPada', 'DikirimPada'] },
    BlastWA: { key: 'BlastID', prefix: 'BLW', cols: ['BlastID', 'Judul', 'Pesan', 'Sasaran', 'Total', 'Terkirim', 'Gagal', 'UkuranBatch', 'JedaDetik', 'Status', 'DibuatOleh', 'Tanggal', 'SelesaiPada'] },
    CRM_Kontak: { key: 'KontakID', prefix: 'KTK', cols: ['KontakID', 'Nama', 'Email', 'NoWA', 'Segmen', 'Sumber', 'RefID', 'Tag', 'StatusWA', 'CekWAAt', 'EmailValid', 'OptOut', 'Catatan', 'JumlahPesan', 'TerakhirDihubungi', 'Info', 'DibuatPada', 'DiperbaruiPada'] },
    CRM_Interaksi: { key: 'InteraksiID', prefix: 'INT', acak: true, cols: ['InteraksiID', 'KontakID', 'Kanal', 'Arah', 'Ringkasan', 'RefID', 'Oleh', 'Tanggal'] }
  };
  var TABEL_VIRTUAL = Object.keys(SKEMA).filter(function (t) { return SKEMA[t].virtual; });
  var TABEL_APP = Object.keys(SKEMA).filter(function (t) { return !SKEMA[t].virtual; });

  // Kolom angka (disimpan sebagai Number) — selain ini dianggap teks.
  var ANGKA = {};
  ['Baris', 'Pax', 'Harga', 'Total', 'DP', 'Sisa', 'Setoran', 'Urutan', 'Header', 'Jumlah', 'Tetap', 'Per_Pax', 'Budget', 'Terima_TL', 'Versi',
    'Penjualan_Final', 'Pengeluaran_Final', 'Laba_Final', 'Nominal', 'Disc', 'Jumlah_Pengingat', 'Percobaan', 'Terkirim', 'Gagal', 'UkuranBatch', 'JumlahPesan']
    .forEach(function (k) { ANGKA[k] = 1; });
  // Kolom yang harus tetap teks (nomor HP/identitas tidak boleh jadi angka)
  var TEKS_WAJIB = ['No_WA', 'No_HP', 'NoWA', 'JedaDetik', 'No_Invoice', 'Customer_ID'];

  var PERAN = { ADMIN: 'Admin', FINANCE: 'Finance' };
  var ADM = ['Admin'], FIN = ['Finance'], SEMUA = ['Admin', 'Finance'];

  // --------------------------------------------------------------------------
  // Peta kolom spreadsheet klien → kolom kanonik (header dinormalkan: huruf besar,
  // tanpa titik, spasi tunggal). Kolom lain tetap ditampilkan apa adanya ("Lain").
  // --------------------------------------------------------------------------
  var SINONIM = {
    No: ['NO', 'NOMOR', 'NO URUT'],
    Nama: ['NAMA', 'NAMA TAMU', 'NAMA PEMESAN'],
    PIC: ['PIC', 'CS'],
    No_HP: ['NO HP', 'NOHP', 'NO WA', 'NO WHATSAPP', 'WHATSAPP', 'HP', 'NO TELP'],
    Pax: ['PAX', 'JUMLAH PAX', 'PESERTA'],
    Trip: ['TRIP', 'JENIS TRIP', 'PAKET', 'NAMA TRIP'],
    Tgl_Mulai: ['TANGGAL TRIP MULAI', 'TANGGAL TRIP', 'TGL TRIP', 'TANGGAL MULAI', 'TANGGAL'],
    Tgl_Selesai: ['TANGGAL TRIP SELESAI', 'TANGGAL SELESAI', 'TGL SELESAI'],
    Asal: ['ASAL', 'KOTA ASAL', 'DOMISILI'],
    Sumber_Info: ['SUMBER INFO', 'SUMBER', 'INFO DARI'],
    Email: ['EMAIL', 'E-MAIL'],
    Instagram: ['INSTAGRAM', 'IG'],
    Penjemputan: ['PENJEMPUTAN', 'JEMPUT', 'TITIK JEMPUT'],
    Lokasi_Drop: ['LOKASI DROP', 'DROP', 'TITIK DROP'],
    Harga: ['HARGA', 'HARGA JUAL', 'HARGA PER PAX'],
    Total: ['TOTAL PENJUALAN', 'TOTAL', 'TOTAL HARGA'],
    DP: ['DP', 'UANG MUKA'],
    Sisa: ['SISA TAGIHAN', 'SISA', 'SISA PEMBAYARAN'],
    Setoran: ['SETORAN'],
    Link_Bukti_TF: ['LINK BUKTI TF', 'BUKTI TF', 'LINK BUKTI TRANSFER'],
    Link_Itinerary: ['ITINERARY', 'LINK ITINERARY'],
    Link_Kalkulasi: ['KALKULASI', 'LINK KALKULASI'],
    Tgl_Pesan: ['TANGGAL PESAN', 'TGL PESAN'],
    ID_Pesanan: ['ID SISTEM']
  };
  var LABEL_ID = 'ID SISTEM', LABEL_TGL_PESAN = 'TANGGAL PESAN';
  function normalHeader(s) { return String(s == null ? '' : s).toUpperCase().replace(/\./g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  var _peta = null;
  function kunciKanonik(label) {
    if (!_peta) { _peta = {}; Object.keys(SINONIM).forEach(function (k) { SINONIM[k].forEach(function (s) { _peta[s] = k; }); }); }
    return _peta[normalHeader(label)] || '';
  }

  // Grup kalkulasi di manifest (urutan = urutan tampil, mengikuti Dummy Kalkulasi Budget)
  var GRUP_TL = ['MAN POWER', 'KONSUMSI', 'KARCIS', 'AGEN/LAIN-LAIN', 'SERVICE'];

  // Kolom rekapitulasi per bagian (mengikuti Dummy Rekapitulasi — label bisa diubah Admin)
  var REKAP_KOLOM = {
    YB: [['KEND', 'KEND'], ['BBM', 'BBM'], ['HOTEL', 'HOTEL'], ['KONSUM', 'KONSUM'], ['KARCIS', 'KARCIS'], ['KAPAL', 'KAPAL'], ['TLGUIDE', 'TL&GUIDE'], ['LL', 'LL/agen'], ['SERVICE', 'Service'], ['INSENTIF', 'Insentif']],
    SB: [['KAPTEN', 'KAPTEN &ABK'], ['BBMOLI', 'BBM,OLI'], ['KORLAP', 'KORLAP'], ['KONSUMSB', 'Konsumsi + Air Mineral'], ['ASURANSI', 'Asuransi'], ['GUIDE', 'Guide'], ['GWD', 'GWD'], ['TIKET', 'Tiket'], ['ALAT', 'Perawatan Alat'], ['LAIN', 'LAIN LAIN']]
  };
  var REKAP_LABEL_DEFAULT = {
    YB: { JUDUL: 'YUKBANYUWANGI', NO: 'NO', KODE: 'KODE TRIP', QTY: 'QTY', PIC: 'PIC', PRICE: 'PRICE', PENJUALAN: 'PENJUALAN', HPP: 'HPP', PENGELUARAN: 'PENGELUARAN', LABA: 'LABA KOTOR PJ', MARGIN_A: 'Margin Per Trip', MARGIN_B: 'Realisasi', RATAAN_A: 'RATAAN', RATAAN_B: 'MARGIN' },
    SB: { JUDUL: 'SUNRISE BOAT', NO: 'NO', KODE: 'KET', QTY: 'pax', PIC: 'SB', PRICE: 'Price', PENJUALAN: 'PENJUALAN', HPP: '', PENGELUARAN: 'PENGELUARAN', LABA: 'MARGIN', MARGIN_A: 'MARGIN', MARGIN_B: 'REALISASI', RATAAN_A: 'RATAAN', RATAAN_B: 'MARGIN' }
  };
  // Kolom default untuk item kalkulasi (dipakai bila belum ada pilihan yang diingat)
  var KATA_KOLOM = {
    YB: [[/\b(BUS|JEEP|HIACE|ELF|MOBIL|KENDARAAN|INNOVA|AVANZA|TRAVEL|MINIBUS|TRANSPORT)\b/, 'KEND'], [/\b(HOTEL|PENGINAPAN|HOMESTAY|VILLA|RESORT|GLAMPING|COTTAGE)\b/, 'HOTEL'],
      [/\b(PAKET PULAU|KAPAL|BOAT|PERAHU|SPEEDBOAT|SPEED BOAT)\b/, 'KAPAL'], [/\b(BBM|SOLAR|BENSIN|TOL|PARKIR)\b/, 'BBM'], [/\bINSENTIF\b/, 'INSENTIF'],
      [/\b(TL|TOUR LEADER|GUIDE|DOKUMENTASI|DRIVER|CREW|FOTOGRAFER)\b/, 'TLGUIDE'], [/\b(MAKAN|AIR MINERAL|KONSUMSI|SNACK|COFFEE|LUNCH|DINNER|BREAKFAST)\b/, 'KONSUM'],
      [/\bSERVICE\b/, 'SERVICE'], [/\b(AGEN|MASKER|LAIN)\b/, 'LL']],
    SB: [[/\b(KAPTEN|ABK|NAHKODA)\b/, 'KAPTEN'], [/\b(BBM|OLI|SOLAR|BENSIN)\b/, 'BBMOLI'], [/\bKORLAP\b/, 'KORLAP'], [/\b(KONSUMSI|MAKAN|AIR MINERAL|SNACK|LUNCH)\b/, 'KONSUMSB'],
      [/\bASURANSI\b/, 'ASURANSI'], [/\bGUIDE\b/, 'GUIDE'], [/\bGWD\b/, 'GWD'], [/\b(TIKET|KARCIS|RETRIBUSI)\b/, 'TIKET'], [/\b(PERAWATAN|ALAT|SNORKEL|PELAMPUNG)\b/, 'ALAT']]
  };
  var KATA_GRUP = [[/\b(TL|TOUR LEADER|GUIDE|DOKUMENTASI|DRIVER|CREW|FOTOGRAFER|KORLAP|KAPTEN|ABK)\b/, 'MAN POWER'], [/\b(MAKAN|AIR MINERAL|KONSUMSI|SNACK|COFFEE|LUNCH|DINNER|BREAKFAST)\b/, 'KONSUMSI'],
    [/\bSERVICE\b/, 'SERVICE'], [/\b(AGEN|MASKER|LAIN|BBM|SOLAR|PARKIR|TOL)\b/, 'AGEN/LAIN-LAIN']];
  var BUKAN_TL = /\b(BUS|JEEP|HIACE|ELF|MOBIL|KENDARAAN|INNOVA|AVANZA|HOTEL|PENGINAPAN|HOMESTAY|VILLA|RESORT|PAKET PULAU|KAPAL|BOAT|PERAHU|SPEEDBOAT|INSENTIF)\b/;
  var BIAYA_OPS_KATEGORI = ['Gaji & Honor', 'Sewa Kantor', 'Listrik, Air & Internet', 'Marketing & Iklan', 'Transport Kantor', 'Perlengkapan Kantor', 'Pajak & Perizinan', 'Lain-lain'];

  var PRESET_PALET = {
    yb: { nama: 'YukBanyuwangi', primary: '#0076A8', primaryDark: '#0B3B5A', primarySoft: '#7CCBEA', bg: '#F3F6F8', surface: '#FFFFFF', accent: '#F2A23A', text: '#0E2230', muted: '#4A5D6B' },
    laut: { nama: 'Laut', primary: '#0E7490', primaryDark: '#164E63', primarySoft: '#67E8F9', bg: '#F1F8FA', surface: '#FFFFFF', accent: '#FFB547', text: '#0B2530', muted: '#3F5B66' },
    ijen: { nama: 'Ijen', primary: '#1F5F8B', primaryDark: '#16263A', primarySoft: '#8FB8DE', bg: '#F4F6F9', surface: '#FFFFFF', accent: '#5FD3C6', text: '#101B2A', muted: '#4B5A6E' },
    senja: { nama: 'Senja', primary: '#C2410C', primaryDark: '#7C2D12', primarySoft: '#FDBA74', bg: '#FBF6F2', surface: '#FFFFFF', accent: '#0EA5E9', text: '#2A1608', muted: '#6B4C3B' }
  };

  var SYARAT_DEFAULT = [
    'Pembatalan dari pihak peserta dapat disampaikan pada pihak Tour Operator maksimal H-30 keberangkatan dan DP akan dikembalikan penuh (periode pengembalian antara 7 – 14 hari sejak pembatalan). Jika pembatalan dilakukan setelah H-30 DP dianggap hangus.',
    'Pelunasan dapat dibayarkan maksimal pada tanggal {tglTrip}',
    'Teknis kegiatan trip dapat menghubungi Tim Operasional a.n Riyan Budi : 0813-3387-1129'
  ];
  var PENGATURAN_DEFAULT = {
    // Identitas & tampilan
    APP_NAMA: ['YukBanyuwangi', 'Nama aplikasi (sidebar, tab, email)'],
    APP_TAGLINE: ['Trip Operation & Report', 'Teks kecil di bawah nama aplikasi'],
    APP_NAMA_PANJANG: ['Sistem Operasional & Laporan Trip YukBanyuwangi', 'Nama lengkap untuk judul & email'],
    LOGO_URL: ['', 'URL logo — kosong = logo bawaan'],
    FAVICON_URL: ['', 'URL favicon — kosong = bawaan'],
    PALET: [JSON.stringify({ preset: 'yb' }), 'JSON palet warna aktif'],
    FONT_BODY: ['Plus Jakarta Sans', 'Font isi (Google Fonts)'],
    FONT_HEAD: ['Plus Jakarta Sans', 'Font judul (Google Fonts)'],
    LOGIN_JUDUL: ['Setiap trip tercatat rapi, dari pesanan sampai margin.', 'Judul besar di halaman masuk'],
    LOGIN_SUB: ['Data pemesanan, kalkulasi, manifest Tim Lapang, kalender, invoice, dan rekap — satu alur, langsung tersambung ke Google Sheets.', 'Kalimat pendukung di halaman masuk'],
    LOGIN_FOTO: ['', 'Foto latar halaman masuk (URL) — kosong = ilustrasi bawaan'],
    // Perusahaan (kop invoice & dokumen)
    PT_NAMA: ['PT YUKBANYUWANGI TOUR ORGANIZER', 'Nama badan usaha'],
    PT_MEREK: ['YUKBANYUWANGI', 'Nama merek (baris kedua kop)'],
    PT_ALAMAT: ['Jl. Trenggono, Kel.Kebalenan, Brawijaya, Banyuwangi', 'Alamat kantor'],
    PT_TELP: ['0333-2821229', 'Telepon kantor'],
    PT_EMAIL: ['', 'Email kantor'],
    PT_WEB: ['yukbanyuwangi.co.id', 'Website'],
    PT_IG: ['@yukbanyuwangi', 'Instagram'],
    PT_WA: ['08113787911', 'WhatsApp kantor'],
    KOTA: ['Banyuwangi', 'Kota (tanda tangan dokumen)'],
    // Invoice (model klien)
    INV_JUDUL: ['INVOICE', 'Judul besar invoice'],
    INV_WARNA: ['#0094C8', 'Warna pita & judul invoice'],
    INV_HURUF: ['P', 'Huruf awal Customer ID (P/001/X/2026)'],
    INV_REKENING: [JSON.stringify([{ bank: 'Mandiri', norek: '143.00.9959.954.8', logo: '' }, { bank: 'BCA', norek: '1808818123', logo: '' }]), 'JSON daftar rekening'],
    INV_ATAS_NAMA: ['PT. YUKBANYUWANGI TOUR ORGANIZER', 'Atas nama rekening'],
    INV_NOTE_JUDUL: ['Deposit LUNAS', 'Judul NOTE default'],
    INV_NOTE_TEKS: ['Pelunasan dapat ditransfer ke rekening berikut:', 'Teks NOTE'],
    INV_SYARAT: [JSON.stringify(SYARAT_DEFAULT), 'JSON syarat & ketentuan ({tglTrip} = tanggal hari pertama trip)'],
    INV_TTD_URL: ['', 'Gambar tanda tangan (diunggah Admin)'],
    INV_CAP_URL: ['', 'Gambar cap/stempel (diunggah Admin)'],
    INV_TTD_LABEL: ['Finance', 'Label di bawah tanda tangan'],
    INV_SISA_LABEL: ['SISA PEMBAYARAN', 'Label baris sisa pembayaran'],
    INV_BARIS: ['15', 'Jumlah baris tabel (model: 15)'],
    INV_QR: ['TIDAK', 'YA = tampilkan QR verifikasi kecil'],
    // Manifest (PDF untuk Tim Lapang)
    MNF_JUDUL: ['MANIFEST TRIP', 'Judul manifest'],
    MNF_LOGO: ['TIDAK', 'YA = tampilkan logo & kop di manifest'],
    MNF_LOGO_URL: ['', 'Logo khusus manifest — kosong = logo aplikasi'],
    MNF_KOP: ['PT YUKBANYUWANGI TOUR ORGANIZER', 'Teks kop di samping logo manifest'],
    MNF_L_TIM: ['DATA TIM', 'Judul bagian tim'],
    MNF_L_TAMU: ['DATA TAMU', 'Judul bagian tamu'],
    MNF_L_PESERTA: ['DAFTAR PESERTA', 'Judul daftar nama peserta'],
    MNF_L_CEK: ['CHECK LIST TRIP', 'Judul checklist'],
    MNF_L_CATATAN: ['CATATAN', 'Judul catatan'],
    MNF_L_ITIN: ['ITINERARY', 'Judul itinerary'],
    MNF_L_BUDGET: ['BUDGETING', 'Judul budgeting'],
    MNF_KAKI: ['', 'Teks kaki manifest (opsional)'],
    MNF_PIC_DEFAULT: ['', 'Nama PIC kantor default di manifest'],
    MNF_CATATAN_DEFAULT: ['Setiap selesai trip perharinya memberikan update posisi kendaraan', 'Catatan default manifest (1 baris = 1 poin)'],
    // Rekap
    REKAP_LABEL: ['', 'JSON label kolom rekap (kosong = label template)'],
    REKAP_TAB: ['Rekap {bulan} {tahun}', 'Nama tab rekap di Google Sheet'],
    REKAP_SHEET_AKTIF: ['YA', 'YA = rekap ditulis otomatis ke Google Sheet Rekapitulasi'],
    // Sumber data
    SUMBER_SEMBUNYIKAN_ID: ['YA', 'YA = kolom ID SISTEM disembunyikan di sheet klien'],
    SUMBER_TAB: ['', 'JSON pengaturan per tab (bagian rekap & jenis trip)'],
    SUMBER_JEDA: ['4', 'Interval cek perubahan sheet (detik)'],
    // Akses & tagihan
    AKSES_MENU: [JSON.stringify({ report: ['Admin', 'Finance'], labarugi: ['Admin', 'Finance'], tagihan: ['Admin', 'Finance'] }), 'JSON peran yang boleh membuka menu'],
    TAGIHAN_OTOMATIS: ['TIDAK', 'YA = pengingat sisa tagihan terkirim otomatis'],
    TAGIHAN_H: ['7,3,1', 'Kirim pengingat H-berapa sebelum trip'],
    // Lain
    APP_URL: ['', 'URL aplikasi (GitHub Pages) — untuk {link}'],
    VERIF_URL: ['', 'URL halaman verifikasi (verifikasi.html)'],
    CAL_NAMA: ['YukBanyuwangi Trips', 'Nama kalender khusus'],
    NOTIF_WA_AKTIF: ['TIDAK', 'YA/TIDAK — saklar utama WhatsApp (Fonnte)'],
    NOTIF_EMAIL_AKTIF: ['TIDAK', 'YA/TIDAK — saklar utama Email'],
    NOTIF_MATRIKS: ['', 'JSON matriks event × kanal'],
    NOTIF_KIRIM_DEMO: ['TIDAK', 'YA = kontak bertag DEMO ikut dikirimi (default TIDAK)'],
    WA_BATCH_DEFAULT: ['20', 'Ukuran batch blast (10/20/50)'],
    WA_JEDA_DETIK: ['5', 'Jeda antarpesan, boleh acak "3-8"'],
    WA_DETEKSI_OTOMATIS: ['YA', 'Cek otomatis nomor kontak baru terdaftar WA'],
    EMAIL_NAMA_PENGIRIM: ['YukBanyuwangi', 'Nama pengirim email'],
    CRM_SYNC_MENIT: ['30', 'Interval sinkron otomatis CRM']
  };
  // Kunci yang boleh diubah lewat menu Pengaturan (allowlist)
  var PENGATURAN_BOLEH = Object.keys(PENGATURAN_DEFAULT).filter(function (k) { return k.indexOf('NOTIF_') !== 0 && k.indexOf('WA_') !== 0 && k !== 'CRM_SYNC_MENIT' && k !== 'EMAIL_NAMA_PENGIRIM'; });
  var MENU_DIATUR = { report: 'Report & Analitik', labarugi: 'Laba Rugi', tagihan: 'Tagihan' };

  // ==========================================================================
  // 2. REGISTRY NOTIFIKASI (pelanggan, Tim Lapang, tim internal)
  // ==========================================================================
  var NOTIF_EVENTS = {
    INVOICE_TERBIT: { label: 'Invoice terbit', target: 'Tamu', wa: true, email: true, subjek: 'Invoice {noInvoice} — {trip}',
      pesan: 'Halo {nama},\nInvoice *{noInvoice}* untuk *{trip}* ({tglTrip}) sudah terbit.\nTotal: *{total}* · Sisa pembayaran: *{sisa}*\n\nPDF invoice: {link}\n\nTerima kasih 🙏\n— {perusahaan}' },
    PENGINGAT_TAGIHAN: { label: 'Pengingat sisa tagihan', target: 'Tamu', wa: true, email: true, subjek: 'Pengingat pelunasan {trip}',
      pesan: 'Halo {nama}, pengingat ramah 🙂\nSisa pembayaran untuk *{trip}* ({tglTrip}) sebesar *{sisa}*.\nPelunasan paling lambat *{jatuhTempo}*.\n\nTransfer ke: {rekening}\n\n— {perusahaan}' },
    PEMBAYARAN_DITERIMA: { label: 'Pembayaran diterima', target: 'Tamu', wa: true, email: true, subjek: 'Pembayaran diterima — {trip}',
      pesan: 'Halo {nama},\nPembayaran *{nominal}* untuk *{trip}* sudah kami terima ✅\nSisa: *{sisa}*.\n\n— {perusahaan}' },
    LUNAS: { label: 'Pembayaran lunas', target: 'Tamu', wa: true, email: true, subjek: 'Lunas! {trip}',
      pesan: 'Terima kasih {nama}! 🎉\nPembayaran *{trip}* ({tglTrip}) sudah *LUNAS*. Sampai jumpa di Banyuwangi.\n\n— {perusahaan}' },
    TL_MANIFEST: { label: 'Manifest dikirim ke Tim Lapang', target: 'Tim Lapang', wa: true, email: true, subjek: 'Manifest {tamu} — {tglTrip}',
      pesan: 'Halo {nama},\nAnda bertugas untuk *{tamu}* — {trip} ({tglTrip}), {pax} pax.\nManifest: {link}\nUndangan Google Calendar sudah dikirim ke email Anda.\n\n— {perusahaan}' },
    TIM_REKAP_SIAP: { label: 'Tim: rekap siap dicek Finance', target: 'Finance', wa: true, email: true, subjek: 'Rekap {tamu} siap dicek',
      pesan: '🧾 Rekap *{tamu}* — {trip} ({tglTrip}) ditandai siap dicek oleh {oleh}.\nPenjualan {penjualan} · Pengeluaran {pengeluaran} · Margin {margin}{lebih}\nSilakan cek & kunci margin di menu Rekapitulasi.' },
    TIM_REKAP_DIKUNCI: { label: 'Tim: margin dikunci / dibuka', target: 'Admin', wa: true, email: false, subjek: 'Rekap {tamu} {keputusan}',
      pesan: '🔒 Rekap *{tamu}* — {trip} *{keputusan}* oleh {oleh}.\n{catatan}' }
  };

  // ==========================================================================
  // 3. UTILITAS
  // ==========================================================================
  function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function num(v) { if (typeof v === 'number') return isFinite(v) ? v : 0; var n = Number(String(v || '').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function bulat(n) { return Math.round(num(n)); }
  function salin(o) { return JSON.parse(JSON.stringify(o)); }
  function pinAcak(H) { var h = String(H.uuid()).replace(/[^0-9a-f]/gi, ''); return String(parseInt(h.slice(0, 8), 16) % 900000 + 100000); }
  function ok(data, message) { return { success: true, data: data === undefined ? null : data, message: message || '' }; }
  function fail(message, data) { return { success: false, data: data || null, message: message || 'Terjadi kesalahan.' }; }
  function salah(msg) { var e = new Error(msg); e.pengguna = true; return e; }

  // Waktu — selalu dihitung dalam WIB, terlepas dari zona waktu perangkat/server.
  function nowIso(H) { var d = H && H.now ? H.now() : new Date(); return new Date(d.getTime() + TZ_MENIT * 60000).toISOString().slice(0, 19); }
  function hariIni(H) { return nowIso(H).slice(0, 10); }
  function tgl(v) {
    if (!v) return '';
    if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? '' : new Date(v.getTime() + TZ_MENIT * 60000).toISOString().slice(0, 10);
    var s = String(v).trim(); var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
    var m2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if (m2) return m2[3] + '-' + pad(m2[2], 2) + '-' + pad(m2[1], 2);
    return s;
  }
  function tglValid(t) { return /^\d{4}-\d{2}-\d{2}$/.test(t); }
  function tambahHari(t, n) { var d = new Date(tgl(t) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function selisihHari(a, b) { return Math.round((new Date(tgl(b) + 'T00:00:00Z') - new Date(tgl(a) + 'T00:00:00Z')) / 864e5); } // b - a
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  var HARI_KE = ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima', 'Keenam', 'Ketujuh', 'Kedelapan', 'Kesembilan', 'Kesepuluh'];
  function tglId(t) { t = tgl(t); if (!tglValid(t)) return t || '-'; return Number(t.slice(8, 10)) + ' ' + BLN[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4); }
  function tglPanjang(t) { t = tgl(t); if (!tglValid(t)) return t || '-'; return Number(t.slice(8, 10)) + ' ' + BULAN[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4); }
  function tglDuaDigit(t) { t = tgl(t); if (!tglValid(t)) return t || '-'; return t.slice(8, 10) + ' ' + BULAN[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4); }
  function tglSlash(t) { t = tgl(t); if (!tglValid(t)) return t || ''; return t.slice(8, 10) + '/' + t.slice(5, 7) + '/' + t.slice(0, 4); }
  function rentangTgl(a, b) {
    a = tgl(a); b = tgl(b); if (!a) return '-'; if (!b || a === b) return tglId(a);
    if (a.slice(0, 7) === b.slice(0, 7)) return Number(a.slice(8, 10)) + '–' + tglId(b);
    if (a.slice(0, 4) === b.slice(0, 4)) return Number(a.slice(8, 10)) + ' ' + BLN[Number(a.slice(5, 7)) - 1] + ' – ' + tglId(b);
    return tglId(a) + ' – ' + tglId(b);
  }
  function labelBulan(ym) { return ym && /^\d{4}-\d{2}$/.test(ym) ? BULAN[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4) : ym || '-'; }
  function rp(n) { n = bulat(n); var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '-Rp ' : 'Rp ') + s; }
  function ribuan(n) { n = bulat(n); return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rpRingkas(n) {
    n = num(n); var a = Math.abs(n), sgn = n < 0 ? '-' : '';
    if (a >= 1e9) return sgn + 'Rp ' + (a / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace('.', ',') + ' M';
    if (a >= 1e6) return sgn + 'Rp ' + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',').replace(',0', '') + ' jt';
    if (a >= 1e3) return sgn + 'Rp ' + Math.round(a / 1e3) + ' rb';
    return rp(n);
  }
  function terbilang(n) {
    n = Math.floor(Math.abs(num(n)));
    var s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    function t(x) {
      if (x < 12) return s[x]; if (x < 20) return t(x - 10) + ' belas'; if (x < 100) return t(Math.floor(x / 10)) + ' puluh ' + t(x % 10);
      if (x < 200) return 'seratus ' + t(x - 100); if (x < 1000) return t(Math.floor(x / 100)) + ' ratus ' + t(x % 100);
      if (x < 2000) return 'seribu ' + t(x - 1000); if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu ' + t(x % 1000);
      if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta ' + t(x % 1e6); if (x < 1e12) return t(Math.floor(x / 1e9)) + ' miliar ' + t(x % 1e9);
      return t(Math.floor(x / 1e12)) + ' triliun ' + t(x % 1e12);
    }
    return n === 0 ? 'nol' : t(n).replace(/\s+/g, ' ').trim();
  }
  function hp08(v) {
    var s = String(v == null ? '' : v).trim().replace(/\.0+$/, '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
    if (!s) return ''; if (s.indexOf('62') === 0) s = '0' + s.substring(2); else if (s.indexOf('8') === 0) s = '0' + s; return s;
  }
  function hp62(v) { var s = hp08(v); return s ? (s[0] === '0' ? '62' + s.substring(1) : s) : ''; }
  function hpValid(v) { return /^08\d{7,12}$/.test(hp08(v)); }
  function emailValid(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim()); }
  function isiTemplate(tpl, v) { return String(tpl || '').replace(/\{(\w+)\}/g, function (m, k) { return v[k] == null ? '' : String(v[k]); }); }
  function inisial(nama) { return str(nama).replace(/^(PT|CV|Dr|dr|Ir|H|Hj)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || '?'; }
  function samarkanNama(n) { return str(n).split(/\s+/).map(function (w, i) { return i === 0 ? w : (w[0] || '') + '.'; }).join(' '); }
  function urutkan(arr, f, desc) { return arr.slice().sort(function (a, b) { var x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); }); }
  function jumlah(arr, f) { var s = 0; for (var i = 0; i < arr.length; i++) s += num(f ? f(arr[i]) : arr[i]); return s; }
  function kelompok(arr, k) { var o = {}; arr.forEach(function (r) { var key = typeof k === 'function' ? k(r) : r[k]; (o[key] = o[key] || []).push(r); }); return o; }
  function peta(arr, k) { var o = {}; arr.forEach(function (r) { o[r[k]] = r; }); return o; }
  function parseJson(s, d) { try { return s ? (typeof s === 'string' ? JSON.parse(s) : s) : d; } catch (e) { return d; } }
  function judulKata(s) { return str(s).toLowerCase().replace(/(^|[\s\-\/(])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function kotaNormal(s) {
    s = str(s).replace(/\s+/g, ' '); if (!s || s === '-') return '';
    s = s.replace(/^(kab\.?|kabupaten)\s+/i, 'Kab. ').replace(/^(kota)\s+/i, '');
    return judulKata(s).replace(/^Kab\. /, 'Kab. ');
  }
  function hashTeks(s) { // FNV-1a 32 bit → base36 (sidik jari baris, bukan keamanan)
    var h = 0x811c9dc5; s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return h.toString(36);
  }

  // Kontras WCAG
  function luminans(hex) {
    var h = String(hex || '').replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) return 0;
    var rgb = [0, 2, 4].map(function (i) { var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function kontras(a, b) { var la = luminans(a), lb = luminans(b); return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100; }
  function cekPalet(p) {
    var masalah = [];
    function c(x, y, min, label) { var r = kontras(x, y); if (r < min) masalah.push(label + ' ' + r + ':1 (min ' + min + ':1)'); return r; }
    var hasil = {
      teks: c(p.text, p.bg, 4.5, 'Teks utama di latar'),
      teksKartu: c(p.text, p.surface, 4.5, 'Teks utama di kartu'),
      muted: c(p.muted, p.surface, 4.5, 'Teks muted di kartu'),
      tombol: c('#FFFFFF', p.primary, 4.5, 'Teks putih di tombol primer'),
      aksen: c('#FFFFFF', p.primaryDark, 4.5, 'Teks putih di kartu gelap')
    };
    return { lulus: masalah.length === 0, masalah: masalah, rasio: hasil };
  }
  function paletAktif(S) {
    var p = parseJson(S.PALET, { preset: 'yb' }) || { preset: 'yb' };
    var dasar = PRESET_PALET[p.preset] || PRESET_PALET.yb;
    var out = {}; Object.keys(dasar).forEach(function (k) { out[k] = (p.preset === 'kustom' && p[k]) ? p[k] : dasar[k]; });
    if (p.preset === 'kustom') Object.keys(p).forEach(function (k) { if (/^#/.test(p[k])) out[k] = p[k]; });
    out.preset = p.preset || 'yb'; return out;
  }

  // ==========================================================================
  // 4. TRANSAKSI (pelacak perubahan) — semua tulis lewat sini
  // ==========================================================================
  function Tx(H, user) {
    this.H = H; this.user = user || { nama: 'Sistem', peran: 'Sistem', email: 'sistem', id: 'SYS' };
    this.ch = {}; this.rm = {}; this.jobs = []; this.nq = 0; this._hw = {}; this._S = null;
    var self = this; this.D = {};
    Object.keys(SKEMA).forEach(function (t) { Object.defineProperty(self.D, t, { get: function () { return self.all(t); }, enumerable: true }); });
  }
  Tx.prototype.all = function (t) { return this.H.db.all(t) || []; };
  Tx.prototype.get = function (t, id) { if (id === '' || id == null) return null; var k = SKEMA[t].key, s = String(id), a = this.all(t); for (var i = 0; i < a.length; i++) if (String(a[i][k]) === s) return a[i]; return null; };
  Tx.prototype.where = function (t, f) { return this.all(t).filter(f); };
  Tx.prototype._track = function (t, row) { var k = SKEMA[t].key; (this.ch[t] = this.ch[t] || {})[row[k]] = row; };
  Tx.prototype.nextId = function (t) {
    var s = SKEMA[t], pre = s.prefix + '-';
    if (s.pendek) {                                             // ID ringkas acak (dipakai di sheet klien): PSN-K7Q2MX
      var abc = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ', id;
      for (var coba = 0; coba < 20; coba++) {
        var u = String(this.H.uuid()).replace(/[^0-9a-f]/gi, ''), x = '';
        for (var i = 0; i < 6; i++) x += abc[parseInt(u.substr(i * 2, 2), 16) % abc.length];
        id = pre + x; if (!this.get(t, id)) return id;
      }
      return id;
    }
    if (s.acak) { this._seq = (this._seq || 0) + 1; var w = this.H.now ? this.H.now().getTime() : Date.now(); return pre + w.toString(36).toUpperCase() + pad((this._seq).toString(36).toUpperCase(), 2) + String(this.H.uuid()).replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase(); }
    if (this._hw[t] === undefined) {
      var mx = 0, re = new RegExp('^' + s.prefix + '-(\\d+)$');
      this.all(t).forEach(function (r) { var m = String(r[s.key]).match(re); if (m) mx = Math.max(mx, Number(m[1])); });
      this._hw[t] = mx;
    }
    this._hw[t]++; return pre + pad(this._hw[t], 4);
  };
  Tx.prototype.normal = function (t, obj, lama) {
    var s = SKEMA[t], row = {};
    s.cols.forEach(function (c) {
      var v = obj[c] !== undefined ? obj[c] : (lama ? lama[c] : undefined);
      if (v === undefined || v === null) v = ANGKA[c] ? 0 : '';
      if (ANGKA[c]) v = num(v); else if (typeof v !== 'string') v = typeof v === 'object' ? JSON.stringify(v) : String(v);
      row[c] = v;
    });
    return row;
  };
  Tx.prototype.insert = function (t, obj) {
    var row = this.normal(t, obj); var k = SKEMA[t].key;
    if (!row[k]) row[k] = this.nextId(t);
    if (!SKEMA[t].acak && this.get(t, row[k])) throw salah('ID ganda di ' + t + ': ' + row[k]);
    this.H.db.insert(t, [row]); this._track(t, row); return row;
  };
  Tx.prototype.update = function (t, id, patch) {
    var cur = this.get(t, id); if (!cur) throw salah(t + ' ' + id + ' tidak ditemukan.');
    var p = {}, s = SKEMA[t], beda = false;
    Object.keys(patch || {}).forEach(function (k) {
      if (s.cols.indexOf(k) < 0 || k === s.key) return;
      var v = patch[k]; if (v === undefined || v === null) v = ANGKA[k] ? 0 : '';
      v = ANGKA[k] ? num(v) : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      if (v !== cur[k]) { p[k] = v; beda = true; }
    });
    if (!beda) return cur;
    var row = this.H.db.update(t, s.key, id, p); this._track(t, row); return row;
  };
  Tx.prototype.upsert = function (t, obj) { var k = SKEMA[t].key; return obj[k] && this.get(t, obj[k]) ? this.update(t, obj[k], obj) : this.insert(t, obj); };
  Tx.prototype.remove = function (t, id) { if (!this.get(t, id)) return; this.H.db.remove(t, SKEMA[t].key, id); (this.rm[t] = this.rm[t] || []).push(id); if (this.ch[t]) delete this.ch[t][id]; };
  Tx.prototype.S = function () {
    if (this._S) return this._S;
    var o = {}; Object.keys(PENGATURAN_DEFAULT).forEach(function (k) { o[k] = PENGATURAN_DEFAULT[k][0]; });
    this.all('Pengaturan').forEach(function (r) { if (r.Kunci) o[r.Kunci] = r.Nilai; });
    return (this._S = o);
  };
  Tx.prototype.setS = function (k, v) { this._S = null; var cur = this.get('Pengaturan', k); if (cur) this.update('Pengaturan', k, { Nilai: v }); else this.insert('Pengaturan', { Kunci: k, Nilai: v, Keterangan: (PENGATURAN_DEFAULT[k] || ['', ''])[1] }); };
  Tx.prototype.now = function () { return nowIso(this.H); };
  Tx.prototype.today = function () { return hariIni(this.H); };
  Tx.prototype.log = function (aksi, kategori, objek, detail) {
    this.insert('Log_Aktivitas', { Waktu: this.now(), Pengguna: this.user.nama, Peran: this.user.peran, Aksi: aksi, Kategori: kategori || 'Sistem', Objek: objek || '', Detail: typeof detail === 'string' ? detail : JSON.stringify(detail || '') });
  };
  Tx.prototype.job = function (jenis, ref, payload, setelah) {
    var p = payload || {}; if (setelah && setelah.length) p.setelah = setelah;
    // Tugas sejenis untuk objek yang sama & masih antre → cukup satu (debounce)
    if (!p.setelah) { var ada = this.where('Antrean_Tugas', function (r) { return r.Jenis === jenis && r.Ref === ref && r.Status === 'Antri'; })[0]; if (ada) return ada.ID_Tugas; }
    var r = this.insert('Antrean_Tugas', { Jenis: jenis, Ref: ref, Payload: JSON.stringify(p), Status: 'Antri', Percobaan: 0, Hasil: '', Dibuat: this.now() });
    this.jobs.push(r.ID_Tugas); return r.ID_Tugas;
  };
  Tx.prototype.hasil = function (res) {
    res = res || ok();
    var ch = {}, self = this;
    Object.keys(this.ch).forEach(function (t) { var rows = Object.keys(self.ch[t]).map(function (k) { return self.ch[t][k]; }); if (rows.length) ch[t] = rows.map(function (r) { return bersihkanBaris(t, r); }); });
    res.changes = ch; res.removed = this.rm; res.jobs = this.jobs; res.nq = this.nq;
    return res;
  };
  function bersihkanBaris(t, r) { if (t !== 'Pengguna') return r; var c = {}; Object.keys(r).forEach(function (k) { if (k !== 'Hash_PIN' && k !== 'Salt') c[k] = r[k]; }); return c; }

  // ==========================================================================
  // 5. HITUNGAN MURNI (dipakai server & tampilan) — input D = {Tabel: [..]}
  // ==========================================================================
  function aturTab(S) { return parseJson(S && S.SUMBER_TAB, {}) || {}; }
  /** Bagian rekap (YB/SB) & jenis trip (Private/Open Trip) per tab — bisa diatur Admin. */
  function infoTab(S, nama) {
    var m = aturTab(S)[nama] || {}, N = normalHeader(nama);
    return {
      bagian: m.bagian === 'SB' || m.bagian === 'YB' ? m.bagian : (/(^|\s)SB(\s|$)|SUNRISE|BOAT/.test(N) ? 'SB' : 'YB'),
      jenis: m.jenis === 'Private' || m.jenis === 'Open Trip' ? m.jenis : (/PRIVATE|(^|\s)PT(\s|$)/.test(N) ? 'Private' : 'Open Trip'),
      aktif: m.aktif !== false
    };
  }
  function durasi(p) {
    var m = String(p.Trip || '').toUpperCase().match(/(\d+)\s*D\s*(\d+)\s*N/), hari = 0, label = '';
    if (m) { hari = Number(m[1]); label = m[1] + 'D' + m[2] + 'N'; }
    var a = tgl(p.Tgl_Mulai), b = tgl(p.Tgl_Selesai);
    if (!hari && tglValid(a) && tglValid(b) && b >= a) { var h = selisihHari(a, b) + 1; hari = h; label = h > 1 ? h + 'D' + (h - 1) + 'N' : '1 Hari'; }
    if (!hari) { hari = 1; label = '1 Hari'; }
    return { hari: hari, label: label };
  }
  function kodeTripDefault(p, a, b) { return [str(p.Nama), str(p.Trip)].filter(Boolean).join(' ') + (a ? ' tanggal ' + tglDuaDigit(a) + (b && b !== a ? ' - ' + tglDuaDigit(b) : '') : ''); }
  /** Ringkasan satu baris pesanan (nilai turunan untuk tampilan & laporan). */
  function infoPesanan(p, S) {
    var t = infoTab(S, p.Tab), du = durasi(p), mulai = tgl(p.Tgl_Mulai);
    var sel = tgl(p.Tgl_Selesai); if (!tglValid(sel) || sel < mulai) sel = tglValid(mulai) ? tambahHari(mulai, du.hari - 1) : '';
    var pax = num(p.Pax), harga = num(p.Harga), total = num(p.Total) || pax * harga;
    return { id: p.ID_Pesanan, tab: p.Tab, bagian: t.bagian, jenis: t.jenis, durasi: du.label, hari: du.hari, mulai: tglValid(mulai) ? mulai : '', selesai: sel,
      pax: pax, harga: harga, total: total, dp: num(p.DP), bulan: tglValid(mulai) ? mulai.slice(0, 7) : '', tglPesan: tglValid(tgl(p.Tgl_Pesan)) ? tgl(p.Tgl_Pesan) : '',
      kode: kodeTripDefault(p, mulai, sel), jadwal: rentangTgl(mulai, sel), hp: hp08(p.No_HP), email: emailValid(p.Email) ? str(p.Email).toLowerCase() : '' };
  }
  function statusTrip(inf, today) {
    if (!inf.mulai) return 'Tanpa Tanggal';
    if (today > inf.selesai) return 'Selesai';
    if (today >= inf.mulai) return 'Berjalan';
    return 'Akan Datang';
  }

  function indeks(D) {
    return {
      psn: peta(D.Pesanan || [], 'ID_Pesanan'), tab: peta(D.Sumber_Tab || [], 'Nama'), kal: peta(D.Kalkulasi || [], 'ID_Pesanan'), itemPer: kelompok(D.Kalkulasi_Item || [], 'ID_Pesanan'),
      mnf: peta(D.Manifest || [], 'ID_Pesanan'), rek: peta(D.Rekap || [], 'ID_Pesanan'), byrPer: kelompok(D.Pembayaran || [], 'ID_Pesanan'), tag: peta(D.Tagihan || [], 'ID_Pesanan'),
      invPer: kelompok(D.Invoice || [], 'ID_Pesanan'), evt: peta(D.Kalender_Event || [], 'ID_Pesanan'), tl: peta(D.Tim_Lapang || [], 'ID_TL'),
      peta: peta(D.Peta_Item || [], 'Kunci')
    };
  }

  // ---------- Kalkulasi ----------
  function kolomValid(bagian, k) { return REKAP_KOLOM[bagian].some(function (x) { return x[0] === k; }) ? k : ''; }
  function kolomCadangan(bagian) { return bagian === 'SB' ? 'LAIN' : 'LL'; }
  function tebakKolom(bagian, uraian, grup) {
    var U = normalHeader(uraian), daftar = KATA_KOLOM[bagian] || KATA_KOLOM.YB;
    if (bagian === 'YB' && grup) {                                   // item manifest → kolom mengikuti grup (sesuai catatan template rekap)
      var g = { 'MAN POWER': 'TLGUIDE', 'KONSUMSI': 'KONSUM', 'KARCIS': 'KARCIS', 'AGEN/LAIN-LAIN': 'LL', 'SERVICE': 'SERVICE' }[grup];
      if (g) return g;
    }
    for (var i = 0; i < daftar.length; i++) if (daftar[i][0].test(U)) return daftar[i][1];
    if (bagian === 'YB' && /\b(DJAWATAN|IJEN|BALURAN|GWD|PULAU MERAH|GREEN ISLAND|KARCIS|TIKET|TIKET MASUK|RETRIBUSI|WISATA)\b/.test(U)) return 'KARCIS';
    return kolomCadangan(bagian);
  }
  function tebakGrup(uraian) { var U = normalHeader(uraian); for (var i = 0; i < KATA_GRUP.length; i++) if (KATA_GRUP[i][0].test(U)) return KATA_GRUP[i][1]; return 'KARCIS'; }
  function kunciPeta(bagian, uraian) { return bagian + '|' + normalHeader(uraian); }
  /** Saran pemetaan item (diingat per nama item; kalau belum pernah → tebakan kata kunci). */
  function saranItem(ix, bagian, uraian) {
    var m = ix.peta[kunciPeta(bagian, uraian)];
    if (m) return { Ke_TL: m.Ke_TL === 'YA' ? 'YA' : 'TIDAK', Grup: m.Grup || '', Kolom: kolomValid(bagian, m.Kolom) || tebakKolom(bagian, uraian, m.Grup), diingat: true };
    var keTL = BUKAN_TL.test(normalHeader(uraian)) ? 'TIDAK' : 'YA', grup = keTL === 'YA' ? tebakGrup(uraian) : '';
    return { Ke_TL: keTL, Grup: grup, Kolom: tebakKolom(bagian, uraian, grup), diingat: false };
  }
  function ringkasKalkulasi(ix, id) {
    var items = urutkan(ix.itemPer[id] || [], function (i) { return num(i.Urutan); });
    var tl = items.filter(function (i) { return i.Ke_TL === 'YA'; }), non = items.filter(function (i) { return i.Ke_TL !== 'YA'; });
    var k = ix.kal[id] || null;
    return { ada: !!k, k: k, items: items, tl: tl, non: non, pax: k ? num(k.Pax) : 0,
      total: jumlah(items, function (i) { return i.Budget; }), totalTL: jumlah(tl, function (i) { return i.Budget; }), terimaTL: jumlah(tl, function (i) { return i.Terima_TL; }), totalNon: jumlah(non, function (i) { return i.Budget; }) };
  }

  // ---------- Rekapitulasi ----------
  function labelRekap(S) {
    var simpan = parseJson(S && S.REKAP_LABEL, {}) || {}, out = {};
    ['YB', 'SB'].forEach(function (b) {
      var s = simpan[b] || {}, L = {};
      Object.keys(REKAP_LABEL_DEFAULT[b]).forEach(function (k) { L[k] = s[k] != null && str(s[k]) !== '' ? str(s[k]) : REKAP_LABEL_DEFAULT[b][k]; });
      REKAP_KOLOM[b].forEach(function (k) { L[k[0]] = s[k[0]] != null && str(s[k[0]]) !== '' ? str(s[k[0]]) : k[1]; });
      out[b] = { L: L, kolom: REKAP_KOLOM[b].map(function (k) { return { k: k[0], l: L[k[0]] }; }) };
    });
    return out;
  }
  var JENIS_TAMBAHAN = ['Over budget', 'Non-manifest', 'Insentif', 'Penyesuaian', 'Lainnya'];
  function snapshotRekap(r) {
    return { p: { ID_Pesanan: r.id, Tab: r.p.Tab, Nama: r.p.Nama, Trip: r.p.Trip, PIC: r.p.PIC, Pax: r.inf.pax, Harga: r.inf.harga, Tgl_Mulai: r.inf.mulai, Tgl_Selesai: r.inf.selesai },
      bagian: r.bagian, kode: r.kode, kapal: r.kapal, kol: r.kol, penjualan: r.penjualan, pengeluaran: r.pengeluaran, laba: r.laba, over: r.over, budgetKalkulasi: r.budgetKalkulasi };
  }
  /** Rekap satu pesanan: kalkulasi (BUDGET) + tambahan Admin (over budget, non-manifest, insentif, penyesuaian). */
  function rekapPesanan(D, ix, p, S, today) {
    var id = p.ID_Pesanan, row = ix.rek[id] || null, status = row ? (row.Status || 'Draft') : 'Draft', kunci = status === 'Terkunci';
    var snap = kunci ? parseJson(row.Snapshot, null) : null;
    if (snap && snap.kol) {                                           // margin terkunci → angka beku (tidak berubah walau sheet/kalkulasi diedit)
      var pS = Object.assign({}, p, snap.p || {}); var infS = infoPesanan(pS, S); infS.bagian = snap.bagian || infS.bagian;
      return { id: id, p: pS, inf: infS, bagian: infS.bagian, kode: snap.kode, kapal: snap.kapal || '', kol: snap.kol, asal: null, tambahan: parseJson(row.Tambahan, []) || [], over: num(snap.over),
        penjualan: num(snap.penjualan), pengeluaran: num(snap.pengeluaran), laba: num(snap.laba), margin: num(snap.penjualan) ? num(snap.laba) / num(snap.penjualan) : 0, budgetKalkulasi: num(snap.budgetKalkulasi),
        status: status, kunci: true, row: row, adaKalkulasi: true, selesai: !!(infS.selesai && today > infS.selesai), rugi: num(snap.laba) < 0, hilangDiSheet: !ix.psn[id] };
    }
    var inf = infoPesanan(p, S), b = inf.bagian, kal = ringkasKalkulasi(ix, id), kol = {}, asal = {};
    REKAP_KOLOM[b].forEach(function (k) { kol[k[0]] = 0; asal[k[0]] = { kalkulasi: 0, tambahan: 0 }; });
    kal.items.forEach(function (i) { var k = kolomValid(b, i.Kolom) || tebakKolom(b, i.Uraian, i.Ke_TL === 'YA' ? i.Grup : ''); kol[k] += num(i.Budget); asal[k].kalkulasi += num(i.Budget); });
    var tamb = parseJson(row && row.Tambahan, []) || [], over = 0;
    tamb.forEach(function (t) { var k = kolomValid(b, t.kolom) || kolomCadangan(b); kol[k] += num(t.nominal); asal[k].tambahan += num(t.nominal); if (t.jenis === 'Over budget') over += num(t.nominal); });
    var penjualan = inf.pax * inf.harga || inf.total, pengeluaran = 0; Object.keys(kol).forEach(function (k) { pengeluaran += kol[k]; });
    var laba = penjualan - pengeluaran;
    return { id: id, p: p, inf: inf, bagian: b, kode: (row && str(row.Kode_Trip)) || inf.kode, kapal: row ? str(row.Kapal) : '', kol: kol, asal: asal, tambahan: tamb, over: over,
      penjualan: penjualan, pengeluaran: pengeluaran, laba: laba, margin: penjualan ? laba / penjualan : 0, budgetKalkulasi: kal.total,
      status: status, kunci: false, row: row, adaKalkulasi: kal.ada, selesai: !!(inf.selesai && today > inf.selesai), rugi: laba < 0, hilangDiSheet: false };
  }
  function dalamRentang(t, dari, sampai) { return !!t && (!dari || t >= dari) && (!sampai || t <= sampai); }
  /** Daftar rekap periode (berdasarkan tanggal mulai trip). opsi: {dari, sampai, bagian, S, today} */
  function rekapDaftar(D, opsi) {
    opsi = opsi || {}; var ix = indeks(D), S = opsi.S || {}, today = opsi.today || '', out = [], ada = {};
    (D.Pesanan || []).forEach(function (p) {
      var r = rekapPesanan(D, ix, p, S, today); ada[r.id] = 1;
      if ((opsi.dari || opsi.sampai) && !dalamRentang(r.inf.mulai, opsi.dari, opsi.sampai)) return;
      if (opsi.bagian && r.bagian !== opsi.bagian) return; out.push(r);
    });
    (D.Rekap || []).forEach(function (row) {                          // baris sudah dikunci tapi pesanannya hilang dari sheet → tetap dari snapshot
      if (ada[row.ID_Pesanan] || row.Status !== 'Terkunci') return;
      var snap = parseJson(row.Snapshot, null); if (!snap || !snap.p) return;
      var r = rekapPesanan(D, ix, snap.p, S, today);
      if ((opsi.dari || opsi.sampai) && !dalamRentang(r.inf.mulai, opsi.dari, opsi.sampai)) return;
      if (opsi.bagian && r.bagian !== opsi.bagian) return; out.push(r);
    });
    return urutkan(out, function (r) { return (r.inf.mulai || '9999') + '|' + r.kode; });
  }
  function totalRekap(rows) {
    var t = { n: rows.length, pax: 0, penjualan: 0, pengeluaran: 0, laba: 0, over: 0, terkunci: 0, siap: 0, rugi: 0 };
    rows.forEach(function (r) { t.pax += r.inf.pax; t.penjualan += r.penjualan; t.pengeluaran += r.pengeluaran; t.laba += r.laba; t.over += r.over; if (r.kunci) t.terkunci++; if (r.status === 'Siap Dicek') t.siap++; if (r.rugi) t.rugi++; });
    t.margin = t.penjualan ? t.laba / t.penjualan : 0; return t;
  }

  /** Periode: 'YYYY-MM' | 'YYYY' | 'Qn-YYYY' | 'semua' → {dari, sampai, label} */
  function rentangPeriode(kode, today) {
    kode = str(kode) || (today || '').slice(0, 7);
    var m;
    if ((m = kode.match(/^(\d{4})-(\d{2})$/))) { var akhir = new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate(); return { dari: kode + '-01', sampai: kode + '-' + pad(akhir, 2), label: labelBulan(kode), kode: kode }; }
    if ((m = kode.match(/^Q([1-4])-(\d{4})$/))) { var q = +m[1], b1 = (q - 1) * 3 + 1, b3 = b1 + 2, ak = new Date(Date.UTC(+m[2], b3, 0)).getUTCDate(); return { dari: m[2] + '-' + pad(b1, 2) + '-01', sampai: m[2] + '-' + pad(b3, 2) + '-' + pad(ak, 2), label: 'Kuartal ' + q + ' ' + m[2], kode: kode }; }
    if ((m = kode.match(/^(\d{4})$/))) return { dari: kode + '-01-01', sampai: kode + '-12-31', label: 'Tahun ' + kode, kode: kode };
    return { dari: '', sampai: '', label: 'Semua periode', kode: 'semua' };
  }
  function geserBulan(ym, n) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad(m + 1, 2); }

  /** Laba rugi: hanya trip yang margin-nya sudah DIKUNCI Finance + biaya operasional (input Finance). */
  function labaRugi(D, opsi) {
    opsi = opsi || {}; var S = opsi.S || {}, per = rentangPeriode(opsi.periode, opsi.today);
    var semua = rekapDaftar(D, { dari: per.dari, sampai: per.sampai, S: S, today: opsi.today });
    var final = semua.filter(function (r) { return r.kunci; }), tertunda = semua.filter(function (r) { return !r.kunci; });
    var b0 = per.dari ? per.dari.slice(0, 7) : '', b1 = per.sampai ? per.sampai.slice(0, 7) : '';
    var ops = (D.Biaya_Operasional || []).filter(function (b) { return (!b0 || b.Bulan >= b0) && (!b1 || b.Bulan <= b1); });
    var opsKat = {}; ops.forEach(function (b) { opsKat[b.Kategori || 'Lain-lain'] = (opsKat[b.Kategori || 'Lain-lain'] || 0) + num(b.Nominal); });
    var L = labelRekap(S), hpp = { YB: {}, SB: {} }, perBagian = { YB: { penjualan: 0, pengeluaran: 0, laba: 0, n: 0 }, SB: { penjualan: 0, pengeluaran: 0, laba: 0, n: 0 } };
    final.forEach(function (r) {
      var pb = perBagian[r.bagian]; pb.penjualan += r.penjualan; pb.pengeluaran += r.pengeluaran; pb.laba += r.laba; pb.n++;
      Object.keys(r.kol || {}).forEach(function (k) { hpp[r.bagian][k] = (hpp[r.bagian][k] || 0) + num(r.kol[k]); });
    });
    var perBulan = {};
    function bln(k) { return perBulan[k] = perBulan[k] || { bulan: k, penjualan: 0, pengeluaran: 0, labaKotor: 0, operasional: 0, labaBersih: 0, trip: 0 }; }
    final.forEach(function (r) { var x = bln(r.inf.bulan || 'tanpa'); x.penjualan += r.penjualan; x.pengeluaran += r.pengeluaran; x.labaKotor += r.laba; x.trip++; });
    ops.forEach(function (b) { bln(b.Bulan).operasional += num(b.Nominal); });
    Object.keys(perBulan).forEach(function (k) { perBulan[k].labaBersih = perBulan[k].labaKotor - perBulan[k].operasional; });
    var t = totalRekap(final), operasional = jumlah(ops, function (b) { return b.Nominal; });
    return { periode: per, final: final, tertunda: tertunda, ops: urutkan(ops, function (b) { return b.Bulan + (b.Tanggal || ''); }), opsKat: opsKat, hpp: hpp, label: L, perBagian: perBagian,
      perBulan: urutkan(Object.keys(perBulan).map(function (k) { return perBulan[k]; }), function (x) { return x.bulan; }),
      total: { trip: t.n, pax: t.pax, penjualan: t.penjualan, pengeluaran: t.pengeluaran, labaKotor: t.laba, operasional: operasional, labaBersih: t.laba - operasional, marginKotor: t.margin, marginBersih: t.penjualan ? (t.laba - operasional) / t.penjualan : 0, over: t.over, rugi: t.rugi },
      totalTertunda: totalRekap(tertunda) };
  }

  // ---------- Tagihan ----------
  function tagihanPesanan(D, ix, p, S, today) {
    var inf = infoPesanan(p, S), byr = urutkan(ix.byrPer[p.ID_Pesanan] || [], function (b) { return b.Tanggal; });
    var bayar = jumlah(byr, function (b) { return b.Nominal; }), terbayar = inf.dp + bayar, sisa = Math.max(0, inf.total - terbayar);
    var t = ix.tag[p.ID_Pesanan] || {}, manual = str(t.Status_Manual);
    var lunas = manual === 'Lunas' || (manual !== 'Belum Lunas' && inf.total > 0 && sisa <= 0);
    var jt = tglValid(tgl(t.Jatuh_Tempo)) ? tgl(t.Jatuh_Tempo) : inf.mulai, hari = jt ? selisihHari(today, jt) : 999;
    return { id: p.ID_Pesanan, p: p, inf: inf, total: inf.total, dp: inf.dp, bayar: bayar, terbayar: terbayar, sisa: lunas ? 0 : sisa, sisaHitung: sisa, lunas: lunas,
      status: lunas ? 'Lunas' : 'Belum Lunas', manual: manual, jatuhTempo: jt, hari: hari, telat: !lunas && sisa > 0 && hari < 0, dekat: !lunas && sisa > 0 && hari >= 0 && hari <= 7,
      pembayaran: byr, tg: t, persen: inf.total ? Math.min(100, Math.round(terbayar / inf.total * 100)) : 0, diingatkan: str(t.Terakhir_Diingatkan), nIngat: num(t.Jumlah_Pengingat) };
  }
  function tagihanDaftar(D, S, today) { var ix = indeks(D); return (D.Pesanan || []).map(function (p) { return tagihanPesanan(D, ix, p, S, today); }); }

  // ---------- Invoice ----------
  function rekeningDari(S) { return (parseJson(S.INV_REKENING, []) || []).filter(function (r) { return r && (r.bank || r.norek); }); }
  function syaratDari(S, inf) {
    var s = parseJson(S.INV_SYARAT, null); if (!Array.isArray(s)) s = SYARAT_DEFAULT;
    return s.filter(function (x) { return str(x); }).map(function (x) { return isiTemplate(x, { tglTrip: inf && inf.mulai ? tglPanjang(inf.mulai) : '(Tanggal Hari Pertama Trip)', trip: inf ? inf.durasi : '' }); });
  }
  function hitungInvoice(items, disc, dp) {
    var sub = jumlah(items, function (i) { return num(i.qty) * num(i.harga); }), total = sub - num(disc);
    return { subtotal: sub, disc: num(disc), total: total, dp: num(dp), sisa: total - num(dp) };
  }
  function dataInvoice(D, idInv, S) {
    var inv = (D.Invoice || []).filter(function (i) { return i.ID_Invoice === idInv; })[0]; if (!inv) return null;
    var p = (D.Pesanan || []).filter(function (x) { return x.ID_Pesanan === inv.ID_Pesanan; })[0] || { ID_Pesanan: inv.ID_Pesanan, Nama: '', Tab: '' };
    var inf = infoPesanan(p, S), items = parseJson(inv.Item, []) || [], h = hitungInvoice(items, inv.Disc, inv.DP);
    return { inv: inv, p: p, inf: inf, items: items, subtotal: h.subtotal, disc: h.disc, total: h.total, dp: h.dp, sisa: h.sisa, rekening: rekeningDari(S), syarat: syaratDari(S, inf),
      billTo: str(inv.Bill_To).split(/\n/).map(str).filter(Boolean), namaFile: 'Invoice_' + (str(inv.Judul) || 'Invoice').replace(/[^\w]+/g, '_') + '_No._' + inv.No_Invoice + (num(inv.Urutan) > 1 ? '_' + num(inv.Urutan) : '') };
  }
  /** Saran isian invoice baru untuk satu pesanan (nomor melanjutkan invoice pertama pesanan itu). */
  function saranInvoice(D, idPesanan, S, today) {
    var ix = indeks(D), p = ix.psn[idPesanan]; if (!p) return null;
    var inf = infoPesanan(p, S), tg = tagihanPesanan(D, ix, p, S, today);
    var lama = urutkan((ix.invPer[idPesanan] || []).filter(function (i) { return i.Status !== 'Batal'; }), function (i) { return num(i.Urutan); });
    var huruf = (str(S.INV_HURUF) || 'P').toUpperCase(), no, cid;
    if (lama.length) { no = lama[0].No_Invoice; cid = lama[0].Customer_ID; }
    else {
      var bl = today.slice(5, 7), th = today.slice(0, 4), mx = 0;
      (D.Invoice || []).forEach(function (i) { var m = String(i.No_Invoice).match(/^(\d{2})(\d{2})(\d{4})$/); if (m && m[2] === bl && m[3] === th) mx = Math.max(mx, Number(m[1])); });
      no = pad(mx + 1, 2) + bl + th;
      var thT = (inf.mulai || today).slice(0, 4), blT = Number((inf.mulai || today).slice(5, 7)), ur = 0;
      (D.Invoice || []).forEach(function (i) { var m = String(i.Customer_ID).match(/^([A-Z]+)\/(\d+)\/[IVX]+\/(\d{4})$/); if (m && m[1] === huruf && m[3] === thT) ur = Math.max(ur, Number(m[2])); });
      cid = huruf + '/' + pad(ur + 1, 3) + '/' + ROMAWI[blT - 1] + '/' + thT;
    }
    var bill = [str(p.Nama), inf.hp, inf.email, str(p.Asal)].filter(function (x) { return x && x !== '-'; }).join('\n');
    var judul = tg.lunas ? 'Pelunasan' : (tg.terbayar > 0 ? 'Deposit' : 'Tagihan DP');
    return { ID_Pesanan: idPesanan, No_Invoice: no, Customer_ID: cid, Urutan: lama.length ? num(lama[lama.length - 1].Urutan) + 1 : 1, Judul: judul, Tanggal: today, Bill_To: bill,
      Item: [{ desk: str(p.Trip) + (inf.mulai ? ' (' + inf.jadwal + ')' : ''), qty: inf.pax || 1, harga: inf.harga || inf.total }], Disc: 0, DP: tg.terbayar,
      Note_Judul: tg.lunas ? 'LUNAS' : (tg.terbayar > 0 ? (S.INV_NOTE_JUDUL || 'Deposit LUNAS') : 'Menunggu DP'), Note_Isi: S.INV_NOTE_TEKS || '' };
  }

  // ---------- Manifest ----------
  function checklistDefault(p) {
    var c = parseJson(p.Checklist, {}) || {};
    return Object.keys(c).filter(function (k) { var v = str(c[k]); return v && v !== '-'; }).map(function (k) { return { item: judulKata(k), detail: str(c[k]) }; });
  }
  /** Teks itinerary (Google Docs / ketikan) → [{judul, baris:[{jam, teks}]}] */
  function parseItinerary(teks, mulai) {
    var s = String(teks || '').replace(/\r\n?/g, '\n').replace(/\u000b/g, '\n')
      .replace(/([^\s\d:.])((?:[01]?\d|2[0-3])[:.][0-5]\d\s)/g, '$1\n$2');      // "Pertama07:00 …" → baris baru
    var hari = [], cur = null, reHari = /^(hari\s+(ke-?\s*\d+|pertama|kedua|ketiga|keempat|kelima|keenam|ketujuh|kedelapan|kesembilan|kesepuluh)|day\s*\d+)\b/i;
    s.split('\n').forEach(function (ln) {
      ln = ln.replace(/\s+/g, ' ').trim(); if (!ln) return;
      if (reHari.test(ln)) { cur = { judul: ln, baris: [] }; hari.push(cur); return; }
      var m = ln.match(/^((?:[01]?\d|2[0-3])[:.][0-5]\d)\s*[-–]?\s*(.*)$/);
      if (!cur) { cur = { judul: '', baris: [] }; hari.push(cur); }
      if (m) cur.baris.push({ jam: m[1], teks: m[2] });
      else if (cur.baris.length) cur.baris[cur.baris.length - 1].teks += ' ' + ln;
      else cur.baris.push({ jam: '', teks: ln });
    });
    hari.forEach(function (h, i) {
      if (!h.judul) h.judul = 'Hari ' + (HARI_KE[i] || 'ke-' + (i + 1));
      if (!/\(/.test(h.judul) && tglValid(mulai)) h.judul += ' (' + tglPanjang(tambahHari(mulai, i)) + ')';
    });
    return hari.filter(function (h) { return h.baris.length || h.judul; });
  }
  function dataManifest(D, idPesanan, S) {
    var ix = indeks(D), p = ix.psn[idPesanan]; if (!p) return null;
    var inf = infoPesanan(p, S), m = ix.mnf[idPesanan] || {}, kal = ringkasKalkulasi(ix, idPesanan);
    var tl = parseJson(m.TL, []) || [], cekP = parseJson(p.Checklist, {}) || {};
    var namaTL = tl.map(function (x) { return x.nama; }).filter(Boolean).join(', ') || str(cekP.GUIDE) || '';
    var tamuS = parseJson(m.Data_Tamu, null) || {};
    var tamu = { nama: tamuS.nama || str(p.Nama), pax: tamuS.pax || inf.pax, hp: tamuS.hp || inf.hp || str(p.No_HP), jemput: tamuS.jemput || str(p.Penjemputan), drop: tamuS.drop || str(p.Lokasi_Drop) };
    var cek = parseJson(m.Checklist, null); if (!Array.isArray(cek)) cek = checklistDefault(p);
    var catatan = String(m.Catatan != null && m.ID_Pesanan ? m.Catatan : (S.MNF_CATATAN_DEFAULT || '')).split('\n').map(function (x) { return x.replace(/^\s*\d+[.)]\s*/, '').trim(); }).filter(Boolean);
    var grup = GRUP_TL.map(function (g) { return { grup: g, items: kal.tl.filter(function (i) { return (GRUP_TL.indexOf(i.Grup) > -1 ? i.Grup : 'AGEN/LAIN-LAIN') === g; }) }; }).filter(function (g) { return g.items.length; });
    return { p: p, inf: inf, m: m, ada: !!m.ID_Pesanan, pic: str(m.PIC_Kantor) || str(S.MNF_PIC_DEFAULT) || str(p.PIC), tl: tl, namaTL: namaTL, durasi: str(m.Durasi) || inf.durasi, tamu: tamu,
      cek: cek, catatan: catatan, itinTeks: str(m.Itinerary), itin: parseItinerary(m.Itinerary, inf.mulai), peserta: (parseJson(m.Peserta, []) || []).filter(function (x) { return x && str(x.nama); }),
      budget: { pax: kal.pax || inf.pax, grup: grup, items: kal.tl, total: kal.totalTL, terima: kal.terimaTL, ada: kal.tl.length > 0 }, tampilBudget: m.Tampil_Budget !== 'TIDAK',
      status: m.Status || 'Belum Dibuat', namaFile: (str(tamu.nama) + ' ' + rentangTglFile(inf.mulai, inf.selesai) + (namaTL ? '_' + namaTL.split(',')[0].trim() : '')).toUpperCase().replace(/[\\\/:*?"<>|]+/g, '-') };
  }
  function rentangTglFile(a, b) {
    if (!a) return ''; var A = Number(a.slice(8, 10)), B = b ? Number(b.slice(8, 10)) : A;
    if (!b || a === b) return A + ' ' + BULAN[Number(a.slice(5, 7)) - 1] + ' ' + a.slice(0, 4);
    if (a.slice(0, 7) === b.slice(0, 7)) return A + '-' + B + ' ' + BULAN[Number(a.slice(5, 7)) - 1] + ' ' + a.slice(0, 4);
    return tglPanjang(a) + '-' + tglPanjang(b);
  }

  // ---------- Kalender (event per nama tamu) ----------
  function eventPesanan(D, ix, p, S) {
    var inf = infoPesanan(p, S); if (!inf.mulai) return null;
    var m = ix.mnf[p.ID_Pesanan] || {}, tl = parseJson(m.TL, []) || [], peserta = (parseJson(m.Peserta, []) || []).filter(function (x) { return x && str(x.nama); });
    var undang = parseJson(m.Diundang, []) || [];
    var d = ['Tamu: ' + str(p.Nama) + ' (' + inf.pax + ' pax)', 'Trip: ' + str(p.Trip) + ' · ' + inf.durasi, 'Jadwal: ' + inf.jadwal, 'Kategori: ' + str(p.Tab)];
    if (str(p.PIC)) d.push('PIC: ' + str(p.PIC));
    if (inf.hp) d.push('No HP: ' + inf.hp);
    if (str(p.Penjemputan) && str(p.Penjemputan) !== '-') d.push('Penjemputan: ' + str(p.Penjemputan));
    if (str(p.Lokasi_Drop) && str(p.Lokasi_Drop) !== '-') d.push('Drop: ' + str(p.Lokasi_Drop));
    if (str(p.Asal)) d.push('Asal: ' + str(p.Asal));
    if (tl.length) d.push('Tim Lapang: ' + tl.map(function (x) { return x.nama; }).join(', '));
    var cek = checklistDefault(p); if (cek.length) d.push('Kebutuhan: ' + cek.map(function (c) { return c.item + ' ' + c.detail; }).join(' · '));
    if (peserta.length) { d.push(''); d.push('Peserta (' + peserta.length + '):'); peserta.forEach(function (x, i) { d.push((i + 1) + '. ' + str(x.nama) + (x.hp ? ' · ' + hp08(x.hp) : '')); }); }
    if (m.Link_PDF) { d.push(''); d.push('Manifest: ' + m.Link_PDF); }
    d.push(''); d.push('ID: ' + p.ID_Pesanan + ' · dibuat otomatis oleh ' + (S.APP_NAMA || 'aplikasi'));
    var ev = { id: p.ID_Pesanan, judul: str(p.Nama) + ' · ' + str(p.Trip), deskripsi: d.join('\n'), mulai: inf.mulai, selesai: inf.selesai, warna: inf.bagian === 'SB' ? '6' : '7',
      lampiran: m.File_ID ? { fileId: m.File_ID, url: m.Link_PDF, judul: 'Manifest ' + str(p.Nama) + '.pdf' } : null, tamu: undang };
    ev.hash = hashTeks(JSON.stringify([ev.judul, ev.deskripsi, ev.mulai, ev.selesai, ev.warna, ev.lampiran && ev.lampiran.fileId, ev.tamu]));
    return ev;
  }

  // ---------- Report & analitik ----------
  function hitungGrup(rows, kunciFn) {
    var o = {}; rows.forEach(function (r) { var k = kunciFn(r); if (!k) return; var x = o[k] = o[k] || { label: k, n: 0, pax: 0, total: 0 }; x.n++; x.pax += r.pax; x.total += r.total; });
    return Object.keys(o).map(function (k) { return o[k]; });
  }
  /** opsi: {bulan:'YYYY-MM', basis:'trip'|'pesan', tab:'', S, today} */
  function report(D, opsi) {
    opsi = opsi || {}; var S = opsi.S || {}, bln = opsi.bulan || (opsi.today || '').slice(0, 7);
    var semua = (D.Pesanan || []).map(function (p) { var i = infoPesanan(p, S); i.p = p; return i; }).filter(function (i) { return !opsi.tab || i.tab === opsi.tab; });
    var diTrip = semua.filter(function (i) { return i.bulan === bln; }), diPesan = semua.filter(function (i) { return i.tglPesan.slice(0, 7) === bln; });
    var dasar = opsi.basis === 'pesan' ? diPesan : diTrip, tren = [];
    for (var k = -11; k <= 0; k++) {
      var b = geserBulan(bln, k), t = semua.filter(function (i) { return i.bulan === b; }), ps = semua.filter(function (i) { return i.tglPesan.slice(0, 7) === b; });
      tren.push({ bulan: b, pax: jumlah(t, function (i) { return i.pax; }), trip: t.length, pesan: ps.length, penjualan: jumlah(t, function (i) { return i.total; }) });
    }
    var hariBln = new Date(Date.UTC(+bln.slice(0, 4), +bln.slice(5, 7), 0)).getUTCDate(), perHari = [];
    for (var h = 1; h <= hariBln; h++) perHari.push({ hari: h, n: 0, pax: 0 });
    diPesan.forEach(function (i) { var x = perHari[Number(i.tglPesan.slice(8, 10)) - 1]; if (x) { x.n++; x.pax += i.pax; } });
    var kota = urutkan(hitungGrup(dasar, function (i) { return kotaNormal(i.p.Asal) || 'Tidak diisi'; }), function (x) { return x.pax * 1000 + x.n; }, true);
    var sumber = urutkan(hitungGrup(dasar, function (i) { var s = str(i.p.Sumber_Info); return !s || s === '-' ? 'Tidak diisi' : judulKata(s); }), function (x) { return x.n; }, true);
    var dur = urutkan(hitungGrup(dasar, function (i) { return i.durasi; }), function (x) { return x.n * 1000 + x.pax; }, true);
    var paket = urutkan(hitungGrup(dasar.filter(function (i) { return i.jenis === 'Open Trip'; }), function (i) { return str(i.p.Trip).replace(/\s+/g, ' '); }), function (x) { return x.n * 1000 + x.pax; }, true);
    var lalu = semua.filter(function (i) { return i.bulan === geserBulan(bln, -1); }), laluPesan = semua.filter(function (i) { return i.tglPesan.slice(0, 7) === geserBulan(bln, -1); });
    return { bulan: bln, label: labelBulan(bln), basis: opsi.basis === 'pesan' ? 'pesan' : 'trip',
      pax: { total: jumlah(diTrip, function (i) { return i.pax; }), trip: diTrip.length, lalu: jumlah(lalu, function (i) { return i.pax; }), penjualan: jumlah(diTrip, function (i) { return i.total; }),
        perTab: urutkan(hitungGrup(diTrip, function (i) { return i.tab; }), function (x) { return x.pax; }, true) },
      frekuensi: { total: diPesan.length, pax: jumlah(diPesan, function (i) { return i.pax; }), lalu: laluPesan.length, perHari: perHari, tanpaTanggal: semua.filter(function (i) { return !i.tglPesan; }).length },
      kota: kota.slice(0, 10), kotaJumlah: kota.length, sumber: sumber, durasi: dur, paket: paket.slice(0, 10), tren: tren, n: dasar.length };
  }

  // ---------- Dashboard ----------
  function dashboard(D, opsi) {
    opsi = opsi || {}; var S = opsi.S || {}, today = opsi.today, bln = today.slice(0, 7), ix = indeks(D);
    var semua = (D.Pesanan || []).map(function (p) { var i = infoPesanan(p, S); i.p = p; i.status = statusTrip(i, today); return i; });
    var bulanIni = semua.filter(function (i) { return i.bulan === bln; }), lalu = semua.filter(function (i) { return i.bulan === geserBulan(bln, -1); });
    var tg = tagihanDaftar(D, S, today), belum = tg.filter(function (t) { return !t.lunas && t.sisa > 0 && t.inf.mulai >= tambahHari(today, -60); });
    var rk = rekapDaftar(D, { S: S, today: today }), aksi = [];
    semua.forEach(function (i) {
      if (!i.mulai) return; var h = selisihHari(today, i.mulai);
      if (h >= 0 && h <= 21 && !ix.kal[i.id]) aksi.push({ jenis: 'kalkulasi', i: i, h: h, label: 'Kalkulasi budget belum dibuat', go: 'kalkulasi/' + i.id, peran: 'Admin' });
      var m = ix.mnf[i.id]; if (h >= 0 && h <= 7 && (!m || m.Status !== 'Terbit')) aksi.push({ jenis: 'manifest', i: i, h: h, label: m && m.Status === 'Berubah' ? 'Manifest berubah, perlu terbit ulang' : 'Manifest belum diterbitkan', go: 'manifest/' + i.id, peran: 'Admin' });
    });
    rk.forEach(function (r) {
      if (!r.kunci && r.selesai && r.status === 'Draft' && r.inf.mulai >= tambahHari(today, -45)) aksi.push({ jenis: 'rekap', i: r.inf, r: r, h: selisihHari(today, r.inf.selesai), label: 'Trip selesai — lengkapi rekap lalu ajukan', go: 'rekap?id=' + r.id, peran: 'Admin' });
      if (r.status === 'Siap Dicek') aksi.push({ jenis: 'kunci', i: r.inf, r: r, h: 0, label: 'Rekap siap dicek — kunci margin', go: 'rekap?id=' + r.id, peran: 'Finance' });
    });
    tg.forEach(function (t) { if (t.telat || (t.dekat && t.hari <= 3)) aksi.push({ jenis: 'tagihan', i: t.inf, t: t, h: t.hari, label: t.telat ? 'Tagihan lewat jatuh tempo' : 'Pelunasan jatuh tempo H-' + t.hari, go: 'tagihan?id=' + t.id, peran: 'Finance' }); });
    var tren = []; for (var k = -5; k <= 0; k++) {
      var b = geserBulan(bln, k), rows = rk.filter(function (r) { return r.inf.bulan === b; });
      tren.push({ label: BLN[Number(b.slice(5, 7)) - 1], bulan: b, a: jumlah(rows, function (r) { return r.penjualan; }), b: jumlah(rows, function (r) { return r.pengeluaran; }), kini: k === 0, final: rows.filter(function (r) { return r.kunci; }).length, n: rows.length });
    }
    var rkBln = rk.filter(function (r) { return r.inf.bulan === bln; });
    return {
      bulan: bln, pesanan: bulanIni.length, pax: jumlah(bulanIni, function (i) { return i.pax; }), paxLalu: jumlah(lalu, function (i) { return i.pax; }),
      penjualan: jumlah(bulanIni, function (i) { return i.total; }), penjualanLalu: jumlah(lalu, function (i) { return i.total; }),
      pesananBaru: semua.filter(function (i) { return i.tglPesan && i.tglPesan >= tambahHari(today, -29); }).length,
      sisaTagihan: jumlah(belum, function (t) { return t.sisa; }), belumLunas: belum.length, telat: belum.filter(function (t) { return t.telat; }).length,
      marginBulan: totalRekap(rkBln), terkunciBulan: rkBln.filter(function (r) { return r.kunci; }).length,
      siapDicek: rk.filter(function (r) { return r.status === 'Siap Dicek'; }).length, rugi: rk.filter(function (r) { return r.rugi && r.inf.mulai >= tambahHari(today, -90); }),
      aksi: urutkan(aksi, function (a) { return a.h; }), tren: tren,
      mendatang: urutkan(semua.filter(function (i) { return i.mulai && i.selesai >= today; }), function (i) { return i.mulai + i.p.Nama; }).slice(0, 10),
      berjalan: semua.filter(function (i) { return i.status === 'Berjalan'; })
    };
  }

  function verifikasiPublik(D, kode) {
    kode = str(kode).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (kode.length < 8) return fail('Kode verifikasi tidak valid.');
    var inv = (D.Invoice || []).filter(function (i) { return str(i.Kode_Verifikasi).toUpperCase() === kode; })[0];
    if (!inv || inv.Status === 'Draft') return fail('Dokumen dengan kode ' + kode + ' tidak ditemukan.');
    var S = {}; (D.Pengaturan || []).forEach(function (r) { S[r.Kunci] = r.Nilai; });
    var d = dataInvoice(D, inv.ID_Invoice, S);
    return ok({ sah: inv.Status !== 'Batal', jenis: inv.Judul || 'Invoice', status: inv.Status, noInvoice: inv.No_Invoice, tglTerbit: tglPanjang(inv.Tanggal), customer: samarkanNama(d.p.Nama || (d.billTo[0] || '')),
      trip: str(d.p.Trip), jadwal: d.inf.jadwal, nominal: rp(d.total) });
  }

  /**
   * Tata letak rekap PERSIS template "Dummy Rekapitulasi" (dipakai penulis Google Sheet di server
   * dan ekspor Excel di browser agar hasilnya identik). Hasil: {sel:[{r,c,v,f,g}], gabung:[[r1,c1,r2,c2]], lebar:[]}.
   * g (gaya): judul | kO (kepala oranye) | kP (kepala peach) | kH (kepala hijau) | kG (hijau muda) | kK (kuning) | kM (merah) | kW (putih tebal)
   *           | no | teks | angka | uang | uangH (uang latar hijau) | persen
   */
  function tataRekap(data, L) {
    var sel = [], gabung = [], blok = [], r = 0;
    function put(rr, c, v, g, f) { sel.push({ r: rr, c: c, v: v == null ? '' : v, g: g || 'teks', f: f || '' }); }
    function A1(c, rr) { return String.fromCharCode(65 + c) + (rr + 1); }
    ['YB', 'SB'].forEach(function (b) {
      var lb = L[b].L, kol = L[b].kolom, rows = (data && data[b]) || [], h1, h2, yb = b === 'YB';
      put(r, 0, lb.JUDUL, 'judul'); gabung.push([r, 0, r, 1]); r += 2; h1 = r; h2 = r + 1;
      [[0, lb.NO], [1, lb.KODE], [2, lb.QTY], [3, lb.PIC], [4, lb.PRICE]].forEach(function (x) { put(h1, x[0], x[1], 'kO'); put(h2, x[0], '', 'kO'); gabung.push([h1, x[0], h2, x[0]]); });
      put(h1, 5, lb.PENJUALAN, yb ? 'kH' : 'kG'); put(h2, 5, '', yb ? 'kH' : 'kG'); gabung.push([h1, 5, h2, 5]);
      var adaHpp = !!str(lb.HPP), warnaSB = ['kP', 'kO', 'kO', 'kO', 'kO', 'kP', 'kO', 'kO', 'kP', 'kO'];
      if (adaHpp) { put(h1, 6, lb.HPP, 'kW'); for (var c = 7; c <= 15; c++) put(h1, c, '', 'kW'); gabung.push([h1, 6, h1, 15]); kol.forEach(function (k, i) { put(h2, 6 + i, k.l, 'kP'); }); }
      else kol.forEach(function (k, i) { var g = yb ? 'kP' : warnaSB[i]; put(h1, 6 + i, k.l, g); put(h2, 6 + i, '', g); gabung.push([h1, 6 + i, h2, 6 + i]); });
      put(h1, 16, lb.PENGELUARAN, yb ? 'kH' : 'kM'); put(h2, 16, '', yb ? 'kH' : 'kM'); gabung.push([h1, 16, h2, 16]);
      put(h1, 17, lb.LABA, yb ? 'kO' : 'kK'); put(h2, 17, '', yb ? 'kO' : 'kK'); gabung.push([h1, 17, h2, 17]);
      put(h1, 18, lb.MARGIN_A, yb ? 'kO' : 'kK'); put(h2, 18, lb.MARGIN_B, yb ? 'kO' : 'kK');
      put(h1, 19, lb.RATAAN_A, yb ? 'kO' : 'kK'); put(h2, 19, lb.RATAAN_B, yb ? 'kO' : 'kK');
      r += 2;
      rows.forEach(function (x, i) {
        var rr = r + i;
        put(rr, 0, i + 1, 'no'); put(rr, 1, x.kode, 'teks'); put(rr, 2, x.qty, 'angka'); put(rr, 3, x.pic, 'teks'); put(rr, 4, x.price, 'uang');
        put(rr, 5, num(x.qty) * num(x.price), 'uang', '=' + A1(2, rr) + '*' + A1(4, rr));
        var peng = 0; kol.forEach(function (k, j) { var v = num((x.kol || {})[k.k]); peng += v; put(rr, 6 + j, v || '', 'uang'); });
        var jual = num(x.qty) * num(x.price), laba = jual - peng;
        put(rr, 16, peng, 'uangH', '=SUM(' + A1(6, rr) + ':' + A1(15, rr) + ')');
        put(rr, 17, laba, 'uang', '=' + A1(5, rr) + '-' + A1(16, rr));
        put(rr, 18, laba, 'uang', '=' + A1(17, rr));
        put(rr, 19, jual ? laba / jual : 0, 'persen', '=IFERROR(' + A1(18, rr) + '/' + A1(5, rr) + ',0)');
      });
      blok.push([h1, r + Math.max(rows.length, 1) - 1]);
      r += Math.max(rows.length, 1) + 3;
    });
    return { sel: sel, gabung: gabung, blok: blok, baris: r, kolom: 20, lebar: [5, 70, 7, 13, 12, 14, 13, 12, 12, 13, 12, 12, 12, 12, 12, 12, 15, 15, 14, 10] };
  }

  // ==========================================================================
  // 6. AKSI (API) — setiap fungsi (tx, data) → ok/fail
  // ==========================================================================
  var A = {};
  var FIELD_PESANAN = ['No', 'Nama', 'PIC', 'No_HP', 'Pax', 'Trip', 'Tgl_Mulai', 'Tgl_Selesai', 'Asal', 'Sumber_Info', 'Email', 'Instagram', 'Penjemputan', 'Lokasi_Drop', 'Harga', 'Total', 'DP', 'Sisa', 'Setoran', 'Link_Bukti_TF', 'Link_Itinerary', 'Link_Kalkulasi', 'Tgl_Pesan'];
  function kolomTab(tx, tab) { var t = tx.get('Sumber_Tab', tab); if (!t) throw salah('Kategori "' + tab + '" tidak ada di spreadsheet sumber. Muat ulang data lalu coba lagi.'); return parseJson(t.Kolom, []) || []; }
  function pesananAda(tx, id) { var p = tx.get('Pesanan', id); if (!p) throw salah('Pesanan tidak ditemukan di spreadsheet sumber (mungkin baris sudah dihapus). Muat ulang data.'); return p; }
  function rekapTerkunci(tx, id) { var r = tx.get('Rekap', id); return !!(r && r.Status === 'Terkunci'); }
  function jobRekapSheet(tx, inf) { if (inf && inf.bulan && tx.S().REKAP_SHEET_AKTIF === 'YA') tx.job('REKAP_SHEET', inf.bulan, {}); }
  function jobKalender(tx) { tx.job('KAL_SINKRON', 'semua', {}); }

  // ---------- Pesanan (ditulis ke spreadsheet klien oleh host) ----------
  A['pesanan.simpan'] = function (tx, d) {
    var lama = d.ID_Pesanan ? tx.get('Pesanan', d.ID_Pesanan) : null;
    if (d.ID_Pesanan && !lama) throw salah('Pesanan tidak ditemukan di sheet (mungkin baru dihapus). Muat ulang data.');
    var tab = lama ? lama.Tab : str(d.Tab); if (!tab) throw salah('Pilih kategori (tab) pesanan.');
    if (lama && d.Tab && d.Tab !== lama.Tab) throw salah('Kategori tidak bisa dipindah. Hapus lalu buat pesanan baru di kategori tujuan.');
    var kol = kolomTab(tx, tab), punya = {}, labelLain = {}, labelCek = {};
    kol.forEach(function (k) { if (k.kunci) punya[k.kunci] = 1; else if (k.grup && /CHECK|CEK/.test(normalHeader(k.grup))) labelCek[k.label] = 1; else labelLain[k.label] = 1; });
    var nama = str(d.Nama); if (!nama) throw salah('Nama wajib diisi.');
    var pax = num(d.Pax); if (punya.Pax && pax <= 0) throw salah('PAX minimal 1.');
    var mulai = tgl(d.Tgl_Mulai); if (punya.Tgl_Mulai && !tglValid(mulai)) throw salah('Tanggal trip wajib diisi.');
    var sel = tgl(d.Tgl_Selesai); if (sel && !tglValid(sel)) sel = '';
    if (sel && mulai && sel < mulai) throw salah('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    var hp = str(d.No_HP); if (hp && hp !== '-' && !hpValid(hp)) throw salah('Nomor HP tidak valid (contoh: 0812xxxxxxxx).');
    var email = str(d.Email); if (email && email !== '-' && !emailValid(email)) throw salah('Format email tidak valid.');
    var harga = num(d.Harga), dp = num(d.DP); if (harga < 0 || dp < 0) throw salah('Harga dan DP tidak boleh negatif.');
    var row = { Tab: tab };
    FIELD_PESANAN.forEach(function (f) { row[f] = punya[f] ? (d[f] == null ? '' : d[f]) : ''; });
    row.Nama = nama; row.Pax = punya.Pax ? pax : ''; row.Tgl_Mulai = mulai; row.Tgl_Selesai = punya.Tgl_Selesai ? sel : '';
    row.No_HP = hp && hp !== '-' ? hp08(hp) : hp; row.Email = email; row.Harga = punya.Harga ? harga : ''; row.DP = punya.DP ? dp : '';
    row.Tgl_Pesan = tgl(d.Tgl_Pesan) || (lama ? lama.Tgl_Pesan : tx.today());
    if (punya.Total) row.Total = pax * harga; if (punya.Sisa) row.Sisa = pax * harga - dp;   // rumus asli di sheet tetap dipakai; ini nilai tampilan instan
    if (punya.Setoran) row.Setoran = num(d.Setoran) || '';
    var cek = {}, lain = {}, dc = d.Checklist || {}, dl = d.Lain || {};
    Object.keys(labelCek).forEach(function (l) { cek[l] = str(dc[l]); });
    Object.keys(labelLain).forEach(function (l) { lain[l] = str(dl[l]); });
    row.Checklist = JSON.stringify(cek); row.Lain = JSON.stringify(lain);
    var hasil;
    if (lama) { hasil = tx.update('Pesanan', lama.ID_Pesanan, row); tx.log('Ubah pesanan', 'Pesanan', hasil.ID_Pesanan, tab + ' · ' + nama); }
    else { row.Rumus = ''; row.H = ''; hasil = tx.insert('Pesanan', row); tx.log('Tambah pesanan', 'Pesanan', hasil.ID_Pesanan, tab + ' · ' + nama + ' · ' + pax + ' pax'); }
    var inf = infoPesanan(hasil, tx.S());
    if (rekapTerkunci(tx, hasil.ID_Pesanan)) tx.log('Peringatan: pesanan diubah setelah margin dikunci', 'Rekap', hasil.ID_Pesanan, 'Angka rekap terkunci tidak berubah');
    crmUpsertPesanan(tx, hasil);
    jobKalender(tx); jobRekapSheet(tx, inf);
    if (lama) { var infL = infoPesanan(lama, tx.S()); if (infL.bulan !== inf.bulan) jobRekapSheet(tx, infL); }
    return ok(hasil, (lama ? 'Perubahan' : 'Pesanan baru') + ' tersimpan ke Google Sheets · tab ' + tab + '.');
  };
  A['pesanan.hapus'] = function (tx, d) {
    var p = pesananAda(tx, d.id), inv = tx.where('Invoice', function (i) { return i.ID_Pesanan === p.ID_Pesanan && i.Status === 'Terbit'; });
    if (inv.length && !d.paksa) throw salah('Pesanan ini sudah punya ' + inv.length + ' invoice terbit. Batalkan invoice dulu atau centang hapus paksa.');
    if (rekapTerkunci(tx, p.ID_Pesanan) && !d.paksa) throw salah('Margin pesanan ini sudah dikunci Finance — data rekap tetap disimpan. Centang hapus paksa untuk tetap menghapus baris di sheet.');
    var inf = infoPesanan(p, tx.S());
    tx.remove('Pesanan', p.ID_Pesanan);
    tx.where('Kalkulasi_Item', function (i) { return i.ID_Pesanan === p.ID_Pesanan; }).forEach(function (i) { tx.remove('Kalkulasi_Item', i.ID_Item); });
    tx.remove('Kalkulasi', p.ID_Pesanan); tx.remove('Manifest', p.ID_Pesanan); tx.remove('Tagihan', p.ID_Pesanan);
    if (!rekapTerkunci(tx, p.ID_Pesanan)) tx.remove('Rekap', p.ID_Pesanan);
    jobKalender(tx); jobRekapSheet(tx, inf);
    tx.log('Hapus pesanan (baris sheet)', 'Pesanan', p.ID_Pesanan, p.Tab + ' · ' + p.Nama);
    return ok({ id: p.ID_Pesanan }, 'Baris pesanan dihapus dari Google Sheets.');
  };

  // ---------- Kalkulasi budget ----------
  A['kalkulasi.simpan'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), S = tx.S(), inf = infoPesanan(p, S), b = inf.bagian;
    if (rekapTerkunci(tx, p.ID_Pesanan)) throw salah('Margin trip ini sudah dikunci Finance. Minta Finance membuka kunci dulu.');
    var pax = Math.round(num(d.Pax)) || inf.pax || 1;
    var items = (d.items || []).filter(function (i) { return str(i.Uraian); });
    if (!items.length) throw salah('Isi minimal satu item kalkulasi.');
    if (items.length > 120) throw salah('Maksimal 120 item per kalkulasi.');
    tx.where('Kalkulasi_Item', function (i) { return i.ID_Pesanan === p.ID_Pesanan; }).forEach(function (i) { tx.remove('Kalkulasi_Item', i.ID_Item); });
    var now = tx.now(), totTL = 0, tot = 0;
    items.forEach(function (it, n) {
      var tetap = num(it.Tetap), perPax = num(it.Per_Pax), budget = Math.round(tetap + perPax * pax);
      if (budget < 0) throw salah('Budget "' + str(it.Uraian) + '" tidak boleh negatif.');
      var keTL = it.Ke_TL === 'YA' || it.Ke_TL === true ? 'YA' : 'TIDAK';
      var grup = keTL === 'YA' ? (GRUP_TL.indexOf(it.Grup) > -1 ? it.Grup : tebakGrup(it.Uraian)) : '';
      var kolom = kolomValid(b, it.Kolom) || tebakKolom(b, it.Uraian, grup);
      var terima = keTL === 'YA' ? (it.Terima_TL === '' || it.Terima_TL == null ? budget : Math.max(0, Math.round(num(it.Terima_TL)))) : 0;
      tx.insert('Kalkulasi_Item', { ID_Pesanan: p.ID_Pesanan, Uraian: str(it.Uraian).toUpperCase(), Tetap: tetap, Per_Pax: perPax, Budget: budget, Terima_TL: terima, Ke_TL: keTL, Grup: grup, Kolom: kolom, Asal: str(it.Asal) || 'Manual', Urutan: n + 1 });
      var kp = kunciPeta(b, it.Uraian), m = { Kunci: kp, Uraian: str(it.Uraian).toUpperCase(), Bagian: b, Ke_TL: keTL, Grup: grup, Kolom: kolom, Diperbarui: now };
      if (tx.get('Peta_Item', kp)) tx.update('Peta_Item', kp, m); else tx.insert('Peta_Item', m);   // diingat untuk kalkulasi berikutnya
      tot += budget; if (keTL === 'YA') totTL += budget;
    });
    var k = { ID_Pesanan: p.ID_Pesanan, Sumber: ['CS', 'Paket', 'Manual'].indexOf(d.Sumber) > -1 ? d.Sumber : 'Manual', Link_CS: str(d.Link_CS), Pax: pax, Paket: str(d.Paket), Catatan: str(d.Catatan), Diperbarui: now };
    if (tx.get('Kalkulasi', p.ID_Pesanan)) tx.update('Kalkulasi', p.ID_Pesanan, k); else { k.Dibuat_Oleh = tx.user.nama; tx.insert('Kalkulasi', k); }
    if (d.simpanPaket) A['paket.simpan'](tx, { Nama: str(d.namaPaket) || str(p.Trip), Bagian: b, items: items, Catatan: 'Dari kalkulasi ' + p.Nama });
    var mnf = tx.get('Manifest', p.ID_Pesanan); if (mnf && mnf.Status === 'Terbit') tx.update('Manifest', p.ID_Pesanan, { Status: 'Berubah', Diperbarui: now });
    jobRekapSheet(tx, inf);
    tx.log('Simpan kalkulasi budget', 'Kalkulasi', p.ID_Pesanan, p.Nama + ' · ' + items.length + ' item · ' + rp(tot) + ' (ke TL ' + rp(totTL) + ')');
    return ok({ total: tot, totalTL: totTL }, 'Kalkulasi tersimpan · total ' + rp(tot) + ' · masuk manifest TL ' + rp(totTL) + '.');
  };
  A['kalkulasi.hapus'] = function (tx, d) {
    var id = str(d.id); if (rekapTerkunci(tx, id)) throw salah('Margin sudah dikunci Finance.');
    tx.where('Kalkulasi_Item', function (i) { return i.ID_Pesanan === id; }).forEach(function (i) { tx.remove('Kalkulasi_Item', i.ID_Item); });
    tx.remove('Kalkulasi', id); var p = tx.get('Pesanan', id); if (p) jobRekapSheet(tx, infoPesanan(p, tx.S()));
    tx.log('Hapus kalkulasi', 'Kalkulasi', id, ''); return ok({ id: id }, 'Kalkulasi dihapus.');
  };
  A['paket.simpan'] = function (tx, d) {
    var nama = str(d.Nama); if (!nama) throw salah('Nama paket wajib diisi.');
    var bagian = d.Bagian === 'SB' ? 'SB' : 'YB';
    var items = (d.items || []).filter(function (i) { return str(i.Uraian); }).map(function (i) {
      var keTL = i.Ke_TL === 'YA' || i.Ke_TL === true ? 'YA' : 'TIDAK', grup = keTL === 'YA' ? (GRUP_TL.indexOf(i.Grup) > -1 ? i.Grup : tebakGrup(i.Uraian)) : '';
      return { Uraian: str(i.Uraian).toUpperCase(), Tetap: num(i.Tetap), Per_Pax: num(i.Per_Pax), Ke_TL: keTL, Grup: grup, Kolom: kolomValid(bagian, i.Kolom) || tebakKolom(bagian, i.Uraian, grup) };
    });
    if (!items.length) throw salah('Paket harus berisi minimal satu item.');
    var ada = d.ID_Paket ? tx.get('Paket_Kalkulasi', d.ID_Paket) : tx.where('Paket_Kalkulasi', function (x) { return normalHeader(x.Nama) === normalHeader(nama) && x.Bagian === bagian; })[0];
    var row = { Nama: nama, Bagian: bagian, Item: JSON.stringify(items), Catatan: str(d.Catatan), Diperbarui: tx.now() }, h;
    if (ada) h = tx.update('Paket_Kalkulasi', ada.ID_Paket, row); else h = tx.insert('Paket_Kalkulasi', row);
    tx.log(ada ? 'Ubah paket kalkulasi' : 'Tambah paket kalkulasi', 'Kalkulasi', h.ID_Paket, nama + ' · ' + items.length + ' item');
    return ok(h, 'Paket "' + nama + '" tersimpan — dipakai otomatis untuk pesanan dengan nama trip yang sama.');
  };
  A['paket.hapus'] = function (tx, d) { var k = tx.get('Paket_Kalkulasi', d.id); if (!k) throw salah('Paket tidak ditemukan.'); tx.remove('Paket_Kalkulasi', d.id); tx.log('Hapus paket kalkulasi', 'Kalkulasi', d.id, k.Nama); return ok({ id: d.id }, 'Paket dihapus.'); };

  // ---------- Manifest ----------
  A['manifest.simpan'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), lama = tx.get('Manifest', p.ID_Pesanan), now = tx.now();
    var tl = (d.TL || []).map(function (x) {
      var r = x.id ? tx.get('Tim_Lapang', x.id) : null;
      var em = str(r ? r.Email : x.email).toLowerCase(); if (em && !emailValid(em)) throw salah('Email Tim Lapang "' + (x.nama || em) + '" tidak valid.');
      return { id: r ? r.ID_TL : '', nama: str(r ? r.Nama : x.nama), email: em, hp: hp08(r ? r.No_HP : x.hp), peran: str(r ? r.Peran : x.peran) };
    }).filter(function (x) { return x.nama; });
    var cek = (d.Checklist || []).filter(function (c) { return str(c.item) || str(c.detail); }).map(function (c) { return { item: str(c.item), detail: str(c.detail) }; });
    var peserta = (d.Peserta || []).filter(function (x) { return str(x.nama); }).map(function (x) { return { nama: str(x.nama), hp: hp08(x.hp) || str(x.hp), ket: str(x.ket) }; });
    var tamu = d.Data_Tamu || {};
    var row = { PIC_Kantor: str(d.PIC_Kantor), TL: JSON.stringify(tl), Durasi: str(d.Durasi), Data_Tamu: JSON.stringify({ nama: str(tamu.nama), pax: num(tamu.pax) || '', hp: str(tamu.hp), jemput: str(tamu.jemput), drop: str(tamu.drop) }),
      Checklist: JSON.stringify(cek), Catatan: String(d.Catatan == null ? '' : d.Catatan).trim(), Itinerary: String(d.Itinerary == null ? '' : d.Itinerary).trim(), Peserta: JSON.stringify(peserta),
      Tampil_Budget: d.Tampil_Budget === false || d.Tampil_Budget === 'TIDAK' ? 'TIDAK' : 'YA', Diperbarui: now };
    if (lama) { if (lama.Status === 'Terbit') row.Status = 'Berubah'; tx.update('Manifest', p.ID_Pesanan, row); }
    else { row.ID_Pesanan = p.ID_Pesanan; row.Status = 'Draft'; row.Versi = 0; row.Diundang = '[]'; row.Dibuat_Oleh = tx.user.nama; tx.insert('Manifest', row); }
    jobKalender(tx);
    tx.log('Simpan draft manifest', 'Manifest', p.ID_Pesanan, p.Nama + ' · TL: ' + (tl.map(function (x) { return x.nama; }).join(', ') || '-') + ' · ' + peserta.length + ' nama peserta');
    return ok(tx.get('Manifest', p.ID_Pesanan), 'Draft manifest tersimpan.');
  };
  /** Dipanggil host setelah PDF manifest tersimpan di Drive. */
  A['manifest.catatTerbit'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), m = tx.get('Manifest', p.ID_Pesanan);
    if (!m) { A['manifest.simpan'](tx, { ID_Pesanan: p.ID_Pesanan }); m = tx.get('Manifest', p.ID_Pesanan); }
    tx.update('Manifest', p.ID_Pesanan, { Status: 'Terbit', Versi: num(m.Versi) + 1, Link_PDF: str(d.url), File_ID: str(d.fileId), Diterbitkan: tx.now(), Diperbarui: tx.now() });
    jobKalender(tx);
    tx.log('Terbitkan manifest (PDF → Calendar)', 'Manifest', p.ID_Pesanan, p.Nama + ' · v' + (num(m.Versi) + 1));
    return ok(tx.get('Manifest', p.ID_Pesanan), 'Manifest v' + (num(m.Versi) + 1) + ' terbit & dilampirkan ke Google Calendar.');
  };
  /** Dicatat host setelah undangan Calendar terkirim ke email Tim Lapang. */
  A['manifest.catatUndang'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), m = tx.get('Manifest', p.ID_Pesanan); if (!m) throw salah('Buat & terbitkan manifest dulu.');
    var lama = parseJson(m.Diundang, []) || [], baru = (d.emails || []).map(function (e) { return str(e).toLowerCase(); }).filter(emailValid);
    var gabung = lama.concat(baru.filter(function (e) { return lama.indexOf(e) < 0; }));
    tx.update('Manifest', p.ID_Pesanan, { Diundang: JSON.stringify(gabung), Diperbarui: tx.now() });
    var S = tx.S(), inf = infoPesanan(p, S);
    if (d.kabari) {
      var tl = parseJson(m.TL, []) || [];
      tl.filter(function (x) { return baru.indexOf(x.email) > -1 || (d.kabariSemua && x.hp); }).forEach(function (x) {
        notif(tx, 'TL_MANIFEST', { nama: x.nama, hp: x.hp, email: x.email }, varsDasar(tx, { tamu: p.Nama, trip: p.Trip, tglTrip: inf.jadwal, pax: inf.pax, link: m.Link_PDF || '-' }), p.ID_Pesanan, '', { wa: !!d.wa, email: false });
      });
    }
    tx.log('Undang Tim Lapang ke Calendar', 'Manifest', p.ID_Pesanan, baru.join(', '));
    return ok({ diundang: gabung }, baru.length + ' email Tim Lapang diundang ke event Google Calendar.');
  };

  // ---------- Rekapitulasi ----------
  function pastikanRekap(tx, p) {
    var r = tx.get('Rekap', p.ID_Pesanan); if (r) return r;
    return tx.insert('Rekap', { ID_Pesanan: p.ID_Pesanan, Bagian: infoPesanan(p, tx.S()).bagian, Tambahan: '[]', Status: 'Draft', Riwayat: '[]', Diperbarui: tx.now() });
  }
  function riwayat(tx, r, aksi, ket) { var h = parseJson(r.Riwayat, []) || []; h.push({ w: tx.now(), o: tx.user.nama, a: aksi, k: ket || '' }); return JSON.stringify(h.slice(-40)); }
  A['rekap.simpan'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), r = pastikanRekap(tx, p), S = tx.S(), inf = infoPesanan(p, S), b = inf.bagian;
    if (r.Status === 'Terkunci') throw salah('Margin sudah dikunci Finance — tidak bisa diubah.');
    var t = (d.Tambahan || []).filter(function (x) { return str(x.uraian) || num(x.nominal); }).map(function (x, i) {
      if (!str(x.uraian)) throw salah('Uraian tambahan baris ' + (i + 1) + ' wajib diisi.');
      if (!num(x.nominal)) throw salah('Nominal "' + str(x.uraian) + '" wajib diisi.');
      return { id: str(x.id) || 'T' + (i + 1), kolom: kolomValid(b, x.kolom) || kolomCadangan(b), jenis: JENIS_TAMBAHAN.indexOf(x.jenis) > -1 ? x.jenis : 'Lainnya', uraian: str(x.uraian), nominal: Math.round(num(x.nominal)), tgl: tgl(x.tgl) || tx.today(), oleh: str(x.oleh) || tx.user.nama };
    });
    var patch = { Bagian: b, Tambahan: JSON.stringify(t), Kode_Trip: str(d.Kode_Trip) === inf.kode ? '' : str(d.Kode_Trip), Kapal: str(d.Kapal), Catatan: str(d.Catatan), Diperbarui: tx.now() };
    patch.Riwayat = riwayat(tx, r, 'Ubah rekap', t.length + ' pengeluaran tambahan · ' + rp(jumlah(t, function (x) { return x.nominal; })));
    tx.update('Rekap', p.ID_Pesanan, patch); jobRekapSheet(tx, inf);
    tx.log('Ubah rekap trip', 'Rekap', p.ID_Pesanan, p.Nama + ' · ' + t.length + ' tambahan');
    return ok(tx.get('Rekap', p.ID_Pesanan), 'Rekap tersimpan.');
  };
  A['rekap.ajukan'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), r = pastikanRekap(tx, p); if (r.Status === 'Terkunci') throw salah('Sudah dikunci.');
    var S = tx.S(), today = tx.today(), ix = indeks(tx.D), rk = rekapPesanan(tx.D, ix, p, S, today);
    if (!rk.adaKalkulasi && !rk.tambahan.length) throw salah('Isi kalkulasi atau pengeluaran tambahan dulu sebelum mengajukan.');
    tx.update('Rekap', p.ID_Pesanan, { Status: 'Siap Dicek', Diajukan_Oleh: tx.user.nama, Tgl_Ajukan: tx.now(), Catatan: d.Catatan != null ? str(d.Catatan) : r.Catatan, Riwayat: riwayat(tx, r, 'Ajukan ke Finance', str(d.Catatan)), Diperbarui: tx.now() });
    var v = varsDasar(tx, { tamu: p.Nama, trip: p.Trip, tglTrip: rk.inf.jadwal, oleh: tx.user.nama, penjualan: rp(rk.penjualan), pengeluaran: rp(rk.pengeluaran), margin: rp(rk.laba) + ' (' + Math.round(rk.margin * 1000) / 10 + '%)', lebih: rk.over ? '\n⚠️ Over budget ' + rp(rk.over) : '' });
    penerimaTim(tx, 'Finance').forEach(function (x) { notif(tx, 'TIM_REKAP_SIAP', x, v, p.ID_Pesanan); });
    tx.log('Ajukan rekap ke Finance', 'Rekap', p.ID_Pesanan, p.Nama);
    return ok(tx.get('Rekap', p.ID_Pesanan), 'Rekap ditandai siap dicek. Finance mendapat notifikasi.');
  };
  function kunciSatu(tx, id, catatan) {
    var p = tx.get('Pesanan', id); if (!p) throw salah('Pesanan ' + id + ' tidak ditemukan di sheet.');
    var r = pastikanRekap(tx, p); if (r.Status === 'Terkunci') return null;
    var S = tx.S(), rk = rekapPesanan(tx.D, indeks(tx.D), p, S, tx.today());
    var snap = snapshotRekap(rk);
    tx.update('Rekap', id, { Status: 'Terkunci', Dikunci_Oleh: tx.user.nama, Tgl_Kunci: tx.now(), Snapshot: JSON.stringify(snap), Penjualan_Final: rk.penjualan, Pengeluaran_Final: rk.pengeluaran, Laba_Final: rk.laba,
      Riwayat: riwayat(tx, r, 'Kunci margin', str(catatan)), Diperbarui: tx.now() });
    var v = varsDasar(tx, { tamu: p.Nama, trip: p.Trip, keputusan: 'DIKUNCI', oleh: tx.user.nama, catatan: 'Margin ' + rp(rk.laba) + ' (' + Math.round(rk.margin * 1000) / 10 + '%)' + (catatan ? '\nCatatan: ' + catatan : '') });
    var peng = tx.where('Pengguna', function (u) { return u.Status === 'Aktif' && u.Peran === 'Admin' && (!r.Diajukan_Oleh || u.Nama === r.Diajukan_Oleh); });
    (peng.length ? peng : tx.where('Pengguna', function (u) { return u.Status === 'Aktif' && u.Peran === 'Admin'; })).forEach(function (u) { notif(tx, 'TIM_REKAP_DIKUNCI', { nama: u.Nama, hp: u.No_WA, email: u.Email }, v, id); });
    jobRekapSheet(tx, rk.inf);
    return rk;
  }
  A['rekap.kunci'] = function (tx, d) {
    var ids = d.ids || (d.ID_Pesanan ? [d.ID_Pesanan] : []); if (!ids.length) throw salah('Pilih rekap yang akan dikunci.');
    var n = 0, laba = 0; ids.forEach(function (id) { var rk = kunciSatu(tx, id, d.catatan); if (rk) { n++; laba += rk.laba; } });
    tx.log('Kunci margin', 'Rekap', ids.length === 1 ? ids[0] : ids.length + ' trip', 'Margin ' + rp(laba));
    return ok({ n: n }, n ? n + ' rekap dikunci ✓ — margin masuk laporan laba rugi.' : 'Semua rekap terpilih sudah terkunci.');
  };
  A['rekap.buka'] = function (tx, d) {
    var r = tx.get('Rekap', d.ID_Pesanan); if (!r || r.Status !== 'Terkunci') throw salah('Rekap ini tidak sedang terkunci.');
    var alasan = str(d.alasan); if (alasan.length < 5) throw salah('Tuliskan alasan membuka kunci (min. 5 karakter).');
    if (!tx.get('Pesanan', d.ID_Pesanan)) throw salah('Baris pesanan sudah tidak ada di sheet — rekap terkunci ini dipertahankan sebagai arsip.');
    tx.update('Rekap', d.ID_Pesanan, { Status: 'Draft', Snapshot: '', Penjualan_Final: 0, Pengeluaran_Final: 0, Laba_Final: 0, Dikunci_Oleh: '', Tgl_Kunci: '', Riwayat: riwayat(tx, r, 'Buka kunci', alasan), Diperbarui: tx.now() });
    var p = tx.get('Pesanan', d.ID_Pesanan), v = varsDasar(tx, { tamu: p.Nama, trip: p.Trip, keputusan: 'DIBUKA KEMBALI', oleh: tx.user.nama, catatan: 'Alasan: ' + alasan });
    tx.where('Pengguna', function (u) { return u.Status === 'Aktif' && u.Peran === 'Admin'; }).forEach(function (u) { notif(tx, 'TIM_REKAP_DIKUNCI', { nama: u.Nama, hp: u.No_WA, email: u.Email }, v, d.ID_Pesanan); });
    jobRekapSheet(tx, infoPesanan(p, tx.S()));
    tx.log('Buka kunci margin', 'Rekap', d.ID_Pesanan, alasan);
    return ok(tx.get('Rekap', d.ID_Pesanan), 'Kunci dibuka. Admin bisa memperbaiki rekap lagi.');
  };

  // ---------- Tagihan & pembayaran (Finance) ----------
  function notifBayar(tx, p, tgSebelum, tgSesudah, b) {
    var inf = tgSesudah.inf, kontak = { nama: p.Nama, hp: inf.hp, email: inf.email, demo: /\bDEMO\b/i.test(str(p.Tab)) };
    var v = varsDasar(tx, { trip: p.Trip, tglTrip: inf.jadwal, nominal: rp(b ? b.Nominal : 0), sisa: rp(tgSesudah.sisa) });
    if (tgSesudah.lunas && !tgSebelum.lunas) notif(tx, 'LUNAS', kontak, v, p.ID_Pesanan);
    else if (b) notif(tx, 'PEMBAYARAN_DITERIMA', kontak, v, b.ID_Bayar);
  }
  A['bayar.simpan'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), S = tx.S(), today = tx.today(), ix = indeks(tx.D), sebelum = tagihanPesanan(tx.D, ix, p, S, today);
    var nominal = Math.round(num(d.Nominal)); if (nominal <= 0) throw salah('Nominal pembayaran harus lebih dari 0.');
    if (nominal > sebelum.sisaHitung && !d.paksa && !d.ID_Bayar) throw salah('Nominal melebihi sisa tagihan (' + rp(sebelum.sisaHitung) + '). Centang "tetap simpan" bila memang benar.');
    var row = { ID_Pesanan: p.ID_Pesanan, Tanggal: tgl(d.Tanggal) || today, Nominal: nominal, Jenis: str(d.Jenis) || (nominal >= sebelum.sisaHitung ? 'Pelunasan' : 'Cicilan'), Metode: str(d.Metode) || 'Transfer', Link_Bukti: str(d.Link_Bukti), Catatan: str(d.Catatan) }, b;
    if (d.ID_Bayar && tx.get('Pembayaran', d.ID_Bayar)) b = tx.update('Pembayaran', d.ID_Bayar, row);
    else { row.Dicatat_Oleh = tx.user.nama; row.Dibuat = tx.now(); b = tx.insert('Pembayaran', row); }
    var sesudah = tagihanPesanan(tx.D, indeks(tx.D), p, S, today);
    if (!d.ID_Bayar && d.kabari !== false) notifBayar(tx, p, sebelum, sesudah, b);
    tx.log(d.ID_Bayar ? 'Ubah pembayaran' : 'Catat pembayaran', 'Tagihan', b.ID_Bayar, p.Nama + ' · ' + row.Jenis + ' ' + rp(nominal));
    return ok(b, sesudah.lunas ? 'Pembayaran tercatat — ' + p.Nama + ' LUNAS 🎉' : 'Pembayaran tercatat. Sisa ' + rp(sesudah.sisa) + '.');
  };
  A['bayar.hapus'] = function (tx, d) { var b = tx.get('Pembayaran', d.id); if (!b) throw salah('Pembayaran tidak ditemukan.'); tx.remove('Pembayaran', d.id); tx.log('Hapus pembayaran', 'Tagihan', d.id, rp(b.Nominal)); return ok({ id: d.id }, 'Pembayaran dihapus.'); };
  function pastikanTagihan(tx, id) { return tx.get('Tagihan', id) || tx.insert('Tagihan', { ID_Pesanan: id, Status_Manual: '', Jumlah_Pengingat: 0, Diperbarui: tx.now() }); }
  A['tagihan.tandai'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), S = tx.S(), today = tx.today(), sebelum = tagihanPesanan(tx.D, indeks(tx.D), p, S, today);
    var st = d.status === 'Lunas' || d.status === 'Belum Lunas' ? d.status : '';
    pastikanTagihan(tx, p.ID_Pesanan);
    tx.update('Tagihan', p.ID_Pesanan, { Status_Manual: st, Catatan: d.catatan != null ? str(d.catatan) : (tx.get('Tagihan', p.ID_Pesanan).Catatan), Oleh: tx.user.nama, Diperbarui: tx.now() });
    var sesudah = tagihanPesanan(tx.D, indeks(tx.D), p, S, today);
    if (d.kabari && sesudah.lunas && !sebelum.lunas) notifBayar(tx, p, sebelum, sesudah, null);
    tx.log('Tandai tagihan: ' + (st || 'otomatis'), 'Tagihan', p.ID_Pesanan, p.Nama);
    return ok(tx.get('Tagihan', p.ID_Pesanan), st ? p.Nama + ' ditandai ' + st.toUpperCase() + '.' : 'Status tagihan kembali dihitung otomatis.');
  };
  A['tagihan.atur'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan); pastikanTagihan(tx, p.ID_Pesanan);
    var jt = tgl(d.Jatuh_Tempo); if (jt && !tglValid(jt)) throw salah('Tanggal jatuh tempo tidak valid.');
    tx.update('Tagihan', p.ID_Pesanan, { Jatuh_Tempo: jt, Catatan: str(d.Catatan), Oleh: tx.user.nama, Diperbarui: tx.now() });
    return ok(tx.get('Tagihan', p.ID_Pesanan), 'Pengaturan tagihan tersimpan.');
  };
  A['tagihan.ingatkan'] = function (tx, d) {
    var S = tx.S(), today = tx.today(), ix = indeks(tx.D), n = 0, orang = 0, lewati = 0;
    (d.ids || []).forEach(function (id) {
      var p = ix.psn[id]; if (!p) return; var t = tagihanPesanan(tx.D, ix, p, S, today);
      if (t.lunas || t.sisa <= 0) { lewati++; return; }
      var m = notif(tx, 'PENGINGAT_TAGIHAN', { nama: p.Nama, hp: t.inf.hp, email: t.inf.email }, varsDasar(tx, { trip: p.Trip, tglTrip: t.inf.jadwal, sisa: rp(t.sisa), jatuhTempo: tglPanjang(t.jatuhTempo) }), id + '@' + today, '', { wa: d.wa !== false, email: !!d.email });
      if (m) { n += m; orang++; var tg = pastikanTagihan(tx, id); tx.update('Tagihan', id, { Terakhir_Diingatkan: tx.now(), Jumlah_Pengingat: num(tg.Jumlah_Pengingat) + 1, Diperbarui: tx.now() }); } else lewati++;
    });
    tx.log('Kirim pengingat tagihan', 'Tagihan', orang + ' tamu', n + ' pesan');
    if (!orang) throw salah('Tidak ada pengingat yang bisa dikirim (sudah lunas, nomor/email tidak valid, atau kanal WA/Email belum diaktifkan di menu WhatsApp & CRM).');
    return ok({ n: n, orang: orang, lewati: lewati }, 'Pengingat masuk antrean kirim untuk ' + orang + ' tamu' + (lewati ? ' (' + lewati + ' dilewati)' : '') + '.');
  };

  A['tagihan.otomatis'] = function (tx, d) {
    var hs = str(d.hari).split(',').map(function (x) { return Math.round(num(x)); }).filter(function (x) { return x >= 0 && x <= 60; });
    if (d.aktif && !hs.length) throw salah('Isi hari pengingat, contoh: 7,3,1');
    tx.setS('TAGIHAN_OTOMATIS', d.aktif ? 'YA' : 'TIDAK'); if (hs.length) tx.setS('TAGIHAN_H', hs.join(','));
    tx.log('Atur pengingat tagihan otomatis', 'Tagihan', d.aktif ? 'Aktif' : 'Nonaktif', hs.join(','));
    return ok({ S: tx.S() }, d.aktif ? 'Pengingat otomatis aktif: H-' + hs.join(', H-') + ' sebelum trip (pukul ±07.00).' : 'Pengingat otomatis dimatikan.');
  };

  // ---------- Invoice (model klien) ----------
  A['invoice.simpan'] = function (tx, d) {
    var p = pesananAda(tx, d.ID_Pesanan), lama = d.ID_Invoice ? tx.get('Invoice', d.ID_Invoice) : null;
    if (lama && lama.Status === 'Batal') throw salah('Invoice sudah dibatalkan.');
    var no = str(d.No_Invoice), cid = str(d.Customer_ID).toUpperCase();
    if (!no) throw salah('Nomor invoice wajib diisi.'); if (!cid) throw salah('Customer ID wajib diisi.');
    var bentrok = tx.where('Invoice', function (i) { return i.No_Invoice === no && i.ID_Pesanan !== p.ID_Pesanan && i.Status !== 'Batal'; })[0];
    if (bentrok && !d.paksa) throw salah('No. invoice ' + no + ' sudah dipakai pesanan lain (' + ((tx.get('Pesanan', bentrok.ID_Pesanan) || {}).Nama || bentrok.ID_Pesanan) + ').');
    var items = (d.Item || []).filter(function (i) { return str(i.desk) || num(i.harga); }).map(function (i) { return { desk: str(i.desk), qty: num(i.qty) || 1, harga: Math.round(num(i.harga)) }; });
    if (!items.length) throw salah('Isi minimal satu baris deskripsi.');
    var maks = Math.max(1, num(tx.S().INV_BARIS) || 15); if (items.length > maks) throw salah('Maksimal ' + maks + ' baris (sesuai model invoice).');
    var tglI = tgl(d.Tanggal) || tx.today(); if (!tglValid(tglI)) throw salah('Tanggal invoice tidak valid.');
    var row = { ID_Pesanan: p.ID_Pesanan, No_Invoice: no, Customer_ID: cid, Judul: str(d.Judul) || 'Invoice', Tanggal: tglI, Bill_To: String(d.Bill_To == null ? '' : d.Bill_To).trim(), Item: JSON.stringify(items),
      Disc: Math.round(num(d.Disc)), DP: Math.round(num(d.DP)), Note_Judul: str(d.Note_Judul), Note_Isi: str(d.Note_Isi), Diperbarui: tx.now() }, inv;
    if (lama) { if (lama.Status === 'Terbit') row.Status = 'Draft'; inv = tx.update('Invoice', lama.ID_Invoice, row); }
    else {
      var urut = tx.where('Invoice', function (i) { return i.ID_Pesanan === p.ID_Pesanan; }).reduce(function (m, i) { return Math.max(m, num(i.Urutan)); }, 0) + 1;
      row.Urutan = urut; row.Status = 'Draft'; row.Kode_Verifikasi = kodeVerif(tx); row.Dibuat_Oleh = tx.user.nama; row.Dibuat = tx.now(); inv = tx.insert('Invoice', row);
    }
    tx.log(lama ? 'Ubah invoice' : 'Buat invoice', 'Invoice', inv.ID_Invoice, no + ' · ' + p.Nama);
    return ok(inv, lama && lama.Status === 'Terbit' ? 'Invoice diubah — terbitkan ulang agar PDF ikut diperbarui.' : 'Draft invoice tersimpan.');
  };
  /** Dipanggil host setelah PDF invoice tersimpan di Drive. */
  A['invoice.catatTerbit'] = function (tx, d) {
    var inv = tx.get('Invoice', d.ID_Invoice); if (!inv) throw salah('Invoice tidak ditemukan.'); if (inv.Status === 'Batal') throw salah('Invoice sudah dibatalkan.');
    tx.update('Invoice', inv.ID_Invoice, { Status: 'Terbit', Link_PDF: str(d.url), File_ID: str(d.fileId), Diperbarui: tx.now() });
    var n = 0; if (d.kirim && (d.kirim.wa || d.kirim.email)) n = kirimInvoice(tx, inv.ID_Invoice, d.kirim);
    tx.log('Terbitkan invoice', 'Invoice', inv.ID_Invoice, inv.No_Invoice + (n ? ' · dikirim' : ''));
    return ok(tx.get('Invoice', inv.ID_Invoice), 'Invoice ' + inv.No_Invoice + ' terbit' + (n ? ' & masuk antrean kirim ke tamu.' : '.'));
  };
  function kirimInvoice(tx, id, kanal) {
    var S = tx.S(), di = dataInvoice(tx.D, id, S); if (!di) return 0;
    var v = varsDasar(tx, { noInvoice: di.inv.No_Invoice, trip: di.p.Trip, tglTrip: di.inf.jadwal, total: rp(di.total), sisa: rp(di.sisa), link: di.inv.Link_PDF || S.APP_URL || '-' });
    return notif(tx, 'INVOICE_TERBIT', { nama: di.p.Nama, hp: di.inf.hp, email: di.inf.email }, v, di.inv.ID_Invoice, di.inv.File_ID, { wa: !!kanal.wa, email: !!kanal.email });
  }
  A['invoice.kirim'] = function (tx, d) {
    var inv = tx.get('Invoice', d.id); if (!inv || inv.Status !== 'Terbit') throw salah('Terbitkan invoice dulu sebelum dikirim.');
    var n = kirimInvoice(tx, inv.ID_Invoice, { wa: d.wa !== false, email: !!d.email });
    if (!n) throw salah('Tidak terkirim: nomor/email tamu tidak valid atau kanal WA/Email belum aktif.');
    tx.log('Kirim invoice', 'Invoice', inv.ID_Invoice, n + ' pesan'); return ok({ n: n }, 'Invoice masuk antrean kirim (' + n + ' pesan).');
  };
  A['invoice.batal'] = function (tx, d) {
    var inv = tx.get('Invoice', d.id); if (!inv) throw salah('Invoice tidak ditemukan.'); if (!str(d.alasan)) throw salah('Alasan pembatalan wajib diisi.');
    tx.update('Invoice', inv.ID_Invoice, { Status: 'Batal', Note_Isi: (inv.Note_Isi ? inv.Note_Isi + ' | ' : '') + 'BATAL: ' + str(d.alasan), Diperbarui: tx.now() });
    tx.log('Batalkan invoice', 'Invoice', inv.ID_Invoice, str(d.alasan)); return ok(tx.get('Invoice', inv.ID_Invoice), 'Invoice dibatalkan.');
  };
  A['invoice.hapus'] = function (tx, d) {
    var inv = tx.get('Invoice', d.id); if (!inv) throw salah('Invoice tidak ditemukan.'); if (inv.Status !== 'Draft') throw salah('Hanya draft yang bisa dihapus. Invoice terbit dibatalkan.');
    tx.remove('Invoice', inv.ID_Invoice); tx.log('Hapus draft invoice', 'Invoice', inv.ID_Invoice, inv.No_Invoice); return ok({ id: d.id }, 'Draft dihapus.');
  };
  function kodeVerif(tx) { return String(tx.H.uuid()).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12); }

  // ---------- Tim Lapang ----------
  A['tl.simpan'] = function (tx, d) {
    var nama = str(d.Nama); if (!nama) throw salah('Nama wajib diisi.');
    var email = str(d.Email).toLowerCase(); if (email && !emailValid(email)) throw salah('Email tidak valid.');
    var hp = hp08(d.No_HP); if (hp && !hpValid(hp)) throw salah('Nomor HP tidak valid.');
    if (email && tx.where('Tim_Lapang', function (t) { return t.Email === email && t.ID_TL !== d.ID_TL; }).length) throw salah('Email sudah dipakai anggota Tim Lapang lain.');
    var row = { Nama: nama, Peran: str(d.Peran) || 'TL', No_HP: hp, Email: email, Status: d.Status === 'Nonaktif' ? 'Nonaktif' : 'Aktif', Catatan: str(d.Catatan) }, h;
    if (d.ID_TL && tx.get('Tim_Lapang', d.ID_TL)) h = tx.update('Tim_Lapang', d.ID_TL, row); else { row.Dibuat = tx.now(); h = tx.insert('Tim_Lapang', row); }
    crmUpsertSatu(tx, 'tl', h);
    tx.log(d.ID_TL ? 'Ubah Tim Lapang' : 'Tambah Tim Lapang', 'Manifest', h.ID_TL, nama);
    return ok(h, 'Data Tim Lapang tersimpan.' + (email ? '' : ' Tambahkan email agar bisa diundang ke Google Calendar.'));
  };
  A['tl.hapus'] = function (tx, d) {
    var t = tx.get('Tim_Lapang', d.id); if (!t) throw salah('Data tidak ditemukan.');
    var dipakai = tx.where('Manifest', function (m) { return (parseJson(m.TL, []) || []).some(function (x) { return x.id === t.ID_TL; }); }).length;
    if (dipakai) { tx.update('Tim_Lapang', t.ID_TL, { Status: 'Nonaktif' }); tx.log('Nonaktifkan Tim Lapang', 'Manifest', t.ID_TL, t.Nama); return ok({ id: d.id }, t.Nama + ' dipakai di ' + dipakai + ' manifest, jadi dinonaktifkan (bukan dihapus).'); }
    tx.remove('Tim_Lapang', t.ID_TL); tx.log('Hapus Tim Lapang', 'Manifest', t.ID_TL, t.Nama); return ok({ id: d.id }, 'Dihapus.');
  };

  // ---------- Biaya operasional (Finance) ----------
  A['biaya.simpan'] = function (tx, d) {
    var bulan = str(d.Bulan) || tgl(d.Tanggal).slice(0, 7); if (!/^\d{4}-\d{2}$/.test(bulan)) throw salah('Pilih bulan biaya.');
    var uraian = str(d.Uraian); if (!uraian) throw salah('Uraian wajib diisi.');
    var nominal = Math.round(num(d.Nominal)); if (nominal <= 0) throw salah('Nominal harus lebih dari 0.');
    var kat = str(d.Kategori) || 'Lain-lain', tanggal = tgl(d.Tanggal); if (tanggal && tanggal.slice(0, 7) !== bulan) throw salah('Tanggal tidak berada di bulan ' + labelBulan(bulan) + '.');
    var row = { Bulan: bulan, Tanggal: tanggal, Kategori: kat, Uraian: uraian, Nominal: nominal, Catatan: str(d.Catatan) }, h;
    if (d.ID_Biaya && tx.get('Biaya_Operasional', d.ID_Biaya)) h = tx.update('Biaya_Operasional', d.ID_Biaya, row);
    else { row.Dibuat_Oleh = tx.user.nama; row.Dibuat = tx.now(); h = tx.insert('Biaya_Operasional', row); }
    tx.log(d.ID_Biaya ? 'Ubah biaya operasional' : 'Catat biaya operasional', 'Laba Rugi', h.ID_Biaya, kat + ' · ' + uraian + ' · ' + rp(nominal));
    return ok(h, 'Biaya operasional tersimpan.');
  };
  A['biaya.hapus'] = function (tx, d) { var b = tx.get('Biaya_Operasional', d.id); if (!b) throw salah('Data tidak ditemukan.'); tx.remove('Biaya_Operasional', d.id); tx.log('Hapus biaya operasional', 'Laba Rugi', d.id, b.Uraian + ' · ' + rp(b.Nominal)); return ok({ id: d.id }, 'Biaya dihapus.'); };
  A['laporan.catat'] = function (tx, d) { tx.log('Unduh laporan ' + str(d.jenis), 'Laporan', str(d.periode), str(d.format)); return ok(); };

  // ---------- Pengaturan & Pengguna ----------
  var JSON_SETELAN = { INV_REKENING: 'array', INV_SYARAT: 'array', REKAP_LABEL: 'objek', SUMBER_TAB: 'objek', AKSES_MENU: 'objek', PALET: 'objek' };
  var URL_SETELAN = ['LOGO_URL', 'FAVICON_URL', 'INV_TTD_URL', 'INV_CAP_URL', 'MNF_LOGO_URL', 'LOGIN_FOTO'];
  A['pengaturan.simpan'] = function (tx, d) {
    var kv = d.kv || {}, n = 0, ubah = [];
    Object.keys(kv).forEach(function (k) {
      if (PENGATURAN_BOLEH.indexOf(k) < 0) return;
      var v = kv[k]; if (v !== null && typeof v === 'object') v = JSON.stringify(v); v = String(v == null ? '' : v);
      if (JSON_SETELAN[k] && v) {
        var j = parseJson(v, null); if (j === null || (JSON_SETELAN[k] === 'array') !== Array.isArray(j)) throw salah('Format ' + k + ' tidak valid.');
        if (k === 'AKSES_MENU') Object.keys(j).forEach(function (m) { if (!MENU_DIATUR[m] || !Array.isArray(j[m]) || j[m].some(function (r) { return SEMUA.indexOf(r) < 0; })) throw salah('Aturan akses menu tidak valid.'); });
        if (k === 'PALET' && j.preset === 'kustom') { var cek = cekPalet(paletAktif({ PALET: v })); if (!cek.lulus) throw salah('Kontras warna terlalu rendah: ' + cek.masalah.join('; ')); }
      }
      if (URL_SETELAN.indexOf(k) > -1 && v && !/^(https:\/\/|data:image\/|assets\/)/.test(v)) throw salah(k + ' harus berupa URL https.');
      if (k === 'INV_WARNA' && v && !/^#[0-9a-f]{6}$/i.test(v)) throw salah('Warna invoice harus format #RRGGBB.');
      if (k === 'SUMBER_JEDA' && (num(v) < 3 || num(v) > 60)) throw salah('Interval cek perubahan 3–60 detik.');
      if (tx.S()[k] !== v) { tx.setS(k, v); n++; ubah.push(k); }
    });
    if (n) tx.log('Ubah pengaturan', 'Sistem', 'Pengaturan', ubah.join(', '));
    if (ubah.some(function (k) { return /^REKAP_|^SUMBER_TAB$/.test(k); }) && tx.S().REKAP_SHEET_AKTIF === 'YA') tx.job('REKAP_SHEET', 'semua', {});
    return ok({ S: tx.S(), diubah: ubah }, n ? n + ' pengaturan tersimpan & langsung berlaku.' : 'Tidak ada perubahan.');
  };
  var GRUP_DEFAULT = { gambar: ['LOGO_URL', 'FAVICON_URL', 'LOGIN_FOTO'], tampilan: ['PALET', 'FONT_BODY', 'FONT_HEAD'],
    invoice: Object.keys(PENGATURAN_DEFAULT).filter(function (k) { return /^INV_/.test(k); }), manifest: Object.keys(PENGATURAN_DEFAULT).filter(function (k) { return /^MNF_/.test(k); }), rekap: ['REKAP_LABEL', 'REKAP_TAB'] };
  A['pengaturan.default'] = function (tx, d) {
    var grup = GRUP_DEFAULT[d.grup] || [];
    grup.forEach(function (k) { tx.setS(k, PENGATURAN_DEFAULT[k][0]); });
    tx.log('Kembalikan default ' + d.grup, 'Sistem', 'Pengaturan', grup.join(', '));
    return ok({ S: tx.S() }, 'Dikembalikan ke default.');
  };
  A['pengguna.simpan'] = function (tx, d) {
    var nama = str(d.Nama), email = str(d.Email).toLowerCase();
    if (!nama) throw salah('Nama wajib diisi.'); if (!emailValid(email)) throw salah('Email tidak valid.');
    if (['Admin', 'Finance'].indexOf(d.Peran) < 0) throw salah('Peran harus Admin atau Finance.');
    if (tx.where('Pengguna', function (u) { return u.Email.toLowerCase() === email && u.ID_Pengguna !== d.ID_Pengguna; }).length) throw salah('Email sudah terdaftar.');
    var wa = hp08(d.No_WA); if (wa && !hpValid(wa)) throw salah('Nomor WA tidak valid.');
    var row = { Nama: nama, Email: email, Peran: d.Peran, No_WA: wa, Status: d.Status === 'Nonaktif' ? 'Nonaktif' : 'Aktif', Pengelola: d.Pengelola === 'YA' ? 'YA' : 'TIDAK' };
    if (d.ID_Pengguna && d.ID_Pengguna === tx.user.id && (row.Status !== 'Aktif' || row.Pengelola !== 'YA')) throw salah('Anda tidak bisa menonaktifkan/mencabut hak pengelola akun sendiri.');
    var aktif = tx.where('Pengguna', function (u) { return u.Status === 'Aktif' && u.ID_Pengguna !== d.ID_Pengguna; }).length + (row.Status === 'Aktif' ? 1 : 0);
    if (aktif > 5 && row.Status === 'Aktif' && !d.paksa && (!d.ID_Pengguna || (tx.get('Pengguna', d.ID_Pengguna) || {}).Status !== 'Aktif')) throw salah('Lisensi aplikasi ini untuk 5 pengguna aktif. Nonaktifkan akun lain dulu.');
    var u, pinBaru = '';
    if (d.ID_Pengguna && tx.get('Pengguna', d.ID_Pengguna)) u = tx.update('Pengguna', d.ID_Pengguna, row);
    else {
      pinBaru = d.PIN && /^\d{6}$/.test(d.PIN) ? d.PIN : pinAcak(tx.H);
      var salt = tx.H.uuid(); row.Salt = salt; row.Hash_PIN = tx.H.hash(pinBaru, salt); row.Dibuat = tx.now(); u = tx.insert('Pengguna', row);
    }
    crmUpsertSatu(tx, 'tim', u);
    tx.log(d.ID_Pengguna ? 'Ubah pengguna' : 'Tambah pengguna', 'Sistem', u.ID_Pengguna, nama + ' (' + row.Peran + ')');
    return ok({ pengguna: bersihkanBaris('Pengguna', u), pin: pinBaru }, pinBaru ? 'Pengguna dibuat. PIN awal: ' + pinBaru + ' (tampil sekali, minta ganti saat login).' : 'Pengguna diperbarui.');
  };
  A['pengguna.resetPin'] = function (tx, d) {
    var u = tx.get('Pengguna', d.id); if (!u) throw salah('Pengguna tidak ditemukan.');
    var pin = pinAcak(tx.H), salt = tx.H.uuid();
    tx.update('Pengguna', u.ID_Pengguna, { Salt: salt, Hash_PIN: tx.H.hash(pin, salt) });
    tx.log('Reset PIN', 'Sistem', u.ID_Pengguna, u.Nama);
    return ok({ pin: pin, revoke: u.Email }, 'PIN baru untuk ' + u.Nama + ': ' + pin + ' (tampil sekali).');
  };
  A['pengguna.foto'] = function (tx, d) {
    var id = d.id || tx.user.id; if (id !== tx.user.id && tx.user.peran !== 'Admin') throw salah('Hanya Admin yang bisa mengubah foto pengguna lain.');
    if (d.url && !/^(https:\/\/|data:image\/)/.test(d.url)) throw salah('URL foto tidak valid.');
    var u = tx.update('Pengguna', id, { Foto_URL: str(d.url) }); tx.log('Ubah foto profil', 'Sistem', id, u.Nama);
    return ok(bersihkanBaris('Pengguna', u), 'Foto profil diperbarui.');
  };
  A['pengguna.gantiPin'] = function (tx, d) {
    var u = tx.get('Pengguna', tx.user.id); if (!u) throw salah('Akun tidak ditemukan.');
    if (u.Hash_PIN !== tx.H.hash(String(d.lama || ''), u.Salt)) throw salah('PIN lama salah.');
    if (!/^\d{6}$/.test(String(d.baru || ''))) throw salah('PIN baru harus 6 angka.');
    if (/^(\d)\1{5}$/.test(d.baru) || d.baru === '123456' || d.baru === '654321') throw salah('PIN terlalu mudah ditebak.');
    var salt = tx.H.uuid(); tx.update('Pengguna', u.ID_Pengguna, { Salt: salt, Hash_PIN: tx.H.hash(String(d.baru), salt) });
    tx.log('Ganti PIN sendiri', 'Sistem', u.ID_Pengguna, '');
    return ok(null, 'PIN berhasil diganti.');
  };

  // ==========================================================================
  // 7. NOTIFIKASI (antrean) & CRM
  // ==========================================================================
  function teksRekening(S) { return rekeningDari(S).map(function (r) { return r.bank + ' ' + r.norek; }).join(' / ') + (S.INV_ATAS_NAMA ? ' a.n ' + S.INV_ATAS_NAMA : ''); }
  function varsDasar(tx, v) { var S = tx.S(); return Object.assign({ perusahaan: S.PT_NAMA, app: S.APP_NAMA, link: S.APP_URL, rekening: teksRekening(S) }, v || {}); }
  function penerimaTim(tx, peran) { return tx.where('Pengguna', function (u) { return u.Status === 'Aktif' && u.Peran === peran; }).map(function (u) { return { nama: u.Nama, hp: u.No_WA, email: u.Email, demo: false }; }); }
  function matriksNotif(S) {
    var simpan = parseJson(S.NOTIF_MATRIKS, {}) || {}, out = {};
    Object.keys(NOTIF_EVENTS).forEach(function (k) {
      var d = NOTIF_EVENTS[k], s = simpan[k] || {};
      out[k] = { kode: k, label: d.label, target: d.target, wa: s.wa !== undefined ? !!s.wa : d.wa, email: s.email !== undefined ? !!s.email : d.email, subjek: s.subjek || d.subjek, pesan: s.pesan || d.pesan, subjekDefault: d.subjek, pesanDefault: d.pesan };
    });
    return out;
  }
  function barisAntrian(kanal, tujuan, nama, subjek, pesan, event, refId, blastId, lampiran) {
    return { Kanal: kanal, Tujuan: tujuan, NamaPenerima: nama || '', Subjek: subjek || '', Pesan: pesan, Lampiran: lampiran || '', Event: event || '', RefID: refId || '', BlastID: blastId || '', Status: 'Antri', Percobaan: 0, Respon: '', DibuatPada: '', DikirimPada: '' };
  }
  /** Satu-satunya pintu notifikasi otomatis. Tidak pernah melempar error. */
  function notif(tx, event, p, vars, refId, lampiran, paksa) {
    try {
      var S = tx.S(), waOn = S.NOTIF_WA_AKTIF === 'YA', emOn = S.NOTIF_EMAIL_AKTIF === 'YA';
      var m = matriksNotif(S)[event]; if (!m) return 0;
      if (paksa) { m = Object.assign({}, m, { wa: !!paksa.wa && tx.H.waSiap(), email: !!paksa.email }); }
      if (!waOn && !emOn) return 0;
      if (p.demo && S.NOTIF_KIRIM_DEMO !== 'YA') return 0;
      if (!m.wa && !m.email) return 0;
      var v = Object.assign({ nama: p.nama || 'Bapak/Ibu' }, vars || {}), n = 0, now = tx.now();
      var kontak = p.hp ? tx.where('CRM_Kontak', function (k) { return k.NoWA === hp08(p.hp); })[0] : null;
      if (kontak && (kontak.StatusWA === 'Tidak Terdaftar' || kontak.OptOut === 'YA')) kontak = { skipWA: true };
      if (waOn && m.wa && hpValid(p.hp) && !(kontak && kontak.skipWA)) { var r = barisAntrian('WA', hp62(p.hp), p.nama, '', isiTemplate(m.pesan, v), event, refId, '', ''); r.DibuatPada = now; tx.insert('AntrianNotif', r); n++; }
      if (emOn && m.email && emailValid(p.email)) { var e = barisAntrian('EMAIL', str(p.email), p.nama, isiTemplate(m.subjek, v), isiTemplate(m.pesan, v), event, refId, '', lampiran); e.DibuatPada = now; tx.insert('AntrianNotif', e); n++; }
      tx.nq += n; return n;
    } catch (e) { return 0; }
  }

  /** Fase 1 prosesor antrean: klaim baris (status → Proses). Host mengirim di luar lock. */
  function klaimNotif(tx, opsi) {
    opsi = opsi || {}; var rows = tx.all('AntrianNotif'), wa = [], em = [], perBlast = {};
    var blasts = peta(tx.where('BlastWA', function (b) { return b.Status === 'Berjalan'; }), 'BlastID');
    var sisaEmail = tx.H.sisaEmail ? tx.H.sisaEmail() : 50, waSiap = tx.H.waSiap ? tx.H.waSiap() : false;
    rows.forEach(function (r) {
      if (r.Status !== 'Antri') return;
      if (r.BlastID) {
        if (!waSiap || !blasts[r.BlastID] || (opsi.blastId && opsi.blastId !== r.BlastID)) return;
        var b = blasts[r.BlastID], lst = perBlast[r.BlastID] = perBlast[r.BlastID] || [];
        if (lst.length < num(b.UkuranBatch || 20)) lst.push(r); return;
      }
      if (opsi.hanyaBlast) return;
      if (r.Kanal === 'WA' && waSiap && wa.length < 30) wa.push(r);
      if (r.Kanal === 'EMAIL' && em.length < Math.min(40, sisaEmail)) em.push(r);
    });
    var semua = wa.concat(em); Object.keys(perBlast).forEach(function (k) { semua = semua.concat(perBlast[k]); });
    semua.forEach(function (r) { tx.update('AntrianNotif', r.AntrianID, { Status: 'Proses', Percobaan: num(r.Percobaan) + 1 }); });
    return { wa: wa.concat([].concat.apply([], Object.keys(perBlast).map(function (k) { return perBlast[k]; }))), email: em, blast: Object.keys(perBlast).map(function (k) { return blasts[k]; }) };
  }
  /** Fase 3: tulis hasil kirim. hasil = {AntrianID: {ok, respon}} */
  function selesaikanNotif(tx, hasil) {
    var now = tx.now(), sentTo = [];
    Object.keys(hasil).forEach(function (id) {
      var r = tx.get('AntrianNotif', id); if (!r) return; var h = hasil[id];
      if (h.ok) { tx.update('AntrianNotif', id, { Status: 'Terkirim', Respon: str(h.respon).slice(0, 200), DikirimPada: now }); sentTo.push(r); }
      else tx.update('AntrianNotif', id, { Status: num(r.Percobaan) >= 3 ? 'Gagal' : 'Antri', Respon: str(h.respon).slice(0, 200) });
    });
    tx.where('BlastWA', function (b) { return b.Status === 'Berjalan'; }).forEach(function (b) {
      var rs = tx.where('AntrianNotif', function (r) { return r.BlastID === b.BlastID; });
      var terk = rs.filter(function (r) { return r.Status === 'Terkirim'; }).length, gg = rs.filter(function (r) { return r.Status === 'Gagal'; }).length;
      var sisa = rs.filter(function (r) { return r.Status === 'Antri' || r.Status === 'Proses'; }).length;
      tx.update('BlastWA', b.BlastID, { Terkirim: terk, Gagal: gg, Status: sisa ? 'Berjalan' : 'Selesai', SelesaiPada: sisa ? '' : now });
    });
    crmCatatKirim(tx, sentTo);
    return sentTo.length;
  }
  function crmCatatKirim(tx, rows) {
    if (!rows.length) return; var now = tx.now(), kk = tx.all('CRM_Kontak'), byWa = {}, byEm = {};
    kk.forEach(function (k) { if (k.NoWA) byWa[hp62(k.NoWA)] = k; if (k.Email) byEm[k.Email.toLowerCase()] = k; });
    var tambah = {};
    rows.forEach(function (r) { var k = r.Kanal === 'WA' ? byWa[r.Tujuan] : byEm[String(r.Tujuan).toLowerCase()]; if (k) tambah[k.KontakID] = (tambah[k.KontakID] || 0) + 1; });
    Object.keys(tambah).forEach(function (id) { var k = tx.get('CRM_Kontak', id); tx.update('CRM_Kontak', id, { JumlahPesan: num(k.JumlahPesan) + tambah[id], TerakhirDihubungi: now }); });
  }
  function adaAntrian(D) { return D.AntrianNotif.some(function (r) { return r.Status === 'Antri'; }); }

  /** Kontak CRM tim (Pengguna) & Tim Lapang. */
  function crmUpsertSatu(tx, sumber, r) {
    var refId = sumber === 'tl' ? r.ID_TL : r.ID_Pengguna, hp = sumber === 'tl' ? r.No_HP : r.No_WA;
    var data = { Nama: r.Nama, Email: str(r.Email).toLowerCase(), NoWA: hp08(hp), Segmen: sumber === 'tl' ? 'Tim Lapang' : 'Tim ' + r.Peran, Sumber: sumber, RefID: refId, EmailValid: r.Email ? (emailValid(r.Email) ? 'YA' : 'TIDAK') : '', Info: JSON.stringify({ Peran: r.Peran, Status: r.Status }), DiperbaruiPada: tx.now() };
    var ada = tx.where('CRM_Kontak', function (k) { return k.Sumber === sumber && k.RefID === refId; })[0];
    if (ada) { if (hp08(ada.NoWA) !== data.NoWA) { data.StatusWA = ''; data.CekWAAt = ''; } return tx.update('CRM_Kontak', ada.KontakID, data); }
    return tx.insert('CRM_Kontak', Object.assign({ StatusWA: '', CekWAAt: '', OptOut: 'TIDAK', Catatan: '', JumlahPesan: 0, TerakhirDihubungi: '', DibuatPada: tx.now(), Tag: '' }, data));
  }
  /** Kontak CRM tamu dari baris pesanan — satu kontak per nomor HP (atau email). */
  function crmUpsertPesanan(tx, p) {
    var hp = hpValid(p.No_HP) ? hp08(p.No_HP) : '', em = emailValid(p.Email) ? str(p.Email).toLowerCase() : '', ref = hp ? 'HP:' + hp : (em ? 'EM:' + em : '');
    if (!ref) return null;
    var inf = infoPesanan(p, tx.S()), info = { trip: p.Trip, tab: p.Tab, tgl: inf.mulai, pax: inf.pax, id: p.ID_Pesanan };
    var data = { Nama: str(p.Nama), Email: em, NoWA: hp, Segmen: 'Tamu', Sumber: 'pesanan', RefID: ref, EmailValid: em ? 'YA' : '', Info: JSON.stringify(info), DiperbaruiPada: tx.now() };
    var ada = tx.where('CRM_Kontak', function (k) { return k.Sumber === 'pesanan' && k.RefID === ref; })[0];
    if (ada) {
      var lama = parseJson(ada.Info, {}) || {}; if (lama.tgl && inf.mulai && lama.tgl > inf.mulai) data.Info = ada.Info;
      if (!em && ada.Email) delete data.Email;
      return tx.update('CRM_Kontak', ada.KontakID, data);
    }
    return tx.insert('CRM_Kontak', Object.assign({ StatusWA: '', CekWAAt: '', OptOut: 'TIDAK', Catatan: '', JumlahPesan: 0, TerakhirDihubungi: '', DibuatPada: tx.now(), Tag: '' }, data));
  }
  A['crm.sync'] = function (tx) {
    var n0 = tx.all('CRM_Kontak').length;
    urutkan(tx.all('Pesanan'), function (p) { return tgl(p.Tgl_Mulai); }).forEach(function (p) { crmUpsertPesanan(tx, p); });
    tx.all('Pengguna').forEach(function (u) { crmUpsertSatu(tx, 'tim', u); });
    tx.all('Tim_Lapang').forEach(function (t) { crmUpsertSatu(tx, 'tl', t); });
    var n1 = tx.all('CRM_Kontak').length;
    return ok({ ditambah: n1 - n0, total: n1 }, 'Sinkron CRM selesai: ' + (n1 - n0) + ' kontak baru, total ' + n1 + '.');
  };
  A['crm.simpan'] = function (tx, d) {
    var k = tx.get('CRM_Kontak', d.KontakID); if (!k) throw salah('Kontak tidak ditemukan.');
    var p = {}; ['Tag', 'Catatan', 'OptOut'].forEach(function (f) { if (d[f] !== undefined) p[f] = str(d[f]); });
    var r = tx.update('CRM_Kontak', k.KontakID, p);
    tx.log('Ubah kontak CRM', 'CRM', k.KontakID, k.Nama);
    return ok(r, 'Kontak tersimpan.');
  };
  A['crm.bulk'] = function (tx, d) {
    var ids = d.ids || [], aksi = d.aksi, n = 0;
    ids.forEach(function (id) {
      var k = tx.get('CRM_Kontak', id); if (!k) return; var p = {};
      if (aksi === 'optout') p.OptOut = 'YA'; else if (aksi === 'optin') p.OptOut = 'TIDAK';
      else if (aksi === 'tag') { var tags = str(k.Tag).split(',').map(str).filter(Boolean); if (tags.indexOf(str(d.nilai)) < 0) tags.push(str(d.nilai)); p.Tag = tags.join(', '); }
      else if (aksi === 'untag') p.Tag = str(k.Tag).split(',').map(str).filter(function (t) { return t && t !== str(d.nilai); }).join(', ');
      tx.update('CRM_Kontak', id, p); n++;
    });
    tx.log('Aksi massal CRM: ' + aksi, 'CRM', n + ' kontak', str(d.nilai));
    return ok({ n: n }, n + ' kontak diperbarui.');
  };
  A['crm.interaksi'] = function (tx, d) {
    var k = tx.get('CRM_Kontak', d.KontakID); if (!k) throw salah('Kontak tidak ditemukan.');
    if (!str(d.Ringkasan)) throw salah('Ringkasan wajib diisi.');
    var r = tx.insert('CRM_Interaksi', { KontakID: k.KontakID, Kanal: str(d.Kanal) || 'Catatan', Arah: 'Keluar', Ringkasan: str(d.Ringkasan), Oleh: tx.user.nama, Tanggal: tx.now() });
    tx.update('CRM_Kontak', k.KontakID, { TerakhirDihubungi: tx.now() });
    return ok(r, 'Interaksi dicatat.');
  };
  A['wa.simpanCek'] = function (tx, d) {
    var p = d.peta || {}, now = tx.now(), n = 0;
    tx.all('CRM_Kontak').forEach(function (k) { var s = p[hp08(k.NoWA)]; if (s) { tx.update('CRM_Kontak', k.KontakID, { StatusWA: s, CekWAAt: now }); n++; } });
    return ok({ n: n }, n + ' kontak diperbarui status WA-nya.');
  };
  /** Audiens blast: segmen/tag + filter pesanan (kategori, bulan trip, belum lunas). */
  A['wa.audiens'] = function (tx, d) {
    var S = tx.S(), today = tx.today(), ix = indeks(tx.D), kk = tx.all('CRM_Kontak'), saring = !!(d.tab || d.bulan || d.belumLunas), lolos = null, varsRef = {};
    if (saring) {
      lolos = {};
      tx.all('Pesanan').forEach(function (p) {
        var inf = infoPesanan(p, S); if (d.tab && p.Tab !== d.tab) return; if (d.bulan && inf.bulan !== d.bulan) return;
        var t = tagihanPesanan(tx.D, ix, p, S, today); if (d.belumLunas && (t.lunas || t.sisa <= 0)) return;
        var ref = inf.hp ? 'HP:' + inf.hp : (inf.email ? 'EM:' + inf.email : ''); if (!ref) return;
        lolos[ref] = 1; varsRef[ref] = { trip: p.Trip, tglTrip: inf.jadwal, sisa: rp(t.sisa) };
      });
    }
    var seen = {}, rows = [];
    kk.forEach(function (k) {
      if (d.segmen && k.Segmen !== d.segmen) return;
      if (d.tag && str(k.Tag).toLowerCase().indexOf(str(d.tag).toLowerCase()) < 0) return;
      if (lolos && !(k.Sumber === 'pesanan' && lolos[k.RefID])) return;
      if (d.statusWA === 'terdaftar' && k.StatusWA !== 'Terdaftar') return;
      var hp = hp08(k.NoWA), valid = hpValid(hp), ganda = valid && seen[hp]; if (valid) seen[hp] = 1;
      var info = parseJson(k.Info, {}) || {};
      rows.push({ id: k.KontakID, nama: k.Nama, hp: hp, statusWA: k.StatusWA, optOut: k.OptOut === 'YA', valid: valid, ganda: !!ganda, demo: /\bDEMO\b/i.test(k.Tag || ''),
        vars: Object.assign({ nama: k.Nama, trip: info.trip || '', tglTrip: info.tgl ? tglId(info.tgl) : '', sisa: '' }, varsRef[k.RefID] || {}) });
    });
    var ring = { total: rows.length, valid: rows.filter(function (r) { return r.valid && !r.ganda; }).length, tidakValid: rows.filter(function (r) { return !r.valid; }).length, ganda: rows.filter(function (r) { return r.ganda; }).length,
      terdaftarWA: rows.filter(function (r) { return r.statusWA === 'Terdaftar'; }).length, tidakTerdaftarWA: rows.filter(function (r) { return r.statusWA === 'Tidak Terdaftar'; }).length, optOut: rows.filter(function (r) { return r.optOut; }).length };
    return ok({ rows: rows, ringkas: ring });
  };
  A['wa.blastBuat'] = function (tx, d) {
    var pesan = str(d.pesan); if (!pesan) throw salah('Isi pesan wajib diisi.');
    var ukuran = num(d.ukuranBatch); if ([10, 20, 50].indexOf(ukuran) < 0) throw salah('Ukuran batch harus 10, 20, atau 50.');
    var jeda = str(d.jeda || '5'); if (!/^\d{1,3}(-\d{1,3})?$/.test(jeda)) throw salah('Format jeda: angka (5) atau rentang (3-8).');
    if (!tx.H.waSiap()) throw salah('WhatsApp belum terhubung — isi token Fonnte di tab Konfigurasi.');
    var seen = {}, list = [];
    var S0 = tx.S(), opt = {}; tx.all('CRM_Kontak').forEach(function (k) { if (k.OptOut === 'YA' || (/\bDEMO\b/i.test(k.Tag || '') && S0.NOTIF_KIRIM_DEMO !== 'YA')) opt[hp08(k.NoWA)] = 1; });
    (d.penerima || []).forEach(function (p) { var hp = hp08(p.hp); if (!hpValid(hp) || seen[hp] || opt[hp]) return; seen[hp] = 1; list.push({ hp: hp, nama: str(p.nama), vars: p.vars || {} }); });
    if (!list.length) throw salah('Tidak ada penerima valid (nomor tidak valid, ganda, atau opt-out).');
    if (list.length > 5000) throw salah('Maksimal 5.000 penerima per blast.');
    var b = tx.insert('BlastWA', { Judul: str(d.judul) || 'Blast ' + tx.today(), Pesan: pesan, Sasaran: str(d.sasaran), Total: list.length, Terkirim: 0, Gagal: 0, UkuranBatch: ukuran, JedaDetik: jeda, Status: 'Berjalan', DibuatOleh: tx.user.nama, Tanggal: tx.now() });
    var now = tx.now(), S = tx.S();
    list.forEach(function (p) { var r = barisAntrian('WA', hp62(p.hp), p.nama, '', isiTemplate(pesan, Object.assign({ nama: p.nama || 'Bapak/Ibu', perusahaan: S.PT_NAMA }, p.vars)), 'BLAST', '', b.BlastID, ''); r.DibuatPada = now; tx.insert('AntrianNotif', r); });
    tx.nq += list.length;
    tx.log('Buat blast WA', 'Sistem', b.BlastID, list.length + ' penerima · batch ' + ukuran);
    return ok(b, 'Blast dibuat: ' + list.length + ' penerima → ' + Math.ceil(list.length / ukuran) + ' batch.');
  };
  A['wa.blastStop'] = function (tx, d) {
    var b = tx.get('BlastWA', d.blastId); if (!b) throw salah('Blast tidak ditemukan.');
    var n = 0; tx.where('AntrianNotif', function (r) { return r.BlastID === b.BlastID && r.Status === 'Antri'; }).forEach(function (r) { tx.update('AntrianNotif', r.AntrianID, { Status: 'Batal' }); n++; });
    tx.update('BlastWA', b.BlastID, { Status: 'Dihentikan', SelesaiPada: tx.now() });
    tx.log('Hentikan blast', 'Sistem', b.BlastID, n + ' pesan dibatalkan');
    return ok(tx.get('BlastWA', b.BlastID), 'Blast dihentikan. ' + n + ' pesan dibatalkan.');
  };
  A['notif.ulangi'] = function (tx, d) {
    var n = 0; tx.where('AntrianNotif', function (r) { return r.Status === 'Gagal' && (!d.ids || d.ids.indexOf(r.AntrianID) > -1); }).forEach(function (r) { tx.update('AntrianNotif', r.AntrianID, { Status: 'Antri', Percobaan: 0 }); n++; });
    return ok({ n: n }, n + ' pesan dimasukkan lagi ke antrean.');
  };
  A['notif.simpanKonfig'] = function (tx, d) {
    if (d.waAktif === true && !tx.H.waSiap()) throw salah('Isi token Fonnte dulu sebelum mengaktifkan WhatsApp.');
    if (d.waAktif !== undefined) tx.setS('NOTIF_WA_AKTIF', d.waAktif ? 'YA' : 'TIDAK');
    if (d.emailAktif !== undefined) tx.setS('NOTIF_EMAIL_AKTIF', d.emailAktif ? 'YA' : 'TIDAK');
    if (d.batchDefault) { if ([10, 20, 50].indexOf(num(d.batchDefault)) < 0) throw salah('Batch harus 10/20/50.'); tx.setS('WA_BATCH_DEFAULT', String(num(d.batchDefault))); }
    if (d.jeda) { if (!/^\d{1,3}(-\d{1,3})?$/.test(str(d.jeda))) throw salah('Format jeda tidak valid.'); tx.setS('WA_JEDA_DETIK', str(d.jeda)); }
    if (d.deteksiOtomatis !== undefined) tx.setS('WA_DETEKSI_OTOMATIS', d.deteksiOtomatis ? 'YA' : 'TIDAK');
    if (d.namaPengirim !== undefined) tx.setS('EMAIL_NAMA_PENGIRIM', str(d.namaPengirim));
    if (d.kirimDemo !== undefined) tx.setS('NOTIF_KIRIM_DEMO', d.kirimDemo ? 'YA' : 'TIDAK');
    if (d.appUrl !== undefined) tx.setS('APP_URL', str(d.appUrl));
    if (d.matriks) {
      var simpan = {}; Object.keys(d.matriks).forEach(function (k) {
        var def = NOTIF_EVENTS[k], m = d.matriks[k]; if (!def) return; var s = {};
        if (!!m.wa !== def.wa) s.wa = !!m.wa; if (!!m.email !== def.email) s.email = !!m.email;
        if (m.pesan && m.pesan !== def.pesan) s.pesan = m.pesan; if (m.subjek && m.subjek !== def.subjek) s.subjek = m.subjek;
        if (Object.keys(s).length) simpan[k] = s;
      });
      tx.setS('NOTIF_MATRIKS', JSON.stringify(simpan));
    }
    tx.log('Ubah konfigurasi notifikasi', 'Sistem', 'Notifikasi', '');
    return ok({ S: tx.S(), matriks: matriksNotif(tx.S()) }, 'Konfigurasi notifikasi tersimpan.');
  };

  /** Pengingat harian (trigger harian): sisa tagihan H-n sebelum trip (bila diaktifkan Finance). Tidak ganda di hari yang sama. */
  function pengingatHarian(tx) {
    var S = tx.S(); if (S.TAGIHAN_OTOMATIS !== 'YA') return 0;
    var today = tx.today(), ix = indeks(tx.D), n = 0, hs = str(S.TAGIHAN_H).split(',').map(function (x) { return num(x); }).filter(function (x) { return x >= 0; });
    var sudah = {}; tx.all('AntrianNotif').forEach(function (r) { if (r.RefID) sudah[r.Event + '|' + r.RefID] = 1; });
    tx.all('Pesanan').forEach(function (p) {
      var t = tagihanPesanan(tx.D, ix, p, S, today); if (t.lunas || t.sisa <= 0 || hs.indexOf(t.hari) < 0) return;
      var ref = p.ID_Pesanan + '@' + today; if (sudah['PENGINGAT_TAGIHAN|' + ref]) return;
      var m = notif(tx, 'PENGINGAT_TAGIHAN', { nama: p.Nama, hp: t.inf.hp, email: t.inf.email }, varsDasar(tx, { trip: p.Trip, tglTrip: t.inf.jadwal, sisa: rp(t.sisa), jatuhTempo: tglPanjang(t.jatuhTempo) }), ref);
      if (m) { n += m; var tg = tx.get('Tagihan', p.ID_Pesanan) || tx.insert('Tagihan', { ID_Pesanan: p.ID_Pesanan, Jumlah_Pengingat: 0 }); tx.update('Tagihan', p.ID_Pesanan, { Terakhir_Diingatkan: tx.now(), Jumlah_Pengingat: num(tg.Jumlah_Pengingat) + 1 }); }
    });
    return n;
  }

  // ==========================================================================
  // 8. ANTREAN TUGAS (Calendar / tulis rekap ke Google Sheet) — klaim → host kerjakan → selesaikan
  // ==========================================================================
  var BATAS_EVENT = 25;
  function klaimTugas(tx, maks) {
    var rows = tx.all('Antrean_Tugas'), byId = peta(rows, 'ID_Tugas'), out = [];
    rows.forEach(function (r) {
      if (r.Status !== 'Antri' || out.length >= (maks || 4)) return;
      var p = parseJson(r.Payload, {}), deps = p.setelah || [], siap = true, gagal = false;
      deps.forEach(function (id) { var x = byId[id]; if (!x) return; if (x.Status === 'Gagal') gagal = true; else if (x.Status !== 'Selesai') siap = false; });
      if (gagal) { tx.update('Antrean_Tugas', r.ID_Tugas, { Status: 'Gagal', Hasil: 'Prasyarat gagal', Selesai: tx.now() }); return; }
      if (!siap) return;
      // satu pekerja per jenis+ref (hindari dua sinkron kalender bersamaan)
      if (out.some(function (o) { return o.Jenis === r.Jenis && o.Ref === r.Ref; }) || rows.some(function (o) { return o.Jenis === r.Jenis && o.Ref === r.Ref && o.Status === 'Proses'; })) return;
      tx.update('Antrean_Tugas', r.ID_Tugas, { Status: 'Proses', Percobaan: num(r.Percobaan) + 1 });
      out.push(konteksTugas(tx, tx.get('Antrean_Tugas', r.ID_Tugas)));
    });
    return out;
  }
  function barisRekapSheet(r) { return { id: r.id, kode: r.kode, qty: r.inf.pax, pic: r.bagian === 'SB' ? (r.kapal || '') : str(r.p.PIC), price: r.inf.harga || (r.inf.pax ? Math.round(r.penjualan / r.inf.pax) : r.penjualan), kol: r.kol, status: r.status, mulai: r.inf.mulai }; }
  function dataRekapSheet(D, S, today, bulan) {
    var per = rentangPeriode(bulan, today), rows = rekapDaftar(D, { dari: per.dari, sampai: per.sampai, S: S, today: today });
    return { bulan: bulan, label: per.label, YB: rows.filter(function (r) { return r.bagian === 'YB'; }).map(barisRekapSheet), SB: rows.filter(function (r) { return r.bagian === 'SB'; }).map(barisRekapSheet) };
  }
  function konteksTugas(tx, r) {
    var S = tx.S(), D = tx.D, k = { ID_Tugas: r.ID_Tugas, Jenis: r.Jenis, Ref: r.Ref, payload: parseJson(r.Payload, {}), S: S };
    if (r.Jenis === 'KAL_SINKRON') {
      var ix = indeks(D), ev = [], adaId = {};
      (D.Pesanan || []).forEach(function (p) {
        var e = eventPesanan(D, ix, p, S); if (!e) return; adaId[p.ID_Pesanan] = 1;
        var lama = ix.evt[p.ID_Pesanan]; if (lama && lama.Hash === e.hash && lama.Status === 'OK') return;
        e.eventId = lama ? lama.Event_ID : ''; e.lampiranLama = lama ? lama.Lampiran : ''; ev.push(e);
      });
      k.events = ev.slice(0, BATAS_EVENT); k.sisa = Math.max(0, ev.length - BATAS_EVENT);
      k.hapus = (D.Kalender_Event || []).filter(function (e) { return !adaId[e.ID_Pesanan] && e.Status !== 'Dihapus' && e.Event_ID; }).slice(0, BATAS_EVENT).map(function (e) { return { id: e.ID_Pesanan, eventId: e.Event_ID }; });
    } else if (r.Jenis === 'REKAP_SHEET') {
      var today = tx.today(), bulan = [];
      if (r.Ref === 'semua') { var o = {}; (D.Pesanan || []).forEach(function (p) { var b = infoPesanan(p, S).bulan; if (b) o[b] = 1; }); (D.Rekap || []).forEach(function (x) { var sp = parseJson(x.Snapshot, null); if (sp && sp.p && sp.p.Tgl_Mulai) o[String(sp.p.Tgl_Mulai).slice(0, 7)] = 1; }); bulan = Object.keys(o).sort(); }
      else bulan = [r.Ref];
      k.label = labelRekap(S); k.formatTab = S.REKAP_TAB || 'Rekap {bulan} {tahun}';
      k.bulan = bulan.map(function (b) { return dataRekapSheet(D, S, today, b); });
    }
    return k;
  }
  /** hasil: {ok, pesan, data} */
  function selesaikanTugas(tx, idTugas, hasil) {
    var r = tx.get('Antrean_Tugas', idTugas); if (!r) return;
    var h = hasil || {}, d = h.data || {};
    if (!h.ok) {
      var final = num(r.Percobaan) >= 3;
      tx.update('Antrean_Tugas', idTugas, { Status: final ? 'Gagal' : 'Antri', Hasil: str(h.pesan).slice(0, 300), Selesai: final ? tx.now() : '' });
      return;
    }
    tx.update('Antrean_Tugas', idTugas, { Status: 'Selesai', Hasil: str(h.pesan || 'OK').slice(0, 300), Selesai: tx.now() });
    if (r.Jenis === 'KAL_SINKRON') {
      var now = tx.now();
      (d.hasil || []).forEach(function (x) {
        var row = { Event_ID: str(x.eventId), Hash: x.ok ? str(x.hash) : '', Lampiran: str(x.lampiran), Tamu: JSON.stringify(x.tamu || []), Status: x.ok ? 'OK' : 'Gagal', Pesan: str(x.pesan).slice(0, 180), Diperbarui: now };
        if (tx.get('Kalender_Event', x.id)) tx.update('Kalender_Event', x.id, row); else { row.ID_Pesanan = x.id; tx.insert('Kalender_Event', row); }
      });
      (d.hapus || []).forEach(function (id) { if (tx.get('Kalender_Event', id)) tx.remove('Kalender_Event', id); });
      if (num(d.sisa) > 0) tx.job('KAL_SINKRON', 'semua', {});
    }
  }
  function tugasTertunda(D) { return D.Antrean_Tugas.filter(function (r) { return r.Status === 'Antri' || r.Status === 'Proses'; }).length; }

  // ==========================================================================
  // 9. ROUTES (RBAC dicek di server) & DISPATCH
  // ==========================================================================
  var ROUTES = {
    'pesanan.simpan': { roles: ADM }, 'pesanan.hapus': { roles: ADM },
    'kalkulasi.simpan': { roles: ADM }, 'kalkulasi.hapus': { roles: ADM }, 'paket.simpan': { roles: ADM }, 'paket.hapus': { roles: ADM },
    'manifest.simpan': { roles: ADM }, 'manifest.catatTerbit': { roles: ADM, internal: true }, 'manifest.catatUndang': { roles: ADM, internal: true },
    'rekap.simpan': { roles: ADM }, 'rekap.ajukan': { roles: ADM }, 'rekap.kunci': { roles: FIN }, 'rekap.buka': { roles: FIN },
    'bayar.simpan': { roles: FIN }, 'bayar.hapus': { roles: FIN }, 'tagihan.tandai': { roles: FIN }, 'tagihan.atur': { roles: FIN }, 'tagihan.ingatkan': { roles: FIN }, 'tagihan.otomatis': { roles: FIN },
    'invoice.simpan': { roles: ADM }, 'invoice.catatTerbit': { roles: ADM, internal: true }, 'invoice.kirim': { roles: SEMUA }, 'invoice.batal': { roles: ADM }, 'invoice.hapus': { roles: ADM },
    'tl.simpan': { roles: ADM }, 'tl.hapus': { roles: ADM },
    'biaya.simpan': { roles: FIN }, 'biaya.hapus': { roles: FIN }, 'laporan.catat': { roles: SEMUA },
    'pengaturan.simpan': { roles: ADM }, 'pengaturan.default': { roles: ADM },
    'pengguna.simpan': { roles: ADM, pengelola: true }, 'pengguna.resetPin': { roles: ADM, pengelola: true },
    'pengguna.foto': { roles: SEMUA }, 'pengguna.gantiPin': { roles: SEMUA },
    'crm.sync': { roles: ADM }, 'crm.simpan': { roles: ADM }, 'crm.bulk': { roles: ADM }, 'crm.interaksi': { roles: ADM },
    'wa.simpanCek': { roles: ADM }, 'wa.audiens': { roles: ADM, baca: true }, 'wa.blastBuat': { roles: ADM }, 'wa.blastStop': { roles: ADM },
    'notif.ulangi': { roles: ADM }, 'notif.simpanKonfig': { roles: ADM }
  };
  Object.keys(ROUTES).forEach(function (k) { ROUTES[k].fn = A[k]; });
  // Tabel yang disentuh tiap aksi selain tabel inti (server memuat sesuai kebutuhan)
  var BUTUH_SUMBER = /^(pesanan|kalkulasi|manifest|rekap|bayar|tagihan|invoice|crm\.sync|wa\.audiens)\b/;

  /** Jalankan satu aksi tulis/baca terdaftar. Host bertanggung jawab atas auth & lock & commit. */
  function jalankan(H, user, action, data) {
    var r = ROUTES[action];
    if (!r || !r.fn) return fail('Aksi tidak dikenal: ' + action, { code: 'UNKNOWN' });
    if (r.roles && r.roles.indexOf(user.peran) < 0) return fail('Akses ditolak: menu ini bukan untuk peran ' + user.peran + '.', { code: 'FORBIDDEN' });
    if (r.pengelola && user.pengelola !== 'YA') return fail('Hanya akun pengelola pengguna yang boleh melakukan ini.', { code: 'FORBIDDEN' });
    var tx = new Tx(H, user);
    try { var res = r.fn(tx, data || {}) || ok(); return tx.hasil(res); }
    catch (e) { var f = fail(e && e.pengguna ? e.message : 'Gagal memproses: ' + (e && e.message ? e.message : e)); f.gagalTulis = true; return f; }
  }

  /** Data awal untuk frontend (tanpa kolom rahasia) — dipotong untuk tabel log besar. */
  function dataBoot(D, user) {
    var out = {}, admin = user && user.peran === 'Admin';
    Object.keys(SKEMA).forEach(function (t) {
      var rows = D[t] || [];
      if (t === 'Pengguna') rows = rows.map(function (r) { return bersihkanBaris(t, r); });
      if (t === 'Log_Aktivitas') rows = rows.slice(-600);
      if (t === 'Antrean_Tugas') rows = rows.filter(function (r) { return r.Status !== 'Selesai'; }).concat(rows.filter(function (r) { return r.Status === 'Selesai'; }).slice(-60));
      if (t === 'AntrianNotif') rows = admin ? rows.slice(-400) : [];
      if (t === 'CRM_Interaksi') rows = admin ? rows.slice(-400) : [];
      if ((t === 'CRM_Kontak' || t === 'BlastWA') && !admin) rows = [];
      out[t] = rows;
    });
    return out;
  }
  /** Hak buka menu yang diatur Admin (report, laba rugi, tagihan). */
  function aksesMenu(S, menu, peran) {
    if (!MENU_DIATUR[menu]) return true;
    var a = parseJson(S && S.AKSES_MENU, null) || parseJson(PENGATURAN_DEFAULT.AKSES_MENU[0], {});
    var l = a[menu]; if (!Array.isArray(l)) l = SEMUA; return l.indexOf(peran) > -1;
  }

  // ==========================================================================
  // 10. KOLOM TAB (dipakai host & demo) — label header sheet → kolom kanonik
  // ==========================================================================
  /** daftar = [label, ...] atau {grup:'CHECK LIST KEBUTUHAN', isi:[...]} → [{label, kunci, grup, idx}] */
  function susunKolom(daftar) {
    var out = [], idx = 0;
    daftar.forEach(function (x) {
      if (typeof x === 'object') { x.isi.forEach(function (l) { out.push({ label: l, kunci: '', grup: x.grup, idx: idx++ }); }); return; }
      out.push({ label: str(x), kunci: kunciKanonik(x), grup: '', idx: idx++ });
    });
    return out;
  }

  // ==========================================================================
  // 11. DATA DEMO (Mode Demo browser) — memakai isi file dummy klien + data tambahan
  // ==========================================================================
  function isiDemo(H, opsi) {
    opsi = opsi || {};
    var tx = new Tx(H, { nama: 'Sistem', peran: 'Admin', email: 'sistem', id: 'SYS' });
    var today = tx.today(), seed = 20261118;
    function acak() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    function pilih(a) { return a[Math.floor(acak() * a.length)]; }
    function antara(a, b) { return a + Math.floor(acak() * (b - a + 1)); }
    function hari(n) { return tambahHari(today, n); }
    function wkt(n, jam) { return hari(n) + 'T' + (jam || pad(8 + Math.floor(acak() * 10), 2) + ':' + pad(Math.floor(acak() * 60), 2) + ':00'); }

    Object.keys(PENGATURAN_DEFAULT).forEach(function (k) { if (!tx.get('Pengaturan', k)) tx.insert('Pengaturan', { Kunci: k, Nilai: PENGATURAN_DEFAULT[k][0], Keterangan: PENGATURAN_DEFAULT[k][1] }); });
    if (opsi.appUrl) tx.setS('APP_URL', opsi.appUrl);
    if (opsi.verifUrl) tx.setS('VERIF_URL', opsi.verifUrl);
    tx.setS('MNF_PIC_DEFAULT', 'Riyan Uceng');
    tx.setS('LOGO_URL', 'assets/logo-yb.png');
    if (opsi.simulasi) { tx.setS('NOTIF_WA_AKTIF', 'YA'); tx.setS('NOTIF_EMAIL_AKTIF', 'YA'); }

    if (opsi.denganPengguna) {
      [['Nadia Putri', 'admin@yukbanyuwangi.demo', 'Admin', 'YA', '081211110001'], ['Bagas Saputra', 'bagas@yukbanyuwangi.demo', 'Admin', 'TIDAK', '081211110002'],
        ['Laras Wening', 'finance@yukbanyuwangi.demo', 'Finance', 'TIDAK', '081211110003']].forEach(function (u, i) {
        var salt = 'demo-salt-' + i; tx.insert('Pengguna', { Nama: u[0], Email: u[1], Peran: u[2], Pengelola: u[3], No_WA: u[4], Salt: salt, Hash_PIN: H.hash('123456', salt), Status: 'Aktif', Foto_URL: '', Terakhir_Login: wkt(-i, '08:1' + i + ':00'), Dibuat: wkt(-120) });
      });
    }
    // Tim Lapang (nama dari file contoh klien)
    var TLD = [['Yunus', 'TL & Driver', '081300000101'], ['Ikrom', 'Guide', '081300000102'], ['Faad', 'Guide', '081300000103'], ['Ichang', 'Tim Dokumentasi', '081300000104'], ['Tendy', 'Tim Dokumentasi', '081300000105'], ['Hamzah', 'Korlap Kapal', '081300000106']];
    var tlId = {}; TLD.forEach(function (t) { var r = tx.insert('Tim_Lapang', { Nama: t[0], Peran: t[1], No_HP: t[2], Email: t[0].toLowerCase() + '.tl@example.com', Status: 'Aktif', Catatan: '', Dibuat: wkt(-90) }); tlId[t[0]] = r; });

    // ---------- Tab sumber (struktur PERSIS file Dummy Database Pemesanan + kolom tambahan sistem)
    var CEK = { grup: 'CHECK LIST KEBUTUHAN', isi: ['KENDARAAN', 'JEEP', 'GUIDE', 'TIM DOKUMENTASI', 'PENGINAPAN', 'KAPAL SELATAN', 'LAIN-LAIN'] };
    var OT = ['No', 'Nama', 'PIC', 'Pax', 'Jenis Trip', 'Tanggal Trip', 'NO. HP', 'Asal', 'Sumber Info', 'Email', 'Instagram', 'Penjemputan', 'Harga Jual', 'Total Penjualan', 'DP', 'Sisa Tagihan', 'Setoran', LABEL_TGL_PESAN, LABEL_ID];
    var TABS = [
      ['Private YB', 2, ['NOMOR', 'NAMA', 'PIC', 'NO HP', 'PAX', 'TRIP', 'TANGGAL TRIP MULAI', 'TANGGAL TRIP SELESAI', 'ASAL', 'SUMBER INFO', 'EMAIL', 'PENJEMPUTAN', 'LOKASI DROP', 'HARGA', 'TOTAL PENJUALAN', 'DP', 'SISA TAGIHAN', 'LINK BUKTI TF', 'ITINERARY', 'KALKULASI', CEK, LABEL_TGL_PESAN, LABEL_ID]],
      ['KLB', 1, OT], ['OT Sunrise Boat', 1, OT],
      ['Private SB', 1, ['No', 'Nama', 'PIC', 'Pax', 'Jenis Trip', 'Tanggal Trip', 'NO. HP', 'Asal', 'Sumber Info', 'Email', 'Penjemputan', 'Harga Jual', 'Total Penjualan', 'DP', 'Sisa Tagihan', LABEL_TGL_PESAN, LABEL_ID]],
      ['OT Darat', 1, OT], ['TWS', 1, OT]];
    TABS.forEach(function (t, i) { var kol = susunKolom(t[2]); kol.forEach(function (k) { if (k.kunci === 'Total' || k.kunci === 'Sisa') k.rumus = true; }); tx.insert('Sumber_Tab', { Nama: t[0], Urutan: i + 1, Header: t[1], Kolom: JSON.stringify(kol), Jumlah: 0, Ada_ID: 'YA', Ada_Tgl_Pesan: 'YA' }); });

    var LINK_ITIN = 'https://docs.google.com/document/d/1ContohItineraryIndofarmaDemoYukBanyuwangi0/edit?usp=sharing';
    var LINK_KAL = 'https://docs.google.com/spreadsheets/d/1ContohKalkulasiAgungDemoYukBanyuwangi000000/edit?gid=0#gid=0';
    var LINK_TF = 'https://docs.google.com/document/d/1ContohBuktiTransferDemoYukBanyuwangi0000000/edit?usp=drive_link';
    var noTab = {};
    function tambah(tab, o) {
      noTab[tab] = (noTab[tab] || 0) + 1; var pax = num(o.Pax), harga = num(o.Harga);
      var row = { Tab: tab, Baris: noTab[tab] + (tab === 'Private YB' ? 2 : 1), No: o.No != null ? o.No : String(noTab[tab]), Nama: o.Nama, PIC: o.PIC || '', No_HP: hp08(o.HP), Pax: pax, Trip: o.Trip, Tgl_Mulai: o.Mulai, Tgl_Selesai: o.Selesai || '',
        Asal: o.Asal || '', Sumber_Info: o.Sumber || '', Email: o.Email || '', Instagram: o.IG || '', Penjemputan: o.Jemput || '', Lokasi_Drop: o.Drop || '', Harga: harga, Total: pax * harga, DP: num(o.DP), Sisa: pax * harga - num(o.DP),
        Setoran: '', Link_Bukti_TF: o.TF || '', Link_Itinerary: o.Itin || '', Link_Kalkulasi: o.Kal || '', Tgl_Pesan: o.Pesan || tambahHari(o.Mulai, -antara(7, 40)),
        Checklist: JSON.stringify(o.Cek || (tab === 'Private YB' ? { KENDARAAN: '', JEEP: '', GUIDE: '', 'TIM DOKUMENTASI': '', PENGINAPAN: '', 'KAPAL SELATAN': '', 'LAIN-LAIN': '' } : {})), Lain: '{}', Rumus: 'Total,Sisa', H: '' };
      return tx.insert('Pesanan', row);
    }
    // 13 baris persis dari file Dummy Database Pemesanan klien
    var IND = tambah('Private YB', { No: '1', Nama: 'PT Indofarma Indonesia', PIC: 'Agung', HP: '6281803494964', Pax: 30, Trip: 'Private Trip 3D2N Banyuwangi', Mulai: '2026-09-03', Selesai: '2026-09-05', Asal: 'Surabaya', Sumber: 'Instagram', Email: 'indofarma@gmail.com', Harga: 2500000, DP: 10000000, TF: LINK_TF, Itin: LINK_ITIN, Kal: LINK_KAL, Pesan: '2026-08-02',
      Cek: { KENDARAAN: 'Rama Trans', JEEP: 'Jeep Kantor', GUIDE: 'Ikrom', 'TIM DOKUMENTASI': 'Ichang', PENGINAPAN: 'Kokoon Hotel', 'KAPAL SELATAN': 'Hamzah', 'LAIN-LAIN': 'Outbound' } });
    var ANG = tambah('Private YB', { No: '2', Nama: 'Anggi Novita', PIC: 'Fida', HP: '6282338950811', Pax: 10, Trip: 'Private Trip 4D3N Banyuwangi', Mulai: '2026-09-05', Selesai: '2026-09-08', Asal: 'Jakarta', Sumber: 'Tiktok', Email: 'angginovita21@gmail.com', Harga: 3000000, DP: 5000000, TF: LINK_TF, Itin: LINK_ITIN, Kal: LINK_KAL, Pesan: '2026-08-10',
      Cek: { KENDARAAN: 'Hiace Kantor', JEEP: 'Jeep Hendrik', GUIDE: 'Faad', 'TIM DOKUMENTASI': 'Tendy', PENGINAPAN: 'eL Hotel', 'KAPAL SELATAN': '-', 'LAIN-LAIN': '-' } });
    var MUT = tambah('KLB', { No: '', Nama: 'Mutiara Tsalisa', PIC: 'Website', HP: '87705352879', Pax: 1, Trip: 'Open Trip Keliling Banyuwangi 3D2N', Mulai: '2026-08-15', Asal: 'BANDUNG', Sumber: 'Instagram', Email: 'mutiaratsalisa@gmail.com', IG: '@muuuti', Jemput: 'Stasiun Banyuwangi Kota', Harga: 1500000, DP: 450000, Pesan: '2026-07-20' });
    var ULF = tambah('KLB', { No: '', Nama: 'Ulfa Habiba', PIC: 'Fida', HP: '8988309490', Pax: 1, Trip: 'Open Trip Keliling Banyuwangi 3D2N', Mulai: '2026-08-15', Asal: 'BANDUNG', Sumber: 'Instagram', Email: 'ulfahabiba@gmail.com', IG: '@ulfaayk', Jemput: 'Stasiun Banyuwangi Kota', Harga: 1500000, DP: 450000, Pesan: '2026-07-22' });
    var DEV = tambah('OT Sunrise Boat', { No: '', Nama: 'Devi Tri Aprilia', PIC: 'Website', HP: '87705352879', Pax: 2, Trip: 'Open Trip Tabuhan Only', Mulai: '2026-11-01', Asal: 'Malang', Sumber: 'Instagram', Email: 'devitriaprilia1@gmail.com', Harga: 100000, DP: 60000, Pesan: '2026-10-18' });
    var BUN = tambah('OT Sunrise Boat', { No: '', Nama: 'Bunga', PIC: 'CS YB 3', HP: '8988309490', Pax: 4, Trip: 'Open Trip Menjangan Tabuhan', Mulai: '2026-11-03', Asal: 'Sidoarjo', Sumber: 'Tiktok', Email: 'bunga@gmail.com', IG: '-', Jemput: '-', Harga: 295000, DP: 200000, Pesan: '2026-10-21' });
    var IRH = tambah('Private SB', { No: '1', Nama: 'Irham (Dearbanyuwangi)', PIC: 'Agung', HP: '81827379887', Pax: 2, Trip: 'PT Tabuhan Only', Mulai: '2026-09-01', Asal: 'Jakarta', Sumber: '-', Email: '-', Jemput: '-', Harga: 200000, DP: 100000, Pesan: '2026-08-25' });
    var MAH = tambah('Private SB', { No: '2', Nama: 'PT Mahkota Intan', PIC: 'Agung', HP: '87527630798', Pax: 37, Trip: 'PT Tabuhan Only', Mulai: '2026-09-03', Asal: 'Jakarta', Sumber: '-', Email: '-', Jemput: '-', Harga: 200000, DP: 500000, Pesan: '2026-08-19' });
    var JUL = tambah('OT Darat', { No: '1', Nama: 'Julio Xiantara', PIC: 'Website', HP: '86739866398', Pax: 3, Trip: 'Open Trip Ijen Midnight', Mulai: '2026-08-14', Asal: 'Malang', Sumber: 'Instagram', Email: 'julio@gmail.com', Jemput: 'Kokoon Hotel', Harga: 275000, DP: 200000, Pesan: '2026-08-01' });
    var AND = tambah('OT Darat', { No: '2', Nama: 'Andel', PIC: 'Website', HP: '86739866399', Pax: 3, Trip: 'Open Trip Baluran', Mulai: '2026-08-22', Asal: 'Bekasi', Sumber: 'Instagram', Email: 'andel@gmail.com', Jemput: 'Santika Hotel', Harga: 300000, DP: 270000, Pesan: '2026-08-09' });
    var SIS = tambah('OT Darat', { No: '3', Nama: 'Sisca', PIC: 'Website', HP: '86739866300', Pax: 1, Trip: 'Open Trip Djawatan Baluran', Mulai: '2026-08-25', Asal: 'Banyuwangi', Sumber: 'Tiktok', Email: 'sisca@gmail.com', Jemput: 'Santika Hotel', Harga: 300000, DP: 100000, Pesan: '2026-08-20' });
    var DIN = tambah('TWS', { No: '', Nama: 'Dinny Annissya Wardani', PIC: 'Website', HP: '85606258663', Pax: 2, Trip: 'Tabuhan Watersport Paket Jet Ski Weekend', Mulai: '2026-10-03', Asal: 'Kab. Nganjuk', Sumber: 'Instagram', Email: 'dinnyanni@gmail.com', IG: 'dinnya_', Harga: 350000, DP: 300000, Pesan: '2026-09-21' });
    var AFN = tambah('TWS', { No: '', Nama: 'Afnan', PIC: 'Website', HP: '83825729140', Pax: 2, Trip: 'Tabuhan Watersport Paket Paddle Board Weekend', Mulai: '2026-10-04', Asal: 'Yogyakarta', Sumber: 'Instagram', Email: 'afnan@gmail.com', IG: 'Afnan', Harga: 150000, DP: 100000, Pesan: '2026-09-25' });

    // Pesanan tambahan (fiktif) agar report & kalender terisi — tanggal relatif hari ini
    var KOTA = ['Surabaya', 'Jakarta', 'Malang', 'Bandung', 'Sidoarjo', 'Yogyakarta', 'Semarang', 'Denpasar', 'Bekasi', 'Tangerang', 'Kediri', 'Jember', 'Surakarta', 'Bogor', 'Depok', 'Banyuwangi', 'Surabaya', 'Jakarta', 'Malang'];
    var SUMBER = ['Instagram', 'Instagram', 'Tiktok', 'Tiktok', 'Website', 'Google', 'Teman / Rekomendasi', 'Repeat Order', 'Facebook', 'Instagram'];
    var DEPAN = ['Rizky', 'Ayu', 'Dimas', 'Putri', 'Fajar', 'Nabila', 'Yoga', 'Salsa', 'Hendra', 'Citra', 'Bima', 'Intan', 'Galih', 'Wulan', 'Reza', 'Melati', 'Arif', 'Tiara', 'Dewa', 'Kirana', 'Satria', 'Laila'];
    var BELAKANG = ['Pratama', 'Lestari', 'Wibowo', 'Anggraini', 'Santoso', 'Permata', 'Hidayat', 'Maharani', 'Kusuma', 'Ramadhani', 'Saputri', 'Nugroho'];
    var GRUPP = ['PT Sinar Abadi Logistik', 'Keluarga Hartono', 'Komunitas Lari Kediri', 'CV Mitra Karya Teknik', 'Alumni SMAN Pelita 2010', 'PT Nusantara Agro Lestari', 'Rombongan Arisan Melati', 'Klinik Sehat Sentosa', 'Koperasi Karyawan Bina Usaha', 'Keluarga Wiranata'];
    var PROD = {
      'Private YB': [['Private Trip 3D2N Banyuwangi', 2500000, 2], ['Private Trip 2D1N Ijen & Baluran', 1650000, 1], ['Private Trip 4D3N Banyuwangi', 3000000, 3]],
      'KLB': [['Open Trip Keliling Banyuwangi 3D2N', 1500000, 2], ['Open Trip Keliling Banyuwangi 2D1N', 950000, 1]],
      'OT Sunrise Boat': [['Open Trip Tabuhan Only', 100000, 0], ['Open Trip Menjangan Tabuhan', 295000, 0], ['Open Trip Sunrise Boat Menjangan', 350000, 0]],
      'Private SB': [['PT Tabuhan Only', 200000, 0], ['PT Menjangan Tabuhan', 450000, 0]],
      'OT Darat': [['Open Trip Ijen Midnight', 275000, 0], ['Open Trip Baluran', 300000, 0], ['Open Trip Djawatan Baluran', 300000, 0], ['Open Trip Ijen Sunrise', 325000, 0]],
      'TWS': [['Tabuhan Watersport Paket Jet Ski Weekend', 350000, 0], ['Tabuhan Watersport Paket Paddle Board Weekend', 150000, 0], ['Tabuhan Watersport Paket Banana Boat', 125000, 0]]
    };
    var CS = ['Agung', 'Fida', 'CS YB 3', 'Website'], JEMPUT = ['Stasiun Banyuwangi Kota', 'Bandara BWI', 'Pelabuhan Ketapang', 'Kokoon Hotel', 'Santika Hotel', 'Dialog Hotel', 'eL Hotel'];
    var BOBOT = [['Private YB', 4], ['KLB', 3], ['OT Sunrise Boat', 4], ['Private SB', 2], ['OT Darat', 5], ['TWS', 3]], tot = 0; BOBOT.forEach(function (b) { tot += b[1]; });
    var tambahan = [];
    for (var i = 0; i < 64; i++) {
      var r = acak() * tot, tab = BOBOT[0][0]; for (var j = 0, c = 0; j < BOBOT.length; j++) { c += BOBOT[j][1]; if (r < c) { tab = BOBOT[j][0]; break; } }
      var pr = pilih(PROD[tab]), mulai = hari(antara(-105, 68)), priv = /Private/.test(tab);
      var pax = priv ? (tab === 'Private SB' ? antara(4, 30) : antara(4, 28)) : antara(1, 6), harga = pr[1];
      var nama = priv && acak() < 0.55 ? pilih(GRUPP) : pilih(DEPAN) + ' ' + pilih(BELAKANG), total = pax * harga;
      var dp = acak() < 0.15 ? total : Math.round(total * pilih([0.3, 0.4, 0.5]) / 10000) * 10000;
      var o = { Nama: nama, PIC: pilih(CS), HP: '08' + antara(11, 99) + pad(antara(0, 99999999), 8), Pax: pax, Trip: pr[0], Mulai: mulai, Selesai: pr[2] ? tambahHari(mulai, pr[2]) : '', Asal: pilih(KOTA), Sumber: pilih(SUMBER),
        Email: nama.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@example.com', IG: priv ? '' : '@' + nama.split(' ')[0].toLowerCase() + antara(1, 99), Jemput: pilih(JEMPUT), Drop: priv ? pilih(JEMPUT) : '', Harga: harga, DP: dp, Pesan: tambahHari(mulai, -antara(4, 48)) };
      if (o.Pesan > today) o.Pesan = hari(-antara(0, 3));
      if (tab === 'Private YB') { o.Itin = LINK_ITIN; o.Cek = { KENDARAAN: pilih(['Hiace Kantor', 'Rama Trans', 'Elf Kantor', 'Bus Pariwisata']), JEEP: pilih(['Jeep Kantor', 'Jeep Hendrik', '-']), GUIDE: pilih(['Ikrom', 'Faad', 'Yunus']), 'TIM DOKUMENTASI': pilih(['Ichang', 'Tendy', '-']), PENGINAPAN: pilih(['Kokoon Hotel', 'eL Hotel', 'Dialog Hotel', 'Santika Hotel']), 'KAPAL SELATAN': pilih(['Hamzah', '-']), 'LAIN-LAIN': pilih(['-', 'Outbound', 'Gala dinner']) }; }
      tambahan.push(tambah(tab, o));
    }
    // Pesanan yang meniru contoh manifest klien (KISVAN SIMARMATA, 3D2N, TL Yunus) — dijadwalkan sebentar lagi
    var KIS = tambah('Private YB', { Nama: 'Kisvan Simarmata', PIC: 'Agung', HP: '08119461463', Pax: 4, Trip: 'Private Trip 3D2N Banyuwangi', Mulai: hari(9), Selesai: hari(11), Asal: 'Jakarta', Sumber: 'Repeat Order', Email: 'kisvan@example.com', Jemput: 'Bandara BWI', Drop: 'Dialog Hotel', Harga: 2150000, DP: 4300000, Itin: LINK_ITIN, Pesan: hari(-12),
      Cek: { KENDARAAN: 'MPV (Innova) Kantor', JEEP: '-', GUIDE: 'Yunus', 'TIM DOKUMENTASI': '-', PENGINAPAN: 'Dialog Hotel', 'KAPAL SELATAN': '-', 'LAIN-LAIN': 'ATV Capas' } });

    // ---------- Paket kalkulasi reguler (dipakai otomatis per nama trip)
    var PAKET = {
      'Open Trip Ijen Midnight': ['YB', [['TRANSPORT ELF (BAGI RATA)', 0, 70000, 'TIDAK'], ['GUIDE IJEN', 0, 25000, 'YA', 'MAN POWER'], ['KARCIS IJEN', 0, 15000, 'YA', 'KARCIS'], ['MASKER GAS', 0, 15000, 'YA', 'AGEN/LAIN-LAIN'], ['AIR MINERAL', 0, 5000, 'YA', 'KONSUMSI'], ['SERVICE', 0, 10000, 'YA', 'SERVICE']]],
      'Open Trip Ijen Sunrise': ['YB', [['TRANSPORT ELF (BAGI RATA)', 0, 70000, 'TIDAK'], ['GUIDE IJEN', 0, 25000, 'YA', 'MAN POWER'], ['KARCIS IJEN', 0, 15000, 'YA', 'KARCIS'], ['MASKER GAS', 0, 15000, 'YA', 'AGEN/LAIN-LAIN'], ['SARAPAN', 0, 25000, 'YA', 'KONSUMSI'], ['SERVICE', 0, 10000, 'YA', 'SERVICE']]],
      'Open Trip Baluran': ['YB', [['JEEP BALURAN (BAGI RATA)', 0, 90000, 'TIDAK'], ['GUIDE', 0, 25000, 'YA', 'MAN POWER'], ['KARCIS BALURAN', 0, 25000, 'YA', 'KARCIS'], ['MAKAN SIANG', 0, 30000, 'YA', 'KONSUMSI'], ['SERVICE', 0, 10000, 'YA', 'SERVICE']]],
      'Open Trip Djawatan Baluran': ['YB', [['JEEP BALURAN (BAGI RATA)', 0, 90000, 'TIDAK'], ['GUIDE', 0, 25000, 'YA', 'MAN POWER'], ['KARCIS DJAWATAN', 0, 10000, 'YA', 'KARCIS'], ['KARCIS BALURAN', 0, 25000, 'YA', 'KARCIS'], ['MAKAN SIANG', 0, 30000, 'YA', 'KONSUMSI'], ['SERVICE', 0, 10000, 'YA', 'SERVICE']]],
      'Open Trip Keliling Banyuwangi 3D2N': ['YB', [['HIACE (BAGI RATA)', 0, 260000, 'TIDAK'], ['PENGINAPAN 2 MALAM', 0, 320000, 'TIDAK'], ['PAKET PULAU', 0, 120000, 'TIDAK'], ['TL', 0, 60000, 'YA', 'MAN POWER'], ['MAKAN DAY 1', 0, 60000, 'YA', 'KONSUMSI'], ['MAKAN DAY 2', 0, 60000, 'YA', 'KONSUMSI'], ['KARCIS WISATA', 0, 85000, 'YA', 'KARCIS'], ['MASKER GAS', 0, 15000, 'YA', 'AGEN/LAIN-LAIN'], ['SERVICE', 0, 20000, 'YA', 'SERVICE']]],
      'Open Trip Keliling Banyuwangi 2D1N': ['YB', [['HIACE (BAGI RATA)', 0, 180000, 'TIDAK'], ['PENGINAPAN 1 MALAM', 0, 160000, 'TIDAK'], ['TL', 0, 45000, 'YA', 'MAN POWER'], ['MAKAN DAY 1', 0, 60000, 'YA', 'KONSUMSI'], ['KARCIS WISATA', 0, 60000, 'YA', 'KARCIS'], ['SERVICE', 0, 15000, 'YA', 'SERVICE']]],
      'Open Trip Tabuhan Only': ['SB', [['KAPTEN & ABK', 0, 20000, 'YA', 'MAN POWER', 'KAPTEN'], ['BBM, OLI', 0, 15000, 'TIDAK', '', 'BBMOLI'], ['KONSUMSI + AIR MINERAL', 0, 10000, 'YA', 'KONSUMSI', 'KONSUMSB'], ['ASURANSI', 0, 3000, 'TIDAK', '', 'ASURANSI'], ['TIKET', 0, 15000, 'YA', 'KARCIS', 'TIKET']]],
      'Open Trip Menjangan Tabuhan': ['SB', [['KAPTEN & ABK', 0, 40000, 'YA', 'MAN POWER', 'KAPTEN'], ['BBM, OLI', 0, 35000, 'TIDAK', '', 'BBMOLI'], ['KORLAP', 0, 15000, 'YA', 'MAN POWER', 'KORLAP'], ['KONSUMSI + AIR MINERAL', 0, 35000, 'YA', 'KONSUMSI', 'KONSUMSB'], ['ASURANSI', 0, 3000, 'TIDAK', '', 'ASURANSI'], ['GUIDE', 0, 25000, 'YA', 'MAN POWER', 'GUIDE'], ['TIKET', 0, 35000, 'YA', 'KARCIS', 'TIKET'], ['PERAWATAN ALAT', 0, 5000, 'TIDAK', '', 'ALAT']]],
      'Open Trip Sunrise Boat Menjangan': ['SB', [['KAPTEN & ABK', 0, 45000, 'YA', 'MAN POWER', 'KAPTEN'], ['BBM, OLI', 0, 40000, 'TIDAK', '', 'BBMOLI'], ['KORLAP', 0, 15000, 'YA', 'MAN POWER', 'KORLAP'], ['KONSUMSI + AIR MINERAL', 0, 40000, 'YA', 'KONSUMSI', 'KONSUMSB'], ['ASURANSI', 0, 3000, 'TIDAK', '', 'ASURANSI'], ['GUIDE', 0, 25000, 'YA', 'MAN POWER', 'GUIDE'], ['TIKET', 0, 35000, 'YA', 'KARCIS', 'TIKET'], ['PERAWATAN ALAT', 0, 5000, 'TIDAK', '', 'ALAT']]],
      'PT Tabuhan Only': ['SB', [['KAPTEN & ABK', 250000, 0, 'YA', 'MAN POWER', 'KAPTEN'], ['BBM, OLI', 200000, 0, 'TIDAK', '', 'BBMOLI'], ['KONSUMSI + AIR MINERAL', 35000, 30000, 'YA', 'KONSUMSI', 'KONSUMSB'], ['ASURANSI', 0, 3000, 'TIDAK', '', 'ASURANSI'], ['TIKET', 0, 15000, 'YA', 'KARCIS', 'TIKET']]],
      'PT Menjangan Tabuhan': ['SB', [['KAPTEN & ABK', 500000, 0, 'YA', 'MAN POWER', 'KAPTEN'], ['BBM, OLI', 300000, 0, 'TIDAK', '', 'BBMOLI'], ['KORLAP', 150000, 0, 'YA', 'MAN POWER', 'KORLAP'], ['KONSUMSI + AIR MINERAL', 35000, 50000, 'YA', 'KONSUMSI', 'KONSUMSB'], ['ASURANSI', 0, 3000, 'TIDAK', '', 'ASURANSI'], ['GUIDE', 400000, 0, 'YA', 'MAN POWER', 'GUIDE'], ['TIKET', 0, 35000, 'YA', 'KARCIS', 'TIKET'], ['PERAWATAN ALAT', 0, 5000, 'TIDAK', '', 'ALAT']]],
      'Tabuhan Watersport Paket Jet Ski Weekend': ['YB', [['SEWA JET SKI', 0, 180000, 'TIDAK', '', 'KAPAL'], ['BBM JET SKI', 0, 40000, 'TIDAK', '', 'BBM'], ['INSTRUKTUR', 0, 25000, 'YA', 'MAN POWER'], ['SERVICE', 0, 10000, 'YA', 'SERVICE']]],
      'Tabuhan Watersport Paket Paddle Board Weekend': ['YB', [['SEWA PADDLE BOARD', 0, 60000, 'TIDAK', '', 'KAPAL'], ['INSTRUKTUR', 0, 20000, 'YA', 'MAN POWER'], ['SERVICE', 0, 10000, 'YA', 'SERVICE']]],
      'Tabuhan Watersport Paket Banana Boat': ['YB', [['SEWA BANANA BOAT', 0, 50000, 'TIDAK', '', 'KAPAL'], ['INSTRUKTUR', 0, 15000, 'YA', 'MAN POWER'], ['SERVICE', 0, 8000, 'YA', 'SERVICE']]],
      'Private Trip 2D1N Ijen & Baluran': ['YB', [['HIACE', 1800000, 0, 'TIDAK'], ['JEEP BALURAN', 900000, 0, 'TIDAK'], ['PENGINAPAN', 0, 250000, 'TIDAK'], ['TL', 750000, 0, 'YA', 'MAN POWER'], ['GUIDE IJEN', 350000, 0, 'YA', 'MAN POWER'], ['MAKAN', 0, 120000, 'YA', 'KONSUMSI'], ['KARCIS IJEN', 0, 15000, 'YA', 'KARCIS'], ['BALURAN', 0, 25000, 'YA', 'KARCIS'], ['MASKER GAS', 0, 15000, 'YA', 'AGEN/LAIN-LAIN'], ['SERVICE', 200000, 0, 'YA', 'SERVICE']]],
      'Private Trip 3D2N Banyuwangi': ['YB', [['HIACE / BUS', 2600000, 0, 'TIDAK'], ['JEEP BALURAN', 900000, 0, 'TIDAK'], ['PENGINAPAN 2 MALAM', 0, 450000, 'TIDAK'], ['PAKET PULAU', 0, 150000, 'TIDAK'], ['TL', 1200000, 0, 'YA', 'MAN POWER'], ['TIM DOKUMENTASI', 900000, 0, 'YA', 'MAN POWER'], ['AIR MINERAL', 0, 10000, 'YA', 'KONSUMSI'], ['MAKAN DAY 1', 0, 90000, 'YA', 'KONSUMSI'], ['MAKAN DAY 2', 0, 90000, 'YA', 'KONSUMSI'], ['DJAWATAN', 0, 10000, 'YA', 'KARCIS'], ['IJEN', 0, 15000, 'YA', 'KARCIS'], ['BALURAN', 0, 25000, 'YA', 'KARCIS'], ['MASKER GAS', 0, 15000, 'YA', 'AGEN/LAIN-LAIN'], ['SERVICE', 300000, 0, 'YA', 'SERVICE']]],
      'Private Trip 4D3N Banyuwangi': ['YB', [['HIACE / BUS', 3400000, 0, 'TIDAK'], ['JEEP BALURAN', 900000, 0, 'TIDAK'], ['PENGINAPAN 3 MALAM', 0, 650000, 'TIDAK'], ['PAKET PULAU', 0, 150000, 'TIDAK'], ['TL', 1600000, 0, 'YA', 'MAN POWER'], ['TIM DOKUMENTASI', 1200000, 0, 'YA', 'MAN POWER'], ['AIR MINERAL', 0, 15000, 'YA', 'KONSUMSI'], ['MAKAN DAY 1', 0, 90000, 'YA', 'KONSUMSI'], ['MAKAN DAY 2', 0, 90000, 'YA', 'KONSUMSI'], ['MAKAN DAY 3', 0, 90000, 'YA', 'KONSUMSI'], ['DJAWATAN', 0, 10000, 'YA', 'KARCIS'], ['IJEN', 0, 15000, 'YA', 'KARCIS'], ['BALURAN', 0, 25000, 'YA', 'KARCIS'], ['PULAU MERAH', 0, 10000, 'YA', 'KARCIS'], ['MASKER GAS', 0, 15000, 'YA', 'AGEN/LAIN-LAIN'], ['SERVICE', 400000, 0, 'YA', 'SERVICE']]]
    };
    function itemDari(def, bagian) { return def.map(function (x) { var keTL = x[3] === 'YA' ? 'YA' : 'TIDAK', g = keTL === 'YA' ? (x[4] || tebakGrup(x[0])) : ''; return { Uraian: x[0], Tetap: x[1], Per_Pax: x[2], Ke_TL: keTL, Grup: g, Kolom: x[5] || tebakKolom(bagian, x[0], g) }; }); }
    var adm = { nama: 'Nadia Putri', peran: 'Admin', email: 'admin@yukbanyuwangi.demo', id: 'USR-0001' }, fin = { nama: 'Laras Wening', peran: 'Finance', email: 'finance@yukbanyuwangi.demo', id: 'USR-0003' };
    var txA = new Tx(H, adm), txF = new Tx(H, fin);
    Object.keys(PAKET).forEach(function (n) { A['paket.simpan'](txA, { Nama: n, Bagian: PAKET[n][0], items: itemDari(PAKET[n][1], PAKET[n][0]), Catatan: 'Paket reguler (contoh)' }); });

    // Kalkulasi Indofarma = isi file KALKULASI_AGUNG (Kalkulasi CS) + MASKER GAS dari Dummy Kalkulasi Budget
    var CS_IND = [['BUS', 10000000, 'TIDAK'], ['JEEP BALURAN', 5000000, 'TIDAK'], ['TL', 1500000, 'YA', 'MAN POWER'], ['TIM DOKUMENTASI', 2500000, 'YA', 'MAN POWER'], ['AIR MINERAL', 500000, 'YA', 'KONSUMSI'], ['MAKAN DAY 1', 4000000, 'YA', 'KONSUMSI'], ['MAKAN DAY 2', 4000000, 'YA', 'KONSUMSI'], ['MAKAN DAY 3', 400000, 'YA', 'KONSUMSI'],
      ['PAKET PULAU', 5000000, 'TIDAK'], ['DJAWATAN', 500000, 'YA', 'KARCIS'], ['PAKET PULAU SB', 5000000, 'TIDAK'], ['PAKET GREEN ISLAND', 2000000, 'YA', 'KARCIS'], ['PULAU MERAH', 500000, 'YA', 'KARCIS'], ['BALURAN', 500000, 'YA', 'KARCIS'], ['GWD', 500000, 'YA', 'KARCIS'], ['IJEN', 500000, 'YA', 'KARCIS'], ['GUIDE IJEN', 500000, 'YA', 'MAN POWER'], ['SERVICE', 500000, 'YA', 'SERVICE']];
    A['kalkulasi.simpan'](txA, { ID_Pesanan: IND.ID_Pesanan, Sumber: 'CS', Link_CS: LINK_KAL, Pax: 30, items: CS_IND.map(function (x) { return { Uraian: x[0], Tetap: x[1], Per_Pax: 0, Ke_TL: x[2], Grup: x[3] || '', Asal: 'CS' }; }).concat([{ Uraian: 'MASKER GAS', Tetap: 500000, Per_Pax: 0, Ke_TL: 'YA', Grup: 'AGEN/LAIN-LAIN', Asal: 'Manual' }]) });
    A['kalkulasi.simpan'](txA, { ID_Pesanan: KIS.ID_Pesanan, Sumber: 'Manual', Pax: 4, items: [['DRIVER TL', 825000, 'MAN POWER'], ['SERVICE', 150000, 'SERVICE'], ['BBM', 300000, 'AGEN/LAIN-LAIN'], ['AIR MINERAL 1 DUS', 50000, 'KONSUMSI'], ['KONSUMSI 1X (MM DAY 2)', 200000, 'KONSUMSI'], ['DJAWATAN', 50000, 'KARCIS'], ['GWD', 40000, 'KARCIS'], ['BALURAN', 134000, 'KARCIS']].map(function (x) { return { Uraian: x[0], Tetap: x[1], Per_Pax: 0, Ke_TL: 'YA', Grup: x[2] }; })
      .concat([{ Uraian: 'MPV (INNOVA) KANTOR', Tetap: 1500000, Per_Pax: 0, Ke_TL: 'TIDAK', Kolom: 'KEND' }, { Uraian: 'PENGINAPAN DIALOG HOTEL', Tetap: 1700000, Per_Pax: 0, Ke_TL: 'TIDAK', Kolom: 'HOTEL' }, { Uraian: 'PAKET PULAU', Tetap: 1400000, Per_Pax: 0, Ke_TL: 'TIDAK', Kolom: 'KAPAL' }, { Uraian: 'ATV CAPAS', Tetap: 800000, Per_Pax: 0, Ke_TL: 'TIDAK', Kolom: 'LL' }]) });
    // Pesanan lain: kalkulasi dari paket bila trip sudah lewat / dekat (menunjukkan alur reguler)
    var semua = tx.all('Pesanan').slice();
    semua.forEach(function (p) {
      if (p.ID_Pesanan === IND.ID_Pesanan || p.ID_Pesanan === KIS.ID_Pesanan) return;
      var pk = PAKET[p.Trip]; if (!pk) return; var h = selisihHari(today, p.Tgl_Mulai);
      if (h > 16 && acak() < 0.7) return;
      A['kalkulasi.simpan'](txA, { ID_Pesanan: p.ID_Pesanan, Sumber: 'Paket', Paket: p.Trip, Pax: p.Pax, items: itemDari(pk[1], pk[0]).map(function (x) { x.Asal = 'Paket'; return x; }) });
    });

    // Manifest: Indofarma (terbit) & Kisvan (terbit, meniru contoh klien) + beberapa draft
    var ITIN_IND = 'Hari Pertama\n07:00 Penjemputan di Stasiun / Hotel sekitar Banyuwangi. Jika anda menggunakan flight maka trip ini masih bisa menyesuaikan dengan jadwal kedatangan.\n07:30 Sarapan pagi di resto lokal dan dilanjutkan Persiapan untuk melanjutkan tour\n10:00 Mengunjungi Hutan De Djawatan\n11:30 Menuju Taman Nasional Baluran (Bisa additional charge jeep safari*)\n13:00 Makan siang di resto lokal searah perjalanan kawasan Baluran\n14:00 Sampai di Taman Nasional Baluran, menikmati lansekap savana Bekol lewat menara pandang\n14:30 Mengunjungi pantai Bama dan mangrove trail\n15:30 Meninggalkan Taman Nasional Baluran, menikmati panorama sunset di savana Bekol\n18:30 Makan malam\n20:00 Kembali ke hotel dan istirahat\nHari Kedua\n07:00 Makan pagi di hotel\n08:00 Berangkat menuju meeting point Pantai Grandwatudodol\n09:00 Menyeberang ke pulau Menjangan dari pantai Watudodol, estimasi perjalanan satu jam\n10:00 Registrasi pengunjung, agenda bebas dan photo session di dermaga Pulau Menjangan\n11:00 Snorkeling di spot pertama\n12:00 Makan siang\n13:00 Snorkeling di spot kedua\n14:00 Mengunjungi Pulau Tabuhan\n15:00 Meninggalkan Pulau Tabuhan\n16:00 Bilas – bilas dan diantar kembali ke Hotel\n19:00 Makan malam kuliner daerah Banyuwangi\n20:30 Kembali ke Hotel dan istirahat untuk persiapan naik ke Ijen\nHari Ketiga\n00:10 Penjemputan Hotel sekitar Banyuwangi Kota\n00:30 Berangkat menuju Kawah Ijen\n01:30 Sampai Paltuding, kemudian konfirmasi tiket online\n02:00 Persiapan melakukan pendakian\n04:00 Sampai area Puncak, panorama kawah ijen dan Sunrise Point\n06:00 Kembali ke Paltuding\n08:00 Peserta diantar ke meeting point penjemputan\n09:00 Paket wisata berakhir, diantar kembali ke Stasiun / Bandara / Hotel';
    var ITIN_KIS = 'Hari Pertama\n10.30 Landing Bandara Banyuwangi\n11.00 Menuju ke hutan de Djawatan\n12.00 Explore Djawatan\n13.30 Menuju ke Banyuwangi kota\n14.30 Check in penginapan, free time\nHari Kedua\n07:30 Bertemu di Meeting Point Grand Watu Dodol (Pondok Bambu)\n08.00 Persiapan dan briefing peserta\n08:10 Menyeberang ke pulau Menjangan dari pantai Watudodol dengan estimasi perjalanan 45 menit dengan view pasir putih dan gradasi pantai taman nasional Bali Barat\n09:00 Registrasi pengunjung, dilanjut agenda bebas dan photo session di dermaga pulau Menjangan dan takat Pasir\n10:00 Freedive di spot palung pertama.\n11:00 Snorkeling di spot mangrove point\n12:00 Menuju ke pulau tabuhan\n13:00 Explore pulau tabuhan dan makan siang (lunch box)\n15.00 Kembali di dermaga Grand Watu dodol\n16.30 Perkiraan tiba kembali di hotel. Bersih bersih dan free time\n19.00 Makan malam kuliner khas Banyuwangi\nHari Ketiga\n08.30 Menuju ke Capas adventure\n09.30 ATV adventure di daerah capas dengan pemandangan persawahan\n11.30 Selesai kegiatan atv adventure, bersih bersih\n12.30 Menuju ke Taman Nasional Baluran\n14.00 Explore Taman Nasional Baluran (evergreen forest, pohon raisa, relics banteng, savannah bekol, pantai Bama dan mangrove trail)\n17.00 Diantar kembali ke hotel. Tour 3D2N selesai';
    function tlRef(n) { var t = tlId[n]; return { id: t.ID_TL, nama: t.Nama }; }
    A['manifest.simpan'](txA, { ID_Pesanan: IND.ID_Pesanan, PIC_Kantor: 'Riyan Uceng', TL: [tlRef('Ikrom'), tlRef('Ichang')], Durasi: '3D2N', Data_Tamu: { jemput: 'Stasiun Banyuwangi Kota', drop: 'Stasiun Banyuwangi Kota' }, Checklist: checklistDefault(IND), Catatan: 'Setiap selesai trip perharinya memberikan update posisi kendaraan\nTrip Pulau include Lunch Box\nOutbound di hari kedua sore (koordinasi dengan PIC)', Itinerary: ITIN_IND,
      Peserta: ['Budi Hartanto', 'Sri Wahyuni', 'Andre Kurniawan', 'Melinda Sari', 'Rudi Setiawan', 'Yuliana Dewi', 'Eko Prasetyo', 'Fitri Handayani'].map(function (n) { return { nama: n }; }) });
    A['manifest.catatTerbit'](txA, { ID_Pesanan: IND.ID_Pesanan, url: '', fileId: 'demo-manifest-indofarma' });
    A['manifest.simpan'](txA, { ID_Pesanan: KIS.ID_Pesanan, PIC_Kantor: 'Riyan Uceng', TL: [tlRef('Yunus')], Durasi: '3D2N', Data_Tamu: { nama: 'KISVAN SIMARMATA', jemput: 'BANDARA BWI', drop: 'DIALOG HOTEL' },
      Checklist: [{ item: 'Mobil', detail: 'MPV (Innova) Kantor' }, { item: 'Driver', detail: 'Yunus' }, { item: 'Guide', detail: 'Yunus' }], Catatan: 'ATV Capas by kantor\nSetiap selesai trip perharinya memberikan update posisi kendaraan\nTrip Pulau include Lunch Box', Itinerary: ITIN_KIS,
      Peserta: [{ nama: 'Kisvan Simarmata', hp: '08119461463' }, { nama: 'Ruth Simarmata' }, { nama: 'Daniel Simarmata' }, { nama: 'Grace Simarmata' }] });
    A['manifest.catatTerbit'](txA, { ID_Pesanan: KIS.ID_Pesanan, url: '', fileId: 'demo-manifest-kisvan' });
    A['manifest.catatUndang'](txA, { ID_Pesanan: KIS.ID_Pesanan, emails: [tlId.Yunus.Email] });
    tambahan.filter(function (p) { var h = selisihHari(today, p.Tgl_Mulai); return h >= 0 && h <= 20 && tx.get('Kalkulasi', p.ID_Pesanan); }).slice(0, 3).forEach(function (p) {
      var cekP = checklistDefault(p), g = (parseJson(p.Checklist, {}) || {}).GUIDE, tl = g && tlId[g] ? [tlRef(g)] : [tlRef(pilih(['Yunus', 'Ikrom', 'Faad']))];
      A['manifest.simpan'](txA, { ID_Pesanan: p.ID_Pesanan, TL: tl, Checklist: cekP, Catatan: 'Setiap selesai trip perharinya memberikan update posisi kendaraan', Itinerary: /Private/.test(p.Tab) ? ITIN_IND : '' });
    });

    // Rekap: trip yang sudah lewat → tambahan & kunci margin
    tx.all('Pesanan').forEach(function (p) {
      var inf = infoPesanan(p, tx.S()); if (!inf.selesai || inf.selesai >= today || !tx.get('Kalkulasi', p.ID_Pesanan)) return;
      var tamb = [];
      if (p.ID_Pesanan === ANG.ID_Pesanan) tamb = [{ kolom: 'KONSUM', jenis: 'Over budget', uraian: 'Tambahan makan malam rombongan (hari ke-3)', nominal: 750000 }, { kolom: 'LL', jenis: 'Over budget', uraian: 'Parkir & tol tambahan', nominal: 185000 }];
      else if (p.ID_Pesanan === IND.ID_Pesanan) tamb = [{ kolom: 'BBM', jenis: 'Non-manifest', uraian: 'BBM bus (dibayar admin)', nominal: 1200000 }, { kolom: 'INSENTIF', jenis: 'Insentif', uraian: 'Insentif CS (Agung)', nominal: 750000 }];
      else if (acak() < 0.35) tamb = [{ kolom: inf.bagian === 'SB' ? 'KONSUMSB' : 'KONSUM', jenis: 'Over budget', uraian: 'Konsumsi tambahan di lapangan', nominal: Math.round(inf.total * pilih([0.03, 0.05, 0.08]) / 1000) * 1000 }];
      if (tamb.length || acak() < 0.5) A['rekap.simpan'](txA, { ID_Pesanan: p.ID_Pesanan, Tambahan: tamb, Kapal: inf.bagian === 'SB' ? pilih(['SB Harno', 'SB Bayu', 'SB Samudra']) : '' });
      var umur = selisihHari(inf.selesai, today);
      if (umur > 20 || p.ID_Pesanan === IND.ID_Pesanan || p.ID_Pesanan === ANG.ID_Pesanan) { A['rekap.ajukan'](txA, { ID_Pesanan: p.ID_Pesanan }); A['rekap.kunci'](txF, { ID_Pesanan: p.ID_Pesanan, catatan: 'Sesuai nota' }); }
      else if (umur > 4) A['rekap.ajukan'](txA, { ID_Pesanan: p.ID_Pesanan });
    });

    // Pembayaran & tagihan
    A['bayar.simpan'](txF, { ID_Pesanan: IND.ID_Pesanan, Tanggal: '2026-09-01', Nominal: 65000000, Jenis: 'Pelunasan', Metode: 'Transfer Mandiri', kabari: false });
    A['bayar.simpan'](txF, { ID_Pesanan: ANG.ID_Pesanan, Tanggal: '2026-09-04', Nominal: 25000000, Jenis: 'Pelunasan', Metode: 'Transfer BCA', kabari: false });
    [MUT, ULF, IRH, MAH, JUL, AND, SIS, DIN, AFN, DEV, BUN].forEach(function (p) { var s = num(p.Pax) * num(p.Harga) - num(p.DP); if (s > 0) A['bayar.simpan'](txF, { ID_Pesanan: p.ID_Pesanan, Tanggal: tambahHari(p.Tgl_Mulai, -1), Nominal: s, Jenis: 'Pelunasan', Metode: 'Transfer', kabari: false }); });
    tambahan.forEach(function (p) {
      var s = num(p.Pax) * num(p.Harga) - num(p.DP), h = selisihHari(today, p.Tgl_Mulai); if (s <= 0) return;
      if (h < -2 && acak() < 0.93) A['bayar.simpan'](txF, { ID_Pesanan: p.ID_Pesanan, Tanggal: tambahHari(p.Tgl_Mulai, -antara(1, 5)), Nominal: s, Jenis: 'Pelunasan', Metode: pilih(['Transfer Mandiri', 'Transfer BCA']), kabari: false });
      else if (h >= 0 && h < 12 && acak() < 0.3) A['bayar.simpan'](txF, { ID_Pesanan: p.ID_Pesanan, Tanggal: hari(-antara(0, 3)), Nominal: s, Jenis: 'Pelunasan', Metode: 'Transfer BCA', kabari: false });
    });

    // Invoice (model klien)
    function buatInvoice(p, terbit) { var s = saranInvoice(tx.D, p.ID_Pesanan, tx.S(), p.Tgl_Pesan > today ? today : p.Tgl_Pesan); var r = A['invoice.simpan'](txA, s); if (terbit) A['invoice.catatTerbit'](txA, { ID_Invoice: r.data.ID_Invoice, url: '', fileId: 'demo' }); return r.data; }
    buatInvoice(IND, true); buatInvoice(ANG, true); buatInvoice(KIS, true);
    tambahan.filter(function (p) { return selisihHari(today, p.Tgl_Mulai) > -10 && /Private/.test(p.Tab); }).slice(0, 5).forEach(function (p, i) { buatInvoice(p, i < 3); });

    // Biaya operasional (Finance)
    for (var b = -4; b <= 0; b++) {
      var ym = geserBulan(today.slice(0, 7), b);
      [['Gaji & Honor', 'Gaji staf kantor (4 orang)', 18500000], ['Sewa Kantor', 'Sewa kantor Jl. Trenggono', 3500000], ['Listrik, Air & Internet', 'Listrik, air & internet kantor', 1250000 + antara(0, 300000)], ['Marketing & Iklan', 'Iklan Instagram & TikTok', 3000000 + antara(0, 3) * 500000], ['Transport Kantor', 'BBM operasional kantor', 600000 + antara(0, 400000)]].forEach(function (x) {
        if (b === 0 && x[0] !== 'Sewa Kantor' && x[0] !== 'Marketing & Iklan') return;
        A['biaya.simpan'](txF, { Bulan: ym, Tanggal: ym + '-0' + antara(1, 9), Kategori: x[0], Uraian: x[1], Nominal: x[2] });
      });
    }

    // Status sinkron kalender (simulasi): trip mendatang sudah punya event
    tx.all('Pesanan').forEach(function (p) {
      var ev = eventPesanan(tx.D, indeks(tx.D), p, tx.S()); if (!ev) return; var h = selisihHari(today, p.Tgl_Mulai);
      if (h < -60) return;
      tx.insert('Kalender_Event', { ID_Pesanan: p.ID_Pesanan, Event_ID: 'yb' + hashTeks(p.ID_Pesanan) + 'demo', Hash: ev.hash, Lampiran: ev.lampiran ? ev.lampiran.fileId : '', Tamu: JSON.stringify(ev.tamu), Status: 'OK', Pesan: 'Tersinkron (simulasi)', Diperbarui: wkt(-1) });
    });
    A['crm.sync'](txA, {});
    // log & antrean demo dibersihkan agar riwayat terasa natural
    tx.where('AntrianNotif', function () { return true; }).forEach(function (r) { tx.update('AntrianNotif', r.AntrianID, { Status: 'Terkirim', Respon: 'OK (simulasi)', DikirimPada: r.DibuatPada }); });
    tx.where('Antrean_Tugas', function () { return true; }).forEach(function (r) { tx.update('Antrean_Tugas', r.ID_Tugas, { Status: 'Selesai', Hasil: 'OK (simulasi demo)', Selesai: r.Dibuat }); });
    return tx.hasil(ok({ pesanan: tx.all('Pesanan').length }, 'Data demo dimuat.'));
  }

  // ==========================================================================
  // 12. EKSPOR API PUBLIK
  // ==========================================================================
  return {
    VERSI: VERSI, SKEMA: SKEMA, TABEL_VIRTUAL: TABEL_VIRTUAL, TABEL_APP: TABEL_APP, ANGKA: ANGKA, TEKS_WAJIB: TEKS_WAJIB, PERAN: PERAN, ROUTES: ROUTES, NOTIF_EVENTS: NOTIF_EVENTS, PRESET_PALET: PRESET_PALET,
    PENGATURAN_DEFAULT: PENGATURAN_DEFAULT, PENGATURAN_BOLEH: PENGATURAN_BOLEH, MENU_DIATUR: MENU_DIATUR, GRUP_TL: GRUP_TL, REKAP_KOLOM: REKAP_KOLOM, REKAP_LABEL_DEFAULT: REKAP_LABEL_DEFAULT,
    JENIS_TAMBAHAN: JENIS_TAMBAHAN, BIAYA_OPS_KATEGORI: BIAYA_OPS_KATEGORI, SINONIM: SINONIM, LABEL_ID: LABEL_ID, LABEL_TGL_PESAN: LABEL_TGL_PESAN, BUTUH_SUMBER: BUTUH_SUMBER,
    Tx: Tx, jalankan: jalankan, dataBoot: dataBoot, isiDemo: isiDemo, ok: ok, fail: fail, aksesMenu: aksesMenu,
    klaimTugas: klaimTugas, selesaikanTugas: selesaikanTugas, tugasTertunda: tugasTertunda, klaimNotif: klaimNotif, selesaikanNotif: selesaikanNotif, adaAntrian: adaAntrian, pengingatHarian: pengingatHarian,
    matriksNotif: matriksNotif, susunKolom: susunKolom, normalHeader: normalHeader, kunciKanonik: kunciKanonik,
    hitung: { indeks: indeks, infoTab: infoTab, infoPesanan: infoPesanan, statusTrip: statusTrip, durasi: durasi, ringkasKalkulasi: ringkasKalkulasi, saranItem: saranItem, tebakKolom: tebakKolom, tebakGrup: tebakGrup, kolomValid: kolomValid,
      labelRekap: labelRekap, rekapPesanan: rekapPesanan, rekapDaftar: rekapDaftar, totalRekap: totalRekap, rentangPeriode: rentangPeriode, geserBulan: geserBulan, labaRugi: labaRugi,
      tagihanPesanan: tagihanPesanan, tagihanDaftar: tagihanDaftar, dataInvoice: dataInvoice, saranInvoice: saranInvoice, hitungInvoice: hitungInvoice, rekeningDari: rekeningDari, syaratDari: syaratDari,
      dataManifest: dataManifest, parseItinerary: parseItinerary, checklistDefault: checklistDefault, eventPesanan: eventPesanan, report: report, dashboard: dashboard, verifikasiPublik: verifikasiPublik, dataRekapSheet: dataRekapSheet, kotaNormal: kotaNormal, tataRekap: tataRekap },
    util: { str: str, num: num, pad: pad, tgl: tgl, tglValid: tglValid, tambahHari: tambahHari, selisihHari: selisihHari, tglId: tglId, tglPanjang: tglPanjang, tglDuaDigit: tglDuaDigit, tglSlash: tglSlash, rentangTgl: rentangTgl, labelBulan: labelBulan,
      rp: rp, ribuan: ribuan, rpRingkas: rpRingkas, terbilang: terbilang, hp08: hp08, hp62: hp62, hpValid: hpValid, emailValid: emailValid, isiTemplate: isiTemplate, inisial: inisial, samarkanNama: samarkanNama, judulKata: judulKata,
      urutkan: urutkan, jumlah: jumlah, kelompok: kelompok, peta: peta, nowIso: nowIso, hariIni: hariIni, kontras: kontras, cekPalet: cekPalet, paletAktif: paletAktif, parseJson: parseJson, hashTeks: hashTeks,
      BULAN: BULAN, BLN: BLN, ROMAWI: ROMAWI }
  };
})();
