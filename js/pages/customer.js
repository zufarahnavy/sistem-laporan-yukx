/* YukX — Halaman Database Customer & Direktori Peserta (+ drawer detail) */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { q: '', f: 'semua', hal: 1 }, PER = 25, drawerAktif = null;

  function data() {
    var D = Store.D, today = U.hariIni(), ix = HT.indeks(D), perC = U.kelompok(D.Penjualan.filter(function (p) { return p.Status !== 'Batal'; }), 'ID_Customer');
    return D.Customer.map(function (c) {
      var pjs = U.urutkan(perC[c.ID_Customer] || [], function (p) { var t = ix.trip[p.ID_Trip] || {}; return t.Tgl_Berangkat || ''; }, true);
      var t0 = pjs.length ? ix.trip[pjs[0].ID_Trip] : null;
      return { c: c, pjs: pjs, n: pjs.length, total: U.jumlah(pjs, function (p) { return p.Total; }), bayar: U.jumlah(pjs, function (p) { return HT.terbayarPj(ix, p.ID_Penjualan); }), last: t0,
        mendatang: pjs.some(function (p) { var t = ix.trip[p.ID_Trip]; return t && t.Tgl_Pulang >= today; }), kurang: !c.No_WA || !c.Email || (!c.Identitas && !/^PT /.test(c.Nama)) };
    });
  }
  function saring(rows) {
    var q = st.q.toLowerCase();
    return rows.filter(function (r) {
      var c = r.c;
      if (st.f === 'arsip' ? c.Status !== 'Dihapus' : c.Status === 'Dihapus') return false;
      if (st.f === 'vip' && !/VIP/i.test(c.Tag)) return false; if (st.f === 'repeat' && !(r.n >= 2 || /Repeat/i.test(c.Tag))) return false;
      if (st.f === 'corporate' && !/Corporate|^PT /i.test(c.Tag + ' ' + c.Nama)) return false; if (st.f === 'mendatang' && !r.mendatang) return false; if (st.f === 'kurang' && !r.kurang) return false;
      return !q || (c.Nama + ' ' + c.No_WA + ' ' + c.Email + ' ' + c.Kota + ' ' + c.ID_Customer + ' ' + c.Tag).toLowerCase().indexOf(q) > -1;
    });
  }
  function tagChips(tag) { return String(tag || '').split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t && t !== 'DEMO'; }).map(function (t) { return '<span class="badge ' + (t === 'VIP' ? 'accent' : t === 'Corporate' ? 'ink' : '') + '" style="height:20px;font-size:10.5px">' + esc(t) + '</span>'; }).join(' '); }

  function formCustomer(c) {
    c = c || {};
    var h = UI.modal({ judul: c.ID_Customer ? 'Ubah data customer' : 'Tambah customer baru', sub: c.ID_Customer ? esc(c.ID_Customer) : 'Nama wajib · format WA 08xx · email unik', ukuran: 'lg',
      isi: UI.form([
        { name: 'Nama', label: 'Nama lengkap / instansi', wajib: true, full: true, ph: 'contoh: Budi Santoso', ikon: 'user' },
        { name: 'No_WA', label: 'No. WhatsApp', type: 'tel', ph: '0812xxxxxxxx', ikon: 'phone' },
        { name: 'Email', label: 'Email', type: 'email', ph: 'nama@email.com', ikon: 'mail' },
        { name: 'Kota', label: 'Domisili / kota', ikon: 'map-pin' },
        { name: 'Gender', label: 'Jenis kelamin', type: 'select', kosong: '— pilih —', opsi: [{ v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }] },
        { name: 'Alamat', label: 'Alamat lengkap', type: 'textarea', rows: 2, full: true },
        { name: 'Identitas', label: 'No. identitas (KTP/Paspor) — opsional', ikon: 'id-card' },
        { name: 'Tgl_Lahir', label: 'Tanggal lahir', type: 'date' },
        { name: 'Kontak_Darurat', label: 'Kontak darurat (nama & hubungan)', ph: 'Dewi (Istri)' },
        { name: 'Telp_Darurat', label: 'Telepon darurat', type: 'tel' },
        { name: 'Catatan_Medis', label: 'Catatan medis & konsumsi', type: 'textarea', rows: 2, ph: 'Alergi, obat rutin, preferensi makanan…', full: true },
        { name: 'Tag', label: 'Tag (pisahkan koma)', ph: 'VIP, Repeat, Corporate', help: 'Dipakai untuk filter & segmen blast WhatsApp.' },
        { name: 'Catatan', label: 'Catatan pribadi', ph: 'Request kamar, preferensi…' }
      ], c),
      aksi: [{ label: 'Batal' }, { label: c.ID_Customer ? 'Simpan perubahan' : 'Simpan customer', kelas: 'btn--primary', ikon: 'check', klik: async function (hh, b) {
        if (!UI.cekWajib(hh.body)) return false;
        var v = UI.bacaForm(hh.body); v.ID_Customer = c.ID_Customer || '';
        var r = await C.aksi('customer.simpan', v, { btn: b, loadingText: 'Menyimpan…' }); return r.success;
      } }] });
    return h;
  }

  function bukaDrawer(id) {
    var c = Store.get('Customer', id); if (!c) { UI.toast('Customer tidak ditemukan.', 'err'); return; }
    if (drawerAktif && !drawerAktif.ditutup) drawerAktif.tutup();
    var tab = 'trip';
    function isi() {
      c = Store.get('Customer', id); var D = Store.D, ix = HT.indeks(D), today = U.hariIni(), admin = Store.isAdmin();
      var pjs = U.urutkan(D.Penjualan.filter(function (p) { return p.ID_Customer === id; }), function (p) { return (ix.trip[p.ID_Trip] || {}).Tgl_Berangkat; }, true);
      var rs = pjs.map(function (p) { return HT.ringkasPj(D, ix, p, today, Store.S); });
      var konten;
      if (tab === 'trip') {
        var akan = rs.filter(function (r) { return r.trip.Tgl_Pulang >= today && r.pj.Status !== 'Batal'; }), lalu = rs.filter(function (r) { return r.trip.Tgl_Pulang < today || r.pj.Status === 'Batal'; });
        konten = (akan.length ? akan.map(function (r) {
          var m = r.manifest, inv = r.invTerakhir;
          return '<div class="card card--tight stack" style="gap:12px"><div class="between"><span class="badge ' + (r.tahap === 'lunas' ? 'ok' : 'warn') + '">' + ic(r.tahap === 'lunas' ? 'circle-check' : 'clock', 14) + 'Status: ' + esc(r.pj.Status) + '</span><small class="muted">Booked ' + U.tglId(r.pj.Tgl_Booking) + '</small></div>' +
            '<div class="row">' + Hal.tripFoto(r.trip, 'sm') + '<div class="row__text"><b class="truncate" style="display:block;font-size:16px">' + esc(r.trip.Nama) + '</b><small class="muted">' + F.rentang(r.trip.Tgl_Berangkat, r.trip.Tgl_Pulang) + ' · ' + r.pj.Jumlah_Pax + ' pax</small></div></div>' +
            '<dl class="kv"><dt>Total pembayaran</dt><dd>' + U.rp(r.total) + '</dd><dt>Terbayar</dt><dd class="ok">' + U.rp(r.bayar) + '</dd><dt>Sisa</dt><dd class="' + (r.sisa ? 'warn' : '') + '">' + U.rp(r.sisa) + '</dd></dl><div class="progress ' + (r.persen >= 100 ? 'ok' : '') + '"><i style="width:' + r.persen + '%"></i></div>' +
            (m ? '<div class="note ' + (m.Status === 'Final' ? 'ok' : '') + '">' + ic('file-text') + '<span>Manifest ' + esc(m.Status) + ' v' + m.Versi + (m.Status === 'Final' ? ' · dilampirkan ke Google Calendar' : ' · ' + r.anggotaLengkap + '/' + r.pj.Jumlah_Pax + ' data lengkap') + '</span></div>' : '') +
            (r.pj.ID_Event ? '<div class="note">' + ic('calendar-check') + '<span>Event Calendar: [' + esc(r.trip.Nama) + '] - ' + esc(c.Nama) + '<br><small class="mono">' + esc(r.pj.ID_Event.slice(0, 22)) + '</small></span></div>' : '<div class="note warn">' + ic('calendar') + '<span>Event Calendar dibuat saat invoice pertama terbit.</span></div>') +
            '<div class="row wrap">' + (inv ? '<button class="btn btn--ghost btn--sm" data-act="inv" data-no="' + esc(inv.No_Invoice) + '">' + ic('receipt', 16) + 'Invoice terakhir</button>' : (admin ? '<a class="btn btn--primary btn--sm" href="#/invoice/baru?pj=' + r.id + '">' + ic('receipt', 16) + 'Buat invoice</a>' : '')) + '<a class="btn btn--ghost btn--sm" href="#/manifest/' + r.trip.ID_Trip + '?pj=' + r.id + '">' + ic('clipboard-list', 16) + 'Manifest</a></div></div>';
        }).join('') : '<div class="card card--tight">' + UI.kosong('plane', 'Belum ada trip mendatang', admin ? 'Catat penjualan baru untuk customer ini.' : '') + '</div>') +
          '<div class="card card--tight"><span class="label">Kontak darurat</span><div class="row" style="margin-top:10px"><span class="ic-box">' + ic('contact') + '</span><div class="row__text"><b>' + esc(c.Kontak_Darurat || '-') + '</b><small class="muted" style="display:block">' + esc(c.Telp_Darurat || '-') + '</small></div>' + (c.Telp_Darurat ? '<a class="btn btn--soft btn--icon btn--sm" href="tel:' + esc(c.Telp_Darurat) + '" aria-label="Telepon">' + ic('phone', 16) + '</a>' : '') + '</div></div>' +
          '<div class="card card--tight stack"><span class="label">Catatan medis & konsumsi</span>' + (c.Catatan_Medis ? '<div class="row" style="align-items:flex-start">' + ic('heart-pulse', 18, 'danger') + '<span>' + esc(c.Catatan_Medis) + '</span></div>' : '<small class="muted">Tidak ada catatan medis.</small>') + (c.Catatan ? '<div class="row" style="align-items:flex-start">' + ic('bed-double', 18, 'primary') + '<span>' + esc(c.Catatan) + '</span></div>' : '') + '</div>' +
          (lalu.length ? '<div class="card card--tight"><span class="label">Riwayat ' + lalu.length + ' trip sebelumnya</span><div class="timeline" style="margin-top:14px">' + lalu.map(function (r) { return '<div class="tl ' + (r.pj.Status === 'Batal' ? 'mute' : 'on') + '"><b>' + esc(r.trip.Nama) + '</b><small>' + F.rentang(r.trip.Tgl_Berangkat, r.trip.Tgl_Pulang) + ' · ' + r.pj.Jumlah_Pax + ' pax · ' + esc(r.pj.Status) + ' ' + U.rp(r.total) + '</small></div>'; }).join('') + '</div></div>' : '');
      } else if (tab === 'bayar') {
        var invs = [], bys = [];
        pjs.forEach(function (p) { D.Invoice.forEach(function (i) { if (i.ID_Penjualan === p.ID_Penjualan) invs.push(i); }); D.Pembayaran.forEach(function (b) { if (b.ID_Penjualan === p.ID_Penjualan) bys.push(b); }); });
        konten = '<div class="card card--tight stack"><span class="label">Invoice (' + invs.length + ')</span>' + (invs.length ? U.urutkan(invs, function (i) { return i.Tgl_Terbit; }, true).map(function (i) { return '<button class="menu-item" data-act="inv" data-no="' + esc(i.No_Invoice) + '" style="min-height:56px"><span class="ic-box" style="width:36px;height:36px">' + ic('receipt', 18) + '</span><span class="row__text"><b class="mono truncate" style="display:block;font-size:12.5px">' + esc(i.No_Invoice) + '</b><small class="muted">' + esc(i.Jenis) + ' · ' + U.tglId(i.Tgl_Terbit) + '</small></span><span class="stack" style="align-items:flex-end;gap:2px"><b class="num">' + U.rpRingkas(i.Nominal) + '</b>' + UI.badge(i.Status, null, false) + '</span></button>'; }).join('') : '<small class="muted">Belum ada invoice.</small>') + '</div>' +
          '<div class="card card--tight stack"><span class="label">Pembayaran (' + bys.length + ')</span>' + (bys.length ? U.urutkan(bys, function (b) { return b.Tanggal; }, true).map(function (b) { return '<div class="between" style="padding:8px 0;border-bottom:1px solid var(--c-border)"><div><b>' + esc(b.Jenis) + '</b> <small class="muted">· ' + esc(b.Metode) + '</small><small class="muted" style="display:block">' + U.tglPanjang(b.Tanggal) + '</small></div><div style="text-align:right"><b class="num ok">' + U.rp(b.Nominal) + '</b><div>' + UI.badge(b.Status_Verifikasi, null, false) + '</div></div></div>'; }).join('') : '<small class="muted">Belum ada pembayaran.</small>') + '</div>';
      } else {
        var k = D.CRM_Kontak.find(function (x) { return x.Sumber === 'customer' && x.RefID === id; }) || {};
        var inter = D.CRM_Interaksi.filter(function (x) { return x.KontakID === k.KontakID; });
        var notif = D.AntrianNotif.filter(function (n) { return n.Tujuan === U.hp62(c.No_WA) || (c.Email && n.Tujuan === c.Email); }).slice(-8).reverse();
        konten = '<div class="card card--tight stack"><span class="label">Catatan pribadi</span><p>' + esc(c.Catatan || 'Belum ada catatan.') + '</p>' + (k.KontakID ? '<div class="row wrap" style="gap:6px"><span class="badge ' + (k.StatusWA === 'Terdaftar' ? 'ok' : k.StatusWA ? 'danger' : 'neutral') + '">' + ic('message-circle', 14) + (k.StatusWA || 'WA belum dicek') + '</span><span class="badge neutral">' + k.JumlahPesan + ' pesan terkirim</span>' + (k.OptOut === 'YA' ? '<span class="badge danger">Opt-out blast</span>' : '') + '</div>' : '') + '</div>' +
          '<div class="card card--tight stack"><span class="label">Riwayat komunikasi</span><div class="timeline" style="margin-top:6px">' + (inter.map(function (x) { return '<div class="tl"><b>' + esc(x.Kanal) + '</b><small>' + F.waktu(x.Tanggal) + ' · ' + esc(x.Oleh) + '</small><div class="quote">' + esc(x.Ringkasan) + '</div></div>'; }).join('') + notif.map(function (n) { return '<div class="tl ' + (n.Status === 'Terkirim' ? 'on' : 'mute') + '"><b>' + esc(n.Kanal) + ' · ' + esc(n.Event) + '</b><small>' + F.waktu(n.DibuatPada) + ' · ' + esc(n.Status) + '</small><div class="quote clamp-2">' + esc(n.Pesan) + '</div></div>'; }).join('') || '<small class="muted">Belum ada komunikasi tercatat.</small>') + '</div>' +
          (admin && k.KontakID ? '<div class="stack"><textarea class="textarea" id="int-isi" rows="2" placeholder="Catat interaksi: telepon, follow up, request…"></textarea><button class="btn btn--soft btn--sm" data-act="interaksi" data-k="' + k.KontakID + '">' + ic('plus', 16) + 'Catat interaksi</button></div>' : '') + '</div>';
      }
      return konten;
    }
    function kepala() {
      var tag = String(c.Tag || '').split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t && t !== 'DEMO'; })[0];
      return '<div class="row" style="align-items:flex-start">' + UI.avatar(c.Nama, '', 'lg') + '<div class="row__text"><div class="row" style="gap:8px;flex-wrap:wrap"><h2 style="font-size:22px">' + esc(c.Nama) + '</h2>' + (tag ? '<span class="badge accent">' + esc(tag.toUpperCase()) + '</span>' : '') + (c.Status === 'Dihapus' ? '<span class="badge danger">Arsip</span>' : '') + '</div><small class="muted mono">ID: ' + esc(c.ID_Customer) + '</small></div><button class="icon-btn" data-tutup aria-label="Tutup">' + ic('x') + '</button></div>' +
        '<div class="form" style="margin-top:16px;gap:12px"><div><span class="label">WhatsApp</span><div>' + (c.No_WA ? '<a href="https://wa.me/' + U.hp62(c.No_WA) + '" target="_blank" rel="noopener" class="row ok" style="gap:6px;font-weight:700">' + ic('message-circle', 16) + esc(c.No_WA) + '</a>' : '<span class="muted">-</span>') + '</div></div><div><span class="label">Domisili</span><div class="truncate">' + esc(c.Kota || '-') + '</div></div><div class="field--full"><span class="label">Email</span><div class="truncate">' + esc(c.Email || '-') + '</div></div></div>' +
        '<div class="row wrap" style="margin-top:14px;gap:8px">' + (Store.isAdmin() ? '<a class="btn btn--primary btn--sm" href="#/penjualan?baru=1&c=' + c.ID_Customer + '">' + ic('plus', 16) + 'Buat trip</a>' : '') + (c.No_WA ? '<a class="btn btn--soft btn--sm" target="_blank" rel="noopener" href="https://wa.me/' + U.hp62(c.No_WA) + '">' + ic('send', 16) + 'Kirim WA</a>' : '') + '<a class="btn btn--soft btn--sm" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/r/search?q=' + encodeURIComponent(c.Nama) + '">' + ic('calendar', 16) + 'Kalender</a></div>' +
        '<div class="tabs" style="margin:16px 0 -21px">' + [['trip', 'Riwayat trip & manifest'], ['bayar', 'Invoice & bayar'], ['catatan', 'Catatan & komunikasi']].map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    }
    var kaki = '<button class="btn btn--ghost" data-tutup>Tutup panel</button>' + (Store.isAdmin() ? '<button class="btn btn--primary" data-act="edit">' + ic('square-pen', 18) + 'Edit lengkap</button>' : '');
    var d = UI.drawer({ kepala: kepala(), isi: isi(), kaki: kaki, onTutup: function () { drawerAktif = null; if (/^#\/customer\//.test(location.hash)) history.replaceState(null, '', '#/customer'); } });
    drawerAktif = d; d.segar = function () { if (!Store.get('Customer', id)) return; d.el.querySelector('.drawer__head').innerHTML = kepala(); d.el.querySelector('.drawer__body').innerHTML = isi(); };
    d.el.addEventListener('click', async function (e) {
      var t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; d.segar(); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'edit') formCustomer(Store.get('Customer', id));
      if (a.dataset.act === 'inv') { d.tutup(); App.go('invoice/lihat/' + encodeURIComponent(a.dataset.no)); }
      if (a.dataset.act === 'interaksi') { var v = d.el.querySelector('#int-isi').value; var r = await C.aksi('crm.interaksi', { KontakID: a.dataset.k, Kanal: 'Catatan', Ringkasan: v }, { btn: a }); if (r.success) d.segar(); }
    });
  }

  var H = {
    judul: 'Customer',
    render: function (el, args, q) {
      var admin = Store.isAdmin();
      el.innerHTML = Hal.kepala({ crumbs: ['Data master', 'Database customer'], judul: 'Database Customer & Direktori Peserta', sub: 'Kelola kontak, riwayat perjalanan, status pembayaran, dan kelengkapan data manifest setiap customer.',
        aksi: '<button class="btn btn--ghost" data-act="excel">' + ic('file-spreadsheet', 18) + '<span class="hide-sm">Ekspor Excel</span></button>' + (admin ? '<button class="btn btn--primary" data-act="tambah">' + ic('user-plus', 18) + 'Tambah customer</button>' : '') }) +
        '<div id="cs-kpi"></div><div class="card card--pad0" style="margin-top:16px"><div class="stack" style="padding:16px;gap:12px"><div class="input-ic" style="max-width:520px">' + ic('search', 18) + '<input class="input" id="cs-q" type="search" placeholder="Cari nama, WhatsApp, email, kota, ID…" value="' + esc(st.q) + '"></div><div class="chips-scroll" id="cs-f"></div></div><div id="cs-list"></div></div>';
      el.querySelector('#cs-q').addEventListener('input', C.debounce(function (e) { st.q = e.target.value; st.hal = 1; H.isi(el); }, 200));
      el.querySelector('#cs-f').onclick = function (e) { var b = e.target.closest('[data-f]'); if (!b) return; st.f = b.dataset.f; st.hal = 1; H.isi(el); };
      Hal.aksiPeta(el, {
        tambah: function () { formCustomer(); },
        hal: function (d) { st.hal = +d.n; H.isi(el); el.querySelector('#cs-list').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
        excel: function (d, b) { var rows = saring(data()); Dok.excel('Customer ' + Store.S.APP_NAMA + ' ' + U.hariIni(), [{ nama: 'Customer', rows: [['ID', 'Nama', 'WhatsApp', 'Email', 'Kota', 'Alamat', 'Identitas', 'Tgl Lahir', 'Kontak Darurat', 'Telp Darurat', 'Catatan Medis', 'Tag', 'Jumlah Trip', 'Total Transaksi', 'Terbayar']].concat(rows.map(function (r) { var c = r.c; return [c.ID_Customer, c.Nama, c.No_WA, c.Email, c.Kota, c.Alamat, c.Identitas, c.Tgl_Lahir, c.Kontak_Darurat, c.Telp_Darurat, c.Catatan_Medis, c.Tag, r.n, r.total, r.bayar]; })) }]).then(function () { UI.toast('Excel diunduh (' + rows.length + ' customer).', 'ok'); }).catch(function (e) { UI.toast(e.message, 'err'); }); },
        pulihkan: function (d, b) { C.aksi('customer.pulihkan', { id: d.id }, { btn: b }); },
        hapus: async function (d) { var c = Store.get('Customer', d.id); if (await UI.konfirmasi({ judul: 'Arsipkan ' + c.Nama + '?', teks: 'Data tidak dihapus permanen (soft delete) dan bisa dipulihkan dari filter Arsip.', ok: 'Arsipkan', bahaya: true })) C.aksi('customer.hapus', { id: d.id }); }
      });
      H.isi(el);
      if (q.baru && admin) setTimeout(function () { formCustomer(); history.replaceState(null, '', '#/customer'); }, 120);
      if (args[0]) setTimeout(function () { bukaDrawer(args[0]); }, 60);
    },
    navigasi: function (el, args) { if (args[0]) bukaDrawer(args[0]); },
    segarkan: function (el) { H.isi(el); if (drawerAktif && !drawerAktif.ditutup) drawerAktif.segar(); },
    isi: function (el) {
      var semua = data(), aktif = semua.filter(function (r) { return r.c.Status !== 'Dihapus'; });
      var n = { semua: aktif.length, vip: aktif.filter(function (r) { return /VIP/.test(r.c.Tag); }).length, repeat: aktif.filter(function (r) { return r.n >= 2 || /Repeat/.test(r.c.Tag); }).length, corporate: aktif.filter(function (r) { return /Corporate/.test(r.c.Tag) || /^PT /.test(r.c.Nama); }).length, mendatang: aktif.filter(function (r) { return r.mendatang; }).length, kurang: aktif.filter(function (r) { return r.kurang; }).length, arsip: semua.length - aktif.length };
      var kpi = el.querySelector('#cs-kpi');
      if (!kpi.dataset.ok) { kpi.dataset.ok = 1; kpi.className = 'bento two-sm stagger'; }
      kpi.innerHTML = UI.stat({ label: 'Total customer terdaftar', ikon: 'users', nilai: UI.hitung(n.semua) + ' <small>orang</small>', kaki: '<span class="badge ok">' + ic('trending-up', 14) + '+' + aktif.filter(function (r) { return U.selisihHari(r.c.Tgl_Terdaftar, U.hariIni()) <= 30; }).length + ' bulan ini</span>' }) +
        UI.stat({ label: 'Ikut trip mendatang', ikon: 'plane', nilai: UI.hitung(n.mendatang) + ' <small>customer</small>', kaki: '<span>Siap dibuatkan manifest</span>' }) +
        UI.stat({ label: 'Repeat customer', ikon: 'star', tone: 'ok', nilai: UI.hitung(n.repeat) + ' <small>loyal</small>', kaki: '<span>' + n.vip + ' VIP · ' + n.corporate + ' corporate</span>' }) +
        UI.stat({ label: 'Data perlu dilengkapi', ikon: 'triangle-alert', tone: n.kurang ? 'warn' : 'ok', nilai: UI.hitung(n.kurang) + ' <small>customer</small>', kaki: '<span>Tanpa WA / email / identitas</span>' });
      el.querySelector('#cs-f').innerHTML = [['semua', 'Semua'], ['mendatang', 'Trip mendatang'], ['vip', 'VIP'], ['repeat', 'Repeat'], ['corporate', 'Corporate'], ['kurang', 'Data kurang'], ['arsip', 'Arsip']].map(function (f) { return '<button class="chip ' + (st.f === f[0] ? 'on' : '') + '" data-f="' + f[0] + '">' + f[1] + ' <span class="n">' + n[f[0]] + '</span></button>'; }).join('');
      var rows = U.urutkan(saring(semua), function (r) { return r.c.Nama.toLowerCase(); }), total = rows.length, maxHal = Math.max(1, Math.ceil(total / PER));
      st.hal = Math.min(st.hal, maxHal); var potong = rows.slice((st.hal - 1) * PER, st.hal * PER), admin = Store.isAdmin();
      el.querySelector('#cs-list').innerHTML = UI.tabel({ kolom: [
        { label: 'Customer & ID', render: function (r) { return '<div class="cell-main">' + UI.avatar(r.c.Nama) + '<div class="row__text"><b class="truncate">' + esc(r.c.Nama) + '</b><span class="sub mono">' + esc(r.c.ID_Customer) + ' ' + tagChips(r.c.Tag) + '</span></div></div>'; } },
        { label: 'Kontak', render: function (r) { return '<span class="truncate" style="display:block;max-width:230px">' + (r.c.No_WA ? esc(r.c.No_WA) : '<span class="warn">WA kosong</span>') + '</span><span class="sub truncate" style="max-width:230px">' + esc(r.c.Email || '—') + '</span>'; } },
        { label: 'Domisili', key: 'kota', render: function (r) { return esc(r.c.Kota || '-'); } },
        { label: 'Trip terakhir', render: function (r) { return r.last ? '<span class="truncate" style="display:block;max-width:220px">' + esc(r.last.Nama) + '</span><span class="sub">' + r.n + ' trip · ' + U.tglId(r.last.Tgl_Berangkat) + '</span>' : '<span class="muted">Belum ada</span>'; } },
        { label: 'Total transaksi', num: true, render: function (r) { return '<b>' + F.rpTip(r.total) + '</b>' + (r.total > r.bayar ? '<span class="sub warn">sisa ' + U.rpRingkas(r.total - r.bayar) + '</span>' : r.total ? '<span class="sub ok">lunas</span>' : ''); } },
        { label: '', mlabel: '', render: function (r) { return r.c.Status === 'Dihapus' ? (admin ? '<button class="btn btn--soft btn--sm" data-act="pulihkan" data-id="' + r.c.ID_Customer + '">' + ic('undo-2', 16) + 'Pulihkan</button>' : '') : (admin ? '<button class="btn btn--plain btn--sm btn--icon" data-act="hapus" data-id="' + r.c.ID_Customer + '" aria-label="Arsipkan">' + ic('trash-2', 16) + '</button>' : '') + ic('chevron-right', 18, 'muted'); } }
      ], baris: potong, klik: function (r) { return r.c.ID_Customer; }, kosong: st.q ? 'Tidak ada yang cocok dengan "' + st.q + '"' : 'Belum ada customer', kosongIkon: 'users' }) +
        (maxHal > 1 ? '<div class="between wrap" style="padding:14px 16px;border-top:1px solid var(--c-border)"><small class="muted">Menampilkan ' + ((st.hal - 1) * PER + 1) + '–' + Math.min(total, st.hal * PER) + ' dari ' + total + '</small><div class="row" style="gap:6px">' + Array.from({ length: maxHal }, function (_, i) { return '<button class="btn btn--sm ' + (st.hal === i + 1 ? 'btn--primary' : 'btn--ghost') + '" data-act="hal" data-n="' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>' : '');
      el.querySelectorAll('#cs-list tr[data-row]').forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest('[data-act]')) return; history.replaceState(null, '', '#/customer/' + tr.dataset.row); bukaDrawer(tr.dataset.row); }; });
    }
  };
  window.Halaman.customer = H;
})();
