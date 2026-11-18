/* =====================================================================
   YukBanyuwangi — Invoice (model invoice klien)
   Admin mengisi invoice pertama tiap pemesan; nomor invoice & Customer ID
   dipakai lagi sampai invoice pelunasan. Pratinjau = PDF (satu tata letak).
   Terbit → PDF ke Google Drive (link publik) → opsional kirim WA/Email.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { filter: '', q: '', f: null, kotor: false };

  function baris() { return Math.max(1, Number(Store.S.INV_BARIS) || 15); }
  function dariInvoice(inv) {
    return { ID_Invoice: inv.ID_Invoice, ID_Pesanan: inv.ID_Pesanan, No_Invoice: inv.No_Invoice, Customer_ID: inv.Customer_ID, Judul: inv.Judul, Tanggal: U.tgl(inv.Tanggal), Bill_To: inv.Bill_To,
      Item: (U.parseJson(inv.Item, []) || []).map(function (i) { return { desk: i.desk, qty: i.qty, harga: i.harga }; }), Disc: Number(inv.Disc) || 0, DP: Number(inv.DP) || 0, Note_Judul: inv.Note_Judul, Note_Isi: inv.Note_Isi };
  }
  function dariSaran(idP) { var s = HT.saranInvoice(Store.D, idP, Store.S, U.hariIni()); if (!s) return null; s.ID_Invoice = ''; s.Item = s.Item.map(function (i) { return { desk: i.desk, qty: i.qty, harga: i.harga }; }); return s; }
  function vDari(f, status) {
    var S = Store.S, lama = f.ID_Invoice ? Store.get('Invoice', f.ID_Invoice) : null, p = Store.get('Pesanan', f.ID_Pesanan) || { Nama: '', Tab: '' }, inf = HT.infoPesanan(p, S);
    var items = f.Item.filter(function (i) { return String(i.desk || '').trim() || Number(i.harga); }), h = HT.hitungInvoice(items, f.Disc, f.DP);
    return { inv: { No_Invoice: f.No_Invoice, Customer_ID: f.Customer_ID, Tanggal: f.Tanggal, Judul: f.Judul, Note_Judul: f.Note_Judul, Note_Isi: f.Note_Isi, Status: status || (lama ? lama.Status : 'Draft'), Kode_Verifikasi: lama ? lama.Kode_Verifikasi : '' },
      p: p, inf: inf, items: items, subtotal: h.subtotal, disc: h.disc, total: h.total, dp: h.dp, sisa: h.sisa, rekening: HT.rekeningDari(S), syarat: HT.syaratDari(S, inf),
      billTo: String(f.Bill_To || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean), namaFile: 'Invoice_' + (String(f.Judul || 'Invoice').replace(/[^\w]+/g, '_')) + '_No._' + f.No_Invoice + (lama && Number(lama.Urutan) > 1 ? '_' + lama.Urutan : '') };
  }

  // ---------------------------------------------------------------- daftar
  function daftarRows() {
    var q = st.q.toLowerCase(), S = Store.S;
    return U.urutkan(Store.D.Invoice.filter(function (i) { if (st.filter && i.Status !== st.filter) return false; if (!q) return true; var p = Store.get('Pesanan', i.ID_Pesanan) || {}; return [i.No_Invoice, i.Customer_ID, i.Judul, p.Nama, i.Bill_To].join(' ').toLowerCase().indexOf(q) > -1; }), function (i) { return (i.Tanggal || '') + (i.Dibuat || ''); }, true)
      .map(function (i) { return HT.dataInvoice(Store.D, i.ID_Invoice, S); }).filter(Boolean);
  }
  function tabelDaftar() {
    return UI.tabel({ baris: daftarRows(), klik: function (v) { return v.inv.ID_Invoice; }, kosong: 'Belum ada invoice', kosongIkon: 'receipt', kosongTeks: Store.isAdmin() ? 'Buat invoice pertama dari tombol di atas atau dari detail pesanan.' : '',
      kolom: [
        { label: 'No. invoice', render: function (v) { return '<div class="cell-main"><span class="ic-box" style="width:38px;height:38px;border-radius:12px">' + ic('receipt', 18) + '</span><div class="row__text"><b class="mono">' + esc(v.inv.No_Invoice) + '</b><span class="sub mono">' + esc(v.inv.Customer_ID) + '</span></div></div>'; } },
        { label: 'Judul', render: function (v) { return esc(v.inv.Judul) + (Number(v.inv.Urutan) > 1 ? '<span class="sub">Invoice ke-' + v.inv.Urutan + '</span>' : ''); } },
        { label: 'Tamu', render: function (v) { return '<b class="truncate" style="display:block;max-width:220px">' + esc(v.p.Nama || v.billTo[0] || '-') + '</b><span class="sub truncate" style="max-width:220px">' + esc(v.p.Trip || '') + '</span>'; } },
        { label: 'Tanggal', render: function (v) { return U.tglId(v.inv.Tanggal); } },
        { label: 'Total', num: true, render: function (v) { return U.ribuan(v.total); } },
        { label: 'Sisa', num: true, render: function (v) { return v.sisa > 0 ? U.ribuan(v.sisa) : '<span class="ok">Lunas</span>'; } },
        { label: 'Status', render: function (v) { return UI.badge(v.inv.Status) + (v.inv.Link_PDF && v.inv.Status === 'Terbit' ? '<span class="sub">PDF di Drive</span>' : ''); } }
      ] });
  }

  // ---------------------------------------------------------------- editor
  function itemHTML(f, ro) {
    var maks = baris();
    return '<div class="inv-item"><div class="inv-item__h hide-sm"><span>Deskripsi</span><span>Qty</span><span>Harga (Rp)</span><span class="num">Total</span><span></span></div>' + f.Item.map(function (it, i) {
      return '<div class="inv-item__r" data-i="' + i + '"><input class="input" data-it="desk" value="' + esc(it.desk) + '" placeholder="Deskripsi"' + (ro ? ' disabled' : '') + '><input class="input num" data-it="qty" type="number" min="0" value="' + esc(it.qty) + '" aria-label="Qty"' + (ro ? ' disabled' : '') + '><input class="input num" data-it="harga" inputmode="numeric" value="' + (it.harga ? Number(it.harga).toLocaleString('id-ID') : '') + '" placeholder="0" aria-label="Harga"' + (ro ? ' disabled' : '') + '><span class="num inv-item__t" data-out="t">' + U.ribuan((Number(it.qty) || 0) * (Number(it.harga) || 0)) + '</span>' + (ro ? '<span></span>' : '<button class="icon-btn" data-act="itHapus" data-i="' + i + '" aria-label="Hapus baris">' + ic('x', 18) + '</button>') + '</div>';
    }).join('') + '</div>' + (ro || f.Item.length >= maks ? '' : '<button class="btn btn--soft btn--sm" data-act="itTambah" style="margin-top:8px">' + ic('plus', 16) + 'Tambah baris</button><small class="muted" style="margin-left:8px">' + f.Item.length + '/' + maks + ' baris (model invoice)</small>');
  }
  function totalHTML(f) {
    var v = vDari(f), tg = f.ID_Pesanan ? HT.tagihanPesanan(Store.D, HT.indeks(Store.D), Store.get('Pesanan', f.ID_Pesanan) || {}, Store.S, U.hariIni()) : null;
    return '<dl class="kv"><dt>Subtotal</dt><dd>' + U.rp(v.subtotal) + '</dd><dt>Disc</dt><dd>' + U.rp(v.disc) + '</dd><dt>Total</dt><dd>' + U.rp(v.total) + '</dd><dt>DP</dt><dd>' + U.rp(v.dp) + '</dd><dt><b>' + esc(Store.S.INV_SISA_LABEL || 'Sisa pembayaran') + '</b></dt><dd><b>' + U.rp(v.sisa) + '</b></dd></dl>' +
      (tg ? '<p class="help muted" style="margin-top:6px">Tercatat terbayar: ' + U.rp(tg.terbayar) + ' (DP di sheet ' + U.rp(tg.dp) + (tg.bayar ? ' + Finance ' + U.rp(tg.bayar) : '') + ').</p>' : '');
  }
  var token = 0;
  async function pratinjau(el) {
    var box = el.querySelector('#iv-kertas'); if (!box || !st.f) return;
    var t = ++token, k = await Dok.tataInvoice(vDari(st.f));
    if (t !== token || !box.isConnected) return;
    box.innerHTML = Dok.svgDari(k).map(function (s) { return '<div class="kertas">' + s + '</div>'; }).join('');
  }
  var pratinjauNanti = C.debounce(pratinjau, 320);
  function payload() { var f = st.f; return { ID_Invoice: f.ID_Invoice, ID_Pesanan: f.ID_Pesanan, No_Invoice: String(f.No_Invoice || '').trim(), Customer_ID: String(f.Customer_ID || '').trim(), Judul: f.Judul, Tanggal: f.Tanggal, Bill_To: f.Bill_To, Item: f.Item, Disc: f.Disc, DP: f.DP, Note_Judul: f.Note_Judul, Note_Isi: f.Note_Isi }; }
  async function simpan(el, b) {
    if (!st.f.ID_Pesanan) { UI.toast('Pilih pesanan dulu.', 'warn'); return null; }
    var r = await C.aksi('invoice.simpan', payload(), { btn: b, diam: !b, diamProses: !b });
    if (!r.success) { if (!b) UI.toast(r.message, 'err'); return null; }
    st.kotor = false; st.f.ID_Invoice = r.data.ID_Invoice; history.replaceState(null, '', '#/invoice/' + r.data.ID_Invoice); App.args = [r.data.ID_Invoice]; App.query = {};
    return r.data.ID_Invoice;
  }
  async function terbit(el) {
    var p = Store.get('Pesanan', st.f.ID_Pesanan) || {}, inf = HT.infoPesanan(p, Store.S);
    var pilih = await new Promise(function (ok) {
      var selesai = false;
      UI.modal({ judul: 'Terbitkan invoice ' + (st.f.No_Invoice || ''), ukuran: 'sm', onTutup: function () { if (!selesai) ok(null); },
        isi: '<p class="muted" style="margin-bottom:12px">PDF disimpan ke folder Invoice di Google Drive dan mendapat link yang bisa dibuka tamu.</p><label class="check"><input type="checkbox" id="kr-wa"' + (inf.hp ? ' checked' : ' disabled') + '><span>Kirim link lewat WhatsApp ' + (inf.hp ? '(' + esc(inf.hp) + ')' : '— nomor tidak ada') + '</span></label><label class="check"><input type="checkbox" id="kr-em"' + (inf.email ? '' : ' disabled') + '><span>Kirim lewat email ' + (inf.email ? '(' + esc(inf.email) + ')' : '— email tidak ada') + '</span></label>',
        aksi: [{ label: 'Batal' }, { label: 'Terbitkan', kelas: 'btn--primary', ikon: 'send', klik: function (h) { selesai = true; ok({ wa: h.el.querySelector('#kr-wa').checked, email: h.el.querySelector('#kr-em').checked }); } }] });
    });
    if (!pilih) return;
    var L = UI.langkah('Menerbitkan invoice', ['Menyimpan isian invoice', 'Membuat PDF A4', 'Menyimpan ke Google Drive'].concat(pilih.wa || pilih.email ? ['Mengantrekan kiriman ke tamu'] : []));
    L.aktif(0); var id = await simpan(el, null); if (!id) { L.gagal(0, 'Periksa isian invoice.'); L.tutup(false); return; }
    try {
      L.aktif(1); var v = HT.dataInvoice(Store.D, id, Store.S); v.inv = Object.assign({}, v.inv, { Status: 'Terbit' });
      var k = await Dok.tataInvoice(v), b64 = await Dok.pdfBase64(k);
      L.aktif(2); var res = await C.api('dokumen.simpan', { jenis: 'invoice', ref: id, file: { name: v.namaFile + '.pdf', mime: 'application/pdf', b64: b64 }, kirim: pilih });
      if (!res.success) { L.gagal(2, res.message); L.tutup(false); return; }
      Store.terapkan(res); L.tutup(true, res.message); App.segarkan(); if (res.nq) C.Pekerja.jalan();
      st.f = dariInvoice(Store.get('Invoice', id)); H.editor(el);
    } catch (e) { L.gagal(1, e.message); L.tutup(false); }
  }

  var H = window.Halaman.invoice = {
    render: function (el, args, q) {
      if (args[0] || (q && q.baru)) { H.renderEditor(el, args[0], q || {}); return; }
      st.f = null;
      el.innerHTML = Hal.kepala({ judul: 'Invoice', sub: 'Model invoice YukBanyuwangi. Nomor invoice & Customer ID dari invoice pertama dipakai lagi sampai invoice pelunasan.', aksi: Store.isAdmin() ? '<a class="btn btn--primary" href="#/invoice?baru=1">' + ic('plus', 18) + '<span>Buat invoice</span></a>' : '' }) +
        '<div class="between wrap" style="gap:10px;margin-bottom:14px"><div class="chips-scroll">' + [['', 'Semua'], ['Draft', 'Draft'], ['Terbit', 'Terbit'], ['Batal', 'Batal']].map(function (x) { return '<button class="chip' + (st.filter === x[0] ? ' on' : '') + '" data-act="filter" data-f="' + x[0] + '">' + x[1] + '<span class="n">' + (x[0] ? Store.D.Invoice.filter(function (i) { return i.Status === x[0]; }).length : Store.D.Invoice.length) + '</span></button>'; }).join('') + '</div>' +
        '<div class="input-ic" style="min-width:min(100%,300px)">' + ic('search', 18) + '<input class="input" id="iv-q" type="search" placeholder="Cari nomor, Customer ID, tamu…" value="' + esc(st.q) + '"></div></div><div class="card card--pad0" id="iv-isi">' + tabelDaftar() + '</div>';
      el.oninput = C.debounce(function (e) { if (e.target.id === 'iv-q') { st.q = e.target.value; el.querySelector('#iv-isi').innerHTML = tabelDaftar(); } }, 150);
      Hal.aksiPeta(el, { filter: function (d) { st.filter = d.f; H.render(el, [], {}); } }, function (e) { var r = e.target.closest('tr[data-row]'); if (r) App.go('invoice/' + r.dataset.row); });
    },
    navigasi: function (el, args, q) { H.render(el, args, q); },
    segarkan: function (el, args) {
      if (st.f && el.querySelector('#iv-form')) { var p = el.querySelector('#iv-status'); if (p) p.innerHTML = H.statusHTML(); if (!st.kotor && st.f.ID_Invoice) { var inv = Store.get('Invoice', st.f.ID_Invoice); if (inv) { st.f = dariInvoice(inv); } } pratinjauNanti(el); return; }
      if (!args[0]) { var b = el.querySelector('#iv-isi'); if (b) b.innerHTML = tabelDaftar(); }
    },
    renderEditor: function (el, id, q) {
      if (id) { var inv = Store.get('Invoice', id); if (!inv) { el.innerHTML = UI.kosong('search', 'Invoice tidak ditemukan', '<a href="#/invoice">Kembali</a>'); return; } if (!st.f || st.f.ID_Invoice !== id || !st.kotor) st.f = dariInvoice(inv); }
      else { if (!Hal.hanyaAdmin()) { App.go('invoice'); return; } st.f = (q.pesanan && dariSaran(q.pesanan)) || { ID_Invoice: '', ID_Pesanan: '', No_Invoice: '', Customer_ID: '', Judul: '', Tanggal: U.hariIni(), Bill_To: '', Item: [{ desk: '', qty: 1, harga: 0 }], Disc: 0, DP: 0, Note_Judul: Store.S.INV_NOTE_JUDUL || '', Note_Isi: Store.S.INV_NOTE_TEKS || '' }; st.kotor = !!q.pesanan; }
      el.innerHTML = '<div id="iv"></div>'; H.editor(el);
    },
    statusHTML: function () {
      var inv = st.f.ID_Invoice ? Store.get('Invoice', st.f.ID_Invoice) : null, adm = Store.isAdmin(), s = inv ? inv.Status : 'Belum disimpan';
      return '<div class="between" style="margin-bottom:10px"><b>Status</b>' + (inv ? UI.badge(s) : '<span class="badge neutral">Belum disimpan</span>') + '</div>' +
        (inv && inv.Status === 'Terbit' && inv.Link_PDF ? '<a class="menu-item" href="' + esc(inv.Link_PDF) + '" target="_blank" rel="noopener">' + ic('file-text', 18) + '<span class="row__text"><b>PDF di Google Drive</b><small class="muted" style="display:block">Link publik untuk tamu</small></span>' + ic('external-link', 16, 'muted') + '</a>' : '') +
        (inv && inv.Status === 'Draft' && inv.Link_PDF ? '<div class="note warn" style="margin-bottom:10px">' + ic('triangle-alert') + '<span>Invoice diubah setelah terbit. Terbitkan ulang agar PDF di Drive diperbarui.</span></div>' : '') +
        '<div class="stack" style="gap:8px">' + (adm && (!inv || inv.Status !== 'Batal') ? '<button class="btn btn--primary btn--block" data-act="terbit">' + ic('send', 18) + '<span>' + (inv && inv.Link_PDF ? 'Terbitkan ulang' : 'Terbitkan PDF') + '</span></button><button class="btn btn--ghost btn--block" data-act="simpan">' + ic('save', 18) + '<span>Simpan draft</span></button>' : '') +
        '<button class="btn btn--ghost btn--block" data-act="unduh">' + ic('file-down', 18) + '<span>Unduh PDF</span></button>' +
        (inv && inv.Status === 'Terbit' ? '<button class="btn btn--soft btn--block" data-act="kirim">' + ic('message-circle', 18) + '<span>Kirim ke tamu</span></button>' : '') +
        (adm && inv && inv.Status === 'Terbit' ? '<button class="btn btn--plain btn--block" data-act="batal">' + ic('circle-x', 18) + '<span>Batalkan invoice</span></button>' : '') +
        (adm && inv && inv.Status === 'Draft' ? '<button class="btn btn--plain btn--block" data-act="hapus">' + ic('trash-2', 18) + '<span>Hapus draft</span></button>' : '') + '</div>';
    },
    editor: function (el) {
      var box = el.querySelector('#iv'); if (!box) return;
      var f = st.f, inv = f.ID_Invoice ? Store.get('Invoice', f.ID_Invoice) : null, adm = Store.isAdmin(), ro = !adm || (inv && inv.Status === 'Batal');
      var p = f.ID_Pesanan ? Store.get('Pesanan', f.ID_Pesanan) : null, lain = f.ID_Pesanan ? Store.D.Invoice.filter(function (i) { return i.ID_Pesanan === f.ID_Pesanan && i.ID_Invoice !== f.ID_Invoice && i.Status !== 'Batal'; }) : [];
      box.innerHTML = Hal.kepala({ crumbs: ['Invoice'], judul: inv ? (inv.Judul + ' · ' + inv.No_Invoice) : 'Invoice baru', sub: p ? esc(p.Nama) + ' · ' + esc(p.Trip) : 'Pilih pesanan — isian disarankan otomatis dari data sheet.', aksi: '<a class="btn btn--ghost" href="#/invoice">' + ic('arrow-left', 18) + '<span>Daftar</span></a>' }) +
        '<div class="mf-grid mf-grid--inv"><div class="stack" id="iv-form" style="gap:16px">' +
        '<section class="card"><div class="form">' +
        '<div class="field field--full"><label for="iv-psn">Pesanan</label>' + (inv ? '<input class="input" disabled value="' + esc(p ? p.Nama + ' · ' + p.Tab : inv.ID_Pesanan) + '">' : Hal.pilihPesanan('iv-psn', f.ID_Pesanan, 'Pilih pesanan…')) + (lain.length ? '<div class="help">Invoice ke-' + (lain.length + 1) + ' untuk pemesan ini — nomor & Customer ID melanjutkan invoice pertama (' + esc(lain[0].No_Invoice) + ').</div>' : '') + '</div>' +
        '<div class="field"><label for="iv-judul">Judul</label><input class="input" id="iv-judul" data-f="Judul" list="iv-judul-dl" value="' + esc(f.Judul) + '"' + (ro ? ' disabled' : '') + '><datalist id="iv-judul-dl"><option value="Tagihan DP"><option value="Deposit"><option value="Pelunasan"></datalist></div>' +
        '<div class="field"><label for="iv-tgl">Tanggal</label><input class="input" id="iv-tgl" type="date" data-f="Tanggal" value="' + esc(f.Tanggal) + '"' + (ro ? ' disabled' : '') + '></div>' +
        '<div class="field"><label for="iv-no">Invoice #</label><input class="input mono" id="iv-no" data-f="No_Invoice" value="' + esc(f.No_Invoice) + '"' + (ro ? ' disabled' : '') + '><div class="help">Urut + bulan + tahun terbit, mis. 01112026</div></div>' +
        '<div class="field"><label for="iv-cid">Customer ID</label><input class="input mono" id="iv-cid" data-f="Customer_ID" value="' + esc(f.Customer_ID) + '"' + (ro ? ' disabled' : '') + '><div class="help">' + esc(Store.S.INV_HURUF || 'P') + ' / nomor urut / bulan trip (romawi) / tahun</div></div>' +
        '<div class="field field--full"><label for="iv-bill">Bill to</label><textarea class="textarea" id="iv-bill" data-f="Bill_To" rows="3"' + (ro ? ' disabled' : '') + '>' + esc(f.Bill_To) + '</textarea></div></div></section>' +
        '<section class="card"><h2 class="card-h">Rincian</h2><div id="iv-item">' + itemHTML(f, ro) + '</div>' +
        '<div class="form" style="margin-top:16px"><div class="field"><label for="iv-disc">Disc</label><div class="input-group"><span class="addon">Rp</span><input class="input num" id="iv-disc" data-f="Disc" data-uang inputmode="numeric" value="' + (f.Disc ? Number(f.Disc).toLocaleString('id-ID') : '') + '"' + (ro ? ' disabled' : '') + '></div></div>' +
        '<div class="field"><label for="iv-dp">DP</label><div class="input-group"><span class="addon">Rp</span><input class="input num" id="iv-dp" data-f="DP" data-uang inputmode="numeric" value="' + (f.DP ? Number(f.DP).toLocaleString('id-ID') : '') + '"' + (ro ? ' disabled' : '') + '></div></div></div><div id="iv-total" style="margin-top:12px">' + totalHTML(f) + '</div></section>' +
        '<section class="card"><h2 class="card-h">Note</h2><div class="form"><div class="field"><label for="iv-nj">Judul note</label><input class="input" id="iv-nj" data-f="Note_Judul" value="' + esc(f.Note_Judul) + '"' + (ro ? ' disabled' : '') + '></div><div class="field"><label for="iv-ni">Teks note</label><input class="input" id="iv-ni" data-f="Note_Isi" value="' + esc(f.Note_Isi) + '"' + (ro ? ' disabled' : '') + '></div></div><p class="help muted" style="margin-top:8px">Rekening, syarat & ketentuan, tanda tangan dan cap diatur Admin di Pengaturan → Perusahaan & Invoice.</p></section>' +
        '</div><aside class="mf-samping"><div class="card card--tight" id="iv-status">' + H.statusHTML() + '</div><div class="card card--pad0 kertas-panel"><div class="kertas-panel__h"><b>Pratinjau</b><small class="muted">Sama persis dengan PDF</small></div><div id="iv-kertas" class="kertas-tumpuk">' + UI.kerangka(6, 3) + '</div></div></aside></div>';
      var form = box.querySelector('#iv-form');
      function ubah() { st.kotor = true; box.querySelector('#iv-total').innerHTML = totalHTML(st.f); pratinjauNanti(el); }
      form.addEventListener('input', function (e) {
        var t = e.target;
        if (t.dataset.f) { if (t.hasAttribute('data-uang')) { var v = t.value.replace(/\D/g, ''); t.value = v ? Number(v).toLocaleString('id-ID') : ''; st.f[t.dataset.f] = Number(v) || 0; } else st.f[t.dataset.f] = t.value; }
        if (t.dataset.it) { var r = t.closest('[data-i]'), it = st.f.Item[+r.dataset.i]; if (t.dataset.it === 'harga') { var h = t.value.replace(/\D/g, ''); t.value = h ? Number(h).toLocaleString('id-ID') : ''; it.harga = Number(h) || 0; } else it[t.dataset.it] = t.dataset.it === 'qty' ? Number(t.value) || 0 : t.value; r.querySelector('[data-out="t"]').textContent = U.ribuan((Number(it.qty) || 0) * (Number(it.harga) || 0)); }
        ubah();
      });
      form.addEventListener('change', function (e) {
        if (e.target.id !== 'iv-psn') return;
        var s = e.target.value ? dariSaran(e.target.value) : null; if (!s) return;
        st.f = s; st.kotor = true; H.editor(el);
      });
      Hal.aksiPeta(el, {
        itTambah: function () { if (st.f.Item.length >= baris()) return; st.f.Item.push({ desk: '', qty: 1, harga: 0 }); box.querySelector('#iv-item').innerHTML = itemHTML(st.f, ro); var r = box.querySelectorAll('[data-it="desk"]'); r[r.length - 1].focus(); ubah(); },
        itHapus: function (d) { st.f.Item.splice(+d.i, 1); if (!st.f.Item.length) st.f.Item.push({ desk: '', qty: 1, harga: 0 }); box.querySelector('#iv-item').innerHTML = itemHTML(st.f, ro); ubah(); },
        simpan: async function (d, b) { if (await simpan(el, b)) H.editor(el); },
        terbit: function () { terbit(el); },
        unduh: async function () { var v = vDari(st.f), k = await Dok.tataInvoice(v); if (!Dok.bolehUnduh()) return; var selesai = UI.proses('Membuat PDF'); try { (await Dok.pdfDari(k)).save(Dok.namaFile(v.namaFile) + '.pdf'); selesai(true, 'PDF diunduh'); C.api('laporan.catat', { jenis: 'invoice', periode: v.inv.No_Invoice, format: 'pdf' }, { senyap: true }); } catch (e) { selesai(false); UI.toast(e.message, 'err'); } },
        kirim: async function (d, b) {
          var inf = HT.infoPesanan(Store.get('Pesanan', st.f.ID_Pesanan) || {}, Store.S);
          var ok = await UI.konfirmasi({ judul: 'Kirim invoice ke tamu?', teks: 'Link PDF dikirim lewat WhatsApp' + (inf.hp ? ' ke ' + esc(inf.hp) : '') + (inf.email ? ' dan email ke ' + esc(inf.email) : '') + '.', ok: 'Kirim', ikon: 'send' });
          if (!ok) return; var r = await C.aksi('invoice.kirim', { id: st.f.ID_Invoice, wa: true, email: !!inf.email }, { btn: b, proses: 'Mengantrekan kiriman' }); if (r.success) C.Pekerja.jalan();
        },
        batal: async function (d, b) { var a = await UI.konfirmasi({ judul: 'Batalkan invoice ' + st.f.No_Invoice + '?', teks: 'Invoice ditandai BATAL (tetap tersimpan sebagai arsip).', ok: 'Batalkan', bahaya: true, input: { label: 'Alasan', wajib: true } }); if (!a) return; var r = await C.aksi('invoice.batal', { id: st.f.ID_Invoice, alasan: a }, { btn: b }); if (r.success) { st.f = dariInvoice(Store.get('Invoice', st.f.ID_Invoice)); H.editor(el); } },
        hapus: async function (d, b) { if (!(await UI.konfirmasi({ judul: 'Hapus draft invoice?', ok: 'Hapus', bahaya: true }))) return; var r = await C.aksi('invoice.hapus', { id: st.f.ID_Invoice }, { btn: b }); if (r.success) { st.f = null; App.go('invoice'); } }
      });
      pratinjau(el);
    }
  };
})();
