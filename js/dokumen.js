/* =====================================================================
   YukBanyuwangi — dokumen.js
   · Kanvas: satu deskripsi tata letak → dua keluaran identik:
       SVG (pratinjau di layar, skala responsif) & PDF (jsPDF, A4).
   · Invoice  = model "Invoice Deposit Lunas" klien (pita biru, 15 baris,
     NOTE rekening, SISA PEMBAYARAN kuning, syarat & ketentuan, kaki kontak).
   · Manifest = model "MANIFEST TRIP" klien (DATA TIM, DATA TAMU, CHECK LIST,
     CATATAN, ITINERARY, BUDGETING) + daftar peserta; teks & logo diatur Admin.
   · Laporan A4 (rekap lanskap, laba rugi, report) dengan jsPDF-AutoTable.
   · Excel rekap PERSIS template Dummy Rekapitulasi (ExcelJS) + Excel umum.
   Pustaka dimuat hanya saat dibutuhkan (cdnjs).
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, U = C.U, HT = C.HT;
  var CDN = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    exceljs: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
  };
  var dimuat = {};
  function muat(url) {
    if (dimuat[url]) return dimuat[url];
    return (dimuat[url] = new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = function () { delete dimuat[url]; gagal(new Error('Gagal memuat pustaka dokumen. Periksa koneksi internet.')); }; document.head.appendChild(s); }));
  }
  function bolehUnduh() { if (window.PRATINJAU) { UI.toast('Pratinjau ini tidak mengizinkan unduh — fitur ini berfungsi penuh di versi GitHub Pages.', 'info'); return false; } return true; }
  function qrSvg(teks, cell) { try { var q = qrcode(0, 'M'); q.addData(String(teks)); q.make(); return q.createSvgTag({ cellSize: cell || 3, margin: 0, scalable: true }); } catch (e) { return ''; } }
  function qrData(teks) { try { var q = qrcode(0, 'M'); q.addData(String(teks)); q.make(); return q.createDataURL(4, 0); } catch (e) { return ''; } }
  function verifUrl(S, kode) { var b = S.VERIF_URL || (location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '') + 'verifikasi.html'); return b + (b.indexOf('?') > -1 ? '&' : '?') + 'k=' + kode; }
  function unduhBlob(blob, nama) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function namaFile(s) { return String(s || 'dokumen').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim(); }

  // ---------------------------------------------------------------- gambar → dataURL (logo, tanda tangan, cap)
  var cacheGbr = {};
  function dataGambar(url) {
    if (!url) return Promise.resolve(null);
    if (/^data:image\//.test(url)) return Promise.resolve(url);
    if (cacheGbr[url]) return cacheGbr[url];
    return (cacheGbr[url] = fetch(url, { mode: 'cors', cache: 'force-cache' }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
      return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.onerror = function () { ok(null); }; f.readAsDataURL(b); });
    }).catch(function () {
      // Drive/lh3 tidak memberi header CORS → minta isi gambar lewat server (hanya aset aplikasi)
      if (C.DEMO || !/googleusercontent\.com|drive\.google\.com/.test(url)) return null;
      return C.api('aset.data', { url: url }, { senyap: true, tries: 2 }).then(function (r) { return r.success ? 'data:' + r.data.mime + ';base64,' + r.data.b64 : null; });
    }).then(function (d) { if (d && /^data:image\/(svg|webp)/.test(d)) return keRaster(d); return d; }).catch(function () { return null; }));
  }
  function keRaster(svgData) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.width * 2 || 256; c.height = im.height * 2 || 256; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/png')); }; im.onerror = function () { ok(null); }; im.src = svgData; }); }
  function ukuranGambar(data) { return new Promise(function (ok) { if (!data) return ok(null); var im = new Image(); im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = function () { ok(null); }; im.src = data; }); }

  // ================================================================ KANVAS (SVG & PDF dari satu tata letak)
  var ukur = document.createElement('canvas').getContext('2d');
  function lebarTeks(s, uk, tebal, miring) { ukur.font = (miring ? 'italic ' : '') + (tebal ? 'bold ' : '') + uk + 'px Helvetica, Arial, "Liberation Sans", sans-serif'; return ukur.measureText(String(s)).width; }
  var GANTI = { '→': '->', '←': '<-', '✓': 'v', '✔': 'v', '●': '•', '≥': '>=', '≤': '<=', '×': 'x', ' ': ' ', '′': "'", '″': '"' };
  function aman(s) { s = String(s == null ? '' : s).replace(/[→←✓✔●≥≤× ′″]/g, function (c) { return GANTI[c]; }); return s.replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ–—‘’“”•…€]/g, ''); }
  function pecah(teks, uk, tebal, maks) {
    var out = []; String(teks == null ? '' : teks).split('\n').forEach(function (par) {
      var kata = par.split(/\s+/).filter(function (x) { return x !== ''; }), baris = '';
      if (!kata.length) { out.push(''); return; }
      kata.forEach(function (k) {
        var coba = baris ? baris + ' ' + k : k;
        if (lebarTeks(coba, uk, tebal) <= maks || !baris) { if (!baris && lebarTeks(k, uk, tebal) > maks) { var pot = ''; k.split('').forEach(function (ch) { if (lebarTeks(pot + ch, uk, tebal) > maks) { out.push(pot); pot = ch; } else pot += ch; }); baris = pot; } else baris = coba; }
        else { out.push(baris); baris = k; }
      });
      out.push(baris);
    });
    return out;
  }
  function Kanvas(w, h) { this.w = w; this.h = h; this.hal = [[]]; }
  Kanvas.prototype = {
    op: function (o) { this.hal[this.hal.length - 1].push(o); return this; },
    halamanBaru: function () { this.hal.push([]); },
    kotak: function (x, y, w, h, o) { return this.op({ t: 'kotak', x: x, y: y, w: w, h: h, isi: (o || {}).isi || null, garis: (o || {}).garis || null, tebal: (o || {}).tebal || .6, r: (o || {}).r || 0 }); },
    garis: function (x1, y1, x2, y2, o) { return this.op({ t: 'garis', x1: x1, y1: y1, x2: x2, y2: y2, warna: (o || {}).warna || '#000000', tebal: (o || {}).tebal || .6 }); },
    gambar: function (data, x, y, w, h) { if (data) this.op({ t: 'gambar', d: data, x: x, y: y, w: w, h: h }); return this; },
    /** teks satu baris; o: {uk, tebal, miring, warna, rata} */
    teks: function (s, x, y, o) { o = o || {}; return this.op({ t: 'teks', s: aman(s), x: x, y: y, uk: o.uk || 9, tebal: !!o.tebal, miring: !!o.miring, warna: o.warna || '#000000', rata: o.rata || 'kiri' }); },
    /** paragraf terbungkus → tinggi yang dipakai */
    paragraf: function (s, x, y, lebar, o) { o = o || {}; var uk = o.uk || 9, lh = o.lh || uk * 1.35, b = pecah(aman(s), uk, o.tebal, lebar), self = this; b.forEach(function (l, i) { if (o.rata === 'rata' && i < b.length - 1) self.rataPenuh(l, x, y + i * lh, lebar, o); else self.teks(l, x, y + i * lh, Object.assign({}, o, { rata: o.rata === 'rata' ? 'kiri' : o.rata })); }); return b.length * lh; },
    /** satu baris rata kiri-kanan: kata diletakkan satu per satu → hasil SVG = PDF */
    rataPenuh: function (l, x, y, lebar, o) {
      var kata = String(l).split(/\s+/).filter(Boolean), uk = o.uk || 9, self = this; if (kata.length < 2) return this.teks(l, x, y, Object.assign({}, o, { rata: 'kiri' }));
      var w = kata.map(function (k) { return lebarTeks(k, uk, o.tebal); }), sisa = lebar - w.reduce(function (a, b) { return a + b; }, 0), gap = sisa / (kata.length - 1);
      if (gap > uk * 1.6) return this.teks(l, x, y, Object.assign({}, o, { rata: 'kiri' }));
      var cx = x; kata.forEach(function (k, i) { self.teks(k, cx, y, Object.assign({}, o, { rata: 'kiri' })); cx += w[i] + gap; });
    }
  };
  function svgDari(k) {
    return k.hal.map(function (ops) {
      return '<svg class="kertas-svg" viewBox="0 0 ' + k.w + ' ' + k.h + '" xmlns="http://www.w3.org/2000/svg" role="img" font-family="Helvetica, Arial, \'Liberation Sans\', sans-serif"><rect width="' + k.w + '" height="' + k.h + '" fill="#fff"/>' + ops.map(function (o) {
        if (o.t === 'kotak') return '<rect x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '"' + (o.r ? ' rx="' + o.r + '"' : '') + ' fill="' + (o.isi || 'none') + '"' + (o.garis ? ' stroke="' + o.garis + '" stroke-width="' + o.tebal + '"' : '') + '/>';
        if (o.t === 'garis') return '<line x1="' + o.x1 + '" y1="' + o.y1 + '" x2="' + o.x2 + '" y2="' + o.y2 + '" stroke="' + o.warna + '" stroke-width="' + o.tebal + '"/>';
        if (o.t === 'gambar') return '<image href="' + o.d + '" x="' + o.x + '" y="' + o.y + '" width="' + o.w + '" height="' + o.h + '" preserveAspectRatio="xMidYMid meet"/>';
        var anc = o.rata === 'kanan' ? 'end' : o.rata === 'tengah' ? 'middle' : 'start';
        return '<text x="' + o.x + '" y="' + o.y + '" font-size="' + o.uk + '"' + (o.tebal ? ' font-weight="700"' : '') + (o.miring ? ' font-style="italic"' : '') + ' fill="' + o.warna + '" text-anchor="' + anc + '" xml:space="preserve">' + esc(o.s) + '</text>';
      }).join('') + '</svg>';
    });
  }
  function hexRgb(h) { h = String(h || '#000000').replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  async function pdfDari(k) {
    await muat(CDN.jspdf);
    var d = new window.jspdf.jsPDF({ unit: 'pt', format: [k.w, k.h], orientation: k.w > k.h ? 'landscape' : 'portrait', compress: true });
    k.hal.forEach(function (ops, i) {
      if (i) d.addPage([k.w, k.h], k.w > k.h ? 'landscape' : 'portrait');
      ops.forEach(function (o) {
        if (o.t === 'kotak') {
          var m = o.isi && o.garis ? 'FD' : o.isi ? 'F' : 'S'; if (o.isi) d.setFillColor.apply(d, hexRgb(o.isi)); if (o.garis) { d.setDrawColor.apply(d, hexRgb(o.garis)); d.setLineWidth(o.tebal); }
          if (!o.isi && !o.garis) return; if (o.r) d.roundedRect(o.x, o.y, o.w, o.h, o.r, o.r, m); else d.rect(o.x, o.y, o.w, o.h, m);
        } else if (o.t === 'garis') { d.setDrawColor.apply(d, hexRgb(o.warna)); d.setLineWidth(o.tebal); d.line(o.x1, o.y1, o.x2, o.y2); }
        else if (o.t === 'gambar') { try { d.addImage(o.d, /^data:image\/jpe?g/.test(o.d) ? 'JPEG' : 'PNG', o.x, o.y, o.w, o.h, undefined, 'FAST'); } catch (e) { } }
        else {
          d.setFont('helvetica', o.tebal && o.miring ? 'bolditalic' : o.tebal ? 'bold' : o.miring ? 'italic' : 'normal'); d.setFontSize(o.uk); d.setTextColor.apply(d, hexRgb(o.warna));
          d.text(o.s, o.x, o.y, { align: o.rata === 'kanan' ? 'right' : o.rata === 'tengah' ? 'center' : 'left' });
        }
      });
    });
    return d;
  }
  /** gambar dipasang pas di kotak (rasio dijaga). */
  function pas(ukr, maxW, maxH) { if (!ukr) return { w: maxW, h: maxH }; var k = Math.min(maxW / ukr.w, maxH / ukr.h); return { w: ukr.w * k, h: ukr.h * k }; }

  // ================================================================ INVOICE (model klien)
  function rpAkun(n) { n = Math.round(Number(n) || 0); return n === 0 ? '-' : U.ribuan(n); }
  async function asetInvoice(S, bank) {
    var logo = await dataGambar(S.LOGO_URL || 'assets/logo-yb.png'), ttd = await dataGambar(S.INV_TTD_URL), cap = await dataGambar(S.INV_CAP_URL);
    var bl = await Promise.all((bank || []).map(function (b) { return dataGambar(b.logo); }));
    return { logo: logo, ttd: ttd, cap: cap, bank: bl, ukLogo: await ukuranGambar(logo), ukTtd: await ukuranGambar(ttd), ukCap: await ukuranGambar(cap), ukBank: await Promise.all(bl.map(ukuranGambar)) };
  }
  /** v: hasil HT.dataInvoice (atau draf dari form). Mengembalikan Kanvas A4. */
  async function tataInvoice(v, S) {
    S = S || Store.S; var W = 595.28, H = 841.89, k = new Kanvas(W, H), BIRU = S.INV_WARNA || '#0094C8', A = await asetInvoice(S, v.rekening);
    var X0 = 40, X1 = 571, inv = v.inv;
    // kop
    if (A.logo) { var lg = pas(A.ukLogo, 42, 42); k.gambar(A.logo, X0 + 6 + (42 - lg.w) / 2, 84 + (42 - lg.h) / 2, lg.w, lg.h); }
    var tx = 102;
    k.teks(S.PT_NAMA || '', tx, 90, { uk: 8.2, tebal: true });
    k.teks(S.PT_MEREK || '', tx, 101, { uk: 8.2, tebal: true, miring: true, warna: BIRU });
    k.teks(S.PT_ALAMAT || '', tx, 112, { uk: 8 });
    k.teks(S.PT_TELP ? 'Phone : ' + S.PT_TELP : '', tx, 122.5, { uk: 8 });
    k.teks(S.PT_WEB ? 'Website: ' + S.PT_WEB : '', 99, 133, { uk: 8 });
    k.teks(S.INV_JUDUL || 'INVOICE', 494, 120, { uk: 21, tebal: true, warna: BIRU, rata: 'tengah' });
    // BILL TO & nomor
    k.kotak(X0, 155, 161, 10.6, { isi: BIRU }); k.teks('BILL TO', X0 + 2, 163.3, { uk: 8, tebal: true, warna: '#ffffff' });
    (v.billTo || []).slice(0, 4).forEach(function (l, i) { var u = i ? 7.8 : 8.6; k.teks(pecah(aman(l), u, i === 0, 330)[0] || '', X0 + 2, 175 + i * 9.4, { uk: u, tebal: i === 0 }); });
    [['DATE', U.tglSlash(inv.Tanggal)], ['INVOICE #', inv.No_Invoice], ['CUSTOMER ID', inv.Customer_ID]].forEach(function (r, i) {
      var y = 155 + i * 10.6; k.teks(r[0], 486, y + 8, { uk: 7.6, rata: 'kanan' }); k.kotak(487, y, 84, 10.6, { garis: '#000000', tebal: .6 }); k.teks(r[1], 529, y + 8, { uk: 7.6, rata: 'tengah' });
    });
    // tabel 15 baris
    var cols = [X0, 368, 412, 487, X1], ty = 208, rh = 11.07, nb = Math.max(1, Number(S.INV_BARIS) || 15);
    k.kotak(X0, ty, X1 - X0, 10.6, { isi: BIRU });
    [['DESCRIPTION', 204], ['Quantity', 390], ['Price', 449.5], ['Total', 529]].forEach(function (h) { k.teks(h[0], h[1], ty + 8, { uk: 8, tebal: true, warna: '#ffffff', rata: 'tengah' }); });
    var y0 = ty + 10.6;
    for (var i = 0; i < nb; i++) { if (i % 2 === 0) k.kotak(X0, y0 + i * rh, X1 - X0, rh, { isi: '#F2F2F2' }); }
    (v.items || []).slice(0, nb).forEach(function (it, i) {
      var y = y0 + i * rh + 8, tot = (Number(it.qty) || 0) * (Number(it.harga) || 0), d = pecah(aman(it.desk), 7.8, false, 322)[0] || '';
      k.teks(d, X0 + 3, y, { uk: 7.8 }); k.teks(String(it.qty || ''), 390, y, { uk: 7.8, rata: 'tengah' });
      k.teks('Rp', 415, y, { uk: 7.8 }); k.teks(rpAkun(it.harga), 484, y, { uk: 7.8, rata: 'kanan' });
      k.teks('Rp', 490, y, { uk: 7.8 }); k.teks(rpAkun(tot), 568, y, { uk: 7.8, rata: 'kanan' });
    });
    var yb = y0 + nb * rh;
    k.kotak(X0, y0, X1 - X0, yb - y0, { garis: '#000000', tebal: .7 });
    [cols[1], cols[2], cols[3]].forEach(function (x) { k.garis(x, y0, x, yb, { tebal: .7 }); });
    // ringkasan kanan (posisi & ukuran mengikuti PDF model klien)
    var ry = yb + 8.6, sisaLbl = S.INV_SISA_LABEL || 'SISA PEMBAYARAN';
    [['Subtotal', v.subtotal, true, 7.8], ['Disc', v.disc, !!v.disc, 7.8], ['TOTAL', v.total, true, 7.8], ['DP', v.dp, !!v.dp, 8.6]].forEach(function (r, i) {
      var y = ry + i * 11.05; k.teks(r[0], 413.5, y, { uk: r[3] }); if (r[2]) { k.teks('Rp', 491.7, y, { uk: 7.8 }); k.teks(rpAkun(r[1]), 558.7, y, { uk: 7.8, rata: 'kanan' }); } else if (i !== 1) k.teks('-', 558.7, y, { uk: 7.8, rata: 'kanan' });
    });
    var sy = ry + 35.9;
    k.kotak(411.8, sy, X1 + .4 - 411.8, 11.2, { isi: '#FFFF00' });
    k.garis(487.2, sy - .65, X1 + .4, sy - .65, { tebal: .7 }); k.garis(487.2, sy + .9, X1 + .4, sy + .9, { tebal: .7 });
    var ukS = 7.8; while (ukS > 6 && lebarTeks(sisaLbl, ukS, true) > 74) ukS -= .2; k.teks(sisaLbl, 413.5, sy + 8.3, { uk: ukS, tebal: true }); k.teks('Rp', 491.7, sy + 8.3, { uk: 7.8, tebal: true }); k.teks(v.sisa > 0 ? U.ribuan(v.sisa) : '-', 558.7, sy + 8.3, { uk: 7.8, tebal: true, rata: 'kanan' });
    // NOTE + rekening
    var ny = yb + 22.1, nx = X0 - .2, nw = 180.2;
    k.kotak(nx, ny, nw, 11.2, { isi: BIRU }); k.teks('NOTE :', nx + 1.6, ny + 8.7, { uk: 7.8, tebal: true, warna: '#ffffff' });
    k.teks(inv.Note_Judul || '', nx + 1.8, ny + 20, { uk: 8.6, tebal: true }); k.garis(nx, ny + 22.4, nx + nw, ny + 22.4, { tebal: .7 });
    var cy = ny + 30.7; cy += k.paragraf(inv.Note_Isi || S.INV_NOTE_TEKS || '', nx + 1.6, cy, 112, { uk: 7.8, lh: 9.3 }) - 9.3;
    (v.rekening || []).slice(0, 4).forEach(function (b, i) {
      var gb = A.bank[i]; cy += i ? 11 : 9.2;
      if (gb) { var gu = pas(A.ukBank[i], 44, 11); k.gambar(gb, nx + 3, cy - 8.6, gu.w, gu.h); } else k.teks(b.bank || '', nx + 4, cy, { uk: 7.8, tebal: true, miring: true, warna: '#1F4E9B' });
      k.teks(b.norek || '', nx + 54, cy, { uk: 7.8 });
    });
    cy += 11.1; k.teks('a.n ' + (S.INV_ATAS_NAMA || S.PT_NAMA || ''), nx + 1.7, cy, { uk: 7.8, tebal: true }); cy += 3.1;
    k.kotak(nx, ny, nw, cy - ny, { garis: '#000000', tebal: .7 });
    // tanda tangan & cap
    var sy2 = Math.max(cy + 33, sy + 70), tx0 = 432, ty0 = sy2 - 60;
    if (A.cap) { var cu = pas(A.ukCap, 48, 58); k.gambar(A.cap, tx0, ty0, cu.w, cu.h); }
    if (A.ttd) { var tu = pas(A.ukTtd, 70, 50); k.gambar(A.ttd, tx0 + 34, ty0 + 2, tu.w, tu.h); }
    k.teks(S.INV_TTD_LABEL || 'Finance', tx0 + 55, ty0 + 56, { uk: 7.6, rata: 'tengah' });
    if (S.INV_QR === 'YA' && inv.Kode_Verifikasi && inv.Status !== 'Draft') { var q = qrData(verifUrl(S, inv.Kode_Verifikasi)); if (q) { k.gambar(q, 520, ty0 + 6, 44, 44); k.teks(inv.Kode_Verifikasi, 542, ty0 + 56, { uk: 5.6, rata: 'tengah', warna: '#555555' }); } }
    // syarat
    k.teks('Syarat dan ketentuan:', X0 + 1.5, sy2, { uk: 7.8 }); sy2 += 11.6;
    (v.syarat || []).forEach(function (s, i) { sy2 += k.paragraf((i + 1) + '. ' + s, X0 + 1.5, sy2, 392, { uk: 7.8, lh: 9.5 }) + 2; });
    // kaki kontak
    var fy = 786; if (sy2 > fy - 14) fy = sy2 + 14;
    k.teks(S.PT_IG ? 'IG: ' + S.PT_IG : '', X0 - 3, fy, { uk: 6.8 }); k.teks(S.PT_WEB || '', W / 2 - 40, fy, { uk: 6.8, rata: 'tengah' }); k.teks(S.PT_WA ? 'WhatsApp: ' + S.PT_WA : '', 568, fy, { uk: 6.8, rata: 'kanan' });
    if (inv.Status === 'Batal') { k.teks('BATAL', W / 2, H / 2, { uk: 96, tebal: true, warna: '#F3C5C8', rata: 'tengah' }); }
    if (inv.Status === 'Draft') { k.teks('DRAFT', W / 2, 60, { uk: 10, tebal: true, warna: '#B45309', rata: 'tengah' }); }
    return k;
  }

  // ================================================================ MANIFEST (model klien)
  // Geometri diukur dari PDF klien (KISVAN SIMARMATA …_YUNUS.pdf): Helvetica 10 pt, judul 12 pt,
  // baris tabel 22,5 pt, garis 1 pt; itinerary 11 pt (jam x=72, kegiatan x=108, spasi 19 pt);
  // tabel budgeting x 100,9–494,7 baris 19,4 pt garis 0,6 pt.
  async function tataManifest(m, S) {
    S = S || Store.S; var W = 595.28, H = 841.89, k = new Kanvas(W, H), LX = 29.4, BAWAH = 768, ATAS = 82;
    var tampilLogo = S.MNF_LOGO === 'YA', logo = tampilLogo ? await dataGambar(S.MNF_LOGO_URL || S.LOGO_URL || 'assets/logo-yb.png') : null, uk = await ukuranGambar(logo);
    var y = 82.8; // baseline berjalan
    function baru() { k.halamanBaru(); y = ATAS; }
    function cukup(h) { if (y + h > BAWAH) { baru(); return true; } return false; }
    function label(t, jarak) { y += jarak; cukup(48); k.teks(t, LX, y, { uk: 10, tebal: true }); }
    /** batas = posisi garis vertikal; kol: [{al, tebal}] ; baris pertama = kepala */
    function tabel(batas, kol, baris, o) {
      o = o || {}; var rh = o.rh || 22.5, ukf = o.uk || 10, lh = ukf * 1.15, top = y + 14.5; y = top;
      baris.forEach(function (r, ri) {
        var lines = r.map(function (v, ci) { return pecah(aman(v), ukf, ri > 0 && kol[ci].tebal, batas[ci + 1] - batas[ci] - 9); });
        var n = Math.max.apply(null, lines.map(function (l) { return l.length; })), tinggi = Math.max(rh, rh + (n - 1) * lh);
        if (y + tinggi > BAWAH + 8) { baru(); y -= 9; }
        r.forEach(function (v, ci) {
          var x0 = batas[ci], x1 = batas[ci + 1], al = ri === 0 ? 'tengah' : (kol[ci].al || 'tengah'), tx = al === 'tengah' ? (x0 + x1) / 2 : al === 'kanan' ? x1 - 4.5 : x0 + 4.8;
          var ln = lines[ci], ty = y + tinggi / 2 + ukf * 0.355 - (ln.length - 1) * lh / 2;
          ln.forEach(function (l, li) { k.teks(l, tx, ty + li * lh, { uk: ukf, tebal: ri > 0 && !!kol[ci].tebal, rata: al }); });
        });
        k.garis(batas[0], y, batas[batas.length - 1], y, { tebal: 1 }); batas.forEach(function (x) { k.garis(x, y, x, y + tinggi, { tebal: 1 }); });
        y += tinggi;
      });
      k.garis(batas[0], y, batas[batas.length - 1], y, { tebal: 1 });
    }
    if (tampilLogo) { if (logo) { var lg = pas(uk, 34, 34); k.gambar(logo, 20.3, 22, lg.w, lg.h); } if (S.MNF_KOP) k.teks(S.MNF_KOP, 20.3 + (logo ? 42 : 0), 43, { uk: 10, tebal: true }); }
    k.teks(S.MNF_JUDUL || 'MANIFEST TRIP', W / 2 - .4, y, { uk: 12, tebal: true, rata: 'tengah' });
    label(S.MNF_L_TIM || 'DATA TIM', 23.4);
    tabel([20.3, 188.6, 300.2, 448.9], [{}, {}, {}], [['NAMA PIC', 'NAMA TL', 'DURASI TRIP'], [String(m.pic || '-').toUpperCase(), String(m.namaTL || '-').toUpperCase(), m.durasi || '-']]);
    label(S.MNF_L_TAMU || 'DATA TAMU', 21.1);
    tabel([20.3, 188.6, 227.6, 337, 448.9, 562.1], [{}, {}, {}, {}, {}], [['NAMA', 'PAX', 'NO HP', 'PENJEMPUTAN', 'DROP'], [String(m.tamu.nama || '').toUpperCase(), String(m.tamu.pax || ''), m.tamu.hp || '-', String(m.tamu.jemput || '-').toUpperCase(), String(m.tamu.drop || '-').toUpperCase()]]);
    if (m.peserta && m.peserta.length) {
      label(S.MNF_L_PESERTA || 'DAFTAR PESERTA', 21.1);
      tabel([20.3, 50.3, 300.2, 420.2, 562.7], [{}, { al: 'kiri' }, {}, { al: 'kiri' }], [['NO', 'NAMA', 'NO HP', 'KETERANGAN']].concat(m.peserta.map(function (p, i) { return [String(i + 1), p.nama, p.hp || '-', p.ket || '']; })), { rh: 18.5, uk: 9.5 });
    }
    if (m.cek && m.cek.length) { label(S.MNF_L_CEK || 'CHECK LIST TRIP', 21.1); tabel([20.3, 217, 253, 562.7], [{ al: 'kiri', tebal: true }, {}, { al: 'kiri', tebal: true }], [['ITEM', '•', 'DETAIL']].concat(m.cek.map(function (c) { return [c.item, '•', c.detail]; }))); }
    if (m.catatan && m.catatan.length) {
      label(S.MNF_L_CATATAN || 'CATATAN', 21.1);
      m.catatan.forEach(function (c, i) { var l = pecah(aman((i + 1) + '. ' + c), 10, false, 530); l.forEach(function (t) { y += 11.6; cukup(4); k.teks(t, LX, y, { uk: 10 }); }); });
    }
    if (m.itin && m.itin.length) {
      label(S.MNF_L_ITIN || 'ITINERARY', m.catatan && m.catatan.length ? 22.8 : 21.1);
      m.itin.forEach(function (h, hi) {
        y += hi ? 37.8 : 35.4; if (cukup(21)) y = ATAS;
        k.teks(h.judul, 72, y, { uk: 11, tebal: true });
        h.baris.forEach(function (b, bi) {
          var ln = pecah(aman(b.teks), 11, false, 415.5);
          y += bi ? 19 : 19.2; if (cukup(ln.length * 18.9 - 18.9)) y = ATAS;
          k.teks(b.jam, 72, y, { uk: 11 });
          ln.forEach(function (l, i) { if (i) { y += 18.9; if (cukup(0)) y = ATAS; } if (i < ln.length - 1) k.rataPenuh(l, 108, y, 415.5, { uk: 11 }); else k.teks(l, 108, y, { uk: 11 }); });
        });
      });
    }
    if (m.tampilBudget && m.budget && m.budget.ada) {
      var bt = [100.9, 349.4, 425.6, 494.7], rows = [['', String(m.budget.pax || ''), '']];
      (m.budget.items || [].concat.apply([], m.budget.grup.map(function (g) { return g.items; }))).forEach(function (it) { rows.push([it.Uraian, String(Math.round(it.Budget)), String(Math.round(it.Terima_TL))]); });
      rows.push(['TOTAL', String(Math.round(m.budget.total)), String(Math.round(m.budget.terima))]);
      y += m.itin && m.itin.length ? 42 : 30; var perlu = 34 + (rows.length + 1) * 19.4; if (y + (perlu < BAWAH - ATAS ? perlu : 34 + 6 * 19.4) > BAWAH + 10) { baru(); }
      k.teks(S.MNF_L_BUDGET || 'BUDGETING', 246.5, y, { uk: 10, tebal: true });
      var ty = y + 14.3;
      function garisBaris(t, h) { k.garis(bt[0], t, bt[3], t, { tebal: .6, warna: '#7F7F7F' }); bt.forEach(function (x) { k.garis(x, t, x, t + h, { tebal: .6, warna: '#7F7F7F' }); }); }
      function kepala() { garisBaris(ty, 19.6); ['KETERANGAN', 'BUDGET', 'TERIMA TL'].forEach(function (t, i) { k.teks(t, (bt[i] + bt[i + 1]) / 2, ty + 14.6, { uk: 10, tebal: true, rata: 'tengah' }); }); ty += 19.6; }
      kepala();
      rows.forEach(function (r, ri) {
        if (ty + 19.4 > BAWAH + 10) { k.garis(bt[0], ty, bt[3], ty, { tebal: .6, warna: '#7F7F7F' }); k.halamanBaru(); ty = 60; kepala(); }
        var tebal = ri === rows.length - 1; garisBaris(ty, 19.4);
        k.teks(r[0], bt[0] + 2.6, ty + 14.4, { uk: 10, tebal: tebal }); k.teks(r[1], bt[2] - 2, ty + 14.4, { uk: 10, tebal: tebal, rata: 'kanan' }); k.teks(r[2], bt[3] - 2.2, ty + 14.4, { uk: 10, tebal: tebal, rata: 'kanan' });
        ty += 19.4;
      });
      k.garis(bt[0], ty, bt[3], ty, { tebal: .6, warna: '#7F7F7F' }); y = ty;
    }
    if (S.MNF_KAKI) k.hal.forEach(function (ops) { ops.push({ t: 'teks', s: aman(S.MNF_KAKI), x: W / 2, y: H - 24, uk: 7, tebal: false, miring: false, warna: '#555555', rata: 'tengah' }); });
    return k;
  }

  // ================================================================ PRATINJAU & TERBIT
  function pratinjauKanvas(judul, k, o) {
    o = o || {};
    var h = UI.modal({ judul: judul, sub: o.sub || '', ukuran: 'xl', isi: '<div class="kertas-panggung">' + svgDari(k).map(function (s, i) { return '<div class="kertas">' + s + (k.hal.length > 1 ? '<span class="kertas__no">Halaman ' + (i + 1) + ' dari ' + k.hal.length + '</span>' : '') + '</div>'; }).join('') + '</div>',
      aksi: (o.aksi || []).concat([{ label: 'Unduh PDF', kelas: o.aksi && o.aksi.length ? 'btn--ghost' : 'btn--primary', ikon: 'file-down', tutup: false, klik: async function (hh, b) { if (!bolehUnduh()) return; var selesai = UI.proses('Membuat PDF'); try { var d = await pdfDari(k); d.save(namaFile(o.nama || judul) + '.pdf'); selesai(true, 'PDF diunduh'); } catch (e) { selesai(false); UI.toast(e.message, 'err'); } } }]) });
    return h;
  }
  async function pdfBase64(k) { var d = await pdfDari(k); var s = d.output('datauristring'); return s.slice(s.indexOf(',') + 1); }

  // ================================================================ PDF LAPORAN (AutoTable)
  var RGB = { teks: [14, 34, 48], muted: [74, 93, 107], garis: [220, 229, 234], tint: [232, 243, 248], tint2: [246, 249, 250], gelap: [11, 59, 90], ok: [19, 119, 79], bahaya: [184, 32, 43], bahayaT: [253, 236, 238], warnT: [254, 243, 226] };
  function Pdf(o) {
    var J = window.jspdf.jsPDF; this.doc = new J({ orientation: o.lanskap ? 'landscape' : 'portrait', unit: 'pt', format: 'a4', compress: true });
    this.o = o; this.S = Store.S; this.W = this.doc.internal.pageSize.getWidth(); this.H = this.doc.internal.pageSize.getHeight(); this.M = 34; this.L = this.W - 68;
    this.P = hexRgb(U.paletAktif(this.S).primary); this.y = 0; this.kop();
  }
  Pdf.prototype = {
    warna: function (c, f) { this.doc[f === 'f' ? 'setFillColor' : f === 'd' ? 'setDrawColor' : 'setTextColor'](c[0], c[1], c[2]); },
    huruf: function (uk, tebal, c) { this.doc.setFont('helvetica', tebal ? 'bold' : 'normal'); this.doc.setFontSize(uk); this.warna(c || RGB.teks); },
    kop: function () {
      var d = this.doc, M = this.M, S = this.S, o = this.o, kanan = this.W - M;
      if (o.logo) { try { d.addImage(o.logo, 'PNG', M, M - 2, 34, 34, undefined, 'FAST'); } catch (e) { } }
      var tx = M + (o.logo ? 42 : 0);
      this.huruf(12.5, true); d.text(aman(S.PT_NAMA || S.APP_NAMA || ''), tx, M + 11);
      this.huruf(8, false, RGB.muted); d.text(aman([S.PT_ALAMAT, S.PT_TELP].filter(Boolean).join(' · ')), tx, M + 23);
      this.huruf(o.lanskap ? 15 : 14, true, RGB.gelap); d.text(aman(o.judul.toUpperCase()), kanan, M + 11, { align: 'right' });
      if (o.sub) { this.huruf(9, true, this.P); d.text(aman(o.sub), kanan, M + 24, { align: 'right' }); }
      this.warna(this.P, 'd'); d.setLineWidth(1.2); d.line(M, M + 36, kanan, M + 36); d.setLineWidth(.5);
      this.y = M + 50;
    },
    baru: function () { this.doc.addPage(); this.y = 46; },
    cukup: function (h) { if (this.y + h > this.H - 50) this.baru(); },
    kpi: function (list) {
      var d = this.doc, gap = 6, n = list.length, w = (this.L - gap * (n - 1)) / n, h = 42, self = this; this.cukup(h + 8);
      list.forEach(function (k, i) {
        var x = self.M + i * (w + gap), utama = i === 0, c = k.tone === 'bahaya' ? RGB.bahaya : k.tone === 'ok' ? RGB.ok : utama ? [255, 255, 255] : RGB.teks;
        if (utama) self.warna(self.P, 'f'); else self.warna(k.tone === 'bahaya' ? RGB.bahayaT : RGB.tint2, 'f');
        self.warna(RGB.garis, 'd'); d.roundedRect(x, self.y, w, h, 6, 6, utama ? 'F' : 'FD');
        self.huruf(7, true, utama ? [220, 240, 248] : RGB.muted); d.text(aman(k.label), x + 8, self.y + 13);
        var uk = 12.5; self.huruf(uk, true, c); while (uk > 7.5 && d.getTextWidth(aman(k.nilai)) > w - 16) { uk -= .5; d.setFontSize(uk); }
        d.text(aman(k.nilai), x + 8, self.y + 31);
      });
      this.y += h + 12;
    },
    bagian: function (judul, sub) { this.cukup(40); this.huruf(10.5, true, RGB.gelap); this.doc.text(aman(judul), this.M, this.y + 8); if (sub) { this.huruf(7.8, false, RGB.muted); this.doc.text(aman(sub), this.W - this.M, this.y + 8, { align: 'right' }); } this.y += 15; },
    /** kolom [{judul, w, kanan, tengah}] · baris array (r.__grup/__alert/__redup/__total) · o.kepala2 = baris kepala tambahan */
    tabel: function (kolom, baris, kaki, o) {
      o = o || {}; var self = this, cs = {}, sisa = this.L, tanpaW = 0;
      kolom.forEach(function (k) { if (k.w) sisa -= k.w; else tanpaW++; });
      kolom.forEach(function (k, i) { cs[i] = { cellWidth: k.w || Math.max(36, sisa / Math.max(1, tanpaW)), halign: k.kanan ? 'right' : k.tengah ? 'center' : 'left' }; });
      this.cukup(48);
      var head = o.head || [kolom.map(function (k) { return aman(k.judul); })];
      this.doc.autoTable({
        startY: this.y, head: head, body: baris.map(function (r) { var a = r.map(function (c) { return c && typeof c === 'object' ? Object.assign({}, c, { content: aman(c.content) }) : aman(c); }); a.__grup = r.__grup; a.__alert = r.__alert; a.__redup = r.__redup; a.__total = r.__total; return a; }),
        foot: kaki ? [kaki.map(function (c) { return c && typeof c === 'object' ? Object.assign({}, c, { content: aman(c.content) }) : aman(c); })] : undefined, showFoot: 'lastPage', showHead: 'everyPage',
        theme: 'grid', margin: { top: 40, bottom: 48, left: this.M, right: this.M }, tableWidth: this.L, rowPageBreak: 'avoid',
        styles: { font: 'helvetica', fontSize: o.kecil ? 7 : 8.2, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }, lineColor: RGB.garis, lineWidth: .5, textColor: RGB.teks, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: RGB.tint, textColor: RGB.gelap, fontStyle: 'bold', fontSize: o.kecil ? 6.8 : 7.8, valign: 'middle', halign: 'center' },
        footStyles: { fillColor: this.P, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [250, 252, 253] }, columnStyles: cs,
        didParseCell: function (dc) {
          if (dc.section !== 'body') return; var raw = dc.row.raw || {};
          if (raw.__grup) { dc.cell.styles.fillColor = [236, 244, 248]; dc.cell.styles.fontStyle = 'bold'; dc.cell.styles.textColor = RGB.gelap; }
          if (raw.__total) { dc.cell.styles.fontStyle = 'bold'; dc.cell.styles.fillColor = RGB.tint; }
          if (raw.__alert) { dc.cell.styles.fillColor = RGB.bahayaT; if (dc.column.index > 0) dc.cell.styles.textColor = RGB.bahaya; }
          if (raw.__redup) { dc.cell.styles.textColor = [140, 152, 162]; dc.cell.styles.fontStyle = 'italic'; }
        }
      });
      this.y = this.doc.lastAutoTable.finalY + 12;
    },
    teks: function (label, isi) {
      if (!isi) return; var d = this.doc; this.huruf(8.2, false); var l = d.splitTextToSize(aman(isi), this.L); this.cukup(16 + l.length * 10.5);
      if (label) { this.huruf(8, true, RGB.muted); d.text(aman(label), this.M, this.y + 8); this.y += 12; }
      this.huruf(8.2, false); d.text(l, this.M, this.y + 8); this.y += l.length * 10.5 + 8;
    },
    selesai: function (nama) {
      var d = this.doc, n = d.internal.getNumberOfPages(), M = this.M, me = Store.me || {}, cetak = U.tglId(U.hariIni()) + ' ' + U.nowIso().slice(11, 16) + ' WIB';
      for (var i = 1; i <= n; i++) {
        d.setPage(i); this.warna(RGB.garis, 'd'); d.line(M, this.H - 32, this.W - M, this.H - 32);
        this.huruf(7, false, RGB.muted); d.text(aman('Dicetak ' + cetak + (me.nama ? ' oleh ' + me.nama : '') + ' · ' + (this.S.APP_NAMA || '')), M, this.H - 20);
        d.text('Halaman ' + i + ' dari ' + n, this.W - M, this.H - 20, { align: 'right' });
      }
      d.save(namaFile(nama) + '.pdf');
    }
  };
  async function siapPdf() { if (!bolehUnduh()) return false; await muat(CDN.jspdf); await muat(CDN.autotable); return true; }
  async function logoKop() { var d = await dataGambar(Store.S.LOGO_URL || 'assets/logo-yb.png'); return d && /^data:image\/(png|jpe?g)/.test(d) ? d : (d ? await keRaster(d) : null); }

  /** Rekap per bulan (lanskap) — kolom mengikuti template (label diatur Admin). */
  async function laporanRekap(rows, label, judulPeriode) {
    if (!(await siapPdf())) return; var p = new Pdf({ judul: 'Rekapitulasi Trip', sub: judulPeriode, lanskap: true, logo: await logoKop() });
    ['YB', 'SB'].forEach(function (b) {
      var data = rows.filter(function (r) { return r.bagian === b; }); if (!data.length) return;
      var L = label[b].L, kol = label[b].kolom;
      p.bagian(L.JUDUL, data.length + ' trip');
      var head = [[{ content: L.NO, rowSpan: 2 }, { content: L.KODE, rowSpan: 2 }, { content: L.QTY, rowSpan: 2 }, { content: L.PIC, rowSpan: 2 }, { content: L.PRICE, rowSpan: 2 }, { content: L.PENJUALAN, rowSpan: 2 }].concat(L.HPP ? [{ content: L.HPP, colSpan: 10 }] : kol.map(function (k) { return { content: k.l, rowSpan: 2 }; })).concat([{ content: L.PENGELUARAN, rowSpan: 2 }, { content: L.LABA, rowSpan: 2 }, L.MARGIN_A, L.RATAAN_A]),
        (L.HPP ? kol.map(function (k) { return k.l; }) : []).concat([L.MARGIN_B, L.RATAAN_B])].map(function (r) { return r.map(function (c) { return typeof c === 'object' ? Object.assign({}, c, { content: aman(c.content) }) : aman(c); }); });
      var body = data.map(function (r, i) { var a = [String(i + 1), r.kode + (r.kunci ? '' : '  (draft)'), String(r.inf.pax), b === 'SB' ? r.kapal : r.p.PIC, U.ribuan(r.inf.harga), U.ribuan(r.penjualan)].concat(kol.map(function (k) { return r.kol[k.k] ? U.ribuan(r.kol[k.k]) : ''; })).concat([U.ribuan(r.pengeluaran), U.ribuan(r.laba), U.ribuan(r.laba), (Math.round(r.margin * 10000) / 100).toFixed(2).replace('.', ',') + '%']); if (r.rugi) a.__alert = true; if (!r.kunci) a.__redup = false; return a; });
      var t = HT.totalRekap(data), tk = {}; data.forEach(function (r) { kol.forEach(function (k) { tk[k.k] = (tk[k.k] || 0) + (r.kol[k.k] || 0); }); });
      var foot = ['', 'TOTAL', String(t.pax), '', '', U.ribuan(t.penjualan)].concat(kol.map(function (k) { return tk[k.k] ? U.ribuan(tk[k.k]) : ''; })).concat([U.ribuan(t.pengeluaran), U.ribuan(t.laba), U.ribuan(t.laba), (Math.round(t.margin * 10000) / 100).toFixed(2).replace('.', ',') + '%']);
      var w = [18, 128, 22, 34, 40, 46]; kol.forEach(function () { w.push(34); }); w.push(46, 46, 44, 34);
      var tot = w.reduce(function (a, b) { return a + b; }, 0), k = p.L / tot;
      p.tabel(w.map(function (x, i) { return { judul: '', w: x * k, kanan: i > 3 && i !== 1, tengah: i === 0 || i === 2 }; }), body, foot, { head: head, kecil: true });
    });
    p.teks('Catatan', 'Baris "(draft)" belum dikunci Finance. Laba rugi hanya memakai rekap yang sudah dikunci.');
    p.selesai('Rekapitulasi ' + judulPeriode);
  }
  async function laporanLabaRugi(lr) {
    if (!(await siapPdf())) return; var p = new Pdf({ judul: 'Laporan Laba Rugi', sub: lr.periode.label, logo: await logoKop() }), T = lr.total;
    p.kpi([{ label: 'Laba bersih', nilai: U.rp(T.labaBersih) }, { label: 'Penjualan', nilai: U.rp(T.penjualan) }, { label: 'Laba kotor trip', nilai: U.rp(T.labaKotor), tone: T.labaKotor < 0 ? 'bahaya' : 'ok' }, { label: 'Biaya operasional', nilai: U.rp(T.operasional) }]);
    var b = [], L = lr.label;
    b.push(Object.assign(['Penjualan trip (' + T.trip + ' trip terkunci, ' + T.pax + ' pax)', U.rp(T.penjualan)], { __grup: true }));
    ['YB', 'SB'].forEach(function (bg) { var pb = lr.perBagian[bg]; if (!pb.n) return; b.push(['   ' + L[bg].L.JUDUL + ' (' + pb.n + ' trip)', U.rp(pb.penjualan)]); });
    b.push(Object.assign(['Pengeluaran trip (HPP)', '(' + U.rp(T.pengeluaran) + ')'], { __grup: true }));
    ['YB', 'SB'].forEach(function (bg) { L[bg].kolom.forEach(function (k) { var v = lr.hpp[bg][k.k]; if (v) b.push(['   ' + L[bg].L.JUDUL + ' · ' + k.l, U.rp(v)]); }); });
    b.push(Object.assign(['LABA KOTOR', U.rp(T.labaKotor)], { __total: true }));
    b.push(Object.assign(['Biaya operasional perusahaan', '(' + U.rp(T.operasional) + ')'], { __grup: true }));
    Object.keys(lr.opsKat).sort().forEach(function (k) { b.push(['   ' + k, U.rp(lr.opsKat[k])]); });
    b.push(Object.assign(['LABA / RUGI BERSIH', U.rp(T.labaBersih)], { __total: true, __alert: T.labaBersih < 0 }));
    p.bagian('Ikhtisar laba rugi', lr.periode.label);
    p.tabel([{ judul: 'Keterangan' }, { judul: 'Jumlah', w: 150, kanan: true }], b);
    if (lr.perBulan.length > 1) { p.bagian('Per bulan'); p.tabel([{ judul: 'Bulan' }, { judul: 'Trip', w: 40, tengah: true }, { judul: 'Penjualan', kanan: true }, { judul: 'Pengeluaran', kanan: true }, { judul: 'Laba kotor', kanan: true }, { judul: 'Operasional', kanan: true }, { judul: 'Laba bersih', kanan: true }], lr.perBulan.map(function (x) { var a = [U.labelBulan(x.bulan), String(x.trip), U.ribuan(x.penjualan), U.ribuan(x.pengeluaran), U.ribuan(x.labaKotor), U.ribuan(x.operasional), U.ribuan(x.labaBersih)]; if (x.labaBersih < 0) a.__alert = true; return a; })); }
    if (lr.ops.length) { p.bagian('Rincian biaya operasional', lr.ops.length + ' catatan'); p.tabel([{ judul: 'Bulan', w: 72 }, { judul: 'Kategori', w: 120 }, { judul: 'Uraian' }, { judul: 'Nominal', w: 90, kanan: true }], lr.ops.map(function (o) { return [U.labelBulan(o.Bulan), o.Kategori, o.Uraian, U.ribuan(o.Nominal)]; })); }
    if (lr.tertunda.length) p.teks('Belum masuk laporan', lr.tertunda.length + ' trip pada periode ini belum dikunci Finance (estimasi margin ' + U.rp(lr.totalTertunda.laba) + ').');
    p.selesai('Laba Rugi ' + lr.periode.label);
  }
  async function laporanReport(r) {
    if (!(await siapPdf())) return; var p = new Pdf({ judul: 'Report & Analitik', sub: r.label, logo: await logoKop() });
    p.kpi([{ label: 'Pax bulan ini', nilai: String(r.pax.total) }, { label: 'Pemesanan masuk', nilai: String(r.frekuensi.total) }, { label: 'Trip berangkat', nilai: String(r.pax.trip) }, { label: 'Penjualan', nilai: U.rpRingkas(r.pax.penjualan) }]);
    function tb(judul, rows, k1) { if (!rows.length) return; p.bagian(judul); p.tabel([{ judul: k1 }, { judul: 'Pemesanan', w: 80, tengah: true }, { judul: 'Pax', w: 60, tengah: true }], rows.map(function (x) { return [x.label, String(x.n), String(x.pax)]; })); }
    tb('Top 10 kota asal tamu', r.kota, 'Kota'); tb('Sumber info', r.sumber, 'Sumber'); tb('Durasi paket terlaris', r.durasi, 'Durasi'); tb('Paket Open Trip paling banyak dipesan', r.paket, 'Paket');
    p.bagian('Tren 12 bulan'); p.tabel([{ judul: 'Bulan' }, { judul: 'Trip', w: 60, tengah: true }, { judul: 'Pax', w: 60, tengah: true }, { judul: 'Pemesanan masuk', w: 100, tengah: true }, { judul: 'Penjualan', w: 110, kanan: true }], r.tren.map(function (x) { return [U.labelBulan(x.bulan), String(x.trip), String(x.pax), String(x.pesan), U.ribuan(x.penjualan)]; }));
    p.selesai('Report ' + r.label);
  }

  // ================================================================ EXCEL
  async function excel(nama, sheets) {
    if (!bolehUnduh()) return; await muat(CDN.xlsx);
    var wb = XLSX.utils.book_new();
    sheets.forEach(function (s) { var ws = XLSX.utils.aoa_to_sheet(s.rows); ws['!cols'] = (s.lebar || s.rows[0].map(function () { return 18; })).map(function (w) { return { wch: w }; }); XLSX.utils.book_append_sheet(wb, ws, s.nama.slice(0, 31)); });
    XLSX.writeFile(wb, namaFile(nama) + '.xlsx');
  }
  var WARNA_X = { kO: 'FFFABF8F', kP: 'FFF9CB9C', kH: 'FF76933C', kG: 'FF70AD47', kK: 'FFFFFF00', kM: 'FFFF0000', kW: 'FFFFFFFF', uangH: 'FF76933C' };
  /** Excel rekap PERSIS template Dummy Rekapitulasi (sama dengan yang ditulis ke Google Sheet). bulanData: [{bulan,label,YB,SB}] */
  async function excelRekap(nama, bulanData, label) {
    if (!bolehUnduh()) return; await muat(CDN.exceljs);
    var wb = new window.ExcelJS.Workbook(); wb.creator = Store.S.APP_NAMA || 'YukBanyuwangi';
    bulanData.forEach(function (b) {
      var ws = wb.addWorksheet(String(b.label).slice(0, 31)), t = HT.tataRekap(b, label);
      t.lebar.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
      t.sel.forEach(function (s) {
        var c = ws.getCell(s.r + 1, s.c + 1);
        c.value = s.f ? { formula: s.f.replace(/^=/, ''), result: s.v } : (s.v === '' ? null : s.v);
        c.font = { name: 'Calibri', size: s.g === 'judul' ? 28 : 11, bold: /^k|judul/.test(s.g) };
        if (WARNA_X[s.g]) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA_X[s.g] } };
        if (s.g === 'uang' || s.g === 'uangH') c.numFmt = '#,##0'; if (s.g === 'persen') c.numFmt = '0.00%';
        c.alignment = { vertical: 'middle', horizontal: /^k|^no$|angka|persen/.test(s.g) ? 'center' : (s.g === 'uang' || s.g === 'uangH' ? 'right' : 'left'), wrapText: /^k/.test(s.g) };
      });
      t.blok.forEach(function (bk) { for (var r = bk[0]; r <= bk[1]; r++) for (var c2 = 0; c2 < t.kolom; c2++) ws.getCell(r + 1, c2 + 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
      t.gabung.forEach(function (m) { ws.mergeCells(m[0] + 1, m[1] + 1, m[2] + 1, m[3] + 1); });
    });
    var buf = await wb.xlsx.writeBuffer();
    unduhBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), namaFile(nama) + '.xlsx');
  }

  window.Dok = { muat: muat, CDN: CDN, bolehUnduh: bolehUnduh, qrSvg: qrSvg, verifUrl: verifUrl, dataGambar: dataGambar, Kanvas: Kanvas, svgDari: svgDari, pdfDari: pdfDari, pdfBase64: pdfBase64,
    tataInvoice: tataInvoice, tataManifest: tataManifest, pratinjauKanvas: pratinjauKanvas, laporanRekap: laporanRekap, laporanLabaRugi: laporanLabaRugi, laporanReport: laporanReport, excel: excel, excelRekap: excelRekap, namaFile: namaFile, unduhBlob: unduhBlob };
})();
