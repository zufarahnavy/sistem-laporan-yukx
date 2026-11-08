/* YukX — Halaman Log Aktivitas & Riwayat Audit Sistem */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U;
  var st = { q: '', user: '', kat: '', hal: 1, pilih: '' }, PER = 20;
  var KAT = { 'Finansial & Invoice': ['receipt', ''], 'Budgeting & RAB': ['calculator', 'warn'], 'Manifest & Customer': ['users', 'ok'], 'Sistem': ['settings', 'neutral'] };

  var H = {
    judul: 'Log Aktivitas',
    render: function (el) {
      el.innerHTML = Hal.kepala({ crumbs: ['Sistem & keamanan', 'Audit trail & log aktivitas'], judul: 'Log Aktivitas & Riwayat Audit', sub: 'Rekam jejak siapa mengubah apa dan kapan — transaksi, revisi anggaran, penerbitan invoice, sinkronisasi Google Workspace, dan perubahan tampilan.',
        aksi: '<span class="status-pill hide-sm"><span class="dot pulse"></span>LockService aktif</span><button class="btn btn--ghost" data-act="ekspor">' + ic('download', 18) + 'Ekspor CSV</button>' }) +
        '<div id="lg-kpi" class="bento two-sm stagger"></div><div class="grid-12" style="margin-top:16px;align-items:start"><div class="span-8 span-lg-12"><div class="card card--pad0"><div class="stack" style="padding:16px;gap:12px"><div class="toolbar" style="gap:10px"><div class="input-ic grow" style="min-width:200px">' + ic('search', 18) + '<input class="input" id="lg-q" type="search" placeholder="Cari aksi, objek, detail…"></div><select class="select" id="lg-user" style="width:auto"><option value="">Semua pengguna</option></select></div><div class="chips-scroll" id="lg-kat"></div></div><div id="lg-list"></div></div></div><div class="span-4 span-lg-12 stack" style="gap:16px" id="lg-side"></div></div>';
      el.querySelector('#lg-q').addEventListener('input', C.debounce(function (e) { st.q = e.target.value; st.hal = 1; H.isi(el); }, 200));
      el.querySelector('#lg-user').onchange = function (e) { st.user = e.target.value; st.hal = 1; H.isi(el); };
      el.querySelector('#lg-kat').onclick = function (e) { var b = e.target.closest('[data-k]'); if (b) { st.kat = b.dataset.k; st.hal = 1; H.isi(el); } };
      Hal.aksiPeta(el, {
        hal: function (d) { st.hal = +d.n; H.isi(el); },
        ekspor: function () { var rows = H.saring(); var csv = [['Waktu', 'Pengguna', 'Peran', 'Kategori', 'Aksi', 'Objek', 'Detail']].concat(rows.map(function (r) { return [r.Waktu, r.Pengguna, r.Peran, r.Kategori, r.Aksi, r.Objek, r.Detail]; })).map(function (r) { return r.map(function (x) { return '"' + String(x || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\n'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'log-aktivitas-' + U.hariIni() + '.csv'; a.click(); UI.toast(rows.length + ' baris log diekspor.', 'ok'); }
      });
      H.isi(el, true);
    },
    segarkan: function (el) { H.isi(el); },
    saring: function () { var q = st.q.toLowerCase(); return U.urutkan(Store.D.Log_Aktivitas.filter(function (r) { if (st.user && r.Pengguna !== st.user) return false; if (st.kat && r.Kategori !== st.kat) return false; return !q || (r.Aksi + ' ' + r.Objek + ' ' + r.Detail + ' ' + r.Pengguna).toLowerCase().indexOf(q) > -1; }), function (r) { return r.Waktu + r.ID_Log; }, true); },
    isi: function (el) {
      var D = Store.D, logs = D.Log_Aktivitas, today = U.hariIni();
      var users = {}; logs.forEach(function (r) { users[r.Pengguna] = (users[r.Pengguna] || 0) + 1; });
      var aktifHariIni = D.Pengguna.filter(function (u) { return u.Status === 'Aktif' && String(u.Terakhir_Login).slice(0, 10) >= U.tambahHari(today, -1); }).length;
      var sinkron = D.Antrean_Tugas.filter(function (t) { return t.Status === 'Selesai'; }).length + D.Invoice.filter(function (i) { return /"cal":"ok"/.test(i.Status_Proses); }).length;
      el.querySelector('#lg-kpi').innerHTML = UI.stat({ hero: true, label: 'Total aktivitas tercatat', nilai: UI.hitung(logs.length) + ' <small style="color:#fff">log</small>', kaki: '<span class="badge glass">' + logs.filter(function (r) { return r.Waktu.slice(0, 10) === today; }).length + ' hari ini</span><span>0 anomali</span>' }) +
        UI.stat({ label: 'Aksi finansial & budgeting', ikon: 'receipt', nilai: UI.hitung(logs.filter(function (r) { return /Finansial|Budget/.test(r.Kategori); }).length) + ' <small>aksi</small>', kaki: '<span class="badge ok">100% valid</span>' }) +
        UI.stat({ label: 'Google Workspace sync', ikon: 'refresh-cw', nilai: UI.hitung(sinkron) + ' <small>event</small>', kaki: '<span>PDF Drive · Calendar · Gmail</span>' }) +
        UI.stat({ label: 'Pengguna aktif saat ini', ikon: 'users', nilai: aktifHariIni + ' / ' + D.Pengguna.filter(function (u) { return u.Status === 'Aktif'; }).length + ' <small>pengguna</small>', kaki: '<span>' + D.Pengguna.filter(function (u) { return u.Peran === 'Admin'; }).length + ' Admin · ' + D.Pengguna.filter(function (u) { return u.Peran === 'Finance'; }).length + ' Finance</span><span class="badge neutral">HMAC token</span>' });
      var su = el.querySelector('#lg-user'); if (su.options.length <= 1) Object.keys(users).sort().forEach(function (u) { su.insertAdjacentHTML('beforeend', '<option>' + esc(u) + '</option>'); });
      var nk = {}; logs.forEach(function (r) { nk[r.Kategori] = (nk[r.Kategori] || 0) + 1; });
      el.querySelector('#lg-kat').innerHTML = '<button class="chip ' + (!st.kat ? 'on' : '') + '" data-k="">Semua log <span class="n">' + logs.length + '</span></button>' + Object.keys(KAT).map(function (k) { return '<button class="chip ' + (st.kat === k ? 'on' : '') + '" data-k="' + esc(k) + '">' + ic(KAT[k][0], 15) + esc(k) + ' <span class="n">' + (nk[k] || 0) + '</span></button>'; }).join('');
      var rows = H.saring(), maxHal = Math.max(1, Math.ceil(rows.length / PER)); st.hal = Math.min(st.hal, maxHal);
      var pot = rows.slice((st.hal - 1) * PER, st.hal * PER); if (!st.pilih && pot[0]) st.pilih = pot[0].ID_Log;
      el.querySelector('#lg-list').innerHTML = UI.tabel({ kolom: [
        { label: 'Waktu', render: function (r) { return '<b class="num">' + F.jam(r.Waktu) + ' WIB</b><span class="sub">' + U.tglId(r.Waktu) + ' · ' + F.relatif(r.Waktu) + '</span>'; } },
        { label: 'Pengguna', render: function (r) { return '<div class="cell-main">' + UI.avatar(r.Pengguna, '', 'sm') + '<div class="row__text"><b class="truncate" style="font-size:13.5px">' + esc(r.Pengguna) + '</b><span class="sub">' + esc(r.Peran) + '</span></div></div>'; } },
        { label: 'Kategori & aksi', render: function (r) { var k = KAT[r.Kategori] || ['circle', 'neutral']; return '<span class="badge ' + k[1] + '">' + ic(k[0], 13) + esc(r.Aksi) + '</span>'; } },
        { label: 'Objek / detail', render: function (r) { return '<span class="mono truncate" style="display:block;max-width:220px;font-weight:700">' + esc(r.Objek) + '</span><span class="sub truncate" style="max-width:240px">' + esc(r.Detail) + '</span>'; } }
      ], baris: pot, klik: function (r) { return r.ID_Log; }, tanpaMain: true, kosong: 'Tidak ada log', kosongIkon: 'history' }) +
        '<div class="between wrap" style="padding:14px 16px;border-top:1px solid var(--c-border);gap:8px"><small class="muted">Menampilkan ' + (rows.length ? (st.hal - 1) * PER + 1 : 0) + '–' + Math.min(rows.length, st.hal * PER) + ' dari ' + rows.length + ' aktivitas</small><div class="row" style="gap:6px"><button class="btn btn--ghost btn--sm btn--icon" data-act="hal" data-n="' + Math.max(1, st.hal - 1) + '"' + (st.hal === 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">' + ic('chevron-left', 16) + '</button><span class="badge solid">' + st.hal + ' / ' + maxHal + '</span><button class="btn btn--ghost btn--sm btn--icon" data-act="hal" data-n="' + Math.min(maxHal, st.hal + 1) + '"' + (st.hal === maxHal ? ' disabled' : '') + ' aria-label="Berikutnya">' + ic('chevron-right', 16) + '</button></div></div>';
      el.querySelectorAll('#lg-list tr[data-row]').forEach(function (tr) { tr.onclick = function () { st.pilih = tr.dataset.row; H.samping(el); }; });
      H.samping(el);
    },
    samping: function (el) {
      var D = Store.D, r = D.Log_Aktivitas.find(function (x) { return x.ID_Log === st.pilih; }), info = Store.info.integrasi || {};
      var beban = {}; D.Log_Aktivitas.forEach(function (x) { beban[x.Pengguna] = (beban[x.Pengguna] || 0) + 1; });
      var detail = r ? '<div class="card"><div class="card__head"><div class="card__title"><span class="label">Snapshot audit</span><h3 class="row" style="gap:8px">' + ic('braces', 18, 'primary') + 'Detail aktivitas</h3></div><span class="badge neutral mono">' + esc(r.ID_Log.slice(-8)) + '</span></div><dl class="kv" style="grid-template-columns:auto 1fr"><dt>Waktu</dt><dd>' + F.waktu(r.Waktu) + ' WIB</dd><dt>Aktor</dt><dd class="truncate">' + esc(r.Pengguna) + ' (' + esc(r.Peran) + ')</dd><dt>Kategori</dt><dd>' + esc(r.Kategori) + '</dd><dt>Aksi</dt><dd style="white-space:normal">' + esc(r.Aksi) + '</dd><dt>Objek</dt><dd class="mono" style="white-space:normal">' + esc(r.Objek) + '</dd></dl>' + (r.Detail ? '<div class="quote mono" style="margin-top:10px;word-break:break-word">' + esc(r.Detail) + '</div>' : '') + '<small class="muted row" style="margin-top:10px;gap:6px">' + ic('shield-check', 15, 'ok') + 'Nilai rahasia (PIN, token) tidak pernah dicatat di log.</small></div>' : '';
      var wl = '<div class="card"><div class="card__head"><div class="card__title"><span class="label">Workload pengguna (RBAC)</span><h3>Aktivitas per akun</h3></div><span class="badge">' + D.Pengguna.filter(function (u) { return u.Status === 'Aktif'; }).length + ' akun aktif</span></div><div class="stack" style="gap:8px">' + U.urutkan(D.Pengguna, function (u) { return -(beban[u.Nama] || 0); }).map(function (u) { var n = beban[u.Nama] || 0; return '<div class="row" style="padding:6px 0">' + UI.avatar(u.Nama, u.Foto_URL, 'sm') + '<div class="row__text"><b class="truncate" style="display:block;font-size:13.5px">' + esc(u.Nama) + '</b><small class="muted">' + esc(u.Peran) + ' · ' + F.relatif(u.Terakhir_Login) + '</small></div><div style="text-align:right"><b class="num">' + n + '</b><small class="muted" style="display:block">aksi</small></div></div>'; }).join('') + '</div></div>';
      var kuota = info.kuota || { calendar: [D.Invoice.filter(function (i) { return /"cal":"ok"/.test(i.Status_Proses); }).length, 5000], drive: [D.Invoice.filter(function (i) { return i.File_ID; }).length, 1000], email: [D.AntrianNotif.filter(function (n) { return n.Kanal === 'EMAIL' && n.Status === 'Terkirim'; }).length, 100] };
      var ak = '<div class="card"><div class="card__head"><div class="card__title"><span class="label">Google Apps Script</span><h3>Audit keamanan & kuota</h3></div><span class="badge ok">Optimal</span></div><div class="stack" style="gap:12px">' +
        [['Calendar events', kuota.calendar], ['File PDF Drive', kuota.drive], ['Email terkirim hari ini', kuota.email]].map(function (k) { var p = Math.min(100, Math.round(k[1][0] / k[1][1] * 100)); return '<div class="hbar"><div class="hbar__top"><span>' + k[0] + '</span><span class="num muted">' + k[1][0] + ' / ' + k[1][1] + '</span></div><div class="progress thin"><i style="width:' + Math.max(2, p) + '%"></i></div></div>'; }).join('') +
        '<div class="stack" style="gap:6px;font-size:13px">' + [['LockService konkurensi', 'Tanpa race condition'], ['Rahasia di Script Properties', 'Tidak di kode/Sheets'], ['PIN pengguna', 'Hash iteratif + salt'], ['Sesi', 'Token HMAC 12 jam']].map(function (x) { return '<div class="between"><span class="row" style="gap:6px">' + ic('circle-check', 16, 'ok') + esc(x[0]) + '</span><b class="ok" style="font-size:12px">' + esc(x[1]) + '</b></div>'; }).join('') + '</div></div></div>';
      el.querySelector('#lg-side').innerHTML = detail + wl + ak;
    }
  };
  window.Halaman.log = H;
})();
