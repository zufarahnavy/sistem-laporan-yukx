/* =====================================================================
   YukX — dokumen.js : pratinjau A4 invoice/kuitansi/manifest (HTML yang
   sama dengan template Docs di server), cetak, QR verifikasi, ekspor
   Excel (SheetJS) & PDF (jsPDF) — pustaka dimuat hanya saat dibutuhkan.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, U = C.U, HT = C.HT;
  var CDN = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
  };
  var dimuat = {};
  function muat(url) {
    if (dimuat[url]) return dimuat[url];
    return (dimuat[url] = new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = function () { delete dimuat[url]; gagal(new Error('Gagal memuat pustaka. Periksa koneksi internet.')); }; document.head.appendChild(s); }));
  }
  function qrSvg(teks, cell) {
    try { var q = qrcode(0, 'M'); q.addData(String(teks)); q.make(); return q.createSvgTag({ cellSize: cell || 3, margin: 0, scalable: true }); } catch (e) { return ''; }
  }
  function logo(S, besar) {
    var u = S.LOGO_URL;
    return '<div style="width:' + (besar ? 44 : 34) + 'px;height:' + (besar ? 44 : 34) + 'px;border-radius:10px;background:linear-gradient(135deg,#3B86FF,#1253C9);display:grid;place-items:center;overflow:hidden;flex:none">' + (u ? '<img src="' + esc(u) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '<img src="assets/logo.svg" alt="" style="width:100%;height:100%">') + '</div>';
  }
  function verifUrl(S, kode) { var b = S.VERIF_URL || (location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '') + 'verifikasi.html'); return b + (b.indexOf('?') > -1 ? '&' : '?') + 'k=' + kode; }

  function invoiceHTML(no, timpa) {
    var S = Store.S, d = HT.dataInvoice(Store.D, no, S); if (!d) return '';
    var v = Object.assign({}, d.nilai, timpa || {}), inv = d.inv, lunas = inv.Status === 'Lunas', batal = inv.Status === 'Batal';
    var rows = d.items.map(function (it) { return '<tr><td style="color:#4A5B78" class="mono">' + it.NO + '</td><td><b style="display:block">' + esc(it.DESKRIPSI) + '</b><span class="muted" style="font-size:11.5px">' + esc(it.KETERANGAN) + '</span></td><td style="text-align:center">' + esc(it.QTY) + '</td><td style="text-align:right;white-space:nowrap" class="num"><b>' + esc(it.JUMLAH) + '</b></td></tr>'; }).join('');
    return '<div class="paper" id="paper">' + (lunas ? '<div class="lunas">LUNAS</div>' : batal ? '<div class="lunas" style="border-color:#D12F3A;color:#D12F3A">BATAL</div>' : '') + '<div class="wm">' + esc((S.APP_NAMA || 'YUKX').toUpperCase()) + ' RESMI</div>' +
      '<div style="display:flex;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:1px solid #DDE6F3"><div><div style="display:flex;align-items:center;gap:10px">' + logo(S) + '<div><b style="font-size:17px;display:block;line-height:1.1">' + esc(v.APP_NAMA) + '</b><span style="font-size:10px;font-weight:800;letter-spacing:.12em;color:#1E6FEB">' + esc((v.APP_TAGLINE || '').toUpperCase()) + '</span></div></div>' +
      '<p class="muted" style="margin-top:10px;font-size:12px;line-height:1.55">' + esc(v.PT_NAMA) + '<br>' + esc(v.PT_ALAMAT) + '<br>' + esc(v.PT_EMAIL) + ' · ' + esc(v.PT_TELP) + '</p></div>' +
      '<div style="text-align:right"><h1>INVOICE</h1><div class="mono" style="color:#1E6FEB;font-weight:800;margin-top:4px">' + esc(v.NO_INVOICE) + '</div><div style="margin:10px 0 8px"><span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.06em;background:' + (lunas ? 'rgba(34,176,125,.14);color:#13774F' : batal ? 'rgba(209,47,58,.12);color:#D12F3A' : 'rgba(180,83,9,.13);color:#B45309') + '">' + esc(v.STATUS) + '</span></div>' +
      '<div class="muted" style="font-size:12px">Tanggal terbit: <b style="color:#0F1B33">' + esc(v.TGL_TERBIT) + '</b><br>Jatuh tempo: <b style="color:' + (lunas ? '#0F1B33' : '#D12F3A') + '">' + esc(v.JATUH_TEMPO) + '</b></div></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0"><div class="box"><div class="label" style="color:#4A5B78">Tagihan kepada</div><b style="font-size:15px;display:block;margin-top:4px">' + esc(v.NAMA_CUSTOMER) + '</b><div class="muted" style="font-size:12px;margin-top:4px">' + esc(v.ALAMAT_CUSTOMER || '') + '<br>' + esc(v.EMAIL_CUSTOMER) + '<br>' + esc(v.WA_CUSTOMER) + '</div></div>' +
      '<div class="box"><div class="label" style="color:#4A5B78">Detail perjalanan</div><b style="font-size:15px;display:block;margin-top:4px;color:#1E6FEB">' + esc(v.NAMA_TRIP) + '</b><div style="font-size:12px;margin-top:4px">Jadwal: <b>' + esc(v.JADWAL) + '</b><br>Peserta: <b>' + esc(v.PAX) + '</b><br>Meeting point: <b>' + esc(v.MEETING_POINT) + '</b></div></div></div>' +
      '<table><thead><tr><th style="width:44px">No</th><th>Deskripsi layanan</th><th style="text-align:center;width:90px">Qty</th><th style="text-align:right;width:150px">Jumlah (IDR)</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;align-items:start"><div class="box" style="display:flex;gap:12px;align-items:center"><div class="qr" style="background:#fff;border-radius:10px;padding:6px;flex:none">' + qrSvg(verifUrl(S, inv.Kode_Verifikasi)) + '</div><div style="font-size:12px;line-height:1.5"><div class="label" style="color:#4A5B78">Metode pembayaran</div><b>' + esc(v.BANK) + '</b><div class="mono" style="color:#1E6FEB;font-weight:800;font-size:13px">' + esc(v.NOREK) + '</div>a.n ' + esc(v.ATAS_NAMA) + '<div class="muted" style="font-size:10.5px;margin-top:4px">Scan QR untuk cek keaslian · ' + esc(inv.Kode_Verifikasi) + '</div></div></div>' +
      '<div style="font-size:12.5px"><div style="display:flex;justify-content:space-between;padding:3px 0"><span class="muted">Subtotal layanan</span><b class="num">' + esc(v.SUBTOTAL) + '</b></div><div style="display:flex;justify-content:space-between;padding:3px 0;color:#13774F"><span>Diskon</span><b class="num">' + esc(v.DISKON) + '</b></div><div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #E6ECF5;margin-top:4px"><b>Total nilai transaksi</b><b class="num">' + esc(v.TOTAL) + '</b></div>' +
      '<div class="tot" style="margin-top:6px"><div style="font-size:10.5px;font-weight:800;letter-spacing:.06em;color:#1E6FEB">TAGIHAN INVOICE INI (' + esc(v.JENIS.toUpperCase()) + ')</div><div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4px"><b class="num" style="font-size:24px;color:#1E6FEB">' + esc(v.NOMINAL) + '</b></div><div style="font-size:11px;color:#4A5B78;font-style:italic">' + esc(v.TERBILANG) + '</div></div>' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0 0;font-size:11.5px"><span class="muted">Sisa tagihan setelah invoice ini</span><b class="num">' + esc(v.SISA_SETELAH) + '</b></div></div></div>' +
      '<p class="muted" style="font-size:11.5px;margin-top:14px">' + esc(v.CATATAN) + '</p>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:22px;padding-top:16px;border-top:1px solid #DDE6F3"><div class="muted" style="font-size:11.5px;max-width:300px">✔ Dokumen sah diterbitkan otomatis oleh sistem ' + esc(v.APP_NAMA) + '. Verifikasi keaslian: scan QR atau kunjungi halaman verifikasi.</div>' +
      '<div style="display:flex;align-items:center;gap:12px"><div class="stamp">' + esc((v.APP_NAMA || '').toUpperCase()) + '<br>RESMI<br>FINANCE</div><div style="text-align:center"><img src="' + esc(S.TTD_URL || 'assets/ttd-spesimen.png') + '" alt="Tanda tangan" style="height:44px;width:auto;margin:0 auto -4px" onerror="this.style.display=\'none\'"><b style="display:block;font-size:13px">' + esc(v.TTD_NAMA) + '</b><span class="muted" style="font-size:11px">' + esc(v.TTD_JABATAN) + '</span></div></div></div></div>';
  }

  function kuitansiHTML(idBayar) {
    var S = Store.S, b = Store.get('Pembayaran', idBayar); if (!b) return '';
    var pj = Store.get('Penjualan', b.ID_Penjualan) || {}, c = Store.get('Customer', pj.ID_Customer) || {}, t = Store.get('Trip', pj.ID_Trip) || {};
    var ix = HT.indeks(Store.D), r = HT.ringkasPj(Store.D, ix, pj, U.hariIni(), S), P = U.paletAktif(S).primary, lunas = r.sisa <= 0;
    var baris = [['Telah terima dari', '<b style="font-size:15px">' + esc(c.Nama) + '</b>' + (c.No_WA ? '<div class="muted" style="font-size:11.5px">' + esc(c.No_WA) + (c.Email ? ' · ' + esc(c.Email) : '') + '</div>' : '')],
      ['Untuk pembayaran', '<b>' + esc(b.Jenis) + '</b> — ' + esc(t.Nama) + '<div class="muted" style="font-size:11.5px">' + esc(t.Kode || '') + ' · ' + pj.Jumlah_Pax + ' pax · ' + U.rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang) + '</div>'],
      ['Tanggal & metode', U.tglPanjang(b.Tanggal) + ' · ' + esc(b.Metode)],
      ['Status transaksi', 'Total ' + U.rp(r.total) + ' · terbayar ' + U.rp(r.bayar) + ' · <b style="color:' + (lunas ? '#13774F' : '#B45309') + '">' + (lunas ? 'LUNAS' : 'sisa ' + U.rp(r.sisa)) + '</b>']];
    return '<div class="paper" id="paper" style="font-size:13px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;border-bottom:2px solid ' + P + ';padding-bottom:14px"><div style="display:flex;gap:10px;align-items:center">' + logo(S) + '<div><b style="font-size:16px">' + esc(S.PT_NAMA) + '</b><div class="muted" style="font-size:11.5px">' + esc(S.PT_ALAMAT) + '<br>' + esc([S.PT_TELP, S.PT_EMAIL].filter(Boolean).join(' · ')) + '</div></div></div>' +
      '<div style="text-align:right"><h1 style="font-size:28px">KUITANSI</h1><div class="mono" style="color:' + P + ';font-weight:800">No. ' + esc(b.ID_Bayar) + '</div><div class="muted" style="font-size:11.5px">' + U.tglPanjang(b.Tanggal) + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin:18px 0;padding:16px 18px;border-radius:12px;background:#EEF4FE;border-left:5px solid ' + P + '"><div><div style="font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#4A5B78">UANG SEJUMLAH</div><b class="num" style="display:block;font-size:28px;color:' + P + ';line-height:1.2">' + U.rp(b.Nominal) + '</b><div style="font-style:italic;color:#4A5B78;font-size:12.5px;text-transform:capitalize">' + U.terbilang(b.Nominal) + ' rupiah</div></div>' +
      (lunas ? '<div class="lunas" style="position:static;opacity:1">LUNAS</div>' : '') + '</div>' +
      '<table style="width:100%;font-size:13px"><tbody>' + baris.map(function (x) { return '<tr><td class="muted" style="width:170px;vertical-align:top;padding:10px 0;border-bottom:1px solid #E6ECF5">' + x[0] + '</td><td style="padding:10px 0;border-bottom:1px solid #E6ECF5">' + x[1] + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:26px"><div class="muted" style="font-size:11px;max-width:330px;line-height:1.5">Kuitansi ini diterbitkan oleh sistem ' + esc(S.APP_NAMA) + ' setelah pembayaran diverifikasi Finance. Simpan sebagai bukti pembayaran yang sah.</div>' +
      '<div style="text-align:center;min-width:200px"><div class="muted" style="font-size:11.5px">' + esc((S.PT_ALAMAT || '').split(',').pop().replace(/\d+/g, '').trim()) + ', ' + U.tglPanjang(b.Tanggal) + '</div><div class="muted" style="font-size:11px">Penerima,</div><img src="' + esc(S.TTD_URL || 'assets/ttd-spesimen.png') + '" alt="" style="height:52px;margin:4px auto 0" onerror="this.style.visibility=\'hidden\'"><b style="display:block;border-top:1px solid #9AA8BF;padding-top:4px">' + esc(S.TTD_NAMA) + '</b><span class="muted" style="font-size:11px">' + esc(S.TTD_JABATAN) + '</span></div></div></div>';
  }

  function manifestHTML(opsi) {
    var S = Store.S, d = HT.dataManifest(Store.D, opsi, S), v = d.nilai, satu = !!opsi.idPenjualan;
    // [judul, lebar %] — total 100; kolom sempit tidak dilipat
    var kol = satu ? [['No', 5], ['Nama peserta', 16], ['No. identitas', 18], ['L/P', 5], ['Tgl lahir', 11], ['No. HP', 15], ['Kamar', 11], ['Catatan', 19]]
      : [['No', 4], ['Nama peserta', 14], ['Booking', 12], ['No. identitas', 13], ['L/P', 4], ['Tgl lahir', 9], ['No. HP', 11], ['Kamar', 9], ['Baju', 5], ['Catatan', 19]];
    var rows = d.rows.map(function (r) {
      var c = satu ? [r.NO, r.NAMA, r.IDENTITAS, r.GENDER, r.TGL_LAHIR, r.HP, r.KAMAR, r.CATATAN] : [r.NO, r.NAMA, r.BOOKING, r.IDENTITAS, r.GENDER, r.TGL_LAHIR, r.HP, r.KAMAR, r.BAJU, r.CATATAN];
      var kosong = r.NAMA === '(belum diisi)';
      return '<tr>' + c.map(function (x, i) { var st = i === 1 ? 'font-weight:700' : ''; if (kosong) st += ';color:#B45309'; if (kol[i][0] === 'L/P' || kol[i][0] === 'Baju' || i === 0) st += ';text-align:center'; var nw = /identitas|Tgl lahir|No\. HP/.test(kol[i][0]); return '<td' + (nw ? ' class="nw"' : '') + (st ? ' style="' + st + '"' : '') + '>' + esc(x) + '</td>'; }).join('') + '</tr>';
    }).join('');
    var info = (satu ? [['Pemesan', v.NAMA_CUSTOMER], ['Jadwal', v.JADWAL], ['Jumlah peserta', v.TOTAL_PAX], ['Meeting point', v.MEETING_POINT], ['Akomodasi', v.AKOMODASI], ['Kontak darurat', v.KONTAK_DARURAT]]
      : [['Jadwal', v.JADWAL], ['Meeting point', v.MEETING_POINT], ['Akomodasi', v.AKOMODASI], ['Total peserta', v.TOTAL_PAX + ' · ' + v.JUMLAH_BOOKING + ' booking']]);
    return '<div class="paper paper--multi' + (satu ? '' : ' paper--lanskap') + '" id="paper">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;border-bottom:2px solid ' + U.paletAktif(S).primary + ';padding-bottom:12px"><div style="display:flex;gap:10px;align-items:center">' + logo(S) + '<div><b style="font-size:16px">' + esc(S.APP_NAMA) + '</b><div class="muted" style="font-size:11.5px">' + esc(S.PT_NAMA) + '</div></div></div>' +
      '<div style="text-align:right;max-width:55%"><h1 style="font-size:22px;line-height:1.15">' + esc(v.JUDUL) + '</h1><div style="font-weight:800;color:' + U.paletAktif(S).primary + ';font-size:13px">' + esc(v.NAMA_TRIP) + '</div><div class="muted" style="font-size:11px">' + esc((d.trip.Kode || '') + ' · dicetak ' + v.TGL_CETAK) + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(' + (satu ? 3 : 4) + ',minmax(0,1fr));gap:8px;margin:12px 0 4px">' + info.map(function (k) { return '<div class="box" style="padding:8px 10px;border-radius:8px"><div style="color:#4A5B78;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase">' + k[0] + '</div><b style="font-size:12px">' + esc(k[1]) + '</b></div>'; }).join('') + '</div>' +
      '<table class="tbl-fix"><colgroup>' + kol.map(function (k) { return '<col style="width:' + k[1] + '%">'; }).join('') + '</colgroup>' +
      '<thead><tr class="sela"><th colspan="' + kol.length + '"></th></tr><tr>' + kol.map(function (k, i) { return '<th' + (k[0] === 'L/P' || k[0] === 'Baju' || i === 0 ? ' style="text-align:center"' : '') + '>' + k[0] + '</th>'; }).join('') + '</tr></thead>' +
      '<tfoot><tr class="kaki-sela"><td colspan="' + kol.length + '"></td></tr></tfoot><tbody>' + rows + '</tbody></table>' +
      '<p class="muted" style="font-size:10.5px;margin:10px 0 0">Dokumen internal berisi data pribadi peserta — jangan disebarluaskan.</p></div>';
  }

  function cetak(html) {
    if (window.PRATINJAU) { UI.toast('Pratinjau ini tidak mengizinkan cetak & unduh — fitur ini berfungsi penuh di versi GitHub Pages.', 'info'); return; }
    var root = document.querySelector('.print-root'); if (!root) { root = document.createElement('div'); root.className = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = html;
    var gaya = document.getElementById('gaya-halaman'); if (!gaya) { gaya = document.createElement('style'); gaya.id = 'gaya-halaman'; document.head.appendChild(gaya); }
    gaya.textContent = '@page{size:A4 ' + (/paper--lanskap/.test(html) ? 'landscape' : 'portrait') + ';margin:0}';
    setTimeout(function () { window.print(); }, 80);
  }
  function pratinjau(judul, html, o) {
    o = o || {};
    var h = UI.modal({ judul: judul, sub: o.sub || '', ukuran: 'xl', isi: '<div class="paper-stage" id="pv-stage">' + html + '</div>',
      aksi: (o.aksi || []).concat(o.pdf ? [{ label: 'Cetak', ikon: 'printer', tutup: false, klik: function () { cetak(html); } }, { label: 'Unduh PDF (A4)', kelas: 'btn--primary', ikon: 'file-down', tutup: false, klik: function (hh, b) { b.classList.add('loading'); Promise.resolve(o.pdf()).catch(function (e) { UI.toast(e.message, 'err'); }).then(function () { b.classList.remove('loading'); }); } }] : [{ label: 'Cetak / Simpan PDF', kelas: 'btn--primary', ikon: 'printer', tutup: false, klik: function () { cetak(html); } }]) });
    skala(h.el.querySelector('#pv-stage'));
    return h;
  }
  function skala(stage) {
    var p = stage && stage.querySelector('.paper'); if (!p) return;
    function atur() { var w = stage.clientWidth - 24; var k = Math.min(1, w / (p.offsetWidth || 794)); p.style.transform = 'scale(' + k + ')'; p.style.marginBottom = (-(1 - k) * p.offsetHeight) + 'px'; }
    atur(); setTimeout(atur, 50); window.addEventListener('resize', atur);
  }
  function bukaPdf(no) {
    var inv = Store.get('Invoice', no); if (!inv) return;
    if (inv.Link_PDF) { window.open(inv.Link_PDF, '_blank', 'noopener'); return; }
    pratinjau('Invoice ' + no, invoiceHTML(no), { sub: C.DEMO ? 'Mode Demo: PDF dibuat lewat dialog cetak browser. Di produksi PDF tersimpan otomatis di Google Drive.' : 'PDF di Drive sedang/akan dibuat — sementara gunakan pratinjau ini.' });
  }

  async function excel(nama, sheets) {
    if (window.PRATINJAU) { UI.toast('Pratinjau ini tidak mengizinkan cetak & unduh — fitur ini berfungsi penuh di versi GitHub Pages.', 'info'); return; }
    await muat(CDN.xlsx);
    var wb = XLSX.utils.book_new();
    sheets.forEach(function (s) { var ws = XLSX.utils.aoa_to_sheet(s.rows); ws['!cols'] = (s.lebar || s.rows[0].map(function () { return 18; })).map(function (w) { return { wch: w }; }); XLSX.utils.book_append_sheet(wb, ws, s.nama.slice(0, 31)); });
    XLSX.writeFile(wb, nama.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
  }
  // =====================================================================
  //  MESIN PDF A4 (jsPDF + autoTable): kop, info, KPI, tabel berlebar tetap,
  //  kepala tabel berulang, tanda tangan, nomor halaman, watermark status.
  // =====================================================================
  var RGB = { teks: [15, 27, 51], muted: [74, 91, 120], garis: [221, 230, 243], tint: [238, 244, 254], tint2: [247, 250, 254], gelap: [11, 60, 145], ok: [19, 119, 79], okT: [228, 247, 239], warn: [180, 83, 9], warnT: [254, 243, 226], bahaya: [184, 32, 43], bahayaT: [253, 236, 238] };
  function hexRgb(h) { h = String(h || '#1E6FEB').replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  /** Font standar PDF hanya WinAnsi: ganti karakter di luar itu agar tidak jadi kotak/rusak. */
  var GANTI = { '→': '->', '←': '<-', '⇄': '<->', '↔': '<->', '✓': 'v', '✔': 'v', '✗': 'x', '⚠': '!', '≥': '>=', '≤': '<=', '×': 'x', ' ': ' ' };
  function aman(s) {
    s = String(s == null ? '' : s).replace(/[→←⇄↔✓✔✗⚠≥≤× ]/g, function (c) { return GANTI[c]; });
    return s.replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ–—‘’“”•…€]/g, '');
  }
  function Pdf(o) {
    var J = window.jspdf.jsPDF; this.doc = new J({ orientation: o.lanskap ? 'landscape' : 'portrait', unit: 'pt', format: 'a4', compress: true });
    this.o = o; this.S = Store.S; this.W = this.doc.internal.pageSize.getWidth(); this.H = this.doc.internal.pageSize.getHeight(); this.M = 36; this.L = this.W - 72;
    this.P = hexRgb(U.paletAktif(this.S).primary); this.y = 0; this.kop();
  }
  Pdf.prototype = {
    warna: function (c, f) { this.doc[f === 'f' ? 'setFillColor' : f === 'd' ? 'setDrawColor' : 'setTextColor'](c[0], c[1], c[2]); },
    huruf: function (uk, tebal, c) { this.doc.setFont('helvetica', tebal ? 'bold' : 'normal'); this.doc.setFontSize(uk); this.warna(c || RGB.teks); },
    logo: function (x, y, s) { var d = this.doc; this.warna(this.P, 'f'); d.roundedRect(x, y, s, s, s * .22, s * .22, 'F'); this.huruf(s * .5, true, [255, 255, 255]); d.text(aman((this.S.APP_NAMA || 'Y').charAt(0).toUpperCase()), x + s / 2, y + s * .68, { align: 'center' }); },
    kop: function () {
      var d = this.doc, M = this.M, S = this.S, o = this.o, kanan = this.W - M;
      this.logo(M, M, 34);
      this.huruf(13, true); d.text(aman(S.APP_NAMA || 'YukX'), M + 44, M + 13);
      this.huruf(8.2, false, RGB.muted); d.text(aman(S.PT_NAMA || ''), M + 44, M + 25);
      var al = d.splitTextToSize(aman([S.PT_ALAMAT, S.PT_TELP].filter(Boolean).join(' · ')), this.L * .52 - 44); d.text(al.slice(0, 2), M + 44, M + 35);
      this.huruf(o.lanskap ? 16 : 15, true, RGB.gelap); var jl = d.splitTextToSize(aman(o.judul.toUpperCase()), this.L * .46); d.text(jl, kanan, M + 13, { align: 'right' });
      var yy = M + 13 + (jl.length - 1) * 17 + 13;
      if (o.sub) { this.huruf(9, true, this.P); var sl = d.splitTextToSize(aman(o.sub), this.L * .46); d.text(sl, kanan, yy, { align: 'right' }); yy += sl.length * 11; }
      if (o.nomor) { this.huruf(8, false, RGB.muted); var nl = d.splitTextToSize(aman(o.nomor), this.L * .46); d.text(nl, kanan, yy, { align: 'right' }); yy += (nl.length - 1) * 10; }
      var bawah = Math.max(M + 50, yy + 4); this.warna(this.P, 'd'); d.setLineWidth(1.4); d.line(M, bawah, kanan, bawah); d.setLineWidth(.5);
      this.y = bawah + 14;
    },
    kopLanjut: function () { var d = this.doc, M = this.M; this.huruf(8, true, RGB.muted); d.text(aman((this.S.APP_NAMA || '') + ' · ' + this.o.judul + (this.o.sub ? ' · ' + this.o.sub : '')), M, 26); this.warna(RGB.garis, 'd'); d.line(M, 32, this.W - M, 32); },
    baru: function () { this.doc.addPage(); this.kopLanjut(); this.y = 46; },
    cukup: function (h) { if (this.y + h > this.H - 52) this.baru(); },
    /** Kotak info (label/nilai) dalam grid kolom. */
    info: function (pasang, kol) {
      var d = this.doc, M = this.M, k = kol || 3, gap = 6, w = (this.L - gap * (k - 1)) / k, x, baris = [];
      for (var i = 0; i < pasang.length; i += k) baris.push(pasang.slice(i, i + k));
      var self = this;
      baris.forEach(function (b) {
        self.huruf(9.2, true); var tinggi = 0, isi = b.map(function (p) { var l = d.splitTextToSize(aman(p[1] || '-'), w - 14); tinggi = Math.max(tinggi, l.length); return l; });
        var h = 22 + tinggi * 11; self.cukup(h);
        b.forEach(function (p, j) { x = M + j * (w + gap); self.warna(RGB.tint2, 'f'); self.warna(RGB.garis, 'd'); d.roundedRect(x, self.y, w, h, 5, 5, 'FD'); self.huruf(6.8, true, RGB.muted); d.text(aman(String(p[0]).toUpperCase()), x + 7, self.y + 11); self.huruf(9.2, true); d.text(isi[j], x + 7, self.y + 23); });
        self.y += h + gap;
      });
      this.y += 4;
    },
    /** Pita status berwarna (ok/warn/bahaya/info). */
    pita: function (teks, tone) {
      var d = this.doc, c = { ok: [RGB.okT, RGB.ok], warn: [RGB.warnT, RGB.warn], bahaya: [RGB.bahayaT, RGB.bahaya] }[tone] || [RGB.tint, RGB.gelap];
      this.huruf(9, true); var l = d.splitTextToSize(aman(teks), this.L - 24), h = 12 + l.length * 11; this.cukup(h + 6);
      this.warna(c[0], 'f'); d.roundedRect(this.M, this.y, this.L, h, 5, 5, 'F'); this.warna(c[1], 'f'); d.rect(this.M, this.y, 3.5, h, 'F');
      this.huruf(9, true, c[1]); d.text(l, this.M + 12, this.y + 14); this.y += h + 8;
    },
    /** Deret KPI: [{label, nilai, tone}] — huruf nilai mengecil otomatis agar muat. */
    kpi: function (list) {
      var d = this.doc, gap = 6, n = list.length, w = (this.L - gap * (n - 1)) / n, h = 44, self = this; this.cukup(h + 8);
      list.forEach(function (k, i) {
        var x = self.M + i * (w + gap), utama = i === 0, c = k.tone === 'bahaya' ? RGB.bahaya : k.tone === 'ok' ? RGB.ok : utama ? [255, 255, 255] : RGB.teks;
        if (utama) self.warna(self.P, 'f'); else { self.warna(k.tone === 'bahaya' ? RGB.bahayaT : RGB.tint2, 'f'); }
        self.warna(RGB.garis, 'd'); d.roundedRect(x, self.y, w, h, 6, 6, utama ? 'F' : 'FD');
        self.huruf(6.8, true, utama ? [225, 236, 255] : RGB.muted); d.text(aman(k.label.toUpperCase()), x + 8, self.y + 13);
        var uk = 13; self.huruf(uk, true, c); while (uk > 7.5 && d.getTextWidth(aman(k.nilai)) > w - 16) { uk -= .5; d.setFontSize(uk); }
        d.text(aman(k.nilai), x + 8, self.y + 32);
      });
      this.y += h + 12;
    },
    bagian: function (judul, sub) { this.cukup(40); this.huruf(10.5, true, RGB.gelap); this.doc.text(aman(judul), this.M, this.y + 8); if (sub) { this.huruf(7.8, false, RGB.muted); this.doc.text(aman(sub), this.W - this.M, this.y + 8, { align: 'right' }); } this.y += 15; },
    /** Tabel: kolom [{judul, w, kanan, tengah}] · baris array (properti __grup/__alert/__redup pada array) · kaki array */
    tabel: function (kolom, baris, kaki, o) {
      o = o || {}; var self = this, P = this.P, cs = {}, sisa = this.L, tanpaW = 0;
      kolom.forEach(function (k) { if (k.w) sisa -= k.w; else tanpaW++; });
      kolom.forEach(function (k, i) { cs[i] = { cellWidth: k.w || Math.max(40, sisa / Math.max(1, tanpaW)), halign: k.kanan ? 'right' : k.tengah ? 'center' : 'left' }; if (k.nowrap) cs[i].overflow = 'ellipsize'; });
      this.cukup(48);
      this.doc.autoTable({
        startY: this.y, head: [kolom.map(function (k) { return aman(k.judul); })], body: baris.map(function (r) { var a = r.map(function (c) { return c && typeof c === 'object' ? Object.assign({}, c, { content: aman(c.content) }) : aman(c); }); a.__grup = r.__grup; a.__alert = r.__alert; a.__redup = r.__redup; return a; }),
        foot: kaki ? [kaki.map(function (c) { return c && typeof c === 'object' ? Object.assign({}, c, { content: aman(c.content) }) : aman(c); })] : undefined, showFoot: 'lastPage', showHead: 'everyPage',
        theme: 'grid', margin: { top: 46, bottom: 52, left: this.M, right: this.M }, tableWidth: this.L, rowPageBreak: 'avoid',
        styles: { font: 'helvetica', fontSize: o.kecil ? 7.6 : 8.4, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 }, lineColor: RGB.garis, lineWidth: .5, textColor: RGB.teks, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: RGB.tint, textColor: RGB.gelap, fontStyle: 'bold', fontSize: o.kecil ? 7.4 : 7.9, valign: 'middle' },
        footStyles: { fillColor: P, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [251, 252, 255] }, columnStyles: cs,
        didParseCell: function (dc) {
          if (dc.section !== 'body') return; var raw = dc.row.raw || {};
          if (raw.__grup) { dc.cell.styles.fillColor = [240, 245, 253]; dc.cell.styles.fontStyle = 'bold'; dc.cell.styles.textColor = RGB.gelap; if (dc.column.index === 0) dc.cell.styles.halign = 'left'; }
          if (raw.__alert) { dc.cell.styles.fillColor = RGB.bahayaT; if (dc.column.index > 0) dc.cell.styles.textColor = RGB.bahaya; }
          if (raw.__redup) { dc.cell.styles.textColor = [150, 160, 178]; dc.cell.styles.fontStyle = 'italic'; }
        },
        didDrawPage: function (dp) { if (dp.pageNumber > 1 || self.doc.internal.getCurrentPageInfo().pageNumber > 1) self.kopLanjut(); }
      });
      this.y = this.doc.lastAutoTable.finalY + 12;
    },
    tinggiTeks: function (label, isi) { if (!isi) return 0; this.huruf(8.4, false); return (label ? 12 : 0) + this.doc.splitTextToSize(aman(isi), this.L).length * 10.5 + 8; },
    teks: function (label, isi, tone) {
      if (!isi) return; var d = this.doc; this.huruf(8.4, false); var l = d.splitTextToSize(aman(isi), this.L - (label ? 0 : 0)); this.cukup(16 + l.length * 10.5);
      if (label) { this.huruf(7.6, true, tone === 'bahaya' ? RGB.bahaya : RGB.muted); d.text(aman(label.toUpperCase()), this.M, this.y + 8); this.y += 12; }
      this.huruf(8.4, false, tone === 'bahaya' ? RGB.bahaya : RGB.teks); d.text(l, this.M, this.y + 8); this.y += l.length * 10.5 + 8;
    },
    /** Blok tanda tangan: [{peran, nama, ket}] */
    ttd: function (list) {
      var d = this.doc, n = list.length, w = this.L / n, self = this; if (this.y + 84 > this.H - 40) this.baru(); var y0 = this.y + 6;
      list.forEach(function (t, i) {
        var cx = self.M + w * i + w / 2;
        self.huruf(8.2, false, RGB.muted); d.text(aman(t.peran), cx, y0 + 8, { align: 'center' });
        self.warna(RGB.muted, 'd'); d.setLineWidth(.6); d.line(cx - 70, y0 + 54, cx + 70, y0 + 54); d.setLineWidth(.5);
        self.huruf(9, true); d.text(aman(t.nama || '(..............................)'), cx, y0 + 65, { align: 'center' });
        if (t.ket) { self.huruf(7.6, false, RGB.muted); d.text(aman(t.ket), cx, y0 + 74, { align: 'center' }); }
      });
      this.y = y0 + 80;
    },
    selesai: function (nama) {
      var d = this.doc, n = d.internal.getNumberOfPages(), M = this.M, me = Store.me || {}, cetak = U.tglId(U.hariIni()) + ' ' + U.nowIso().slice(11, 16) + ' WIB';
      for (var i = 1; i <= n; i++) {
        d.setPage(i);
        if (this.o.watermark) { d.saveGraphicsState(); if (d.GState) d.setGState(new d.GState({ opacity: .07 })); this.huruf(this.o.lanskap ? 90 : 80, true, this.o.watermarkWarna || RGB.bahaya); d.text(aman(this.o.watermark), this.W / 2, this.H / 2 + 30, { align: 'center', angle: 28 }); d.restoreGraphicsState(); }
        this.warna(RGB.garis, 'd'); d.line(M, this.H - 34, this.W - M, this.H - 34);
        this.huruf(7.2, false, RGB.muted); d.text(aman('Dicetak ' + cetak + (me.nama ? ' oleh ' + me.nama : '') + ' · ' + (this.S.APP_NAMA || '') + (this.o.rahasia ? ' · Dokumen internal' : '')), M, this.H - 22);
        d.text('Halaman ' + i + ' dari ' + n, this.W - M, this.H - 22, { align: 'right' });
      }
      d.save(aman(nama).replace(/[\\/:*?"<>|]/g, '-') + '.pdf');
    }
  };
  async function siapPdf() {
    if (window.PRATINJAU) { UI.toast('Pratinjau ini tidak mengizinkan cetak & unduh — fitur ini berfungsi penuh di versi GitHub Pages.', 'info'); return false; }
    await muat(CDN.jspdf); await muat(CDN.autotable); return true;
  }
  function itemsBudget(idB) { return U.urutkan(Store.D.Budget_Item.filter(function (i) { return i.ID_Budget === idB; }), function (i) { return i.Urutan; }); }
  function urutKategori(nama) { var o = {}; Store.D.Kategori_Biaya.forEach(function (k, i) { o[k.Nama] = +k.Urutan || i; }); return o[nama] !== undefined ? o[nama] : 99; }

  /** RAB per trip (versi tertentu), dikelompokkan per kategori. */
  async function laporanRAB(idTrip, idBudget) {
    if (!(await siapPdf())) return;
    var t = Store.get('Trip', idTrip), h = Store.get('Budget_Header', idBudget), ix = HT.indeks(Store.D), r = HT.rekapTrip(Store.D, ix, t, U.hariIni());
    var its = itemsBudget(idBudget), kel = U.kelompok(its, 'Kategori'), kats = Object.keys(kel).sort(function (a, b) { return urutKategori(a) - urutKategori(b); });
    var aktif = h.Status === 'Aktif', est = r.pendapatan - h.Total;
    var p = new Pdf({ judul: 'Rencana Anggaran Biaya', sub: t.Nama, nomor: 'RAB ' + t.Kode + ' · Versi ' + h.Versi, watermark: aktif || h.Status === 'Digantikan' ? (h.Status === 'Digantikan' ? 'DIGANTIKAN' : '') : h.Status.toUpperCase(), watermarkWarna: RGB.warn });
    p.info([['Kode trip', t.Kode], ['Jadwal', U.rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang)], ['Peserta terdaftar', r.pax + ' / ' + t.Kuota + ' pax'], ['Versi & status', 'v' + h.Versi + ' · ' + h.Status], ['Disusun', (h.Dibuat_Oleh || '-') + ' · ' + U.tglId(String(h.Tgl_Dibuat).slice(0, 10))], ['Disetujui Finance', h.Disetujui_Oleh && aktif ? h.Disetujui_Oleh + ' · ' + U.tglId(String(h.Tgl_Disetujui).slice(0, 10)) : 'Belum disetujui']], 3);
    if (!aktif) p.pita(h.Status === 'Digantikan' ? 'Versi ini sudah digantikan versi yang lebih baru — hanya untuk arsip.' : 'RAB versi ' + h.Versi + ' berstatus ' + h.Status + ' — belum berlaku sampai disetujui Finance.', 'warn');
    p.kpi([{ label: 'Total RAB', nilai: U.rp(h.Total) }, { label: 'Pendapatan trip', nilai: U.rp(r.pendapatan) }, { label: 'Estimasi laba', nilai: U.rp(est), tone: est < 0 ? 'bahaya' : 'ok' }, { label: 'Biaya per pax', nilai: U.rp(r.pax ? h.Total / r.pax : 0) }]);
    var baris = [], no = 0;
    kats.forEach(function (k, ki) {
      var sub = U.jumlah(kel[k], function (i) { return i.Subtotal; }), g = [{ content: (ki + 1) + '. ' + k + '  (' + kel[k].length + ' item)', colSpan: 5 }, { content: U.rp(sub) }]; g.__grup = true; baris.push(g);
      kel[k].forEach(function (i, j) { no++; baris.push([(ki + 1) + '.' + (j + 1), i.Uraian + (i.Keterangan ? '\n' + i.Keterangan : ''), String(i.Qty), i.Satuan, U.rp(i.Harga_Satuan), U.rp(i.Subtotal)]); });
    });
    p.bagian('Rincian anggaran', no + ' item · ' + kats.length + ' kategori');
    p.tabel([{ judul: 'No', w: 34, tengah: true }, { judul: 'Uraian kebutuhan / keterangan' }, { judul: 'Qty', w: 36, kanan: true }, { judul: 'Satuan', w: 64 }, { judul: 'Harga satuan', w: 86, kanan: true }, { judul: 'Subtotal', w: 92, kanan: true }], baris, [{ content: 'GRAND TOTAL RAB v' + h.Versi, colSpan: 5 }, U.rp(h.Total)]);
    p.cukup(p.tinggiTeks('x', h.Alasan_Revisi) + p.tinggiTeks('x', h.Catatan_Keputusan) + 86);
    if (h.Alasan_Revisi) p.teks('Alasan / catatan versi', h.Alasan_Revisi);
    if (h.Catatan_Keputusan) p.teks('Catatan keputusan Finance', h.Catatan_Keputusan, h.Status === 'Ditolak' ? 'bahaya' : '');
    p.ttd([{ peran: 'Disusun oleh (Admin)', nama: h.Dibuat_Oleh, ket: U.tglId(String(h.Tgl_Dibuat).slice(0, 10)) }, { peran: 'Disetujui oleh (Finance)', nama: aktif ? h.Disetujui_Oleh : '', ket: aktif ? U.tglId(String(h.Tgl_Disetujui).slice(0, 10)) : 'menunggu persetujuan' }]);
    p.selesai('RAB ' + t.Kode + ' v' + h.Versi);
  }

  /** Laporan realisasi anggaran: RAB vs realisasi per kategori + rincian nota + status audit. */
  async function laporanRealisasi(idTrip) {
    if (!(await siapPdf())) return;
    var t = Store.get('Trip', idTrip), ix = HT.indeks(Store.D), r = HT.rekapTrip(Store.D, ix, t, U.hariIni()), kat = HT.rabVsRealisasi(ix, idTrip);
    var nota = U.urutkan(ix.rlsPerTrip[idTrip] || [], function (x) { return x.Tanggal + x.ID_Realisasi; });
    var p = new Pdf({ judul: 'Laporan Realisasi Anggaran', sub: t.Nama, nomor: t.Kode + ' · RAB v' + r.versiBudget, watermark: r.final ? '' : r.statusAudit === 'Diajukan' ? 'DALAM AUDIT' : 'DRAFT', watermarkWarna: RGB.warn });
    p.info([['Jadwal trip', U.rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang)], ['Peserta', r.pax + ' pax · ' + r.booking + ' booking'], ['Status laporan', r.statusAudit], ['Dilaporkan', r.dilaporOleh ? r.dilaporOleh + ' · ' + U.tglId(r.tglLapor.slice(0, 10)) : 'Belum dilaporkan'], ['Diaudit Finance', r.diverifikasiOleh ? r.diverifikasiOleh + ' · ' + U.tglId(r.tglVerifikasi.slice(0, 10)) : '-'], ['Final', r.final ? U.tglId(r.tglFinal.slice(0, 10)) : 'Belum']], 3);
    if (r.overBudget) p.pita('MELEBIHI RAB ' + U.rp(r.lebih) + ' (' + F2(r.lebihPersen) + '%) — kerugian anggaran pada trip ini.' + (r.rugi ? ' Trip mencatat RUGI ' + U.rp(r.laba) + '.' : ''), 'bahaya');
    else if (r.final) p.pita('Final — disetujui Finance. Realisasi dalam RAB, hemat ' + U.rp(r.budget - r.realisasi) + '.', 'ok');
    p.kpi([{ label: 'RAB disetujui', nilai: U.rp(r.budget) }, { label: 'Realisasi diakui', nilai: U.rp(r.realisasi), tone: r.overBudget ? 'bahaya' : '' }, { label: r.overBudget ? 'Melebihi RAB' : 'Hemat', nilai: U.rp(Math.abs(r.budget - r.realisasi)), tone: r.overBudget ? 'bahaya' : 'ok' }, { label: 'Laba ' + (r.final ? 'final' : 'estimasi'), nilai: U.rp(r.laba), tone: r.laba < 0 ? 'bahaya' : 'ok' }]);
    p.bagian('RAB vs realisasi per kategori');
    p.tabel([{ judul: 'Kategori' }, { judul: 'RAB', w: 96, kanan: true }, { judul: 'Realisasi', w: 96, kanan: true }, { judul: 'Selisih', w: 96, kanan: true }, { judul: 'Serapan', w: 56, kanan: true }],
      kat.map(function (k) { var a = [k.kategori + (k.diLuarRab ? ' (di luar RAB)' : ''), U.rp(k.rab), U.rp(k.realisasi), (k.over ? '+' + U.rp(-k.selisih) + ' lebih' : U.rp(k.selisih)), k.rab ? k.persen + '%' : '-']; a.__alert = k.over; return a; }),
      ['TOTAL', U.rp(r.budget), U.rp(r.realisasi), r.overBudget ? '+' + U.rp(r.lebih) + ' lebih' : U.rp(r.budget - r.realisasi), r.budget ? Math.round(r.realisasi / r.budget * 100) + '%' : '-']);
    p.bagian('Rincian nota realisasi', nota.length + ' nota' + (r.notaDitolak ? ' · ' + r.notaDitolak + ' ditolak (tidak dihitung)' : ''));
    p.tabel([{ judul: 'No', w: 26, tengah: true }, { judul: 'Tanggal', w: 62 }, { judul: 'Kategori', w: 100 }, { judul: 'Uraian & catatan' }, { judul: 'Status', w: 62 }, { judul: 'Nominal', w: 84, kanan: true }],
      nota.map(function (n, i) { var a = [String(i + 1), U.tglId(n.Tanggal), n.Kategori, n.Uraian + (n.Catatan ? '\n' + n.Catatan : '') + (n.Catatan_Verifikasi ? '\nFinance: ' + n.Catatan_Verifikasi : ''), n.Status, U.rp(n.Nominal)]; a.__redup = n.Status === 'Ditolak'; return a; }),
      [{ content: 'TOTAL REALISASI DIAKUI', colSpan: 5 }, U.rp(r.realisasi)], { kecil: nota.length > 25 });
    p.cukup(p.tinggiTeks('x', r.penjelasan) + p.tinggiTeks('x', r.catatanAudit) + 86);
    if (r.penjelasan) p.teks('Penjelasan Admin atas selisih', r.penjelasan, r.overBudget ? 'bahaya' : '');
    if (r.catatanAudit) p.teks('Catatan audit Finance', r.catatanAudit);
    p.ttd([{ peran: 'Dilaporkan oleh (Admin)', nama: r.dilaporOleh, ket: r.tglLapor ? U.tglId(r.tglLapor.slice(0, 10)) : '' }, { peran: 'Diaudit & disetujui (Finance)', nama: r.final ? r.diverifikasiOleh : '', ket: r.final ? U.tglId(r.tglFinal.slice(0, 10)) : 'belum final' }]);
    p.selesai('Realisasi ' + t.Kode);
  }
  function F2(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }

  /** Rekap operasional semua trip (lanskap). */
  async function laporanRekap(lr, periode) {
    if (!(await siapPdf())) return;
    var b = lr.baris, over = b.filter(function (r) { return r.overBudget; });
    var p = new Pdf({ judul: 'Rekapitulasi Operasional Trip', sub: 'Periode ' + periode, lanskap: true });
    p.kpi([{ label: 'Total pendapatan', nilai: U.rp(lr.total.pendapatan) }, { label: 'Total RAB aktif', nilai: U.rp(U.jumlah(b, function (r) { return r.budget; })) }, { label: 'Total realisasi', nilai: U.rp(U.jumlah(b, function (r) { return r.realisasi; })) }, { label: 'Laba (final + estimasi)', nilai: U.rp(lr.total.laba), tone: lr.total.laba < 0 ? 'bahaya' : 'ok' }, { label: 'Trip melebihi RAB', nilai: over.length + ' trip · ' + U.rpRingkas(U.jumlah(over, function (r) { return r.lebih; })), tone: over.length ? 'bahaya' : 'ok' }]);
    if (over.length) p.pita('Melebihi RAB: ' + over.map(function (r) { return r.trip.Kode + ' +' + U.rp(r.lebih); }).join(' · '), 'bahaya');
    p.tabel([{ judul: 'Trip' }, { judul: 'Pax', w: 32, kanan: true }, { judul: 'Pendapatan', w: 84, kanan: true }, { judul: 'RAB aktif', w: 84, kanan: true }, { judul: 'Realisasi', w: 84, kanan: true }, { judul: 'Selisih RAB', w: 84, kanan: true }, { judul: 'Laba', w: 84, kanan: true }, { judul: 'Margin', w: 46, kanan: true }, { judul: 'Status realisasi', w: 92 }],
      b.map(function (r) { var a = [r.trip.Nama + '\n' + r.trip.Kode + ' · ' + U.rentangTgl(r.trip.Tgl_Berangkat, r.trip.Tgl_Pulang), String(r.pax), U.rp(r.pendapatan), U.rp(r.budget) + (r.versiBudget ? '\nv' + r.versiBudget + (r.budgetDraft ? ' ' + r.budgetStatus : '') : ''), r.adaRealisasi ? U.rp(r.realisasi) : '-', r.adaRealisasi ? (r.overBudget ? '+' + U.rp(r.lebih) : '-' + U.rp(r.selisih)) : 'estimasi', U.rp(r.laba), F2(r.margin) + '%', r.statusAudit + (r.rugi ? '\nRUGI' : '')]; a.__alert = r.overBudget || r.rugi; return a; }),
      ['TOTAL ' + b.length + ' TRIP', String(lr.total.pax), U.rp(lr.total.pendapatan), U.rp(U.jumlah(b, function (r) { return r.budget; })), U.rp(U.jumlah(b, function (r) { return r.realisasi; })), '+' + U.rp(lr.total.lebih), U.rp(lr.total.laba), F2(lr.total.margin) + '%', '']);
    p.teks('Keterangan', 'Selisih RAB: tanda minus = hemat, tanda plus = melebihi RAB (kerugian anggaran). Trip tanpa realisasi memakai RAB sebagai estimasi biaya. Hanya trip berstatus Final yang masuk laporan laba rugi resmi.');
    p.selesai('Rekap Operasional ' + periode);
  }

  /** Laporan laba rugi resmi (hanya trip final). */
  async function laporanLabaRugi(lr, periode) {
    if (!(await siapPdf())) return;
    var t = lr.total, kat = Object.keys(lr.kategori).sort(function (a, b) { return lr.kategori[b] - lr.kategori[a]; });
    var p = new Pdf({ judul: 'Laporan Laba Rugi', sub: 'Periode ' + periode, nomor: 'Berdasarkan realisasi final yang diaudit Finance' });
    p.kpi([{ label: t.laba >= 0 ? 'Laba bersih' : 'Rugi bersih', nilai: U.rp(t.laba) }, { label: 'Pendapatan', nilai: U.rp(t.pendapatan) }, { label: 'Beban pokok', nilai: U.rp(t.biaya) }, { label: 'Margin', nilai: F2(t.margin) + '%', tone: t.margin < 0 ? 'bahaya' : 'ok' }]);
    p.bagian('Laporan laba rugi', t.trip + ' trip final · ' + t.pax + ' pax');
    var stmt = [], g1 = ['Pendapatan penjualan trip', U.rp(t.pendapatan), '100%']; g1.__grup = true; stmt.push(g1);
    kat.forEach(function (k) { stmt.push(['    Beban ' + k, '(' + U.rp(lr.kategori[k]) + ')', F2(t.pendapatan ? lr.kategori[k] / t.pendapatan * 100 : 0) + '%']); });
    var g2 = ['Total beban pokok perjalanan', '(' + U.rp(t.biaya) + ')', F2(t.pendapatan ? t.biaya / t.pendapatan * 100 : 0) + '%']; g2.__grup = true; stmt.push(g2);
    p.tabel([{ judul: 'Pos' }, { judul: 'Jumlah (Rp)', w: 130, kanan: true }, { judul: '% pendapatan', w: 80, kanan: true }], stmt, [(t.laba >= 0 ? 'LABA' : 'RUGI') + ' BERSIH', U.rp(t.laba), F2(t.margin) + '%']);
    if (t.over) p.pita(t.over + ' trip final melebihi RAB — total kerugian anggaran ' + U.rp(t.lebih) + '.', 'bahaya');
    p.bagian('Rincian per trip (final)');
    p.tabel([{ judul: 'Trip' }, { judul: 'Pax', w: 30, kanan: true }, { judul: 'Pendapatan', w: 76, kanan: true }, { judul: 'Biaya final', w: 76, kanan: true }, { judul: 'Laba', w: 76, kanan: true }, { judul: 'Margin', w: 44, kanan: true }, { judul: 'Catatan', w: 66 }],
      lr.baris.map(function (r) { var a = [r.trip.Nama + '\n' + r.trip.Kode + ' · ' + U.tglId(r.trip.Tgl_Berangkat), String(r.pax), U.rp(r.pendapatan), U.rp(r.biaya), U.rp(r.laba), F2(r.margin) + '%', r.overBudget ? 'Melebihi RAB +' + U.rpRingkas(r.lebih) : r.laba < 0 ? 'Rugi' : 'Sesuai RAB']; a.__alert = r.overBudget || r.laba < 0; return a; }),
      ['TOTAL', String(t.pax), U.rp(t.pendapatan), U.rp(t.biaya), U.rp(t.laba), F2(t.margin) + '%', '']);
    if (lr.tertunda.length) {
      p.bagian('Belum masuk laporan (estimasi, tidak dihitung)', lr.tertunda.length + ' trip');
      p.tabel([{ judul: 'Trip' }, { judul: 'Status realisasi', w: 96 }, { judul: 'Pendapatan', w: 84, kanan: true }, { judul: 'Est. biaya', w: 84, kanan: true }, { judul: 'Est. laba', w: 84, kanan: true }],
        lr.tertunda.map(function (r) { var a = [r.trip.Nama + ' · ' + r.trip.Kode, r.statusAudit, U.rp(r.pendapatan), U.rp(r.biaya), U.rp(r.laba)]; a.__redup = true; return a; }), null, { kecil: true });
    }
    p.ttd([{ peran: 'Disiapkan oleh (Finance)', nama: (Store.me || {}).nama, ket: U.tglId(U.hariIni()) }, { peran: 'Mengetahui (Pimpinan)', nama: '', ket: '' }]);
    p.selesai('Laba Rugi ' + periode);
  }

  /** Manifest peserta: per trip (lanskap) atau per customer (potret). */
  async function pdfManifest(opsi) {
    if (!(await siapPdf())) return;
    var d = HT.dataManifest(Store.D, opsi, Store.S), v = d.nilai, satu = !!opsi.idPenjualan, t = d.trip;
    var mf = satu ? (HT.indeks(Store.D).mnfPerPj[opsi.idPenjualan] || {}) : {};
    var p = new Pdf({ judul: satu ? 'Manifest Peserta' : 'Manifest Trip', sub: t.Nama, nomor: t.Kode + (satu && mf.Versi ? ' · versi ' + mf.Versi + ' · ' + mf.Status : ''), lanskap: !satu, rahasia: true, watermark: satu && mf.Status && mf.Status !== 'Final' ? 'DRAFT' : '', watermarkWarna: RGB.warn });
    p.info(satu ? [['Pemesan', v.NAMA_CUSTOMER], ['Jadwal', v.JADWAL], ['Jumlah peserta', v.TOTAL_PAX], ['Meeting point', v.MEETING_POINT], ['Akomodasi', v.AKOMODASI], ['Kontak darurat', v.KONTAK_DARURAT]]
      : [['Jadwal', v.JADWAL], ['Meeting point', v.MEETING_POINT], ['Akomodasi', v.AKOMODASI], ['Total peserta', v.TOTAL_PAX + ' · ' + v.JUMLAH_BOOKING + ' booking']], satu ? 3 : 4);
    var kol = satu ? [{ judul: 'No', w: 22, tengah: true }, { judul: 'Nama peserta', w: 100 }, { judul: 'No. identitas', w: 86 }, { judul: 'L/P', w: 24, tengah: true }, { judul: 'Tgl lahir', w: 56 }, { judul: 'No. HP', w: 70 }, { judul: 'Kamar', w: 58 }, { judul: 'Catatan' }]
      : [{ judul: 'No', w: 24, tengah: true }, { judul: 'Nama peserta', w: 130 }, { judul: 'Booking (pemesan)', w: 110 }, { judul: 'No. identitas', w: 104 }, { judul: 'L/P', w: 26, tengah: true }, { judul: 'Tgl lahir', w: 64 }, { judul: 'No. HP', w: 84 }, { judul: 'Kamar', w: 62 }, { judul: 'Baju', w: 34, tengah: true }, { judul: 'Catatan' }];
    var belum = 0;
    p.tabel(kol, d.rows.map(function (r) { var a = satu ? [r.NO, r.NAMA, r.IDENTITAS, r.GENDER, r.TGL_LAHIR, r.HP, r.KAMAR, r.CATATAN] : [r.NO, r.NAMA, r.BOOKING, r.IDENTITAS, r.GENDER, r.TGL_LAHIR, r.HP, r.KAMAR, r.BAJU, r.CATATAN]; if (r.NAMA === '(belum diisi)') { a.__alert = true; belum++; } return a; }));
    if (belum) p.pita(belum + ' peserta belum diisi datanya.', 'warn');
    p.teks('', 'Dokumen internal berisi data pribadi peserta. Jangan disebarluaskan. Kamar & ukuran baju mengikuti data rooming terakhir.');
    p.selesai('Manifest ' + (satu ? v.NAMA_CUSTOMER + ' ' : '') + t.Kode);
  }

  /** Kompatibilitas: tabel sederhana dengan kop & nomor halaman. */
  async function pdfTabel(nama, judul, sub, kepala, baris, o) {
    if (!(await siapPdf())) return; o = o || {};
    var p = new Pdf({ judul: judul, sub: sub, lanskap: o.lanskap });
    if (o.ringkas) p.kpi(o.ringkas.map(function (r) { return { label: r[0], nilai: r[1] }; }));
    p.tabel(kepala.map(function (k, i) { return { judul: k, kanan: !!(o.kolomKanan && o.kolomKanan[i]) }; }), baris, o.kaki);
    p.selesai(nama);
  }

  window.Dok = { invoiceHTML: invoiceHTML, kuitansiHTML: kuitansiHTML, manifestHTML: manifestHTML, cetak: cetak, pratinjau: pratinjau, skala: skala, bukaPdf: bukaPdf, excel: excel, pdfTabel: pdfTabel, laporanRAB: laporanRAB, laporanRealisasi: laporanRealisasi, laporanRekap: laporanRekap, laporanLabaRugi: laporanLabaRugi, pdfManifest: pdfManifest, qrSvg: qrSvg, verifUrl: verifUrl, muat: muat, CDN: CDN };
})();
