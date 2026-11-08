/* =====================================================================
   YukX — app.js : boot tanpa layout shift, login, shell (sidebar, topbar,
   bottom nav), router hash, Cmd/Ctrl+K, lonceng tindakan, profil.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  window.Halaman = window.Halaman || {};

  var MENU = [
    { grup: 'Menu' },
    { id: 'dashboard', label: 'Dashboard', ikon: 'layout-dashboard' },
    { id: 'customer', label: 'Customer', ikon: 'users' },
    { id: 'penjualan', label: 'Penjualan & DP', ikon: 'wallet' },
    { id: 'invoice', label: 'Invoice', ikon: 'receipt' },
    { id: 'budget', label: 'Kalkulasi Budget', ikon: 'calculator' },
    { id: 'manifest', label: 'Draft Manifest', ikon: 'clipboard-list' },
    { grup: 'Finance & Laporan' },
    { id: 'rekap', label: 'Rekapitulasi', ikon: 'chart-column' },
    { id: 'labarugi', label: 'Laba Rugi', ikon: 'trending-up' },
    { grup: 'Sistem' },
    { id: 'wa', label: 'WhatsApp & CRM', ikon: 'message-circle', peran: 'Admin' },
    { id: 'pengaturan', label: 'Pengaturan', ikon: 'settings', peran: 'Admin' },
    { id: 'log', label: 'Log Aktivitas', ikon: 'history' }
  ];
  var BAWAH = ['dashboard', 'customer', 'penjualan', 'invoice'];

  var App = {
    hal: null, args: [], query: {}, el: null, siap: false,

    // ------------------------------------------------------------ boot
    mulai: async function () {
      if (C.LS.get('yukx:gelap', false)) document.documentElement.setAttribute('data-theme', 'dark');
      var fontSiap = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), C.sleep(1500)]);
      try {
        var sesi = C.LS.get(C.DEMO ? 'yukx:sesi:demo' : 'yukx:sesi', null);
        if (C.DEMO) { Store.D = Demo.siapkan(); Store.S = Demo.S(Store.D); Store.info = { waSiap: true, demo: true, integrasi: Demo.integrasi() }; Store.ver = 'demo'; }
        if (sesi && sesi.token && (!sesi.exp || sesi.exp > Date.now())) {
          Store.token = sesi.token; Store.me = sesi.me;
          if (C.DEMO) {
            var u = Store.D.Pengguna.find(function (x) { return x.ID_Pengguna === sesi.me.id && x.Status === 'Aktif'; });
            if (!u) throw new Error('sesi demo tidak valid');
            Store.me = Demo.me(u);
          } else {
            var cache = C.LS.get('yukx:cache:' + sesi.me.email, null);
            if (cache && cache.D) { Store.setBoot(cache); this.segarDiLatar(); }
            else { var b = await C.api('boot', {}); if (!b.success) throw new Error(b.message); Store.setBoot(b.data); }
          }
          C.Tema.terapkan(Store.S);
          await fontSiap; this.renderShell(); this.route(true);
        } else {
          if (C.DEMO) C.Tema.terapkan(Store.S); await fontSiap; this.renderLogin();
        }
      } catch (e) {
        console.error(e); await fontSiap; this.renderLogin(e.message && !/sesi demo/.test(e.message) ? e.message : '');
      }
      this.tampilkan();
      this.pasangGlobal();
    },
    tampilkan: function () {
      requestAnimationFrame(function () {
        var app = document.getElementById('app'); app.classList.add('ready'); app.removeAttribute('aria-busy');
        var l = document.getElementById('loader'); if (!l) return; l.classList.add('out');
        var hapus = function () { l.remove(); }; l.addEventListener('transitionend', hapus, { once: true }); setTimeout(hapus, 600);
        UI.hitungNaik(document.getElementById('view')); Grafik.hidupkan(document.getElementById('view'));
      });
    },
    segarDiLatar: async function () {
      var b = await C.api('boot', {});
      if (b.success) { var berubah = b.data.ver !== Store.ver; Store.setBoot(b.data); C.Tema.terapkan(Store.S); if (berubah) this.segarkan(); }
    },

    // ------------------------------------------------------------ login
    renderLogin: function (pesan) {
      var S = Store.S && Store.S.APP_NAMA ? Store.S : C.Store.S_ ? {} : {};
      var nama = (Store.S && Store.S.APP_NAMA) || 'YukX';
      var app = document.getElementById('app');
      app.innerHTML = (C.DEMO ? '<div class="demo-banner">' + ic('sparkles', 16) + 'Mode Demo — data contoh tersimpan di perangkat ini. Isi GAS_URL di js/config.js untuk memakai data asli.</div>' : '') +
        '<div class="login"><section class="login__art"><img class="bg" src="assets/img/trips/labuan-bajo.webp" alt="" width="1200" height="800">' +
        '<div class="brand">' + this.logoHTML() + '<div class="brand__txt"><div class="brand__name" style="color:#fff">' + esc(nama) + '</div><div class="brand__tag" style="color:#C9D7F5">' + esc((Store.S && Store.S.APP_TAGLINE) || 'Report Automation') + '</div></div></div>' +
        '<div class="stack" style="gap:16px"><span class="badge glass">' + ic('sparkles', 14) + 'Customer → Invoice → Calendar → Manifest → Laba Rugi</span><h1>Laporan trip rapi, otomatis, tanpa rekap manual.</h1><p class="hide-sm">Invoice ber-nomor urut dalam hitungan detik, event Google Calendar per customer, budget berversi, dan laba rugi yang selalu siap.</p></div>' +
        '<div class="row hide-sm" style="gap:24px;color:#D7E2FA;font-size:13px;font-weight:600">' + ic('shield-check', 18) + 'PIN terenkripsi · Sesi bertoken · Hak akses Admin & Finance</div></section>' +
        '<section class="login__form"><form class="login__card" id="form-login" autocomplete="on"><div class="stack" style="gap:6px"><span class="label">Masuk ke dashboard</span><h1 style="font-size:30px">Selamat datang 👋</h1><p class="muted">Gunakan email terdaftar dan PIN 6 angka Anda.</p></div>' +
        (pesan ? '<div class="note danger">' + ic('circle-alert') + esc(pesan) + '</div>' : '') +
        '<div class="field"><label for="lg-email">Email</label><div class="input-ic">' + ic('mail', 18) + '<input class="input" id="lg-email" type="email" autocomplete="username" required placeholder="nama@yukx.id"></div></div>' +
        '<div class="field"><label>PIN</label><div class="pin-boxes" id="pin">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input inputmode="numeric" pattern="[0-9]*" maxlength="1" type="password" aria-label="Digit PIN ' + (i + 1) + '" autocomplete="' + (i ? 'off' : 'current-password') + '">'; }).join('') + '</div></div>' +
        '<button class="btn btn--primary btn--block" type="submit" id="lg-btn">' + ic('log-in', 18) + '<span>Masuk</span></button>' +
        (C.DEMO ? '<div class="stack"><span class="label">Coba akun demo (PIN 123456)</span><div class="demo-acc"><button type="button" data-demo="raka@yukx.id">' + UI.avatar('Raka Pratama', '', 'sm') + '<span class="row__text"><b class="truncate" style="display:block">Raka · Admin</b><small class="muted">Pengelola pengguna</small></span></button><button type="button" data-demo="sinta@yukx.id">' + UI.avatar('Sinta Wulandari', '', 'sm') + '<span class="row__text"><b class="truncate" style="display:block">Sinta · Finance</b><small class="muted">Setujui budget, audit</small></span></button></div></div>' : '<p class="soft" style="font-size:13px">Lupa PIN? Hubungi Admin pengelola untuk reset PIN.</p>') +
        '</form></section></div>';
      var pins = Array.from(app.querySelectorAll('#pin input'));
      pins.forEach(function (p, i) {
        p.addEventListener('input', function () { p.value = p.value.replace(/\D/g, '').slice(-1); if (p.value && pins[i + 1]) pins[i + 1].focus(); if (pins.every(function (x) { return x.value; })) app.querySelector('#form-login').requestSubmit(); });
        p.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !p.value && pins[i - 1]) pins[i - 1].focus(); });
        p.addEventListener('paste', function (e) { var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (t.length) { e.preventDefault(); t.split('').forEach(function (c, j) { if (pins[j]) pins[j].value = c; }); (pins[t.length] || pins[5]).focus(); if (t.length === 6) app.querySelector('#form-login').requestSubmit(); } });
      });
      app.querySelectorAll('[data-demo]').forEach(function (b) { b.onclick = function () { app.querySelector('#lg-email').value = b.dataset.demo; '123456'.split('').forEach(function (c, j) { pins[j].value = c; }); app.querySelector('#form-login').requestSubmit(); }; });
      var self = this;
      app.querySelector('#form-login').onsubmit = function (e) { e.preventDefault(); self.masuk(app.querySelector('#lg-email').value, pins.map(function (p) { return p.value; }).join(''), app.querySelector('#lg-btn'), pins); };
      if (!C.DEMO) fetch(C.CFG.GAS_URL + '?w=pub', { mode: 'no-cors', cache: 'no-store' }).catch(function () { });
      setTimeout(function () { var e = app.querySelector('#lg-email'); if (e && window.innerWidth > 720) e.focus(); }, 300);
    },
    masuk: async function (email, pin, btn, pins) {
      if (!/^\S+@\S+\.\S+$/.test(email)) { UI.toast('Masukkan email yang valid.', 'err'); return; }
      if (!/^\d{6}$/.test(pin)) { UI.toast('PIN harus 6 angka.', 'err'); return; }
      var label = btn.innerHTML; btn.classList.add('loading'); btn.innerHTML = ic('loader-circle', 18, 'spin') + '<span>Memeriksa…</span>';
      var r = await C.api('auth.login', { email: email.trim(), pin: pin });
      if (!r.success) {
        btn.classList.remove('loading'); btn.innerHTML = label; UI.toast(r.message, 'err');
        var box = document.getElementById('pin'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); pins.forEach(function (p) { p.value = ''; }); pins[0].focus(); return;
      }
      Store.token = r.data.token; Store.me = r.data.me;
      C.LS.set(C.DEMO ? 'yukx:sesi:demo' : 'yukx:sesi', { token: r.data.token, me: r.data.me, exp: Date.now() + 12 * 3600e3 });
      if (r.data.boot) Store.setBoot(r.data.boot);
      else if (!C.DEMO) { var b = await C.api('boot', {}); if (!b.success) { UI.toast(b.message, 'err'); btn.classList.remove('loading'); btn.innerHTML = label; return; } Store.setBoot(b.data); }
      C.Tema.terapkan(Store.S);
      var app = document.getElementById('app'); app.classList.remove('ready');
      setTimeout(function () { App.renderShell(); if (!location.hash || location.hash === '#/') location.hash = '#/dashboard'; App.route(true); app.classList.add('ready'); UI.toast(r.message || 'Berhasil masuk.', 'ok'); }, 180);
    },
    keluar: async function () {
      var ok = await UI.konfirmasi({ judul: 'Keluar dari sistem?', teks: 'Sesi di perangkat ini akan diakhiri.', ok: 'Keluar', bahaya: true, ikon: 'log-out' });
      if (!ok) return; C.api('auth.keluar', {});
      C.LS.del(C.DEMO ? 'yukx:sesi:demo' : 'yukx:sesi'); Store.token = ''; Store.me = null;
      UI.tutupSemua(); this.renderLogin(); location.hash = '';
    },
    sesiBerakhir: function () { if (!Store.me) return; C.LS.del('yukx:sesi'); Store.token = ''; Store.me = null; UI.tutupSemua(); this.renderLogin('Sesi Anda berakhir. Silakan masuk lagi.'); },

    // ------------------------------------------------------------ shell
    logoHTML: function (kecil) {
      var url = Store.S && Store.S.LOGO_URL;
      return '<span class="brand__logo">' + (url ? '<img src="' + esc(url) + '" alt="Logo" width="40" height="40" onerror="this.replaceWith(document.createRange().createContextualFragment(\'' + ic('plane', 22).replace(/"/g, '&quot;') + '\'))">' : ic('plane', 22)) + '</span>';
    },
    menuBoleh: function () { var p = Store.me ? Store.me.peran : ''; return MENU.filter(function (m) { return !m.peran || m.peran === p; }); },
    renderShell: function () {
      var me = Store.me, S = Store.S, app = document.getElementById('app');
      app.innerHTML = (C.DEMO ? '<div class="demo-banner">' + ic('sparkles', 16) + '<span>Mode Demo — data contoh di perangkat ini · <a href="#/pengaturan/data" style="color:inherit;text-decoration:underline">reset data</a></span></div>' : '') +
        '<div class="app"><aside class="sidebar"><div class="sidebar__card"><a class="brand" href="#/dashboard">' + this.logoHTML() + '<div class="brand__txt"><div class="brand__name" id="brand-nama">' + esc(S.APP_NAMA) + '</div><div class="brand__tag" id="brand-tag">' + esc(S.APP_TAGLINE) + '</div></div></a>' +
        '<nav class="nav" id="nav" aria-label="Menu utama"></nav><div id="live-card"></div><button class="logout" id="btn-keluar">' + ic('log-out', 18) + '<span>Keluar Sistem</span></button></div></aside>' +
        '<div class="main"><header class="topbar" id="topbar"><div class="mobile-top only-sm"><a href="#/dashboard">' + this.logoHTML() + '</a><div class="stack" style="gap:0;min-width:0"><b class="truncate" style="font-size:15px">' + esc(S.APP_NAMA) + '</b><span class="badge ' + (C.DEMO ? 'accent' : 'ok') + '" style="height:20px;font-size:10.5px;width:max-content">' + (C.DEMO ? 'DEMO' : '<span class="dot"></span>Live') + '</span></div></div>' +
        '<button class="search-btn" id="btn-cari" aria-label="Cari">' + ic('search', 18) + '<span>Cari invoice, trip, customer…</span><kbd>' + (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd></button>' +
        '<div class="top-actions"><button class="icon-btn" id="btn-tema" aria-label="Ganti tema">' + ic(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon') + '</button>' +
        '<button class="icon-btn" id="btn-lonceng" aria-label="Notifikasi">' + ic('bell') + '<span class="badge-dot" id="lonceng-n" hidden></span></button>' +
        '<button class="me" id="btn-me" aria-label="Akun saya">' + UI.avatar(me.nama, me.foto) + '<span class="me__txt"><b class="truncate" style="max-width:140px">' + esc(me.nama) + '</b><small>' + esc(me.peran) + (me.pengelola === 'YA' ? ' · Pengelola' : '') + '</small></span>' + ic('chevron-down', 16, 'hide-sm muted') + '</button></div></header>' +
        '<main id="view" tabindex="-1"></main></div></div>' +
        '<nav class="bottom-nav" id="bnav" aria-label="Navigasi bawah"></nav>';
      this.renderNav();
      var self = this;
      document.getElementById('btn-keluar').onclick = function () { self.keluar(); };
      document.getElementById('btn-cari').onclick = function () { self.cari(); };
      document.getElementById('btn-tema').onclick = function (e) { var gelap = document.documentElement.getAttribute('data-theme') !== 'dark'; C.Tema.gelap(gelap); e.currentTarget.innerHTML = ic(gelap ? 'sun' : 'moon'); };
      document.getElementById('btn-lonceng').onclick = function (e) { self.lonceng(e.currentTarget); };
      document.getElementById('btn-me').onclick = function (e) { self.menuSaya(e.currentTarget); };
      window.addEventListener('scroll', function () { var t = document.getElementById('topbar'); if (t) t.classList.toggle('scrolled', scrollY > 4); }, { passive: true });
    },
    hitungNav: function () {
      var D = Store.D, today = U.hariIni(), n = {};
      n.invoice = D.Invoice.filter(function (i) { return i.Status === 'Terbit' && i.Jatuh_Tempo && i.Jatuh_Tempo < today; }).length;
      n.budget = D.Budget_Header.filter(function (h) { return Store.isFin() ? h.Status === 'Menunggu' : h.Status === 'Ditolak'; }).length;
      n.penjualan = D.Pembayaran.filter(function (b) { return b.Status_Verifikasi === 'Menunggu'; }).length;
      n.wa = D.AntrianNotif.filter(function (r) { return r.Status === 'Gagal'; }).length;
      return n;
    },
    renderNav: function () {
      var nav = document.getElementById('nav'); if (!nav) return;
      var n = this.hitungNav(), hal = this.hal;
      nav.innerHTML = this.menuBoleh().map(function (m) {
        if (m.grup) return '<div class="nav__group label">' + esc(m.grup) + '</div>';
        return '<a href="#/' + m.id + '" data-tip="' + esc(m.label) + '" class="' + (hal === m.id ? 'on' : '') + '"' + (hal === m.id ? ' aria-current="page"' : '') + '>' + ic(m.ikon) + '<span>' + esc(m.label) + '</span>' + (n[m.id] ? '<b class="count">' + n[m.id] + '</b>' : '') + '</a>';
      }).join('');
      var bn = document.getElementById('bnav'), semua = this.menuBoleh().filter(function (m) { return m.id; });
      bn.innerHTML = BAWAH.map(function (id) { var m = semua.find(function (x) { return x.id === id; }); return '<a href="#/' + id + '" class="' + (hal === id ? 'on' : '') + '">' + '<span class="pill">' + ic(m.ikon, 22) + '</span>' + esc(m.label.split(' ')[0]) + (n[id] ? '<b class="count">' + n[id] + '</b>' : '') + '</a>'; }).join('') +
        '<button id="bn-lain" class="' + (BAWAH.indexOf(hal) < 0 ? 'on' : '') + '"><span class="pill">' + ic('ellipsis', 22) + '</span>Lainnya</button>';
      document.getElementById('bn-lain').onclick = function () { App.lainnya(); };
      // kartu trip live/terdekat
      var lc = document.getElementById('live-card'); if (!lc) return;
      var today = U.hariIni(), trips = Store.D.Trip.filter(function (t) { return t.Status !== 'Batal'; });
      var jalan = trips.find(function (t) { return HT.statusTrip(t, today) === 'Berjalan'; }) || U.urutkan(trips.filter(function (t) { return t.Tgl_Berangkat >= today; }), function (t) { return t.Tgl_Berangkat; })[0];
      if (!jalan) { lc.innerHTML = ''; return; }
      var pax = U.jumlah(Store.D.Penjualan.filter(function (p) { return p.ID_Trip === jalan.ID_Trip && p.Status !== 'Batal'; }), function (p) { return p.Jumlah_Pax; });
      var live = HT.statusTrip(jalan, today) === 'Berjalan', h = U.selisihHari(today, jalan.Tgl_Berangkat);
      lc.innerHTML = '<div class="live-card" data-go="manifest/' + jalan.ID_Trip + '" role="link" tabindex="0"><div class="between"><span class="label">' + (live ? 'Trip Live' : 'Trip Terdekat · H-' + h) + '</span><span class="dot ' + (live ? 'pulse' : '') + '"></span></div><b class="truncate">' + esc(jalan.Nama) + '</b><small>' + pax + ' peserta · ' + F.rentang(jalan.Tgl_Berangkat, jalan.Tgl_Pulang) + '</small></div>';
    },
    lainnya: function () {
      var self = this, sisa = this.menuBoleh().filter(function (m) { return m.id && BAWAH.indexOf(m.id) < 0; });
      var h = UI.modal({ judul: 'Menu lainnya', isi: '<div class="stack" style="gap:6px">' + sisa.map(function (m) { return '<a class="menu-item" href="#/' + m.id + '">' + ic(m.ikon) + '<span>' + esc(m.label) + '</span>' + ic('chevron-right', 18, 'muted') + '</a>'; }).join('') +
        '<div style="height:1px;background:var(--c-border);margin:6px 0"></div><button class="menu-item" data-x="profil">' + ic('user') + '<span>Profil & PIN saya</span></button><button class="menu-item" data-x="tema">' + ic('moon') + '<span>Mode gelap / terang</span></button><button class="menu-item danger" data-x="keluar">' + ic('log-out') + '<span>Keluar sistem</span></button></div>' });
      h.el.addEventListener('click', function (e) {
        if (e.target.closest('a')) { h.tutup(); return; }
        var b = e.target.closest('[data-x]'); if (!b) return; h.tutup();
        if (b.dataset.x === 'profil') self.profil(); if (b.dataset.x === 'keluar') self.keluar();
        if (b.dataset.x === 'tema') C.Tema.gelap(document.documentElement.getAttribute('data-theme') !== 'dark');
      });
    },

    // ------------------------------------------------------------ router
    route: function (awal) {
      if (!Store.me) return;
      var hash = location.hash.replace(/^#\/?/, '') || 'dashboard', q = {};
      var parts = hash.split('?'); if (parts[1]) parts[1].split('&').forEach(function (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
      var seg = parts[0].split('/').map(decodeURIComponent), nama = seg[0];
      var def = window.Halaman[nama], menu = MENU.find(function (m) { return m.id === nama; });
      if (!def || (menu && menu.peran && menu.peran !== Store.me.peran)) { nama = 'dashboard'; def = window.Halaman.dashboard; seg = ['dashboard']; if (location.hash !== '#/dashboard') history.replaceState(null, '', '#/dashboard'); }
      var ganti = nama !== this.hal;
      this.hal = nama; this.args = seg.slice(1); this.query = q;
      UI.tutupPopover(); if (ganti) UI.tutupSemua();
      this.renderNav();
      var view = document.getElementById('view'); if (!view) return;
      this.el = view;
      if (ganti || awal || !def.segarkan || def.renderUlang) {
        view.classList.remove('enter'); view.onclick = null; view.oninput = null; view.onchange = null;
        def.render(view, this.args, q);
        view.classList.add('enter');
        if (ganti && !awal) { window.scrollTo({ top: 0 }); }
        if (!awal) { UI.hitungNaik(view); Grafik.hidupkan(view); }
      } else if (def.navigasi) { def.navigasi(view, this.args, q); UI.pasTeks(view); }
      else { def.segarkan(view, this.args, q); UI.pasTeks(view); }
      document.title = (Store.S.APP_NAMA || 'YukX') + ' — ' + (menu ? menu.label : (def.judul || ''));
    },
    segarkan: function () {
      if (this._rafS) return; var self = this;
      this._rafS = requestAnimationFrame(function () {
        self._rafS = 0; if (!Store.me || !document.getElementById('view')) return;
        var def = window.Halaman[self.hal]; self.renderNav(); self.badgeLonceng();
        if (def) { if (def.segarkan) def.segarkan(self.el, self.args, self.query); else { var y = scrollY; def.render(self.el, self.args, self.query); window.scrollTo(0, y); } Grafik.hidupkan(self.el); UI.pasTeks(self.el); }
        if (self._segarCb) self._segarCb.forEach(function (f) { try { f(); } catch (e) { } });
      });
    },
    padaSegar: function (f) { (this._segarCb = this._segarCb || []).push(f); },
    go: function (h) { location.hash = '#/' + h; },

    // ------------------------------------------------------------ global
    pasangGlobal: function () {
      if (this._global) return; this._global = true; var self = this;
      window.addEventListener('hashchange', function () { self.route(); });
      document.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (Store.me) self.cari(); }
      });
      document.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g && !e.target.closest('button:not([data-go]),a:not([data-go])')) { self.go(g.dataset.go); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var g = e.target.closest && e.target.closest('[data-go]'); if (g) self.go(g.dataset.go); } });
      if (!C.DEMO) {
        setInterval(function () { self.ping(); }, 45000);
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') self.ping(); });
      }
      this.badgeLonceng();
    },
    ping: async function () {
      if (!Store.me || Store.busy || document.visibilityState !== 'visible' || C.Pekerja.aktif) return;
      var r = await C.api('ping', { ver: Store.ver });
      if (r.success && r.data.ver && r.data.ver !== Store.ver) { var b = await C.api('boot', {}); if (b.success && !Store.busy) { Store.setBoot(b.data); C.Tema.terapkan(Store.S); this.segarkan(); } }
      if (r.success && r.data.tugas) C.Pekerja.jalan();
    },
    tindakan: function () {
      var D = Store.D, today = U.hariIni(), db = HT.dashboard(D, { today: today, S: Store.S }), out = [];
      if (Store.isFin()) D.Budget_Header.filter(function (h) { return h.Status === 'Menunggu'; }).forEach(function (h) { var t = Store.get('Trip', h.ID_Trip) || {}; out.push({ ikon: 'calculator', tone: 'warn', judul: 'Budget v' + h.Versi + ' menunggu persetujuan', sub: t.Nama + ' · ' + U.rp(h.Total), go: 'budget/' + h.ID_Trip }); });
      D.Pembayaran.filter(function (b) { return b.Status_Verifikasi === 'Menunggu'; }).forEach(function (b) { var pj = Store.get('Penjualan', b.ID_Penjualan) || {}, c = Store.get('Customer', pj.ID_Customer) || {}; out.push({ ikon: 'hand-coins', tone: 'warn', judul: 'Bukti bayar perlu dicek', sub: c.Nama + ' · ' + U.rp(b.Nominal), go: 'penjualan?pj=' + b.ID_Penjualan }); });
      db.antrean.slice(0, 12).forEach(function (a) { out.push({ ikon: a.jenis === 'telat' ? 'clock' : a.jenis === 'manifest' ? 'clipboard-list' : 'user-check', tone: a.jenis === 'telat' ? 'danger' : 'warn', judul: a.label, sub: a.r.cust.Nama + ' · ' + a.r.trip.Nama, go: a.jenis === 'manifest' ? 'manifest/' + a.r.trip.ID_Trip : 'penjualan?pj=' + a.r.id }); });
      D.Antrean_Tugas.filter(function (t) { return t.Status === 'Gagal'; }).slice(0, 3).forEach(function (t) { out.push({ ikon: 'triangle-alert', tone: 'danger', judul: 'Tugas otomatis gagal: ' + t.Jenis, sub: t.Ref + ' · ' + t.Hasil, go: 'invoice' }); });
      return out;
    },
    badgeLonceng: function () { var b = document.getElementById('lonceng-n'); if (!b) return; var n = this.tindakan().length; b.hidden = !n; b.textContent = n > 9 ? '9+' : n; },
    lonceng: function (btn) {
      var list = this.tindakan();
      UI.popover(btn, '<div class="between" style="padding:8px 10px"><b>Perlu tindakan</b><span class="badge ' + (list.length ? 'warn' : 'ok') + '">' + list.length + '</span></div>' +
        (list.length ? '<div class="stack" style="gap:2px;max-height:60vh;overflow:auto">' + list.map(function (a) { return '<button class="menu-item" data-go="' + esc(a.go) + '" style="min-height:56px"><span class="ic-box ' + a.tone + '" style="width:36px;height:36px;border-radius:11px">' + ic(a.ikon, 18) + '</span><span class="row__text"><b class="truncate" style="display:block;font-size:13.5px">' + esc(a.judul) + '</b><small class="muted truncate" style="display:block">' + esc(a.sub) + '</small></span></button>'; }).join('') + '</div>'
          : UI.kosong('circle-check', 'Semua beres!', 'Tidak ada yang perlu ditindaklanjuti.')),
        function (e) { if (e.target.closest('[data-go]')) UI.tutupPopover(); });
    },
    menuSaya: function (btn) {
      var self = this, me = Store.me;
      UI.popover(btn, '<div class="row" style="padding:10px">' + UI.avatar(me.nama, me.foto) + '<div class="row__text"><b class="truncate" style="display:block">' + esc(me.nama) + '</b><small class="muted truncate" style="display:block">' + esc(me.email) + '</small></div></div><div style="height:1px;background:var(--c-border);margin:4px 0"></div>' +
        '<button class="menu-item" data-x="profil">' + ic('user') + 'Profil & ganti PIN</button>' + (Store.isAdmin() ? '<button class="menu-item" data-x="atur">' + ic('palette') + 'Tampilan & identitas</button>' : '') +
        '<button class="menu-item" data-x="perf">' + ic('gauge') + 'Kecepatan koneksi</button><button class="menu-item danger" data-x="keluar">' + ic('log-out') + 'Keluar</button>',
        function (e) { var b = e.target.closest('[data-x]'); if (!b) return; UI.tutupPopover(); if (b.dataset.x === 'profil') self.profil(); if (b.dataset.x === 'keluar') self.keluar(); if (b.dataset.x === 'atur') self.go('pengaturan'); if (b.dataset.x === 'perf') self.perf(); });
    },
    perf: function () {
      var rows = window.Perf.rows.slice(-12).reverse();
      UI.modal({ judul: 'Kecepatan koneksi ke server', sub: C.DEMO ? 'Mode Demo berjalan sepenuhnya di perangkat — tanpa jaringan.' : 'Total = waktu tunggu Anda; Server = kerja Apps Script; selisihnya jaringan + cold start.', ukuran: 'sm',
        isi: rows.length ? UI.tabel({ kolom: [{ key: 'aksi', label: 'Aksi' }, { label: 'Total', num: true, render: function (r) { return r.total + ' ms'; } }, { label: 'Server', num: true, render: function (r) { return r.server == null ? '-' : r.server + ' ms'; } }], baris: rows, tanpaMain: true }) : UI.kosong('zap', 'Belum ada panggilan', 'Pindah menu memakai cache perangkat sehingga tidak memanggil server.') });
    },
    profil: function () {
      var me = Store.me;
      var h = UI.modal({ judul: 'Profil saya', sub: esc(me.email) + ' · ' + esc(me.peran), ukuran: 'sm',
        isi: '<div class="row" style="margin-bottom:20px"><span id="pf-av">' + UI.avatar(me.nama, me.foto, 'lg') + '</span><div class="stack"><b>' + esc(me.nama) + '</b><button class="btn btn--soft btn--sm" id="pf-foto">' + ic('camera', 16) + 'Ubah foto</button></div></div>' +
          '<div class="stack" style="gap:12px"><span class="label">Ganti PIN</span>' + UI.form([{ name: 'lama', label: 'PIN lama', type: 'password', attr: ' inputmode="numeric" maxlength="6" autocomplete="current-password"', full: true }, { name: 'baru', label: 'PIN baru (6 angka)', type: 'password', attr: ' inputmode="numeric" maxlength="6" autocomplete="new-password"' }, { name: 'ulang', label: 'Ulangi PIN baru', type: 'password', attr: ' inputmode="numeric" maxlength="6" autocomplete="new-password"' }]) + '</div>',
        aksi: [{ label: 'Tutup' }, { label: 'Simpan PIN', kelas: 'btn--primary', ikon: 'key-round', klik: async function (hh, b) {
          var v = UI.bacaForm(hh.body); if (!v.lama && !v.baru) return true;
          if (v.baru !== v.ulang) { UI.toast('Ulangi PIN baru tidak sama.', 'err'); return false; }
          var r = await C.aksi('pengguna.gantiPin', { lama: v.lama, baru: v.baru }, { btn: b }); return r.success;
        } }] });
      h.el.querySelector('#pf-foto').onclick = async function () {
        var g = await UI.pilihGambar({ max: 320 }); if (!g) return;
        var up = await C.api('aset.unggah', { kind: 'profil', file: g, id: me.id }); if (!up.success) { UI.toast(up.message, 'err'); return; }
        var r = await C.aksi('pengguna.foto', { id: me.id, url: up.data.url }); if (r.success) { me.foto = up.data.url; C.LS.set(C.DEMO ? 'yukx:sesi:demo' : 'yukx:sesi', Object.assign(C.LS.get(C.DEMO ? 'yukx:sesi:demo' : 'yukx:sesi', {}), { me: me })); h.el.querySelector('#pf-av').innerHTML = UI.avatar(me.nama, me.foto, 'lg'); var bm = document.querySelector('#btn-me .avatar'); if (bm) bm.outerHTML = UI.avatar(me.nama, me.foto); }
      };
    },

    // ------------------------------------------------------------ Cmd/Ctrl+K
    cari: function () {
      if (document.querySelector('.cmdk')) return;
      var D = Store.D, self = this, items = [];
      this.menuBoleh().filter(function (m) { return m.id; }).forEach(function (m) { items.push({ g: 'Menu', ikon: m.ikon, t: m.label, s: 'Buka halaman', go: m.id }); });
      if (Store.isAdmin()) items.push({ g: 'Aksi cepat', ikon: 'receipt', t: 'Buat invoice baru', s: 'Invoice', go: 'invoice/baru' }, { g: 'Aksi cepat', ikon: 'user-plus', t: 'Tambah customer', s: 'Customer', go: 'customer?baru=1' }, { g: 'Aksi cepat', ikon: 'wallet', t: 'Catat penjualan', s: 'Penjualan', go: 'penjualan?baru=1' });
      D.Customer.filter(function (c) { return c.Status !== 'Dihapus'; }).forEach(function (c) { items.push({ g: 'Customer', av: c.Nama, t: c.Nama, s: (c.No_WA || '') + ' · ' + (c.Kota || ''), go: 'customer/' + c.ID_Customer, k: c.Email + ' ' + c.ID_Customer }); });
      D.Invoice.forEach(function (i) { var pj = Store.get('Penjualan', i.ID_Penjualan) || {}, c = Store.get('Customer', pj.ID_Customer) || {}; items.push({ g: 'Invoice', ikon: 'receipt', t: i.No_Invoice, s: c.Nama + ' · ' + U.rp(i.Nominal) + ' · ' + i.Status, go: 'invoice/lihat/' + encodeURIComponent(i.No_Invoice) }); });
      D.Trip.forEach(function (t) { items.push({ g: 'Trip', img: t.Foto_URL, t: t.Nama, s: t.Kode + ' · ' + U.rentangTgl(t.Tgl_Berangkat, t.Tgl_Pulang), go: 'budget/' + t.ID_Trip }); });
      var box = UI.el('<div class="cmdk" role="dialog" aria-label="Pencarian"><div class="cmdk__input">' + ic('search') + '<input placeholder="Cari customer, invoice, trip, menu…" aria-label="Kata kunci"><kbd>Esc</kbd></div><div class="cmdk__list"></div></div>');
      var scrim = UI.el('<div class="scrim"></div>'); document.body.appendChild(scrim); document.body.appendChild(box);
      requestAnimationFrame(function () { scrim.classList.add('show'); box.classList.add('show'); });
      var inp = box.querySelector('input'), list = box.querySelector('.cmdk__list'), aktif = 0, hasil = [];
      function tutup() { box.classList.remove('show'); scrim.classList.remove('show'); setTimeout(function () { box.remove(); scrim.remove(); }, 220); document.removeEventListener('keydown', kunci, true); }
      function render() {
        var q = inp.value.trim().toLowerCase();
        hasil = (q ? items.filter(function (it) { return (it.t + ' ' + it.s + ' ' + (it.k || '')).toLowerCase().indexOf(q) > -1; }) : items.filter(function (it) { return it.g === 'Menu' || it.g === 'Aksi cepat'; })).slice(0, 40);
        aktif = Math.min(aktif, Math.max(0, hasil.length - 1)); var g = '';
        list.innerHTML = hasil.length ? hasil.map(function (it, i) {
          var head = it.g !== g ? '<div class="cmdk__group label">' + esc(it.g) + '</div>' : ''; g = it.g;
          var vis = it.img ? '<img class="trip-thumb sm" src="' + esc(it.img) + '" alt="" width="40" height="40">' : it.av ? UI.avatar(it.av, '', 'sm') : '<span class="ic-box" style="width:36px;height:36px;border-radius:11px">' + ic(it.ikon, 18) + '</span>';
          return head + '<div class="cmdk__item ' + (i === aktif ? 'on' : '') + '" data-i="' + i + '">' + vis + '<div class="row__text"><b class="truncate" style="display:block">' + esc(it.t) + '</b><small class="truncate" style="display:block">' + esc(it.s) + '</small></div>' + ic('arrow-right', 16, 'muted') + '</div>';
        }).join('') : UI.kosong('search', 'Tidak ditemukan', 'Coba kata kunci lain.');
        var on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
      }
      function pilih(i) { var it = hasil[i]; if (!it) return; tutup(); self.go(it.go); }
      function kunci(e) {
        if (e.key === 'Escape') { e.stopPropagation(); tutup(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); aktif = Math.min(hasil.length - 1, aktif + 1); render(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); aktif = Math.max(0, aktif - 1); render(); }
        if (e.key === 'Enter') { e.preventDefault(); pilih(aktif); }
      }
      document.addEventListener('keydown', kunci, true);
      inp.addEventListener('input', function () { aktif = 0; render(); });
      list.addEventListener('click', function (e) { var it = e.target.closest('[data-i]'); if (it) pilih(+it.dataset.i); });
      scrim.onclick = tutup; render(); setTimeout(function () { inp.focus(); }, 50);
    }
  };
  window.App = App;

  // ---------------------------------------------------------------- helper halaman bersama
  window.Hal = {
    kepala: function (o) {
      return '<div class="page-head"><div class="page-head__txt"><div class="crumbs">' + (o.crumbs || []).map(function (c, i) { return '<span class="label">' + esc(c) + '</span>' + (i < o.crumbs.length - 1 ? ic('chevron-right', 14, 'muted') : ''); }).join('') + '</div><h1>' + esc(o.judul) + '</h1>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div>' + (o.aksi ? '<div class="toolbar">' + o.aksi + '</div>' : '') + '</div>';
    },
    pilihTrip: function (id, nilai, semua) {
      var trips = U.urutkan(Store.D.Trip.filter(function (t) { return t.Status !== 'Batal'; }), function (t) { return t.Tgl_Berangkat; }, true);
      return '<select class="select" id="' + id + '" style="min-width:220px;width:auto;max-width:100%">' + (semua ? '<option value="">' + esc(semua) + '</option>' : '') + trips.map(function (t) { return '<option value="' + t.ID_Trip + '"' + (t.ID_Trip === nilai ? ' selected' : '') + '>' + esc(t.Nama) + ' · ' + U.tglId(t.Tgl_Berangkat) + '</option>'; }).join('') + '</select>';
    },
    aksiPeta: function (el, peta) {
      el.onclick = function (e) {
        var b = e.target.closest('[data-act]'); if (!b || !el.contains(b)) return;
        var f = peta[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset, b, e); }
      };
    },
    hanyaAdmin: function () { if (!Store.isAdmin()) { UI.toast('Aksi ini khusus peran Admin.', 'warn'); return false; } return true; },
    tripFoto: function (t, cls) { return '<img class="trip-thumb ' + (cls || '') + '" src="' + esc(t.Foto_URL || 'assets/img/trips/labuan-bajo.webp') + '" alt="" width="56" height="56" loading="lazy">'; }
  };

  document.addEventListener('DOMContentLoaded', function () { App.mulai(); });
})();
