/**
 * ============================================================================
 *  YukX — LOGIKA.gs  ·  Mesin Logika Bisnis Bersama  ·  v1.1.0
 * ============================================================================
 *  Berkas ini dipakai di DUA tempat TANPA perubahan:
 *    1) Backend Google Apps Script  → Logika.gs
 *    2) Frontend (GitHub Pages)     → js/engine.js  (Mode Demo + hitungan tampilan)
 *
 *  Karena itu berkas ini TIDAK memakai SpreadsheetApp / DriveApp / DOM.
 *  Semua akses data & layanan luar lewat objek "host" (H) yang disuntikkan:
 *    H.db   : { all(t), insert(t, rows), update(t, key, id, patch) -> row, remove(t, key, id) }
 *    H.now(): Date      H.uuid(): string      H.hash(pin, salt): string
 *    H.kirimWA(list, jeda) -> [{ok, respon}]  H.cekWA(nomor[]) -> {ok, peta, pesan}
 *    H.kirimEmail(msg) -> {ok, respon}        H.waSiap(): boolean   H.sisaEmail(): number
 *  Semua teks & komentar berbahasa Indonesia.
 * ============================================================================
 */
var YX = (function () {
  'use strict';

  var VERSI = '1.1.0';
  var TZ_MENIT = 420; // WIB (UTC+7)

  // ==========================================================================
  // 1. SKEMA DATABASE (1 spreadsheet, 1 sheet per tabel)
  // ==========================================================================
  var SKEMA = {
    Pengguna: { key: 'ID_Pengguna', prefix: 'USR', cols: ['ID_Pengguna', 'Nama', 'Email', 'Peran', 'Pengelola', 'Hash_PIN', 'Salt', 'Status', 'No_WA', 'Foto_URL', 'Terakhir_Login', 'Dibuat'] },
    Customer: { key: 'ID_Customer', prefix: 'CUS', cols: ['ID_Customer', 'Nama', 'No_WA', 'Email', 'Alamat', 'Kota', 'Identitas', 'Tgl_Lahir', 'Gender', 'Kontak_Darurat', 'Telp_Darurat', 'Catatan_Medis', 'Tag', 'Catatan', 'Status', 'Tgl_Terdaftar', 'Diperbarui'] },
    Trip: { key: 'ID_Trip', prefix: 'TRP', cols: ['ID_Trip', 'Kode', 'Nama', 'Tujuan', 'Tgl_Berangkat', 'Tgl_Pulang', 'Kuota', 'Harga_Default', 'Meeting_Point', 'Akomodasi', 'Foto_URL', 'Deskripsi', 'Status', 'Folder_ID', 'Dibuat'] },
    Peserta_Trip: { key: 'ID_Peserta', prefix: 'PST', cols: ['ID_Peserta', 'ID_Trip', 'ID_Customer', 'ID_Penjualan', 'Jumlah_Pax', 'Status_Data', 'Tgl_Masuk', 'Catatan'] },
    Anggota_Rombongan: { key: 'ID_Anggota', prefix: 'ANG', cols: ['ID_Anggota', 'ID_Penjualan', 'ID_Customer', 'Nama', 'Identitas', 'Gender', 'Tgl_Lahir', 'No_HP', 'Ukuran_Baju', 'Kamar', 'Catatan', 'Urutan'] },
    Penjualan: { key: 'ID_Penjualan', prefix: 'PJ', cols: ['ID_Penjualan', 'ID_Customer', 'ID_Trip', 'Jumlah_Pax', 'Harga_per_Pax', 'Diskon', 'Total', 'Terbayar', 'Sisa', 'Status', 'Review_Peserta', 'Jatuh_Tempo', 'ID_Event', 'Catatan', 'Tgl_Booking', 'Dibuat_Oleh', 'Diperbarui'] },
    Pembayaran: { key: 'ID_Bayar', prefix: 'BYR', cols: ['ID_Bayar', 'ID_Penjualan', 'Jenis', 'Tanggal', 'Nominal', 'Metode', 'Link_Bukti', 'Status_Verifikasi', 'Diverifikasi_Oleh', 'Catatan', 'Dibuat_Oleh', 'Dibuat'] },
    Invoice: { key: 'No_Invoice', prefix: '', cols: ['No_Invoice', 'ID_Penjualan', 'Jenis', 'Tgl_Terbit', 'Jatuh_Tempo', 'Nominal', 'Status', 'Link_PDF', 'File_ID', 'ID_Event_Calendar', 'Kode_Verifikasi', 'Status_Proses', 'Catatan', 'Dibuat_Oleh', 'Dibuat'] },
    Kategori_Biaya: { key: 'ID_Kategori', prefix: 'KAT', cols: ['ID_Kategori', 'Nama', 'Ikon', 'Urutan', 'Aktif'] },
    Budget_Header: { key: 'ID_Budget', prefix: 'BGT', cols: ['ID_Budget', 'ID_Trip', 'Versi', 'Status', 'Total', 'Alasan_Revisi', 'Catatan_Keputusan', 'Dibuat_Oleh', 'Tgl_Dibuat', 'Disetujui_Oleh', 'Tgl_Disetujui'] },
    Budget_Item: { key: 'ID_Item', prefix: 'BIT', cols: ['ID_Item', 'ID_Budget', 'Kategori', 'Uraian', 'Keterangan', 'Qty', 'Satuan', 'Harga_Satuan', 'Subtotal', 'Urutan'] },
    Realisasi_Biaya: { key: 'ID_Realisasi', prefix: 'RLS', cols: ['ID_Realisasi', 'ID_Trip', 'Kategori', 'Uraian', 'Nominal', 'Tanggal', 'Link_Bukti', 'Status', 'Diinput_Oleh', 'Catatan', 'Dibuat', 'Catatan_Verifikasi', 'Diverifikasi_Oleh'] },
    Log_Revisi_Budget: { key: 'ID_Log', prefix: 'LRV', acak: true, cols: ['ID_Log', 'ID_Budget', 'ID_Trip', 'Siapa', 'Kapan', 'Item', 'Nilai_Lama', 'Nilai_Baru', 'Alasan'] },
    Manifest: { key: 'ID_Manifest', prefix: 'MNF', cols: ['ID_Manifest', 'Tipe', 'ID_Customer', 'ID_Penjualan', 'ID_Trip', 'Status', 'Versi', 'Link_File', 'File_ID', 'Link_Excel', 'ID_Lampiran_Calendar', 'Catatan', 'Tgl_Final', 'Dibuat_Oleh', 'Diperbarui'] },
    Rekap_Operasional: { key: 'ID_Trip', prefix: '', cols: ['ID_Trip', 'Pax', 'Pendapatan', 'Kas_Masuk', 'Budget_Aktif', 'Versi_Budget', 'Realisasi', 'Selisih', 'Laba', 'Margin', 'Status_Audit', 'Diverifikasi_Oleh', 'Tgl_Verifikasi', 'Catatan_Audit', 'Diperbarui', 'Tgl_Lapor', 'Dilapor_Oleh', 'Penjelasan_Lapor', 'Biaya_Final', 'Laba_Final', 'Tgl_Final'] },
    Pengaturan: { key: 'Kunci', prefix: '', cols: ['Kunci', 'Nilai', 'Keterangan'] },
    Log_Aktivitas: { key: 'ID_Log', prefix: 'LOG', acak: true, cols: ['ID_Log', 'Waktu', 'Pengguna', 'Peran', 'Aksi', 'Kategori', 'Objek', 'Detail'] },
    Antrean_Tugas: { key: 'ID_Tugas', prefix: 'TGS', acak: true, cols: ['ID_Tugas', 'Jenis', 'Ref', 'Payload', 'Status', 'Percobaan', 'Hasil', 'Dibuat', 'Selesai'] },
    AntrianNotif: { key: 'AntrianID', prefix: 'ANT', acak: true, cols: ['AntrianID', 'Kanal', 'Tujuan', 'NamaPenerima', 'Subjek', 'Pesan', 'Lampiran', 'Event', 'RefID', 'BlastID', 'Status', 'Percobaan', 'Respon', 'DibuatPada', 'DikirimPada'] },
    BlastWA: { key: 'BlastID', prefix: 'BLW', cols: ['BlastID', 'Judul', 'Pesan', 'Sasaran', 'Total', 'Terkirim', 'Gagal', 'UkuranBatch', 'JedaDetik', 'Status', 'DibuatOleh', 'Tanggal', 'SelesaiPada'] },
    CRM_Kontak: { key: 'KontakID', prefix: 'KTK', cols: ['KontakID', 'Nama', 'Email', 'NoWA', 'Segmen', 'Sumber', 'RefID', 'Tag', 'StatusWA', 'CekWAAt', 'EmailValid', 'OptOut', 'Catatan', 'JumlahPesan', 'TerakhirDihubungi', 'Info', 'DibuatPada', 'DiperbaruiPada'] },
    CRM_Interaksi: { key: 'InteraksiID', prefix: 'INT', acak: true, cols: ['InteraksiID', 'KontakID', 'Kanal', 'Arah', 'Ringkasan', 'RefID', 'Oleh', 'Tanggal'] },
    Template_Dokumen: { key: 'Kode', prefix: '', cols: ['Kode', 'Nama', 'Engine', 'File_ID', 'Bidang', 'Versi', 'Aktif', 'Diperbarui'] }
  };

  // Kolom angka (disimpan sebagai Number) — selain ini dianggap teks.
  var ANGKA = {};
  ['Kuota', 'Harga_Default', 'Jumlah_Pax', 'Harga_per_Pax', 'Diskon', 'Total', 'Terbayar', 'Sisa', 'Nominal', 'Versi', 'Qty', 'Harga_Satuan', 'Subtotal', 'Urutan',
    'Pax', 'Pendapatan', 'Kas_Masuk', 'Budget_Aktif', 'Versi_Budget', 'Realisasi', 'Selisih', 'Laba', 'Margin', 'Percobaan', 'Terkirim', 'Gagal', 'UkuranBatch', 'JumlahPesan', 'Biaya_Final', 'Laba_Final']
    .forEach(function (k) { ANGKA[k] = 1; });
  // Kolom yang harus tetap teks (nomor HP/identitas tidak boleh jadi angka)
  var TEKS_WAJIB = ['No_WA', 'Telp_Darurat', 'Identitas', 'No_HP', 'NoWA', 'Tujuan', 'JedaDetik'];

  var PERAN = { ADMIN: 'Admin', FINANCE: 'Finance' };
  var ADM = ['Admin'], FIN = ['Finance'], SEMUA = ['Admin', 'Finance'];

  var KATEGORI_DEFAULT = [
    ['Tiket Pesawat', 'plane'], ['Hotel & Akomodasi', 'bed-double'], ['Transportasi & Kapal', 'ship'], ['Tiket Masuk & Retribusi', 'ticket'],
    ['Guide & Tour Leader', 'flag'], ['Konsumsi', 'utensils'], ['Dokumentasi', 'camera'], ['Perlengkapan & Merchandise', 'package'], ['Biaya Tak Terduga', 'shield-alert']
  ];

  var PRESET_PALET = {
    biru: { nama: 'Biru Trip', primary: '#1E6FEB', primaryDark: '#0B3C91', primarySoft: '#8EC5FF', bg: '#F3F7FC', surface: '#FFFFFF', accent: '#FFB547', text: '#0F1B33', muted: '#4A5B78' },
    laut: { nama: 'Laut', primary: '#0E7490', primaryDark: '#164E63', primarySoft: '#67E8F9', bg: '#F1F8FA', surface: '#FFFFFF', accent: '#FFB547', text: '#0B2530', muted: '#3F5B66' },
    langit: { nama: 'Langit', primary: '#0369A1', primaryDark: '#0C3A5E', primarySoft: '#7DD3FC', bg: '#F2F8FD', surface: '#FFFFFF', accent: '#F59E0B', text: '#0C1C2E', muted: '#46607A' },
    senja: { nama: 'Senja', primary: '#C2410C', primaryDark: '#7C2D12', primarySoft: '#FDBA74', bg: '#FBF6F2', surface: '#FFFFFF', accent: '#0EA5E9', text: '#2A1608', muted: '#6B4C3B' }
  };

  var PENGATURAN_DEFAULT = {
    APP_NAMA: ['YukX', 'Nama aplikasi (sidebar, tab, invoice, email)'],
    APP_TAGLINE: ['Report Automation', 'Teks kecil di bawah nama aplikasi'],
    APP_NAMA_PANJANG: ['Otomatisasi Sistem Laporan YukX', 'Nama lengkap untuk judul & email'],
    LOGO_URL: ['', 'URL logo (Drive lh3) — kosong = logo bawaan'],
    FAVICON_URL: ['', 'URL favicon — kosong = bawaan'],
    PALET: [JSON.stringify({ preset: 'biru' }), 'JSON palet warna aktif'],
    FONT_BODY: ['Plus Jakarta Sans', 'Font isi (Google Fonts)'],
    FONT_HEAD: ['Plus Jakarta Sans', 'Font judul (Google Fonts)'],
    PT_NAMA: ['PT YukX Eksplor Nusantara', 'Nama badan usaha di invoice'],
    PT_ALAMAT: ['Jl. Kemang Raya No. 18, Jakarta Selatan 12730', 'Alamat kantor'],
    PT_EMAIL: ['halo@yukx.id', 'Email kantor'],
    PT_TELP: ['+62 21-5088-2999', 'Telepon kantor'],
    BANK_NAMA: ['Bank Central Asia (BCA)', 'Bank tujuan transfer'],
    BANK_NOREK: ['8045-221-990', 'Nomor rekening'],
    BANK_AN: ['PT YukX Eksplor Nusantara', 'Atas nama rekening'],
    INVOICE_CATATAN: ['Mohon cantumkan nomor invoice pada berita transfer agar pembayaran tercatat otomatis.', 'Catatan di invoice'],
    DP_PERSEN: ['50', 'Persentase DP default'],
    JATUH_TEMPO_HARI: ['3', 'Jatuh tempo invoice DP/Full (hari setelah terbit)'],
    PELUNASAN_H: ['14', 'Pelunasan paling lambat H-minus keberangkatan'],
    TTD_NAMA: ['Sinta Wulandari', 'Nama penanda tangan invoice'],
    TTD_JABATAN: ['Finance Manager', 'Jabatan penanda tangan'],
    TTD_URL: ['', 'URL spesimen tanda tangan (opsional)'],
    APP_URL: ['', 'URL aplikasi (GitHub Pages) — untuk {link}'],
    VERIF_URL: ['', 'URL halaman verifikasi (verifikasi.html)'],
    CAL_NAMA: ['YukX Trips', 'Nama kalender khusus'],
    NOTIF_WA_AKTIF: ['TIDAK', 'YA/TIDAK — saklar utama WhatsApp (Fonnte)'],
    NOTIF_EMAIL_AKTIF: ['TIDAK', 'YA/TIDAK — saklar utama Email'],
    NOTIF_MATRIKS: ['', 'JSON matriks event × kanal'],
    NOTIF_KIRIM_DEMO: ['TIDAK', 'YA = kontak bertag DEMO ikut dikirimi (default TIDAK)'],
    WA_BATCH_DEFAULT: ['20', 'Ukuran batch blast (10/20/50)'],
    WA_JEDA_DETIK: ['5', 'Jeda antarpesan, boleh acak "3-8"'],
    WA_DETEKSI_OTOMATIS: ['YA', 'Cek otomatis nomor kontak baru terdaftar WA'],
    EMAIL_NAMA_PENGIRIM: ['YukX Finance', 'Nama pengirim email'],
    CRM_SYNC_MENIT: ['30', 'Interval sinkron otomatis CRM']
  };
  // Kunci yang boleh diubah lewat menu Pengaturan (allowlist)
  var PENGATURAN_BOLEH = Object.keys(PENGATURAN_DEFAULT).filter(function (k) { return k.indexOf('NOTIF_') !== 0 && k.indexOf('WA_') !== 0 && k !== 'CRM_SYNC_MENIT' && k !== 'EMAIL_NAMA_PENGIRIM'; });

  // ==========================================================================
  // 2. REGISTRY NOTIFIKASI (tanpa agen: pelanggan + tim internal)
  // ==========================================================================
  var NOTIF_EVENTS = {
    BOOKING_DIBUAT: { label: 'Booking baru dicatat', target: 'Customer', wa: true, email: true, subjek: 'Booking {trip} Diterima',
      pesan: 'Halo {nama} 👋\nBooking Anda untuk *{trip}* ({tglTrip}) sudah kami catat: *{pax} pax*, total *{total}*.\nInvoice akan segera kami kirim.\n\n— {perusahaan}' },
    INVOICE_TERBIT: { label: 'Invoice terbit', target: 'Customer', wa: true, email: true, subjek: 'Invoice {noInvoice} — {trip}',
      pesan: 'Halo {nama},\nInvoice *{noInvoice}* ({jenis}) untuk *{trip}* sebesar *{nominal}* sudah terbit, jatuh tempo *{jatuhTempo}*.\n\nTransfer ke: {rekening}\nPDF invoice: {link}\n\nTerima kasih 🙏\n— {perusahaan}' },
    PEMBAYARAN_DITERIMA: { label: 'Pembayaran diterima (kuitansi)', target: 'Customer', wa: true, email: true, subjek: 'Pembayaran Diterima — {trip}',
      pesan: 'Halo {nama},\nPembayaran *{nominal}* ({jenisBayar}) untuk *{trip}* sudah kami terima ✅\nTerbayar: {terbayar} · Sisa: *{sisa}*.\n\n— {perusahaan}' },
    LUNAS: { label: 'Booking lunas', target: 'Customer', wa: true, email: true, subjek: 'Lunas! {trip}',
      pesan: 'Selamat {nama}! 🎉\nPembayaran *{trip}* sudah *LUNAS*. Sampai jumpa di {meetingPoint} tanggal {tglTrip}.\n\n— {perusahaan}' },
    PENGINGAT_JATUH_TEMPO: { label: 'Pengingat jatuh tempo invoice', target: 'Customer', wa: true, email: false, subjek: 'Pengingat Invoice {noInvoice}',
      pesan: 'Halo {nama}, pengingat ramah 🙂\nInvoice *{noInvoice}* sebesar *{nominal}* jatuh tempo *{jatuhTempo}*.\nTransfer ke: {rekening}\n\n— {perusahaan}' },
    PENGINGAT_BERANGKAT: { label: 'Pengingat H-3 keberangkatan', target: 'Customer', wa: true, email: true, subjek: 'H-3 {trip}',
      pesan: 'Halo {nama} ✈️\n3 hari lagi kita berangkat ke *{trip}* ({tglTrip}).\nMeeting point: *{meetingPoint}*. Siapkan KTP/paspor & obat pribadi ya.\n\n— {perusahaan}' },
    MANIFEST_FINAL: { label: 'Manifest final', target: 'Customer', wa: true, email: false, subjek: 'Manifest {trip} Final',
      pesan: 'Halo {nama},\nData rombongan Anda untuk *{trip}* sudah *final* ({pax} pax). Meeting point: {meetingPoint}.\n\n— {perusahaan}' },
    TIM_PEMBAYARAN_MASUK: { label: 'Tim: pembayaran masuk', target: 'Finance', wa: true, email: false, subjek: 'Pembayaran masuk {customer}',
      pesan: '💰 Pembayaran masuk\n{customer} — {trip}\n{jenisBayar} {nominal} via {metode}\nSisa tagihan: {sisa}\nDicatat oleh {oleh}' },
    TIM_BUDGET_MENUNGGU: { label: 'Tim: revisi budget perlu persetujuan', target: 'Finance', wa: true, email: true, subjek: 'Budget {trip} v{versi} menunggu persetujuan',
      pesan: '📋 Budget *{trip}* versi {versi} ({total}) diajukan oleh {oleh} dan menunggu persetujuan Finance.\nAlasan: {alasan}' },
    TIM_BUDGET_DIPUTUSKAN: { label: 'Tim: keputusan budget', target: 'Admin', wa: true, email: false, subjek: 'Budget {trip} v{versi} {keputusan}',
      pesan: '📋 Budget *{trip}* versi {versi} *{keputusan}* oleh {oleh}.\n{catatan}' },
    TIM_REALISASI_DIAJUKAN: { label: 'Tim: laporan realisasi perlu diaudit', target: 'Finance', wa: true, email: true, subjek: 'Realisasi {trip} menunggu audit',
      pesan: '🧾 Laporan realisasi *{trip}* dilaporkan oleh {oleh}.\nRAB: {rab} · Realisasi: *{realisasi}*{lebih}\n{penjelasan}\nSilakan audit di menu Rekapitulasi.' },
    TIM_REALISASI_DIPUTUSKAN: { label: 'Tim: hasil audit realisasi', target: 'Admin', wa: true, email: false, subjek: 'Realisasi {trip} {keputusan}',
      pesan: '🧾 Laporan realisasi *{trip}* *{keputusan}* oleh {oleh}.\n{catatan}' },
    TIM_INVOICE_TERBIT: { label: 'Tim: invoice baru terbit', target: 'Finance', wa: false, email: false, subjek: 'Invoice {noInvoice} terbit',
      pesan: '🧾 Invoice {noInvoice} ({jenis}) {nominal} untuk {customer} — {trip} diterbitkan oleh {oleh}.' }
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
  function tambahHari(t, n) { var d = new Date(tgl(t) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function selisihHari(a, b) { return Math.round((new Date(tgl(b) + 'T00:00:00Z') - new Date(tgl(a) + 'T00:00:00Z')) / 864e5); } // b - a
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  function tglId(t) { t = tgl(t); if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t || '-'; return Number(t.slice(8, 10)) + ' ' + BLN[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4); }
  function tglPanjang(t) { t = tgl(t); if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t || '-'; return Number(t.slice(8, 10)) + ' ' + BULAN[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4); }
  function rentangTgl(a, b) {
    a = tgl(a); b = tgl(b); if (!a) return '-'; if (!b || a === b) return tglId(a);
    if (a.slice(0, 7) === b.slice(0, 7)) return Number(a.slice(8, 10)) + '–' + tglId(b);
    if (a.slice(0, 4) === b.slice(0, 4)) return Number(a.slice(8, 10)) + ' ' + BLN[Number(a.slice(5, 7)) - 1] + ' – ' + tglId(b);
    return tglId(a) + ' – ' + tglId(b);
  }
  function rp(n) { n = bulat(n); var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '-Rp ' : 'Rp ') + s; }
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
  function hpValid(v) { return /^08\d{8,12}$/.test(hp08(v)); }
  function emailValid(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim()); }
  function isiTemplate(tpl, v) { return String(tpl || '').replace(/\{(\w+)\}/g, function (m, k) { return v[k] == null ? '' : String(v[k]); }); }
  function inisial(nama) { return str(nama).replace(/^(PT|CV|Dr|dr|Ir|H|Hj)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || '?'; }
  function samarkanNama(n) { return str(n).split(/\s+/).map(function (w, i) { return i === 0 ? w : (w[0] || '') + '.'; }).join(' '); }
  function urutkan(arr, f, desc) { return arr.slice().sort(function (a, b) { var x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); }); }
  function jumlah(arr, f) { var s = 0; for (var i = 0; i < arr.length; i++) s += num(f ? f(arr[i]) : arr[i]); return s; }
  function kelompok(arr, k) { var o = {}; arr.forEach(function (r) { var key = typeof k === 'function' ? k(r) : r[k]; (o[key] = o[key] || []).push(r); }); return o; }
  function peta(arr, k) { var o = {}; arr.forEach(function (r) { o[r[k]] = r; }); return o; }
  function kunciItem(r) { return (str(r.Kategori) + '|' + str(r.Uraian)).toLowerCase(); }
  function parseJson(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }

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
    var p = parseJson(S.PALET, { preset: 'biru' }) || { preset: 'biru' };
    var dasar = PRESET_PALET[p.preset] || PRESET_PALET.biru;
    var out = {}; Object.keys(dasar).forEach(function (k) { out[k] = (p.preset === 'kustom' && p[k]) ? p[k] : dasar[k]; });
    if (p.preset === 'kustom') Object.keys(p).forEach(function (k) { if (/^#/.test(p[k])) out[k] = p[k]; });
    out.preset = p.preset || 'biru'; return out;
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
      if (ANGKA[c]) v = num(v); else if (typeof v !== 'string') v = String(v);
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
      v = ANGKA[k] ? num(v) : String(v);
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
  function indeks(D) {
    var ix = { trip: peta(D.Trip, 'ID_Trip'), cust: peta(D.Customer, 'ID_Customer'), pj: peta(D.Penjualan, 'ID_Penjualan') };
    ix.pjPerTrip = kelompok(D.Penjualan, 'ID_Trip');
    ix.bayarPerPj = kelompok(D.Pembayaran, 'ID_Penjualan');
    ix.invPerPj = kelompok(D.Invoice, 'ID_Penjualan');
    ix.angPerPj = kelompok(D.Anggota_Rombongan, 'ID_Penjualan');
    ix.pesertaPerPj = peta(D.Peserta_Trip, 'ID_Penjualan');
    ix.bgtPerTrip = kelompok(D.Budget_Header, 'ID_Trip');
    ix.itemPerBgt = kelompok(D.Budget_Item, 'ID_Budget');
    ix.rlsPerTrip = kelompok(D.Realisasi_Biaya, 'ID_Trip');
    ix.mnfPerPj = {}; ix.mnfTrip = {};
    D.Manifest.forEach(function (m) { if (m.Tipe === 'Per Trip') ix.mnfTrip[m.ID_Trip] = m; else ix.mnfPerPj[m.ID_Penjualan] = m; });
    ix.rekap = peta(D.Rekap_Operasional, 'ID_Trip');
    return ix;
  }
  function statusTrip(t, today) {
    if (!t) return '-'; if (t.Status === 'Batal' || t.Status === 'Draft') return t.Status;
    if (t.Tgl_Pulang && today > t.Tgl_Pulang) return 'Selesai';
    if (t.Tgl_Berangkat && today >= t.Tgl_Berangkat) return 'Berjalan';
    return 'Open';
  }
  function budgetAktif(ix, idTrip) {
    var hs = ix.bgtPerTrip[idTrip] || [], a = null;
    hs.forEach(function (h) { if (h.Status === 'Aktif' && (!a || num(h.Versi) > num(a.Versi))) a = h; });
    return a;
  }
  function budgetTerbaru(ix, idTrip) { var hs = ix.bgtPerTrip[idTrip] || [], a = null; hs.forEach(function (h) { if (!a || num(h.Versi) > num(a.Versi)) a = h; }); return a; }
  function terbayarPj(ix, id) { return jumlah((ix.bayarPerPj[id] || []).filter(function (b) { return b.Status_Verifikasi === 'Terverifikasi'; }), function (b) { return b.Nominal; }); }

  function ringkasPj(D, ix, pj, today, S) {
    var trip = ix.trip[pj.ID_Trip] || {}, cust = ix.cust[pj.ID_Customer] || {};
    var bayar = terbayarPj(ix, pj.ID_Penjualan), total = num(pj.Total), sisa = Math.max(0, total - bayar);
    var invs = urutkan((ix.invPerPj[pj.ID_Penjualan] || []).filter(function (i) { return i.Status !== 'Batal'; }), function (i) { return i.Tgl_Terbit + i.No_Invoice; });
    var hari = trip.Tgl_Berangkat ? selisihHari(today, trip.Tgl_Berangkat) : 999;
    var pelH = num((S || {}).PELUNASAN_H || 14);
    var invPelunasanBuka = invs.some(function (i) { return i.Jenis === 'Pelunasan' && i.Status !== 'Lunas'; });
    var tahap;
    if (pj.Status === 'Batal') tahap = 'batal';
    else if (bayar <= 0) tahap = 'booking';
    else if (bayar >= total) tahap = 'lunas';
    else if (invPelunasanBuka || hari <= pelH) tahap = 'pelunasan';
    else tahap = 'dp';
    var ang = ix.angPerPj[pj.ID_Penjualan] || [];
    var lengkap = ang.filter(function (a) { return str(a.Nama) && str(a.Identitas); }).length;
    var inv = invs.length ? invs[invs.length - 1] : null;
    var invTerbuka = invs.filter(function (i) { return i.Status !== 'Lunas'; });
    var jt = invTerbuka.length ? invTerbuka[0].Jatuh_Tempo : (pj.Jatuh_Tempo || '');
    return {
      id: pj.ID_Penjualan, pj: pj, trip: trip, cust: cust, total: total, bayar: bayar, sisa: sisa, persen: total ? Math.min(100, Math.round(bayar / total * 100)) : 0,
      tahap: tahap, hari: hari, invoices: invs, invTerakhir: inv, invTerbuka: invTerbuka, jatuhTempo: jt,
      telat: !!(jt && sisa > 0 && jt < today && pj.Status !== 'Batal'),
      peserta: ix.pesertaPerPj[pj.ID_Penjualan] || null, review: pj.Review_Peserta === 'YA',
      anggota: ang.length, anggotaLengkap: lengkap, manifest: ix.mnfPerPj[pj.ID_Penjualan] || null
    };
  }

  // Status laporan realisasi per trip (alur: Admin catat → lapor → Finance audit → Final)
  var RLS = { BELUM: 'Belum Ada Realisasi', DRAFT: 'Draft', DIAJUKAN: 'Diajukan', PERBAIKAN: 'Perlu Perbaikan', DITOLAK: 'Ditolak', FINAL: 'Final' };
  var RLS_EDIT = [RLS.BELUM, RLS.DRAFT, RLS.PERBAIKAN, RLS.DITOLAK];
  function normRls(s) {
    s = str(s); if (!s) return '';
    if (s === 'Terverifikasi') return RLS.FINAL;
    if (s === 'Menunggu Audit') return RLS.DIAJUKAN;
    if (s === 'Perlu Revisi' || s === 'Perlu Audit Ulang') return RLS.PERBAIKAN;
    return s;
  }
  /** RAB (versi aktif) vs realisasi per kategori — tanda kategori yang melebihi RAB. */
  function rabVsRealisasi(ix, idTrip) {
    var ba = budgetAktif(ix, idTrip), bud = {}, rls = {}, out = [];
    if (ba) (ix.itemPerBgt[ba.ID_Budget] || []).forEach(function (i) { bud[i.Kategori] = (bud[i.Kategori] || 0) + num(i.Subtotal); });
    (ix.rlsPerTrip[idTrip] || []).filter(function (r) { return r.Status !== 'Ditolak'; }).forEach(function (r) { rls[r.Kategori] = (rls[r.Kategori] || 0) + num(r.Nominal); });
    Object.keys(Object.assign({}, bud, rls)).forEach(function (k) { var b = bud[k] || 0, r = rls[k] || 0; out.push({ kategori: k, rab: b, realisasi: r, selisih: b - r, over: r > b, persen: b ? Math.round(r / b * 100) : (r ? 999 : 0), diLuarRab: !b && r > 0 }); });
    return out;
  }
  function rekapTrip(D, ix, trip, today) {
    var pjs = (ix.pjPerTrip[trip.ID_Trip] || []).filter(function (p) { return p.Status !== 'Batal'; });
    var pendapatan = jumlah(pjs, function (p) { return p.Total; });
    var kas = jumlah(pjs, function (p) { return terbayarPj(ix, p.ID_Penjualan); });
    var pax = jumlah(pjs, function (p) { return p.Jumlah_Pax; });
    var ba = budgetAktif(ix, trip.ID_Trip), bDraft = false, bAktif = !!ba;
    if (!ba) { ba = budgetTerbaru(ix, trip.ID_Trip); bDraft = !!ba; }   // belum ada versi aktif → pakai versi terbaru sebagai estimasi
    var bTot = ba ? num(ba.Total) : 0;
    var semuaRls = ix.rlsPerTrip[trip.ID_Trip] || [], rls = semuaRls.filter(function (r) { return r.Status !== 'Ditolak'; });
    var realisasi = jumlah(rls, function (r) { return r.Nominal; });
    var rk = ix.rekap[trip.ID_Trip] || {};
    var stA = normRls(rk.Status_Audit); if (!stA || stA === RLS.BELUM || stA === RLS.DRAFT) stA = realisasi > 0 ? RLS.DRAFT : RLS.BELUM;
    var final = stA === RLS.FINAL, selesai = !!(trip.Tgl_Pulang && today >= trip.Tgl_Pulang);
    var biaya = final ? (num(rk.Biaya_Final) || realisasi) : (realisasi > 0 ? realisasi : bTot);
    var laba = pendapatan - biaya;
    var over = bAktif && realisasi > bTot, lebih = over ? realisasi - bTot : 0;
    var bisaEdit = RLS_EDIT.indexOf(stA) > -1 && bAktif;
    return {
      ID_Trip: trip.ID_Trip, trip: trip, status: statusTrip(trip, today), pax: pax, booking: pjs.length,
      pendapatan: pendapatan, kasMasuk: kas, piutang: pendapatan - kas,
      budget: bTot, versiBudget: ba ? num(ba.Versi) : 0, budgetId: ba ? ba.ID_Budget : '', budgetStatus: ba ? ba.Status : '', budgetDraft: bDraft, budgetAktif: bAktif,
      realisasi: realisasi, adaRealisasi: realisasi > 0, nota: semuaRls.length, notaDitolak: semuaRls.length - rls.length, selisih: realisasi > 0 ? bTot - realisasi : 0,
      selisihPersen: realisasi > 0 && bTot ? Math.round((bTot - realisasi) / bTot * 1000) / 10 : 0,
      biaya: biaya, laba: laba, margin: pendapatan ? Math.round(laba / pendapatan * 1000) / 10 : 0,
      estimasiLaba: pendapatan - bTot, estimasiMargin: pendapatan ? Math.round((pendapatan - bTot) / pendapatan * 1000) / 10 : 0,
      // alur realisasi & tanda risiko
      statusAudit: stA, final: final, tripSelesai: selesai, bisaEdit: bisaEdit,
      bisaLapor: bisaEdit && realisasi > 0 && selesai && stA !== RLS.BELUM,
      perluLapor: bAktif && selesai && RLS_EDIT.indexOf(stA) > -1 && trip.Status !== 'Batal',
      overBudget: over, lebih: lebih, lebihPersen: over && bTot ? Math.round(lebih / bTot * 1000) / 10 : 0, rugi: laba < 0 && (final || realisasi > 0),
      tglLapor: rk.Tgl_Lapor || '', dilaporOleh: rk.Dilapor_Oleh || '', penjelasan: rk.Penjelasan_Lapor || '', tglFinal: rk.Tgl_Final || '',
      diverifikasiOleh: rk.Diverifikasi_Oleh || '', tglVerifikasi: rk.Tgl_Verifikasi || '', catatanAudit: rk.Catatan_Audit || ''
    };
  }
  function rekapSemua(D, today) { var ix = indeks(D); return urutkan(D.Trip.filter(function (t) { return t.Status !== 'Batal'; }), function (t) { return t.Tgl_Berangkat; }).map(function (t) { return rekapTrip(D, ix, t, today); }); }

  function biayaPerKategori(D, ix, idTrip) {
    var rls = (ix.rlsPerTrip[idTrip] || []).filter(function (r) { return r.Status !== 'Ditolak'; });
    var o = {};
    if (rls.length) rls.forEach(function (r) { o[r.Kategori] = (o[r.Kategori] || 0) + num(r.Nominal); });
    else { var ba = budgetAktif(ix, idTrip) || budgetTerbaru(ix, idTrip); if (ba) (ix.itemPerBgt[ba.ID_Budget] || []).forEach(function (i) { o[i.Kategori] = (o[i.Kategori] || 0) + num(i.Subtotal); }); }
    return o;
  }

  /** Laporan laba rugi per periode. Hanya trip yang realisasinya sudah FINAL (disetujui Finance) masuk laporan.
   *  opsi: {dari, sampai, idTrip, today, semua:true → semua trip ikut (rekap operasional / grafik estimasi)} */
  function labaRugi(D, opsi) {
    opsi = opsi || {}; var today = opsi.today || hariIni();
    var ix = indeks(D);
    var trips = D.Trip.filter(function (t) {
      if (t.Status === 'Batal') return false;
      if (opsi.idTrip && t.ID_Trip !== opsi.idTrip) return false;
      if (opsi.dari && t.Tgl_Berangkat < opsi.dari) return false;
      if (opsi.sampai && t.Tgl_Berangkat > opsi.sampai) return false;
      return true;
    });
    var semua = urutkan(trips, function (t) { return t.Tgl_Berangkat; }).map(function (t) {
      var r = rekapTrip(D, ix, t, today); r.kategori = biayaPerKategori(D, ix, t.ID_Trip); r.bulan = t.Tgl_Berangkat.slice(0, 7); return r;
    });
    var baris = opsi.semua ? semua : semua.filter(function (r) { return r.final; }), tertunda = semua.filter(function (r) { return !r.final; });
    var kat = {}; baris.forEach(function (b) { Object.keys(b.kategori).forEach(function (k) { kat[k] = (kat[k] || 0) + b.kategori[k]; }); });
    var perBulan = {};
    baris.forEach(function (b) { var m = perBulan[b.bulan] = perBulan[b.bulan] || { bulan: b.bulan, pendapatan: 0, biaya: 0, laba: 0, trip: 0, pax: 0 }; m.pendapatan += b.pendapatan; m.biaya += b.biaya; m.laba += b.laba; m.trip++; m.pax += b.pax; });
    var totP = jumlah(baris, function (b) { return b.pendapatan; }), totB = jumlah(baris, function (b) { return b.biaya; });
    var tP = jumlah(tertunda, function (b) { return b.pendapatan; }), tB = jumlah(tertunda, function (b) { return b.biaya; });
    return {
      baris: baris, tertunda: tertunda, kategori: kat, perBulan: urutkan(Object.keys(perBulan).map(function (k) { return perBulan[k]; }), function (m) { return m.bulan; }),
      total: { pendapatan: totP, biaya: totB, laba: totP - totB, margin: totP ? Math.round((totP - totB) / totP * 1000) / 10 : 0, kas: jumlah(baris, function (b) { return b.kasMasuk; }), pax: jumlah(baris, function (b) { return b.pax; }), trip: baris.length,
        over: baris.filter(function (b) { return b.overBudget; }).length, lebih: jumlah(baris, function (b) { return b.lebih; }), rugi: baris.filter(function (b) { return b.laba < 0; }).length },
      totalTertunda: { trip: tertunda.length, pendapatan: tP, biaya: tB, laba: tP - tB, menungguAudit: tertunda.filter(function (b) { return b.statusAudit === RLS.DIAJUKAN; }).length }
    };
  }

  function rentangPeriode(kode, today) {
    var y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
    function akhirBulan(yy, mm) { return new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10); }
    if (kode === 'bulan-lalu') { var py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1; return { dari: py + '-' + pad(pm, 2) + '-01', sampai: akhirBulan(py, pm), label: BULAN[pm - 1] + ' ' + py }; }
    if (kode === 'kuartal') { var q = Math.floor((m - 1) / 3), qm = q * 3 + 1; return { dari: y + '-' + pad(qm, 2) + '-01', sampai: akhirBulan(y, qm + 2), label: 'Kuartal ' + (q + 1) + ' ' + y }; }
    if (kode === 'tahun') return { dari: y + '-01-01', sampai: y + '-12-31', label: 'Tahun ' + y };
    if (kode === '90hari') return { dari: tambahHari(today, -60), sampai: tambahHari(today, 30), label: '60 hari lalu – 30 hari ke depan' };
    if (kode === 'semua') return { dari: '', sampai: '', label: 'Semua waktu' };
    return { dari: y + '-' + pad(m, 2) + '-01', sampai: akhirBulan(y, m), label: BULAN[m - 1] + ' ' + y };
  }

  /** Data dashboard. opsi: {periode:'bulan'|'bulan-lalu'|'kuartal'|'tahun', idTrip, today, S} */
  function dashboard(D, opsi) {
    opsi = opsi || {}; var today = opsi.today || hariIni(), S = opsi.S || {};
    var ix = indeks(D), per = rentangPeriode(opsi.periode || 'bulan', today);
    var pjAktif = D.Penjualan.filter(function (p) { return p.Status !== 'Batal' && (!opsi.idTrip || p.ID_Trip === opsi.idTrip); });
    var ringkas = pjAktif.map(function (p) { return ringkasPj(D, ix, p, today, S); });
    var lr = labaRugi(D, { dari: per.dari, sampai: per.sampai, idTrip: opsi.idTrip, today: today, semua: true });
    var lrF = labaRugi(D, { dari: per.dari, sampai: per.sampai, idTrip: opsi.idTrip, today: today });
    var tripAktif = D.Trip.filter(function (t) { var s = statusTrip(t, today); return s === 'Open' || s === 'Berjalan'; });
    var invBelum = D.Invoice.filter(function (i) { return i.Status === 'Terbit'; });
    var sisaPiutang = jumlah(ringkas, function (r) { return r.sisa; });
    var piutangDp = ringkas.filter(function (r) { return r.tahap === 'dp' || r.tahap === 'pelunasan'; });
    var totTag = jumlah(ringkas, function (r) { return r.total; }), totBayar = jumlah(ringkas, function (r) { return r.bayar; });
    // Grafik: per minggu (periode bulan) atau per bulan (periode panjang)
    var seri = [];
    if (per.dari && selisihHari(per.dari, per.sampai) <= 31) {
      for (var w = 0; w < 5; w++) {
        var a = tambahHari(per.dari, w * 7); if (a > per.sampai) break; var b = tambahHari(a, 6); if (b > per.sampai) b = per.sampai;
        var bs = lr.baris.filter(function (r) { return r.trip.Tgl_Berangkat >= a && r.trip.Tgl_Berangkat <= b; });
        seri.push({ label: 'Mg ' + (w + 1), pendapatan: jumlah(bs, function (r) { return r.pendapatan; }), biaya: jumlah(bs, function (r) { return r.biaya; }), kini: today >= a && today <= b });
      }
    } else {
      lr.perBulan.forEach(function (m) { seri.push({ label: BLN[Number(m.bulan.slice(5, 7)) - 1], pendapatan: m.pendapatan, biaya: m.biaya, kini: m.bulan === today.slice(0, 7) }); });
    }
    var berikut = urutkan(D.Trip.filter(function (t) { return t.Status !== 'Batal' && t.Tgl_Berangkat >= today; }), function (t) { return t.Tgl_Berangkat; })[0] || null;
    var berikutInfo = null;
    if (berikut) {
      var pjs = (ix.pjPerTrip[berikut.ID_Trip] || []).filter(function (p) { return p.Status !== 'Batal'; });
      var mf = pjs.filter(function (p) { return ix.mnfPerPj[p.ID_Penjualan] && ix.mnfPerPj[p.ID_Penjualan].Status === 'Final'; });
      berikutInfo = { trip: berikut, hari: selisihHari(today, berikut.Tgl_Berangkat), pax: jumlah(pjs, function (p) { return p.Jumlah_Pax; }), booking: pjs.length, manifestFinal: jumlah(mf, function (p) { return p.Jumlah_Pax; }) };
    }
    var antre = [];
    ringkas.forEach(function (r) {
      if (!r.peserta && r.bayar > 0) antre.push({ jenis: 'peserta', prioritas: 2, r: r, label: 'Belum masuk daftar peserta', aksi: 'Buat invoice' });
      else if (r.peserta && !r.review) antre.push({ jenis: 'review', prioritas: 3, r: r, label: 'Perlu review peserta', aksi: 'Verifikasi' });
      if (r.telat) antre.push({ jenis: 'telat', prioritas: 1, r: r, label: 'Lewat jatuh tempo', aksi: 'Tagih' });
      if (r.hari >= 0 && r.hari <= 7 && (!r.manifest || r.manifest.Status !== 'Final')) antre.push({ jenis: 'manifest', prioritas: 2, r: r, label: 'Manifest belum final (H-' + r.hari + ')', aksi: 'Buka manifest' });
    });
    var bgtMenunggu = D.Budget_Header.filter(function (h) { return h.Status === 'Menunggu'; });
    // Antrean realisasi anggaran: Admin melapor setelah trip selesai, Finance mengaudit
    var rkSemua = D.Trip.filter(function (t) { return t.Status !== 'Batal' && (!opsi.idTrip || t.ID_Trip === opsi.idTrip); }).map(function (t) { return rekapTrip(D, ix, t, today); });
    var realisasiAntre = [];
    rkSemua.forEach(function (r) {
      if (r.statusAudit === RLS.DIAJUKAN) realisasiAntre.push({ jenis: 'audit', peran: 'Finance', prioritas: r.overBudget ? 1 : 2, r: r, label: 'Audit laporan realisasi' + (r.overBudget ? ' · melebihi RAB ' + rpRingkas(r.lebih) : '') });
      else if (r.perluLapor) realisasiAntre.push({ jenis: 'lapor', peran: 'Admin', prioritas: r.statusAudit === RLS.PERBAIKAN || r.statusAudit === RLS.DITOLAK ? 1 : 2, r: r, label: r.statusAudit === RLS.PERBAIKAN ? 'Realisasi perlu diperbaiki (catatan Finance)' : r.statusAudit === RLS.DITOLAK ? 'Laporan realisasi ditolak — susun ulang' : r.adaRealisasi ? 'Laporkan realisasi ke Finance' : 'Trip selesai — catat realisasi anggaran' });
    });
    return {
      periode: per, laba: lrF.total.laba, margin: lrF.total.margin, pendapatan: lr.total.pendapatan, biaya: lr.total.biaya, lr: lr, lrFinal: lrF,
      labaEstimasi: lr.total.laba, marginEstimasi: lr.total.margin, tripFinal: lrF.total.trip, tripBelumFinal: lrF.totalTertunda.trip,
      realisasiAntre: urutkan(realisasiAntre, function (a) { return a.prioritas; }), tripOver: rkSemua.filter(function (r) { return r.overBudget; }),
      tripAktif: tripAktif.length, paxAktif: jumlah(pjAktif.filter(function (p) { var t = ix.trip[p.ID_Trip]; return t && statusTrip(t, today) !== 'Selesai'; }), function (p) { return p.Jumlah_Pax; }),
      berangkatMingguIni: tripAktif.filter(function (t) { var h = selisihHari(today, t.Tgl_Berangkat); return h >= 0 && h <= 7; }).length,
      invBelum: invBelum.length, invBelumNominal: jumlah(invBelum, function (i) { return i.Nominal; }),
      invTelat: invBelum.filter(function (i) { return i.Jatuh_Tempo && i.Jatuh_Tempo < today; }).length,
      sisaPiutang: sisaPiutang, bookingMenunggu: piutangDp.length,
      collection: totTag ? Math.round(totBayar / totTag * 1000) / 10 : 0, totalTagihan: totTag, totalBayar: totBayar,
      seri: seri, berikut: berikutInfo, antrean: urutkan(antre, function (a) { return a.prioritas; }), budgetMenunggu: bgtMenunggu,
      invoiceTerbaru: urutkan(D.Invoice, function (i) { return (i.Dibuat || i.Tgl_Terbit) + i.No_Invoice; }, true).slice(0, 8)
    };
  }

  function prosesInvoice(inv) { return parseJson(inv && inv.Status_Proses, {}) || {}; }

  function deskripsiEvent(D, idPj, S) {
    var ix = indeks(D), pj = ix.pj[idPj]; if (!pj) return null;
    var r = ringkasPj(D, ix, pj, hariIni(), S), t = r.trip, c = r.cust;
    var baris = ['🧳 ' + (S.APP_NAMA || 'YukX') + ' — Data Booking', '', 'Customer : ' + c.Nama + ' (' + pj.Jumlah_Pax + ' pax)', 'WhatsApp : ' + (c.No_WA || '-'), 'Total    : ' + rp(r.total),
      'Terbayar : ' + rp(r.bayar) + ' (' + r.persen + '%)', 'Sisa     : ' + rp(r.sisa), 'Status   : ' + pj.Status, '', '🧾 Invoice:'];
    r.invoices.forEach(function (i) { baris.push('• ' + i.No_Invoice + ' — ' + i.Jenis + ' ' + rp(i.Nominal) + ' [' + i.Status + ']' + (i.Link_PDF ? '\n  ' + i.Link_PDF : '')); });
    if (!r.invoices.length) baris.push('• (belum ada)');
    baris.push('', '📍 Meeting point: ' + (t.Meeting_Point || '-'), '⏱ Diperbarui: ' + tglId(hariIni()));
    return { judul: '[' + t.Nama + '] - ' + c.Nama, mulai: t.Tgl_Berangkat, selesai: t.Tgl_Pulang || t.Tgl_Berangkat, deskripsi: baris.join('\n'), lokasi: t.Meeting_Point || t.Tujuan || '' };
  }

  /** Semua nilai placeholder invoice — dipakai template Docs (server) & pratinjau (browser). */
  function dataInvoice(D, noInv, S) {
    var ix = indeks(D), inv = null;
    D.Invoice.forEach(function (i) { if (i.No_Invoice === noInv) inv = i; }); if (!inv) return null;
    var pj = ix.pj[inv.ID_Penjualan] || {}, r = ringkasPj(D, ix, pj, hariIni(), S), t = r.trip, c = r.cust;
    var sebelum = jumlah(r.invoices.filter(function (i) { return i.Tgl_Terbit + i.No_Invoice < inv.Tgl_Terbit + inv.No_Invoice; }), function (i) { return i.Nominal; });
    var sisaSetelah = Math.max(0, num(pj.Total) - sebelum - num(inv.Nominal));
    var items = [{ NO: '01', DESKRIPSI: 'Paket ' + t.Nama, KETERANGAN: rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang) + ' · ' + (t.Akomodasi || t.Tujuan || ''), QTY: pj.Jumlah_Pax + ' Pax', HARGA: rp(pj.Harga_per_Pax), JUMLAH: rp(num(pj.Harga_per_Pax) * num(pj.Jumlah_Pax)) }];
    if (num(pj.Diskon) > 0) items.push({ NO: '02', DESKRIPSI: 'Potongan / Promo', KETERANGAN: 'Diskon khusus pemesanan', QTY: '1x', HARGA: '-' + rp(pj.Diskon), JUMLAH: '-' + rp(pj.Diskon) });
    var verifUrl = (S.VERIF_URL || '') ? S.VERIF_URL + (S.VERIF_URL.indexOf('?') > -1 ? '&' : '?') + 'k=' + inv.Kode_Verifikasi : '';
    return {
      inv: inv, pj: pj, trip: t, cust: c, items: items,
      nilai: {
        APP_NAMA: S.APP_NAMA, APP_TAGLINE: S.APP_TAGLINE, PT_NAMA: S.PT_NAMA, PT_ALAMAT: S.PT_ALAMAT, PT_EMAIL: S.PT_EMAIL, PT_TELP: S.PT_TELP,
        NO_INVOICE: inv.No_Invoice, JENIS: inv.Jenis === 'Full' ? 'Full Payment' : inv.Jenis, TGL_TERBIT: tglPanjang(inv.Tgl_Terbit), JATUH_TEMPO: tglPanjang(inv.Jatuh_Tempo),
        STATUS: inv.Status === 'Lunas' ? 'LUNAS' : inv.Status === 'Batal' ? 'DIBATALKAN' : 'MENUNGGU PEMBAYARAN',
        NAMA_CUSTOMER: c.Nama || '', EMAIL_CUSTOMER: c.Email || '', WA_CUSTOMER: c.No_WA || '', ALAMAT_CUSTOMER: c.Alamat || '',
        NAMA_TRIP: t.Nama || '', TUJUAN: t.Tujuan || '', JADWAL: rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang), PAX: pj.Jumlah_Pax + ' Pax', MEETING_POINT: t.Meeting_Point || '-',
        SUBTOTAL: rp(num(pj.Harga_per_Pax) * num(pj.Jumlah_Pax)), DISKON: num(pj.Diskon) ? '-' + rp(pj.Diskon) : 'Rp 0', TOTAL: rp(pj.Total),
        NOMINAL: rp(inv.Nominal), TERBILANG: terbilang(inv.Nominal) + ' rupiah', SUDAH_DITAGIH: rp(sebelum), SISA_SETELAH: rp(sisaSetelah),
        TERBAYAR: rp(r.bayar), SISA_TAGIHAN: rp(r.sisa),
        BANK: S.BANK_NAMA, NOREK: S.BANK_NOREK, ATAS_NAMA: S.BANK_AN, CATATAN: inv.Catatan || S.INVOICE_CATATAN,
        TTD_NAMA: S.TTD_NAMA, TTD_JABATAN: S.TTD_JABATAN, KODE_VERIFIKASI: inv.Kode_Verifikasi, URL_VERIFIKASI: verifUrl || ('Kode: ' + inv.Kode_Verifikasi)
      }
    };
  }

  function dataManifest(D, opsi, S) {
    var ix = indeks(D), pjs;
    if (opsi.idPenjualan) pjs = [ix.pj[opsi.idPenjualan]].filter(Boolean);
    else pjs = urutkan((ix.pjPerTrip[opsi.idTrip] || []).filter(function (p) { return p.Status !== 'Batal'; }), function (p) { return p.Tgl_Booking; });
    var t = ix.trip[opsi.idTrip || (pjs[0] || {}).ID_Trip] || {};
    var rows = [], no = 0;
    pjs.forEach(function (p) {
      var c = ix.cust[p.ID_Customer] || {}, ang = urutkan(ix.angPerPj[p.ID_Penjualan] || [], function (a) { return num(a.Urutan); });
      for (var i = 0; i < Math.max(num(p.Jumlah_Pax), ang.length); i++) {
        var a = ang[i] || {}; no++;
        rows.push({ NO: String(no), NAMA: a.Nama || (i === 0 ? c.Nama : '(belum diisi)'), IDENTITAS: a.Identitas || '-', GENDER: a.Gender || '-', TGL_LAHIR: a.Tgl_Lahir ? tglId(a.Tgl_Lahir) : '-', HP: a.No_HP || (i === 0 ? c.No_WA : '') || '-', BAJU: a.Ukuran_Baju || '-', KAMAR: a.Kamar || '-', BOOKING: c.Nama, CATATAN: a.Catatan || (i === 0 ? c.Catatan_Medis : '') || '' });
      }
    });
    var c0 = pjs.length === 1 ? (ix.cust[pjs[0].ID_Customer] || {}) : {};
    return {
      trip: t, penjualan: pjs, rows: rows,
      nilai: { APP_NAMA: S.APP_NAMA, PT_NAMA: S.PT_NAMA, NAMA_TRIP: t.Nama || '', TUJUAN: t.Tujuan || '', JADWAL: rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang), MEETING_POINT: t.Meeting_Point || '-', AKOMODASI: t.Akomodasi || '-',
        TOTAL_PAX: rows.length + ' Pax', JUMLAH_BOOKING: String(pjs.length), NAMA_CUSTOMER: c0.Nama || 'Semua peserta', KONTAK_DARURAT: c0.Kontak_Darurat ? c0.Kontak_Darurat + ' (' + (c0.Telp_Darurat || '-') + ')' : '-',
        TGL_CETAK: tglPanjang(hariIni()), JUDUL: pjs.length === 1 ? 'MANIFEST PESERTA' : 'MANIFEST TRIP' }
    };
  }

  function verifikasiPublik(D, kode) {
    kode = str(kode).toUpperCase(); if (!kode || kode.length < 8) return fail('Kode verifikasi tidak valid.');
    var inv = null; D.Invoice.forEach(function (i) { if (str(i.Kode_Verifikasi).toUpperCase() === kode) inv = i; });
    if (!inv) return fail('Dokumen dengan kode ini tidak ditemukan. Kemungkinan palsu atau salah ketik.');
    var ix = indeks(D), pj = ix.pj[inv.ID_Penjualan] || {}, t = ix.trip[pj.ID_Trip] || {}, c = ix.cust[pj.ID_Customer] || {};
    return ok({ noInvoice: inv.No_Invoice, jenis: inv.Jenis, tglTerbit: tglPanjang(inv.Tgl_Terbit), nominal: rp(inv.Nominal), status: inv.Status, customer: samarkanNama(c.Nama), trip: t.Nama || '-', jadwal: rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang), sah: inv.Status !== 'Batal' });
  }

  // ==========================================================================
  // 6. LOGIKA TULIS — helper perhitungan ulang
  // ==========================================================================
  function recalcPenjualan(tx, id) {
    var pj = tx.get('Penjualan', id); if (!pj) return null;
    var bayar = jumlah(tx.where('Pembayaran', function (b) { return b.ID_Penjualan === id && b.Status_Verifikasi === 'Terverifikasi'; }), function (b) { return b.Nominal; });
    var total = num(pj.Total), sisa = Math.max(0, total - bayar), lama = pj.Status;
    var status = lama === 'Batal' ? 'Batal' : (bayar <= 0 ? 'Booking' : bayar >= total ? 'Lunas' : 'DP');
    pj = tx.update('Penjualan', id, { Terbayar: bayar, Sisa: sisa, Status: status, Diperbarui: tx.now() });
    // Status invoice: lunas bila kumulatif tagihan tertutup pembayaran
    var cum = 0;
    urutkan(tx.where('Invoice', function (i) { return i.ID_Penjualan === id && i.Status !== 'Batal'; }), function (i) { return i.Tgl_Terbit + i.No_Invoice; }).forEach(function (i) {
      cum += num(i.Nominal); tx.update('Invoice', i.No_Invoice, { Status: bayar >= cum ? 'Lunas' : 'Terbit' });
    });
    return { pj: pj, lama: lama, baru: status, bayar: bayar, sisa: sisa };
  }

  function recalcRekap(tx, idTrip) {
    var t = tx.get('Trip', idTrip); if (!t) return null;
    var ix = indeks(tx.D), r = rekapTrip(tx.D, ix, t, tx.today());
    var row = { ID_Trip: idTrip, Pax: r.pax, Pendapatan: r.pendapatan, Kas_Masuk: r.kasMasuk, Budget_Aktif: r.budget, Versi_Budget: r.versiBudget, Realisasi: r.realisasi, Selisih: r.selisih, Laba: r.laba, Margin: r.margin, Diperbarui: tx.now() };
    var cur = tx.get('Rekap_Operasional', idTrip);
    row.Status_Audit = r.statusAudit;                       // Belum/Draft mengikuti ada-tidaknya nota; status lain hanya diubah lewat alur lapor/audit
    if (cur) return tx.update('Rekap_Operasional', idTrip, row);
    return tx.insert('Rekap_Operasional', row);
  }

  function pastikanPeserta(tx, pj) {
    var ada = tx.where('Peserta_Trip', function (p) { return p.ID_Penjualan === pj.ID_Penjualan; })[0];
    if (ada) { if (num(ada.Jumlah_Pax) !== num(pj.Jumlah_Pax)) tx.update('Peserta_Trip', ada.ID_Peserta, { Jumlah_Pax: pj.Jumlah_Pax }); return ada; }
    return tx.insert('Peserta_Trip', { ID_Trip: pj.ID_Trip, ID_Customer: pj.ID_Customer, ID_Penjualan: pj.ID_Penjualan, Jumlah_Pax: pj.Jumlah_Pax, Status_Data: pj.Review_Peserta === 'YA' ? 'Terverifikasi' : 'Sudah Masuk', Tgl_Masuk: tx.today() });
  }
  function pastikanManifest(tx, pj) {
    var ada = tx.where('Manifest', function (m) { return m.Tipe === 'Per Customer' && m.ID_Penjualan === pj.ID_Penjualan; })[0];
    if (ada) return ada;
    return tx.insert('Manifest', { Tipe: 'Per Customer', ID_Customer: pj.ID_Customer, ID_Penjualan: pj.ID_Penjualan, ID_Trip: pj.ID_Trip, Status: 'Draft', Versi: 1, Dibuat_Oleh: tx.user.nama, Diperbarui: tx.now() });
  }
  function pastikanAnggotaUtama(tx, pj) {
    if (tx.where('Anggota_Rombongan', function (a) { return a.ID_Penjualan === pj.ID_Penjualan; }).length) return;
    var c = tx.get('Customer', pj.ID_Customer) || {};
    tx.insert('Anggota_Rombongan', { ID_Penjualan: pj.ID_Penjualan, ID_Customer: pj.ID_Customer, Nama: c.Nama, Identitas: c.Identitas, Gender: c.Gender, Tgl_Lahir: c.Tgl_Lahir, No_HP: c.No_WA, Urutan: 1, Catatan: c.Catatan_Medis });
  }
  function jadwalkanEvent(tx, pj, setelah) { return tx.job('CAL_UPSERT', pj.ID_Penjualan, {}, setelah); }

  function nomorInvoiceBaru(tx, tanggal) {
    var th = tanggal.slice(0, 4), bl = tanggal.slice(5, 7), mx = 0;
    tx.all('Invoice').forEach(function (i) { var m = String(i.No_Invoice).match(/^YX\/INV\/(\d{4})\/\d{2}\/(\d+)$/); if (m && m[1] === th) mx = Math.max(mx, Number(m[2])); });
    return 'YX/INV/' + th + '/' + bl + '/' + pad(mx + 1, 4);
  }
  function kodeVerif(tx) { return String(tx.H.uuid()).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12); }

  // ==========================================================================
  // 7. AKSI (API) — setiap fungsi (tx, data) → ok/fail
  // ==========================================================================
  var A = {};

  // ---------- Customer ----------
  A['customer.simpan'] = function (tx, d) {
    var nama = str(d.Nama); if (!nama) throw salah('Nama customer wajib diisi.');
    var wa = hp08(d.No_WA); if (wa && !hpValid(wa)) throw salah('Format nomor WhatsApp tidak valid (contoh: 0812xxxxxxxx).');
    var email = str(d.Email).toLowerCase(); if (email && !emailValid(email)) throw salah('Format email tidak valid.');
    if (email && tx.where('Customer', function (c) { return c.Status !== 'Dihapus' && c.Email.toLowerCase() === email && c.ID_Customer !== d.ID_Customer; }).length) throw salah('Email ' + email + ' sudah dipakai customer lain.');
    var row = { Nama: nama, No_WA: wa, Email: email, Alamat: str(d.Alamat), Kota: str(d.Kota), Identitas: str(d.Identitas), Tgl_Lahir: tgl(d.Tgl_Lahir), Gender: str(d.Gender), Kontak_Darurat: str(d.Kontak_Darurat), Telp_Darurat: hp08(d.Telp_Darurat), Catatan_Medis: str(d.Catatan_Medis), Tag: str(d.Tag), Catatan: str(d.Catatan), Diperbarui: tx.now() };
    var hasil;
    if (d.ID_Customer && tx.get('Customer', d.ID_Customer)) { hasil = tx.update('Customer', d.ID_Customer, row); tx.log('Ubah customer', 'Manifest & Customer', hasil.ID_Customer, nama); }
    else { row.Status = 'Aktif'; row.Tgl_Terdaftar = tx.today(); hasil = tx.insert('Customer', row); tx.log('Tambah customer', 'Manifest & Customer', hasil.ID_Customer, nama); }
    crmUpsertSatu(tx, 'customer', hasil);
    return ok(hasil, 'Data customer tersimpan.');
  };
  A['customer.hapus'] = function (tx, d) {
    var c = tx.get('Customer', d.id); if (!c) throw salah('Customer tidak ditemukan.');
    var aktif = tx.where('Penjualan', function (p) { return p.ID_Customer === d.id && p.Status !== 'Batal' && p.Status !== 'Lunas'; }).length;
    if (aktif && !d.paksa) throw salah('Customer masih punya ' + aktif + ' penjualan aktif. Batalkan dulu atau gunakan hapus paksa.');
    tx.update('Customer', d.id, { Status: 'Dihapus', Diperbarui: tx.now() });
    tx.log('Hapus customer (soft)', 'Manifest & Customer', d.id, c.Nama);
    return ok({ id: d.id }, 'Customer dipindah ke arsip (soft delete).');
  };
  A['customer.pulihkan'] = function (tx, d) { tx.update('Customer', d.id, { Status: 'Aktif', Diperbarui: tx.now() }); tx.log('Pulihkan customer', 'Manifest & Customer', d.id, ''); return ok({ id: d.id }, 'Customer dipulihkan.'); };

  // ---------- Trip (master) ----------
  A['trip.simpan'] = function (tx, d) {
    var nama = str(d.Nama), b = tgl(d.Tgl_Berangkat), p = tgl(d.Tgl_Pulang) || b;
    if (!nama) throw salah('Nama trip wajib diisi.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) throw salah('Tanggal berangkat wajib diisi.');
    if (p < b) throw salah('Tanggal pulang tidak boleh sebelum tanggal berangkat.');
    var kode = str(d.Kode).toUpperCase() || ('TRP-' + nama.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() + '-' + b.slice(5, 7) + b.slice(2, 4));
    if (tx.where('Trip', function (t) { return t.Kode === kode && t.ID_Trip !== d.ID_Trip; }).length) throw salah('Kode trip ' + kode + ' sudah dipakai.');
    var row = { Kode: kode, Nama: nama, Tujuan: str(d.Tujuan), Tgl_Berangkat: b, Tgl_Pulang: p, Kuota: num(d.Kuota) || 0, Harga_Default: num(d.Harga_Default), Meeting_Point: str(d.Meeting_Point), Akomodasi: str(d.Akomodasi), Foto_URL: str(d.Foto_URL), Deskripsi: str(d.Deskripsi), Status: str(d.Status) || 'Open' };
    var hasil, lama = d.ID_Trip ? tx.get('Trip', d.ID_Trip) : null;
    if (lama) {
      hasil = tx.update('Trip', d.ID_Trip, row);
      if (lama.Tgl_Berangkat !== b || lama.Tgl_Pulang !== p || lama.Nama !== nama) tx.where('Penjualan', function (x) { return x.ID_Trip === d.ID_Trip && x.ID_Event; }).forEach(function (x) { jadwalkanEvent(tx, x); });
      tx.log('Ubah trip', 'Budgeting & RAB', kode, nama);
    } else {
      row.Dibuat = tx.now(); hasil = tx.insert('Trip', row);
      tx.job('TRIP_FOLDER', hasil.ID_Trip, {});
      tx.log('Tambah trip', 'Budgeting & RAB', kode, nama);
    }
    recalcRekap(tx, hasil.ID_Trip);
    return ok(hasil, 'Trip tersimpan.');
  };
  A['trip.hapus'] = function (tx, d) {
    var t = tx.get('Trip', d.id); if (!t) throw salah('Trip tidak ditemukan.');
    var n = tx.where('Penjualan', function (p) { return p.ID_Trip === d.id; }).length;
    if (n) { tx.update('Trip', d.id, { Status: 'Batal' }); tx.log('Batalkan trip', 'Budgeting & RAB', t.Kode, n + ' penjualan terkait'); return ok({ id: d.id }, 'Trip punya penjualan, jadi statusnya diubah menjadi Batal.'); }
    tx.where('Budget_Header', function (h) { return h.ID_Trip === d.id; }).forEach(function (h) { tx.where('Budget_Item', function (i) { return i.ID_Budget === h.ID_Budget; }).forEach(function (i) { tx.remove('Budget_Item', i.ID_Item); }); tx.remove('Budget_Header', h.ID_Budget); });
    tx.remove('Rekap_Operasional', d.id); tx.remove('Trip', d.id); tx.log('Hapus trip', 'Budgeting & RAB', t.Kode, t.Nama);
    return ok({ id: d.id }, 'Trip dihapus.');
  };

  // ---------- Penjualan ----------
  A['penjualan.simpan'] = function (tx, d) {
    var c = tx.get('Customer', d.ID_Customer); if (!c || c.Status === 'Dihapus') throw salah('Pilih customer yang valid.');
    var t = tx.get('Trip', d.ID_Trip); if (!t || t.Status === 'Batal') throw salah('Pilih trip yang valid.');
    var pax = Math.round(num(d.Jumlah_Pax)); if (pax < 1) throw salah('Jumlah pax minimal 1.');
    var harga = num(d.Harga_per_Pax) || num(t.Harga_Default); if (harga <= 0) throw salah('Harga per pax wajib diisi.');
    var diskon = Math.max(0, num(d.Diskon)), total = pax * harga - diskon; if (total <= 0) throw salah('Total harus lebih dari 0.');
    var lama = d.ID_Penjualan ? tx.get('Penjualan', d.ID_Penjualan) : null;
    var terisi = jumlah(tx.where('Penjualan', function (p) { return p.ID_Trip === t.ID_Trip && p.Status !== 'Batal' && p.ID_Penjualan !== d.ID_Penjualan; }), function (p) { return p.Jumlah_Pax; });
    if (num(t.Kuota) && terisi + pax > num(t.Kuota) && !d.paksa) throw salah('Kuota trip tidak cukup: tersisa ' + Math.max(0, num(t.Kuota) - terisi) + ' dari ' + t.Kuota + ' pax.');
    var row = { ID_Customer: c.ID_Customer, ID_Trip: t.ID_Trip, Jumlah_Pax: pax, Harga_per_Pax: harga, Diskon: diskon, Total: total, Jatuh_Tempo: tgl(d.Jatuh_Tempo), Catatan: str(d.Catatan), Diperbarui: tx.now() };
    var hasil;
    if (lama) {
      if (lama.Status === 'Batal') throw salah('Penjualan sudah dibatalkan.');
      var ditagih = jumlah(tx.where('Invoice', function (i) { return i.ID_Penjualan === lama.ID_Penjualan && i.Status !== 'Batal'; }), function (i) { return i.Nominal; });
      if (total < num(lama.Terbayar)) throw salah('Total baru lebih kecil dari yang sudah dibayar (' + rp(lama.Terbayar) + ').');
      if (total < ditagih) throw salah('Total baru lebih kecil dari total invoice terbit (' + rp(ditagih) + '). Batalkan invoice dulu.');
      if (lama.ID_Trip !== t.ID_Trip && ditagih) throw salah('Trip tidak bisa diganti karena invoice sudah terbit.');
      hasil = tx.update('Penjualan', lama.ID_Penjualan, row);
      tx.where('Peserta_Trip', function (p) { return p.ID_Penjualan === lama.ID_Penjualan; }).forEach(function (p) { tx.update('Peserta_Trip', p.ID_Peserta, { Jumlah_Pax: pax, ID_Trip: t.ID_Trip }); });
      recalcPenjualan(tx, hasil.ID_Penjualan);
      if (hasil.ID_Event) jadwalkanEvent(tx, hasil);
      tx.log('Ubah penjualan', 'Finansial & Invoice', hasil.ID_Penjualan, c.Nama + ' · ' + t.Nama + ' · ' + rp(total));
      if (lama.ID_Trip !== t.ID_Trip) recalcRekap(tx, lama.ID_Trip);
    } else {
      row.Status = 'Booking'; row.Terbayar = 0; row.Sisa = total; row.Review_Peserta = 'TIDAK'; row.Tgl_Booking = tgl(d.Tgl_Booking) || tx.today(); row.Dibuat_Oleh = tx.user.nama;
      hasil = tx.insert('Penjualan', row);
      pastikanAnggotaUtama(tx, hasil);
      tx.log('Catat penjualan', 'Finansial & Invoice', hasil.ID_Penjualan, c.Nama + ' · ' + t.Nama + ' · ' + pax + ' pax · ' + rp(total));
      notif(tx, 'BOOKING_DIBUAT', penerimaCustomer(c), varsDasar(tx, { trip: t.Nama, tglTrip: rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang), pax: pax, total: rp(total) }), hasil.ID_Penjualan);
    }
    if (Array.isArray(d.anggota)) A['anggota.simpan'](tx, { ID_Penjualan: hasil.ID_Penjualan, anggota: d.anggota });
    recalcRekap(tx, t.ID_Trip);
    return ok(tx.get('Penjualan', hasil.ID_Penjualan), lama ? 'Penjualan diperbarui.' : 'Penjualan baru tercatat.');
  };
  A['penjualan.batal'] = function (tx, d) {
    var pj = tx.get('Penjualan', d.id); if (!pj) throw salah('Penjualan tidak ditemukan.');
    if (pj.Status === 'Batal') return ok(pj, 'Sudah dibatalkan.');
    if (!str(d.alasan)) throw salah('Alasan pembatalan wajib diisi.');
    tx.update('Penjualan', pj.ID_Penjualan, { Status: 'Batal', Catatan: (pj.Catatan ? pj.Catatan + ' | ' : '') + 'BATAL: ' + str(d.alasan), Diperbarui: tx.now() });
    tx.where('Invoice', function (i) { return i.ID_Penjualan === pj.ID_Penjualan && i.Status !== 'Lunas'; }).forEach(function (i) { tx.update('Invoice', i.No_Invoice, { Status: 'Batal' }); });
    tx.where('Peserta_Trip', function (p) { return p.ID_Penjualan === pj.ID_Penjualan; }).forEach(function (p) { tx.remove('Peserta_Trip', p.ID_Peserta); });
    if (pj.ID_Event) tx.job('CAL_HAPUS', pj.ID_Penjualan, { eventId: pj.ID_Event });
    recalcRekap(tx, pj.ID_Trip);
    tx.log('Batalkan penjualan', 'Finansial & Invoice', pj.ID_Penjualan, str(d.alasan));
    return ok(tx.get('Penjualan', pj.ID_Penjualan), 'Penjualan dibatalkan.');
  };
  A['penjualan.review'] = function (tx, d) {
    var pj = tx.get('Penjualan', d.id); if (!pj) throw salah('Penjualan tidak ditemukan.');
    var ya = d.nilai !== false && d.nilai !== 'TIDAK';
    if (ya) pastikanPeserta(tx, pj);
    tx.update('Penjualan', pj.ID_Penjualan, { Review_Peserta: ya ? 'YA' : 'TIDAK', Diperbarui: tx.now() });
    tx.where('Peserta_Trip', function (p) { return p.ID_Penjualan === pj.ID_Penjualan; }).forEach(function (p) { tx.update('Peserta_Trip', p.ID_Peserta, { Status_Data: ya ? 'Terverifikasi' : 'Sudah Masuk' }); });
    tx.log(ya ? 'Review peserta: sudah masuk daftar' : 'Review peserta dibatalkan', 'Manifest & Customer', pj.ID_Penjualan, '');
    return ok(tx.get('Penjualan', pj.ID_Penjualan), ya ? 'Ditandai sudah masuk daftar peserta trip.' : 'Penanda review dihapus.');
  };
  A['anggota.simpan'] = function (tx, d) {
    var pj = tx.get('Penjualan', d.ID_Penjualan); if (!pj) throw salah('Penjualan tidak ditemukan.');
    var masuk = (d.anggota || []).filter(function (a) { return str(a.Nama); });
    if (masuk.length > num(pj.Jumlah_Pax)) throw salah('Jumlah anggota (' + masuk.length + ') melebihi pax (' + pj.Jumlah_Pax + ').');
    var mnf = tx.where('Manifest', function (m) { return m.ID_Penjualan === pj.ID_Penjualan && m.Tipe === 'Per Customer'; })[0];
    if (mnf && mnf.Status === 'Final' && !d.paksa) throw salah('Manifest sudah Final. Buka revisi manifest dulu untuk mengubah data rombongan.');
    var lama = tx.where('Anggota_Rombongan', function (a) { return a.ID_Penjualan === pj.ID_Penjualan; }), dipakai = {};
    masuk.forEach(function (a, i) {
      var row = { ID_Penjualan: pj.ID_Penjualan, ID_Customer: pj.ID_Customer, Nama: str(a.Nama), Identitas: str(a.Identitas), Gender: str(a.Gender), Tgl_Lahir: tgl(a.Tgl_Lahir), No_HP: hp08(a.No_HP), Ukuran_Baju: str(a.Ukuran_Baju), Kamar: str(a.Kamar), Catatan: str(a.Catatan), Urutan: i + 1 };
      if (a.ID_Anggota && tx.get('Anggota_Rombongan', a.ID_Anggota)) { tx.update('Anggota_Rombongan', a.ID_Anggota, row); dipakai[a.ID_Anggota] = 1; }
      else { var r = tx.insert('Anggota_Rombongan', row); dipakai[r.ID_Anggota] = 1; }
    });
    lama.forEach(function (a) { if (!dipakai[a.ID_Anggota]) tx.remove('Anggota_Rombongan', a.ID_Anggota); });
    if (mnf) tx.update('Manifest', mnf.ID_Manifest, { Diperbarui: tx.now() });
    tx.log('Ubah data rombongan', 'Manifest & Customer', pj.ID_Penjualan, masuk.length + '/' + pj.Jumlah_Pax + ' pax');
    return ok({ jumlah: masuk.length }, 'Data rombongan tersimpan (' + masuk.length + '/' + pj.Jumlah_Pax + ').');
  };

  // ---------- Pembayaran ----------
  A['pembayaran.simpan'] = function (tx, d) {
    var pj = tx.get('Penjualan', d.ID_Penjualan); if (!pj) throw salah('Penjualan tidak ditemukan.');
    if (pj.Status === 'Batal') throw salah('Penjualan sudah dibatalkan.');
    var nominal = bulat(d.Nominal); if (nominal <= 0) throw salah('Nominal pembayaran harus lebih dari 0.');
    var lama = d.ID_Bayar ? tx.get('Pembayaran', d.ID_Bayar) : null;
    var sudah = jumlah(tx.where('Pembayaran', function (b) { return b.ID_Penjualan === pj.ID_Penjualan && b.Status_Verifikasi !== 'Ditolak' && b.ID_Bayar !== d.ID_Bayar; }), function (b) { return b.Nominal; });
    if (sudah + nominal > num(pj.Total) && !d.paksa) throw salah('Nominal melebihi sisa tagihan (' + rp(Math.max(0, num(pj.Total) - sudah)) + ').');
    var jenis = str(d.Jenis) || (sudah === 0 ? (nominal >= num(pj.Total) ? 'Pelunasan' : 'DP') : (sudah + nominal >= num(pj.Total) ? 'Pelunasan' : 'Cicilan'));
    var row = { ID_Penjualan: pj.ID_Penjualan, Jenis: jenis, Tanggal: tgl(d.Tanggal) || tx.today(), Nominal: nominal, Metode: str(d.Metode) || 'Transfer', Link_Bukti: str(d.Link_Bukti), Status_Verifikasi: str(d.Status_Verifikasi) || 'Terverifikasi', Catatan: str(d.Catatan) };
    if (row.Status_Verifikasi === 'Terverifikasi') row.Diverifikasi_Oleh = tx.user.nama;
    var b;
    if (lama) b = tx.update('Pembayaran', lama.ID_Bayar, row); else { row.Dibuat_Oleh = tx.user.nama; row.Dibuat = tx.now(); b = tx.insert('Pembayaran', row); }
    var rc = recalcPenjualan(tx, pj.ID_Penjualan);
    if (rc.pj.ID_Event) jadwalkanEvent(tx, rc.pj);
    recalcRekap(tx, pj.ID_Trip);
    var c = tx.get('Customer', pj.ID_Customer) || {}, t = tx.get('Trip', pj.ID_Trip) || {};
    if (!lama && b.Status_Verifikasi === 'Terverifikasi') notifPembayaran(tx, b, rc, c, t);
    tx.log(lama ? 'Ubah pembayaran' : 'Input pembayaran', 'Finansial & Invoice', b.ID_Bayar, c.Nama + ' · ' + jenis + ' ' + rp(nominal) + ' · ' + row.Metode);
    return ok(b, rc.baru === 'Lunas' && rc.lama !== 'Lunas' ? 'Pembayaran tercatat — booking LUNAS 🎉' : 'Pembayaran tercatat. Sisa ' + rp(rc.sisa) + '.');
  };
  function notifPembayaran(tx, b, rc, c, t) {
    var v = varsDasar(tx, { trip: t.Nama, nominal: rp(b.Nominal), jenisBayar: b.Jenis, terbayar: rp(rc.bayar), sisa: rp(rc.sisa), meetingPoint: t.Meeting_Point || '-', tglTrip: rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang), customer: c.Nama, metode: b.Metode, oleh: tx.user.nama });
    if (rc.baru === 'Lunas' && rc.lama !== 'Lunas') notif(tx, 'LUNAS', penerimaCustomer(c), v, rc.pj.ID_Penjualan);
    else notif(tx, 'PEMBAYARAN_DITERIMA', penerimaCustomer(c), v, b.ID_Bayar);
    penerimaTim(tx, 'Finance').forEach(function (p) { notif(tx, 'TIM_PEMBAYARAN_MASUK', p, v, b.ID_Bayar); });
  }
  A['pembayaran.verifikasi'] = function (tx, d) {
    var b = tx.get('Pembayaran', d.id); if (!b) throw salah('Pembayaran tidak ditemukan.');
    var st = d.status === 'Ditolak' ? 'Ditolak' : 'Terverifikasi', sebelum = b.Status_Verifikasi;
    tx.update('Pembayaran', b.ID_Bayar, { Status_Verifikasi: st, Diverifikasi_Oleh: tx.user.nama, Catatan: d.catatan ? str(d.catatan) : b.Catatan });
    var pj = tx.get('Penjualan', b.ID_Penjualan), rc = recalcPenjualan(tx, b.ID_Penjualan);
    if (rc.pj.ID_Event) jadwalkanEvent(tx, rc.pj);
    recalcRekap(tx, pj.ID_Trip);
    if (st === 'Terverifikasi' && sebelum !== 'Terverifikasi') notifPembayaran(tx, tx.get('Pembayaran', b.ID_Bayar), rc, tx.get('Customer', pj.ID_Customer) || {}, tx.get('Trip', pj.ID_Trip) || {});
    tx.log('Verifikasi pembayaran: ' + st, 'Finansial & Invoice', b.ID_Bayar, rp(b.Nominal));
    return ok(tx.get('Pembayaran', b.ID_Bayar), 'Pembayaran ' + st.toLowerCase() + '.');
  };
  A['pembayaran.hapus'] = function (tx, d) {
    var b = tx.get('Pembayaran', d.id); if (!b) throw salah('Pembayaran tidak ditemukan.');
    var pj = tx.get('Penjualan', b.ID_Penjualan); tx.remove('Pembayaran', b.ID_Bayar);
    var rc = recalcPenjualan(tx, b.ID_Penjualan); if (rc && rc.pj.ID_Event) jadwalkanEvent(tx, rc.pj);
    if (pj) recalcRekap(tx, pj.ID_Trip);
    tx.log('Hapus pembayaran', 'Finansial & Invoice', b.ID_Bayar, rp(b.Nominal));
    return ok({ id: d.id }, 'Pembayaran dihapus.');
  };

  // ---------- Invoice ----------
  function nominalInvoiceDefault(tx, pj, jenis) {
    var S = tx.S(), total = num(pj.Total);
    var ditagih = jumlah(tx.where('Invoice', function (i) { return i.ID_Penjualan === pj.ID_Penjualan && i.Status !== 'Batal'; }), function (i) { return i.Nominal; });
    if (jenis === 'DP') return Math.max(0, Math.min(Math.round(total * num(S.DP_PERSEN || 50) / 100), total - ditagih));
    if (jenis === 'Full') return total - ditagih;
    return Math.max(0, total - Math.max(ditagih, num(pj.Terbayar)));
  }
  A['invoice.buat'] = function (tx, d) {
    var pj = tx.get('Penjualan', d.ID_Penjualan); if (!pj) throw salah('Pilih penjualan terlebih dahulu.');
    if (pj.Status === 'Batal') throw salah('Penjualan sudah dibatalkan.');
    var jenis = ['DP', 'Pelunasan', 'Full'].indexOf(d.Jenis) > -1 ? d.Jenis : 'DP';
    var invs = tx.where('Invoice', function (i) { return i.ID_Penjualan === pj.ID_Penjualan && i.Status !== 'Batal'; });
    // Aman diulang: invoice terbuka dengan jenis sama → kembalikan yang ada (tanpa nomor/event ganda)
    var kembar = invs.filter(function (i) { return i.Jenis === jenis && i.Status === 'Terbit'; })[0];
    if (kembar && !d.paksaBaru) return ok({ invoice: kembar, ulang: true }, 'Invoice ' + kembar.No_Invoice + ' untuk tagihan ini sudah ada — tidak dibuat ganda.');
    if (jenis === 'Full' && invs.length) throw salah('Invoice Full hanya untuk penjualan yang belum pernah ditagih. Gunakan jenis Pelunasan.');
    var ditagih = jumlah(invs, function (i) { return i.Nominal; });
    var nominal = d.Nominal ? bulat(d.Nominal) : nominalInvoiceDefault(tx, pj, jenis);
    if (nominal <= 0) throw salah('Tidak ada sisa tagihan untuk ditagihkan.');
    if (ditagih + nominal > num(pj.Total)) throw salah('Nominal melebihi sisa yang belum ditagih (' + rp(num(pj.Total) - ditagih) + ').');
    var S = tx.S(), t = tx.get('Trip', pj.ID_Trip) || {}, c = tx.get('Customer', pj.ID_Customer) || {};
    var terbit = tgl(d.Tgl_Terbit) || tx.today();
    var jt = tgl(d.Jatuh_Tempo);
    if (!jt) {
      if (jenis === 'Pelunasan') { jt = t.Tgl_Berangkat ? tambahHari(t.Tgl_Berangkat, -3) : tambahHari(terbit, 7); if (jt < terbit) jt = terbit; }
      else jt = tambahHari(terbit, num(S.JATUH_TEMPO_HARI || 3));
    }
    var no = nomorInvoiceBaru(tx, terbit);
    var kirim = d.kirim !== false;
    var inv = tx.insert('Invoice', { No_Invoice: no, ID_Penjualan: pj.ID_Penjualan, Jenis: jenis, Tgl_Terbit: terbit, Jatuh_Tempo: jt, Nominal: nominal, Status: 'Terbit', Kode_Verifikasi: kodeVerif(tx),
      Status_Proses: JSON.stringify({ pdf: 'antri', cal: 'antri', kirim: kirim ? 'antri' : 'lewati' }), Catatan: str(d.Catatan), ID_Event_Calendar: pj.ID_Event || '', Dibuat_Oleh: tx.user.nama, Dibuat: tx.now() });
    if (!pj.Jatuh_Tempo || pj.Jatuh_Tempo !== jt) tx.update('Penjualan', pj.ID_Penjualan, { Jatuh_Tempo: jt });
    pastikanPeserta(tx, pj); pastikanManifest(tx, pj); pastikanAnggotaUtama(tx, pj);
    recalcPenjualan(tx, pj.ID_Penjualan);
    var jPdf = tx.job('INVOICE_PDF', no, {});
    var jCal = jadwalkanEvent(tx, pj, [jPdf]);
    if (kirim) tx.job('INVOICE_KIRIM', no, { email: d.email !== false, wa: d.wa !== false }, [jPdf]);
    penerimaTim(tx, 'Finance').forEach(function (p) { notif(tx, 'TIM_INVOICE_TERBIT', p, varsDasar(tx, { noInvoice: no, jenis: jenis, nominal: rp(nominal), customer: c.Nama, trip: t.Nama, oleh: tx.user.nama }), no); });
    tx.log('Invoice terbit', 'Finansial & Invoice', no, c.Nama + ' · ' + jenis + ' ' + rp(nominal));
    recalcRekap(tx, pj.ID_Trip);
    return ok({ invoice: tx.get('Invoice', no), jobs: [jPdf, jCal] }, 'Invoice ' + no + ' terbit. PDF, event Calendar & pengiriman diproses…');
  };
  A['invoice.batal'] = function (tx, d) {
    var inv = tx.get('Invoice', d.no); if (!inv) throw salah('Invoice tidak ditemukan.');
    if (inv.Status === 'Lunas') throw salah('Invoice lunas tidak bisa dibatalkan.');
    if (!str(d.alasan)) throw salah('Alasan pembatalan wajib diisi.');
    tx.update('Invoice', inv.No_Invoice, { Status: 'Batal', Catatan: 'BATAL: ' + str(d.alasan) });
    var pj = tx.get('Penjualan', inv.ID_Penjualan); recalcPenjualan(tx, inv.ID_Penjualan); if (pj && pj.ID_Event) jadwalkanEvent(tx, pj);
    tx.log('Batalkan invoice', 'Finansial & Invoice', inv.No_Invoice, str(d.alasan));
    return ok(tx.get('Invoice', inv.No_Invoice), 'Invoice dibatalkan. Nomornya tetap tercatat (tidak dipakai ulang).');
  };
  A['invoice.kirimUlang'] = function (tx, d) {
    var inv = tx.get('Invoice', d.no); if (!inv) throw salah('Invoice tidak ditemukan.');
    var st = prosesInvoice(inv); st.kirim = 'antri'; tx.update('Invoice', inv.No_Invoice, { Status_Proses: JSON.stringify(st) });
    var dep = st.pdf === 'ok' ? [] : [tx.job('INVOICE_PDF', inv.No_Invoice, {})];
    tx.job('INVOICE_KIRIM', inv.No_Invoice, { email: d.email !== false, wa: d.wa !== false }, dep);
    tx.log('Kirim ulang invoice', 'Finansial & Invoice', inv.No_Invoice, '');
    return ok(inv, 'Invoice dijadwalkan untuk dikirim ulang.');
  };
  A['invoice.prosesUlang'] = function (tx, d) {
    var inv = tx.get('Invoice', d.no); if (!inv) throw salah('Invoice tidak ditemukan.');
    var pj = tx.get('Penjualan', inv.ID_Penjualan), st = prosesInvoice(inv);
    st.pdf = 'antri'; st.cal = 'antri'; tx.update('Invoice', inv.No_Invoice, { Status_Proses: JSON.stringify(st) });
    var j = tx.job('INVOICE_PDF', inv.No_Invoice, {}); jadwalkanEvent(tx, pj, [j]);
    tx.log('Proses ulang invoice', 'Finansial & Invoice', inv.No_Invoice, 'PDF & Calendar');
    return ok(inv, 'PDF & event Calendar diproses ulang (event lama diperbarui, tidak dibuat ganda).');
  };

  // ---------- Budget berversi ----------
  function hitungTotalBudget(tx, idB) { var t = jumlah(tx.where('Budget_Item', function (i) { return i.ID_Budget === idB; }), function (i) { return i.Subtotal; }); tx.update('Budget_Header', idB, { Total: t }); return t; }
  A['budget.buat'] = function (tx, d) {
    var t = tx.get('Trip', d.ID_Trip); if (!t) throw salah('Trip tidak ditemukan.');
    var ada = tx.where('Budget_Header', function (h) { return h.ID_Trip === t.ID_Trip; });
    if (ada.some(function (h) { return h.Status === 'Draft' || h.Status === 'Menunggu' || h.Status === 'Ditolak'; })) throw salah('Masih ada versi draft/menunggu. Selesaikan dulu.');
    if (ada.some(function (h) { return h.Status === 'Aktif'; })) return A['budget.revisi'](tx, { ID_Trip: t.ID_Trip, alasan: d.alasan || 'Revisi' });
    var h = tx.insert('Budget_Header', { ID_Trip: t.ID_Trip, Versi: 1, Status: 'Draft', Total: 0, Alasan_Revisi: str(d.alasan) || 'Budget awal', Dibuat_Oleh: tx.user.nama, Tgl_Dibuat: tx.now() });
    if (Array.isArray(d.items) && d.items.length) A['budget.simpanItem'](tx, { ID_Budget: h.ID_Budget, items: d.items });
    tx.log('Buat budget v1', 'Budgeting & RAB', t.Kode, t.Nama);
    return ok(tx.get('Budget_Header', h.ID_Budget), 'Draft budget v1 dibuat.');
  };
  A['budget.revisi'] = function (tx, d) {
    var t = tx.get('Trip', d.ID_Trip); if (!t) throw salah('Trip tidak ditemukan.');
    var hs = tx.where('Budget_Header', function (h) { return h.ID_Trip === t.ID_Trip; });
    var terbuka = hs.filter(function (h) { return h.Status === 'Draft' || h.Status === 'Menunggu' || h.Status === 'Ditolak'; })[0];
    if (terbuka) throw salah('Versi ' + terbuka.Versi + ' masih ' + terbuka.Status + '. Selesaikan atau hapus dulu.');
    var aktif = null; hs.forEach(function (h) { if (h.Status === 'Aktif') aktif = h; });
    if (!aktif) throw salah('Belum ada versi aktif untuk direvisi.');
    if (!str(d.alasan)) throw salah('Alasan pengajuan perubahan RAB wajib diisi.');
    var stR = normRls((tx.get('Rekap_Operasional', t.ID_Trip) || {}).Status_Audit);
    if (stR === RLS.DIAJUKAN) throw salah('Laporan realisasi trip ini sedang diaudit Finance — RAB tidak bisa diubah dulu.');
    if (stR === RLS.FINAL) throw salah('Realisasi trip ini sudah final disetujui Finance — RAB terkunci permanen.');
    var mx = 0; hs.forEach(function (h) { mx = Math.max(mx, num(h.Versi)); });
    var h = tx.insert('Budget_Header', { ID_Trip: t.ID_Trip, Versi: mx + 1, Status: 'Draft', Total: aktif.Total, Alasan_Revisi: str(d.alasan), Dibuat_Oleh: tx.user.nama, Tgl_Dibuat: tx.now() });
    // Salin item dari versi aktif → admin cukup mengubah item yang berubah
    tx.where('Budget_Item', function (i) { return i.ID_Budget === aktif.ID_Budget; }).forEach(function (i) {
      tx.insert('Budget_Item', { ID_Budget: h.ID_Budget, Kategori: i.Kategori, Uraian: i.Uraian, Keterangan: i.Keterangan, Qty: i.Qty, Satuan: i.Satuan, Harga_Satuan: i.Harga_Satuan, Subtotal: i.Subtotal, Urutan: i.Urutan });
    });
    tx.log('Buat revisi budget v' + (mx + 1), 'Budgeting & RAB', t.Kode, str(d.alasan));
    return ok(tx.get('Budget_Header', h.ID_Budget), 'Draft perubahan RAB v' + (mx + 1) + ' dibuat dari versi aktif v' + aktif.Versi + '. Perbaiki item, lalu ajukan ke Finance — v' + aktif.Versi + ' tetap berlaku sampai disetujui.');
  };
  A['budget.simpanItem'] = function (tx, d) {
    var h = tx.get('Budget_Header', d.ID_Budget); if (!h) throw salah('Budget tidak ditemukan.');
    if (['Draft', 'Ditolak'].indexOf(h.Status) < 0) throw salah('Budget versi ' + h.Versi + ' berstatus ' + h.Status + ' sehingga terkunci. Buat revisi baru.');
    var lama = tx.where('Budget_Item', function (i) { return i.ID_Budget === h.ID_Budget; }), dipakai = {};
    (d.items || []).forEach(function (it, idx) {
      if (!str(it.Uraian)) return;
      var qty = num(it.Qty), harga = num(it.Harga_Satuan);
      if (qty < 0 || harga < 0) throw salah('Qty dan harga tidak boleh negatif (' + it.Uraian + ').');
      var row = { ID_Budget: h.ID_Budget, Kategori: str(it.Kategori) || 'Lain-lain', Uraian: str(it.Uraian), Keterangan: str(it.Keterangan), Qty: qty, Satuan: str(it.Satuan) || 'Unit', Harga_Satuan: harga, Subtotal: Math.round(qty * harga), Urutan: idx + 1 };
      if (it.ID_Item && tx.get('Budget_Item', it.ID_Item) && tx.get('Budget_Item', it.ID_Item).ID_Budget === h.ID_Budget) { tx.update('Budget_Item', it.ID_Item, row); dipakai[it.ID_Item] = 1; }
      else { var r = tx.insert('Budget_Item', row); dipakai[r.ID_Item] = 1; }
    });
    lama.forEach(function (i) { if (!dipakai[i.ID_Item]) tx.remove('Budget_Item', i.ID_Item); });
    var tot = hitungTotalBudget(tx, h.ID_Budget);
    if (h.Status === 'Ditolak') tx.update('Budget_Header', h.ID_Budget, { Status: 'Draft' });
    tx.log('Simpan item budget v' + h.Versi, 'Budgeting & RAB', h.ID_Budget, Object.keys(dipakai).length + ' item · ' + rp(tot));
    return ok(tx.get('Budget_Header', h.ID_Budget), 'Item budget tersimpan. Total ' + rp(tot) + '.');
  };
  A['budget.ajukan'] = function (tx, d) {
    var h = tx.get('Budget_Header', d.ID_Budget); if (!h) throw salah('Budget tidak ditemukan.');
    if (h.Status !== 'Draft' && h.Status !== 'Ditolak') throw salah('Hanya draft yang bisa diajukan.');
    if (!tx.where('Budget_Item', function (i) { return i.ID_Budget === h.ID_Budget; }).length) throw salah('Budget masih kosong.');
    tx.update('Budget_Header', h.ID_Budget, { Status: 'Menunggu' });
    var t = tx.get('Trip', h.ID_Trip) || {};
    penerimaTim(tx, 'Finance').forEach(function (p) { notif(tx, 'TIM_BUDGET_MENUNGGU', p, varsDasar(tx, { trip: t.Nama, versi: h.Versi, total: rp(h.Total), oleh: tx.user.nama, alasan: h.Alasan_Revisi }), h.ID_Budget); });
    tx.log('Ajukan budget v' + h.Versi, 'Budgeting & RAB', t.Kode, rp(h.Total));
    return ok(tx.get('Budget_Header', h.ID_Budget), 'Budget v' + h.Versi + ' diajukan ke Finance.');
  };
  A['budget.setujui'] = function (tx, d) {
    var h = tx.get('Budget_Header', d.ID_Budget); if (!h) throw salah('Budget tidak ditemukan.');
    if (h.Status !== 'Menunggu') throw salah('Hanya budget berstatus Menunggu yang bisa disetujui.');
    var lama = tx.where('Budget_Header', function (x) { return x.ID_Trip === h.ID_Trip && x.Status === 'Aktif'; })[0];
    var t = tx.get('Trip', h.ID_Trip) || {}, now = tx.now();
    // Catat perbedaan item terhadap versi aktif sebelumnya
    var baru = tx.where('Budget_Item', function (i) { return i.ID_Budget === h.ID_Budget; });
    var sebelum = lama ? tx.where('Budget_Item', function (i) { return i.ID_Budget === lama.ID_Budget; }) : [];
    var mb = {}; sebelum.forEach(function (i) { mb[kunciItem(i)] = i; });
    var jml = 0;
    function fmt(i) { return i ? (i.Qty + ' ' + i.Satuan + ' × ' + rp(i.Harga_Satuan) + ' = ' + rp(i.Subtotal)) : '—'; }
    baru.forEach(function (i) { var o = mb[kunciItem(i)]; delete mb[kunciItem(i)]; if (!o || num(o.Subtotal) !== num(i.Subtotal) || num(o.Qty) !== num(i.Qty) || num(o.Harga_Satuan) !== num(i.Harga_Satuan)) { jml++; tx.insert('Log_Revisi_Budget', { ID_Budget: h.ID_Budget, ID_Trip: h.ID_Trip, Siapa: h.Dibuat_Oleh, Kapan: now, Item: i.Kategori + ' — ' + i.Uraian, Nilai_Lama: fmt(o), Nilai_Baru: fmt(i), Alasan: h.Alasan_Revisi }); } });
    Object.keys(mb).forEach(function (k) { jml++; var o = mb[k]; tx.insert('Log_Revisi_Budget', { ID_Budget: h.ID_Budget, ID_Trip: h.ID_Trip, Siapa: h.Dibuat_Oleh, Kapan: now, Item: o.Kategori + ' — ' + o.Uraian, Nilai_Lama: fmt(o), Nilai_Baru: 'Dihapus', Alasan: h.Alasan_Revisi }); });
    tx.insert('Log_Revisi_Budget', { ID_Budget: h.ID_Budget, ID_Trip: h.ID_Trip, Siapa: tx.user.nama, Kapan: now, Item: 'TOTAL BUDGET (v' + h.Versi + ' disetujui)', Nilai_Lama: lama ? rp(lama.Total) + ' (v' + lama.Versi + ')' : '—', Nilai_Baru: rp(h.Total), Alasan: str(d.catatan) || h.Alasan_Revisi });
    if (lama) tx.update('Budget_Header', lama.ID_Budget, { Status: 'Digantikan' });
    tx.update('Budget_Header', h.ID_Budget, { Status: 'Aktif', Disetujui_Oleh: tx.user.nama, Tgl_Disetujui: now, Catatan_Keputusan: str(d.catatan) });
    recalcRekap(tx, h.ID_Trip);
    var pembuat = tx.where('Pengguna', function (u) { return u.Nama === h.Dibuat_Oleh; })[0];
    if (pembuat) notif(tx, 'TIM_BUDGET_DIPUTUSKAN', { nama: pembuat.Nama, hp: pembuat.No_WA, email: pembuat.Email }, varsDasar(tx, { trip: t.Nama, versi: h.Versi, keputusan: 'DISETUJUI', oleh: tx.user.nama, catatan: str(d.catatan) }), h.ID_Budget);
    tx.log('Setujui & aktifkan budget v' + h.Versi, 'Budgeting & RAB', t.Kode, rp(h.Total) + ' · ' + jml + ' perubahan item');
    return ok(tx.get('Budget_Header', h.ID_Budget), 'Budget v' + h.Versi + ' aktif. Rekap & laba rugi dihitung ulang otomatis.');
  };
  A['budget.tolak'] = function (tx, d) {
    var h = tx.get('Budget_Header', d.ID_Budget); if (!h) throw salah('Budget tidak ditemukan.');
    if (h.Status !== 'Menunggu') throw salah('Hanya budget berstatus Menunggu yang bisa ditolak.');
    if (!str(d.catatan)) throw salah('Alasan penolakan wajib diisi.');
    tx.update('Budget_Header', h.ID_Budget, { Status: 'Ditolak', Catatan_Keputusan: str(d.catatan), Disetujui_Oleh: tx.user.nama, Tgl_Disetujui: tx.now() });
    var t = tx.get('Trip', h.ID_Trip) || {}, pembuat = tx.where('Pengguna', function (u) { return u.Nama === h.Dibuat_Oleh; })[0];
    if (pembuat) notif(tx, 'TIM_BUDGET_DIPUTUSKAN', { nama: pembuat.Nama, hp: pembuat.No_WA, email: pembuat.Email }, varsDasar(tx, { trip: t.Nama, versi: h.Versi, keputusan: 'DITOLAK', oleh: tx.user.nama, catatan: str(d.catatan) }), h.ID_Budget);
    tx.log('Tolak budget v' + h.Versi, 'Budgeting & RAB', t.Kode, str(d.catatan));
    return ok(tx.get('Budget_Header', h.ID_Budget), 'Budget dikembalikan ke Admin untuk diperbaiki.');
  };
  A['budget.hapusDraft'] = function (tx, d) {
    var h = tx.get('Budget_Header', d.ID_Budget); if (!h) throw salah('Budget tidak ditemukan.');
    if (['Draft', 'Ditolak'].indexOf(h.Status) < 0) throw salah('Hanya draft yang bisa dihapus.');
    tx.where('Budget_Item', function (i) { return i.ID_Budget === h.ID_Budget; }).forEach(function (i) { tx.remove('Budget_Item', i.ID_Item); });
    tx.remove('Budget_Header', h.ID_Budget); tx.log('Hapus draft budget v' + h.Versi, 'Budgeting & RAB', h.ID_Trip, '');
    return ok({ id: h.ID_Budget }, 'Draft dihapus.');
  };
  A['kategori.simpan'] = function (tx, d) {
    var nama = str(d.Nama); if (!nama) throw salah('Nama kategori wajib diisi.');
    if (tx.where('Kategori_Biaya', function (k) { return k.Nama.toLowerCase() === nama.toLowerCase() && k.ID_Kategori !== d.ID_Kategori; }).length) throw salah('Kategori sudah ada.');
    var row = { Nama: nama, Ikon: str(d.Ikon) || 'circle-dollar-sign', Urutan: num(d.Urutan) || tx.all('Kategori_Biaya').length + 1, Aktif: d.Aktif === 'TIDAK' ? 'TIDAK' : 'YA' };
    var r = d.ID_Kategori && tx.get('Kategori_Biaya', d.ID_Kategori) ? tx.update('Kategori_Biaya', d.ID_Kategori, row) : tx.insert('Kategori_Biaya', row);
    tx.log('Simpan kategori biaya', 'Sistem', r.ID_Kategori, nama); return ok(r, 'Kategori tersimpan.');
  };
  A['kategori.hapus'] = function (tx, d) {
    var k = tx.get('Kategori_Biaya', d.id); if (!k) throw salah('Kategori tidak ditemukan.');
    var dipakai = tx.where('Budget_Item', function (i) { return i.Kategori === k.Nama; }).length + tx.where('Realisasi_Biaya', function (i) { return i.Kategori === k.Nama; }).length;
    if (dipakai) { tx.update('Kategori_Biaya', d.id, { Aktif: 'TIDAK' }); return ok(k, 'Kategori dipakai ' + dipakai + ' item, jadi hanya dinonaktifkan.'); }
    tx.remove('Kategori_Biaya', d.id); tx.log('Hapus kategori biaya', 'Sistem', d.id, k.Nama); return ok({ id: d.id }, 'Kategori dihapus.');
  };

  // ---------- Realisasi anggaran: Admin mencatat & melapor → Finance mengaudit → Final masuk laba rugi ----------
  function konteksRls(tx, idTrip) {
    var t = tx.get('Trip', idTrip); if (!t) throw salah('Trip tidak ditemukan.');
    var ix = indeks(tx.D), r = rekapTrip(tx.D, ix, t, tx.today());
    return { t: t, ix: ix, r: r };
  }
  function catatRiwayatRls(tx, k, item, lama, baru, alasan) {
    tx.insert('Log_Revisi_Budget', { ID_Budget: k.r.budgetId, ID_Trip: k.t.ID_Trip, Siapa: tx.user.nama, Kapan: tx.now(), Item: 'REALISASI — ' + item, Nilai_Lama: lama, Nilai_Baru: baru, Alasan: str(alasan) });
  }
  function pastikanBisaEdit(k) {
    if (!k.r.budgetAktif) throw salah('RAB trip ini belum disetujui Finance. Realisasi dicatat setelah RAB aktif.');
    if (!k.r.bisaEdit) throw salah('Laporan realisasi berstatus "' + k.r.statusAudit + '" sehingga terkunci.' + (k.r.statusAudit === RLS.FINAL ? ' Minta Finance membuka kembali bila ada koreksi.' : ' Tunggu hasil audit Finance.'));
  }
  A['realisasi.simpan'] = function (tx, d) {
    var k = konteksRls(tx, d.ID_Trip); pastikanBisaEdit(k);
    var nominal = bulat(d.Nominal); if (nominal <= 0) throw salah('Nominal realisasi harus lebih dari 0.');
    if (!str(d.Uraian)) throw salah('Uraian wajib diisi.');
    var row = { ID_Trip: k.t.ID_Trip, Kategori: str(d.Kategori) || 'Lain-lain', Uraian: str(d.Uraian), Nominal: nominal, Tanggal: tgl(d.Tanggal) || tx.today(), Link_Bukti: str(d.Link_Bukti), Status: 'Tercatat', Diinput_Oleh: tx.user.nama, Catatan: str(d.Catatan), Catatan_Verifikasi: '', Diverifikasi_Oleh: '' };
    var lama = d.ID_Realisasi ? tx.get('Realisasi_Biaya', d.ID_Realisasi) : null;
    if (lama && lama.ID_Trip !== k.t.ID_Trip) throw salah('Nota bukan milik trip ini.');
    if (lama && !row.Link_Bukti) row.Link_Bukti = lama.Link_Bukti;
    var r = lama ? tx.update('Realisasi_Biaya', lama.ID_Realisasi, row) : tx.insert('Realisasi_Biaya', Object.assign(row, { Dibuat: tx.now() }));
    var rk = recalcRekap(tx, k.t.ID_Trip), k2 = konteksRls(tx, k.t.ID_Trip);
    tx.log(lama ? 'Ubah nota realisasi' : 'Catat nota realisasi', 'Budgeting & RAB', k.t.Kode, row.Kategori + ' · ' + rp(nominal));
    return ok(r, 'Nota realisasi tersimpan. Total realisasi ' + rp(k2.r.realisasi) + (k2.r.overBudget ? ' — MELEBIHI RAB ' + rp(k2.r.lebih) + '.' : ' dari RAB ' + rp(k2.r.budget) + '.'));
  };
  A['realisasi.hapus'] = function (tx, d) {
    var x = tx.get('Realisasi_Biaya', d.id); if (!x) throw salah('Data tidak ditemukan.');
    var k = konteksRls(tx, x.ID_Trip); pastikanBisaEdit(k);
    tx.remove('Realisasi_Biaya', d.id); recalcRekap(tx, x.ID_Trip); tx.log('Hapus nota realisasi', 'Budgeting & RAB', k.t.Kode, x.Uraian + ' ' + rp(x.Nominal));
    return ok({ id: d.id }, 'Nota realisasi dihapus.');
  };
  /** Admin melaporkan realisasi ke Finance (setelah trip selesai). Melebihi RAB → penjelasan wajib. */
  A['realisasi.lapor'] = function (tx, d) {
    var k = konteksRls(tx, d.ID_Trip), r = k.r; pastikanBisaEdit(k);
    if (!r.adaRealisasi) throw salah('Belum ada nota realisasi untuk dilaporkan.');
    if (!r.tripSelesai) throw salah('Realisasi dilaporkan setelah trip selesai (' + tglId(k.t.Tgl_Pulang) + ').');
    if (r.overBudget && str(d.penjelasan).length < 10) throw salah('Realisasi melebihi RAB ' + rp(r.lebih) + '. Tulis penjelasan kelebihan biaya (min. 10 karakter).');
    var lamaSt = r.statusAudit;
    recalcRekap(tx, k.t.ID_Trip);
    tx.update('Rekap_Operasional', k.t.ID_Trip, { Status_Audit: RLS.DIAJUKAN, Tgl_Lapor: tx.now(), Dilapor_Oleh: tx.user.nama, Penjelasan_Lapor: str(d.penjelasan) });
    catatRiwayatRls(tx, k, lamaSt === RLS.DRAFT ? 'Dilaporkan ke Finance' : 'Dilaporkan ulang ke Finance', 'RAB v' + r.versiBudget + ' ' + rp(r.budget), 'Realisasi ' + rp(r.realisasi) + (r.overBudget ? ' · MELEBIHI RAB ' + rp(r.lebih) + ' (' + r.lebihPersen + '%)' : ' · hemat ' + rp(r.budget - r.realisasi)), d.penjelasan);
    penerimaTim(tx, 'Finance').forEach(function (p) { notif(tx, 'TIM_REALISASI_DIAJUKAN', p, varsDasar(tx, { trip: k.t.Nama, oleh: tx.user.nama, rab: rp(r.budget), realisasi: rp(r.realisasi), lebih: r.overBudget ? ' ⚠️ melebihi RAB ' + rp(r.lebih) : '', penjelasan: str(d.penjelasan) ? 'Penjelasan: ' + str(d.penjelasan) : '' }), k.t.ID_Trip); });
    tx.log('Lapor realisasi ke Finance', 'Budgeting & RAB', k.t.Kode, rp(r.realisasi) + (r.overBudget ? ' · melebihi RAB ' + rp(r.lebih) : ''));
    return ok(tx.get('Rekap_Operasional', k.t.ID_Trip), 'Laporan realisasi dikirim ke Finance untuk diaudit.');
  };
  /** Finance memutuskan: setujui (Final → masuk laba rugi) · perbaikan (kembali ke Admin) · tolak. Nota tertentu bisa ditolak. */
  A['realisasi.verifikasi'] = function (tx, d) {
    var k = konteksRls(tx, d.ID_Trip), r = k.r, kep = ['setujui', 'perbaikan', 'tolak'].indexOf(d.keputusan) > -1 ? d.keputusan : '';
    if (!kep) throw salah('Pilih keputusan audit.');
    if (r.statusAudit !== RLS.DIAJUKAN) throw salah('Hanya laporan berstatus Diajukan yang bisa diaudit (sekarang: ' + r.statusAudit + ').');
    if (kep !== 'setujui' && str(d.catatan).length < 5) throw salah('Tulis catatan untuk Admin (apa yang harus diperbaiki).');
    var tolakItem = d.item || {}, nTolak = 0;
    Object.keys(tolakItem).forEach(function (id) {
      var x = tx.get('Realisasi_Biaya', id); if (!x || x.ID_Trip !== k.t.ID_Trip) return;
      tx.update('Realisasi_Biaya', id, { Status: 'Ditolak', Catatan_Verifikasi: str(tolakItem[id]) || 'Ditolak saat audit', Diverifikasi_Oleh: tx.user.nama }); nTolak++;
    });
    var aktifItem = tx.where('Realisasi_Biaya', function (x) { return x.ID_Trip === k.t.ID_Trip && x.Status !== 'Ditolak'; });
    var status = kep === 'setujui' ? RLS.FINAL : kep === 'perbaikan' ? RLS.PERBAIKAN : RLS.DITOLAK, patch = { Diverifikasi_Oleh: tx.user.nama, Tgl_Verifikasi: tx.now(), Catatan_Audit: str(d.catatan) };
    if (kep === 'setujui') {
      if (!aktifItem.length) throw salah('Semua nota ditolak — gunakan "Minta perbaikan".');
      aktifItem.forEach(function (x) { tx.update('Realisasi_Biaya', x.ID_Realisasi, { Status: 'Disetujui', Diverifikasi_Oleh: tx.user.nama }); });
    }
    recalcRekap(tx, k.t.ID_Trip);
    var k2 = konteksRls(tx, k.t.ID_Trip), r2 = k2.r;
    patch.Status_Audit = status;
    if (status === RLS.FINAL) { patch.Biaya_Final = r2.realisasi; patch.Laba_Final = r2.pendapatan - r2.realisasi; patch.Tgl_Final = tx.now(); }
    tx.update('Rekap_Operasional', k.t.ID_Trip, patch);
    var label = { setujui: 'DISETUJUI (final)', perbaikan: 'PERLU PERBAIKAN', tolak: 'DITOLAK' }[kep];
    catatRiwayatRls(tx, k, 'Audit Finance: ' + label, 'Realisasi dilaporkan ' + rp(r.realisasi), 'Diakui ' + rp(r2.realisasi) + (nTolak ? ' · ' + nTolak + ' nota ditolak' : '') + (status === RLS.FINAL ? ' · laba final ' + rp(r2.pendapatan - r2.realisasi) : ''), d.catatan);
    var pelapor = tx.where('Pengguna', function (u) { return u.Nama === (r.dilaporOleh || ''); })[0];
    (pelapor ? [{ nama: pelapor.Nama, hp: pelapor.No_WA, email: pelapor.Email }] : penerimaTim(tx, 'Admin')).forEach(function (p) { notif(tx, 'TIM_REALISASI_DIPUTUSKAN', p, varsDasar(tx, { trip: k.t.Nama, keputusan: label, oleh: tx.user.nama, catatan: str(d.catatan) }), k.t.ID_Trip); });
    tx.log('Audit realisasi: ' + label, 'Budgeting & RAB', k.t.Kode, rp(r2.realisasi) + (nTolak ? ' · ' + nTolak + ' nota ditolak' : '') + (str(d.catatan) ? ' · ' + str(d.catatan) : ''));
    return ok(tx.get('Rekap_Operasional', k.t.ID_Trip), status === RLS.FINAL ? 'Realisasi disetujui & final. Angka masuk laporan laba rugi.' : 'Laporan dikembalikan ke Admin (' + status + ').');
  };
  /** Finance membuka kembali laporan final untuk koreksi (keluar dari laba rugi sampai disetujui lagi). */
  A['realisasi.bukaKembali'] = function (tx, d) {
    var k = konteksRls(tx, d.ID_Trip);
    if (k.r.statusAudit !== RLS.FINAL) throw salah('Hanya laporan final yang bisa dibuka kembali.');
    if (str(d.catatan).length < 5) throw salah('Tulis alasan koreksi.');
    tx.update('Rekap_Operasional', k.t.ID_Trip, { Status_Audit: RLS.PERBAIKAN, Catatan_Audit: str(d.catatan), Diverifikasi_Oleh: tx.user.nama, Tgl_Verifikasi: tx.now() });
    catatRiwayatRls(tx, k, 'Dibuka kembali untuk koreksi', 'Final ' + rp(k.r.biaya), 'Perlu perbaikan', d.catatan);
    var pelapor = tx.where('Pengguna', function (u) { return u.Nama === (k.r.dilaporOleh || ''); })[0];
    (pelapor ? [{ nama: pelapor.Nama, hp: pelapor.No_WA, email: pelapor.Email }] : penerimaTim(tx, 'Admin')).forEach(function (p) { notif(tx, 'TIM_REALISASI_DIPUTUSKAN', p, varsDasar(tx, { trip: k.t.Nama, keputusan: 'DIBUKA KEMBALI untuk koreksi', oleh: tx.user.nama, catatan: str(d.catatan) }), k.t.ID_Trip); });
    tx.log('Buka kembali realisasi', 'Budgeting & RAB', k.t.Kode, str(d.catatan));
    return ok(tx.get('Rekap_Operasional', k.t.ID_Trip), 'Laporan dibuka kembali — keluar dari laba rugi sampai disetujui lagi.');
  };
  A['rekap.hitungUlang'] = function (tx) { var n = 0; tx.all('Trip').forEach(function (t) { recalcRekap(tx, t.ID_Trip); n++; }); return ok({ n: n }, n + ' trip dihitung ulang.'); };
  A['laporan.catat'] = function (tx, d) { tx.log('Unduh laporan ' + str(d.jenis), 'Finansial & Invoice', str(d.periode), str(d.format)); return ok(null, ''); };

  // ---------- Manifest ----------
  A['manifest.final'] = function (tx, d) {
    var m = tx.get('Manifest', d.ID_Manifest); if (!m) throw salah('Manifest tidak ditemukan.');
    if (m.Tipe === 'Per Trip') return A['manifest.trip'](tx, { ID_Trip: m.ID_Trip });
    var pj = tx.get('Penjualan', m.ID_Penjualan); if (!pj || pj.Status === 'Batal') throw salah('Penjualan tidak aktif.');
    var ang = tx.where('Anggota_Rombongan', function (a) { return a.ID_Penjualan === pj.ID_Penjualan && str(a.Nama); });
    if (ang.length < num(pj.Jumlah_Pax) && !d.paksa) throw salah('Data rombongan belum lengkap: ' + ang.length + '/' + pj.Jumlah_Pax + ' nama terisi.');
    tx.update('Manifest', m.ID_Manifest, { Status: 'Final', Tgl_Final: tx.now(), Diperbarui: tx.now() });
    var jp = tx.job('MANIFEST_PDF', m.ID_Manifest, {});
    var jc = jadwalkanEvent(tx, pj, []);
    tx.job('CAL_LAMPIRAN', m.ID_Manifest, {}, [jp, jc]);
    var c = tx.get('Customer', pj.ID_Customer) || {}, t = tx.get('Trip', pj.ID_Trip) || {};
    notif(tx, 'MANIFEST_FINAL', penerimaCustomer(c), varsDasar(tx, { trip: t.Nama, pax: pj.Jumlah_Pax, meetingPoint: t.Meeting_Point || '-' }), m.ID_Manifest);
    tx.log('Manifest final v' + m.Versi, 'Manifest & Customer', m.ID_Manifest, c.Nama + ' · ' + t.Nama);
    return ok(tx.get('Manifest', m.ID_Manifest), 'Manifest final. PDF dibuat & dilampirkan ke event Calendar ' + c.Nama + '.');
  };
  A['manifest.revisi'] = function (tx, d) {
    var m = tx.get('Manifest', d.ID_Manifest); if (!m) throw salah('Manifest tidak ditemukan.');
    if (m.Status !== 'Final') return ok(m, 'Manifest masih draft.');
    tx.update('Manifest', m.ID_Manifest, { Status: 'Draft', Versi: num(m.Versi) + 1, Diperbarui: tx.now() });
    tx.log('Buka revisi manifest v' + (num(m.Versi) + 1), 'Manifest & Customer', m.ID_Manifest, '');
    return ok(tx.get('Manifest', m.ID_Manifest), 'Revisi dibuka. Saat ditandai Final lagi, lampiran lama di Calendar akan diganti.');
  };
  A['manifest.buat'] = function (tx, d) {
    var pj = tx.get('Penjualan', d.ID_Penjualan); if (!pj) throw salah('Penjualan tidak ditemukan.');
    pastikanAnggotaUtama(tx, pj); var m = pastikanManifest(tx, pj);
    return ok(m, 'Draft manifest siap.');
  };
  A['manifest.trip'] = function (tx, d) {
    var t = tx.get('Trip', d.ID_Trip); if (!t) throw salah('Trip tidak ditemukan.');
    var m = tx.where('Manifest', function (x) { return x.Tipe === 'Per Trip' && x.ID_Trip === t.ID_Trip; })[0];
    if (m) m = tx.update('Manifest', m.ID_Manifest, { Status: 'Final', Versi: num(m.Versi) + (m.Status === 'Final' ? 1 : 0), Tgl_Final: tx.now(), Diperbarui: tx.now() });
    else m = tx.insert('Manifest', { Tipe: 'Per Trip', ID_Trip: t.ID_Trip, Status: 'Final', Versi: 1, Tgl_Final: tx.now(), Dibuat_Oleh: tx.user.nama, Diperbarui: tx.now() });
    tx.job('MANIFEST_PDF', m.ID_Manifest, { excel: true });
    tx.log('Generate manifest per trip', 'Manifest & Customer', t.Kode, t.Nama);
    return ok(m, 'Manifest gabungan ' + t.Nama + ' sedang dibuat (PDF & Excel).');
  };

  // ---------- Pengaturan & Pengguna ----------
  A['pengaturan.simpan'] = function (tx, d) {
    var kv = d.kv || {}, n = 0, ubah = [];
    Object.keys(kv).forEach(function (k) {
      if (PENGATURAN_BOLEH.indexOf(k) < 0) return;
      var v = String(kv[k] == null ? '' : kv[k]);
      if (k === 'PALET') {
        var p = parseJson(v, null); if (!p) throw salah('Format palet tidak valid.');
        if (p.preset === 'kustom') { var cek = cekPalet(paletAktif({ PALET: v })); if (!cek.lulus) throw salah('Kontras warna terlalu rendah: ' + cek.masalah.join('; ')); }
      }
      if ((k === 'LOGO_URL' || k === 'FAVICON_URL' || k === 'TTD_URL') && v && !/^(https:\/\/|data:image\/|assets\/)/.test(v)) throw salah(k + ' harus berupa URL https.');
      if (tx.S()[k] !== v) { tx.setS(k, v); n++; ubah.push(k); }
    });
    if (n) tx.log('Ubah pengaturan', 'Sistem', 'Pengaturan', ubah.join(', '));
    return ok({ S: tx.S(), diubah: ubah }, n ? n + ' pengaturan tersimpan & langsung berlaku.' : 'Tidak ada perubahan.');
  };
  A['pengaturan.default'] = function (tx, d) {
    var grup = d.grup === 'gambar' ? ['LOGO_URL', 'FAVICON_URL'] : d.grup === 'tampilan' ? ['PALET', 'FONT_BODY', 'FONT_HEAD'] : [];
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
  // 8. NOTIFIKASI (antrean) & CRM
  // ==========================================================================
  function varsDasar(tx, v) { var S = tx.S(); return Object.assign({ perusahaan: S.PT_NAMA, app: S.APP_NAMA, link: S.APP_URL, rekening: S.BANK_NAMA + ' ' + S.BANK_NOREK + ' a.n ' + S.BANK_AN }, v || {}); }
  function penerimaCustomer(c) { return { nama: c.Nama, hp: c.No_WA, email: c.Email, demo: /\bDEMO\b/i.test(c.Tag || ''), id: c.ID_Customer }; }
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
      if (paksa) { m = Object.assign({}, m, { wa: !!paksa.wa && tx.H.waSiap(), email: !!paksa.email }); waOn = true; emOn = true; }
      if (!waOn && !emOn) return 0;
      if (p.demo && S.NOTIF_KIRIM_DEMO !== 'YA') return 0;
      if (!m.wa && !m.email) return 0;
      var v = Object.assign({ nama: p.nama || 'Bapak/Ibu' }, vars || {}), n = 0, now = tx.now();
      var kontak = p.hp ? tx.where('CRM_Kontak', function (k) { return k.NoWA === hp08(p.hp); })[0] : null;
      if (kontak && kontak.StatusWA === 'Tidak Terdaftar') kontak = { skipWA: true };
      if (waOn && m.wa && hpValid(p.hp) && !(kontak && kontak.skipWA)) { var r = barisAntrian('WA', hp62(p.hp), p.nama, '', isiTemplate(m.pesan, v), event, refId, '', ''); r.DibuatPada = now; tx.insert('AntrianNotif', r); n++; }
      if (emOn && m.email && emailValid(p.email)) { var e = barisAntrian('EMAIL', str(p.email), p.nama, isiTemplate(m.subjek, v), isiTemplate(m.pesan, v), event, refId, '', lampiran); e.DibuatPada = now; tx.insert('AntrianNotif', e); n++; }
      tx.nq += n; return n;
    } catch (e) { return 0; }
  }

  /** Fase 1 prosesor antrean: klaim baris (status → Proses). Host mengirim di luar lock. */
  function klaimNotif(tx, opsi) {
    opsi = opsi || {}; var rows = tx.all('AntrianNotif'), wa = [], em = [], perBlast = {}, S = tx.S();
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
    // Statistik blast
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

  function crmUpsertSatu(tx, sumber, r) {
    var refId = sumber === 'customer' ? r.ID_Customer : r.ID_Pengguna;
    var info = sumber === 'customer' ? { Kota: r.Kota, Status: r.Status } : { Peran: r.Peran, Status: r.Status };
    var data = { Nama: r.Nama, Email: str(r.Email).toLowerCase(), NoWA: hp08(r.No_WA), Segmen: sumber === 'customer' ? 'Customer' : 'Tim ' + r.Peran, Sumber: sumber, RefID: refId, EmailValid: r.Email ? (emailValid(r.Email) ? 'YA' : 'TIDAK') : '', Info: JSON.stringify(info), DiperbaruiPada: tx.now() };
    if (sumber === 'customer') data.Tag = r.Tag || '';
    var ada = tx.where('CRM_Kontak', function (k) { return k.Sumber === sumber && k.RefID === refId; })[0];
    if (ada) { if (hp08(ada.NoWA) !== data.NoWA) { data.StatusWA = ''; data.CekWAAt = ''; } return tx.update('CRM_Kontak', ada.KontakID, data); }
    return tx.insert('CRM_Kontak', Object.assign({ StatusWA: '', CekWAAt: '', OptOut: 'TIDAK', Catatan: '', JumlahPesan: 0, TerakhirDihubungi: '', DibuatPada: tx.now(), Tag: '' }, data));
  }
  A['crm.sync'] = function (tx) {
    var n0 = tx.all('CRM_Kontak').length;
    tx.all('Customer').forEach(function (c) { crmUpsertSatu(tx, 'customer', c); });
    tx.all('Pengguna').forEach(function (u) { crmUpsertSatu(tx, 'tim', u); });
    var n1 = tx.all('CRM_Kontak').length; tx.setS('CRM_SYNC_TERAKHIR', tx.now());
    return ok({ ditambah: n1 - n0, total: n1 }, 'Sinkron CRM selesai: ' + (n1 - n0) + ' kontak baru, total ' + n1 + '.');
  };
  A['crm.simpan'] = function (tx, d) {
    var k = tx.get('CRM_Kontak', d.KontakID); if (!k) throw salah('Kontak tidak ditemukan.');
    var p = {}; ['Tag', 'Catatan', 'OptOut'].forEach(function (f) { if (d[f] !== undefined) p[f] = str(d[f]); });
    var r = tx.update('CRM_Kontak', k.KontakID, p);
    if (k.Sumber === 'customer' && d.Tag !== undefined) { var c = tx.get('Customer', k.RefID); if (c) tx.update('Customer', c.ID_Customer, { Tag: str(d.Tag) }); }
    tx.log('Ubah kontak CRM', 'Manifest & Customer', k.KontakID, k.Nama);
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
    tx.log('Aksi massal CRM: ' + aksi, 'Manifest & Customer', n + ' kontak', str(d.nilai));
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
  A['wa.audiens'] = function (tx, d) {
    var ix = indeks(tx.D), kk = tx.all('CRM_Kontak'), tripCust = null;
    if (d.idTrip) { tripCust = {}; (ix.pjPerTrip[d.idTrip] || []).forEach(function (p) { if (p.Status !== 'Batal') tripCust[p.ID_Customer] = p; }); }
    var seen = {}, rows = [];
    kk.forEach(function (k) {
      if (d.segmen && k.Segmen !== d.segmen) return;
      if (d.tag && str(k.Tag).toLowerCase().indexOf(str(d.tag).toLowerCase()) < 0) return;
      if (tripCust && !(k.Sumber === 'customer' && tripCust[k.RefID])) return;
      if (d.statusWA === 'terdaftar' && k.StatusWA !== 'Terdaftar') return;
      var hp = hp08(k.NoWA), valid = hpValid(hp), ganda = valid && seen[hp]; if (valid) seen[hp] = 1;
      var c = k.Sumber === 'customer' ? ix.cust[k.RefID] : null; var pj = tripCust && c ? tripCust[c.ID_Customer] : null;
      rows.push({ id: k.KontakID, nama: k.Nama, hp: hp, statusWA: k.StatusWA, optOut: k.OptOut === 'YA', valid: valid, ganda: !!ganda, demo: /\bDEMO\b/i.test(k.Tag || ''),
        vars: { nama: k.Nama, trip: pj ? (ix.trip[pj.ID_Trip] || {}).Nama : '', sisa: pj ? rp(Math.max(0, num(pj.Total) - terbayarPj(ix, pj.ID_Penjualan))) : '' } });
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
    if (!list.length) throw salah('Tidak ada penerima valid (nomor tidak valid, ganda, opt-out, atau kontak contoh DEMO).');
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

  /** Pengingat harian (dipanggil trigger harian). Tidak mengirim ganda di hari yang sama. */
  function pengingatHarian(tx) {
    var today = tx.today(), S = tx.S(), ix = indeks(tx.D), n = 0;
    var sudah = {}; tx.all('AntrianNotif').forEach(function (r) { if (r.RefID) sudah[r.Event + '|' + r.RefID] = 1; });
    tx.all('Invoice').forEach(function (i) {
      if (i.Status !== 'Terbit' || !i.Jatuh_Tempo) return; var h = selisihHari(today, i.Jatuh_Tempo);
      if (h !== 1 && h !== -1) return; var ref = i.No_Invoice + '@' + today; if (sudah['PENGINGAT_JATUH_TEMPO|' + ref]) return;
      var pj = ix.pj[i.ID_Penjualan] || {}, c = ix.cust[pj.ID_Customer]; if (!c) return; var t = ix.trip[pj.ID_Trip] || {};
      n += notif(tx, 'PENGINGAT_JATUH_TEMPO', penerimaCustomer(c), varsDasar(tx, { noInvoice: i.No_Invoice, nominal: rp(i.Nominal), jatuhTempo: tglPanjang(i.Jatuh_Tempo), trip: t.Nama }), ref);
    });
    tx.all('Trip').forEach(function (t) {
      if (t.Status === 'Batal' || selisihHari(today, t.Tgl_Berangkat) !== 3) return;
      (ix.pjPerTrip[t.ID_Trip] || []).forEach(function (p) {
        if (p.Status === 'Batal') return; var ref = p.ID_Penjualan + '@' + today; if (sudah['PENGINGAT_BERANGKAT|' + ref]) return;
        var c = ix.cust[p.ID_Customer]; if (c) n += notif(tx, 'PENGINGAT_BERANGKAT', penerimaCustomer(c), varsDasar(tx, { trip: t.Nama, tglTrip: rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang), meetingPoint: t.Meeting_Point || '-' }), ref);
      });
    });
    return n;
  }

  // ==========================================================================
  // 9. ANTREAN TUGAS (PDF / Calendar / kirim) — klaim → host kerjakan → selesaikan
  // ==========================================================================
  /** Klaim tugas yang siap (prasyarat selesai). Tugas INVOICE_KIRIM dikerjakan langsung di sini (hanya mengisi antrean notifikasi). */
  function klaimTugas(tx, maks) {
    var rows = tx.all('Antrean_Tugas'), byId = peta(rows, 'ID_Tugas'), out = [];
    rows.forEach(function (r) {
      if (r.Status !== 'Antri' || out.length >= (maks || 6)) return;
      var p = parseJson(r.Payload, {}), deps = p.setelah || [], siap = true, gagal = false;
      deps.forEach(function (id) { var x = byId[id]; if (!x) return; if (x.Status === 'Gagal') gagal = true; else if (x.Status !== 'Selesai') siap = false; });
      if (gagal) { tx.update('Antrean_Tugas', r.ID_Tugas, { Status: 'Gagal', Hasil: 'Prasyarat gagal', Selesai: tx.now() }); tandaiProses(tx, r, 'gagal'); return; }
      if (!siap) return;
      if (r.Jenis === 'INVOICE_KIRIM') { kerjakanKirimInvoice(tx, r, p); return; }
      // Hindari dua CAL_UPSERT untuk penjualan yang sama dalam satu putaran (event tidak ganda)
      // …dan jangan klaim bila pekerja lain sedang memproses event penjualan yang sama
      if (r.Jenis === 'CAL_UPSERT' && (out.some(function (o) { return o.Jenis === 'CAL_UPSERT' && o.Ref === r.Ref; }) || rows.some(function (o) { return o.Jenis === 'CAL_UPSERT' && o.Ref === r.Ref && o.Status === 'Proses'; }))) return;
      tx.update('Antrean_Tugas', r.ID_Tugas, { Status: 'Proses', Percobaan: num(r.Percobaan) + 1 });
      out.push(konteksTugas(tx, tx.get('Antrean_Tugas', r.ID_Tugas)));
    });
    return out;
  }
  function kerjakanKirimInvoice(tx, r, p) {
    var data = dataInvoice(tx.D, r.Ref, tx.S()), n = 0;
    if (data && data.inv.Status !== 'Batal') {
      var S = tx.S(), inv = data.inv;
      var v = varsDasar(tx, { noInvoice: inv.No_Invoice, jenis: inv.Jenis, trip: data.trip.Nama, nominal: rp(inv.Nominal), jatuhTempo: tglPanjang(inv.Jatuh_Tempo), link: inv.Link_PDF || S.APP_URL || '-' });
      n = notif(tx, 'INVOICE_TERBIT', penerimaCustomer(data.cust), v, inv.No_Invoice, inv.File_ID, { wa: p.wa !== false, email: p.email !== false });
    }
    tx.update('Antrean_Tugas', r.ID_Tugas, { Status: 'Selesai', Percobaan: num(r.Percobaan) + 1, Hasil: n ? n + ' pesan masuk antrean kirim' : 'Tidak ada kanal aktif / kontak tidak valid', Selesai: tx.now() });
    tandaiProses(tx, r, n ? 'ok' : 'lewati');
  }
  function konteksTugas(tx, r) {
    var S = tx.S(), D = tx.D, k = { ID_Tugas: r.ID_Tugas, Jenis: r.Jenis, Ref: r.Ref, payload: parseJson(r.Payload, {}), S: S };
    if (r.Jenis === 'INVOICE_PDF' || r.Jenis === 'INVOICE_KIRIM') {
      k.data = dataInvoice(D, r.Ref, S); if (k.data) { k.trip = k.data.trip; k.cust = k.data.cust; k.inv = k.data.inv; k.pj = k.data.pj; }
      if (r.Jenis === 'INVOICE_KIRIM' && k.inv) { var m = matriksNotif(S).INVOICE_TERBIT; k.vars = varsDasar(tx, { nama: k.cust.Nama, noInvoice: k.inv.No_Invoice, jenis: k.inv.Jenis, trip: k.trip.Nama, nominal: rp(k.inv.Nominal), jatuhTempo: tglPanjang(k.inv.Jatuh_Tempo), link: k.inv.Link_PDF || S.APP_URL }); k.pesan = isiTemplate(m.pesan, k.vars); k.subjek = isiTemplate(m.subjek, k.vars); }
    } else if (r.Jenis === 'CAL_UPSERT' || r.Jenis === 'CAL_HAPUS') {
      var pj = tx.get('Penjualan', r.Ref); k.pj = pj; k.event = pj ? deskripsiEvent(D, r.Ref, S) : null; k.eventId = (pj && pj.ID_Event) || k.payload.eventId || '';
    } else if (r.Jenis === 'MANIFEST_PDF' || r.Jenis === 'CAL_LAMPIRAN') {
      var m2 = tx.get('Manifest', r.Ref); k.manifest = m2;
      if (m2) { k.data = dataManifest(D, m2.Tipe === 'Per Trip' ? { idTrip: m2.ID_Trip } : { idPenjualan: m2.ID_Penjualan, idTrip: m2.ID_Trip }, S); var pj2 = m2.ID_Penjualan ? tx.get('Penjualan', m2.ID_Penjualan) : null; k.eventId = pj2 ? pj2.ID_Event : ''; k.trip = tx.get('Trip', m2.ID_Trip); }
    } else if (r.Jenis === 'TRIP_FOLDER') { k.trip = tx.get('Trip', r.Ref); }
    return k;
  }
  function tandaiProses(tx, tugas, st) {
    var map = { INVOICE_PDF: 'pdf', INVOICE_KIRIM: 'kirim' };
    if (map[tugas.Jenis]) { var inv = tx.get('Invoice', tugas.Ref); if (inv) { var p = prosesInvoice(inv); p[map[tugas.Jenis]] = st; tx.update('Invoice', inv.No_Invoice, { Status_Proses: JSON.stringify(p) }); } }
    if (tugas.Jenis === 'CAL_UPSERT') tx.where('Invoice', function (i) { return i.ID_Penjualan === tugas.Ref && i.Status !== 'Batal'; }).forEach(function (inv) { var p = prosesInvoice(inv); if (p.cal !== 'ok' || st === 'ok') { p.cal = st; tx.update('Invoice', inv.No_Invoice, { Status_Proses: JSON.stringify(p) }); } });
  }
  /** hasil: {ok, pesan, data:{fileId, url, eventId, excelUrl, lampiranId}} */
  function selesaikanTugas(tx, idTugas, hasil) {
    var r = tx.get('Antrean_Tugas', idTugas); if (!r) return;
    var h = hasil || {}, d = h.data || {};
    if (!h.ok) {
      var final = num(r.Percobaan) >= 3;
      tx.update('Antrean_Tugas', idTugas, { Status: final ? 'Gagal' : 'Antri', Hasil: str(h.pesan).slice(0, 300), Selesai: final ? tx.now() : '' });
      if (final) tandaiProses(tx, r, 'gagal');
      return;
    }
    tx.update('Antrean_Tugas', idTugas, { Status: 'Selesai', Hasil: str(h.pesan || 'OK').slice(0, 300), Selesai: tx.now() });
    if (r.Jenis === 'INVOICE_PDF') { tx.update('Invoice', r.Ref, { Link_PDF: str(d.url), File_ID: str(d.fileId) }); tandaiProses(tx, r, 'ok'); }
    else if (r.Jenis === 'CAL_UPSERT') {
      var pj = tx.get('Penjualan', r.Ref);
      if (pj && d.eventId) { if (pj.ID_Event !== d.eventId) tx.update('Penjualan', pj.ID_Penjualan, { ID_Event: d.eventId }); tx.where('Invoice', function (i) { return i.ID_Penjualan === pj.ID_Penjualan; }).forEach(function (i) { tx.update('Invoice', i.No_Invoice, { ID_Event_Calendar: d.eventId }); }); }
      tandaiProses(tx, r, 'ok');
    } else if (r.Jenis === 'CAL_HAPUS') { var pj3 = tx.get('Penjualan', r.Ref); if (pj3) tx.update('Penjualan', pj3.ID_Penjualan, { ID_Event: '' }); }
    else if (r.Jenis === 'MANIFEST_PDF') { tx.update('Manifest', r.Ref, { Link_File: str(d.url), File_ID: str(d.fileId), Link_Excel: str(d.excelUrl) }); }
    else if (r.Jenis === 'CAL_LAMPIRAN') { tx.update('Manifest', r.Ref, { ID_Lampiran_Calendar: str(d.lampiranId || d.eventId) }); }
    else if (r.Jenis === 'TRIP_FOLDER') { tx.update('Trip', r.Ref, { Folder_ID: str(d.folderId) }); }
  }
  function tugasTertunda(D) { return D.Antrean_Tugas.filter(function (r) { return r.Status === 'Antri' || r.Status === 'Proses'; }).length; }

  // ==========================================================================
  // 10. ROUTES (RBAC dicek di server) & DISPATCH
  // ==========================================================================
  var ROUTES = {
    'customer.simpan': { roles: ADM }, 'customer.hapus': { roles: ADM }, 'customer.pulihkan': { roles: ADM },
    'trip.simpan': { roles: ADM }, 'trip.hapus': { roles: ADM },
    'penjualan.simpan': { roles: ADM }, 'penjualan.batal': { roles: ADM }, 'penjualan.review': { roles: ADM }, 'anggota.simpan': { roles: ADM },
    'pembayaran.simpan': { roles: ADM }, 'pembayaran.verifikasi': { roles: ADM }, 'pembayaran.hapus': { roles: ADM },
    'invoice.buat': { roles: ADM }, 'invoice.batal': { roles: ADM }, 'invoice.kirimUlang': { roles: ADM }, 'invoice.prosesUlang': { roles: ADM },
    'budget.buat': { roles: ADM }, 'budget.revisi': { roles: ADM }, 'budget.simpanItem': { roles: ADM }, 'budget.ajukan': { roles: ADM }, 'budget.hapusDraft': { roles: ADM },
    'budget.setujui': { roles: FIN }, 'budget.tolak': { roles: FIN },
    'kategori.simpan': { roles: ADM }, 'kategori.hapus': { roles: ADM },
    'realisasi.simpan': { roles: ADM }, 'realisasi.hapus': { roles: ADM }, 'realisasi.lapor': { roles: ADM }, 'realisasi.verifikasi': { roles: FIN }, 'realisasi.bukaKembali': { roles: FIN }, 'rekap.hitungUlang': { roles: SEMUA }, 'laporan.catat': { roles: SEMUA },
    'manifest.final': { roles: ADM }, 'manifest.revisi': { roles: ADM }, 'manifest.buat': { roles: ADM }, 'manifest.trip': { roles: ADM },
    'pengaturan.simpan': { roles: ADM }, 'pengaturan.default': { roles: ADM },
    'pengguna.simpan': { roles: ADM, pengelola: true }, 'pengguna.resetPin': { roles: ADM, pengelola: true },
    'pengguna.foto': { roles: SEMUA }, 'pengguna.gantiPin': { roles: SEMUA },
    'crm.sync': { roles: ADM }, 'crm.simpan': { roles: ADM }, 'crm.bulk': { roles: ADM }, 'crm.interaksi': { roles: ADM },
    'wa.simpanCek': { roles: ADM }, 'wa.audiens': { roles: ADM, baca: true }, 'wa.blastBuat': { roles: ADM }, 'wa.blastStop': { roles: ADM },
    'notif.ulangi': { roles: ADM }, 'notif.simpanKonfig': { roles: ADM }
  };
  Object.keys(ROUTES).forEach(function (k) { ROUTES[k].fn = A[k]; });

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
      if (t === 'Antrean_Tugas') rows = rows.filter(function (r) { return r.Status !== 'Selesai'; }).concat(rows.filter(function (r) { return r.Status === 'Selesai'; }).slice(-80));
      if (t === 'AntrianNotif') rows = admin ? rows.slice(-400) : [];
      if (t === 'CRM_Interaksi') rows = admin ? rows.slice(-400) : [];
      if ((t === 'CRM_Kontak' || t === 'BlastWA') && !admin) rows = [];
      out[t] = rows;
    });
    return out;
  }

  // ==========================================================================
  // 11. DATA DEMO (deterministik, relatif terhadap hari ini)
  // ==========================================================================
  function isiDemo(H, opsi) {
    opsi = opsi || {};
    var tx = new Tx(H, { nama: 'Sistem', peran: 'Admin', email: 'sistem', id: 'SYS' });
    var today = tx.today(), seed = 20261108;
    function acak() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    function pilih(a) { return a[Math.floor(acak() * a.length)]; }
    function hari(n) { return tambahHari(today, n); }
    function wkt(n, jam) { return hari(n) + 'T' + (jam || pad(8 + Math.floor(acak() * 10), 2) + ':' + pad(Math.floor(acak() * 60), 2) + ':' + pad(Math.floor(acak() * 60), 2)); }
    var simulasi = !!opsi.simulasi;
    var STAF = { raka: 'Raka Pratama', maya: 'Maya Rahma', dimas: 'Dimas Kurnia', sinta: 'Sinta Wulandari', rian: 'Rian Saputra' };

    // Pengaturan + kategori
    Object.keys(PENGATURAN_DEFAULT).forEach(function (k) { if (!tx.get('Pengaturan', k)) tx.insert('Pengaturan', { Kunci: k, Nilai: PENGATURAN_DEFAULT[k][0], Keterangan: PENGATURAN_DEFAULT[k][1] }); });
    if (opsi.appUrl) tx.setS('APP_URL', opsi.appUrl);
    if (opsi.verifUrl) tx.setS('VERIF_URL', opsi.verifUrl);
    if (!tx.all('Kategori_Biaya').length) KATEGORI_DEFAULT.forEach(function (k, i) { tx.insert('Kategori_Biaya', { Nama: k[0], Ikon: k[1], Urutan: i + 1, Aktif: 'YA' }); });

    // Pengguna demo (HANYA mode demo browser — backend tidak membuat akun ber-PIN diketahui)
    if (opsi.denganPengguna) {
      [['Raka Pratama', 'raka@yukx.id', 'Admin', 'YA', '081211110001'], ['Maya Rahma', 'maya@yukx.id', 'Admin', 'TIDAK', '081211110002'], ['Dimas Kurnia', 'dimas@yukx.id', 'Admin', 'TIDAK', '081211110003'],
        ['Sinta Wulandari', 'sinta@yukx.id', 'Finance', 'TIDAK', '081211110004'], ['Rian Saputra', 'rian@yukx.id', 'Finance', 'TIDAK', '081211110005']].forEach(function (u, i) {
        var salt = 'demo-salt-' + i; tx.insert('Pengguna', { Nama: u[0], Email: u[1], Peran: u[2], Pengelola: u[3], No_WA: u[4], Salt: salt, Hash_PIN: H.hash('123456', salt), Status: 'Aktif', Foto_URL: '', Terakhir_Login: wkt(-i, '08:1' + i + ':00'), Dibuat: wkt(-120) });
      });
    }

    // Trip
    var TRIP = [
      ['DRW', 'Derawan Escapade Luxury Resort 4D3N', 'Derawan, Kalimantan Timur', -29, -26, 10, 5850000, 'Bandara Kalimarau, Berau', 'Derawan Dive Resort', 'derawan', 'Snorkeling bersama penyu, danau ubur-ubur Kakaban, dan sunset di dermaga resort.'],
      ['BRM', 'Bromo Midnight Private Sunrise 2D1N', 'Bromo, Jawa Timur', -21, -20, 14, 2750000, 'Stasiun Malang Kotabaru', 'Lava View Lodge', 'bromo', 'Jeep 4WD tengah malam ke Penanjakan, sunrise di atas lautan pasir, dan kawah Bromo.'],
      ['LBJ', 'Eksplor Labuan Bajo 4D3N Phinisi', 'Labuan Bajo, NTT', -15, -12, 18, 8350000, 'Bandara Komodo (LBJ)', 'Phinisi KLM Vinca', 'labuan-bajo', 'Live on board phinisi: Pulau Padar, Pink Beach, Komodo, dan Manta Point.'],
      ['BLT', 'Belitung Island Hopping 3D2N', 'Belitung, Bangka Belitung', -6, -4, 12, 3650000, 'Bandara H.A.S. Hanandjoeddin', 'Billiton Beach Hotel', 'belitung', 'Batu granit raksasa Tanjung Tinggi, Pulau Lengkuas, dan mercusuar tua.'],
      ['PDR', 'Sailing Komodo & Padar 4D3N', 'Labuan Bajo, NTT', 2, 5, 18, 8900000, 'Bandara Komodo (LBJ)', 'Phinisi Lamborajo', 'padar', 'Sailing premium: trekking Padar saat sunrise, Taka Makassar, dan Kanawa.'],
      ['R4A', 'Gathering Raja Ampat 5D4N', 'Raja Ampat, Papua Barat Daya', 12, 16, 20, 14750000, 'Bandara DEO Sorong', 'Raja Ampat Dive Lodge', 'raja-ampat', 'Corporate gathering: Piaynemo, Pasir Timbul, Arborek, dan diving Cape Kri.'],
      ['DNG', 'Dieng Golden Sunrise 3D2N', 'Dieng, Jawa Tengah', 20, 22, 16, 1950000, 'Stasiun Purwokerto', 'Kledung Pass Homestay', 'dieng', 'Golden sunrise Sikunir, Telaga Warna, Candi Arjuna, dan kuliner mie ongklok.'],
      ['KRJ', 'Karimunjawa Snorkeling Trip 3D2N', 'Karimunjawa, Jawa Tengah', 34, 36, 16, 2450000, 'Pelabuhan Kartini, Jepara', 'Karimunjawa Beach Villa', 'karimunjawa', 'Snorkeling Menjangan Kecil, penangkaran hiu, dan sunset di Bukit Joko Tuwo.']
    ];
    var trip = {};
    TRIP.forEach(function (t) {
      var b = hari(t[3]);
      trip[t[0]] = tx.insert('Trip', { Kode: 'TRP-' + t[0] + '-' + b.slice(5, 7) + b.slice(2, 4), Nama: t[1], Tujuan: t[2], Tgl_Berangkat: b, Tgl_Pulang: hari(t[4]), Kuota: t[5], Harga_Default: t[6], Meeting_Point: t[7], Akomodasi: t[8], Foto_URL: 'assets/img/trips/' + t[9] + '.webp', Deskripsi: t[10], Status: 'Open', Folder_ID: '', Dibuat: wkt(t[3] - 70) });
    });

    // Customer
    var CUST = [
      ['Budi Santoso', 'L', 'Jakarta Selatan', 'VIP'], ['Siti Rahmawati', 'P', 'Bandung', ''], ['Hendra Gunawan', 'L', 'Bandung', 'VIP'], ['Dewi Lestari', 'P', 'Jakarta Selatan', ''], ['Andi Wijaya', 'L', 'Surabaya', ''],
      ['Dina Rosalia', 'P', 'Bekasi', ''], ['Farhan Hakim', 'L', 'Depok', 'Repeat'], ['Keluarga Pratama', 'L', 'Tangerang', 'Keluarga'], ['Rizky Ramadhan', 'L', 'Yogyakarta', ''], ['Nadia Putri', 'P', 'Jakarta Barat', 'Repeat'],
      ['Agus Setiawan', 'L', 'Semarang', ''], ['Maria Angelina', 'P', 'Jakarta Utara', ''], ['Yusuf Maulana', 'L', 'Bogor', ''], ['Laras Ayu', 'P', 'Malang', ''], ['Bayu Prasetyo', 'L', 'Solo', 'Repeat'],
      ['Clara Wijaya', 'P', 'Jakarta Pusat', 'VIP'], ['Ilham Saputra', 'L', 'Bekasi', ''], ['Putri Amelia', 'P', 'Depok', ''], ['Reza Firmansyah', 'L', 'Tangerang Selatan', ''], ['Tania Kusuma', 'P', 'Surabaya', ''],
      ['Galih Pamungkas', 'L', 'Bandung', ''], ['Intan Permata', 'P', 'Jakarta Timur', ''], ['Joko Susilo', 'L', 'Semarang', ''], ['Kartika Sari', 'P', 'Yogyakarta', 'Repeat'], ['Lukman Hakim', 'L', 'Medan', ''],
      ['Melati Anggraini', 'P', 'Palembang', ''], ['Nanda Pratiwi', 'P', 'Bogor', ''], ['Oki Firdaus', 'L', 'Jakarta Selatan', ''], ['PT Arunika Karya Persada', 'L', 'Jakarta Pusat', 'Corporate'], ['Rani Oktaviani', 'P', 'Bandung', ''],
      ['Satria Nugraha', 'L', 'Cirebon', ''], ['Tiara Salsabila', 'P', 'Jakarta Selatan', ''], ['Umar Abdullah', 'L', 'Depok', ''], ['Vina Agustina', 'P', 'Tangerang', ''], ['Wahyu Hidayat', 'L', 'Malang', ''],
      ['Yuni Kartika', 'P', 'Bekasi', ''], ['Zaki Mubarak', 'L', 'Bogor', ''], ['Anisa Rahma', 'P', 'Surabaya', 'Repeat'], ['Bima Sakti', 'L', 'Jakarta Barat', ''], ['Citra Dewanti', 'P', 'Denpasar', '']
    ];
    var JALAN = ['Jl. Kemang Selatan', 'Jl. Dago', 'Jl. Ahmad Yani', 'Jl. Gatot Subroto', 'Jl. Diponegoro', 'Jl. Sudirman', 'Jl. Merdeka', 'Jl. Pahlawan', 'Jl. Kaliurang', 'Jl. Margonda Raya'];
    var DARURAT = ['Ibu', 'Suami', 'Istri', 'Ayah', 'Kakak', 'Adik'];
    var MEDIS = ['', '', '', 'Alergi udang & kepiting (seafood shell)', '', 'Mabuk laut — siapkan antimo', '', 'Vegetarian', '', 'Asma ringan, bawa inhaler', '', ''];
    var cust = [];
    CUST.forEach(function (c, i) {
      var nama = c[0], corp = /^PT /.test(nama), slug = nama.toLowerCase().replace(/^pt /, '').replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.');
      var nik = corp ? '' : (c[1] === 'L' ? '3174' : '3273') + pad(10 + i, 2) + pad(Math.floor(acak() * 900000) + 100000, 6) + pad(Math.floor(acak() * 9000) + 1000, 4);
      cust.push(tx.insert('Customer', {
        Nama: nama, No_WA: '0812' + pad(31000000 + i * 7919 + Math.floor(acak() * 999), 8), Email: (corp ? 'procurement@arunika-demo.example.com' : slug + '@example.com'),
        Alamat: pilih(JALAN) + ' No. ' + (3 + Math.floor(acak() * 120)) + ', ' + c[2], Kota: c[2], Identitas: nik, Tgl_Lahir: corp ? '' : (1972 + Math.floor(acak() * 30)) + '-' + pad(1 + Math.floor(acak() * 12), 2) + '-' + pad(1 + Math.floor(acak() * 27), 2),
        Gender: corp ? '' : c[1], Kontak_Darurat: corp ? 'Bpk. Hadi (HRD)' : pilih(['Rina', 'Agus', 'Wati', 'Bambang', 'Lestari', 'Hari']) + ' (' + pilih(DARURAT) + ')', Telp_Darurat: '0813' + pad(52000000 + i * 3571, 8),
        Catatan_Medis: corp ? '' : MEDIS[i % MEDIS.length], Tag: ['DEMO', c[3]].filter(Boolean).join(', '), Catatan: i % 7 === 0 ? 'Request twin bed, lantai non-smoking.' : '', Status: 'Aktif', Tgl_Terdaftar: hari(-200 + i * 3), Diperbarui: wkt(-30 + i % 20)
      }));
    });

    // Penjualan: [trip, idxCust, pax, diskon, skenario]  skenario: L=lunas, P=pelunasan terbuka, D=dp, B=booking+inv DP, N=booking tanpa invoice, F=full lunas
    var PJ = [
      ['DRW', 3, 4, 500000, 'L'], ['DRW', 10, 2, 0, 'F'], ['DRW', 23, 2, 0, 'L'],
      ['BRM', 2, 2, 0, 'L'], ['BRM', 8, 4, 300000, 'L'], ['BRM', 13, 3, 0, 'L'], ['BRM', 20, 2, 0, 'F'], ['BRM', 30, 1, 0, 'L'],
      ['LBJ', 0, 2, 0, 'L'], ['LBJ', 15, 4, 900000, 'L'], ['LBJ', 6, 2, 0, 'L'], ['LBJ', 9, 3, 450000, 'L'], ['LBJ', 24, 2, 0, 'F'], ['LBJ', 7, 5, 750000, 'L'],
      ['BLT', 11, 4, 400000, 'L'], ['BLT', 14, 3, 0, 'L'], ['BLT', 27, 2, 0, 'L'], ['BLT', 37, 1, 0, 'F'],
      ['PDR', 1, 4, 600000, 'L'], ['PDR', 4, 2, 0, 'L'], ['PDR', 5, 3, 0, 'P'], ['PDR', 16, 2, 0, 'L'], ['PDR', 21, 2, 0, 'D'], ['PDR', 33, 3, 300000, 'L'],
      ['R4A', 28, 18, 4500000, 'D'],
      ['DNG', 12, 2, 0, 'D'], ['DNG', 17, 3, 0, 'B'], ['DNG', 25, 2, 0, 'N'], ['DNG', 31, 4, 200000, 'D'], ['DNG', 35, 1, 0, 'N'],
      ['KRJ', 18, 2, 0, 'B'], ['KRJ', 26, 4, 0, 'D'], ['KRJ', 38, 2, 0, 'N']
    ];
    var METODE = ['Transfer BCA', 'Transfer Mandiri', 'QRIS', 'Transfer BCA', 'Transfer BNI'];
    var NAMA_TAMBAHAN = { L: ['Bagus', 'Arif', 'Dimas', 'Fajar', 'Hafiz', 'Rafi', 'Yoga'], P: ['Ayu', 'Rina', 'Sari', 'Fitri', 'Nia', 'Indah', 'Wulan'], A: ['Kenzo', 'Alya', 'Naura', 'Rayyan', 'Kirana'] };
    var invList = [], pjRows = [];
    PJ.forEach(function (p, i) {
      var t = trip[p[0]], c = cust[p[1]], pax = p[2], total = pax * num(t.Harga_Default) - p[3];
      var lead = p[4] === 'N' ? 3 + (i % 5) : p[4] === 'B' ? 6 + (i % 6) : 22 + (i % 30) + (p[0] === 'R4A' ? 25 : 0);
      var tBook = tambahHari(t.Tgl_Berangkat, -lead - 18); if (tBook > today) tBook = hari(-1 - (i % 4));
      var staf = i % 3 === 0 ? STAF.maya : i % 3 === 1 ? STAF.raka : STAF.dimas;
      var pj = tx.insert('Penjualan', { ID_Customer: c.ID_Customer, ID_Trip: t.ID_Trip, Jumlah_Pax: pax, Harga_per_Pax: t.Harga_Default, Diskon: p[3], Total: total, Terbayar: 0, Sisa: total, Status: 'Booking', Review_Peserta: 'TIDAK', Tgl_Booking: tBook, Dibuat_Oleh: staf, Catatan: p[0] === 'R4A' ? 'Corporate gathering · PIC Bpk. Hadi · termin 30/70' : '', Diperbarui: wkt(-1) });
      pjRows.push({ pj: pj, sk: p[4], t: t, c: c, staf: staf });
      // Anggota rombongan
      var lengkap = ['N', 'B'].indexOf(p[4]) > -1 ? Math.min(pax, 1 + (i % 2)) : (p[0] === 'R4A' ? 11 : (p[4] === 'D' && p[0] !== 'PDR' ? Math.max(1, pax - 1) : pax));
      for (var a = 0; a < lengkap; a++) {
        var g = a === 0 ? c.Gender || 'L' : (a % 2 ? (c.Gender === 'L' ? 'P' : 'L') : (a > 2 ? 'A' : c.Gender || 'L'));
        var nm = a === 0 ? (/^PT /.test(c.Nama) ? 'Hadi Wibowo' : c.Nama) : pilih(NAMA_TAMBAHAN[g === 'A' ? 'A' : g]) + ' ' + (/^PT /.test(c.Nama) ? pilih(['Santoso', 'Hartono', 'Wibisono', 'Susanto', 'Prakoso', 'Halim']) : c.Nama.split(' ').slice(-1)[0]);
        tx.insert('Anggota_Rombongan', { ID_Penjualan: pj.ID_Penjualan, ID_Customer: c.ID_Customer, Nama: nm, Identitas: a === 0 && c.Identitas ? c.Identitas : '3' + pad(Math.floor(acak() * 1e9), 9) + pad(Math.floor(acak() * 1e5), 5), Gender: g === 'A' ? pilih(['L', 'P']) : g, Tgl_Lahir: g === 'A' ? (2012 + Math.floor(acak() * 8)) + '-0' + (1 + Math.floor(acak() * 9)) + '-1' + Math.floor(acak() * 9) : (1975 + Math.floor(acak() * 25)) + '-' + pad(1 + Math.floor(acak() * 12), 2) + '-' + pad(1 + Math.floor(acak() * 27), 2), No_HP: a === 0 ? c.No_WA : (a < 2 ? '0857' + pad(40000000 + i * 101 + a, 8) : ''), Ukuran_Baju: pilih(['S', 'M', 'L', 'XL', 'M', 'L']), Kamar: t.Akomodasi.indexOf('Phinisi') > -1 ? pilih(['Master Cabin', 'Deluxe 01', 'Deluxe 02', 'Deluxe 03', 'Family Cabin']) : 'Kamar ' + (101 + (i % 12)), Catatan: a === 0 ? c.Catatan_Medis : '', Urutan: a + 1 });
      }
    });

    // Invoice + pembayaran per skenario (urut tanggal agar nomor invoice runtut)
    var seq = 20, dpPersen = 50;
    function noInv(tanggal) { seq++; return 'YX/INV/' + tanggal.slice(0, 4) + '/' + tanggal.slice(5, 7) + '/' + pad(seq, 4); }
    var rencana = [];
    pjRows.forEach(function (x, i) {
      var pj = x.pj, t = x.t, total = num(pj.Total), sk = x.sk, tb = pj.Tgl_Booking;
      var dp = Math.round(total * (t.Kode.indexOf('R4A') > -1 ? 30 : dpPersen) / 100 / 1000) * 1000;
      var tDp = tambahHari(tb, 1), tPel = tambahHari(t.Tgl_Berangkat, -21); if (tPel <= tDp) tPel = tambahHari(tDp, 2); if (tPel > today) tPel = hari(-2);
      if (sk === 'F') { rencana.push({ x: x, tgl: tDp, jenis: 'Full', nominal: total, bayar: [[tambahHari(tDp, 1), total, 'Pelunasan']] }); }
      else if (sk === 'L') { rencana.push({ x: x, tgl: tDp, jenis: 'DP', nominal: dp, bayar: [[tambahHari(tDp, 1), dp, 'DP']] }); rencana.push({ x: x, tgl: tPel, jenis: 'Pelunasan', nominal: total - dp, bayar: [[tambahHari(tPel, 2 > selisihHari(tPel, today) ? 0 : 2), total - dp, 'Pelunasan']] }); }
      else if (sk === 'P') { rencana.push({ x: x, tgl: tDp, jenis: 'DP', nominal: dp, bayar: [[tambahHari(tDp, 1), dp, 'DP']] }); rencana.push({ x: x, tgl: hari(-3), jenis: 'Pelunasan', nominal: total - dp, bayar: [], jt: hari(-1) }); }
      else if (sk === 'D') { rencana.push({ x: x, tgl: tDp, jenis: 'DP', nominal: dp, bayar: [[tambahHari(tDp, 1), dp, 'DP']] }); }
      else if (sk === 'B') { rencana.push({ x: x, tgl: tb > today ? today : tb, jenis: 'DP', nominal: dp, bayar: [], jt: hari(1 + (i % 3)) }); }
    });
    urutkan(rencana, function (r) { return r.tgl + r.x.pj.ID_Penjualan; }).forEach(function (r, k) {
      var x = r.x, pj = x.pj, no = noInv(r.tgl), evt = simulasi ? 'evt' + pad(k + 1, 3) + String(H.uuid()).replace(/[^a-z0-9]/g, '').slice(0, 10) : '';
      if (simulasi && !pj.ID_Event) pj = x.pj = tx.update('Penjualan', pj.ID_Penjualan, { ID_Event: evt }); else evt = pj.ID_Event;
      var jt = r.jt || (r.jenis === 'Pelunasan' ? tambahHari(x.t.Tgl_Berangkat, -3) : tambahHari(r.tgl, 3));
      tx.insert('Invoice', { No_Invoice: no, ID_Penjualan: pj.ID_Penjualan, Jenis: r.jenis, Tgl_Terbit: r.tgl, Jatuh_Tempo: jt, Nominal: r.nominal, Status: 'Terbit', Link_PDF: '', File_ID: simulasi ? 'demo' : '', ID_Event_Calendar: evt,
        Kode_Verifikasi: String(H.uuid()).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12), Status_Proses: JSON.stringify(simulasi ? { pdf: 'ok', cal: 'ok', kirim: 'ok' } : { pdf: 'belum', cal: 'belum', kirim: 'lewati' }), Catatan: '', Dibuat_Oleh: x.staf, Dibuat: r.tgl + 'T' + pad(9 + (k % 8), 2) + ':' + pad((k * 7) % 60, 2) + ':00' });
      r.bayar.forEach(function (b, j) {
        var tglB = b[0] > today ? today : b[0];
        tx.insert('Pembayaran', { ID_Penjualan: pj.ID_Penjualan, Jenis: b[2], Tanggal: tglB, Nominal: b[1], Metode: METODE[(k + j) % METODE.length], Link_Bukti: '', Status_Verifikasi: 'Terverifikasi', Diverifikasi_Oleh: STAF.sinta, Catatan: '', Dibuat_Oleh: x.staf, Dibuat: tglB + 'T1' + (k % 9) + ':2' + (k % 6) + ':00' });
      });
      pastikanPeserta(tx, pj);
    });
    pjRows.forEach(function (x, i) {
      recalcPenjualan(tx, x.pj.ID_Penjualan);
      var st = statusTrip(x.t, today);
      var ps = tx.where('Peserta_Trip', function (p) { return p.ID_Penjualan === x.pj.ID_Penjualan; })[0];
      if (ps && (st === 'Selesai' || i % 4 !== 2)) { tx.update('Penjualan', x.pj.ID_Penjualan, { Review_Peserta: 'YA' }); tx.update('Peserta_Trip', ps.ID_Peserta, { Status_Data: 'Terverifikasi' }); }
    });
    // Satu pembayaran menunggu verifikasi (bukti masuk, belum dicek mutasi)
    var pdrD = pjRows.filter(function (x) { return x.sk === 'D' && x.t.Kode.indexOf('PDR') > -1; })[0];
    if (pdrD) tx.insert('Pembayaran', { ID_Penjualan: pdrD.pj.ID_Penjualan, Jenis: 'Cicilan', Tanggal: today, Nominal: 3000000, Metode: 'Transfer Mandiri', Link_Bukti: '', Status_Verifikasi: 'Menunggu', Catatan: 'Bukti dikirim via WA — cek mutasi', Dibuat_Oleh: STAF.maya, Dibuat: today + 'T09:12:00' });

    // Budget berversi
    var RAB = {
      DRW: [['Tiket Pesawat', 'Tiket PP Jakarta – Berau (group fare)', 'Termasuk bagasi 20 kg', 8, 'Pax', 1750000], ['Hotel & Akomodasi', 'Derawan Dive Resort (3 malam)', 'Water villa twin share', 4, 'Kamar', 2700000], ['Transportasi & Kapal', 'Speedboat hopping Maratua–Kakaban', '2 hari', 2, 'Hari', 2600000], ['Tiket Masuk & Retribusi', 'Retribusi Kakaban & Sangalaki', '', 8, 'Pax', 150000], ['Guide & Tour Leader', 'Tour leader + guide lokal', '', 1, 'Paket', 2400000], ['Konsumsi', 'Full board 4 hari', '', 8, 'Pax', 520000], ['Biaya Tak Terduga', 'Dana kontingensi cuaca', '', 1, 'Paket', 1000000]],
      BRM: [['Transportasi & Kapal', 'Jeep 4WD Penanjakan–Kawah', '4 orang/jeep', 4, 'Jeep', 950000], ['Tiket Pesawat', 'Kereta eksekutif Jakarta – Malang PP', 'Kuota rombongan', 12, 'Pax', 420000], ['Transportasi & Kapal', 'Hiace Malang PP', '', 1, 'Unit', 1600000], ['Hotel & Akomodasi', 'Lava View Lodge (1 malam)', '', 6, 'Kamar', 1150000], ['Tiket Masuk & Retribusi', 'Tiket TNBTS', '', 12, 'Pax', 54000], ['Guide & Tour Leader', 'Tour leader', '', 1, 'Paket', 1200000], ['Konsumsi', 'Makan 3x + snack', '', 12, 'Pax', 210000], ['Dokumentasi', 'Drone & DSLR', '', 1, 'Paket', 1500000], ['Perlengkapan & Merchandise', 'Sewa jaket & sarung tangan', '', 12, 'Set', 60000]],
      LBJ: [['Transportasi & Kapal', 'Sewa Phinisi Luxury KLM Vinca (4D3N private)', 'Vendor: Vinca Liveaboard · kontrak #VC-882', 1, 'Unit Kapal', 42000000], ['Transportasi & Kapal', 'Shuttle Bandara Komodo ⇄ Marina', '2 armada Hiace hari 1 & 4', 2, 'Kendaraan', 3000000], ['Hotel & Akomodasi', 'Hotel Waecicu Beach (1 malam pra-trip)', 'Twin share ocean view', 9, 'Kamar', 2400000], ['Tiket Masuk & Retribusi', 'Tiket TN Komodo, Padar & ranger', 'Termasuk snorkeling & retribusi Pemda', 18, 'Pax', 475000], ['Guide & Tour Leader', 'Tour leader & tim dokumentasi', '1 TL senior + 1 videografer', 1, 'Paket Tim', 6500000], ['Konsumsi', 'Seafood gala dinner Kampung Ujung', '', 18, 'Pax', 350000], ['Perlengkapan & Merchandise', 'Welcome kit & drybag 15L', '', 18, 'Pcs', 185000], ['Biaya Tak Terduga', 'Dana kontingensi cuaca & fastboat', '', 1, 'Paket', 4000000], ['Biaya Tak Terduga', 'P3K marine & oksigen portabel', '', 1, 'Paket', 3000000]],
      BLT: [['Tiket Pesawat', 'Tiket PP Jakarta – Tanjung Pandan', '', 10, 'Pax', 1150000], ['Hotel & Akomodasi', 'Billiton Beach Hotel (2 malam)', '', 5, 'Kamar', 1300000], ['Transportasi & Kapal', 'Perahu island hopping', '', 2, 'Perahu', 1500000], ['Transportasi & Kapal', 'Mobil Innova 3 hari', '', 2, 'Unit', 1650000], ['Konsumsi', 'Makan + seafood dinner', '', 10, 'Pax', 380000], ['Guide & Tour Leader', 'Tour leader', '', 1, 'Paket', 1500000], ['Biaya Tak Terduga', 'Kontingensi', '', 1, 'Paket', 800000]],
      PDR: [['Transportasi & Kapal', 'Sewa Phinisi Lamborajo (4D3N)', 'Private charter', 1, 'Unit Kapal', 46000000], ['Transportasi & Kapal', 'Shuttle bandara', '', 2, 'Kendaraan', 3000000], ['Hotel & Akomodasi', 'Hotel pra-trip Labuan Bajo', '', 8, 'Kamar', 2200000], ['Tiket Masuk & Retribusi', 'Tiket TN Komodo & Padar', '', 16, 'Pax', 475000], ['Guide & Tour Leader', 'Tour leader & ranger', '', 1, 'Paket', 6000000], ['Konsumsi', 'Gala dinner', '', 16, 'Pax', 350000], ['Perlengkapan & Merchandise', 'Welcome kit', '', 16, 'Pcs', 185000], ['Biaya Tak Terduga', 'Kontingensi', '', 1, 'Paket', 4000000]],
      R4A: [['Tiket Pesawat', 'Tiket PP Jakarta – Sorong (corporate)', '', 18, 'Pax', 5200000], ['Hotel & Akomodasi', 'Raja Ampat Dive Lodge (4 malam)', '', 9, 'Kamar', 5800000], ['Transportasi & Kapal', 'Speedboat hopping 3 hari', '', 3, 'Hari', 9500000], ['Tiket Masuk & Retribusi', 'Kartu jasa lingkungan Raja Ampat', '', 18, 'Pax', 1000000], ['Guide & Tour Leader', 'Tour leader + MC gathering', '', 1, 'Paket', 9000000], ['Konsumsi', 'Gala dinner & team building', '', 18, 'Pax', 650000], ['Dokumentasi', 'Videografer corporate', '', 1, 'Paket', 7500000], ['Biaya Tak Terduga', 'Kontingensi', '', 1, 'Paket', 6000000]],
      DNG: [['Transportasi & Kapal', 'Elf Purwokerto – Dieng PP', '', 2, 'Unit', 1800000], ['Hotel & Akomodasi', 'Homestay (2 malam)', '', 6, 'Kamar', 700000], ['Tiket Masuk & Retribusi', 'Tiket Sikunir, Telaga Warna, Candi Arjuna', '', 12, 'Pax', 95000], ['Konsumsi', 'Makan 6x + mie ongklok', '', 12, 'Pax', 230000], ['Guide & Tour Leader', 'Guide lokal', '', 1, 'Paket', 900000], ['Biaya Tak Terduga', 'Kontingensi', '', 1, 'Paket', 500000]],
      KRJ: [['Transportasi & Kapal', 'Kapal cepat Jepara PP', '', 8, 'Pax', 300000], ['Transportasi & Kapal', 'Perahu snorkeling 2 hari', '', 2, 'Hari', 1200000], ['Hotel & Akomodasi', 'Karimunjawa Beach Villa', '', 4, 'Kamar', 900000], ['Konsumsi', 'Makan + BBQ ikan', '', 8, 'Pax', 280000], ['Guide & Tour Leader', 'Guide snorkeling', '', 1, 'Paket', 800000]]
    };
    var VERSI_RENCANA = { DRW: [['Digantikan', 1.04], ['Aktif', 1]], BRM: [['Digantikan', 1.06], ['Aktif', 1]], LBJ: [['Digantikan', 1.08], ['Digantikan', 1.03], ['Aktif', 1]], BLT: [['Aktif', 1]], PDR: [['Digantikan', 1.05], ['Aktif', 1]], R4A: [['Menunggu', 1]], DNG: [['Aktif', 1]], KRJ: [['Draft', 1]] };
    var ALASAN = ['Budget awal berdasarkan quotation vendor', 'Penyesuaian harga kapal & kuota peserta', 'Negosiasi ulang vendor kapal — hemat biaya charter'];
    Object.keys(RAB).forEach(function (k) {
      var t = trip[k], vers = VERSI_RENCANA[k], prev = null;
      vers.forEach(function (v, vi) {
        var dibuat = tambahHari(t.Tgl_Berangkat, -60 + vi * 12) > today ? hari(-3 + vi) : tambahHari(t.Tgl_Berangkat, -60 + vi * 12);
        var h = tx.insert('Budget_Header', { ID_Trip: t.ID_Trip, Versi: vi + 1, Status: v[0], Total: 0, Alasan_Revisi: ALASAN[Math.min(vi, 2)], Dibuat_Oleh: vi % 2 ? STAF.maya : STAF.raka, Tgl_Dibuat: dibuat + 'T10:1' + vi + ':00', Disetujui_Oleh: ['Aktif', 'Digantikan'].indexOf(v[0]) > -1 ? STAF.sinta : '', Tgl_Disetujui: ['Aktif', 'Digantikan'].indexOf(v[0]) > -1 ? tambahHari(dibuat, 1) + 'T14:2' + vi + ':00' : '' });
        RAB[k].forEach(function (it, ii) {
          var harga = ii === 0 ? Math.round(it[5] * v[1] / 1000) * 1000 : it[5];
          tx.insert('Budget_Item', { ID_Budget: h.ID_Budget, Kategori: it[0], Uraian: it[1], Keterangan: it[2], Qty: it[3], Satuan: it[4], Harga_Satuan: harga, Subtotal: it[3] * harga, Urutan: ii + 1 });
        });
        var tot = hitungTotalBudget(tx, h.ID_Budget);
        if (prev && ['Aktif', 'Digantikan'].indexOf(v[0]) > -1) {
          var it0 = RAB[k][0];
          tx.insert('Log_Revisi_Budget', { ID_Budget: h.ID_Budget, ID_Trip: t.ID_Trip, Siapa: h.Dibuat_Oleh, Kapan: h.Tgl_Disetujui, Item: it0[0] + ' — ' + it0[1], Nilai_Lama: it0[3] + ' ' + it0[4] + ' × ' + rp(prev.harga0) + ' = ' + rp(prev.harga0 * it0[3]), Nilai_Baru: it0[3] + ' ' + it0[4] + ' × ' + rp(Math.round(it0[5] * v[1] / 1000) * 1000) + ' = ' + rp(Math.round(it0[5] * v[1] / 1000) * 1000 * it0[3]), Alasan: h.Alasan_Revisi });
          tx.insert('Log_Revisi_Budget', { ID_Budget: h.ID_Budget, ID_Trip: t.ID_Trip, Siapa: STAF.sinta, Kapan: h.Tgl_Disetujui, Item: 'TOTAL BUDGET (v' + h.Versi + ' disetujui)', Nilai_Lama: rp(prev.total) + ' (v' + prev.versi + ')', Nilai_Baru: rp(tot), Alasan: h.Alasan_Revisi });
        }
        prev = { total: tot, versi: vi + 1, harga0: Math.round(RAB[k][0][5] * v[1] / 1000) * 1000 };
      });
    });

    // Realisasi anggaran trip selesai — dicatat Admin, dilaporkan, diaudit Finance:
    //   DRW & BRM final (masuk laba rugi) · LBJ diajukan & MELEBIHI RAB · BLT dikembalikan untuk perbaikan
    var FAKTOR = { DRW: [0.98, 1.0, 0.97, 1.02, 1.0, 0.96, 1.0], BRM: [0.95, 1.0, 1.0, 1.0, 1.0, 0.92, 0.97, 1.0, 1.0], LBJ: [1.07, 1.0, 1.0, 1.02, 1.0, 1.04, 1.0, 1.0, 1.0], BLT: [1.0, 1.0, 1.08, 1.0, 1.0] };
    var TAMBAHAN = { LBJ: [['Biaya Tak Terduga', 'Speedboat evakuasi — cuaca buruk hari ke-3', 6500000, 'Gelombang tinggi, rute Padar dialihkan']], BRM: [['Konsumsi', 'Makan malam tambahan rombongan', 1450000, '']] };
    var PELAPOR = { DRW: STAF.maya, BRM: STAF.raka, LBJ: STAF.maya, BLT: STAF.dimas };
    Object.keys(FAKTOR).forEach(function (k) {
      var t = trip[k], f = FAKTOR[k], rows = [];
      RAB[k].slice(0, f.length).forEach(function (it, ii) { rows.push([it[0], it[1], Math.round(it[3] * it[5] * f[ii] / 1000) * 1000, f[ii] < 1 ? 'Hemat dari negosiasi' : f[ii] > 1 ? 'Kenaikan harga BBM / kurs' : '']); });
      (TAMBAHAN[k] || []).forEach(function (x) { rows.push(x); });
      rows.forEach(function (x, ii) {
        tx.insert('Realisasi_Biaya', { ID_Trip: t.ID_Trip, Kategori: x[0], Uraian: x[1], Nominal: x[2], Tanggal: tambahHari(t.Tgl_Pulang, -(ii % 3)), Link_Bukti: 'demo:nota-' + (ii + 1) + '.jpg', Status: 'Tercatat', Diinput_Oleh: PELAPOR[k], Catatan: x[3], Dibuat: tambahHari(t.Tgl_Pulang, ii % 2) + 'T15:0' + (ii % 10) + ':00', Catatan_Verifikasi: '', Diverifikasi_Oleh: '' });
      });
    });
    Object.keys(trip).forEach(function (k) { recalcRekap(tx, trip[k].ID_Trip); });
    function auditDemo(k, kep, oleh, catatan, tolak) {
      var t = trip[k], ix0 = indeks(tx.D), r0 = rekapTrip(tx.D, ix0, t, today), tLapor = tambahHari(t.Tgl_Pulang, 2) + 'T09:30:00', tAudit = tambahHari(t.Tgl_Pulang, 4) + 'T16:10:00';
      var jelas = r0.overBudget ? 'Cuaca buruk hari ke-3: rute dialihkan dengan speedboat evakuasi & harga BBM kapal naik. Bukti nota terlampir.' : '';
      tx.update('Rekap_Operasional', t.ID_Trip, { Status_Audit: RLS.DIAJUKAN, Tgl_Lapor: tLapor, Dilapor_Oleh: PELAPOR[k], Penjelasan_Lapor: jelas });
      tx.insert('Log_Revisi_Budget', { ID_Budget: r0.budgetId, ID_Trip: t.ID_Trip, Siapa: PELAPOR[k], Kapan: tLapor, Item: 'REALISASI — Dilaporkan ke Finance', Nilai_Lama: 'RAB v' + r0.versiBudget + ' ' + rp(r0.budget), Nilai_Baru: 'Realisasi ' + rp(r0.realisasi) + (r0.overBudget ? ' · MELEBIHI RAB ' + rp(r0.lebih) + ' (' + r0.lebihPersen + '%)' : ' · hemat ' + rp(r0.budget - r0.realisasi)), Alasan: jelas });
      if (!kep) return;
      (tolak || []).forEach(function (x) { var it = tx.where('Realisasi_Biaya', function (n) { return n.ID_Trip === t.ID_Trip && n.Uraian === x[0]; })[0]; if (it) tx.update('Realisasi_Biaya', it.ID_Realisasi, { Status: 'Ditolak', Catatan_Verifikasi: x[1], Diverifikasi_Oleh: oleh }); });
      if (kep === 'setujui') tx.where('Realisasi_Biaya', function (n) { return n.ID_Trip === t.ID_Trip && n.Status !== 'Ditolak'; }).forEach(function (n) { tx.update('Realisasi_Biaya', n.ID_Realisasi, { Status: 'Disetujui', Diverifikasi_Oleh: oleh }); });
      recalcRekap(tx, t.ID_Trip);
      var r1 = rekapTrip(tx.D, indeks(tx.D), t, today), st1 = kep === 'setujui' ? RLS.FINAL : RLS.PERBAIKAN;
      var patch = { Status_Audit: st1, Diverifikasi_Oleh: oleh, Tgl_Verifikasi: tAudit, Catatan_Audit: catatan };
      if (st1 === RLS.FINAL) { patch.Biaya_Final = r1.realisasi; patch.Laba_Final = r1.pendapatan - r1.realisasi; patch.Tgl_Final = tAudit; }
      tx.update('Rekap_Operasional', t.ID_Trip, patch);
      tx.insert('Log_Revisi_Budget', { ID_Budget: r0.budgetId, ID_Trip: t.ID_Trip, Siapa: oleh, Kapan: tAudit, Item: 'REALISASI — Audit Finance: ' + (st1 === RLS.FINAL ? 'DISETUJUI (final)' : 'PERLU PERBAIKAN'), Nilai_Lama: 'Realisasi dilaporkan ' + rp(r0.realisasi), Nilai_Baru: 'Diakui ' + rp(r1.realisasi) + ((tolak || []).length ? ' · ' + tolak.length + ' nota ditolak' : '') + (st1 === RLS.FINAL ? ' · laba final ' + rp(r1.pendapatan - r1.realisasi) : ''), Alasan: catatan });
    }
    auditDemo('DRW', 'setujui', STAF.sinta, 'Nota lengkap & sesuai RAB.');
    auditDemo('BRM', 'setujui', STAF.rian, 'Disetujui. 1 nota makan tambahan ditolak karena tanpa stempel vendor.', [['Makan malam tambahan rombongan', 'Nota tanpa stempel/kop vendor — tidak bisa diakui']]);
    auditDemo('LBJ', '');
    auditDemo('BLT', 'perbaikan', STAF.sinta, 'Nota sewa mobil Innova belum dilampirkan. Mohon unggah bukti lalu laporkan ulang.', [['Mobil Innova 3 hari', 'Bukti nota belum ada']]);

    // Manifest
    pjRows.forEach(function (x, i) {
      var st = statusTrip(x.t, today), pj = tx.get('Penjualan', x.pj.ID_Penjualan);
      if (!tx.where('Invoice', function (v) { return v.ID_Penjualan === pj.ID_Penjualan; }).length) return;
      var m = pastikanManifest(tx, pj), final = st === 'Selesai' || (x.t.Kode.indexOf('PDR') > -1 && x.sk === 'L');
      if (final) tx.update('Manifest', m.ID_Manifest, { Status: 'Final', Versi: i % 5 === 0 ? 2 : 1, Tgl_Final: tambahHari(x.t.Tgl_Berangkat, -5) + 'T11:00:00', Link_File: '', File_ID: simulasi ? 'demo' : '', ID_Lampiran_Calendar: simulasi ? pj.ID_Event : '', Dibuat_Oleh: x.staf, Diperbarui: tambahHari(x.t.Tgl_Berangkat, -5) + 'T11:00:00' });
    });
    ['DRW', 'BRM', 'LBJ', 'BLT'].forEach(function (k) { tx.insert('Manifest', { Tipe: 'Per Trip', ID_Trip: trip[k].ID_Trip, Status: 'Final', Versi: 1, Tgl_Final: tambahHari(trip[k].Tgl_Berangkat, -3) + 'T09:00:00', File_ID: simulasi ? 'demo' : '', Dibuat_Oleh: STAF.maya, Diperbarui: tambahHari(trip[k].Tgl_Berangkat, -3) + 'T09:00:00' }); });

    // CRM + log aktivitas + riwayat notifikasi (simulasi)
    A['crm.sync'](tx, {});
    tx.all('CRM_Kontak').forEach(function (k, i) { if (k.NoWA) tx.update('CRM_Kontak', k.KontakID, { StatusWA: i % 11 === 5 ? 'Tidak Terdaftar' : i % 6 === 3 ? '' : 'Terdaftar', CekWAAt: i % 6 === 3 ? '' : wkt(-(i % 9)) }); });
    var AKSI = [['Invoice terbit', 'Finansial & Invoice', 'maya'], ['Manifest final v1', 'Manifest & Customer', 'maya'], ['Setujui & aktifkan budget v3', 'Budgeting & RAB', 'sinta'], ['Input realisasi biaya', 'Budgeting & RAB', 'rian'], ['Input pembayaran', 'Finansial & Invoice', 'raka'], ['Ubah pengaturan', 'Sistem', 'dimas'], ['Tambah customer', 'Manifest & Customer', 'raka'], ['Review peserta: sudah masuk daftar', 'Manifest & Customer', 'maya'], ['Audit rekap: Terverifikasi', 'Budgeting & RAB', 'sinta'], ['Unduh laporan laba rugi', 'Finansial & Invoice', 'sinta'], ['Login', 'Sistem', 'raka'], ['Ajukan budget v1', 'Budgeting & RAB', 'raka']];
    var OBJ = tx.all('Invoice').map(function (i) { return i.No_Invoice; });
    for (var li = 0; li < 46; li++) {
      var a = AKSI[li % AKSI.length], who = STAF[a[2]];
      tx.insert('Log_Aktivitas', { Waktu: wkt(-Math.floor(li / 7), pad(8 + (li % 10), 2) + ':' + pad((li * 13) % 60, 2) + ':' + pad((li * 7) % 60, 2)), Pengguna: who, Peran: a[2] === 'sinta' || a[2] === 'rian' ? 'Finance' : 'Admin', Aksi: a[0], Kategori: a[1], Objek: a[1] === 'Finansial & Invoice' ? OBJ[li % OBJ.length] : a[1] === 'Budgeting & RAB' ? trip[['LBJ', 'BLT', 'PDR', 'DRW'][li % 4]].Kode : a[1] === 'Sistem' ? 'Pengaturan' : cust[li % cust.length].ID_Customer, Detail: a[0] === 'Ubah pengaturan' ? 'PALET, FONT_HEAD' : a[0] === 'Login' ? 'Masuk dari Chrome · Android' : '' });
    }
    if (simulasi) {
      // Mode Demo: kanal disimulasikan (tidak ada pesan sungguhan), jadi saklar utama dinyalakan agar alur lengkap terlihat
      tx.setS('NOTIF_WA_AKTIF', 'YA'); tx.setS('NOTIF_EMAIL_AKTIF', 'YA'); tx.setS('NOTIF_KIRIM_DEMO', 'YA');
      tx.all('Invoice').slice(-14).forEach(function (inv, i) {
        var pj = tx.get('Penjualan', inv.ID_Penjualan), c = tx.get('Customer', pj.ID_Customer);
        tx.insert('AntrianNotif', { Kanal: i % 3 === 2 ? 'EMAIL' : 'WA', Tujuan: i % 3 === 2 ? c.Email : hp62(c.No_WA), NamaPenerima: c.Nama, Subjek: i % 3 === 2 ? 'Invoice ' + inv.No_Invoice : '', Pesan: 'Halo ' + c.Nama + ', invoice ' + inv.No_Invoice + ' sebesar ' + rp(inv.Nominal) + ' sudah terbit.', Lampiran: '', Event: 'INVOICE_TERBIT', RefID: inv.No_Invoice, BlastID: '', Status: i === 5 ? 'Gagal' : 'Terkirim', Percobaan: i === 5 ? 3 : 1, Respon: i === 5 ? 'device disconnected' : 'OK (simulasi)', DibuatPada: inv.Dibuat, DikirimPada: i === 5 ? '' : inv.Dibuat });
      });
      tx.insert('BlastWA', { Judul: 'Promo Early Bird Karimunjawa', Pesan: 'Halo {nama}! Early bird Karimunjawa 3D2N mulai Rp 2,45 jt. Kuota terbatas 🌴', Sasaran: 'Segmen Repeat', Total: 6, Terkirim: 6, Gagal: 0, UkuranBatch: 10, JedaDetik: '5', Status: 'Selesai', DibuatOleh: STAF.raka, Tanggal: wkt(-9), SelesaiPada: wkt(-9) });
      [['INVOICE', 'Invoice (A4)'], ['KUITANSI', 'Kuitansi Pembayaran'], ['MANIFEST_CUSTOMER', 'Manifest per Customer'], ['MANIFEST_TRIP', 'Manifest per Trip']].forEach(function (t) {
        tx.insert('Template_Dokumen', { Kode: t[0], Nama: t[1], Engine: 'docs', File_ID: 'demo-' + t[0].toLowerCase(), Bidang: JSON.stringify(BIDANG_TEMPLATE[t[0]] || []), Versi: 1, Aktif: 'YA', Diperbarui: wkt(-40) });
      });
    }
    return tx.hasil(ok({ trip: Object.keys(trip).length, customer: cust.length, penjualan: pjRows.length, invoice: tx.all('Invoice').length }, 'Data demo dimuat.'));
  }

  // Placeholder bawaan tiap template (hasil pindai template default)
  var BIDANG_TEMPLATE = {
    INVOICE: ['APP_NAMA', 'PT_NAMA', 'PT_ALAMAT', 'PT_EMAIL', 'PT_TELP', 'NO_INVOICE', 'JENIS', 'STATUS', 'TGL_TERBIT', 'JATUH_TEMPO', 'NAMA_CUSTOMER', 'EMAIL_CUSTOMER', 'WA_CUSTOMER', 'NAMA_TRIP', 'JADWAL', 'PAX', 'MEETING_POINT', '#ITEM', 'ITEM.NO', 'ITEM.DESKRIPSI', 'ITEM.KETERANGAN', 'ITEM.QTY', 'ITEM.JUMLAH', 'SUBTOTAL', 'DISKON', 'TOTAL', 'NOMINAL', 'TERBILANG', 'SISA_SETELAH', 'BANK', 'NOREK', 'ATAS_NAMA', 'CATATAN', 'TTD', 'TTD_NAMA', 'TTD_JABATAN', 'QR', 'KODE_VERIFIKASI'],
    KUITANSI: ['APP_NAMA', 'PT_NAMA', 'NAMA_CUSTOMER', 'NOMINAL', 'TERBILANG', 'NAMA_TRIP', 'NO_INVOICE', 'TERBAYAR', 'SISA_TAGIHAN', 'TTD', 'TTD_NAMA', 'QR'],
    MANIFEST_CUSTOMER: ['JUDUL', 'NAMA_TRIP', 'JADWAL', 'MEETING_POINT', 'AKOMODASI', 'NAMA_CUSTOMER', 'KONTAK_DARURAT', 'TOTAL_PAX', '#PESERTA', 'PESERTA.NO', 'PESERTA.NAMA', 'PESERTA.IDENTITAS', 'PESERTA.GENDER', 'PESERTA.HP', 'PESERTA.KAMAR', 'PESERTA.CATATAN', 'TGL_CETAK'],
    MANIFEST_TRIP: ['JUDUL', 'NAMA_TRIP', 'JADWAL', 'MEETING_POINT', 'AKOMODASI', 'TOTAL_PAX', 'JUMLAH_BOOKING', '#PESERTA', 'PESERTA.NO', 'PESERTA.NAMA', 'PESERTA.BOOKING', 'PESERTA.IDENTITAS', 'PESERTA.HP', 'PESERTA.KAMAR', 'PESERTA.BAJU', 'PESERTA.CATATAN', 'TGL_CETAK']
  };

  // ==========================================================================
  // 12. EKSPOR API PUBLIK
  // ==========================================================================
  return {
    VERSI: VERSI, SKEMA: SKEMA, ANGKA: ANGKA, TEKS_WAJIB: TEKS_WAJIB, PERAN: PERAN, ROUTES: ROUTES, NOTIF_EVENTS: NOTIF_EVENTS, PRESET_PALET: PRESET_PALET,
    PENGATURAN_DEFAULT: PENGATURAN_DEFAULT, PENGATURAN_BOLEH: PENGATURAN_BOLEH, KATEGORI_DEFAULT: KATEGORI_DEFAULT, BIDANG_TEMPLATE: BIDANG_TEMPLATE,
    Tx: Tx, jalankan: jalankan, dataBoot: dataBoot, isiDemo: isiDemo, ok: ok, fail: fail,
    klaimTugas: klaimTugas, selesaikanTugas: selesaikanTugas, tugasTertunda: tugasTertunda, klaimNotif: klaimNotif, selesaikanNotif: selesaikanNotif, adaAntrian: adaAntrian, pengingatHarian: pengingatHarian,
    matriksNotif: matriksNotif, recalcRekap: recalcRekap, recalcPenjualan: recalcPenjualan,
    bantu: { pastikanPeserta: pastikanPeserta, pastikanManifest: pastikanManifest, pastikanAnggotaUtama: pastikanAnggotaUtama, nomorInvoiceBaru: nomorInvoiceBaru, kodeVerif: kodeVerif, crmUpsertSatu: crmUpsertSatu },
    RLS: RLS, hitung: { indeks: indeks, ringkasPj: ringkasPj, rekapTrip: rekapTrip, rabVsRealisasi: rabVsRealisasi, normRls: normRls, rekapSemua: rekapSemua, labaRugi: labaRugi, dashboard: dashboard, statusTrip: statusTrip, budgetAktif: budgetAktif, budgetTerbaru: budgetTerbaru, terbayarPj: terbayarPj, biayaPerKategori: biayaPerKategori, rentangPeriode: rentangPeriode, deskripsiEvent: deskripsiEvent, dataInvoice: dataInvoice, dataManifest: dataManifest, verifikasiPublik: verifikasiPublik, prosesInvoice: prosesInvoice },
    util: { str: str, num: num, pad: pad, tgl: tgl, tambahHari: tambahHari, selisihHari: selisihHari, tglId: tglId, tglPanjang: tglPanjang, rentangTgl: rentangTgl, rp: rp, rpRingkas: rpRingkas, terbilang: terbilang, hp08: hp08, hp62: hp62, hpValid: hpValid, emailValid: emailValid, isiTemplate: isiTemplate, inisial: inisial, samarkanNama: samarkanNama, urutkan: urutkan, jumlah: jumlah, kelompok: kelompok, peta: peta, nowIso: nowIso, hariIni: hariIni, kontras: kontras, cekPalet: cekPalet, paletAktif: paletAktif, parseJson: parseJson, BULAN: BULAN, BLN: BLN, ROMAWI: ROMAWI }
  };
})();
