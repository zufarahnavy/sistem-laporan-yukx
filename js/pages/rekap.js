/* YukX — Halaman Rekapitulasi Operasional: pendapatan vs RAB vs realisasi per trip, status laporan realisasi & audit Finance */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { per: 'semua', trip: '', tab: 'semua', q: '' }, drw = null;
  var IKON_TRIP = function (t) { var n = (t.Nama + ' ' + t.Tujuan).toLowerCase(); return /bromo|dieng/.test(n) ? 'mountain' : /raja|derawan|karimun/.test(n) ? 'waves' : /belitung/.test(n) ? 'tree-palm' : 'sailboat'; };

  function data() {
    var today = U.hariIni(), per = HT.rentangPeriode(st.per, today);
    return HT.labaRugi(Store.D, { dari: per.dari, sampai: per.sampai, idTrip: st.trip, today: today, semua: true });
  }
  function nota(idTrip) {
    if (drw && !drw.ditutup) drw.tutup();
    var t = Store.get('Trip', idTrip);
    drw = UI.drawer({ kepala: '<div class="row">' + Hal.tripFoto(t) + '<div class="row__text"><span class="label">RAB & realisasi anggaran</span><h2 class="truncate">' + esc(t.Nama) + '</h2><small class="muted">' + esc(t.Kode) + ' · ' + F.rentang(t.Tgl_Berangkat, t.Tgl_Pulang) + '</small></div><button class="icon-btn" data-tutup aria-label="Tutup">' + ic('x') + '</button></div>',
      isi: Realisasi.panel(idTrip), kaki: '<button class="btn btn--ghost" data-tutup>Tutup</button><a class="btn btn--primary" href="#/budget/' + idTrip + '?tab=realisasi">' + ic('calculator', 18) + 'Buka di Kalkulasi Budget</a>' });
    drw.segar = function () { drw.el.querySelector('.drawer__body').innerHTML = Realisasi.panel(idTrip); };
    Realisasi.pasang(drw.el, function () { return idTrip; });
  }
  function tindakanSaya(r) {
    if (Store.isFin()) return r.statusAudit === 'Diajukan';
    return r.perluLapor;
  }

  var H = {
    judul: 'Rekapitulasi',
    render: function (el) {
      el.innerHTML = Hal.kepala({ crumbs: ['Finance & admin', 'Rekapitulasi operasional'], judul: 'Rekapitulasi Operasional', sub: 'Pendapatan vs RAB vs realisasi per trip. Admin melaporkan realisasi setelah trip selesai, Finance mengaudit — hanya yang final masuk laba rugi.',
        aksi: '<select class="select" id="rk-per" style="width:auto" aria-label="Periode"><option value="semua">Semua waktu</option><option value="bulan">Bulan ini</option><option value="bulan-lalu">Bulan lalu</option><option value="kuartal">Kuartal ini</option><option value="tahun">Tahun ini</option></select>' + Hal.pilihTrip('rk-trip', st.trip, 'Semua trip') +
          '<button class="btn btn--ghost" data-act="xls">' + ic('file-spreadsheet', 18, 'ok') + '<span class="hide-sm">Excel</span></button><button class="btn btn--primary" data-act="pdf">' + ic('file-down', 18) + '<span class="hide-sm">Ekspor PDF</span></button>' }) + '<div id="rk-body" class="stack" style="gap:16px"></div>';
      el.querySelector('#rk-per').value = st.per;
      el.querySelector('#rk-per').onchange = function (e) { st.per = e.target.value; H.isi(el); };
      el.querySelector('#rk-trip').onchange = function (e) { st.trip = e.target.value; H.isi(el); };
      Hal.aksiPeta(el, {
        tab: function (d) { st.tab = d.t; H.isi(el); }, nota: function (d) { nota(d.id); },
        xls: function () { var lr = data(); Dok.excel('Rekap Operasional ' + U.hariIni(), [{ nama: 'Rekap', rows: [['Kode', 'Trip', 'Berangkat', 'Pax', 'Pendapatan', 'Kas Masuk', 'RAB Aktif', 'Versi', 'Realisasi', 'Selisih RAB', 'Melebihi RAB', 'Laba', 'Margin %', 'Status Realisasi']].concat(lr.baris.map(function (r) { return [r.trip.Kode, r.trip.Nama, r.trip.Tgl_Berangkat, r.pax, r.pendapatan, r.kasMasuk, r.budget, r.versiBudget, r.realisasi, r.selisih, r.overBudget ? r.lebih : 0, r.laba, r.margin, r.statusAudit]; })).concat([['TOTAL', '', '', lr.total.pax, lr.total.pendapatan, lr.total.kas, U.jumlah(lr.baris, function (r) { return r.budget; }), '', U.jumlah(lr.baris, function (r) { return r.realisasi; }), '', lr.total.lebih, lr.total.laba, lr.total.margin, '']]), lebar: [16, 36, 12, 6, 16, 16, 16, 6, 16, 14, 14, 16, 9, 18] }]).then(function () { C.aksi('laporan.catat', { jenis: 'rekap', periode: st.per, format: 'xlsx' }, { diam: true }); }).catch(function (e) { UI.toast(e.message, 'err'); }); },
        pdf: function () { var per = HT.rentangPeriode(st.per, U.hariIni()); Dok.laporanRekap(data(), per.label + (st.trip ? ' · ' + Store.get('Trip', st.trip).Nama : '')).then(function () { C.aksi('laporan.catat', { jenis: 'rekap', periode: per.label, format: 'pdf' }, { diam: true }); }).catch(function (e) { UI.toast(e.message, 'err'); }); }
      });
      H.isi(el, true);
    },
    segarkan: function (el) { H.isi(el); if (drw && !drw.ditutup) drw.segar(); },
    isi: function (el) {
      var lr = data(), mob = innerWidth <= 720, fin = Store.isFin(), semua = lr.baris;
      var final = semua.filter(function (r) { return r.final; }), lrF = { pendapatan: U.jumlah(final, function (r) { return r.pendapatan; }), laba: U.jumlah(final, function (r) { return r.laba; }) };
      var adaRls = semua.filter(function (r) { return r.adaRealisasi; }), budAktif = U.jumlah(adaRls, function (r) { return r.budget; }), rls = U.jumlah(adaRls, function (r) { return r.realisasi; }), hemat = budAktif - rls;
      var over = semua.filter(function (r) { return r.overBudget; }), diaudit = semua.filter(function (r) { return r.statusAudit === 'Diajukan'; }), perluLapor = semua.filter(function (r) { return r.perluLapor; });
      var ik = {}; Store.D.Kategori_Biaya.forEach(function (k) { ik[k.Nama] = k.Ikon; });
      var body = el.querySelector('#rk-body');
      var q = st.q.toLowerCase(), baris = semua.filter(function (r) {
        if (st.tab === 'tindakan' && !tindakanSaya(r)) return false;
        if (st.tab === 'final' && !r.final) return false;
        if (st.tab === 'over' && !r.overBudget && !r.rugi) return false;
        return !q || (r.trip.Nama + ' ' + r.trip.Kode).toLowerCase().indexOf(q) > -1;
      });
      var nTindakan = semua.filter(tindakanSaya).length;
      body.innerHTML =
        (nTindakan ? '<div class="note ' + (fin ? 'warn' : '') + '">' + ic(fin ? 'shield-check' : 'send') + '<span>' + (fin ? '<b>' + diaudit.length + ' laporan realisasi</b> menunggu audit Anda.' : '<b>' + perluLapor.length + ' trip selesai</b> belum dilaporkan realisasinya ke Finance.') + '</span><button class="btn btn--soft btn--sm" data-act="tab" data-t="tindakan">Lihat</button></div>' : '') +
        (over.length ? '<div class="note danger">' + ic('triangle-alert') + '<span><b>' + over.length + ' trip melebihi RAB</b> — total kelebihan ' + U.rp(U.jumlah(over, function (r) { return r.lebih; })) + ': ' + over.map(function (r) { return esc(r.trip.Kode) + ' (+' + U.rpRingkas(r.lebih) + ')'; }).join(', ') + '.</span><button class="btn btn--soft btn--sm" data-act="tab" data-t="over">Lihat</button></div>' : '') +
        '<div class="bento two-sm stagger">' +
        UI.stat({ hero: true, label: 'Laba final (diaudit Finance)', nilai: mob ? U.rpRingkas(lrF.laba) : U.rp(lrF.laba), valTitle: U.rp(lrF.laba), kaki: '<span class="badge glass">' + final.length + ' trip final</span><span>Estimasi semua trip ' + U.rpRingkas(lr.total.laba) + '</span>', go: 'labarugi' }) +
        UI.stat({ label: 'Total pendapatan (omset)', ikon: 'wallet', nilai: mob ? U.rpRingkas(lr.total.pendapatan) : U.rp(lr.total.pendapatan), valTitle: U.rp(lr.total.pendapatan), kaki: '<div class="progress grow"><i style="width:' + (lr.total.pendapatan ? lr.total.kas / lr.total.pendapatan * 100 : 0) + '%"></i></div><span>' + Math.round(lr.total.pendapatan ? lr.total.kas / lr.total.pendapatan * 100 : 0) + '% kas masuk</span>' }) +
        UI.stat({ label: 'Realisasi vs RAB (trip berrealisasi)', ikon: 'receipt', tone: hemat < 0 ? 'danger' : '', nilai: mob ? U.rpRingkas(rls) : U.rp(rls), valTitle: U.rp(rls), kaki: '<span>RAB ' + U.rpRingkas(budAktif) + '</span><span class="badge ' + (hemat >= 0 ? 'ok' : 'danger') + '">' + ic(hemat >= 0 ? 'piggy-bank' : 'triangle-alert', 14) + (hemat >= 0 ? 'Hemat ' : 'Lebih ') + F.persen(budAktif ? Math.abs(hemat) / budAktif * 100 : 0) + '</span>' }) +
        UI.stat({ label: 'Status laporan realisasi', ikon: 'badge-check', tone: diaudit.length || perluLapor.length ? 'warn' : 'ok', nilai: final.length + ' / ' + adaRls.length + ' <small>final</small>', kaki: '<span class="badge warn">' + diaudit.length + ' diaudit</span><span class="badge ' + (perluLapor.length ? 'danger' : 'neutral') + '">' + perluLapor.length + ' belum lapor</span>' }) + '</div>' +
        '<div class="grid-12"><div class="span-7 span-lg-12"><div class="card lift"><div class="card__head"><div class="card__title"><h2>' + ic('chart-column', 20, 'primary') + 'Pendapatan, biaya & laba per trip</h2><p>Biaya memakai realisasi bila ada, selain itu RAB (bermotif). Titik merah = laba negatif.</p></div><span class="badge neutral">Juta Rp</span></div>' + (semua.length ? Grafik.trip(semua) : UI.kosong('chart-column', 'Tidak ada trip pada periode ini')) +
        '<div class="legend" style="margin-top:8px"><span><i style="background:var(--c-primary)"></i>Pendapatan</span><span><i style="background:var(--c-primary-soft)"></i>Realisasi</span><span><i class="hatch"></i>RAB (belum realisasi)</span><span><i style="background:var(--c-ok);border-radius:50%"></i>Laba</span></div></div></div>' +
        '<div class="span-5 span-lg-12"><div class="card lift"><div class="card__head"><div class="card__title"><h2>' + ic('chart-pie', 20, 'primary') + 'Proporsi biaya operasional</h2><p>Total ' + U.rp(lr.total.biaya) + '</p></div></div>' + (Object.keys(lr.kategori).length ? Grafik.proporsi(lr.kategori, ik) : UI.kosong('chart-pie', 'Belum ada biaya')) + '</div></div></div>' +
        '<div class="card card--pad0"><div class="between wrap" style="padding:16px 20px;gap:12px"><div class="row wrap" style="gap:10px"><h2>Rincian rekapitulasi trip</h2><div class="seg">' + [['semua', 'Semua (' + semua.length + ')'], ['tindakan', (fin ? 'Perlu diaudit' : 'Perlu dilaporkan') + ' (' + nTindakan + ')'], ['final', 'Final (' + final.length + ')'], ['over', 'Melebihi RAB (' + over.length + ')']].map(function (x) { return '<button data-act="tab" data-t="' + x[0] + '" class="' + (st.tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div><div class="input-ic">' + ic('search', 18) + '<input class="input" id="rk-q" type="search" placeholder="Filter kode atau trip…" value="' + esc(st.q) + '" style="min-height:40px" aria-label="Cari trip"></div></div>' +
        UI.tabel({ kelasBaris: function (r) { return r.overBudget || r.rugi ? 'baris-alert' : ''; }, kolom: [
          { label: 'Kode & nama trip', render: function (r) { return '<div class="cell-main"><span class="ic-box ' + (r.status === 'Selesai' ? '' : 'warn') + '" style="width:40px;height:40px">' + ic(IKON_TRIP(r.trip), 20) + '</span><div class="row__text"><b class="truncate">' + esc(r.trip.Nama) + '</b><span class="sub">' + esc(r.trip.Kode) + ' · ' + F.rentang(r.trip.Tgl_Berangkat, r.trip.Tgl_Pulang) + ' · ' + r.pax + ' pax</span></div></div>'; } },
          { label: 'Pendapatan', num: true, render: function (r) { return '<b>' + F.rpTip(r.pendapatan) + '</b>'; } },
          { label: 'RAB aktif', num: true, render: function (r) { return F.rpTip(r.budget) + '<span class="sub ' + (r.budgetDraft ? 'warn' : '') + '">' + (r.budgetDraft ? '(' + r.budgetStatus + ' v' + r.versiBudget + ')' : r.versiBudget ? '(v' + r.versiBudget + ' disetujui)' : '—') + '</span>'; } },
          { label: 'Realisasi', num: true, render: function (r) { return r.adaRealisasi ? '<b>' + F.rpTip(r.realisasi) + '</b><span class="sub">' + r.nota + ' nota' + (r.notaDitolak ? ' · ' + r.notaDitolak + ' ditolak' : '') + '</span>' : '<span class="muted">—</span>'; } },
          { label: 'Selisih RAB', num: true, render: function (r) { return r.adaRealisasi ? (r.overBudget ? '<span class="badge danger">' + ic('triangle-alert', 13) + '+' + U.rpRingkas(r.lebih) + ' (' + F.persen(r.lebihPersen) + ')</span>' : '<span class="badge ok">' + ic('arrow-down-right', 13) + 'Hemat ' + U.rpRingkas(r.selisih) + '</span>') : '<span class="badge neutral">' + ic('hourglass', 13) + 'Estimasi</span>'; } },
          { label: 'Laba & margin', num: true, render: function (r) { return '<b class="' + (r.laba < 0 ? 'danger' : 'primary') + '">' + F.rpTip(r.laba) + '</b><span class="sub ' + (r.margin >= 25 ? 'ok' : r.margin < 0 ? 'danger' : '') + '">Margin ' + F.persen(r.margin) + (r.final ? ' · final' : ' · est.') + '</span>'; } },
          { label: 'Status realisasi', render: function (r) { return Realisasi.badgeStatus(r.statusAudit) + (r.rugi ? '<div style="margin-top:4px"><span class="badge solid-danger">' + ic('trending-down', 13) + 'Rugi</span></div>' : ''); } },
          { label: 'Aksi', mlabel: '', render: function (r) { var t = tindakanSaya(r); return '<button class="btn ' + (t ? 'btn--primary' : 'btn--soft') + ' btn--sm" data-act="nota" data-id="' + r.ID_Trip + '">' + (t ? (fin ? 'Audit' : 'Laporkan') : 'RAB & nota') + '</button>'; } }
        ], baris: baris, kosong: st.tab === 'tindakan' ? 'Tidak ada yang perlu ditindaklanjuti' : 'Tidak ada trip', kosongIkon: 'chart-column',
          foot: baris.length ? '<tfoot><tr><td data-label="">' + ic('sigma', 18, 'primary') + ' TOTAL</td><td class="num" data-label="Pendapatan">' + U.rp(U.jumlah(baris, function (r) { return r.pendapatan; })) + '</td><td class="num" data-label="RAB">' + U.rp(U.jumlah(baris, function (r) { return r.budget; })) + '</td><td class="num" data-label="Realisasi">' + U.rp(U.jumlah(baris, function (r) { return r.realisasi; })) + '</td><td class="num" data-label="Melebihi RAB">' + U.rp(U.jumlah(baris, function (r) { return r.lebih; })) + '</td><td class="num" data-label="Laba" style="color:var(--c-primary)">' + U.rp(U.jumlah(baris, function (r) { return r.laba; })) + '</td><td colspan="2" data-label="">' + baris.length + ' trip</td></tr></tfoot>' : '' }) + '</div>';
      var qi = body.querySelector('#rk-q'); qi.addEventListener('input', C.debounce(function () { st.q = qi.value; H.isi(el); var n = el.querySelector('#rk-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
      Grafik.hidupkan(body);
    }
  };
  window.Halaman.rekap = H;
})();
