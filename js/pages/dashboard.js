/* YukX — Halaman Dashboard Operasional & Finansial */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { periode: 'bulan', trip: '' }, timer = null;

  function calChip(inv) { var p = HT.prosesInvoice(inv), s = p.cal; if (s === 'ok') return '<span class="badge ok">' + ic('calendar-check', 14) + 'Tersinkron</span>'; if (s === 'gagal') return '<span class="badge danger">' + ic('circle-x', 14) + 'Gagal</span>'; if (s === 'antri' || s === 'proses') return '<span class="badge warn">' + ic('loader-circle', 14, 'spin') + 'Proses</span>'; return '<span class="badge neutral">' + ic('calendar', 14) + 'Belum</span>'; }

  function hitungMundur() {
    clearInterval(timer);
    var box = document.getElementById('cd'); if (!box) return;
    var target = new Date(box.dataset.tgl + 'T06:00:00+07:00').getTime();
    function tick() {
      if (!box.isConnected) { clearInterval(timer); return; }
      var d = Math.max(0, target - Date.now()), h = Math.floor(d / 864e5), j = Math.floor(d % 864e5 / 36e5), m = Math.floor(d % 36e5 / 6e4), s = Math.floor(d % 6e4 / 1e3);
      var a = h > 0 ? [h, j, m] : [j, m, s], l = h > 0 ? ['HARI', 'JAM', 'MENIT'] : ['JAM', 'MENIT', 'DETIK'];
      box.innerHTML = a.map(function (v, i) { return '<div><b>' + String(v).padStart(2, '0') + '</b><small>' + l[i] + '</small></div>' + (i < 2 ? '<span class="sep">:</span>' : ''); }).join('');
    }
    tick(); timer = setInterval(tick, 1000);
  }

  function aksiAntrean(a) {
    var r = a.r, admin = Store.isAdmin();
    if (a.jenis === 'review') return admin ? '<button class="btn btn--primary btn--sm" data-act="review" data-id="' + r.id + '">' + ic('user-check', 16) + 'Verifikasi & Sync</button>' : '';
    if (a.jenis === 'peserta') return admin ? '<button class="btn btn--primary btn--sm" data-go="invoice/baru?pj=' + r.id + '">' + ic('receipt', 16) + 'Buat invoice</button>' : '';
    if (a.jenis === 'telat') return '<a class="btn btn--soft btn--sm" target="_blank" rel="noopener" href="https://wa.me/' + U.hp62(r.cust.No_WA) + '?text=' + encodeURIComponent('Halo ' + r.cust.Nama + ', pengingat ramah: tagihan ' + r.trip.Nama + ' sebesar ' + U.rp(r.sisa) + ' sudah jatuh tempo. Terima kasih 🙏') + '">' + ic('message-circle', 16) + 'Tagih via WA</a>';
    if (a.jenis === 'manifest') return '<button class="btn btn--soft btn--sm" data-go="manifest/' + r.trip.ID_Trip + '">' + ic('clipboard-list', 16) + 'Buka manifest</button>';
    return '';
  }

  var H = {
    judul: 'Dashboard',
    render: function (el) {
      var admin = Store.isAdmin();
      el.innerHTML = Hal.kepala({ crumbs: ['Operasional & Finansial', 'Ringkasan'], judul: 'Dashboard Operasional & Finansial', sub: 'Ringkasan performa trip, arus kas invoice, dan otomasi manifest ' + esc(Store.S.APP_NAMA) + ' dalam satu pandangan.',
        aksi: '<select class="select" id="db-per" style="width:auto"><option value="bulan">Bulan ini</option><option value="bulan-lalu">Bulan lalu</option><option value="kuartal">Kuartal ini</option><option value="tahun">Tahun ini</option><option value="semua">Semua waktu</option></select>' +
          Hal.pilihTrip('db-trip', st.trip, 'Semua trip') + '<span class="status-pill hide-sm">' + ic('calendar-check', 18, 'primary') + 'Google Calendar <span class="dot ' + (C.DEMO ? '' : 'pulse') + '"></span></span>' +
          (admin ? '<a class="btn btn--primary hide-sm" href="#/invoice/baru">' + ic('plus', 18) + 'Buat Invoice</a>' : '') }) +
        (admin ? '<div class="only-sm" style="margin:-8px 0 16px"><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><a class="btn btn--primary btn--sm" href="#/invoice/baru">' + ic('circle-plus', 16) + 'Invoice</a><a class="btn btn--ghost btn--sm" href="#/penjualan?baru=1">' + ic('wallet', 16) + 'Transaksi</a><a class="btn btn--ghost btn--sm" href="#/manifest">' + ic('clipboard-list', 16) + 'Manifest</a></div></div>' : '') +
        '<div id="db-body" class="stack" style="gap:16px"></div>';
      el.querySelector('#db-per').value = st.periode;
      el.querySelector('#db-per').onchange = function (e) { st.periode = e.target.value; H.isi(el, true); };
      el.querySelector('#db-trip').onchange = function (e) { st.trip = e.target.value; H.isi(el, true); };
      Hal.aksiPeta(el, {
        review: function (d, b) { C.aksi('penjualan.review', { id: d.id, nilai: true }, { btn: b }); },
        mutasi: function (d) { App.go('penjualan?pj=' + d.id); }
      });
      H.isi(el, true);
    },
    segarkan: function (el) { H.isi(el, false); },
    isi: function (el, animasi) {
      var body = el.querySelector('#db-body'); if (!body) return;
      var today = U.hariIni(), db = HT.dashboard(Store.D, { periode: st.periode, idTrip: st.trip, today: today, S: Store.S });
      var mobile = window.innerWidth <= 720, admin = Store.isAdmin();
      var stats = '<div class="bento two-sm stagger">' +
        UI.stat({ hero: true, label: 'Ringkasan ' + db.periode.label, judul: 'Total Laba Trip', nilai: '<span title="' + U.rp(db.laba) + '">' + (mobile ? UI.hitung(db.laba, 'rpS') : UI.hitung(db.laba, 'rp')) + '</span>', kaki: '<span class="badge glass">' + ic('trending-up', 14) + 'Margin ' + F.persen(db.margin) + '</span><span>Pendapatan ' + U.rpRingkas(db.pendapatan) + '</span>', go: 'labarugi' }) +
        UI.stat({ label: 'Operasional berjalan', judul: 'Trip Aktif', ikon: 'route', nilai: UI.hitung(db.tripAktif) + ' <small>Trip</small>', kaki: '<span>' + db.paxAktif + ' pax terdaftar</span><span class="badge">' + db.berangkatMingguIni + ' berangkat minggu ini</span>', go: 'rekap' }) +
        UI.stat({ label: 'Arus kas tertahan', judul: 'Invoice Belum Lunas', ikon: 'receipt', tone: 'warn', nilai: UI.hitung(db.invBelum) + ' <small>invoice</small>', kaki: '<span class="warn num"><b>' + U.rpRingkas(db.invBelumNominal) + '</b></span>' + (db.invTelat ? '<span class="badge danger">' + ic('clock', 14) + db.invTelat + ' lewat jatuh tempo</span>' : '<span class="badge ok">Tidak ada yang telat</span>'), go: 'invoice' }) +
        UI.stat({ label: 'Sisa tagihan', judul: 'Sisa Piutang', ikon: 'hand-coins', nilai: '<span title="' + U.rp(db.sisaPiutang) + '">' + (mobile ? UI.hitung(db.sisaPiutang, 'rpS') : UI.hitung(db.sisaPiutang, 'rp')) + '</span>', kaki: '<span>' + db.bookingMenunggu + ' booking menunggu pelunasan</span><span class="badge accent">Follow up</span>', go: 'penjualan' }) + '</div>';

      var b = db.berikut, cd = b ? '<div class="card stat stat--ink lift" style="gap:14px;min-height:0"><div class="between"><span class="badge accent">H-' + b.hari + (b.hari === 0 ? ' · Hari ini' : ' Berangkat') + '</span>' + ic('sailboat', 22, 'muted') + '</div>' +
        '<div class="row">' + Hal.tripFoto(b.trip, 'sm') + '<div class="row__text"><span class="label">Trip terdekat</span><h3 class="truncate" style="color:#fff;font-size:18px">' + esc(b.trip.Nama) + '</h3></div></div><small class="muted">' + esc(b.trip.Kode) + ' · ' + F.rentang(b.trip.Tgl_Berangkat, b.trip.Tgl_Pulang) + ' · ' + esc(b.trip.Meeting_Point) + '</small>' +
        '<div class="countdown" id="cd" data-tgl="' + b.trip.Tgl_Berangkat + '"></div>' +
        '<div class="between" style="font-size:13px"><span class="muted">Manifest final</span><b style="color:' + (b.manifestFinal >= b.pax ? '#4FD1A0' : '#FFC27A') + '">' + ic(b.manifestFinal >= b.pax ? 'circle-check' : 'clock', 16) + ' ' + b.manifestFinal + '/' + b.pax + ' pax</b></div>' +
        '<a class="btn btn--white btn--block" href="#/manifest/' + b.trip.ID_Trip + '">Lihat Manifest & Kalender ' + ic('arrow-right', 18) + '</a></div>' : '<div class="card">' + UI.kosong('calendar', 'Belum ada trip mendatang', 'Tambah trip di Pengaturan → Master Data.') + '</div>';

      var grafik = '<div class="card lift"><div class="card__head"><div class="card__title"><span class="label">Financial flow monitoring</span><h2>Pendapatan vs Biaya Operasional</h2></div><span class="badge ink">' + F.persen(db.margin) + ' profit margin</span></div>' +
        Grafik.kapsul(db.seri.map(function (s) { return { label: s.label, a: s.pendapatan, b: s.biaya, kini: s.kini }; }), { lb: 'Biaya (realisasi/budget)' }) +
        '<div class="between wrap" style="margin-top:8px"><div class="legend"><span><i style="background:var(--c-primary)"></i>Pendapatan</span><span><i class="hatch" style="border:1px solid var(--c-primary-soft)"></i>Biaya</span></div><a class="btn btn--plain btn--sm" href="#/labarugi">Detail laba rugi ' + ic('arrow-right', 16) + '</a></div></div>';

      var gauge = '<div class="card lift stack" style="gap:12px"><div class="card__head" style="margin:0"><div class="card__title"><span class="label">Collection rate</span><h2>Persentase Pelunasan</h2></div><span class="badge ' + (db.collection >= 80 ? 'ok' : 'warn') + '">' + (db.collection >= 80 ? 'Sangat baik' : 'Perlu dikejar') + '</span></div>' +
        Grafik.gauge(db.collection, 'Tagihan terbayar') +
        '<div class="box stack" style="background:var(--c-surface-2);border:1px solid var(--c-border);border-radius:var(--r-md);padding:12px;gap:8px"><div class="between" style="font-size:13px"><span class="muted">Target pelunasan</span><b class="num">90%</b></div><div class="progress"><i style="width:' + Math.min(100, db.collection / 90 * 100) + '%"></i></div><small class="muted" style="text-align:center">Terbayar ' + U.rpRingkas(db.totalBayar) + ' dari ' + U.rpRingkas(db.totalTagihan) + '</small></div></div>';

      var inv = db.invoiceTerbaru;
      var tabel = '<div class="card card--pad0 lift"><div class="card__head" style="padding:20px 20px 0"><div class="card__title"><span class="label">Aktivitas tagihan & integrasi kalender</span><h2>Invoice Terbaru & Status Calendar</h2></div><a class="btn btn--soft btn--sm" href="#/invoice">Lihat semua (' + Store.D.Invoice.length + ')</a></div>' +
        UI.tabel({ kolom: [
          { label: 'No. invoice & customer', render: function (i) { var pj = Store.get('Penjualan', i.ID_Penjualan) || {}, c = Store.get('Customer', pj.ID_Customer) || {}; return '<div class="cell-main">' + UI.avatar(c.Nama) + '<div class="row__text"><b class="truncate">' + esc(c.Nama) + '</b><span class="sub mono">' + esc(i.No_Invoice) + '</span></div></div>'; } },
          { label: 'Trip', render: function (i) { var pj = Store.get('Penjualan', i.ID_Penjualan) || {}, t = Store.get('Trip', pj.ID_Trip) || {}; return '<span class="truncate" style="display:block;max-width:200px">' + esc(t.Nama) + '</span><span class="sub">' + pj.Jumlah_Pax + ' pax · ' + U.tglId(t.Tgl_Berangkat) + '</span>'; } },
          { label: 'Nominal', num: true, render: function (i) { return '<b>' + F.rpTip(i.Nominal) + '</b><span class="sub">' + esc(i.Jenis) + '</span>'; } },
          { label: 'Status bayar', render: function (i) { var telat = i.Status === 'Terbit' && i.Jatuh_Tempo < today; return UI.badge(telat ? 'Jatuh Tempo' : i.Status === 'Terbit' ? 'Menunggu' : i.Status); } },
          { label: 'Calendar', render: calChip }
        ], baris: inv, klik: function (i) { return i.No_Invoice; }, kosong: 'Belum ada invoice' }) + '</div>';

      var antre = db.antrean.slice(0, 5), pending = Store.D.Pembayaran.filter(function (x) { return x.Status_Verifikasi === 'Menunggu'; });
      var queue = '<div class="card lift"><div class="card__head"><div class="card__title"><span class="label">' + (admin ? 'Admin action queue' : 'Finance action queue') + '</span><h2>Review Peserta & DP Masuk</h2></div><span class="badge ' + (antre.length + pending.length ? 'danger' : 'ok') + '">' + (antre.length + pending.length) + ' menunggu</span></div><div class="stack stagger" style="gap:10px">' +
        pending.slice(0, 2).map(function (p) { var pj = Store.get('Penjualan', p.ID_Penjualan) || {}, c = Store.get('Customer', pj.ID_Customer) || {}; return '<div class="kv" style="grid-template-columns:auto 1fr;align-items:center;gap:10px">' + UI.avatar(c.Nama, '', 'sm') + '<div class="row__text" style="text-align:left"><div class="between"><b class="truncate">' + esc(c.Nama) + '</b><span class="badge warn">Bukti masuk</span></div><small class="muted">' + esc(p.Jenis) + ' ' + U.rp(p.Nominal) + ' via ' + esc(p.Metode) + '</small><div style="margin-top:8px"><button class="btn btn--soft btn--sm" data-act="mutasi" data-id="' + p.ID_Penjualan + '">' + ic('scan-line', 16) + 'Cek mutasi</button></div></div></div>'; }).join('') +
        antre.map(function (a) { return '<div class="kv" style="grid-template-columns:auto 1fr;align-items:center;gap:10px">' + UI.avatar(a.r.cust.Nama, '', 'sm') + '<div class="row__text" style="text-align:left"><div class="between"><b class="truncate">' + esc(a.r.cust.Nama) + '</b><span class="badge ' + (a.jenis === 'telat' ? 'danger' : 'warn') + '">' + esc(a.label) + '</span></div><small class="muted truncate" style="display:block">' + esc(a.r.trip.Nama) + ' · sisa ' + U.rp(a.r.sisa) + '</small>' + (aksiAntrean(a) ? '<div style="margin-top:8px">' + aksiAntrean(a) + '</div>' : '') + '</div></div>'; }).join('') +
        (!antre.length && !pending.length ? UI.kosong('circle-check', 'Semua beres', 'Tidak ada review yang tertunda.') : '') +
        '<div class="note ok">' + ic('workflow') + '<span>Otomasi manifest & Calendar aktif — invoice baru langsung masuk Peserta Trip.</span></div></div></div>';

      body.innerHTML = stats + '<div class="grid-12"><div class="span-6 span-lg-12">' + grafik + '</div><div class="span-3 span-lg-6 span-md-6">' + gauge + '</div><div class="span-3 span-lg-6 span-md-6">' + cd + '</div></div>' +
        '<div class="grid-12"><div class="span-8 span-lg-12">' + tabel + '</div><div class="span-4 span-lg-12">' + queue + '</div></div>';
      body.querySelectorAll('tr[data-row]').forEach(function (tr) { tr.onclick = function () { App.go('invoice/lihat/' + encodeURIComponent(tr.dataset.row)); }; });
      if (animasi) { UI.hitungNaik(body); }
      Grafik.hidupkan(body); hitungMundur();
    }
  };
  window.Halaman.dashboard = H;
})();
