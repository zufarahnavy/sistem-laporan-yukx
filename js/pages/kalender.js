/* =====================================================================
   YukBanyuwangi — Kalender Trip
   Satu pesanan (nama tamu) = satu event Google Calendar seharian, berisi
   data tamu, Tim Lapang, daftar peserta & lampiran PDF manifest. Halaman ini
   menampilkan kalender bulanan dari data sheet + status sinkron tiap event,
   dan kalender Google asli (embed) bila sudah terhubung.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  var st = { tab: '', bulan: '', hari: '' };
  var WARNA = { YB: 'var(--c-primary)', SB: 'var(--c-sb)' };

  function calId() { return (Store.info && Store.info.kalender && Store.info.kalender.id) || ''; }
  function urlEmbed(mode) {
    var gelap = document.documentElement.getAttribute('data-theme') === 'dark';
    return 'https://calendar.google.com/calendar/embed?src=' + encodeURIComponent(calId()) + '&ctz=Asia%2FJakarta&mode=' + mode + '&wkst=2&hl=id&showTitle=0&showPrint=0&showCalendars=0&showTz=0' + (gelap ? '&bgcolor=%23101826' : '');
  }
  function urlBuka() { return 'https://calendar.google.com/calendar/u/0/r?cid=' + encodeURIComponent(calId()); }
  function bulanIni() { return st.bulan || U.hariIni().slice(0, 7); }
  function akhirBulan(ym) { return new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).toISOString().slice(0, 10); }
  function semua() {
    var S = Store.S, today = U.hariIni(), ix = HT.indeks(Store.D);
    return Store.D.Pesanan.map(function (p) { var i = HT.infoPesanan(p, S); i.p = p; i.status = HT.statusTrip(i, today); i.ev = ix.evt[p.ID_Pesanan]; i.m = ix.mnf[p.ID_Pesanan]; return i; }).filter(function (i) { return i.mulai; });
  }

  function grid(ym, list) {
    var awal = ym + '-01', akhir = akhirBulan(ym), today = U.hariIni();
    var dow = (new Date(awal + 'T00:00:00Z').getUTCDay() + 6) % 7, mulai = U.tambahHari(awal, -dow), sel = [];
    for (var i = 0; i < 42; i++) { var d = U.tambahHari(mulai, i); if (i >= 35 && d > akhir) break; sel.push(d); }
    return '<div class="kal" role="grid" aria-label="Kalender ' + esc(U.labelBulan(ym)) + '">' + HARI.map(function (h) { return '<div class="kal__h" role="columnheader">' + h + '</div>'; }).join('') +
      sel.map(function (d, idx) {
        var ini = U.urutkan(list.filter(function (x) { return d >= x.mulai && d <= x.selesai; }), function (x) { return x.mulai + x.p.Nama; });
        var cls = 'kal__d' + (d.slice(0, 7) !== ym ? ' luar' : '') + (d === today ? ' kini' : '') + (st.hari === d ? ' pilih' : '');
        return '<button type="button" role="gridcell" class="' + cls + '" data-act="hari" data-d="' + d + '" aria-label="' + U.tglId(d) + (ini.length ? ', ' + ini.length + ' trip' : '') + '"><span class="kal__n">' + (+d.slice(8, 10)) + '</span>' +
          ini.slice(0, 3).map(function (x) { var a = d === x.mulai || idx % 7 === 0, z = d === x.selesai; return '<span class="kal__bar' + (a ? ' awal' : '') + (z ? ' akhir' : '') + (x.status === 'Selesai' ? ' lewat' : '') + '" style="--w:' + WARNA[x.bagian] + '" title="' + esc(x.p.Nama + ' · ' + x.p.Trip) + '">' + (a ? '<span>' + esc(x.p.Nama) + '</span>' : '') + '</span>'; }).join('') +
          (ini.length > 3 ? '<small class="kal__more">+' + (ini.length - 3) + ' lagi</small>' : '') + '</button>';
      }).join('') + '</div>';
  }
  function statusEvent(x) {
    if (x.ev && x.ev.Status === 'OK') return { t: 'Tersinkron', tone: 'ok', ik: 'calendar-check' };
    if (x.ev && x.ev.Status === 'Gagal') return { t: 'Gagal: ' + (x.ev.Pesan || ''), tone: 'danger', ik: 'calendar-x' };
    return { t: 'Menunggu sinkron', tone: 'neutral', ik: 'clock' };
  }
  function kartu(x) {
    var se = statusEvent(x), tl = x.m ? (U.parseJson(x.m.TL, []) || []) : [], und = x.m ? (U.parseJson(x.m.Diundang, []) || []) : [], peserta = x.m ? (U.parseJson(x.m.Peserta, []) || []).length : 0;
    return '<div class="card card--tight kal-trip" style="--w:' + WARNA[x.bagian] + '"><div class="between" style="align-items:flex-start;gap:8px"><div class="row__text"><b class="truncate" style="display:block">' + esc(x.p.Nama) + '</b><small class="muted truncate" style="display:block">' + esc(x.p.Trip) + '</small></div>' + UI.badge(x.status) + '</div>' +
      '<div class="kal-trip__meta"><span>' + ic('calendar-days', 14) + esc(x.jadwal) + '</span><span>' + ic('users', 14) + x.pax + ' pax' + (peserta ? ' · ' + peserta + ' nama' : '') + '</span><span>' + ic('user-check', 14) + (tl.length ? esc(tl.map(function (t) { return t.nama; }).join(', ')) : 'TL belum dipilih') + '</span></div>' +
      '<div class="kal-trip__status"><span class="badge ' + se.tone + '" title="' + esc(se.t) + '">' + ic(se.ik, 14) + '<span class="truncate" style="max-width:180px">' + esc(se.t) + '</span></span>' + (x.ev && x.ev.Lampiran ? '<span class="badge info">' + ic('paperclip', 14) + 'Manifest</span>' : '') + (und.length ? '<span class="badge info">' + ic('mail', 14) + und.length + ' diundang</span>' : '') + '</div>' +
      (Store.isAdmin() ? '<div class="row wrap" style="gap:6px"><a class="btn btn--ghost btn--sm" href="#/manifest/' + x.id + '">' + ic('clipboard-list', 16) + 'Manifest</a><a class="btn btn--plain btn--sm" href="#/pesanan/' + x.id + '">' + ic('table-2', 16) + 'Pesanan</a></div>' : '') + '</div>';
  }

  var H = window.Halaman.kalender = {
    render: function (el, args, q) {
      if (!st.tab) st.tab = 'aplikasi';
      if (q && q.bulan && /^\d{4}-\d{2}$/.test(q.bulan)) st.bulan = q.bulan;
      var adm = Store.isAdmin();
      el.innerHTML = Hal.kepala({ judul: 'Kalender Trip', sub: 'Setiap pesanan otomatis menjadi event di Google Calendar "' + esc(Store.S.CAL_NAMA || 'YukBanyuwangi Trips') + '" atas nama tamu — lengkap dengan peserta, Tim Lapang & PDF manifest.',
        aksi: (calId() && !C.DEMO ? '<a class="btn btn--ghost" href="' + esc(urlBuka()) + '" target="_blank" rel="noopener">' + ic('external-link', 18) + '<span class="hide-sm">Buka Google Calendar</span></a>' : '') +
          (adm ? '<button class="btn btn--soft" data-act="sinkron">' + ic('refresh-cw', 18) + '<span>Sinkron sekarang</span></button>' : '') + (adm && !C.DEMO ? '<button class="btn btn--ghost" data-act="bagikan" title="Beri akses lihat kalender ke akun tim">' + ic('share-2', 18) + '<span class="hide-sm">Bagikan ke tim</span></button>' : '') }) +
        '<div class="between wrap" style="gap:10px;margin-bottom:16px"><div class="seg" role="tablist"><button role="tab" data-act="tab" data-t="aplikasi" class="' + (st.tab === 'aplikasi' ? 'on' : '') + '">' + ic('calendar-days', 16) + ' Kalender bulanan</button><button role="tab" data-act="tab" data-t="google" class="' + (st.tab === 'google' ? 'on' : '') + '">' + ic('calendar-check', 16) + ' Google Calendar</button></div>' +
        '<div class="legend"><span><i style="background:' + WARNA.YB + '"></i>YukBanyuwangi</span><span><i style="background:' + WARNA.SB + '"></i>Sunrise Boat</span></div></div>' +
        '<div class="grid-12" style="align-items:start"><div class="span-8 span-lg-12" id="kl-kiri"></div><div class="span-4 span-lg-12 stack" style="gap:12px" id="kl-kanan"></div></div>';
      Hal.aksiPeta(el, {
        tab: function (d) { st.tab = d.t; el.querySelectorAll('[data-act="tab"]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === st.tab); }); H.kiri(el); H.kanan(el); },
        bulan: function (d) { st.bulan = d.n === '0' ? U.hariIni().slice(0, 7) : HT.geserBulan(bulanIni(), +d.n); st.hari = ''; H.isi(el); },
        hari: function (d) { st.hari = st.hari === d.d ? '' : d.d; if (d.d.slice(0, 7) !== bulanIni()) st.bulan = d.d.slice(0, 7); H.isi(el); },
        semuaHari: function () { st.hari = ''; H.isi(el); },
        sinkron: async function (d, b) { var r = await C.aksi('kalender.sinkron', {}, { btn: b, proses: 'Menjadwalkan sinkron Google Calendar', loadingText: 'Sinkron…' }); if (r.success) C.Pekerja.jalan(); },
        bagikan: async function () { var selesai = UI.proses('Membagikan kalender'); var r = await C.api('kalender.bagikan', {}); selesai(r.success); UI.toast(r.message, r.success ? 'ok' : 'err'); }
      });
      H.isi(el);
    },
    navigasi: function (el, args, q) { if (q && q.bulan && /^\d{4}-\d{2}$/.test(q.bulan)) st.bulan = q.bulan; H.isi(el); },
    segarkan: function (el) { H.kanan(el); if (st.tab === 'aplikasi') H.kiri(el); },
    isi: function (el) { H.kiri(el); H.kanan(el); },
    kiri: function (el) {
      var box = el.querySelector('#kl-kiri'); if (!box) return;
      if (st.tab === 'google') {
        if (!calId() || C.DEMO) { box.innerHTML = '<div class="card kal-embed kal-embed--kosong">' + UI.kosong('calendar-check', C.DEMO ? 'Google Calendar tampil di versi live' : 'Kalender belum siap', C.DEMO ? 'Mode Demo tidak tersambung ke akun Google. Setelah backend terpasang, area ini menampilkan kalender "' + esc(Store.S.CAL_NAMA || 'YukBanyuwangi Trips') + '" asli — satu event per nama tamu.' : 'Jalankan setupAppEnvironment() di Apps Script agar kalender dibuat.', '<button class="btn btn--primary btn--sm" data-act="tab" data-t="aplikasi">' + ic('calendar-days', 16) + 'Lihat kalender bulanan</button>') + '</div>'; return; }
        box.innerHTML = '<div class="card card--pad0 kal-embed"><iframe title="Google Calendar" src="' + esc(urlEmbed(innerWidth <= 720 ? 'AGENDA' : 'MONTH')) + '" loading="lazy"></iframe></div><div class="note" style="margin-top:10px">' + ic('info') + '<span>Tampil bila browser ini masuk ke akun Google yang diberi akses. Bila kosong, pakai <a href="' + esc(urlBuka()) + '" target="_blank" rel="noopener">Buka Google Calendar</a>.</span></div>';
        return;
      }
      var ym = bulanIni();
      box.innerHTML = '<div class="card stack" style="gap:12px"><div class="between wrap" style="gap:8px"><h2 style="margin:0">' + esc(U.labelBulan(ym)) + '</h2><div class="row" style="gap:6px"><button class="btn btn--ghost btn--sm btn--icon" data-act="bulan" data-n="-1" aria-label="Bulan sebelumnya">' + ic('chevron-left', 18) + '</button><button class="btn btn--ghost btn--sm" data-act="bulan" data-n="0">Bulan ini</button><button class="btn btn--ghost btn--sm btn--icon" data-act="bulan" data-n="1" aria-label="Bulan berikutnya">' + ic('chevron-right', 18) + '</button></div></div>' + grid(ym, semua()) + '<small class="muted">Pilih tanggal untuk melihat tamu pada hari itu.</small></div>';
    },
    kanan: function (el) {
      var box = el.querySelector('#kl-kanan'); if (!box) return;
      var ym = bulanIni(), awal = ym + '-01', akhir = akhirBulan(ym), today = U.hariIni(), list = semua();
      var pilih = st.hari ? list.filter(function (x) { return st.hari >= x.mulai && st.hari <= x.selesai; }) : st.tab === 'google' ? list.filter(function (x) { return x.selesai >= today; }) : list.filter(function (x) { return x.mulai <= akhir && x.selesai >= awal; });
      pilih = U.urutkan(pilih, function (x) { return x.mulai + x.p.Nama; }); var n = pilih.length; pilih = pilih.slice(0, 40);
      var mendatang = list.filter(function (x) { return x.selesai >= today; }), gagal = mendatang.filter(function (x) { return x.ev && x.ev.Status === 'Gagal'; }).length, belum = mendatang.filter(function (x) { return !x.ev; }).length;
      var judul = st.hari ? U.tglPanjang(st.hari) : st.tab === 'google' ? 'Trip mendatang' : 'Trip ' + U.labelBulan(ym);
      box.innerHTML = '<div class="card card--tight"><div class="mini-kpi"><div><span class="label">Event mendatang</span><b class="num">' + mendatang.length + '</b></div><div><span class="label">Menunggu sinkron</span><b class="num">' + belum + '</b></div><div><span class="label">Gagal</span><b class="num ' + (gagal ? 'danger' : '') + '">' + gagal + '</b></div></div></div>' +
        '<div class="between"><h3 style="margin:0">' + esc(judul) + '</h3>' + (st.hari ? '<button class="btn btn--plain btn--sm" data-act="semuaHari">Semua</button>' : '<span class="badge neutral">' + n + ' tamu</span>') + '</div>' +
        (pilih.length ? pilih.map(kartu).join('') + (n > pilih.length ? '<p class="muted center">' + (n - pilih.length) + ' lainnya — pilih tanggal untuk menyaring.</p>' : '') : '<div class="card">' + UI.kosong('calendar', 'Tidak ada trip', st.hari ? 'Tidak ada tamu pada tanggal ini.' : 'Tidak ada trip pada periode ini.') + '</div>');
    }
  };
})();
