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
    var ix = HT.indeks(Store.D), r = HT.ringkasPj(Store.D, ix, pj, U.hariIni(), S);
    return '<div class="paper" id="paper" style="padding:40px 48px"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #DDE6F3;padding-bottom:14px"><div style="display:flex;gap:10px;align-items:center">' + logo(S) + '<div><b style="font-size:16px">' + esc(S.PT_NAMA) + '</b><div class="muted" style="font-size:11.5px">' + esc(S.PT_ALAMAT) + '</div></div></div><div style="text-align:right"><h1 style="font-size:26px">KUITANSI</h1><div class="mono" style="color:#1E6FEB;font-weight:800">' + esc(b.ID_Bayar) + '</div></div></div>' +
      '<table style="margin-top:18px"><tbody><tr><td class="muted" style="width:200px">Telah terima dari</td><td><b>' + esc(c.Nama) + '</b></td></tr><tr><td class="muted">Uang sejumlah</td><td><b style="font-size:20px;color:#1E6FEB" class="num">' + U.rp(b.Nominal) + '</b><div style="font-style:italic;color:#4A5B78">' + U.terbilang(b.Nominal) + ' rupiah</div></td></tr>' +
      '<tr><td class="muted">Untuk pembayaran</td><td>' + esc(b.Jenis) + ' — ' + esc(t.Nama) + ' (' + pj.Jumlah_Pax + ' pax, ' + U.rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang) + ')</td></tr><tr><td class="muted">Tanggal & metode</td><td>' + U.tglPanjang(b.Tanggal) + ' · ' + esc(b.Metode) + '</td></tr>' +
      '<tr><td class="muted">Total transaksi</td><td class="num">' + U.rp(r.total) + ' · terbayar ' + U.rp(r.bayar) + ' · <b>sisa ' + U.rp(r.sisa) + '</b></td></tr></tbody></table>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:24px"><div style="text-align:center"><div class="muted" style="font-size:11.5px">' + esc((S.PT_ALAMAT || '').split(',').pop().trim()) + ', ' + U.tglPanjang(b.Tanggal) + '</div><img src="' + esc(S.TTD_URL || 'assets/ttd-spesimen.png') + '" alt="" style="height:48px;margin:6px auto 0"><b style="display:block">' + esc(S.TTD_NAMA) + '</b><span class="muted" style="font-size:11px">' + esc(S.TTD_JABATAN) + '</span></div></div></div>';
  }

  function manifestHTML(opsi) {
    var S = Store.S, d = HT.dataManifest(Store.D, opsi, S), v = d.nilai, satu = !!opsi.idPenjualan;
    var kol = satu ? ['No', 'Nama peserta', 'Identitas', 'L/P', 'Tgl lahir', 'No. HP', 'Kamar', 'Catatan'] : ['No', 'Nama peserta', 'Booking', 'Identitas', 'No. HP', 'Kamar', 'Baju', 'Catatan'];
    var rows = d.rows.map(function (r) { var c = satu ? [r.NO, r.NAMA, r.IDENTITAS, r.GENDER, r.TGL_LAHIR, r.HP, r.KAMAR, r.CATATAN] : [r.NO, r.NAMA, r.BOOKING, r.IDENTITAS, r.HP, r.KAMAR, r.BAJU, r.CATATAN]; return '<tr>' + c.map(function (x, i) { return '<td' + (i === 1 ? ' style="font-weight:700"' : '') + (r.NAMA === '(belum diisi)' ? ' style="color:#B45309"' : '') + '>' + esc(x) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="paper" id="paper"><div style="display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid #DDE6F3;padding-bottom:14px"><div style="display:flex;gap:10px;align-items:center">' + logo(S) + '<div><b style="font-size:16px">' + esc(S.APP_NAMA) + '</b><div class="muted" style="font-size:11.5px">' + esc(S.PT_NAMA) + '</div></div></div><div style="text-align:right"><h1 style="font-size:24px">' + esc(v.JUDUL) + '</h1><div class="muted" style="font-size:12px">Dicetak ' + esc(v.TGL_CETAK) + '</div></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(' + (satu ? 3 : 4) + ',1fr);gap:10px;margin:16px 0">' + [['Trip', v.NAMA_TRIP], ['Jadwal', v.JADWAL], ['Meeting point', v.MEETING_POINT]].concat(satu ? [['Pemesan', v.NAMA_CUSTOMER], ['Kontak darurat', v.KONTAK_DARURAT], ['Jumlah', v.TOTAL_PAX]] : [['Akomodasi', v.AKOMODASI], ['Total peserta', v.TOTAL_PAX + ' · ' + v.JUMLAH_BOOKING + ' booking']]).map(function (k) { return '<div class="box" style="padding:10px 12px"><div class="label" style="color:#4A5B78;font-size:10px">' + k[0] + '</div><b style="font-size:13px">' + esc(k[1]) + '</b></div>'; }).join('') + '</div>' +
      '<table><thead><tr>' + kol.map(function (k) { return '<th>' + k + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function cetak(html) {
    if (window.PRATINJAU) { UI.toast('Pratinjau ini tidak mengizinkan cetak & unduh — fitur ini berfungsi penuh di versi GitHub Pages.', 'info'); return; }
    var root = document.querySelector('.print-root'); if (!root) { root = document.createElement('div'); root.className = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = html; setTimeout(function () { window.print(); }, 60);
  }
  function pratinjau(judul, html, o) {
    o = o || {};
    var h = UI.modal({ judul: judul, sub: o.sub || '', ukuran: 'xl', isi: '<div class="paper-stage" id="pv-stage">' + html + '</div>',
      aksi: (o.aksi || []).concat([{ label: 'Cetak / Simpan PDF', kelas: 'btn--primary', ikon: 'printer', tutup: false, klik: function () { cetak(html); } }]) });
    skala(h.el.querySelector('#pv-stage'));
    return h;
  }
  function skala(stage) {
    var p = stage && stage.querySelector('.paper'); if (!p) return;
    function atur() { var w = stage.clientWidth - 24; var k = Math.min(1, w / 794); p.style.transform = 'scale(' + k + ')'; p.style.marginBottom = (-(1 - k) * p.offsetHeight) + 'px'; }
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
  async function pdfTabel(nama, judul, sub, kepala, baris, o) {
    if (window.PRATINJAU) { UI.toast('Pratinjau ini tidak mengizinkan cetak & unduh — fitur ini berfungsi penuh di versi GitHub Pages.', 'info'); return; }
    o = o || {}; await muat(CDN.jspdf); await muat(CDN.autotable);
    var doc = new window.jspdf.jsPDF({ orientation: o.lanskap ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' }), S = Store.S, W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 111, 235); doc.roundedRect(40, 36, 30, 30, 7, 7, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text((S.APP_NAMA || 'Y').charAt(0).toUpperCase(), 55, 56, { align: 'center' });
    doc.setTextColor(15, 27, 51); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(S.APP_NAMA + ' — ' + judul, 80, 50);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(74, 91, 120); doc.text(sub, 80, 64); doc.text('Dicetak ' + U.tglPanjang(U.hariIni()) + ' oleh ' + Store.me.nama, W - 40, 50, { align: 'right' });
    var y = 84;
    if (o.ringkas) { o.ringkas.forEach(function (r, i) { var x = 40 + i * ((W - 80) / o.ringkas.length); doc.setFillColor(i === 0 ? 30 : 243, i === 0 ? 111 : 247, i === 0 ? 235 : 252); doc.roundedRect(x, y, (W - 80) / o.ringkas.length - 8, 46, 8, 8, 'F'); doc.setTextColor(i === 0 ? 255 : 74, i === 0 ? 255 : 91, i === 0 ? 255 : 120); doc.setFontSize(8); doc.text(r[0].toUpperCase(), x + 10, y + 16); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(i === 0 ? 255 : 15, i === 0 ? 255 : 27, i === 0 ? 255 : 51); doc.text(r[1], x + 10, y + 34); doc.setFont('helvetica', 'normal'); }); y += 62; }
    doc.autoTable({ startY: y, head: [kepala], body: baris, foot: o.kaki ? [o.kaki] : undefined, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 5, lineColor: [221, 230, 243], textColor: [15, 27, 51] },
      headStyles: { fillColor: [234, 242, 255], textColor: [15, 27, 51], fontStyle: 'bold' }, footStyles: { fillColor: [30, 111, 235], textColor: 255, fontStyle: 'bold' }, columnStyles: o.kolomKanan || {}, margin: { left: 40, right: 40 } });
    doc.save(nama.replace(/[\\/:*?"<>|]/g, '-') + '.pdf');
  }

  window.Dok = { invoiceHTML: invoiceHTML, kuitansiHTML: kuitansiHTML, manifestHTML: manifestHTML, cetak: cetak, pratinjau: pratinjau, skala: skala, bukaPdf: bukaPdf, excel: excel, pdfTabel: pdfTabel, qrSvg: qrSvg, verifUrl: verifUrl, muat: muat, CDN: CDN };
})();
