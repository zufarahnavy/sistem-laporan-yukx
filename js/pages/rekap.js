/* YukX — Halaman Rekapitulasi Operasional (pendapatan vs budget aktif vs realisasi + audit Finance) */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { per: 'semua', trip: '', tab: 'semua', q: '' }, drw = null;
  var IKON_TRIP = function (t) { var n = (t.Nama + ' ' + t.Tujuan).toLowerCase(); return /bromo|dieng/.test(n) ? 'mountain' : /raja|derawan|karimun/.test(n) ? 'waves' : /belitung/.test(n) ? 'tree-palm' : 'sailboat'; };

  function data() {
    var today = U.hariIni(), per = HT.rentangPeriode(st.per, today);
    return HT.labaRugi(Store.D, { dari: per.dari, sampai: per.sampai, idTrip: st.trip, today: today });
  }
  function formRealisasi(idTrip, r) {
    r = r || {}; var kat = Store.D.Kategori_Biaya.filter(function (k) { return k.Aktif !== 'TIDAK'; }).map(function (k) { return k.Nama; });
    var trips = U.urutkan(Store.D.Trip.filter(function (t) { return t.Status !== 'Batal'; }), function (t) { return t.Tgl_Berangkat; }, true).map(function (t) { return { v: t.ID_Trip, l: t.Nama + ' · ' + U.tglId(t.Tgl_Berangkat) }; });
    var h = UI.modal({ judul: r.ID_Realisasi ? 'Ubah realisasi biaya' : 'Input realisasi biaya', sub: 'Realisasi menggantikan budget dalam perhitungan laba. Rekap dihitung ulang otomatis.', ukuran: 'md',
      isi: UI.form([{ name: 'ID_Trip', label: 'Trip', type: 'select', opsi: trips, full: true, wajib: true }, { name: 'Kategori', label: 'Kategori', type: 'select', opsi: kat }, { name: 'Tanggal', label: 'Tanggal nota', type: 'date', nilai: U.hariIni() }, { name: 'Uraian', label: 'Uraian', wajib: true, full: true, ph: 'contoh: Pelunasan sewa kapal' }, { name: 'Nominal', label: 'Nominal', type: 'rupiah', wajib: true, full: true }, { name: 'Catatan', label: 'Catatan', full: true }], Object.assign({ ID_Trip: idTrip }, r)),
      aksi: [{ label: 'Batal' }, { label: 'Simpan realisasi', kelas: 'btn--primary', ikon: 'save', klik: async function (hh, b) { if (!UI.cekWajib(hh.body)) return false; var v = UI.bacaForm(hh.body); v.ID_Realisasi = r.ID_Realisasi || ''; var res = await C.aksi('realisasi.simpan', v, { btn: b }); return res.success; } }] });
    UI.siapkanForm(h.body);
  }
  function nota(idTrip) {
    if (drw && !drw.ditutup) drw.tutup();
    function isi() {
      var t = Store.get('Trip', idTrip), ix = HT.indeks(Store.D), r = HT.rekapTrip(Store.D, ix, t, U.hariIni()), fin = Store.isFin();
      var ba = HT.budgetAktif(ix, idTrip) || HT.budgetTerbaru(ix, idTrip), bud = {}, rls = {};
      if (ba) (ix.itemPerBgt[ba.ID_Budget] || []).forEach(function (i) { bud[i.Kategori] = (bud[i.Kategori] || 0) + i.Subtotal; });
      var list = U.urutkan(ix.rlsPerTrip[idTrip] || [], function (x) { return x.Tanggal; }, true); list.forEach(function (x) { rls[x.Kategori] = (rls[x.Kategori] || 0) + x.Nominal; });
      var kats = Object.keys(Object.assign({}, bud, rls));
      return '<div class="card card--tight stack"><div class="between"><span class="label">Status audit</span>' + UI.badge(r.statusAudit) + '</div>' + (r.diverifikasiOleh ? '<small class="muted">Oleh ' + esc(r.diverifikasiOleh) + ' · ' + F.waktu(r.tglVerifikasi) + '</small>' : '') + (r.catatanAudit ? '<div class="quote">' + esc(r.catatanAudit) + '</div>' : '') +
        (fin ? '<div class="row wrap" style="gap:6px"><button class="btn btn--ok btn--sm" data-x="audit" data-s="Terverifikasi">' + ic('badge-check', 16) + 'Tandai terverifikasi</button><button class="btn btn--danger-ghost btn--sm" data-x="audit" data-s="Perlu Revisi">Perlu revisi</button><button class="btn btn--soft btn--sm" data-x="tambah">' + ic('plus', 16) + 'Input realisasi</button></div>' : '') + '</div>' +
        '<div class="card card--tight"><span class="label">Budget aktif v' + r.versiBudget + ' vs realisasi</span>' + UI.tabel({ tanpaMain: true, kolom: [{ label: 'Kategori', key: 'k' }, { label: 'Budget', num: true, render: function (x) { return U.rpRingkas(x.b); } }, { label: 'Realisasi', num: true, render: function (x) { return U.rpRingkas(x.r); } }, { label: 'Selisih', num: true, render: function (x) { var d = x.b - x.r; return x.r ? '<b class="' + (d >= 0 ? 'ok' : 'danger') + '">' + (d >= 0 ? '+' : '') + U.rpRingkas(d) + '</b>' : '<span class="muted">—</span>'; } }], baris: kats.map(function (k) { return { k: k, b: bud[k] || 0, r: rls[k] || 0 }; }) }) + '</div>' +
        '<div class="card card--tight"><span class="label">Nota realisasi (' + list.length + ')</span><div class="stack" style="margin-top:10px;gap:6px">' + (list.map(function (x) { return '<div class="between" style="padding:8px 0;border-bottom:1px solid var(--c-border)"><div class="row__text"><b class="truncate" style="display:block">' + esc(x.Uraian) + '</b><small class="muted">' + esc(x.Kategori) + ' · ' + U.tglId(x.Tanggal) + ' · ' + esc(x.Diinput_Oleh) + '</small></div><b class="num">' + U.rp(x.Nominal) + '</b>' + (fin ? '<button class="btn btn--plain btn--sm btn--icon" data-x="edit" data-id="' + x.ID_Realisasi + '" aria-label="Ubah">' + ic('pencil', 15) + '</button><button class="btn btn--plain btn--sm btn--icon" data-x="hapus" data-id="' + x.ID_Realisasi + '" aria-label="Hapus">' + ic('trash-2', 15) + '</button>' : '') + '</div>'; }).join('') || '<small class="muted">Belum ada nota realisasi.</small>') + '</div></div>';
    }
    var t = Store.get('Trip', idTrip);
    drw = UI.drawer({ kepala: '<div class="row">' + Hal.tripFoto(t) + '<div class="row__text"><span class="label">RAB & nota realisasi</span><h2 class="truncate">' + esc(t.Nama) + '</h2><small class="muted">' + esc(t.Kode) + ' · ' + F.rentang(t.Tgl_Berangkat, t.Tgl_Pulang) + '</small></div><button class="icon-btn" data-tutup aria-label="Tutup">' + ic('x') + '</button></div>', isi: isi(), kaki: '<button class="btn btn--ghost" data-tutup>Tutup</button><a class="btn btn--primary" href="#/budget/' + idTrip + '">' + ic('calculator', 18) + 'Buka budget</a>' });
    drw.segar = function () { drw.el.querySelector('.drawer__body').innerHTML = isi(); };
    drw.el.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'tambah') formRealisasi(idTrip);
      if (b.dataset.x === 'edit') formRealisasi(idTrip, Store.get('Realisasi_Biaya', b.dataset.id));
      if (b.dataset.x === 'hapus') { if (await UI.konfirmasi({ judul: 'Hapus nota ini?', ok: 'Hapus', bahaya: true })) C.aksi('realisasi.hapus', { id: b.dataset.id }); }
      if (b.dataset.x === 'audit') { var ct = await UI.konfirmasi({ judul: 'Status audit: ' + b.dataset.s, teks: b.dataset.s === 'Terverifikasi' ? 'Realisasi dinyatakan sesuai nota. Bila nota berubah, status otomatis kembali "Perlu Audit Ulang".' : 'Admin/Finance perlu memperbaiki nota.', input: { label: 'Catatan audit', wajib: b.dataset.s !== 'Terverifikasi' }, ok: 'Simpan status' }); if (ct !== false) C.aksi('rekap.audit', { ID_Trip: idTrip, status: b.dataset.s, catatan: ct === true ? '' : ct }, { btn: b }); }
    });
  }

  var H = {
    judul: 'Rekapitulasi',
    render: function (el) {
      var fin = Store.isFin();
      el.innerHTML = Hal.kepala({ crumbs: ['Finance & admin', 'Rekapitulasi operasional'], judul: 'Rekapitulasi Operasional', sub: 'Pendapatan vs budget aktif vs realisasi per trip — selisih, laba, margin, dan audit nota oleh Finance. Dihitung ulang otomatis saat budget direvisi.',
        aksi: '<select class="select" id="rk-per" style="width:auto"><option value="semua">Semua waktu</option><option value="bulan">Bulan ini</option><option value="bulan-lalu">Bulan lalu</option><option value="kuartal">Kuartal ini</option><option value="tahun">Tahun ini</option></select>' + Hal.pilihTrip('rk-trip', st.trip, 'Semua trip') +
          '<button class="btn btn--ghost" data-act="xls">' + ic('file-spreadsheet', 18, 'ok') + '<span class="hide-sm">Excel</span></button><button class="btn btn--primary" data-act="pdf">' + ic('file-down', 18) + '<span class="hide-sm">Ekspor PDF</span></button>' }) + '<div id="rk-body" class="stack" style="gap:16px"></div>';
      el.querySelector('#rk-per').value = st.per;
      el.querySelector('#rk-per').onchange = function (e) { st.per = e.target.value; H.isi(el); };
      el.querySelector('#rk-trip').onchange = function (e) { st.trip = e.target.value; H.isi(el); };
      Hal.aksiPeta(el, {
        tab: function (d) { st.tab = d.t; H.isi(el); }, nota: function (d) { nota(d.id); }, realisasi: function () { formRealisasi(st.trip || ''); },
        xls: function () { var lr = data(); Dok.excel('Rekap Operasional ' + U.hariIni(), [{ nama: 'Rekap', rows: [['Kode', 'Trip', 'Tanggal', 'Pax', 'Pendapatan', 'Kas Masuk', 'Budget Aktif', 'Versi', 'Realisasi', 'Selisih', 'Laba', 'Margin %', 'Status Audit']].concat(lr.baris.map(function (r) { return [r.trip.Kode, r.trip.Nama, r.trip.Tgl_Berangkat, r.pax, r.pendapatan, r.kasMasuk, r.budget, r.versiBudget, r.realisasi, r.selisih, r.laba, r.margin, r.statusAudit]; })).concat([['TOTAL', '', '', lr.total.pax, lr.total.pendapatan, lr.total.kas, U.jumlah(lr.baris, function (r) { return r.budget; }), '', U.jumlah(lr.baris, function (r) { return r.realisasi; }), '', lr.total.laba, lr.total.margin, '']]), lebar: [16, 36, 12, 6, 16, 16, 16, 6, 16, 14, 16, 9, 18] }]).then(function () { C.aksi('laporan.catat', { jenis: 'rekap', periode: st.per, format: 'xlsx' }, { diam: true }); }).catch(function (e) { UI.toast(e.message, 'err'); }); },
        pdf: function () { var lr = data(), per = HT.rentangPeriode(st.per, U.hariIni()); Dok.pdfTabel('Rekap Operasional ' + U.hariIni(), 'Rekapitulasi Operasional', per.label + (st.trip ? ' · ' + Store.get('Trip', st.trip).Nama : ''), ['Trip', 'Pax', 'Pendapatan', 'Budget aktif', 'Realisasi', 'Selisih', 'Laba', 'Margin', 'Audit'], lr.baris.map(function (r) { return [r.trip.Nama + '\n' + r.trip.Kode, r.pax, U.rp(r.pendapatan), U.rp(r.budget) + ' (v' + r.versiBudget + ')', U.rp(r.realisasi), U.rp(r.selisih), U.rp(r.laba), r.margin + '%', r.statusAudit]; }), { lanskap: true, kaki: ['TOTAL', lr.total.pax, U.rp(lr.total.pendapatan), '', '', '', U.rp(lr.total.laba), lr.total.margin + '%', ''], kolomKanan: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }, ringkas: [['Laba bersih', U.rp(lr.total.laba)], ['Pendapatan', U.rp(lr.total.pendapatan)], ['Biaya', U.rp(lr.total.biaya)], ['Margin', lr.total.margin + '%']] }).then(function () { C.aksi('laporan.catat', { jenis: 'rekap', periode: per.label, format: 'pdf' }, { diam: true }); }).catch(function (e) { UI.toast(e.message, 'err'); }); }
      });
      H.isi(el, true);
    },
    segarkan: function (el) { H.isi(el); if (drw && !drw.ditutup) drw.segar(); },
    isi: function (el) {
      var lr = data(), tot = lr.total, mob = innerWidth <= 720, fin = Store.isFin();
      var budAktif = U.jumlah(lr.baris.filter(function (r) { return r.adaRealisasi; }), function (r) { return r.budget; }), rls = U.jumlah(lr.baris, function (r) { return r.realisasi; }), hemat = budAktif - rls;
      var adaRls = lr.baris.filter(function (r) { return r.adaRealisasi; }), tuntas = adaRls.filter(function (r) { return r.statusAudit === 'Terverifikasi'; }).length;
      var ik = {}; Store.D.Kategori_Biaya.forEach(function (k) { ik[k.Nama] = k.Ikon; });
      var body = el.querySelector('#rk-body');
      var q = st.q.toLowerCase(), baris = lr.baris.filter(function (r) { if (st.tab === 'selesai' && !(r.status === 'Selesai')) return false; if (st.tab === 'butuh' && !(r.status !== 'Selesai' || r.statusAudit !== 'Terverifikasi')) return false; return !q || (r.trip.Nama + ' ' + r.trip.Kode).toLowerCase().indexOf(q) > -1; });
      body.innerHTML = '<div class="bento two-sm stagger">' +
        UI.stat({ hero: true, label: 'Total laba bersih (net profit)', nilai: mob ? U.rpRingkas(tot.laba) : U.rp(tot.laba), valTitle: U.rp(tot.laba), kaki: '<span class="badge glass">Net margin ' + F.persen(tot.margin) + '</span><span>' + tot.trip + ' trip · ' + tot.pax + ' pax</span>' }) +
        UI.stat({ label: 'Total pendapatan (omset)', ikon: 'wallet', nilai: mob ? U.rpRingkas(tot.pendapatan) : U.rp(tot.pendapatan), valTitle: U.rp(tot.pendapatan), kaki: '<div class="progress grow"><i style="width:' + (tot.pendapatan ? tot.kas / tot.pendapatan * 100 : 0) + '%"></i></div><span>' + Math.round(tot.pendapatan ? tot.kas / tot.pendapatan * 100 : 0) + '% kas masuk</span>' }) +
        UI.stat({ label: 'Total realisasi operasional (HPP)', ikon: 'receipt', nilai: mob ? U.rpRingkas(rls) : U.rp(rls), valTitle: U.rp(rls), kaki: '<span>Budget: ' + U.rpRingkas(budAktif) + '</span><span class="badge ' + (hemat >= 0 ? 'ok' : 'danger') + '">' + ic(hemat >= 0 ? 'piggy-bank' : 'triangle-alert', 14) + (hemat >= 0 ? 'Hemat ' : 'Over ') + F.persen(budAktif ? Math.abs(hemat) / budAktif * 100 : 0) + '</span>' }) +
        UI.stat({ label: 'Status audit realisasi', ikon: 'badge-check', tone: tuntas === adaRls.length ? 'ok' : 'warn', nilai: tuntas + ' / ' + adaRls.length + ' <small>trip tuntas</small>', kaki: '<span class="ok row" style="gap:4px"><span class="dot"></span>Diverifikasi Finance</span>' + (adaRls.length - tuntas ? '<span class="badge warn">' + (adaRls.length - tuntas) + ' nota pending</span>' : '') }) + '</div>' +
        '<div class="grid-12"><div class="span-7 span-lg-12"><div class="card lift"><div class="card__head"><div class="card__title"><h2>' + ic('chart-column', 20, 'primary') + 'Tren pendapatan, biaya & laba per trip</h2><p>Biaya memakai realisasi bila sudah ada, selain itu budget aktif (bermotif).</p></div><span class="badge neutral">Juta Rp</span></div>' + (lr.baris.length ? Grafik.trip(lr.baris) : UI.kosong('chart-column', 'Tidak ada trip pada periode ini')) +
        '<div class="legend" style="margin-top:8px"><span><i style="background:var(--c-primary)"></i>Pendapatan</span><span><i style="background:var(--c-primary-soft)"></i>Realisasi</span><span><i class="hatch"></i>Budget (belum realisasi)</span><span><i style="background:var(--c-ok);border-radius:50%"></i>Laba</span></div></div></div>' +
        '<div class="span-5 span-lg-12"><div class="card lift"><div class="card__head"><div class="card__title"><h2>' + ic('chart-pie', 20, 'primary') + 'Proporsi biaya operasional</h2><p>Total ' + U.rp(tot.biaya) + '</p></div><span class="badge ' + (tuntas === adaRls.length ? 'ok' : 'warn') + '">' + (adaRls.length ? Math.round(tuntas / adaRls.length * 100) : 0) + '% audit</span></div>' + (Object.keys(lr.kategori).length ? Grafik.proporsi(lr.kategori, ik) : UI.kosong('chart-pie', 'Belum ada biaya')) + '</div></div></div>' +
        '<div class="card card--pad0"><div class="between wrap" style="padding:16px 20px;gap:12px"><div class="row wrap" style="gap:10px"><h2>Rincian rekapitulasi trip</h2><div class="seg">' + [['semua', 'Semua (' + lr.baris.length + ')'], ['selesai', 'Selesai'], ['butuh', 'Berjalan / butuh input']].map(function (x) { return '<button data-act="tab" data-t="' + x[0] + '" class="' + (st.tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div><div class="row" style="gap:8px"><div class="input-ic">' + ic('search', 18) + '<input class="input" id="rk-q" type="search" placeholder="Filter kode atau trip…" value="' + esc(st.q) + '" style="min-height:40px"></div>' + (fin ? '<button class="btn btn--primary btn--sm" data-act="realisasi">' + ic('receipt', 16) + 'Input realisasi</button>' : '') + '</div></div>' +
        UI.tabel({ kolom: [
          { label: 'Kode & nama trip', render: function (r) { return '<div class="cell-main"><span class="ic-box ' + (r.status === 'Selesai' ? '' : 'warn') + '" style="width:40px;height:40px">' + ic(IKON_TRIP(r.trip), 20) + '</span><div class="row__text"><b class="truncate">' + esc(r.trip.Nama) + '</b><span class="sub">' + esc(r.trip.Kode) + ' · ' + F.rentang(r.trip.Tgl_Berangkat, r.trip.Tgl_Pulang) + ' · ' + r.pax + ' pax</span></div></div>'; } },
          { label: 'Pendapatan', num: true, render: function (r) { return '<b>' + F.rpTip(r.pendapatan) + '</b>'; } },
          { label: 'Budget aktif', num: true, render: function (r) { return F.rpTip(r.budget) + '<span class="sub ' + (r.budgetDraft ? 'warn' : '') + '">' + (r.budgetDraft ? '(' + r.budgetStatus + ' v' + r.versiBudget + ')' : '(v' + r.versiBudget + '.0)') + '</span>'; } },
          { label: 'Realisasi (HPP)', num: true, render: function (r) { return r.adaRealisasi ? '<b>' + F.rpTip(r.realisasi) + '</b>' : '<span class="muted">—</span>'; } },
          { label: 'Selisih', num: true, render: function (r) { return r.adaRealisasi ? '<span class="badge ' + (r.selisih >= 0 ? 'ok' : 'danger') + '">' + ic(r.selisih >= 0 ? 'arrow-down-right' : 'arrow-up-right', 13) + (r.selisih >= 0 ? '+' : '') + U.rpRingkas(r.selisih) + ' (' + r.selisihPersen + '%)</span>' : '<span class="badge warn">' + ic('hourglass', 13) + 'Estimasi</span>'; } },
          { label: 'Laba & margin', num: true, render: function (r) { return '<b class="primary">' + F.rpTip(r.laba) + '</b><span class="sub ' + (r.margin >= 25 ? 'ok' : r.margin < 0 ? 'danger' : '') + '">Margin ' + r.margin + '%' + (r.adaRealisasi ? '' : ' (est.)') + '</span>'; } },
          { label: 'Status audit', render: function (r) { return UI.badge(r.statusAudit, r.statusAudit === 'Terverifikasi' ? 'ok' : r.statusAudit === 'Belum Ada Realisasi' ? 'neutral' : r.statusAudit === 'Perlu Revisi' ? 'danger' : 'warn'); } },
          { label: 'Aksi', mlabel: '', render: function (r) { return '<button class="btn btn--soft btn--sm" data-act="nota" data-id="' + r.ID_Trip + '">' + (fin && r.adaRealisasi && r.statusAudit !== 'Terverifikasi' ? 'Audit nota' : 'RAB & nota') + '</button>'; } }
        ], baris: baris, kosong: 'Tidak ada trip', kosongIkon: 'chart-column',
          foot: baris.length ? '<tfoot><tr><td data-label="">' + ic('sigma', 18, 'primary') + ' TOTAL REKAPITULASI</td><td class="num" data-label="Pendapatan">' + U.rp(U.jumlah(baris, function (r) { return r.pendapatan; })) + '</td><td class="num" data-label="Budget">' + U.rp(U.jumlah(baris, function (r) { return r.budget; })) + '</td><td class="num" data-label="Realisasi">' + U.rp(U.jumlah(baris, function (r) { return r.realisasi; })) + '</td><td class="num" data-label="Selisih">' + U.rp(U.jumlah(baris, function (r) { return r.selisih; })) + '</td><td class="num" data-label="Laba" style="color:var(--c-primary)">' + U.rp(U.jumlah(baris, function (r) { return r.laba; })) + '</td><td colspan="2" data-label="">' + baris.length + ' trip</td></tr></tfoot>' : '' }) + '</div>';
      var qi = body.querySelector('#rk-q'); qi.addEventListener('input', C.debounce(function () { st.q = qi.value; H.isi(el); var n = el.querySelector('#rk-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
      Grafik.hidupkan(body);
    }
  };
  window.Halaman.rekap = H;
})();
