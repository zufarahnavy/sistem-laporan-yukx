/* =====================================================================
   YukBanyuwangi — Dashboard
   Ringkasan bulan ini, daftar "perlu tindakan" sesuai peran (Admin:
   kalkulasi/manifest/rekap · Finance: kunci margin/tagihan), trip berjalan
   & mendatang, dan tren penjualan vs pengeluaran 6 bulan.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var IKON = { kalkulasi: 'calculator', manifest: 'clipboard-list', rekap: 'chart-column', kunci: 'lock', tagihan: 'hand-coins' };

  function sapa() { var j = new Date(Date.now() + 7 * 3600e3).getUTCHours(); return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam'; }
  function persen(x) { return (Math.round(x * 1000) / 10).toString().replace('.', ',') + '%'; }
  function banding(a, b) { if (!b) return ''; var p = Math.round((a - b) / b * 100); return '<span class="delta">' + ic(p >= 0 ? 'arrow-up-right' : 'arrow-down-right', 14) + (p > 0 ? '+' : '') + p + '% vs bulan lalu</span>'; }

  var H = window.Halaman.dashboard = {
    render: function (el) {
      var D = Store.D, S = Store.S, today = U.hariIni(), db = HT.dashboard(D, { today: today, S: S }), me = Store.me, fin = Store.isFin(), adm = Store.isAdmin();
      var aksi = db.aksi.filter(function (a) { return a.peran === me.peran; }), lb = U.labelBulan(db.bulan);
      var kpi = fin ? [
        UI.stat({ label: 'Sisa tagihan aktif', nilai: UI.hitung(db.sisaTagihan, 'rp'), hero: true, go: 'tagihan', kaki: '<span>' + db.belumLunas + ' pesanan belum lunas' + (db.telat ? ' · ' + db.telat + ' lewat jatuh tempo' : '') + '</span>' }),
        UI.stat({ label: 'Rekap siap dicek', nilai: UI.hitung(db.siapDicek), ikon: 'lock', tone: db.siapDicek ? 'warn' : 'ok', go: 'rekap', kaki: '<span>menunggu kunci margin</span>' }),
        UI.stat({ label: 'Margin terkunci · ' + lb, nilai: UI.hitung(db.marginBulan.terkunci ? HT.totalRekap(HT.rekapDaftar(D, Object.assign({ S: S, today: today }, HT.rentangPeriode(db.bulan, today))).filter(function (r) { return r.kunci; })).laba : 0, 'rpS'), ikon: 'chart-column', kaki: '<span>' + db.terkunciBulan + ' dari ' + db.marginBulan.n + ' trip dikunci</span>' }),
        UI.stat({ label: 'Penjualan · ' + lb, nilai: UI.hitung(db.penjualan, 'rpS'), ikon: 'trending-up', kaki: banding(db.penjualan, db.penjualanLalu) })
      ] : [
        UI.stat({ label: 'Penjualan · ' + lb, nilai: UI.hitung(db.penjualan, 'rp'), hero: true, go: 'rekap', kaki: '<span>' + db.pesanan + ' pesanan · ' + db.pax + ' pax</span>' + banding(db.penjualan, db.penjualanLalu) }),
        UI.stat({ label: 'Pax bulan ini', nilai: UI.hitung(db.pax), ikon: 'users', go: Store.boleh('report') ? 'report' : 'pesanan', kaki: banding(db.pax, db.paxLalu) || '<span>' + db.pesanan + ' pesanan</span>' }),
        UI.stat({ label: 'Pesanan masuk 30 hari', nilai: UI.hitung(db.pesananBaru), ikon: 'inbox', go: 'pesanan', kaki: '<span>dari kolom TANGGAL PESAN</span>' }),
        UI.stat({ label: 'Estimasi margin · ' + lb, nilai: UI.hitung(db.marginBulan.laba, 'rpS'), ikon: 'chart-column', tone: db.marginBulan.laba < 0 ? 'danger' : 'ok', go: 'rekap', kaki: '<span>' + persen(db.marginBulan.margin) + ' · ' + db.terkunciBulan + '/' + db.marginBulan.n + ' terkunci</span>' })
      ];
      el.innerHTML = '<div class="sapa"><div><h1>' + sapa() + ', ' + esc(String(me.nama).split(' ')[0]) + '</h1><p class="muted">' + esc(U.tglPanjang(today)) + ' · ' + (db.berjalan.length ? db.berjalan.length + ' trip sedang berjalan' : 'tidak ada trip berjalan hari ini') + '</p></div>' +
        (adm ? '<div class="toolbar"><a class="btn btn--ghost" href="#/pesanan">' + ic('table-2', 18) + '<span>Data pemesanan</span></a><a class="btn btn--primary" href="#/pesanan?baru=1">' + ic('plus', 18) + '<span>Tambah pesanan</span></a></div>' : '<div class="toolbar"><a class="btn btn--ghost" href="#/labarugi">' + ic('trending-up', 18) + '<span>Laba rugi</span></a><a class="btn btn--primary" href="#/tagihan">' + ic('hand-coins', 18) + '<span>Tagihan</span></a></div>') + '</div>' +
        (Store.info.sumberOk === false && !C.DEMO ? '<div class="note danger" style="margin-bottom:16px">' + ic('circle-alert') + '<span><b>Database Pemesanan tidak bisa dibaca.</b> ' + esc(Store.info.sumberPesan || '') + (adm ? ' <a href="#/pengaturan/sumber">Periksa Sumber Data</a>' : '') + '</span></div>' : '') +
        '<div class="bento two-sm" style="margin-bottom:16px">' + kpi.join('') + '</div>' +
        '<div class="grid-12" style="align-items:start">' +
        '<section class="card span-5 span-lg-12"><div class="card__head"><div class="card__title"><h2>Perlu tindakan</h2><p>' + (fin ? 'Kunci margin & tagihan jatuh tempo' : 'Kalkulasi, manifest & rekap yang menunggu') + '</p></div><span class="badge ' + (aksi.length ? 'warn' : 'ok') + '">' + aksi.length + '</span></div>' +
        (aksi.length ? '<div class="stack" style="gap:4px">' + aksi.slice(0, 8).map(function (a) {
          var nama = a.i.p ? a.i.p.Nama : a.r ? a.r.p.Nama : a.t ? a.t.p.Nama : '';
          return '<a class="tindakan" href="#/' + esc(a.go) + '"><span class="ic-box ' + (a.jenis === 'tagihan' && a.h < 0 ? 'danger' : 'warn') + '">' + ic(IKON[a.jenis] || 'circle-alert', 19) + '</span><span class="row__text"><b class="truncate">' + esc(nama) + '</b><small class="muted truncate">' + esc(a.label) + '</small></span><span class="tindakan__h">' + (a.jenis === 'tagihan' ? (a.h < 0 ? 'lewat ' + (-a.h) + 'h' : 'H-' + a.h) : a.jenis === 'rekap' ? 'selesai' : a.jenis === 'kunci' ? '' : a.h === 0 ? 'hari ini' : 'H-' + a.h) + '</span></a>';
        }).join('') + (aksi.length > 8 ? '<button class="btn btn--plain btn--sm" data-act="semuaAksi">' + ic('chevrons-down', 16) + 'Lihat ' + (aksi.length - 8) + ' lainnya</button>' : '') + '</div>' : UI.kosong('circle-check', 'Semua beres', fin ? 'Tidak ada rekap yang menunggu & tagihan aman.' : 'Kalkulasi & manifest trip dekat sudah siap.')) + '</section>' +
        '<section class="card span-7 span-lg-12"><div class="card__head"><div class="card__title"><h2>Trip berjalan & mendatang</h2><p>Urut tanggal trip · alur: kalkulasi · manifest · rekap</p></div><a class="btn btn--plain btn--sm" href="#/kalender">' + ic('calendar-days', 16) + 'Kalender</a></div>' +
        (db.mendatang.length ? '<div class="stack" style="gap:2px">' + db.mendatang.map(function (i) {
          var ix = HT.indeks(D), k = ix.kal[i.id], m = ix.mnf[i.id], h = U.selisihHari(today, i.mulai);
          return '<a class="trip-baris" href="#/' + (adm ? 'manifest/' : 'pesanan/') + i.id + '"><span class="psn-baris__tgl"><b>' + Number(i.mulai.slice(8, 10)) + '</b><small>' + U.BLN[+i.mulai.slice(5, 7) - 1] + '</small></span><span class="row__text"><b class="truncate">' + esc(i.p.Nama) + '</b><small class="muted truncate">' + esc(i.p.Trip) + ' · ' + i.pax + ' pax</small></span>' +
            '<span class="alur-mini" title="Kalkulasi · Manifest"><i class="' + (k ? 'ok' : '') + '"></i><i class="' + (m && m.Status === 'Terbit' ? 'ok' : m && m.Status === 'Berubah' ? 'bad' : m ? 'half' : '') + '"></i></span>' + (i.status === 'Berjalan' ? UI.badge('Berjalan', 'solid', 'activity') : '<span class="tindakan__h">' + (h === 0 ? 'hari ini' : 'H-' + h) + '</span>') + '</a>';
        }).join('') + '</div>' : UI.kosong('calendar', 'Belum ada trip mendatang', adm ? 'Tambahkan pesanan atau isi Database Pemesanan.' : '')) + '</section>' +
        '<section class="card span-8 span-lg-12"><div class="card__head"><div class="card__title"><h2>Penjualan vs pengeluaran</h2><p>6 bulan terakhir · draft & terkunci</p></div><a class="btn btn--plain btn--sm" href="#/rekap">' + ic('chart-column', 16) + 'Rekap</a></div>' +
        Grafik.kapsul(db.tren, { la: 'Penjualan', lb: 'Pengeluaran', aria: 'Penjualan dan pengeluaran 6 bulan' }) + '<div class="legend" style="margin-top:8px"><span><i style="background:var(--c-primary)"></i>Penjualan</span><span><i class="hatch" style="background-color:var(--c-primary-tint)"></i>Pengeluaran</span></div></section>' +
        '<section class="card span-4 span-lg-12"><div class="card__head"><div class="card__title"><h2>' + (db.rugi.length ? 'Trip rugi (90 hari)' : 'Kesehatan margin') + '</h2><p>' + (db.rugi.length ? 'Pengeluaran melebihi penjualan' : 'Tidak ada trip rugi 90 hari terakhir') + '</p></div></div>' +
        (db.rugi.length ? db.rugi.slice(0, 5).map(function (r) { return '<a class="tindakan" href="#/rekap?bulan=' + r.inf.bulan + '&id=' + r.id + '"><span class="ic-box danger">' + ic('trending-down', 19) + '</span><span class="row__text"><b class="truncate">' + esc(r.p.Nama) + '</b><small class="muted">' + esc(r.inf.jadwal) + ' · ' + (r.kunci ? 'terkunci' : 'draft') + '</small></span><b class="num danger">' + U.rpRingkas(r.laba) + '</b></a>'; }).join('') :
          Grafik.gauge(Math.max(0, Math.min(100, Math.round(db.marginBulan.margin * 100))), 'Margin ' + lb)) + '</section></div>';
      Hal.aksiPeta(el, { semuaAksi: function () { App.lonceng(document.getElementById('btn-lonceng')); } });
    },
    segarkan: function (el) { var y = scrollY; H.render(el); window.scrollTo(0, y); UI.pasTeks(el); }
  };
})();
