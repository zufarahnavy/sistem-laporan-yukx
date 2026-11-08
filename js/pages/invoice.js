/* YukX — Halaman Invoice: daftar, pembuat invoice + live preview A4, tampilan invoice */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { q: '', f: 'semua' }, bd = {}, zoom = 1, terbitNo = '';

  function prosesChips(inv, besar) {
    var p = HT.prosesInvoice(inv), cls = besar ? '' : 'style="height:22px;padding:0 8px;font-size:10.5px"';
    function chip(k, label, ikon) {
      var s = p[k] || 'belum', tone = s === 'ok' ? 'ok' : s === 'gagal' ? 'danger' : s === 'lewati' || s === 'belum' ? 'neutral' : 'warn';
      var ik = s === 'ok' ? 'circle-check' : s === 'gagal' ? 'circle-x' : s === 'lewati' ? 'circle' : s === 'belum' ? ikon : 'loader-circle';
      return '<span class="badge ' + tone + '" ' + cls + ' title="' + label + ': ' + s + '">' + ic(ik, 13, s === 'antri' || s === 'proses' ? 'spin' : '') + label + (besar ? (s === 'ok' ? ' ✓' : s === 'lewati' ? ' (lewati)' : s === 'gagal' ? ' gagal' : s === 'belum' ? '' : '…') : '') + '</span>';
    }
    return '<span class="row wrap" style="gap:4px">' + chip('pdf', 'PDF', 'file-text') + chip('cal', 'Calendar', 'calendar') + chip('kirim', 'Kirim', 'send') + '</span>';
  }
  function telat(i) { return i.Status === 'Terbit' && i.Jatuh_Tempo && i.Jatuh_Tempo < U.hariIni(); }
  function info(i) { var pj = Store.get('Penjualan', i.ID_Penjualan) || {}; return { pj: pj, c: Store.get('Customer', pj.ID_Customer) || {}, t: Store.get('Trip', pj.ID_Trip) || {} }; }

  // ------------------------------------------------------------- daftar
  function renderDaftar(el) {
    var admin = Store.isAdmin();
    el.innerHTML = Hal.kepala({ crumbs: ['Transaksi & penjualan', 'Invoice'], judul: 'Invoice & Status Otomasi', sub: 'Nomor berurutan YX/INV/AAAA/BB/0001, PDF di Google Drive, event Google Calendar per customer, dan pengiriman Gmail/WhatsApp.',
      aksi: admin ? '<a class="btn btn--primary" href="#/invoice/baru">' + ic('plus', 18) + 'Buat invoice</a>' : '' }) +
      '<div id="iv-kpi" class="bento two-sm stagger"></div><div class="card card--pad0" style="margin-top:16px"><div class="toolbar" style="padding:16px;gap:10px"><div class="input-ic grow" style="min-width:220px">' + ic('search', 18) + '<input class="input" id="iv-q" type="search" placeholder="Cari no. invoice, customer, trip…" value="' + esc(st.q) + '"></div><div class="chips-scroll" id="iv-f"></div></div><div id="iv-list"></div></div>';
    el.querySelector('#iv-q').addEventListener('input', C.debounce(function (e) { st.q = e.target.value; isiDaftar(el); }, 200));
    el.querySelector('#iv-f').onclick = function (e) { var b = e.target.closest('[data-f]'); if (b) { st.f = b.dataset.f; isiDaftar(el); } };
    Hal.aksiPeta(el, aksiInvoice());
    isiDaftar(el);
  }
  function isiDaftar(el) {
    var D = Store.D, today = U.hariIni(), bln = today.slice(0, 7), all = U.urutkan(D.Invoice, function (i) { return (i.Dibuat || i.Tgl_Terbit) + i.No_Invoice; }, true);
    var belum = all.filter(function (i) { return i.Status === 'Terbit'; }), tel = all.filter(telat);
    el.querySelector('#iv-kpi').innerHTML = UI.stat({ label: 'Terbit bulan ini', ikon: 'receipt', nilai: UI.hitung(all.filter(function (i) { return i.Tgl_Terbit.slice(0, 7) === bln; }).length) + ' <small>invoice</small>', kaki: '<span>' + U.rpRingkas(U.jumlah(all.filter(function (i) { return i.Tgl_Terbit.slice(0, 7) === bln && i.Status !== 'Batal'; }), function (i) { return i.Nominal; })) + ' ditagihkan</span>' }) +
      UI.stat({ label: 'Lunas', ikon: 'circle-check', tone: 'ok', nilai: UI.hitung(all.filter(function (i) { return i.Status === 'Lunas'; }).length) + ' <small>invoice</small>', kaki: '<span>dari ' + all.length + ' total</span>' }) +
      UI.stat({ label: 'Belum dibayar', ikon: 'hourglass', tone: 'warn', nilai: UI.hitung(belum.length) + ' <small>invoice</small>', kaki: '<b class="warn num">' + U.rp(U.jumlah(belum, function (i) { return i.Nominal; })) + '</b>' }) +
      UI.stat({ label: 'Lewat jatuh tempo', ikon: 'clock', tone: tel.length ? 'danger' : 'ok', nilai: UI.hitung(tel.length) + ' <small>invoice</small>', kaki: tel.length ? '<span class="danger">Segera tagih via WA</span>' : '<span class="ok">Aman</span>' });
    var n = { semua: all.length, belum: belum.length, lunas: all.length - belum.length - all.filter(function (i) { return i.Status === 'Batal'; }).length, telat: tel.length, gagal: all.filter(function (i) { var p = HT.prosesInvoice(i); return p.pdf === 'gagal' || p.cal === 'gagal' || p.kirim === 'gagal'; }).length, batal: all.filter(function (i) { return i.Status === 'Batal'; }).length };
    el.querySelector('#iv-f').innerHTML = [['semua', 'Semua'], ['belum', 'Belum bayar'], ['lunas', 'Lunas'], ['telat', 'Telat'], ['gagal', 'Otomasi gagal'], ['batal', 'Batal']].map(function (f) { return '<button class="chip ' + (st.f === f[0] ? 'on' : '') + '" data-f="' + f[0] + '">' + f[1] + ' <span class="n">' + n[f[0]] + '</span></button>'; }).join('');
    var q = st.q.toLowerCase();
    var rows = all.filter(function (i) {
      if (st.f === 'belum' && i.Status !== 'Terbit') return false; if (st.f === 'lunas' && i.Status !== 'Lunas') return false; if (st.f === 'telat' && !telat(i)) return false; if (st.f === 'batal' && i.Status !== 'Batal') return false;
      if (st.f === 'gagal') { var p = HT.prosesInvoice(i); if (!(p.pdf === 'gagal' || p.cal === 'gagal' || p.kirim === 'gagal')) return false; }
      if (!q) return true; var x = info(i); return (i.No_Invoice + ' ' + x.c.Nama + ' ' + x.t.Nama).toLowerCase().indexOf(q) > -1;
    });
    el.querySelector('#iv-list').innerHTML = UI.tabel({ kolom: [
      { label: 'No. invoice & customer', render: function (i) { var x = info(i); return '<div class="cell-main">' + UI.avatar(x.c.Nama) + '<div class="row__text"><b class="truncate">' + esc(x.c.Nama) + '</b><span class="sub mono">' + esc(i.No_Invoice) + '</span></div></div>'; } },
      { label: 'Trip', render: function (i) { var x = info(i); return '<span class="truncate" style="display:block;max-width:200px">' + esc(x.t.Nama) + '</span><span class="sub">' + x.pj.Jumlah_Pax + ' pax</span>'; } },
      { label: 'Jenis', render: function (i) { return '<span class="badge neutral">' + esc(i.Jenis) + '</span>'; } },
      { label: 'Terbit · JT', render: function (i) { return U.tglId(i.Tgl_Terbit) + '<span class="sub ' + (telat(i) ? 'danger' : '') + '">JT ' + U.tglId(i.Jatuh_Tempo) + '</span>'; } },
      { label: 'Nominal', num: true, render: function (i) { return '<b>' + F.rpTip(i.Nominal) + '</b>'; } },
      { label: 'Status', render: function (i) { return UI.badge(telat(i) ? 'Jatuh Tempo' : i.Status === 'Terbit' ? 'Menunggu' : i.Status); } },
      { label: 'Otomasi', render: function (i) { return prosesChips(i); } },
      { label: '', mlabel: '', render: function (i) { return '<button class="btn btn--ghost btn--sm btn--icon" data-act="menu" data-no="' + esc(i.No_Invoice) + '" aria-label="Aksi">' + ic('ellipsis', 18) + '</button>'; } }
    ], baris: rows, klik: function (i) { return i.No_Invoice; }, kosong: 'Tidak ada invoice', kosongIkon: 'receipt' });
    el.querySelectorAll('#iv-list tr[data-row]').forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest('[data-act]')) return; App.go('invoice/lihat/' + encodeURIComponent(tr.dataset.row)); }; });
  }
  function aksiInvoice() {
    return {
      menu: function (d, b) {
        var i = Store.get('Invoice', d.no), admin = Store.isAdmin();
        UI.popover(b, '<button class="menu-item" data-m="lihat">' + ic('eye') + 'Lihat invoice</button><button class="menu-item" data-m="pdf">' + ic('file-down') + 'Buka / unduh PDF</button>' +
          (admin && i.Status !== 'Batal' ? '<button class="menu-item" data-m="kirim">' + ic('send') + 'Kirim ulang (email & WA)</button><button class="menu-item" data-m="proses">' + ic('refresh-cw') + 'Proses ulang PDF & Calendar</button>' : '') +
          (admin && i.Status === 'Terbit' ? '<button class="menu-item danger" data-m="batal">' + ic('circle-x') + 'Batalkan invoice</button>' : ''),
          function (e) { var m = e.target.closest('[data-m]'); if (!m) return; UI.tutupPopover(); aksiSatu(m.dataset.m, d.no); });
      },
      satu: function (d, b) { aksiSatu(d.m, d.no, b); }
    };
  }
  async function aksiSatu(m, no, btn) {
    if (m === 'lihat') App.go('invoice/lihat/' + encodeURIComponent(no));
    if (m === 'pdf') Dok.bukaPdf(no);
    if (m === 'cetak') Dok.cetak(Dok.invoiceHTML(no));
    if (m === 'kirim') C.aksi('invoice.kirimUlang', { no: no }, { btn: btn });
    if (m === 'proses') C.aksi('invoice.prosesUlang', { no: no }, { btn: btn });
    if (m === 'batal') { var a = await UI.konfirmasi({ judul: 'Batalkan ' + no + '?', teks: 'Nomor invoice tetap tercatat (tidak dipakai ulang) agar urutan tidak bolong.', input: { label: 'Alasan', wajib: true }, ok: 'Batalkan invoice', bahaya: true }); if (a) C.aksi('invoice.batal', { no: no, alasan: a }); }
    if (m === 'wa') { var x = info(Store.get('Invoice', no)), inv = Store.get('Invoice', no); window.open('https://wa.me/' + U.hp62(x.c.No_WA) + '?text=' + encodeURIComponent('Halo ' + x.c.Nama + ', berikut invoice ' + no + ' (' + inv.Jenis + ') untuk ' + x.t.Nama + ' sebesar ' + U.rp(inv.Nominal) + ', jatuh tempo ' + U.tglPanjang(inv.Jatuh_Tempo) + '. ' + (inv.Link_PDF || '') + ' Terima kasih 🙏'), '_blank', 'noopener'); }
  }

  // ------------------------------------------------------------- pembuat invoice
  function opsiPenjualan() {
    var D = Store.D, ix = HT.indeks(D), today = U.hariIni(), grup = {};
    D.Penjualan.filter(function (p) { return p.Status !== 'Batal'; }).forEach(function (p) {
      var ditagih = U.jumlah((ix.invPerPj[p.ID_Penjualan] || []).filter(function (i) { return i.Status !== 'Batal'; }), function (i) { return i.Nominal; });
      if (ditagih >= p.Total) return; var t = ix.trip[p.ID_Trip] || {}, c = ix.cust[p.ID_Customer] || {};
      (grup[t.Nama + '|' + t.Tgl_Berangkat] = grup[t.Nama + '|' + t.Tgl_Berangkat] || []).push({ v: p.ID_Penjualan, l: c.Nama + ' · ' + p.Jumlah_Pax + ' pax · belum ditagih ' + U.rp(p.Total - ditagih) });
    });
    return Object.keys(grup).sort(function (a, b) { return a.split('|')[1] < b.split('|')[1] ? -1 : 1; }).map(function (k) { return { grup: k.split('|')[0] + ' (' + U.tglId(k.split('|')[1]) + ')', opsi: grup[k] }; });
  }
  function nomorBerikut(tgl) { var th = tgl.slice(0, 4), mx = 0; Store.D.Invoice.forEach(function (i) { var m = i.No_Invoice.match(/^YX\/INV\/(\d{4})\/\d{2}\/(\d+)$/); if (m && m[1] === th) mx = Math.max(mx, +m[2]); }); return 'YX/INV/' + th + '/' + tgl.slice(5, 7) + '/' + String(mx + 1).padStart(4, '0'); }
  function hitungBd() {
    var p = Store.get('Penjualan', bd.pj); if (!p) return null;
    var invs = Store.D.Invoice.filter(function (i) { return i.ID_Penjualan === p.ID_Penjualan && i.Status !== 'Batal'; }), ditagih = U.jumlah(invs, function (i) { return i.Nominal; });
    var t = Store.get('Trip', p.ID_Trip) || {}, dp = Number(Store.S.DP_PERSEN || 50), auto;
    if (bd.jenis === 'DP') auto = Math.min(Math.round(p.Total * dp / 100), p.Total - ditagih); else auto = p.Total - Math.max(ditagih, bd.jenis === 'Full' ? 0 : p.Terbayar);
    if (bd.jenis === 'Pelunasan') auto = p.Total - ditagih;
    var nominal = bd.nominalManual ? bd.nominal : Math.max(0, auto);
    var jt = bd.jtManual ? bd.jt : (bd.jenis === 'Pelunasan' ? (t.Tgl_Berangkat ? U.tambahHari(t.Tgl_Berangkat, -3) : U.tambahHari(bd.terbit, 7)) : U.tambahHari(bd.terbit, Number(Store.S.JATUH_TEMPO_HARI || 3)));
    if (jt < bd.terbit) jt = bd.terbit;
    return { p: p, t: t, c: Store.get('Customer', p.ID_Customer) || {}, ditagih: ditagih, nominal: nominal, sisa: p.Total - ditagih - nominal, jt: jt, adaInv: invs.length, dp: dp };
  }
  function renderBuat(el, q) {
    if (!Hal.hanyaAdmin()) { App.go('invoice'); return; }
    terbitNo = '';
    bd = { pj: q.pj || '', jenis: q.jenis || 'DP', terbit: U.hariIni(), jt: '', nominal: 0, nominalManual: false, jtManual: false, catatan: Store.S.INVOICE_CATATAN, email: true, wa: true };
    if (bd.pj) { var p0 = Store.get('Penjualan', bd.pj); if (p0 && Store.D.Invoice.some(function (i) { return i.ID_Penjualan === bd.pj && i.Status !== 'Batal'; }) && !q.jenis) bd.jenis = 'Pelunasan'; }
    var opsi = opsiPenjualan();
    el.innerHTML = Hal.kepala({ crumbs: ['Transaksi & penjualan', 'Invoice', 'Buat invoice baru'], judul: 'Buat Invoice & Live Preview PDF', sub: 'Generate invoice resmi otomatis, simpan ke Google Drive, daftarkan peserta ke Google Calendar, lalu kirim via Gmail & WhatsApp.',
      aksi: '<span class="status-pill">' + '<span class="dot pulse"></span>Auto-sync engine ' + (C.DEMO ? 'simulasi' : 'online') + '</span>' }) +
      '<div class="grid-12" style="align-items:start"><div class="span-5 span-lg-12 stack" style="gap:16px"><div class="card" id="bd-form"><div class="card__head"><div class="card__title"><h2>' + ic('receipt', 22, 'primary') + 'Detail & Parameter</h2></div><span class="badge mono" id="bd-no">' + nomorBerikut(bd.terbit) + '</span></div>' +
      '<div class="stack" style="gap:16px"><div class="field"><label for="bd-pj"><span>Pilih transaksi / pelanggan</span><a href="#/penjualan?baru=1" style="font-weight:700">+ Baru</a></label><select class="select" id="bd-pj"><option value="">— pilih penjualan yang belum ditagih penuh —</option>' + opsi.map(function (g) { return '<optgroup label="' + esc(g.grup) + '">' + g.opsi.map(function (o) { return '<option value="' + o.v + '"' + (o.v === bd.pj ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select><div class="help">Terhubung dengan database customer & Peserta Trip.</div></div>' +
      '<div class="field"><span class="field-label">Jenis termin tagihan</span><div class="seg seg--primary seg--block" id="bd-jenis"><button data-j="DP">DP ' + (Store.S.DP_PERSEN || 50) + '%</button><button data-j="Pelunasan">Pelunasan</button><button data-j="Full">Full 100%</button></div></div>' +
      '<div class="form"><div class="field"><label for="bd-terbit">Tanggal terbit</label><input class="input" type="date" id="bd-terbit" value="' + bd.terbit + '"></div><div class="field"><label for="bd-jt">Jatuh tempo</label><input class="input" type="date" id="bd-jt"></div></div>' +
      '<div id="bd-calc"></div>' +
      '<div class="field"><label for="bd-cat"><span>Catatan & instruksi rekening</span><span class="soft" style="font-weight:600">Template otomatis</span></label><textarea class="textarea" id="bd-cat" rows="3">' + esc(bd.catatan) + '</textarea></div>' +
      '<div class="card card--tight card--flat" style="background:var(--c-primary-tint);border-color:var(--c-primary-tint-2)"><b class="row primary" style="gap:8px">' + ic('sparkles', 18) + 'Otomatisasi Google Workspace aktif</b><p class="muted" style="font-size:13px;margin:6px 0 10px">Dijalankan begitu invoice diterbitkan:</p><ul class="stack" id="bd-otomasi" style="list-style:none;padding:0;margin:0;gap:8px;font-size:13px"></ul></div>' +
      '<div class="row wrap" style="gap:16px"><label class="switch"><input type="checkbox" id="bd-email" checked><span class="track"></span>Kirim email (Gmail + PDF)</label><label class="switch"><input type="checkbox" id="bd-wa" checked><span class="track"></span>Kirim WhatsApp</label></div>' +
      '<div class="row wrap" style="justify-content:flex-end;gap:8px"><a class="btn btn--plain" href="#/invoice">Batal</a><button class="btn btn--primary" id="bd-terbitkan">' + ic('send', 18) + 'Terbitkan & Kirim</button></div></div></div>' +
      '<div class="card card--tight row"><span class="ic-box">' + ic('folder-open') + '</span><div class="row__text"><b>Penyimpanan cloud terpusat</b><small class="muted" style="display:block">PDF disimpan ke folder Drive trip › Invoice</small></div></div></div>' +
      '<div class="span-7 span-lg-12 stack" style="gap:12px;position:sticky;top:84px"><div class="card card--tight between wrap"><div class="row">' + ic('file-text', 22, 'primary') + '<div><b>Pratinjau lembar invoice</b><small class="muted" style="display:block">A4 · sama dengan PDF yang dikirim</small></div></div><div class="row" style="gap:6px"><div class="seg"><button data-z="-">' + ic('zoom-out', 16) + '</button><button class="num" disabled id="bd-zoom" style="min-width:56px">100%</button><button data-z="+">' + ic('zoom-in', 16) + '</button></div><button class="btn btn--ghost btn--icon" id="bd-print" aria-label="Cetak">' + ic('printer', 18) + '</button><button class="btn btn--ghost btn--icon" id="bd-full" aria-label="Layar penuh">' + ic('maximize-2', 18) + '</button></div></div>' +
      '<div class="paper-stage" id="bd-stage"></div><small class="muted row" style="gap:6px">' + ic('info', 16) + 'Pratinjau otomatis diperbarui setiap kali parameter formulir diubah.</small></div></div>';
    var $ = function (s) { return el.querySelector(s); };
    $('#bd-pj').onchange = function () { bd.pj = this.value; bd.nominalManual = false; var adaInv = Store.D.Invoice.some(function (i) { return i.ID_Penjualan === bd.pj && i.Status !== 'Batal'; }); bd.jenis = adaInv ? 'Pelunasan' : 'DP'; segarBd(el); };
    $('#bd-jenis').onclick = function (e) { var b = e.target.closest('[data-j]'); if (!b) return; bd.jenis = b.dataset.j; bd.nominalManual = false; bd.jtManual = false; segarBd(el); };
    $('#bd-terbit').onchange = function () { bd.terbit = this.value || U.hariIni(); bd.jtManual = false; segarBd(el); };
    $('#bd-jt').onchange = function () { bd.jt = this.value; bd.jtManual = true; segarBd(el); };
    $('#bd-cat').addEventListener('input', C.debounce(function () { bd.catatan = $('#bd-cat').value; pratinjau(el); }, 250));
    $('#bd-email').onchange = function () { bd.email = this.checked; daftarOtomasi(el); }; $('#bd-wa').onchange = function () { bd.wa = this.checked; daftarOtomasi(el); };
    el.querySelector('#bd-stage').parentNode.querySelector('.seg').onclick = function (e) { var b = e.target.closest('[data-z]'); if (!b) return; zoom = Math.max(.5, Math.min(1.4, zoom + (b.dataset.z === '+' ? .1 : -.1))); pratinjau(el); };
    $('#bd-print').onclick = function () { var h = htmlPreview(); if (h) Dok.cetak(h); else UI.toast('Pilih penjualan dulu.', 'warn'); };
    $('#bd-full').onclick = function () { var h = htmlPreview(); if (h) Dok.pratinjau('Pratinjau invoice', h); else UI.toast('Pilih penjualan dulu.', 'warn'); };
    $('#bd-terbitkan').onclick = function () { terbitkan(el, this); };
    segarBd(el);
  }
  function segarBd(el) {
    var r = hitungBd();
    el.querySelectorAll('#bd-jenis [data-j]').forEach(function (b) { b.classList.toggle('on', b.dataset.j === bd.jenis); b.disabled = !!(r && b.dataset.j === 'Full' && r.adaInv); });
    el.querySelector('#bd-no').textContent = nomorBerikut(bd.terbit);
    if (r) { el.querySelector('#bd-jt').value = r.jt; bd.jt = r.jt; }
    el.querySelector('#bd-calc').innerHTML = r ? '<div class="card card--tight card--flat stack" style="background:var(--c-surface-2);gap:10px"><div class="between"><span class="label">Kalkulasi otomatis sistem</span>' + ic('calculator', 16, 'muted') + '</div>' +
      '<div class="between"><span class="muted row" style="gap:4px">Total nilai paket ' + ic('lock', 14) + '</span><b class="num">' + U.rp(r.p.Total) + '</b></div>' + (r.ditagih ? '<div class="between"><span class="muted">Sudah ditagih sebelumnya</span><b class="num">' + U.rp(r.ditagih) + '</b></div>' : '') +
      '<div class="between primary"><span class="row" style="gap:6px;font-weight:700">Nominal tagihan ini <span class="badge">' + Math.round(r.nominal / r.p.Total * 100) + '%</span></span><div class="input-group" style="max-width:190px"><span class="addon">Rp</span><input class="input num" id="bd-nom" inputmode="numeric" value="' + r.nominal.toLocaleString('id-ID') + '" style="font-weight:800;color:var(--c-primary);text-align:right"></div></div>' +
      '<div style="height:1px;background:var(--c-border)"></div><div class="between" style="font-size:13px"><span class="muted">Sisa tagihan setelah invoice</span><b class="num">' + U.rp(Math.max(0, r.sisa)) + '</b></div>' + (r.sisa < 0 ? '<div class="note danger">' + ic('circle-alert') + 'Nominal melebihi sisa yang belum ditagih.</div>' : '') + '</div>'
      : '<div class="note">' + ic('info') + '<span>Pilih penjualan untuk menghitung nominal otomatis.</span></div>';
    var nom = el.querySelector('#bd-nom');
    if (nom) { nom.addEventListener('input', function () { var n = Number(nom.value.replace(/\D/g, '')) || 0; nom.value = n ? n.toLocaleString('id-ID') : ''; bd.nominal = n; bd.nominalManual = true; pratinjau(el); }); nom.addEventListener('change', function () { segarBd(el); }); }
    daftarOtomasi(el); pratinjau(el);
  }
  function daftarOtomasi(el) {
    var r = hitungBd(), box = el.querySelector('#bd-otomasi'); if (!box) return;
    var nama = r ? r.c.Nama : 'customer', trip = r ? r.t.Nama : 'Nama Trip';
    box.innerHTML = [['folder-open', 'PDF dirender dari template Docs & disimpan ke Drive: <code class="mono">/' + esc(Store.S.APP_NAMA) + '/Trips/' + esc(r ? r.t.Kode : 'TRP') + '/Invoice/</code>'], ['calendar-check', 'Event Google Calendar: <b>[' + esc(trip) + '] - ' + esc(nama) + '</b>' + (r && r.p.ID_Event ? ' (diperbarui, tidak dobel)' : ' (dibuat baru)')], ['user-check', 'Customer masuk <b>Peserta Trip</b> & draft manifest disiapkan'], ['mail', bd.email ? 'Email Gmail berlampiran PDF ke ' + esc(r && r.c.Email ? r.c.Email : 'email customer') : '<span class="soft">Email tidak dikirim</span>'], ['message-circle', bd.wa ? 'WhatsApp berisi tautan PDF ke ' + esc(r && r.c.No_WA ? r.c.No_WA : 'nomor customer') : '<span class="soft">WhatsApp tidak dikirim</span>']]
      .map(function (x) { return '<li class="row" style="align-items:flex-start;gap:8px">' + ic(x[0], 18, 'primary') + '<span>' + x[1] + '</span></li>'; }).join('');
  }
  function htmlPreview() {
    var r = hitungBd(); if (!r) return '';
    var no = terbitNo || nomorBerikut(bd.terbit);
    var fake = { No_Invoice: no, ID_Penjualan: r.p.ID_Penjualan, Jenis: bd.jenis, Tgl_Terbit: bd.terbit, Jatuh_Tempo: bd.jt, Nominal: r.nominal, Status: 'Terbit', Kode_Verifikasi: 'PRATINJAU', Catatan: bd.catatan, Status_Proses: '{}' };
    var D = Object.assign({}, Store.D, { Invoice: Store.D.Invoice.filter(function (i) { return i.No_Invoice !== no; }).concat([fake]) });
    var asli = Store.D; Store.D = D; try { return Dok.invoiceHTML(no); } finally { Store.D = asli; }
  }
  function pratinjau(el) {
    var stage = el.querySelector('#bd-stage'); if (!stage) return;
    var h = htmlPreview();
    stage.innerHTML = h || '<div class="paper" style="display:grid;place-items:center;min-height:520px;color:#4A5B78"><div class="empty">' + ic('receipt', 40) + '<b>Pilih penjualan</b><p>Pratinjau invoice A4 tampil di sini.</p></div></div>';
    var p = stage.querySelector('.paper'), w = stage.clientWidth - 32, k = Math.min(1, w / 794) * zoom;
    p.style.transform = 'scale(' + k + ')'; p.style.marginBottom = (-(1 - k) * p.offsetHeight) + 'px';
    var z = el.querySelector('#bd-zoom'); if (z) z.textContent = Math.round(zoom * 100) + '%';
  }
  async function terbitkan(el, btn) {
    var r = hitungBd(); if (!r) { UI.toast('Pilih penjualan terlebih dahulu.', 'warn'); el.querySelector('#bd-pj').focus(); return; }
    if (r.sisa < 0 || r.nominal <= 0) { UI.toast('Periksa nominal tagihan.', 'err'); return; }
    var res = await C.aksi('invoice.buat', { ID_Penjualan: r.p.ID_Penjualan, Jenis: bd.jenis, Nominal: bd.nominalManual ? r.nominal : 0, Tgl_Terbit: bd.terbit, Jatuh_Tempo: bd.jt, Catatan: bd.catatan !== Store.S.INVOICE_CATATAN ? bd.catatan : '', email: bd.email, wa: bd.wa }, { btn: btn, loadingText: 'Menerbitkan…', diam: true });
    if (!res.success) { UI.toast(res.message, 'err'); return; }
    var inv = res.data.invoice; terbitNo = inv.No_Invoice;
    UI.toast(res.data.ulang ? res.message : 'Invoice ' + inv.No_Invoice + ' terbit!', res.data.ulang ? 'info' : 'ok');
    var form = el.querySelector('#bd-form');
    form.innerHTML = '<div class="stack fade" style="gap:16px;align-items:center;text-align:center;padding:12px 0"><span class="ic-box ok" style="width:64px;height:64px;border-radius:20px">' + ic('circle-check', 34) + '</span><div><span class="label">Invoice berhasil diterbitkan</span><h2 class="mono" style="margin-top:4px">' + esc(inv.No_Invoice) + '</h2><p class="muted">' + esc(r.c.Nama) + ' · ' + esc(bd.jenis) + ' ' + U.rp(inv.Nominal) + '</p></div>' +
      '<div id="bd-proses" class="stack" style="width:100%;gap:8px"></div><div class="row wrap" style="justify-content:center;gap:8px"><button class="btn btn--primary" data-act="satu" data-m="pdf" data-no="' + esc(inv.No_Invoice) + '">' + ic('file-down', 18) + 'Lihat PDF</button><button class="btn btn--soft" data-act="satu" data-m="wa" data-no="' + esc(inv.No_Invoice) + '">' + ic('message-circle', 18) + 'Kirim manual via WA</button><a class="btn btn--ghost" href="#/invoice">' + ic('list', 18) + 'Daftar invoice</a><button class="btn btn--plain" id="bd-lagi">' + ic('plus', 18) + 'Invoice lain</button></div></div>';
    Hal.aksiPeta(el, aksiInvoice());
    form.querySelector('#bd-lagi').onclick = function () { renderBuat(el, {}); };
    segarProses(el); pratinjau(el);
  }
  function segarProses(el) {
    var box = el.querySelector('#bd-proses'); if (!box || !terbitNo) return; var inv = Store.get('Invoice', terbitNo); if (!inv) return;
    var p = HT.prosesInvoice(inv), langkah = [['pdf', 'file-text', 'PDF dibuat & disimpan ke Google Drive'], ['cal', 'calendar-check', 'Event Google Calendar dibuat/diperbarui'], ['kirim', 'send', 'Email & WhatsApp masuk antrean kirim']];
    box.innerHTML = langkah.map(function (l) { var s = p[l[0]] || 'antri', tone = s === 'ok' ? 'ok' : s === 'gagal' ? 'danger' : s === 'lewati' ? 'neutral' : 'warn'; return '<div class="note ' + (tone === 'neutral' ? '' : tone) + '" style="text-align:left">' + ic(s === 'ok' ? 'circle-check' : s === 'gagal' ? 'circle-x' : s === 'lewati' ? 'circle' : 'loader-circle', 18, s === 'antri' || s === 'proses' ? 'spin' : '') + '<span class="grow">' + l[2] + '</span><b style="font-size:12px">' + (s === 'ok' ? 'Selesai' : s === 'gagal' ? 'Gagal' : s === 'lewati' ? 'Dilewati' : 'Memproses…') + '</b></div>'; }).join('');
  }

  // ------------------------------------------------------------- lihat invoice
  function renderLihat(el, no) {
    var inv = Store.get('Invoice', no); if (!inv) { el.innerHTML = UI.kosong('receipt', 'Invoice tidak ditemukan', esc(no), '<a class="btn btn--soft" href="#/invoice">Kembali</a>'); return; }
    var x = info(inv), admin = Store.isAdmin(), p = HT.prosesInvoice(inv);
    el.innerHTML = Hal.kepala({ crumbs: ['Invoice', inv.Jenis, inv.Status], judul: inv.No_Invoice, sub: esc(x.c.Nama) + ' · ' + esc(x.t.Nama) + ' · ' + U.rp(inv.Nominal),
      aksi: '<a class="btn btn--ghost" href="#/invoice">' + ic('arrow-left', 18) + 'Kembali</a><button class="btn btn--ghost" data-act="satu" data-m="cetak" data-no="' + esc(no) + '">' + ic('printer', 18) + '<span class="hide-sm">Cetak</span></button><button class="btn btn--primary" data-act="satu" data-m="pdf" data-no="' + esc(no) + '">' + ic('file-down', 18) + (inv.Link_PDF ? 'Buka PDF di Drive' : 'PDF') + '</button>' + (admin ? '<button class="btn btn--ghost btn--icon" data-act="menu" data-no="' + esc(no) + '" aria-label="Aksi lain">' + ic('ellipsis', 18) + '</button>' : '') }) +
      '<div class="grid-12" style="align-items:start"><div class="span-8 span-lg-12"><div class="paper-stage" id="lv-stage">' + Dok.invoiceHTML(no) + '</div></div><div class="span-4 span-lg-12 stack" style="gap:16px"><div class="card"><span class="label">Status otomasi</span><div id="lv-proses" style="margin-top:12px"></div></div>' +
      '<div class="card stack"><span class="label">Ringkasan</span><dl class="kv"><dt>Jenis</dt><dd>' + esc(inv.Jenis) + '</dd><dt>Terbit</dt><dd>' + U.tglId(inv.Tgl_Terbit) + '</dd><dt>Jatuh tempo</dt><dd class="' + (telat(inv) ? 'danger' : '') + '">' + U.tglId(inv.Jatuh_Tempo) + '</dd><dt>Nominal</dt><dd>' + U.rp(inv.Nominal) + '</dd><dt>Dibuat oleh</dt><dd>' + esc(inv.Dibuat_Oleh) + '</dd><dt>Kode verifikasi</dt><dd class="mono">' + esc(inv.Kode_Verifikasi) + '</dd></dl>' +
      '<a class="btn btn--soft btn--sm" target="_blank" rel="noopener" href="' + esc(Dok.verifUrl(Store.S, inv.Kode_Verifikasi)) + '">' + ic('qr-code', 16) + 'Buka halaman verifikasi</a><a class="btn btn--ghost btn--sm" href="#/penjualan?pj=' + inv.ID_Penjualan + '">' + ic('wallet', 16) + 'Detail booking & pembayaran</a>' + (x.c.No_WA ? '<button class="btn btn--ghost btn--sm" data-act="satu" data-m="wa" data-no="' + esc(no) + '">' + ic('message-circle', 16) + 'Kirim manual via WhatsApp</button>' : '') + '</div></div></div>';
    Hal.aksiPeta(el, aksiInvoice()); Dok.skala(el.querySelector('#lv-stage')); segarLihat(el, no);
  }
  function segarLihat(el, no) {
    var inv = Store.get('Invoice', no), box = el.querySelector('#lv-proses'); if (!inv || !box) return;
    var p = HT.prosesInvoice(inv);
    box.innerHTML = '<div class="timeline">' + [['pdf', 'PDF di Google Drive', inv.Link_PDF ? '<a href="' + esc(inv.Link_PDF) + '" target="_blank" rel="noopener">Buka file</a>' : (C.DEMO && p.pdf === 'ok' ? 'Simulasi demo' : '')], ['cal', 'Event Google Calendar', inv.ID_Event_Calendar ? '<span class="mono">' + esc(inv.ID_Event_Calendar.slice(0, 18)) + '…</span>' : ''], ['kirim', 'Email & WhatsApp', '']].map(function (l) { var s = p[l[0]] || 'belum'; return '<div class="tl ' + (s === 'ok' ? 'on' : s === 'gagal' || s === 'lewati' || s === 'belum' ? 'mute' : '') + '"><b>' + l[1] + '</b><small>' + (s === 'ok' ? 'Selesai' : s === 'gagal' ? 'Gagal — coba "Proses ulang"' : s === 'lewati' ? 'Dilewati' : s === 'belum' ? 'Belum diproses' : 'Sedang diproses…') + (l[2] ? ' · ' + l[2] : '') + '</small></div>'; }).join('') + '</div>';
  }

  var H = {
    judul: 'Invoice',
    render: function (el, args, q) { if (args[0] === 'baru') renderBuat(el, q); else if (args[0] === 'lihat') renderLihat(el, args.slice(1).join('/')); else renderDaftar(el); },
    navigasi: function (el, args, q) { H.render(el, args, q); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); window.scrollTo({ top: 0 }); },
    segarkan: function (el, args) {
      if (args[0] === 'baru') { segarProses(el); if (!terbitNo && el.querySelector('#bd-pj')) { /* data berubah dari tempat lain: perbarui kalkulasi */ segarBd(el); } }
      else if (args[0] === 'lihat') segarLihat(el, args.slice(1).join('/'));
      else if (el.querySelector('#iv-list')) isiDaftar(el);
    }
  };
  window.Halaman.invoice = H;
})();
