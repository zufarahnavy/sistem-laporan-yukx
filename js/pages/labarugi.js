/* YukX — Halaman Laporan Laba Rugi (per trip & per periode; Finance membuat & mengunduh) */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { per: 'tahun', dari: '', sampai: '', trip: '', mode: 'trip', q: '' };

  function rentang() {
    var today = U.hariIni();
    if (st.per === 'kustom') return { dari: st.dari, sampai: st.sampai, label: (st.dari ? U.tglPanjang(st.dari) : 'awal') + ' – ' + (st.sampai ? U.tglPanjang(st.sampai) : 'sekarang') };
    return HT.rentangPeriode(st.per, today);
  }
  function data() { var r = rentang(); return { r: r, lr: HT.labaRugi(Store.D, { dari: r.dari, sampai: r.sampai, idTrip: st.trip, today: U.hariIni() }) }; }

  var H = {
    judul: 'Laba Rugi',
    render: function (el) {
      var fin = Store.isFin();
      el.innerHTML = Hal.kepala({ crumbs: ['Finance & laporan', 'Laporan laba rugi'], judul: 'Laporan Laba Rugi', sub: 'Laporan resmi perusahaan: hanya trip yang realisasi anggarannya sudah diaudit & disetujui Finance (final). Pendapatan diakui pada tanggal keberangkatan.',
        aksi: fin ? '<button class="btn btn--ghost" data-act="xls">' + ic('file-spreadsheet', 18, 'ok') + 'Unduh Excel</button><button class="btn btn--primary" data-act="pdf">' + ic('file-down', 18) + 'Unduh PDF resmi</button>' : '<span class="status-pill">' + ic('lock', 16, 'muted') + 'Hanya Finance yang membuat & mengunduh</span>' }) +
        '<div class="card card--tight" style="margin-bottom:16px"><div class="toolbar" style="gap:10px"><div class="seg" id="lr-per">' + [['bulan', 'Bulan ini'], ['bulan-lalu', 'Bulan lalu'], ['kuartal', 'Kuartal'], ['tahun', 'Tahun ini'], ['kustom', 'Kustom']].map(function (p) { return '<button data-p="' + p[0] + '" class="' + (st.per === p[0] ? 'on' : '') + '">' + p[1] + '</button>'; }).join('') + '</div>' +
        '<div class="row" id="lr-kustom" style="gap:6px;' + (st.per === 'kustom' ? '' : 'display:none') + '"><input class="input" type="date" id="lr-dari" value="' + st.dari + '" style="width:auto"><span class="muted">–</span><input class="input" type="date" id="lr-sampai" value="' + st.sampai + '" style="width:auto"></div>' + Hal.pilihTrip('lr-trip', st.trip, 'Semua trip') + '</div></div><div id="lr-body" class="stack" style="gap:16px"></div>';
      el.querySelector('#lr-per').onclick = function (e) { var b = e.target.closest('[data-p]'); if (!b) return; st.per = b.dataset.p; this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); el.querySelector('#lr-kustom').style.display = st.per === 'kustom' ? '' : 'none'; H.isi(el); };
      el.querySelector('#lr-dari').onchange = function () { st.dari = this.value; H.isi(el); }; el.querySelector('#lr-sampai').onchange = function () { st.sampai = this.value; H.isi(el); };
      el.querySelector('#lr-trip').onchange = function () { st.trip = this.value; H.isi(el); };
      Hal.aksiPeta(el, {
        mode: function (d) { st.mode = d.m; H.isi(el); },
        xls: function () { var d = data(), lr = d.lr, kat = Object.keys(lr.kategori);
          Dok.excel('Laba Rugi ' + d.r.label, [
            { nama: 'Laporan', rows: [[Store.S.PT_NAMA], ['LAPORAN LABA RUGI'], ['Periode: ' + d.r.label], [], ['Pos', 'Jumlah (Rp)', '% Pendapatan'], ['Pendapatan penjualan trip', lr.total.pendapatan, 100]].concat(kat.map(function (k) { return ['  Beban ' + k, -lr.kategori[k], lr.total.pendapatan ? Math.round(lr.kategori[k] / lr.total.pendapatan * 1000) / 10 : 0]; })).concat([['Total beban pokok', -lr.total.biaya, lr.total.pendapatan ? Math.round(lr.total.biaya / lr.total.pendapatan * 1000) / 10 : 0], ['LABA BERSIH', lr.total.laba, lr.total.margin]]), lebar: [40, 18, 14] },
            { nama: 'Per Trip (final)', rows: [['Kode', 'Trip', 'Berangkat', 'Pax', 'Pendapatan', 'RAB', 'Realisasi Final', 'Melebihi RAB', 'Laba', 'Margin %', 'Disetujui', 'Tgl Final']].concat(lr.baris.map(function (r) { return [r.trip.Kode, r.trip.Nama, r.trip.Tgl_Berangkat, r.pax, r.pendapatan, r.budget, r.biaya, r.overBudget ? r.lebih : 0, r.laba, r.margin, r.diverifikasiOleh, String(r.tglFinal).slice(0, 10)]; })), lebar: [16, 36, 12, 6, 16, 16, 16, 14, 16, 9, 18, 12] },
            { nama: 'Belum Final', rows: [['Kode', 'Trip', 'Berangkat', 'Status Realisasi', 'Pendapatan', 'Estimasi Biaya', 'Estimasi Laba']].concat(lr.tertunda.map(function (r) { return [r.trip.Kode, r.trip.Nama, r.trip.Tgl_Berangkat, r.statusAudit, r.pendapatan, r.biaya, r.laba]; })), lebar: [16, 36, 12, 20, 16, 16, 16] },
            { nama: 'Per Bulan', rows: [['Bulan', 'Trip', 'Pax', 'Pendapatan', 'Biaya', 'Laba']].concat(lr.perBulan.map(function (m) { return [m.bulan, m.trip, m.pax, m.pendapatan, m.biaya, m.laba]; })), lebar: [10, 6, 6, 16, 16, 16] }
          ]).then(function () { C.aksi('laporan.catat', { jenis: 'laba rugi', periode: d.r.label, format: 'xlsx' }, { diam: true }); UI.toast('Excel laba rugi diunduh.', 'ok'); }).catch(function (e) { UI.toast(e.message, 'err'); }); },
        pdf: function () { var d = data(), lr = d.lr;
          Dok.laporanLabaRugi(lr, d.r.label + (st.trip ? ' · ' + Store.get('Trip', st.trip).Nama : ''))
            .then(function () { C.aksi('laporan.catat', { jenis: 'laba rugi', periode: d.r.label, format: 'pdf' }, { diam: true }); UI.toast('PDF laba rugi diunduh.', 'ok'); }).catch(function (e) { UI.toast(e.message, 'err'); }); }
      });
      el.oninput = C.debounce(function (e) { if (e.target.id === 'lr-q') { st.q = e.target.value; H.tabel(el); } }, 200);
      H.isi(el);
    },
    segarkan: function (el) { H.isi(el); },
    isi: function (el) {
      var d = data(), lr = d.lr, t = lr.total, mob = innerWidth <= 720, kat = lr.kategori;
      var body = el.querySelector('#lr-body');
      var stmt = '<div class="card"><div class="card__head"><div class="card__title"><span class="label">' + esc(Store.S.PT_NAMA) + '</span><h2>Laporan Laba Rugi</h2><p>Periode ' + esc(d.r.label) + '</p></div>' + ic('file-text', 22, 'primary') + '</div><div class="stack" style="gap:0;font-size:14px">' +
        '<div class="between" style="padding:10px 0"><b>Pendapatan penjualan trip</b><b class="num">' + U.rp(t.pendapatan) + '</b></div>' +
        '<div class="label" style="margin:8px 0 4px">Beban pokok perjalanan (HPP)</div>' + Object.keys(kat).sort(function (a, b) { return kat[b] - kat[a]; }).map(function (k) { return '<div class="between" style="padding:7px 0 7px 14px;border-bottom:1px dashed var(--c-border)"><span class="muted">' + esc(k) + '</span><span class="num">(' + U.rp(kat[k]) + ') <small class="soft">' + F.persen(t.pendapatan ? kat[k] / t.pendapatan * 100 : 0) + '</small></span></div>'; }).join('') +
        '<div class="between" style="padding:10px 0"><b>Total beban pokok</b><b class="num">(' + U.rp(t.biaya) + ')</b></div>' +
        '<div class="between" style="padding:14px 16px;margin-top:6px;border-radius:var(--r-md);background:' + (t.laba >= 0 ? 'var(--c-ok-tint)' : 'var(--c-danger-tint)') + '"><b style="font-size:16px">' + (t.laba >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH') + '</b><b class="num ' + (t.laba >= 0 ? 'ok' : 'danger') + '" style="font-size:20px">' + U.rp(t.laba) + '</b></div>' +
        (t.over ? '<div class="note danger" style="margin-top:10px">' + ic('triangle-alert') + '<span>' + t.over + ' trip final melebihi RAB, total kerugian anggaran ' + U.rp(t.lebih) + '.</span></div>' : '') +
        '<small class="soft" style="margin-top:8px">Hanya realisasi final. ' + (lr.totalTertunda.trip ? lr.totalTertunda.trip + ' trip lain belum final (estimasi laba ' + U.rp(lr.totalTertunda.laba) + ') dan belum dihitung.' : 'Semua trip periode ini sudah final.') + '</small></div></div>';
      body.innerHTML = '<div class="bento two-sm stagger">' +
        UI.stat({ hero: true, label: 'Laba bersih (final)', judul: d.r.label, nilai: mob ? U.rpRingkas(t.laba) : U.rp(t.laba), valTitle: U.rp(t.laba), kaki: '<span class="badge glass">Margin ' + F.persen(t.margin) + '</span>' }) +
        UI.stat({ label: 'Pendapatan', ikon: 'trending-up', nilai: mob ? U.rpRingkas(t.pendapatan) : U.rp(t.pendapatan), valTitle: U.rp(t.pendapatan), kaki: '<span>' + t.trip + ' trip · ' + t.pax + ' pax</span>' }) +
        UI.stat({ label: 'Beban pokok (HPP)', ikon: 'trending-down', tone: 'warn', nilai: mob ? U.rpRingkas(t.biaya) : U.rp(t.biaya), valTitle: U.rp(t.biaya), kaki: '<span>' + F.persen(t.pendapatan ? t.biaya / t.pendapatan * 100 : 0) + ' dari pendapatan</span>' }) +
        UI.stat({ label: 'Belum final (tidak dihitung)', ikon: 'hourglass', tone: lr.totalTertunda.trip ? 'warn' : 'ok', nilai: lr.totalTertunda.trip + ' <small>trip</small>', kaki: '<span>Est. laba ' + U.rpRingkas(lr.totalTertunda.laba) + '</span>' + (lr.totalTertunda.menungguAudit ? '<span class="badge warn">' + lr.totalTertunda.menungguAudit + ' diaudit</span>' : ''), go: 'rekap' }) + '</div>' +
        '<div class="grid-12" style="align-items:start"><div class="span-7 span-lg-12"><div class="card lift"><div class="card__head"><div class="card__title"><h2>' + ic('chart-line', 20, 'primary') + 'Tren laba rugi bulanan</h2><p>Pendapatan, biaya, dan laba per bulan keberangkatan</p></div></div>' + Grafik.area(lr.perBulan) + '<div class="legend" style="margin-top:8px"><span><i style="background:var(--c-primary)"></i>Pendapatan</span><span><i style="background:var(--c-primary-soft)"></i>Biaya</span><span><i style="background:var(--c-ok);border-radius:50%"></i>Laba</span></div></div></div><div class="span-5 span-lg-12">' + stmt + '</div></div>' +
        '<div class="card card--pad0"><div class="between wrap" style="padding:16px 20px;gap:12px"><div class="row wrap" style="gap:10px"><h2>Rincian</h2><div class="seg"><button data-act="mode" data-m="trip" class="' + (st.mode === 'trip' ? 'on' : '') + '">Per trip</button><button data-act="mode" data-m="bulan" class="' + (st.mode === 'bulan' ? 'on' : '') + '">Per periode</button></div></div><div class="input-ic">' + ic('search', 18) + '<input class="input" id="lr-q" type="search" placeholder="Cari trip…" value="' + esc(st.q) + '" style="min-height:40px"></div></div><div id="lr-tabel"></div></div>' +
        (lr.tertunda.length ? '<div class="card card--pad0"><div class="card__head" style="padding:16px 20px 0"><div class="card__title"><h2>' + ic('hourglass', 20, 'warn') + 'Belum masuk laporan</h2><p>Menunggu laporan Admin atau audit Finance. Angka di bawah hanya estimasi.</p></div><a class="btn btn--soft btn--sm" href="#/rekap">Buka rekapitulasi</a></div>' +
          UI.tabel({ kelasBaris: function (r) { return r.overBudget ? 'baris-alert' : ''; }, kolom: [{ label: 'Trip', render: function (r) { return '<div class="cell-main">' + Hal.tripFoto(r.trip, 'sm') + '<div class="row__text"><b class="truncate">' + esc(r.trip.Nama) + '</b><span class="sub">' + esc(r.trip.Kode) + ' · ' + U.tglId(r.trip.Tgl_Berangkat) + '</span></div></div>'; } }, { label: 'Status realisasi', render: function (r) { return Realisasi.badgeStatus(r.statusAudit) + (r.overBudget ? '<div style="margin-top:4px">' + Realisasi.tanda(r, true) + '</div>' : ''); } }, { label: 'Pendapatan', num: true, render: function (r) { return F.rpTip(r.pendapatan); } }, { label: 'Est. biaya', num: true, render: function (r) { return F.rpTip(r.biaya) + '<span class="sub">' + (r.adaRealisasi ? 'realisasi sementara' : 'RAB v' + r.versiBudget) + '</span>'; } }, { label: 'Est. laba', num: true, render: function (r) { return '<span class="' + (r.laba < 0 ? 'danger' : 'muted') + '">' + F.rpTip(r.laba) + '</span>'; } }], baris: lr.tertunda }) + '</div>' : '');
      H.tabel(el); Grafik.hidupkan(body);
    },
    tabel: function (el) {
      var lr = data().lr, box = el.querySelector('#lr-tabel'); if (!box) return; var q = st.q.toLowerCase();
      if (st.mode === 'bulan') {
        box.innerHTML = UI.tabel({ kolom: [{ label: 'Bulan', render: function (m) { return '<b>' + U.BULAN[+m.bulan.slice(5, 7) - 1] + ' ' + m.bulan.slice(0, 4) + '</b>'; } }, { label: 'Trip', num: true, key: 'trip' }, { label: 'Pax', num: true, key: 'pax' }, { label: 'Pendapatan', num: true, render: function (m) { return F.rpTip(m.pendapatan); } }, { label: 'Biaya', num: true, render: function (m) { return F.rpTip(m.biaya); } }, { label: 'Laba', num: true, render: function (m) { return '<b class="' + (m.laba >= 0 ? 'ok' : 'danger') + '">' + F.rpTip(m.laba) + '</b>'; } }, { label: 'Margin', num: true, render: function (m) { return F.persen(m.pendapatan ? m.laba / m.pendapatan * 100 : 0); } }], baris: lr.perBulan.filter(function (m) { return !q || (U.BULAN[+m.bulan.slice(5, 7) - 1] + ' ' + m.bulan).toLowerCase().indexOf(q) > -1; }), kosong: 'Tidak ada data periode ini' });
      } else {
        box.innerHTML = UI.tabel({ kolom: [{ label: 'Trip', render: function (r) { return '<div class="cell-main">' + Hal.tripFoto(r.trip, 'sm') + '<div class="row__text"><b class="truncate">' + esc(r.trip.Nama) + '</b><span class="sub">' + esc(r.trip.Kode) + ' · ' + U.tglId(r.trip.Tgl_Berangkat) + '</span></div></div>'; } }, { label: 'Pax', num: true, key: 'pax' }, { label: 'Pendapatan', num: true, render: function (r) { return F.rpTip(r.pendapatan); } }, { label: 'Biaya (realisasi final)', num: true, render: function (r) { return F.rpTip(r.biaya) + '<span class="sub">RAB ' + U.rpRingkas(r.budget) + '</span>'; } }, { label: 'Laba', num: true, render: function (r) { return '<b class="' + (r.laba >= 0 ? 'ok' : 'danger') + '">' + F.rpTip(r.laba) + '</b>'; } }, { label: 'Margin', num: true, render: function (r) { return '<span class="badge ' + (r.margin >= 25 ? 'ok' : r.margin >= 10 ? 'warn' : 'danger') + '">' + F.persen(r.margin) + '</span>'; } }, { label: 'Tanda', render: function (r) { return Realisasi.tanda(r, true) || '<span class="badge ok">' + ic('circle-check', 13) + 'Sesuai RAB</span>'; } }], kelasBaris: function (r) { return r.overBudget || r.laba < 0 ? 'baris-alert' : ''; },
          baris: lr.baris.filter(function (r) { return !q || (r.trip.Nama + ' ' + r.trip.Kode).toLowerCase().indexOf(q) > -1; }), kosong: 'Belum ada trip final pada periode ini', kosongTeks: 'Trip masuk laporan setelah realisasinya disetujui Finance.', kosongIkon: 'chart-line' });
      }
    }
  };
  window.Halaman.labarugi = H;
})();
