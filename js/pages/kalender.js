/* YukX — Kalender Trip: embed Google Calendar + kalender bulanan aplikasi + jadwal, peserta & status per trip */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  var st = { tab: '', bulan: '', hari: '', buka: {}, q: '' };
  var TONE_TRIP = { Open: 'info', Berjalan: 'solid', Selesai: 'ok', Draft: 'neutral', Batal: 'danger' };
  var WARNA_TRIP = { Open: 'var(--c-primary)', Berjalan: 'var(--c-accent)', Selesai: 'var(--c-ok)', Draft: 'var(--c-border-strong)', Batal: 'var(--c-danger)' };

  function calId() { return (Store.info && Store.info.kalender && Store.info.kalender.id) || ''; }
  function urlEmbed(mode) {
    var id = calId(), gelap = document.documentElement.getAttribute('data-theme') === 'dark';
    return 'https://calendar.google.com/calendar/embed?src=' + encodeURIComponent(id) + '&ctz=Asia%2FJakarta&mode=' + mode + '&wkst=2&hl=id&showTitle=0&showPrint=0&showCalendars=0&showTz=0&showTabs=1' + (gelap ? '&bgcolor=%23101826' : '');
  }
  function urlBuka() { return 'https://calendar.google.com/calendar/u/0/r?cid=' + encodeURIComponent(calId()); }
  function tripsAktif() { return Store.D.Trip.filter(function (t) { return t.Status !== 'Batal' && t.Status !== 'Draft' && t.Tgl_Berangkat; }); }
  function bulanIni() { return st.bulan || U.hariIni().slice(0, 7); }
  function geserBulan(ym, n) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + U.pad(m + 1, 2); }
  function akhirBulan(ym) { return new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).toISOString().slice(0, 10); }

  /** Ringkasan per trip: peserta (booking), pembayaran, manifest, realisasi. */
  function info(t, ix, today) {
    var pjs = (ix.pjPerTrip[t.ID_Trip] || []).filter(function (p) { return p.Status !== 'Batal'; });
    var rs = pjs.map(function (p) { return HT.ringkasPj(Store.D, ix, p, today, Store.S); });
    var pax = U.jumlah(pjs, function (p) { return p.Jumlah_Pax; }), lunas = rs.filter(function (r) { return r.tahap === 'lunas'; }).length;
    var mfFinal = rs.filter(function (r) { return r.manifest && r.manifest.Status === 'Final'; }).length;
    return { t: t, status: HT.statusTrip(t, today), rs: rs, pax: pax, booking: rs.length, lunas: lunas, mfFinal: mfFinal, rk: HT.rekapTrip(Store.D, ix, t, today), anggota: U.jumlah(rs, function (r) { return r.anggota; }), event: rs.filter(function (r) { return r.pj.ID_Event; }).length };
  }

  function gridBulan(ym, list) {
    var awal = ym + '-01', akhir = akhirBulan(ym), today = U.hariIni();
    var dow = (new Date(awal + 'T00:00:00Z').getUTCDay() + 6) % 7, mulai = U.tambahHari(awal, -dow), sel = [];
    for (var i = 0; i < 42; i++) { var d = U.tambahHari(mulai, i); if (i >= 35 && d > akhir) break; sel.push(d); }
    return '<div class="kal" role="grid" aria-label="Kalender ' + esc(U.BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4)) + '">' + HARI.map(function (h) { return '<div class="kal__h" role="columnheader">' + h + '</div>'; }).join('') +
      sel.map(function (d, idx) {
        var ini = list.filter(function (x) { return d >= x.t.Tgl_Berangkat && d <= (x.t.Tgl_Pulang || x.t.Tgl_Berangkat); });
        var cls = 'kal__d' + (d.slice(0, 7) !== ym ? ' luar' : '') + (d === today ? ' kini' : '') + (st.hari === d ? ' pilih' : '') + (ini.length ? ' ada' : '');
        return '<button type="button" role="gridcell" class="' + cls + '" data-act="hari" data-d="' + d + '" aria-label="' + U.tglId(d) + (ini.length ? ', ' + ini.length + ' trip' : '') + '"><span class="kal__n">' + (+d.slice(8, 10)) + '</span>' +
          ini.slice(0, 3).map(function (x) { var awalT = d === x.t.Tgl_Berangkat || idx % 7 === 0; /* label diulang tiap awal minggu */ var akhirT = d === x.t.Tgl_Pulang; return '<span class="kal__bar' + (awalT ? ' awal' : '') + (akhirT ? ' akhir' : '') + '" style="--w:' + WARNA_TRIP[x.status] + '" title="' + esc(x.t.Nama) + '">' + (awalT ? '<span>' + esc(x.t.Kode.replace(/^TRP-/, '')) + ' · ' + x.pax + ' pax</span>' : '') + '</span>'; }).join('') +
          (ini.length > 3 ? '<small class="kal__more">+' + (ini.length - 3) + '</small>' : '') + '</button>';
      }).join('') + '</div>';
  }

  function kartuTrip(x) {
    var t = x.t, buka = !!st.buka[t.ID_Trip], rk = x.rk;
    var peserta = U.urutkan(x.rs, function (r) { return r.cust.Nama; });
    return '<div class="card card--tight stack kal-trip" style="gap:10px;border-left:4px solid ' + WARNA_TRIP[x.status] + '"><div class="row" style="gap:12px;align-items:flex-start">' + Hal.tripFoto(t, 'sm') +
      '<div class="row__text grow"><div class="between wrap" style="gap:6px"><b>' + esc(t.Nama) + '</b>' + UI.badge(x.status, TONE_TRIP[x.status]) + '</div><small class="muted">' + esc(t.Kode) + ' · ' + F.rentang(t.Tgl_Berangkat, t.Tgl_Pulang) + ' · ' + esc(t.Meeting_Point || t.Tujuan) + '</small></div></div>' +
      '<div class="mini-kpi"><div><span class="label">Peserta</span><b class="num">' + x.pax + ' / ' + t.Kuota + ' pax</b></div><div><span class="label">Booking lunas</span><b class="num">' + x.lunas + ' / ' + x.booking + '</b></div><div><span class="label">Manifest final</span><b class="num ' + (x.mfFinal === x.booking && x.booking ? 'ok' : '') + '">' + x.mfFinal + ' / ' + x.booking + '</b></div><div><span class="label">Event Calendar</span><b class="num">' + x.event + ' / ' + x.booking + '</b></div></div>' +
      (x.status === 'Selesai' || rk.adaRealisasi ? '<div class="row wrap" style="gap:6px"><span class="label" style="margin-right:4px">Realisasi</span>' + Realisasi.badgeStatus(rk.statusAudit) + Realisasi.tanda(rk, true) + '</div>' : '') +
      '<div class="row wrap" style="gap:6px"><button class="btn btn--soft btn--sm" data-act="peserta" data-id="' + t.ID_Trip + '" aria-expanded="' + buka + '">' + ic(buka ? 'chevron-up' : 'users-round', 16) + (buka ? 'Sembunyikan peserta' : 'Daftar peserta (' + x.booking + ')') + '</button><a class="btn btn--ghost btn--sm" href="#/manifest/' + t.ID_Trip + '">' + ic('clipboard-list', 16) + 'Manifest</a><a class="btn btn--ghost btn--sm" href="#/budget/' + t.ID_Trip + '">' + ic('calculator', 16) + 'RAB</a></div>' +
      (buka ? (peserta.length ? UI.tabel({ tanpaMain: true, kolom: [
        { label: 'Customer', render: function (r) { return '<div class="row" style="gap:8px">' + UI.avatar(r.cust.Nama, '', 'sm') + '<div class="row__text"><b class="truncate">' + esc(r.cust.Nama) + '</b><span class="sub">' + esc(r.cust.No_WA || '-') + '</span></div></div>'; } },
        { label: 'Pax', num: true, render: function (r) { return r.pj.Jumlah_Pax + (r.anggota ? '<span class="sub">' + r.anggotaLengkap + '/' + r.pj.Jumlah_Pax + ' data</span>' : ''); } },
        { label: 'Pembayaran', render: function (r) { var tone = r.tahap === 'lunas' ? 'ok' : r.telat ? 'danger' : r.tahap === 'booking' ? 'warn' : 'info'; return UI.badge(r.tahap === 'lunas' ? 'Lunas' : r.tahap === 'booking' ? 'Booking' : r.telat ? 'Telat bayar' : 'DP ' + r.persen + '%', tone) + (r.sisa ? '<span class="sub">Sisa ' + U.rpRingkas(r.sisa) + '</span>' : ''); } },
        { label: 'Manifest', render: function (r) { return r.manifest ? UI.badge(r.manifest.Status, r.manifest.Status === 'Final' ? 'ok' : 'neutral') : '<span class="muted">—</span>'; } },
        { label: 'Calendar', center: true, render: function (r) { return r.pj.ID_Event ? '<span class="ok" title="Event tersinkron">' + ic('calendar-check', 18) + '</span>' : '<span class="muted" title="Belum ada event">' + ic('calendar-x', 18) + '</span>'; } }
      ], baris: peserta }) : '<small class="muted">Belum ada booking.</small>') : '') + '</div>';
  }

  var H = {
    judul: 'Kalender Trip',
    render: function (el, args, q) {
      if (!st.tab) st.tab = C.DEMO || !calId() ? 'aplikasi' : 'google';
      if (q && q.bulan) st.bulan = q.bulan;
      var admin = Store.isAdmin();
      el.innerHTML = Hal.kepala({ crumbs: ['Transaksi & operasional', 'Kalender trip'], judul: 'Kalender Trip', sub: 'Jadwal keberangkatan, daftar peserta dan statusnya. Setiap booking otomatis menjadi event di Google Calendar "' + esc(Store.S.CAL_NAMA || 'YukX Trips') + '" lengkap dengan invoice & manifest.',
        aksi: (calId() ? '<a class="btn btn--ghost" href="' + esc(urlBuka()) + '" target="_blank" rel="noopener">' + ic('external-link', 18) + '<span class="hide-sm">Buka di Google Calendar</span></a>' : '') +
          (admin && !C.DEMO ? '<button class="btn btn--soft" data-act="bagikan">' + ic('share-2', 18) + '<span class="hide-sm">Bagikan ke akun tim</span></button>' : '') }) +
        '<div class="between wrap" style="gap:10px;margin-bottom:16px"><div class="seg" role="tablist"><button role="tab" data-act="tab" data-t="google" class="' + (st.tab === 'google' ? 'on' : '') + '">' + ic('calendar-check', 16) + ' Google Calendar</button><button role="tab" data-act="tab" data-t="aplikasi" class="' + (st.tab === 'aplikasi' ? 'on' : '') + '">' + ic('calendar-days', 16) + ' Kalender bulanan</button></div>' +
        '<div class="legend">' + ['Open', 'Berjalan', 'Selesai'].map(function (s) { return '<span><i style="background:' + WARNA_TRIP[s] + '"></i>' + s + '</span>'; }).join('') + '</div></div>' +
        '<div class="grid-12" style="align-items:start"><div class="span-8 span-lg-12" id="kl-kiri"></div><div class="span-4 span-lg-12 stack" style="gap:12px" id="kl-kanan"></div></div>';
      Hal.aksiPeta(el, {
        tab: function (d) { st.tab = d.t; el.querySelectorAll('[data-act="tab"]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === st.tab); }); H.kiri(el); },
        bulan: function (d) { st.bulan = d.n === '0' ? U.hariIni().slice(0, 7) : geserBulan(bulanIni(), +d.n); st.hari = ''; H.isi(el); },
        hari: function (d) { st.hari = st.hari === d.d ? '' : d.d; if (d.d.slice(0, 7) !== bulanIni()) st.bulan = d.d.slice(0, 7); H.isi(el); },
        peserta: function (d) { st.buka[d.id] = !st.buka[d.id]; H.kanan(el); },
        semuaHari: function () { st.hari = ''; H.isi(el); },
        bagikan: async function (d, b) { var r = await C.api('kalender.bagikan', {}); UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success && r.data && r.data.gagal && r.data.gagal.length) UI.toast('Tidak bisa dibagikan: ' + r.data.gagal.join(', ') + ' (bukan akun Google?)', 'warn'); }
      });
      H.isi(el);
    },
    navigasi: function (el, args, q) { if (q && q.bulan) st.bulan = q.bulan; H.isi(el); },
    segarkan: function (el) { H.isi(el); },
    isi: function (el) { H.kiri(el); H.kanan(el); },
    kiri: function (el) {
      var box = el.querySelector('#kl-kiri'); if (!box) return;
      if (st.tab === 'google') {
        if (!calId() || C.DEMO) {
          box.innerHTML = '<div class="card kal-embed kal-embed--kosong"><div class="empty"><div class="ic-box">' + ic('calendar-check', 26) + '</div><b>' + (C.DEMO ? 'Google Calendar tampil di versi live' : 'Kalender belum siap') + '</b><p>' + (C.DEMO ? 'Di Mode Demo tidak ada akun Google yang tersambung. Setelah backend dipasang, area ini menampilkan kalender "' + esc(Store.S.CAL_NAMA || 'YukX Trips') + '" asli (embed) — satu event per booking berisi data customer, invoice & manifest.' : 'Jalankan setupAppEnvironment() di Apps Script agar kalender dibuat.') + '</p><button class="btn btn--primary btn--sm" data-act="tab" data-t="aplikasi">' + ic('calendar-days', 16) + 'Lihat kalender bulanan</button></div></div>';
          return;
        }
        var mobile = innerWidth <= 720;
        box.innerHTML = '<div class="card card--pad0 kal-embed"><iframe title="Google Calendar ' + esc(Store.S.CAL_NAMA || 'YukX Trips') + '" src="' + esc(urlEmbed(mobile ? 'AGENDA' : 'MONTH')) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>' +
          '<div class="note" style="margin-top:10px">' + ic('info') + '<span>Kalender tampil bila browser ini masuk ke akun Google yang sudah diberi akses (tombol <b>Bagikan ke akun tim</b>). Bila kosong/minta login, klik <a href="' + esc(urlBuka()) + '" target="_blank" rel="noopener">Buka di Google Calendar</a> — beberapa browser (Safari) memblokir kalender tersemat.</span></div>';
        return;
      }
      var ym = bulanIni(), today = U.hariIni(), ix = HT.indeks(Store.D);
      var list = tripsAktif().map(function (t) { return { t: t, status: HT.statusTrip(t, today), pax: U.jumlah((ix.pjPerTrip[t.ID_Trip] || []).filter(function (p) { return p.Status !== 'Batal'; }), function (p) { return p.Jumlah_Pax; }) }; });
      box.innerHTML = '<div class="card stack" style="gap:12px"><div class="between wrap" style="gap:8px"><h2 style="margin:0">' + U.BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4) + '</h2><div class="row" style="gap:6px"><button class="btn btn--ghost btn--sm btn--icon" data-act="bulan" data-n="-1" aria-label="Bulan sebelumnya">' + ic('chevron-left', 18) + '</button><button class="btn btn--ghost btn--sm" data-act="bulan" data-n="0">Hari ini</button><button class="btn btn--ghost btn--sm btn--icon" data-act="bulan" data-n="1" aria-label="Bulan berikutnya">' + ic('chevron-right', 18) + '</button></div></div>' + gridBulan(ym, list) + '<small class="muted">Klik tanggal untuk melihat trip pada hari itu.</small></div>';
    },
    kanan: function (el) {
      var box = el.querySelector('#kl-kanan'); if (!box) return;
      var today = U.hariIni(), ix = HT.indeks(Store.D), ym = bulanIni(), awal = ym + '-01', akhir = akhirBulan(ym);
      var semua = tripsAktif().map(function (t) { return info(t, ix, today); });
      var pilih = st.hari ? semua.filter(function (x) { return st.hari >= x.t.Tgl_Berangkat && st.hari <= (x.t.Tgl_Pulang || x.t.Tgl_Berangkat); })
        : semua.filter(function (x) { return x.t.Tgl_Berangkat <= akhir && (x.t.Tgl_Pulang || x.t.Tgl_Berangkat) >= awal; });
      if (st.tab === 'google' && !st.hari) pilih = U.urutkan(semua.filter(function (x) { return (x.t.Tgl_Pulang || x.t.Tgl_Berangkat) >= U.tambahHari(today, -14); }), function (x) { return x.t.Tgl_Berangkat; }).slice(0, 8);
      pilih = U.urutkan(pilih, function (x) { return x.t.Tgl_Berangkat; });
      var judul = st.hari ? 'Trip pada ' + U.tglPanjang(st.hari) : st.tab === 'google' ? 'Jadwal trip terdekat' : 'Trip ' + U.BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
      var berjalan = semua.filter(function (x) { return x.status === 'Berjalan'; }).length, akan = semua.filter(function (x) { return x.status === 'Open'; }).length;
      box.innerHTML = '<div class="card card--tight"><div class="mini-kpi"><div><span class="label">Berjalan</span><b class="num">' + berjalan + ' trip</b></div><div><span class="label">Akan berangkat</span><b class="num">' + akan + ' trip</b></div><div><span class="label">Peserta terjadwal</span><b class="num">' + U.jumlah(semua.filter(function (x) { return x.status !== 'Selesai'; }), function (x) { return x.pax; }) + ' pax</b></div></div></div>' +
        '<div class="between"><h3 style="margin:0">' + esc(judul) + '</h3>' + (st.hari ? '<button class="btn btn--plain btn--sm" data-act="semuaHari">Semua</button>' : '<span class="badge neutral">' + pilih.length + ' trip</span>') + '</div>' +
        (pilih.length ? pilih.map(kartuTrip).join('') : '<div class="card">' + UI.kosong('calendar', 'Tidak ada trip', st.hari ? 'Tidak ada keberangkatan pada tanggal ini.' : 'Tidak ada trip pada bulan ini.') + '</div>');
    }
  };
  window.Halaman.kalender = H;
})();
