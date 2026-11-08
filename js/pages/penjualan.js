/* YukX — Halaman Penjualan, DP & Tagihan (Kanban seret + tabel) */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { mode: C.LS.get('yukx:pj-mode', 'kanban'), q: '', trip: '', f: 'semua', batal: false, lebih: {} }, BATAS = 6;
  var KOL = [{ id: 'booking', label: 'Booking Fee', warna: 'var(--c-warn)' }, { id: 'dp', label: 'DP Terbayar', warna: 'var(--c-primary)' }, { id: 'pelunasan', label: 'Menunggu Pelunasan', warna: '#B45309' }, { id: 'lunas', label: 'Lunas & Berangkat', warna: 'var(--c-ok)' }];

  function semua() { var D = Store.D, ix = HT.indeks(D), today = U.hariIni(); return D.Penjualan.map(function (p) { return HT.ringkasPj(D, ix, p, today, Store.S); }); }
  function saring(rows) {
    var q = st.q.toLowerCase();
    return rows.filter(function (r) {
      if (r.pj.Status === 'Batal' && st.f !== 'batal') return false;
      if (st.f === 'batal' && r.pj.Status !== 'Batal') return false;
      if (st.trip && r.pj.ID_Trip !== st.trip) return false;
      if (st.f === 'review' && (r.review || r.pj.Status === 'Batal')) return false;
      if (st.f === 'telat' && !r.telat) return false;
      if (st.f === 'verif' && !Store.D.Pembayaran.some(function (b) { return b.ID_Penjualan === r.id && b.Status_Verifikasi === 'Menunggu'; })) return false;
      return !q || (r.cust.Nama + ' ' + r.trip.Nama + ' ' + r.id + ' ' + r.invoices.map(function (i) { return i.No_Invoice; }).join(' ')).toLowerCase().indexOf(q) > -1;
    });
  }

  // ------------------------------------------------------------- form penjualan
  function formPenjualan(pj, preset) {
    pj = pj || {}; preset = preset || {};
    var D = Store.D, v = Object.assign({ Jumlah_Pax: 1 }, pj, preset);
    var custOpsi = U.urutkan(D.Customer.filter(function (c) { return c.Status !== 'Dihapus'; }), function (c) { return c.Nama; }).map(function (c) { return { v: c.ID_Customer, l: c.Nama + (c.Kota ? ' · ' + c.Kota : '') }; });
    var today = U.hariIni(), tripOpsi = U.urutkan(D.Trip.filter(function (t) { return t.Status !== 'Batal' && (t.Tgl_Pulang >= today || t.ID_Trip === pj.ID_Trip); }), function (t) { return t.Tgl_Berangkat; }).map(function (t) {
      var isi = U.jumlah(D.Penjualan.filter(function (p) { return p.ID_Trip === t.ID_Trip && p.Status !== 'Batal' && p.ID_Penjualan !== pj.ID_Penjualan; }), function (p) { return p.Jumlah_Pax; });
      return { v: t.ID_Trip, l: t.Nama + ' · ' + U.tglId(t.Tgl_Berangkat) + ' · sisa ' + Math.max(0, t.Kuota - isi) + ' kursi' };
    });
    var h = UI.modal({ judul: pj.ID_Penjualan ? 'Ubah penjualan ' + pj.ID_Penjualan : 'Catat penjualan baru', sub: 'Total dihitung otomatis: pax × harga − diskon. Status Booking/DP/Lunas mengikuti pembayaran.', ukuran: 'lg',
      isi: UI.form([
        { name: 'ID_Customer', label: 'Customer', type: 'select', wajib: true, full: true, kosong: '— pilih customer —', opsi: custOpsi, labelKanan: '<a href="#/customer?baru=1" style="font-weight:700">+ Customer baru</a>' },
        { name: 'ID_Trip', label: 'Trip', type: 'select', wajib: true, full: true, kosong: '— pilih trip —', opsi: tripOpsi },
        { name: 'Jumlah_Pax', label: 'Jumlah pax', type: 'number', wajib: true, attr: ' min="1" step="1"' },
        { name: 'Harga_per_Pax', label: 'Harga per pax', type: 'rupiah', wajib: true },
        { name: 'Diskon', label: 'Diskon / promo', type: 'rupiah' },
        { name: 'Tgl_Booking', label: 'Tanggal booking', type: 'date', nilai: today },
        { name: 'Catatan', label: 'Catatan', type: 'textarea', rows: 2, full: true, ph: 'Request khusus, PIC corporate, termin…' },
        { html: '<div class="between card card--tight card--flat" style="background:var(--c-primary-tint);border-color:var(--c-primary-tint-2)"><span class="row" style="gap:8px">' + ic('calculator', 18, 'primary') + '<b>Total transaksi</b></span><b class="num" id="pj-total" style="font-size:22px;color:var(--c-primary)">Rp 0</b></div>', full: true },
        pj.ID_Penjualan ? { html: '', full: true } : { name: 'lanjutInvoice', label: 'Setelah simpan', type: 'switch', teks: 'Langsung buat invoice DP', nilai: true, full: true }
      ], v),
      aksi: [{ label: 'Batal' }, { label: pj.ID_Penjualan ? 'Simpan perubahan' : 'Simpan penjualan', kelas: 'btn--primary', ikon: 'check', klik: async function (hh, b) {
        if (!UI.cekWajib(hh.body)) return false;
        var d = UI.bacaForm(hh.body); d.ID_Penjualan = pj.ID_Penjualan || '';
        var r = await C.aksi('penjualan.simpan', d, { btn: b, loadingText: 'Menyimpan…' });
        if (r.success && d.lanjutInvoice && r.data && r.data.ID_Penjualan) setTimeout(function () { App.go('invoice/baru?pj=' + r.data.ID_Penjualan); }, 250);
        return r.success;
      } }] });
    UI.siapkanForm(h.body);
    var f = function (n) { return h.body.querySelector('[name="' + n + '"]'); };
    function total() { var v2 = UI.bacaForm(h.body); h.body.querySelector('#pj-total').textContent = U.rp(Math.max(0, (Number(v2.Jumlah_Pax) || 0) * v2.Harga_per_Pax - v2.Diskon)); }
    f('ID_Trip').addEventListener('change', function () { var t = Store.get('Trip', this.value); if (t && !pj.ID_Penjualan) { f('Harga_per_Pax').value = Number(t.Harga_Default).toLocaleString('id-ID'); total(); } });
    ['Jumlah_Pax', 'Harga_per_Pax', 'Diskon'].forEach(function (n) { f(n).addEventListener('input', total); f(n).addEventListener('rupiah', total); });
    if (!v.Harga_per_Pax && v.ID_Trip) { var t0 = Store.get('Trip', v.ID_Trip); if (t0) f('Harga_per_Pax').value = Number(t0.Harga_Default).toLocaleString('id-ID'); }
    total();
  }

  // ------------------------------------------------------------- form pembayaran
  function formBayar(idPj, preset) {
    preset = preset || {};
    var D = Store.D, ix = HT.indeks(D), today = U.hariIni();
    var aktif = D.Penjualan.filter(function (p) { return p.Status !== 'Batal' && p.Status !== 'Lunas'; }).map(function (p) { return HT.ringkasPj(D, ix, p, today, Store.S); });
    var pj = idPj ? Store.get('Penjualan', idPj) : null, r = pj ? HT.ringkasPj(D, ix, pj, today, Store.S) : null;
    var v = Object.assign({ ID_Penjualan: idPj || '', Tanggal: today, Metode: 'Transfer BCA', Jenis: '', Nominal: r ? r.sisa : '', cek: true }, preset);
    var h = UI.modal({ judul: 'Input pembayaran', sub: 'Sisa tagihan, status, invoice & deskripsi event Calendar diperbarui otomatis.', ukuran: 'md',
      isi: UI.form([
        { name: 'ID_Penjualan', label: 'Penjualan', type: 'select', wajib: true, full: true, kosong: '— pilih booking —', opsi: aktif.map(function (x) { return { v: x.id, l: x.cust.Nama + ' · ' + x.trip.Nama + ' · sisa ' + U.rp(x.sisa) }; }) },
        { html: '<div id="by-info"></div>', full: true },
        { name: 'Jenis', label: 'Jenis', type: 'select', kosong: 'Otomatis', opsi: ['DP', 'Cicilan', 'Pelunasan'] },
        { name: 'Tanggal', label: 'Tanggal bayar', type: 'date', wajib: true },
        { name: 'Nominal', label: 'Nominal', type: 'rupiah', wajib: true },
        { name: 'Metode', label: 'Metode', type: 'select', opsi: ['Transfer BCA', 'Transfer Mandiri', 'Transfer BNI', 'Transfer BRI', 'QRIS', 'Tunai', 'Kartu Kredit'] },
        { html: '<label class="field-label">Bukti transfer (opsional)</label><div class="drop" id="by-bukti" tabindex="0" role="button">' + ic('image', 24) + '<b>Pilih foto bukti transfer</b><small>Diperkecil otomatis · disimpan ke folder Bukti Bayar trip</small></div>', full: true },
        { name: 'cek', label: 'Verifikasi', type: 'switch', teks: 'Sudah dicek di mutasi rekening', full: true, help: 'Matikan bila bukti baru masuk dan belum dicek — status jadi "Menunggu" dan tidak dihitung dulu.' },
        { name: 'Catatan', label: 'Catatan', full: true }
      ], v),
      aksi: [{ label: 'Batal' }, { label: 'Simpan pembayaran', kelas: 'btn--primary', ikon: 'hand-coins', klik: async function (hh, b) {
        if (!UI.cekWajib(hh.body)) return false;
        var d = UI.bacaForm(hh.body); d.Status_Verifikasi = d.cek ? 'Terverifikasi' : 'Menunggu'; d.Link_Bukti = bukti || '';
        if (berkas && !C.DEMO) { var up = await C.api('bukti.unggah', { file: berkas, idPenjualan: d.ID_Penjualan }); if (up.success) d.Link_Bukti = up.data.url; }
        var res = await C.aksi('pembayaran.simpan', d, { btn: b, loadingText: 'Mencatat…' }); return res.success;
      } }] });
    UI.siapkanForm(h.body);
    var bukti = '', berkas = null;
    function info() {
      var id = h.body.querySelector('[name="ID_Penjualan"]').value, p = Store.get('Penjualan', id), box = h.body.querySelector('#by-info');
      if (!p) { box.innerHTML = ''; return; } var rr = HT.ringkasPj(Store.D, HT.indeks(Store.D), p, today, Store.S);
      box.innerHTML = '<dl class="kv"><dt>Total</dt><dd>' + U.rp(rr.total) + '</dd><dt>Terbayar</dt><dd class="ok">' + U.rp(rr.bayar) + '</dd><dt>Sisa tagihan</dt><dd class="warn">' + U.rp(rr.sisa) + '</dd></dl>';
      var nm = h.body.querySelector('[name="Nominal"]'); if (!nm.value || nm.dataset.auto) { nm.value = rr.sisa.toLocaleString('id-ID'); nm.dataset.auto = 1; }
    }
    h.body.querySelector('[name="ID_Penjualan"]').onchange = function () { h.body.querySelector('[name="Nominal"]').dataset.auto = 1; info(); };
    h.body.querySelector('[name="Nominal"]').addEventListener('input', function () { delete this.dataset.auto; });
    h.body.querySelector('#by-bukti').onclick = async function () { var g = await UI.pilihGambar({ max: 1280, q: 0.8 }); if (!g) return; berkas = g; bukti = C.DEMO ? '' : ''; this.innerHTML = '<img src="data:' + g.mime + ';base64,' + g.b64 + '" alt="Bukti" style="max-height:140px;border-radius:10px" width="' + g.w + '" height="' + g.h + '"><small>' + esc(g.name) + ' · ' + Math.round(g.b64.length * 0.75 / 1024) + ' KB</small>'; };
    info();
  }

  // ------------------------------------------------------------- detail booking
  function detail(id) {
    var h = UI.modal({ judul: 'Detail booking', ukuran: 'lg', isi: '<div id="dt"></div>', aksi: [{ label: 'Tutup' }] });
    function isi() {
      var D = Store.D, pj = Store.get('Penjualan', id); if (!pj) { h.tutup(); return; }
      var r = HT.ringkasPj(D, HT.indeks(D), pj, U.hariIni(), Store.S), admin = Store.isAdmin();
      var bys = U.urutkan(D.Pembayaran.filter(function (b) { return b.ID_Penjualan === id; }), function (b) { return b.Tanggal + b.ID_Bayar; });
      h.el.querySelector('.modal__head h2').textContent = r.cust.Nama + ' · ' + id;
      h.body.querySelector('#dt').innerHTML = '<div class="row" style="margin-bottom:16px">' + Hal.tripFoto(r.trip) + '<div class="row__text"><b style="font-size:17px">' + esc(r.trip.Nama) + '</b><div class="muted">' + F.rentang(r.trip.Tgl_Berangkat, r.trip.Tgl_Pulang) + ' · ' + pj.Jumlah_Pax + ' pax · booking ' + U.tglId(pj.Tgl_Booking) + ' oleh ' + esc(pj.Dibuat_Oleh) + '</div></div>' + UI.badge(pj.Status) + '</div>' +
        '<div class="grid-12" style="gap:12px"><div class="span-6"><dl class="kv"><dt>Harga × pax</dt><dd>' + U.rp(pj.Harga_per_Pax) + ' × ' + pj.Jumlah_Pax + '</dd><dt>Diskon</dt><dd>-' + U.rp(pj.Diskon) + '</dd><dt>Total</dt><dd>' + U.rp(r.total) + '</dd><dt>Terbayar</dt><dd class="ok">' + U.rp(r.bayar) + ' (' + r.persen + '%)</dd><dt>Sisa</dt><dd class="warn">' + U.rp(r.sisa) + '</dd><dt>Jatuh tempo</dt><dd>' + (r.jatuhTempo ? U.tglId(r.jatuhTempo) : '-') + '</dd></dl></div>' +
        '<div class="span-6 stack" style="gap:8px">' + (r.peserta ? '<div class="note ok">' + ic('circle-check') + '<span>Sudah masuk daftar Peserta Trip' + (r.review ? ' · direview Admin ✓' : ' · belum direview') + '</span></div>' : '<div class="note warn">' + ic('triangle-alert') + '<span>Belum masuk daftar peserta — terbitkan invoice atau tandai review.</span></div>') +
        '<div class="note">' + ic('users') + '<span>Data rombongan ' + r.anggotaLengkap + '/' + pj.Jumlah_Pax + ' lengkap · manifest ' + (r.manifest ? esc(r.manifest.Status) + ' v' + r.manifest.Versi : 'belum dibuat') + '</span></div>' +
        (pj.ID_Event ? '<div class="note">' + ic('calendar-check') + '<span>Event Calendar aktif · deskripsi diperbarui otomatis tiap pembayaran</span></div>' : '') + (pj.Catatan ? '<div class="quote">' + esc(pj.Catatan) + '</div>' : '') + '</div></div>' +
        '<h3 style="margin:20px 0 10px">Pembayaran</h3>' + UI.tabel({ kolom: [
          { label: 'Tanggal', render: function (b) { return '<b>' + U.tglId(b.Tanggal) + '</b><span class="sub">' + esc(b.ID_Bayar) + '</span>'; } }, { label: 'Jenis', render: function (b) { return esc(b.Jenis) + '<span class="sub">' + esc(b.Metode) + '</span>'; } },
          { label: 'Nominal', num: true, render: function (b) { return '<b>' + U.rp(b.Nominal) + '</b>'; } }, { label: 'Status', render: function (b) { return UI.badge(b.Status_Verifikasi); } },
          { label: '', mlabel: '', render: function (b) { return (b.Status_Verifikasi === 'Menunggu' && admin ? '<button class="btn btn--ok btn--sm" data-x="verif" data-id="' + b.ID_Bayar + '">' + ic('check', 16) + 'Verifikasi</button> <button class="btn btn--danger-ghost btn--sm" data-x="tolak" data-id="' + b.ID_Bayar + '">Tolak</button>' : '') + (b.Link_Bukti ? ' <a class="btn btn--ghost btn--sm btn--icon" href="' + esc(b.Link_Bukti) + '" target="_blank" rel="noopener" aria-label="Bukti">' + ic('image', 16) + '</a>' : '') + (b.Status_Verifikasi === 'Terverifikasi' ? ' <button class="btn btn--ghost btn--sm" data-x="kuitansi" data-id="' + b.ID_Bayar + '">' + ic('printer', 16) + 'Kuitansi</button>' : '') + (admin ? ' <button class="btn btn--plain btn--sm btn--icon" data-x="hapusBayar" data-id="' + b.ID_Bayar + '" aria-label="Hapus">' + ic('trash-2', 16) + '</button>' : ''); } }
        ], baris: bys, kosong: 'Belum ada pembayaran', kosongIkon: 'wallet', tanpaMain: true }) +
        '<h3 style="margin:20px 0 10px">Invoice</h3><div class="stack" style="gap:6px">' + (r.invoices.length ? r.invoices.map(function (i) { return '<button class="menu-item" data-x="inv" data-no="' + esc(i.No_Invoice) + '" style="min-height:52px;border:1px solid var(--c-border)">' + ic('receipt', 18, 'primary') + '<span class="row__text mono truncate">' + esc(i.No_Invoice) + '</span><span class="muted hide-sm">' + esc(i.Jenis) + '</span><b class="num">' + U.rp(i.Nominal) + '</b>' + UI.badge(i.Status, null, false) + '</button>'; }).join('') : '<small class="muted">Belum ada invoice.</small>') + '</div>' +
        (admin && pj.Status !== 'Batal' ? '<div class="row wrap" style="margin-top:20px;gap:8px"><button class="btn btn--primary btn--sm" data-x="bayar">' + ic('hand-coins', 16) + 'Input pembayaran</button><a class="btn btn--soft btn--sm" href="#/invoice/baru?pj=' + id + '">' + ic('receipt', 16) + 'Buat invoice</a><button class="btn btn--soft btn--sm" data-x="review">' + ic('user-check', 16) + (r.review ? 'Batalkan review' : 'Tandai sudah masuk peserta') + '</button><a class="btn btn--ghost btn--sm" href="#/manifest/' + pj.ID_Trip + '?pj=' + id + '">' + ic('users', 16) + 'Data rombongan</a><button class="btn btn--ghost btn--sm" data-x="edit">' + ic('pencil', 16) + 'Ubah</button><button class="btn btn--danger-ghost btn--sm" data-x="batal">' + ic('circle-x', 16) + 'Batalkan</button></div>' : '');
    }
    isi(); var lepas = function () { if (!h.ditutup) isi(); }; App.padaSegar(lepas);
    h.body.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; var x = b.dataset.x, pj = Store.get('Penjualan', id);
      if (x === 'verif') C.aksi('pembayaran.verifikasi', { id: b.dataset.id, status: 'Terverifikasi' }, { btn: b });
      if (x === 'tolak') { var al = await UI.konfirmasi({ judul: 'Tolak pembayaran?', teks: 'Pembayaran tidak akan dihitung.', input: { label: 'Alasan', wajib: true }, ok: 'Tolak', bahaya: true }); if (al) C.aksi('pembayaran.verifikasi', { id: b.dataset.id, status: 'Ditolak', catatan: al }); }
      if (x === 'hapusBayar') { if (await UI.konfirmasi({ judul: 'Hapus pembayaran ini?', teks: 'Sisa tagihan & status dihitung ulang.', ok: 'Hapus', bahaya: true })) C.aksi('pembayaran.hapus', { id: b.dataset.id }); }
      if (x === 'kuitansi') Dok.pratinjau('Kuitansi ' + b.dataset.id, Dok.kuitansiHTML(b.dataset.id));
      if (x === 'inv') { h.tutup(); App.go('invoice/lihat/' + encodeURIComponent(b.dataset.no)); }
      if (x === 'bayar') formBayar(id);
      if (x === 'review') C.aksi('penjualan.review', { id: id, nilai: pj.Review_Peserta !== 'YA' }, { btn: b });
      if (x === 'edit') formPenjualan(pj);
      if (x === 'batal') { var a = await UI.konfirmasi({ judul: 'Batalkan penjualan ' + id + '?', teks: 'Invoice yang belum lunas ikut dibatalkan, peserta dikeluarkan dari daftar, dan event Calendar dihapus.', input: { label: 'Alasan pembatalan', wajib: true, area: true }, ok: 'Batalkan penjualan', bahaya: true }); if (a) C.aksi('penjualan.batal', { id: id, alasan: a }); }
    });
  }

  // ------------------------------------------------------------- kartu kanban
  function kartu(r) {
    var admin = Store.isAdmin(), i = r.invTerakhir, pj = r.pj, telat = r.telat;
    var aksi = '';
    if (admin) {
      if (r.tahap === 'booking') aksi = (r.peserta ? '' : '<button class="btn btn--soft btn--sm" data-act="review" data-id="' + r.id + '">' + ic('user-check', 15) + 'Verifikasi</button>') + '<button class="btn btn--primary btn--sm" data-act="bayar" data-id="' + r.id + '" data-jenis="DP">' + ic('wallet', 15) + 'Catat DP</button>';
      else if (r.tahap === 'dp') aksi = '<a class="btn btn--soft btn--sm" href="#/invoice/baru?pj=' + r.id + '&jenis=Pelunasan">' + ic('receipt', 15) + 'Invoice pelunasan</a>';
      else if (r.tahap === 'pelunasan') aksi = '<a class="btn btn--soft btn--sm" target="_blank" rel="noopener" href="https://wa.me/' + U.hp62(r.cust.No_WA) + '?text=' + encodeURIComponent('Halo ' + r.cust.Nama + ', mengingatkan pelunasan ' + r.trip.Nama + ' sebesar ' + U.rp(r.sisa) + (r.jatuhTempo ? ' paling lambat ' + U.tglPanjang(r.jatuhTempo) : '') + '. Terima kasih 🙏') + '">' + ic('send', 15) + 'Tagih (WA)</a><button class="btn btn--ok btn--sm" data-act="bayar" data-id="' + r.id + '" data-jenis="Pelunasan">' + ic('check-check', 15) + 'Lunas</button>';
      else aksi = '<button class="btn btn--soft btn--sm" data-act="kuitansi" data-id="' + r.id + '">' + ic('printer', 15) + 'Cetak kuitansi</button>';
    }
    return '<article class="kcard" draggable="' + (admin && pj.Status !== 'Batal') + '" data-id="' + r.id + '" data-tahap="' + r.tahap + '">' +
      '<div class="between"><span class="badge ' + (r.tahap === 'lunas' ? 'ok' : '') + ' mono" style="font-size:10.5px">' + esc(i ? i.No_Invoice.replace('YX/INV/', '#') : r.id) + '</span><small class="' + (telat ? 'danger' : r.hari <= 7 && r.hari >= 0 ? 'warn' : 'muted') + '" style="font-weight:700">' + (telat ? 'Telat bayar' : r.hari < 0 ? 'Selesai' : 'H-' + r.hari) + '</small></div>' +
      '<div><b class="truncate" style="display:block;font-size:15px">' + esc(r.cust.Nama) + '</b><small class="muted row" style="gap:4px">' + ic('map', 14) + '<span class="truncate">' + esc(r.trip.Nama) + ' · ' + pj.Jumlah_Pax + ' pax</span></small></div>' +
      '<dl class="kv"><dt>Total</dt><dd>' + U.rp(r.total) + '</dd><dt>Terbayar</dt><dd class="primary">' + U.rp(r.bayar) + '</dd>' + (r.sisa ? '<dt>Sisa</dt><dd class="warn">' + U.rp(r.sisa) + '</dd>' : '') + '</dl>' +
      '<div class="stack" style="gap:6px"><div class="progress ' + (r.persen >= 100 ? 'ok' : '') + '"><i style="width:' + r.persen + '%"></i></div><div class="between"><small class="muted">' + r.persen + '% terbayar</small><small class="' + (telat ? 'danger' : 'muted') + '">' + (r.jatuhTempo && r.sisa ? 'Jatuh tempo ' + U.tglId(r.jatuhTempo) : r.tahap === 'lunas' ? 'Lunas' : '') + '</small></div></div>' +
      (r.tahap === 'lunas' ? (r.manifest && r.manifest.Status === 'Final' ? '<div class="note ok">' + ic('file-check') + '<span>Manifest final siap dilampirkan</span></div>' : '<div class="note">' + ic('clipboard-list') + '<span>Manifest ' + (r.manifest ? 'masih draft' : 'belum dibuat') + '</span></div>') :
        r.peserta ? '<div class="note ok">' + ic('circle-check') + '<span>Sudah masuk peserta trip' + (r.review ? ' ✓' : '') + '</span></div>' : '<div class="note warn">' + ic('triangle-alert') + '<span>Belum masuk daftar peserta trip</span></div>') +
      (pj.ID_Event ? '<small class="muted row" style="gap:6px">' + ic('calendar-check', 15, 'primary') + 'Event Calendar · auto-synced</small>' : '') +
      (aksi ? '<div class="row wrap" style="gap:6px">' + aksi + '</div>' : '') + '</article>';
  }

  var H = {
    judul: 'Penjualan',
    render: function (el, args, q) {
      var admin = Store.isAdmin();
      if (q.trip) st.trip = q.trip;
      el.innerHTML = Hal.kepala({ crumbs: ['Transaksi operasional', 'Penjualan, DP & tagihan'], judul: 'Penjualan, DP & Tagihan', sub: 'Kelola alur pembayaran trip, review peserta, dan riwayat termin — tersinkron ke Google Sheets & Calendar.',
        aksi: '<div class="seg" id="pj-mode"><button data-m="kanban" class="' + (st.mode === 'kanban' ? 'on' : '') + '">' + ic('square-kanban', 16) + 'Kanban</button><button data-m="tabel" class="' + (st.mode === 'tabel' ? 'on' : '') + '">' + ic('table-2', 16) + 'Tabel</button></div>' +
          (admin ? '<button class="btn btn--ghost" data-act="bayarBaru">' + ic('hand-coins', 18) + '<span class="hide-sm">Input pembayaran</span></button><button class="btn btn--primary" data-act="baru">' + ic('plus', 18) + 'Catat penjualan</button>' : '') }) +
        '<div id="pj-kpi" class="bento stagger" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))"></div>' +
        '<div class="card card--tight" style="margin:16px 0"><div class="toolbar" style="gap:10px"><div class="input-ic grow" style="min-width:200px">' + ic('search', 18) + '<input class="input" id="pj-q" type="search" placeholder="Cari customer, trip, no. invoice…" value="' + esc(st.q) + '"></div>' + Hal.pilihTrip('pj-trip', st.trip, 'Semua trip') +
        '<span class="status-pill hide-sm">' + ic('refresh-cw', 16, 'primary') + 'Sheets & Calendar live sync <span class="dot"></span></span></div><div class="chips-scroll" id="pj-f" style="margin-top:12px"></div></div><div id="pj-body"></div>';
      el.querySelector('#pj-q').addEventListener('input', C.debounce(function (e) { st.q = e.target.value; H.isi(el); }, 200));
      el.querySelector('#pj-trip').onchange = function (e) { st.trip = e.target.value; H.isi(el); };
      el.querySelector('#pj-f').onclick = function (e) { var b = e.target.closest('[data-f]'); if (b) { st.f = b.dataset.f; H.isi(el); } };
      el.querySelector('#pj-mode').onclick = function (e) { var b = e.target.closest('[data-m]'); if (!b) return; st.mode = b.dataset.m; C.LS.set('yukx:pj-mode', st.mode); this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); H.isi(el); };
      Hal.aksiPeta(el, {
        baru: function () { formPenjualan(); }, bayarBaru: function () { formBayar(); },
        bayar: function (d) { var p = Store.get('Penjualan', d.id), r = HT.ringkasPj(Store.D, HT.indeks(Store.D), p, U.hariIni(), Store.S); formBayar(d.id, { Jenis: d.jenis, Nominal: d.jenis === 'DP' ? Math.min(r.sisa, Math.round(r.total * Number(Store.S.DP_PERSEN || 50) / 100)) : r.sisa }); },
        review: function (d, b) { C.aksi('penjualan.review', { id: d.id, nilai: true }, { btn: b }); },
        kuitansi: function (d) { var bys = Store.D.Pembayaran.filter(function (b) { return b.ID_Penjualan === d.id && b.Status_Verifikasi === 'Terverifikasi'; }); if (bys.length) Dok.pratinjau('Kuitansi pelunasan', Dok.kuitansiHTML(bys[bys.length - 1].ID_Bayar)); },
        detail: function (d) { detail(d.id); },
        lebih: function (d) { st.lebih[d.k] = (st.lebih[d.k] || BATAS) + BATAS; H.isi(el); },
        ringkas: function (d) { st.lebih[d.k] = 0; H.isi(el); var c = el.querySelector('[data-kol="' + d.k + '"]'); if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
      H.isi(el);
      if (q.baru && admin) setTimeout(function () { formPenjualan(null, q.c ? { ID_Customer: q.c } : null); history.replaceState(null, '', '#/penjualan'); }, 100);
      if (q.pj) setTimeout(function () { detail(q.pj); history.replaceState(null, '', '#/penjualan'); }, 100);
    },
    navigasi: function (el, args, q) { if (q.pj) detail(q.pj); if (q.baru) formPenjualan(null, q.c ? { ID_Customer: q.c } : null); },
    segarkan: function (el) { H.isi(el); },
    isi: function (el) {
      var all = semua(), aktif = all.filter(function (r) { return r.pj.Status !== 'Batal' && (!st.trip || r.pj.ID_Trip === st.trip); });
      var omset = U.jumlah(aktif, function (r) { return r.total; }), kas = U.jumlah(aktif, function (r) { return r.bayar; }), sisa = omset - kas, nSisa = aktif.filter(function (r) { return r.sisa > 0; }).length, mobile = innerWidth <= 720;
      el.querySelector('#pj-kpi').innerHTML = UI.stat({ label: 'Total omset penjualan', ikon: 'chart-line', nilai: '<span title="' + U.rp(omset) + '">' + (mobile ? U.rpRingkas(omset) : U.rp(omset)) + '</span>', kaki: '<span class="badge ok">' + ic('trending-up', 14) + aktif.length + ' booking aktif</span><span>' + U.jumlah(aktif, function (r) { return r.pj.Jumlah_Pax; }) + ' pax</span>' }) +
        UI.stat({ label: 'Total diterima (kas masuk)', ikon: 'circle-check', tone: 'ok', nilai: '<span class="ok" title="' + U.rp(kas) + '">' + (mobile ? U.rpRingkas(kas) : U.rp(kas)) + '</span>', kaki: '<div class="progress ok grow" style="max-width:140px"><i style="width:' + (omset ? kas / omset * 100 : 0) + '%"></i></div><span>' + F.persen(omset ? kas / omset * 100 : 0) + ' terpenuhi</span>' }) +
        UI.stat({ label: 'Sisa piutang berjalan', ikon: 'hourglass', tone: 'warn', nilai: '<span class="warn" title="' + U.rp(sisa) + '">' + (mobile ? U.rpRingkas(sisa) : U.rp(sisa)) + '</span>', kaki: '<span class="badge warn">' + ic('clock', 14) + nSisa + ' transaksi</span><span>menunggu pelunasan</span>' });
      var n = { semua: all.filter(function (r) { return r.pj.Status !== 'Batal'; }).length, review: all.filter(function (r) { return !r.review && r.pj.Status !== 'Batal'; }).length, telat: all.filter(function (r) { return r.telat; }).length, verif: Store.D.Pembayaran.filter(function (b) { return b.Status_Verifikasi === 'Menunggu'; }).length, batal: all.filter(function (r) { return r.pj.Status === 'Batal'; }).length };
      el.querySelector('#pj-f').innerHTML = [['semua', 'Semua status'], ['review', 'Belum review peserta'], ['telat', 'Lewat jatuh tempo'], ['verif', 'Bukti perlu dicek'], ['batal', 'Dibatalkan']].map(function (f) { return '<button class="chip ' + (st.f === f[0] ? 'on' : '') + '" data-f="' + f[0] + '">' + f[1] + ' <span class="n">' + n[f[0]] + '</span></button>'; }).join('');
      var rows = saring(all), body = el.querySelector('#pj-body');
      if (st.mode === 'kanban' && st.f !== 'batal') {
        body.innerHTML = '<div class="kanban">' + KOL.map(function (k) {
          var isi = U.urutkan(rows.filter(function (r) { return r.tahap === k.id; }), function (r) { return r.trip.Tgl_Berangkat + r.id; }, k.id === 'lunas');
          var maks = st.lebih[k.id] || BATAS, tampil = isi.slice(0, maks), sisaN = isi.length - tampil.length;
          return '<section class="kcol" data-kol="' + k.id + '"><header class="kcol__head"><span class="dot" style="background:' + k.warna + '"></span><b>' + k.label + '</b><span class="n">' + isi.length + '</span><small>' + U.rpRingkas(U.jumlah(isi, function (r) { return k.id === 'lunas' ? r.total : r.sisa || r.total; })) + '</small></header><div class="stack stagger" style="gap:12px;min-height:80px">' + (tampil.map(kartu).join('') || '<div class="empty" style="padding:24px 8px">' + ic('inbox', 22) + '<small>Kosong</small></div>') +
            (sisaN > 0 ? '<button class="btn btn--ghost btn--sm btn--block" data-act="lebih" data-k="' + k.id + '">' + ic('chevrons-down', 16) + 'Tampilkan ' + Math.min(sisaN, BATAS) + ' lagi <span class="muted">(' + sisaN + ')</span></button>' : maks > BATAS ? '<button class="btn btn--plain btn--sm btn--block" data-act="ringkas" data-k="' + k.id + '">' + ic('chevrons-up', 16) + 'Ringkas</button>' : '') + '</div></section>';
        }).join('') + '</div>' + (Store.isAdmin() ? '<p class="soft" style="font-size:12.5px;margin-top:8px">' + ic('grip-vertical', 14) + ' Seret kartu ke kolom lain untuk mencatat DP, membuat invoice pelunasan, atau melunasi.</p>' : '');
        H.dnd(el);
      } else {
        body.innerHTML = '<div class="card card--pad0">' + UI.tabel({ kolom: [
          { label: 'Customer & ID', render: function (r) { return '<div class="cell-main">' + UI.avatar(r.cust.Nama) + '<div class="row__text"><b class="truncate">' + esc(r.cust.Nama) + '</b><span class="sub mono">' + r.id + '</span></div></div>'; } },
          { label: 'Trip', render: function (r) { return '<span class="truncate" style="display:block;max-width:220px">' + esc(r.trip.Nama) + '</span><span class="sub">' + U.tglId(r.trip.Tgl_Berangkat) + ' · ' + r.pj.Jumlah_Pax + ' pax</span>'; } },
          { label: 'Total', num: true, render: function (r) { return F.rpTip(r.total); } }, { label: 'Terbayar', num: true, render: function (r) { return '<span class="ok">' + F.rpTip(r.bayar) + '</span>'; } },
          { label: 'Sisa', num: true, render: function (r) { return r.sisa ? '<b class="warn">' + F.rpTip(r.sisa) + '</b>' + (r.jatuhTempo ? '<span class="sub ' + (r.telat ? 'danger' : '') + '">JT ' + U.tglId(r.jatuhTempo) + '</span>' : '') : '<span class="ok">Lunas</span>'; } },
          { label: 'Status', render: function (r) { return UI.badge(r.pj.Status); } },
          { label: 'Peserta', render: function (r) { return r.review ? '<span class="badge ok">' + ic('user-check', 14) + 'Terverifikasi</span>' : r.peserta ? '<span class="badge">Masuk</span>' : '<span class="badge warn">Belum</span>'; } }
        ], baris: U.urutkan(rows, function (r) { return r.pj.Tgl_Booking + r.id; }, true), klik: function (r) { return r.id; }, kosong: 'Tidak ada penjualan', kosongIkon: 'wallet' }) + '</div>';
        body.querySelectorAll('tr[data-row]').forEach(function (tr) { tr.onclick = function () { detail(tr.dataset.row); }; });
      }
      body.querySelectorAll('.kcard').forEach(function (k) { k.addEventListener('click', function (e) { if (e.target.closest('a,button')) return; detail(k.dataset.id); }); });
    },
    dnd: function (el) {
      if (!Store.isAdmin()) return;
      var drag = null;
      el.querySelectorAll('.kcard[draggable="true"]').forEach(function (k) {
        k.addEventListener('dragstart', function (e) { drag = k; k.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k.dataset.id); });
        k.addEventListener('dragend', function () { k.classList.remove('dragging'); el.querySelectorAll('.kcol').forEach(function (c) { c.classList.remove('over'); }); });
      });
      el.querySelectorAll('.kcol').forEach(function (col) {
        col.addEventListener('dragover', function (e) { if (!drag) return; e.preventDefault(); col.classList.add('over'); });
        col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
        col.addEventListener('drop', function (e) {
          e.preventDefault(); col.classList.remove('over'); if (!drag) return;
          var id = drag.dataset.id, dari = drag.dataset.tahap, ke = col.dataset.kol; drag = null; if (dari === ke) return;
          var p = Store.get('Penjualan', id), r = HT.ringkasPj(Store.D, HT.indeks(Store.D), p, U.hariIni(), Store.S);
          if (ke === 'booking') { UI.toast('Status Booking dihitung otomatis dari pembayaran — hapus pembayaran bila perlu.', 'info'); return; }
          if (ke === 'dp') formBayar(id, { Jenis: 'DP', Nominal: Math.min(r.sisa, Math.round(r.total * Number(Store.S.DP_PERSEN || 50) / 100)) });
          if (ke === 'pelunasan') App.go('invoice/baru?pj=' + id + '&jenis=Pelunasan');
          if (ke === 'lunas') formBayar(id, { Jenis: 'Pelunasan', Nominal: r.sisa });
        });
      });
    }
  };
  window.Halaman.penjualan = H;
  window.FormPenjualan = { penjualan: formPenjualan, bayar: formBayar, detail: detail };
})();
