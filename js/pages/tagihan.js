/* =====================================================================
   YukBanyuwangi — Tagihan (Finance)
   Sisa tagihan per pesanan = Total sheet − DP sheet − pembayaran yang
   dicatat Finance. Finance menandai lunas/belum, mengatur jatuh tempo,
   mengirim pengingat WA/Email (manual atau otomatis H-sekian).
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { f: 'belum', q: '', pilih: {}, drawer: null };

  function semua() { return HT.tagihanDaftar(Store.D, Store.S, U.hariIni()); }
  function saring(rows) {
    var q = st.q.toLowerCase();
    return rows.filter(function (t) {
      if (st.f === 'belum' && (t.lunas || t.sisa <= 0)) return false;
      if (st.f === 'telat' && !t.telat) return false;
      if (st.f === 'dekat' && !t.dekat) return false;
      if (st.f === 'lunas' && !t.lunas) return false;
      return !q || [t.p.Nama, t.p.Trip, t.p.Tab, t.inf.hp, t.p.Email].join(' ').toLowerCase().indexOf(q) > -1;
    });
  }
  function jt(t) { if (!t.jatuhTempo) return '<span class="muted">—</span>'; return U.tglId(t.jatuhTempo) + '<span class="sub ' + (t.telat ? 'danger' : t.dekat ? 'warn' : '') + '">' + (t.lunas ? '' : t.hari < 0 ? 'Lewat ' + (-t.hari) + ' hari' : t.hari === 0 ? 'Hari ini' : 'H-' + t.hari) + '</span>'; }

  function tabel(rows, fin) {
    var kol = [
      { label: 'Tamu', render: function (t) { return '<div class="cell-main">' + (fin && !t.lunas && t.sisa > 0 ? '<input type="checkbox" class="pilih" data-pilih="' + t.id + '"' + (st.pilih[t.id] ? ' checked' : '') + ' aria-label="Pilih ' + esc(t.p.Nama) + '">' : '') + '<div class="row__text"><b class="truncate">' + esc(t.p.Nama) + '</b><span class="sub truncate">' + esc(t.p.Trip) + ' · ' + esc(t.p.Tab) + '</span></div></div>'; } },
      { label: 'Jadwal trip', render: function (t) { return esc(t.inf.jadwal || '-'); } },
      { label: 'Total', num: true, render: function (t) { return U.ribuan(t.total); } },
      { label: 'Terbayar', render: function (t) { return '<div class="stack" style="gap:4px;min-width:110px"><span class="num" style="font-size:13px">' + U.ribuan(t.terbayar) + ' <span class="muted">(' + t.persen + '%)</span></span><div class="progress thin ' + (t.lunas ? 'ok' : t.telat ? 'danger' : '') + '"><i style="width:' + t.persen + '%"></i></div></div>'; } },
      { label: 'Sisa', num: true, render: function (t) { return t.sisa > 0 ? '<b class="' + (t.telat ? 'danger' : '') + '">' + U.ribuan(t.sisa) + '</b>' : '<span class="ok">—</span>'; } },
      { label: 'Jatuh tempo', render: jt },
      { label: 'Status', render: function (t) { return UI.badge(t.telat ? 'Jatuh Tempo' : t.status) + (t.manual ? '<span class="sub">ditandai manual</span>' : '') + (t.nIngat ? '<span class="sub">' + ic('bell', 12) + ' ' + t.nIngat + '× diingatkan</span>' : ''); } }
    ];
    return UI.tabel({ baris: rows, kolom: kol, klik: function (t) { return t.id; }, kosong: st.f === 'telat' ? 'Tidak ada tagihan lewat jatuh tempo' : 'Tidak ada data', kosongIkon: 'circle-check' });
  }

  function isiDrawer(id) {
    var p = Store.get('Pesanan', id); if (!p) return '';
    var t = HT.tagihanPesanan(Store.D, HT.indeks(Store.D), p, Store.S, U.hariIni()), fin = Store.isFin();
    var riw = [{ tgl: U.tgl(p.Tgl_Pesan) || '', nominal: t.dp, jenis: 'DP (kolom DP di sheet)', sheet: true }].filter(function (x) { return x.nominal; })
      .concat(t.pembayaran.map(function (b) { return { id: b.ID_Bayar, tgl: b.Tanggal, nominal: Number(b.Nominal), jenis: b.Jenis + ' · ' + b.Metode, oleh: b.Dicatat_Oleh, bukti: b.Link_Bukti, cat: b.Catatan }; }));
    return '<div class="card card--tight"><div class="between" style="margin-bottom:10px"><b>Ringkasan</b>' + UI.badge(t.telat ? 'Jatuh Tempo' : t.status) + '</div><div class="progress ' + (t.lunas ? 'ok' : '') + '"><i style="width:' + t.persen + '%"></i></div>' +
      '<dl class="kv" style="margin-top:10px"><dt>Total (sheet)</dt><dd>' + U.rp(t.total) + '</dd><dt>Terbayar</dt><dd>' + U.rp(t.terbayar) + '</dd><dt>Sisa</dt><dd class="' + (t.sisa ? 'warn' : 'ok') + '">' + U.rp(t.sisa) + '</dd><dt>Jatuh tempo</dt><dd>' + (t.jatuhTempo ? U.tglId(t.jatuhTempo) : '—') + (t.tg.Jatuh_Tempo ? '' : ' <small class="muted">(hari pertama trip)</small>') + '</dd>' + (t.diingatkan ? '<dt>Pengingat terakhir</dt><dd>' + esc(F.waktu(t.diingatkan)) + '</dd>' : '') + '</dl>' +
      (t.manual ? '<div class="note" style="margin-top:10px">' + ic('info') + '<span>Status ditandai manual "' + esc(t.manual) + '" oleh ' + esc(t.tg.Oleh || '-') + '. Hitungan otomatis: sisa ' + U.rp(t.sisaHitung) + '.</span></div>' : '') + '</div>' +
      '<div class="card card--tight"><b style="display:block;margin-bottom:8px">Riwayat pembayaran</b>' + (riw.length ? riw.map(function (r) { return '<div class="nota"><span class="ic-box ' + (r.sheet ? '' : 'ok') + '" style="width:36px;height:36px;border-radius:11px">' + ic(r.sheet ? 'table-2' : 'wallet', 17) + '</span><div class="row__text grow"><b class="num">' + U.rp(r.nominal) + '</b><small class="muted">' + esc(r.jenis) + (r.tgl ? ' · ' + U.tglId(r.tgl) : '') + (r.oleh ? ' · ' + esc(r.oleh) : '') + '</small>' + (r.cat ? '<small>' + esc(r.cat) + '</small>' : '') + (r.bukti && /^https?:/.test(r.bukti) ? '<a href="' + esc(r.bukti) + '" target="_blank" rel="noopener" class="tautan">' + ic('paperclip', 13) + 'Bukti</a>' : '') + '</div>' + (fin && r.id ? '<button class="icon-btn" data-x="hapusBayar" data-id="' + r.id + '" aria-label="Hapus pembayaran">' + ic('trash-2', 17) + '</button>' : '') + '</div>'; }).join('') : '<p class="muted">Belum ada pembayaran.</p>') + '</div>' +
      (fin ? '<div class="card card--tight"><b style="display:block;margin-bottom:10px">Catat pembayaran</b>' + UI.form([{ name: 'Nominal', label: 'Nominal', type: 'rupiah', wajib: true, nilai: t.sisa || '' }, { name: 'Tanggal', label: 'Tanggal', type: 'date', nilai: U.hariIni() }, { name: 'Jenis', label: 'Jenis', type: 'select', opsi: ['Pelunasan', 'Cicilan', 'DP tambahan'], nilai: 'Pelunasan' }, { name: 'Metode', label: 'Metode', type: 'select', opsi: ['Transfer', 'Tunai', 'QRIS'] }, { name: 'Link_Bukti', label: 'Link bukti (opsional)', type: 'url', full: true }, { name: 'Catatan', label: 'Catatan', full: true }, { name: 'kabari', label: '', type: 'switch', teks: 'Kirim konfirmasi ke tamu (WA/Email)', full: true, nilai: true }]) +
        '<button class="btn btn--primary btn--block" data-x="bayar" style="margin-top:12px">' + ic('wallet', 18) + 'Simpan pembayaran</button></div>' +
        '<div class="card card--tight"><b style="display:block;margin-bottom:10px">Status & jatuh tempo</b><div class="seg seg--block" style="margin-bottom:12px">' + [['', 'Otomatis'], ['Lunas', 'Lunas'], ['Belum Lunas', 'Belum lunas']].map(function (x) { return '<button data-x="tandai" data-s="' + x[0] + '" class="' + (t.manual === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="row" style="gap:8px;align-items:flex-end"><div class="field grow"><label for="tg-jt">Jatuh tempo</label><input class="input" id="tg-jt" type="date" value="' + esc(U.tgl(t.tg.Jatuh_Tempo) || '') + '"></div><button class="btn btn--ghost" data-x="atur">Simpan</button></div><p class="help muted" style="margin-top:6px">Kosong = hari pertama trip (sesuai syarat invoice).</p>' +
        (!t.lunas && t.sisa > 0 ? '<button class="btn btn--soft btn--block" data-x="ingat" style="margin-top:12px">' + ic('bell', 18) + 'Kirim pengingat sekarang</button>' : '') + '</div>' : '<p class="muted">Hanya Finance yang mencatat pembayaran & mengirim pengingat.</p>');
  }
  function bukaDrawer(id) {
    var p = Store.get('Pesanan', id); if (!p) return;
    if (st.drawer && !st.drawer.h.ditutup) st.drawer.h.tutup();
    var h = UI.drawer({ kepala: '<div class="between"><span class="label">Tagihan</span><button class="icon-btn" data-tutup aria-label="Tutup">' + ic('x') + '</button></div>' + Hal.kartuPesanan(p), isi: isiDrawer(id), onTutup: function () { st.drawer = null; } });
    st.drawer = { h: h, id: id }; UI.siapkanForm(h.el);
    h.el.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return;
      var x = b.dataset.x;
      if (x === 'bayar') { var body = h.el.querySelector('.drawer__body'); if (!UI.cekWajib(body)) return; var v = UI.bacaForm(body.querySelectorAll('.card')[2]); v.ID_Pesanan = id; var r = await C.aksi('bayar.simpan', v, { btn: b, diam: true });
        if (!r.success && /tetap simpan/.test(r.message)) { if (await UI.konfirmasi({ judul: 'Nominal melebihi sisa', teks: esc(r.message), ok: 'Tetap simpan' })) { v.paksa = true; r = await C.aksi('bayar.simpan', v, { btn: b, diam: true }); } else return; }
        UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) C.Pekerja.jalan(); }
      if (x === 'hapusBayar') { if (await UI.konfirmasi({ judul: 'Hapus catatan pembayaran?', ok: 'Hapus', bahaya: true })) C.aksi('bayar.hapus', { id: b.dataset.id }); }
      if (x === 'tandai') { var r2 = await C.aksi('tagihan.tandai', { ID_Pesanan: id, status: b.dataset.s, kabari: b.dataset.s === 'Lunas' }, { proses: 'Memperbarui status tagihan' }); if (r2.success) C.Pekerja.jalan(); }
      if (x === 'atur') C.aksi('tagihan.atur', { ID_Pesanan: id, Jatuh_Tempo: h.el.querySelector('#tg-jt').value }, { btn: b });
      if (x === 'ingat') { var r3 = await C.aksi('tagihan.ingatkan', { ids: [id], wa: true, email: true }, { btn: b, proses: 'Mengantrekan pengingat' }); if (r3.success) C.Pekerja.jalan(); }
    });
  }
  function aturOtomatis() {
    var S = Store.S, aktif = S.TAGIHAN_OTOMATIS === 'YA';
    UI.modal({ judul: 'Pengingat otomatis', sub: 'Dikirim tiap pagi (±07.00 WIB) ke tamu yang belum lunas.', ukuran: 'sm',
      isi: '<label class="switch"><input type="checkbox" id="ot-on"' + (aktif ? ' checked' : '') + '><span class="track"></span><span>Aktifkan pengingat otomatis</span></label><div class="field" style="margin-top:12px"><label for="ot-h">Kirim pada H-berapa sebelum trip</label><input class="input" id="ot-h" value="' + esc(S.TAGIHAN_H || '7,3,1') + '" placeholder="7,3,1"><div class="help">Pisahkan dengan koma. Kanal WA/Email mengikuti saklar di menu WhatsApp & CRM.</div></div>',
      aksi: [{ label: 'Batal' }, { label: 'Simpan', kelas: 'btn--primary', ikon: 'save', klik: async function (h, b) { var r = await C.aksi('tagihan.otomatis', { aktif: h.el.querySelector('#ot-on').checked, hari: h.el.querySelector('#ot-h').value }, { btn: b }); return r.success; } }] });
  }

  var H = window.Halaman.tagihan = {
    render: function (el, args, q) {
      var fin = Store.isFin(), rows = semua(), belum = rows.filter(function (t) { return !t.lunas && t.sisa > 0; }), telat = rows.filter(function (t) { return t.telat; }), dekat = rows.filter(function (t) { return t.dekat; });
      el.innerHTML = Hal.kepala({ judul: 'Tagihan', sub: 'Sisa tagihan dihitung dari kolom TOTAL & DP di sheet ditambah pembayaran yang dicatat Finance. Jatuh tempo = hari pertama trip kecuali diatur lain.',
        aksi: fin ? '<button class="btn btn--ghost" data-act="otomatis">' + ic('timer', 18) + '<span>Pengingat otomatis' + (Store.S.TAGIHAN_OTOMATIS === 'YA' ? ' · aktif' : '') + '</span></button>' : '' }) +
        '<div class="bento two-sm" style="margin-bottom:16px">' +
        UI.stat({ label: 'Sisa tagihan aktif', nilai: UI.hitung(U.jumlah(belum, function (t) { return t.sisa; }), 'rp'), hero: true, kaki: '<span>' + belum.length + ' pesanan belum lunas</span>' }) +
        UI.stat({ label: 'Lewat jatuh tempo', nilai: UI.hitung(telat.length), ikon: 'triangle-alert', tone: telat.length ? 'danger' : 'ok', kaki: '<span>' + U.rpRingkas(U.jumlah(telat, function (t) { return t.sisa; })) + '</span>' }) +
        UI.stat({ label: 'Jatuh tempo ≤ 7 hari', nilai: UI.hitung(dekat.length), ikon: 'clock', tone: 'warn', kaki: '<span>' + U.rpRingkas(U.jumlah(dekat, function (t) { return t.sisa; })) + '</span>' }) +
        UI.stat({ label: 'Lunas', nilai: UI.hitung(rows.filter(function (t) { return t.lunas; }).length), ikon: 'circle-check', tone: 'ok', kaki: '<span>dari ' + rows.length + ' pesanan</span>' }) + '</div>' +
        '<div class="between wrap" style="gap:10px;margin-bottom:12px"><div class="chips-scroll">' + [['belum', 'Belum lunas', belum.length], ['telat', 'Lewat jatuh tempo', telat.length], ['dekat', '≤ 7 hari', dekat.length], ['lunas', 'Lunas'], ['semua', 'Semua']].map(function (x) { return '<button class="chip' + (st.f === x[0] ? ' on' : '') + '" data-act="f" data-f="' + x[0] + '">' + x[1] + (x[2] != null ? '<span class="n">' + x[2] + '</span>' : '') + '</button>'; }).join('') + '</div>' +
        '<div class="input-ic" style="min-width:min(100%,280px)">' + ic('search', 18) + '<input class="input" id="tg-q" type="search" placeholder="Cari tamu, trip, HP…" value="' + esc(st.q) + '"></div></div>' +
        (fin ? '<div class="pilih-bar" id="tg-bar"></div>' : '') + '<div class="card card--pad0" id="tg-isi"></div>';
      el.oninput = C.debounce(function (e) { if (e.target.id === 'tg-q') { st.q = e.target.value; H.isi(el); } }, 150);
      el.onchange = function (e) { var c = e.target.closest('[data-pilih]'); if (c) { if (c.checked) st.pilih[c.dataset.pilih] = 1; else delete st.pilih[c.dataset.pilih]; H.bar(el); } };
      Hal.aksiPeta(el, {
        f: function (d) { st.f = d.f; el.querySelectorAll('[data-act="f"]').forEach(function (b) { b.classList.toggle('on', b.dataset.f === st.f); }); H.isi(el); },
        otomatis: aturOtomatis,
        semua: function () { saring(semua()).forEach(function (t) { if (!t.lunas && t.sisa > 0) st.pilih[t.id] = 1; }); H.isi(el); },
        kosongkan: function () { st.pilih = {}; H.isi(el); },
        ingatkan: async function (d, b) {
          var ids = Object.keys(st.pilih); if (!ids.length) return;
          if (!(await UI.konfirmasi({ judul: 'Kirim pengingat ke ' + ids.length + ' tamu?', teks: 'Pesan sisa tagihan masuk antrean WhatsApp/Email dan terkirim bertahap.', ok: 'Kirim pengingat', ikon: 'bell' }))) return;
          var r = await C.aksi('tagihan.ingatkan', { ids: ids, wa: true, email: true }, { btn: b, proses: 'Mengantrekan pengingat' }); if (r.success) { st.pilih = {}; H.isi(el); C.Pekerja.jalan(); }
        }
      }, function (e) { if (e.target.closest('input')) return; var r = e.target.closest('tr[data-row]'); if (r) bukaDrawer(r.dataset.row); });
      H.isi(el);
      if (q && q.id) setTimeout(function () { bukaDrawer(q.id); }, 60);
    },
    navigasi: function (el, args, q) { if (q && q.id) bukaDrawer(q.id); },
    segarkan: function (el, args, q) {
      var fokus = document.activeElement && document.activeElement.id === 'tg-q', pos = fokus ? document.activeElement.selectionStart : 0;
      var y = scrollY; H.render(el, [], {}); window.scrollTo(0, y); UI.pasTeks(el);
      if (fokus) { var i = el.querySelector('#tg-q'); i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { } }
      if (st.drawer && !st.drawer.h.ditutup) { var b = st.drawer.h.el.querySelector('.drawer__body'); if (b) { b.innerHTML = isiDrawer(st.drawer.id); UI.siapkanForm(b); } }
    },
    isi: function (el) { var b = el.querySelector('#tg-isi'); if (b) b.innerHTML = tabel(saring(semua()), Store.isFin()); H.bar(el); },
    bar: function (el) {
      var b = el.querySelector('#tg-bar'); if (!b) return; var n = Object.keys(st.pilih).length;
      b.innerHTML = '<div class="row wrap" style="gap:8px"><span class="muted">' + (n ? '<b>' + n + '</b> tamu dipilih' : 'Centang tamu untuk mengirim pengingat sekaligus') + '</span><button class="btn btn--plain btn--sm" data-act="semua">Pilih semua di daftar</button>' + (n ? '<button class="btn btn--plain btn--sm" data-act="kosongkan">Kosongkan</button><button class="btn btn--primary btn--sm" data-act="ingatkan">' + ic('bell', 16) + 'Kirim pengingat (' + n + ')</button>' : '') + '</div>';
    }
  };
})();
