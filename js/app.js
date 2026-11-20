/* =====================================================================
   YukBanyuwangi — app.js : boot tanpa layout shift, halaman masuk (slideshow
   gambar diatur Admin), shell (sidebar, topbar, bottom nav), router hash, Cmd/Ctrl+K,
   lonceng tindakan, indikator sinkron Google Sheets, profil.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  window.Halaman = window.Halaman || {};

  var MENU = [
    { grup: 'Operasional' },
    { id: 'dashboard', label: 'Dashboard', ikon: 'layout-dashboard' },
    { id: 'pesanan', label: 'Data Pemesanan', ikon: 'table-2' },
    { id: 'kalkulasi', label: 'Kalkulasi Budget', ikon: 'calculator' },
    { id: 'budgettl', label: 'Budgeting TL', ikon: 'wallet-cards' },
    { id: 'manifest', label: 'Manifest Tim Lapang', ikon: 'clipboard-list' },
    { id: 'kalender', label: 'Kalender Trip', ikon: 'calendar-days' },
    { grup: 'Keuangan & laporan' },
    { id: 'invoice', label: 'Invoice', ikon: 'receipt' },
    { id: 'tagihan', label: 'Tagihan', ikon: 'hand-coins', atur: true },
    { id: 'rekap', label: 'Rekapitulasi', ikon: 'chart-column' },
    { id: 'labarugi', label: 'Laba Rugi', ikon: 'trending-up', atur: true },
    { id: 'report', label: 'Report & Analitik', ikon: 'chart-pie', atur: true },
    { grup: 'Sistem' },
    { id: 'wa', label: 'WhatsApp & CRM', ikon: 'message-circle', peran: 'Admin' },
    { id: 'pengaturan', label: 'Pengaturan', ikon: 'settings', peran: 'Admin' },
    { id: 'log', label: 'Log Aktivitas', ikon: 'history' }
  ];
  var BAWAH = { Admin: ['dashboard', 'pesanan', 'manifest', 'rekap'], Finance: ['dashboard', 'tagihan', 'rekap', 'labarugi'] };

  // ---------------------------------------------------------------- halaman masuk: data (sebelum login)
  var KUNCI_LOGIN = ['APP_NAMA', 'APP_TAGLINE', 'LOGO_URL', 'FAVICON_URL', 'PALET', 'FONT_BODY', 'FONT_HEAD', 'PT_WEB', 'LOGIN_JUDUL', 'LOGIN_SUB', 'LOGIN_SLIDE', 'LOGIN_INTERVAL', 'LOGIN_ANIMASI', 'LOGIN_KARTU_JUDUL', 'LOGIN_KARTU_SUB', 'LOGIN_TAUTAN_LABEL', 'LOGIN_TAUTAN_URL', 'LOGIN_BANTUAN'];
  function setelanMasuk() {
    var d = {}; KUNCI_LOGIN.forEach(function (k) { d[k] = (YX.PENGATURAN_DEFAULT[k] || [''])[0]; });
    var simpan = C.LS.get('yb:login', null) || {};
    return Object.assign(d, simpan, C.DEMO || (Store.S && Store.S.APP_NAMA && Store.me) ? pilihKunci(Store.S || {}) : {});
  }
  function pilihKunci(S) { var o = {}; KUNCI_LOGIN.forEach(function (k) { if (S[k] !== undefined) o[k] = S[k]; }); return o; }
  function slideMasuk(S) {
    var bawaan = YX.LOGIN_SLIDE_DEFAULT, l = U.parseJson(S.LOGIN_SLIDE, null);
    if (!Array.isArray(l) || !l.length) l = bawaan.map(function (x, i) { return i === 0 ? Object.assign({}, x, { judul: S.LOGIN_JUDUL || x.judul, sub: S.LOGIN_SUB || x.sub }) : x; });
    return l.slice(0, 8).map(function (x, i) { return { img: x.img || bawaan[i % bawaan.length].img, judul: x.judul || '', sub: x.sub || '' }; });
  }
  function tautanSitus(S) { var u = S.LOGIN_TAUTAN_URL || (S.PT_WEB ? 'https://' + String(S.PT_WEB).replace(/^https?:\/\//, '') : ''); return /^https:\/\//.test(u) ? u : ''; }

  var App = {
    hal: null, args: [], query: {}, el: null, siap: false,

    // ------------------------------------------------------------ boot
    mulai: async function () {
      var fontSiap = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), C.sleep(1500)]);
      try {
        var sesi = C.LS.get(C.DEMO ? 'yb:sesi:demo' : 'yb:sesi', null);
        if (C.DEMO) { Store.D = Demo.siapkan(); Store.S = Demo.S(Store.D); Store.info = { waSiap: true, demo: true, rahasia: Demo.rahasia(), penyedia: Store.S.WA_PENYEDIA, sumberOk: true, sumberNama: 'Dummy Database Pemesanan YukX (contoh)', integrasi: Demo.integrasi(), kalender: { id: '' } }; Store.ver = 'demo'; Store.src = 'demo'; }
        if (sesi && sesi.token && (!sesi.exp || sesi.exp > Date.now())) {
          Store.token = sesi.token; Store.me = sesi.me;
          if (C.DEMO) {
            var u = Store.D.Pengguna.find(function (x) { return x.ID_Pengguna === sesi.me.id && x.Status === 'Aktif'; });
            if (!u) throw new Error('sesi demo tidak valid');
            Store.me = Demo.me(u);
          } else {
            var cache = C.LS.get('yb:cache:' + sesi.me.email, null);
            if (cache && cache.D && cache.D.Sumber_Tab) { Store.setBoot(cache); this.segarDiLatar(); }
            else { var b = await C.api('boot', {}); if (!b.success) throw new Error(b.message); Store.setBoot(b.data); }
          }
          C.Tema.terapkan(Store.S);
          await fontSiap; this.renderShell(); this.route(true);
        } else {
          C.Tema.terapkan(Store.S || {}); await fontSiap; this.renderLogin();
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
      var b = await C.api('boot', {}, { senyap: true });
      if (b.success) { Store.setBoot(b.data); C.Tema.terapkan(Store.S); this.segarkan(); }
    },

    // ------------------------------------------------------------ halaman masuk (slideshow + kartu)
    renderLogin: function (pesan) {
      var S = setelanMasuk(), nama = S.APP_NAMA || 'YukBanyuwangi', app = document.getElementById('app'), self = this;
      var logo = S.LOGO_URL || 'assets/logo-yb.png', situs = tautanSitus(S), ingat = C.LS.get('yb:ingat', '');
      app.innerHTML = '<div class="masuk2">' +
        '<div class="masuk2__panggung" id="lg-panggung" aria-hidden="true"></div>' +
        '<header class="masuk2__atas"><a class="masuk2__merek" href="' + (situs ? esc(situs) : '#') + '" tabindex="-1"><img src="' + esc(logo) + '" alt="" width="40" height="40" onerror="this.src=\'assets/logo-yb.png\'"><span><b>' + esc(nama) + '</b><small>' + esc(S.APP_TAGLINE || '') + '</small></span></a>' +
        (situs ? '<a class="masuk2__situs" href="' + esc(situs) + '">' + ic('arrow-left', 16) + '<span>' + esc(S.LOGIN_TAUTAN_LABEL || 'Kembali ke situs') + '</span></a>' : '') + '</header>' +
        '<div class="masuk2__teks" id="lg-teks"></div>' +
        '<section class="masuk2__kartu"><form class="masuk2__form" id="form-login" autocomplete="on" novalidate>' +
        (C.DEMO ? '<p class="masuk__demo">' + ic('sparkles', 16) + '<span>Mode Demo — data contoh tersimpan di perangkat ini.</span></p>' : '') +
        '<div class="masuk2__salam"><h2>' + esc(S.LOGIN_KARTU_JUDUL || 'Selamat datang kembali') + '</h2><p>' + esc(S.LOGIN_KARTU_SUB || '') + '</p></div>' +
        (pesan ? '<div class="note danger">' + ic('circle-alert') + '<span>' + esc(pesan) + '</span></div>' : '') +
        '<div class="field"><label for="lg-email">Email</label><input class="input input--besar" id="lg-email" type="email" autocomplete="username" required placeholder="nama@yukbanyuwangi.co.id" value="' + esc(ingat) + '"></div>' +
        '<div class="field"><label for="lg-pin">PIN</label><div class="masuk2__pin"><input class="input input--besar" id="lg-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" required placeholder="6 angka"><button type="button" class="masuk2__mata" id="lg-mata" aria-label="Tampilkan PIN" aria-pressed="false">' + ic('eye', 20) + '</button></div></div>' +
        '<div class="masuk2__baris"><label class="check"><input type="checkbox" id="lg-ingat"' + (ingat ? ' checked' : '') + '><span>Ingat email saya</span></label><button type="button" class="link-btn" id="lg-lupa">Lupa PIN?</button></div>' +
        '<button class="btn btn--besar btn--block masuk2__tombol" type="submit" id="lg-btn"><span>Masuk</span></button>' +
        (C.DEMO ? '<div class="masuk__akun"><span class="muted">Coba sebagai (PIN 123456)</span><div><button type="button" data-demo="admin@yukbanyuwangi.demo">' + UI.avatar('Nadia Putri', '', 'sm') + '<span><b>Nadia</b><small>Admin</small></span></button><button type="button" data-demo="finance@yukbanyuwangi.demo">' + UI.avatar('Laras Wening', '', 'sm') + '<span><b>Laras</b><small>Finance</small></span></button></div></div>' : '') +
        '<p class="masuk2__bantu">' + esc(S.LOGIN_BANTUAN || '') + '</p>' +
        '</form></section></div>';
      this.slideMasuk(S);
      var pin = app.querySelector('#lg-pin'), form = app.querySelector('#form-login');
      pin.addEventListener('input', function () { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
      app.querySelector('#lg-mata').onclick = function () { var lihat = pin.type === 'password'; pin.type = lihat ? 'text' : 'password'; this.setAttribute('aria-pressed', String(lihat)); this.setAttribute('aria-label', lihat ? 'Sembunyikan PIN' : 'Tampilkan PIN'); this.innerHTML = ic(lihat ? 'eye-off' : 'eye', 20); pin.focus(); };
      app.querySelector('#lg-lupa').onclick = function () { UI.modal({ judul: 'Lupa PIN?', ukuran: 'sm', isi: '<p>PIN diatur ulang oleh <b>Admin pengelola</b> lewat <b>Pengaturan → Pengguna → Reset PIN</b>. PIN baru tampil sekali di layar Admin — minta langsung kepadanya, lalu ganti lewat menu Profil setelah masuk.</p>', aksi: [{ label: 'Mengerti', kelas: 'btn--primary' }] }); };
      app.querySelectorAll('[data-demo]').forEach(function (b) { b.onclick = function () { app.querySelector('#lg-email').value = b.dataset.demo; pin.value = '123456'; form.requestSubmit(); }; });
      form.onsubmit = function (e) {
        e.preventDefault(); var em = app.querySelector('#lg-email').value;
        try { if (app.querySelector('#lg-ingat').checked) C.LS.set('yb:ingat', em.trim()); else C.LS.del('yb:ingat'); } catch (er) { }
        self.masuk(em, pin.value, app.querySelector('#lg-btn'), [pin]);
      };
      if (!C.DEMO) {
        fetch(C.CFG.GAS_URL + '?w=pub', { mode: 'no-cors', cache: 'no-store' }).catch(function () { });
        C.api('login.info', {}, { senyap: true, tries: 1 }).then(function (r) {
          if (!r || !r.success || !r.data || !r.data.S) return;
          var lama = JSON.stringify(pilihKunci(setelanMasuk())); C.LS.set('yb:login', r.data.S);
          if (JSON.stringify(pilihKunci(Object.assign(setelanMasuk(), r.data.S))) !== lama && document.getElementById('lg-panggung') && !Store.me) { C.Tema.terapkan(r.data.S, false); self.renderLogin(pesan); }
        });
      }
      setTimeout(function () { var e = app.querySelector(ingat ? '#lg-pin' : '#lg-email'); if (e && window.innerWidth > 860) e.focus(); }, 300);
    },
    /** Slideshow halaman masuk: gambar bergerak pelan (zoom & geser), teks per slide, indikator klik. */
    slideMasuk: function (S) {
      var box = document.getElementById('lg-panggung'), teks = document.getElementById('lg-teks'); if (!box) return;
      var l = slideMasuk(S), n = l.length, i = 0, det = Math.max(3, Math.min(30, Number(S.LOGIN_INTERVAL) || 6)), gerak = S.LOGIN_ANIMASI !== 'TIDAK' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      box.style.setProperty('--durasi', (det + 1.6) + 's'); box.classList.toggle('diam', !gerak);
      box.innerHTML = l.map(function (x, j) { return '<div class="masuk2__gambar' + (j === 0 ? ' on' : '') + ' arah' + (j % 4) + '"><img src="' + esc(x.img) + '" alt="" decoding="async"' + (j ? ' loading="lazy"' : '') + ' onerror="this.parentNode.classList.add(\'galat\')"></div>'; }).join('') + '<div class="masuk2__redup"></div>';
      teks.innerHTML = '<div class="masuk2__judul-wrap" aria-live="polite"><h1 class="masuk2__judul" id="lg-judul"></h1><p class="masuk2__sub" id="lg-sub"></p></div>' +
        (n > 1 ? '<div class="masuk2__titik" role="tablist" aria-label="Pilih gambar">' + l.map(function (x, j) { return '<button type="button" role="tab" data-s="' + j + '" aria-label="Gambar ' + (j + 1) + '" aria-selected="' + (j === 0) + '"><i></i></button>'; }).join('') + '</div>' : '');
      teks.style.setProperty('--durasi', det + 's');
      function tampil(j) {
        i = (j + n) % n;
        box.querySelectorAll('.masuk2__gambar').forEach(function (g, x) { g.classList.toggle('on', x === i); if (x === i && gerak) { g.classList.remove('main'); void g.offsetWidth; g.classList.add('main'); } });
        var wrap = teks.querySelector('.masuk2__judul-wrap'); wrap.classList.remove('ganti'); void wrap.offsetWidth; wrap.classList.add('ganti');
        teks.querySelector('#lg-judul').textContent = l[i].judul; teks.querySelector('#lg-sub').textContent = l[i].sub;
        teks.querySelectorAll('[data-s]').forEach(function (b, x) { b.setAttribute('aria-selected', String(x === i)); b.classList.remove('jalan'); if (x === i) { void b.offsetWidth; b.classList.add('jalan'); } });
      }
      teks.onclick = function (e) { var b = e.target.closest('[data-s]'); if (!b) return; tampil(+b.dataset.s); mulai(); };
      clearInterval(App._slide);
      function mulai() { clearInterval(App._slide); if (n > 1) App._slide = setInterval(function () { if (!document.getElementById('lg-panggung')) { clearInterval(App._slide); return; } if (!document.hidden) tampil(i + 1); }, det * 1000); }
      tampil(0); mulai();
    },
    masuk: async function (email, pin, btn, pins) {
      if (btn.classList.contains('loading')) return;
      if (!/^\S+@\S+\.\S+$/.test(email)) { UI.toast('Masukkan email yang valid.', 'err'); return; }
      if (!/^\d{6}$/.test(pin)) { UI.toast('PIN harus 6 angka.', 'err'); return; }
      var label = btn.innerHTML; btn.classList.add('loading'); btn.innerHTML = UI.putar(18) + '<span>Memeriksa…</span>';
      var r = await C.api('auth.login', { email: email.trim(), pin: pin });
      if (!r.success) {
        btn.classList.remove('loading'); btn.innerHTML = label; UI.toast(r.message, 'err');
        var box = pins[0].closest('.masuk2__pin') || pins[0]; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); pins.forEach(function (p) { p.value = ''; }); pins[0].focus(); return;
      }
      btn.innerHTML = UI.putar(18) + '<span>Menyiapkan data…</span>';
      Store.token = r.data.token; Store.me = r.data.me;
      C.LS.set(C.DEMO ? 'yb:sesi:demo' : 'yb:sesi', { token: r.data.token, me: r.data.me, exp: Date.now() + 12 * 3600e3 });
      if (r.data.boot) Store.setBoot(r.data.boot);
      else if (!C.DEMO) { var b = await C.api('boot', {}); if (!b.success) { UI.toast(b.message, 'err'); btn.classList.remove('loading'); btn.innerHTML = label; return; } Store.setBoot(b.data); }
      C.Tema.terapkan(Store.S); clearInterval(this._slide); try { C.LS.set('yb:login', pilihKunci(Store.S)); } catch (e) { }
      var app = document.getElementById('app'); app.classList.remove('ready');
      setTimeout(function () { App.renderShell(); if (!location.hash || location.hash === '#/') location.hash = '#/dashboard'; App.route(true); app.classList.add('ready'); UI.toast(r.message || 'Berhasil masuk.', 'ok'); }, 180);
    },
    keluar: async function () {
      var ok = await UI.konfirmasi({ judul: 'Keluar dari aplikasi?', teks: 'Sesi di perangkat ini akan diakhiri.', ok: 'Keluar', bahaya: true, ikon: 'log-out' });
      if (!ok) return; C.api('auth.keluar', {}, { senyap: true });
      C.LS.del(C.DEMO ? 'yb:sesi:demo' : 'yb:sesi'); Store.token = ''; Store.me = null;
      UI.tutupSemua(); this.renderLogin(); location.hash = '';
    },
    sesiBerakhir: function () { if (!Store.me) return; C.LS.del('yb:sesi'); Store.token = ''; Store.me = null; UI.tutupSemua(); this.renderLogin('Sesi Anda berakhir. Silakan masuk lagi.'); },

    // ------------------------------------------------------------ shell
    logoHTML: function () {
      var url = (Store.S && Store.S.LOGO_URL) || 'assets/logo-yb.png';
      return '<span class="brand__logo brand__logo--img"><img src="' + esc(url) + '" alt="Logo" width="40" height="40" onerror="this.src=\'assets/logo-yb.png\'"></span>';
    },
    menuBoleh: function () {
      var p = Store.me ? Store.me.peran : '';
      return MENU.filter(function (m) { return m.grup || ((!m.peran || m.peran === p) && (!m.atur || Store.boleh(m.id))); })
        .filter(function (m, i, a) { return !m.grup || (a[i + 1] && !a[i + 1].grup); });
    },
    renderShell: function () {
      var me = Store.me, S = Store.S, app = document.getElementById('app');
      app.innerHTML = (C.DEMO ? '<div class="demo-banner">' + ic('sparkles', 16) + '<span>Mode Demo — data contoh di perangkat ini · <a href="#/pengaturan/sistem" style="color:inherit;text-decoration:underline">reset data</a></span></div>' : '') +
        '<div class="app"><aside class="sidebar"><div class="sidebar__card"><a class="brand" href="#/dashboard">' + this.logoHTML() + '<div class="brand__txt"><div class="brand__name" id="brand-nama">' + esc(S.APP_NAMA) + '</div><div class="brand__tag" id="brand-tag">' + esc(S.APP_TAGLINE) + '</div></div></a>' +
        '<nav class="nav" id="nav" aria-label="Menu utama"></nav><div id="live-card"></div><button class="logout" id="btn-keluar">' + ic('log-out', 18) + '<span>Keluar</span></button></div></aside>' +
        '<div class="main"><header class="topbar" id="topbar"><div class="mobile-top only-sm"><a href="#/dashboard">' + this.logoHTML() + '</a><div class="stack" style="gap:0;min-width:0"><b class="truncate" style="font-size:15px">' + esc(S.APP_NAMA) + '</b><span id="sinkron-m"></span></div></div>' +
        '<button class="search-btn" id="btn-cari" aria-label="Cari">' + ic('search', 18) + '<span>Cari tamu, invoice, trip…</span><kbd>' + (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd></button>' +
        '<div class="top-actions"><button class="sinkron hide-sm" id="sinkron" type="button" aria-live="polite"></button><button class="icon-btn" id="btn-tema" aria-label="Ganti tema">' + ic(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon') + '</button>' +
        '<button class="icon-btn" id="btn-lonceng" aria-label="Perlu tindakan">' + ic('bell') + '<span class="badge-dot" id="lonceng-n" hidden></span></button>' +
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
      document.getElementById('sinkron').onclick = function () { self.infoSinkron(); };
      window.addEventListener('scroll', function () { var t = document.getElementById('topbar'); if (t) t.classList.toggle('scrolled', scrollY > 4); }, { passive: true });
      C.Sinkron.mulai(); this.indikatorSinkron();
    },
    indikatorSinkron: function () {
      var b = document.getElementById('sinkron'), m = document.getElementById('sinkron-m'); if (!b) return;
      var s = C.Sinkron.status, ok = Store.info.sumberOk !== false, detik = Math.round((Date.now() - C.Sinkron.terakhir) / 1000);
      var teks = C.DEMO ? 'Sheet contoh' : s === 'menarik' ? 'Menarik perubahan…' : s === 'gagal' ? 'Offline — mencoba lagi' : !ok ? 'Sheet perlu izin' : 'Tersinkron';
      var kelas = s === 'menarik' ? 'jalan' : (s === 'gagal' || !ok) ? 'galat' : 'ok';
      b.className = 'sinkron hide-sm ' + kelas; b.innerHTML = (kelas === 'jalan' ? UI.putar(16) : '<span class="sinkron__dot"></span>') + '<span>' + teks + '</span>';
      b.title = C.DEMO ? 'Mode Demo memakai salinan isi file Dummy Database Pemesanan' : 'Google Sheets · dicek tiap ' + (Store.S.SUMBER_JEDA || 4) + ' detik' + (detik < 600 ? ' · terakhir ' + detik + ' dtk lalu' : '');
      if (m) m.innerHTML = '<span class="badge ' + (C.DEMO ? 'accent' : kelas === 'galat' ? 'warn' : 'ok') + '" style="height:20px;font-size:10.5px;width:max-content">' + (C.DEMO ? 'DEMO' : '<span class="dot"></span>' + (kelas === 'galat' ? 'Periksa' : 'Live')) + '</span>';
    },
    infoSinkron: function () {
      var i = Store.info, ok = i.sumberOk !== false;
      UI.modal({ judul: 'Sinkron Google Sheets', ukuran: 'sm', isi: '<div class="stack" style="gap:12px"><div class="row" style="gap:12px"><span class="ic-box ' + (ok ? 'ok' : 'warn') + '">' + ic('table-2') + '</span><div class="row__text"><b>' + esc(i.sumberNama || 'Database Pemesanan') + '</b><small class="muted">' + (C.DEMO ? 'Salinan isi file contoh (Mode Demo)' : ok ? 'Terhubung · ' + Store.D.Pesanan.length + ' pesanan dari ' + Store.D.Sumber_Tab.length + ' tab' : esc(i.sumberPesan || 'Belum terhubung')) + '</small></div></div>' +
        '<p class="muted" style="margin:0">Simpan dari aplikasi langsung tertulis ke sheet. Perubahan yang diketik langsung di sheet masuk ke aplikasi dalam beberapa detik (dicek tiap ' + (Store.S.SUMBER_JEDA || 4) + ' detik).</p></div>',
        aksi: [{ label: 'Tutup' }, { label: 'Tarik sekarang', kelas: 'btn--primary', ikon: 'refresh-cw', klik: async function (h, b) { b.classList.add('loading'); if (C.DEMO) { await C.sleep(500); UI.kilat('Data contoh sudah terbaru'); } else { Store.src = ''; await C.Sinkron.cek(true); } return true; } }] });
    },
    hitungNav: function () {
      var D = Store.D, S = Store.S, today = U.hariIni(), n = {}, fin = Store.isFin(), adm = Store.isAdmin();
      var rk = HT.rekapDaftar(D, { S: S, today: today });
      n.rekap = rk.filter(function (r) { return fin ? r.status === 'Siap Dicek' : (!r.kunci && r.selesai && r.status === 'Draft' && r.inf.mulai >= U.tambahHari(today, -45)); }).length;
      if (fin) n.tagihan = HT.tagihanDaftar(D, S, today).filter(function (t) { return t.telat; }).length;
      if (adm) {
        var ix = HT.indeks(D);
        n.manifest = D.Pesanan.filter(function (p) { var i = HT.infoPesanan(p, S), h = i.mulai ? U.selisihHari(today, i.mulai) : -1, m = ix.mnf[p.ID_Pesanan]; return h >= 0 && h <= 7 && (!m || m.Status !== 'Terbit'); }).length;
        n.kalkulasi = D.Pesanan.filter(function (p) { var i = HT.infoPesanan(p, S), h = i.mulai ? U.selisihHari(today, i.mulai) : -1; return h >= 0 && h <= 14 && !ix.kal[p.ID_Pesanan]; }).length;
        n.budgettl = D.Pesanan.filter(function (p) { var i = HT.infoPesanan(p, S), h = i.mulai ? U.selisihHari(today, i.mulai) : -1, m = ix.mnf[p.ID_Pesanan]; return h >= 0 && h <= 7 && !(m && m.Status === 'Terbit') && !HT.budgetTL(ix, p.ID_Pesanan).ada; }).length;
      }
      n.wa = (D.AntrianNotif || []).filter(function (r) { return r.Status === 'Gagal'; }).length;
      return n;
    },
    renderNav: function () {
      var nav = document.getElementById('nav'); if (!nav) return;
      var n = this.hitungNav(), hal = this.hal, boleh = this.menuBoleh();
      nav.innerHTML = boleh.map(function (m) {
        if (m.grup) return '<div class="nav__group label">' + esc(m.grup) + '</div>';
        return '<a href="#/' + m.id + '" data-tip="' + esc(m.label) + '" class="' + (hal === m.id ? 'on' : '') + '"' + (hal === m.id ? ' aria-current="page"' : '') + '>' + ic(m.ikon) + '<span>' + esc(m.label) + '</span>' + (n[m.id] ? '<b class="count">' + n[m.id] + '</b>' : '') + '</a>';
      }).join('');
      var bn = document.getElementById('bnav'), semua = boleh.filter(function (m) { return m.id; }), bawah = (BAWAH[Store.me.peran] || BAWAH.Admin).filter(function (id) { return semua.some(function (x) { return x.id === id; }); });
      bn.innerHTML = bawah.map(function (id) { var m = semua.find(function (x) { return x.id === id; }); return '<a href="#/' + id + '" class="' + (hal === id ? 'on' : '') + '">' + '<span class="pill">' + ic(m.ikon, 22) + '</span>' + esc(m.label.split(' ')[0]) + (n[id] ? '<b class="count">' + n[id] + '</b>' : '') + '</a>'; }).join('') +
        '<button id="bn-lain" class="' + (bawah.indexOf(hal) < 0 ? 'on' : '') + '"><span class="pill">' + ic('ellipsis', 22) + '</span>Lainnya</button>';
      document.getElementById('bn-lain').onclick = function () { App.lainnya(); };
      this.bawahIni = bawah;
      var lc = document.getElementById('live-card'); if (!lc) return;
      var today = U.hariIni(), list = Store.D.Pesanan.map(function (p) { var i = HT.infoPesanan(p, Store.S); i.p = p; return i; }).filter(function (i) { return i.mulai && i.selesai >= today; });
      var jalan = list.filter(function (i) { return i.mulai <= today; }), dekat = U.urutkan(list.filter(function (i) { return i.mulai > today; }), function (i) { return i.mulai; });
      var x = jalan[0] || dekat[0]; if (!x) { lc.innerHTML = ''; return; }
      var h = U.selisihHari(today, x.mulai);
      lc.innerHTML = '<div class="live-card" data-go="manifest/' + x.id + '" role="link" tabindex="0"><div class="between"><span class="label">' + (jalan.length ? jalan.length + ' trip berjalan' : 'Trip terdekat · H-' + h) + '</span><span class="dot ' + (jalan.length ? 'pulse' : '') + '"></span></div><b class="truncate">' + esc(x.p.Nama) + '</b><small class="truncate">' + x.pax + ' pax · ' + esc(x.p.Trip) + '</small></div>';
    },
    lainnya: function () {
      var self = this, sisa = this.menuBoleh().filter(function (m) { return m.id && (self.bawahIni || []).indexOf(m.id) < 0; });
      var h = UI.modal({ judul: 'Menu lainnya', isi: '<div class="stack" style="gap:6px">' + sisa.map(function (m) { return '<a class="menu-item" href="#/' + m.id + '">' + ic(m.ikon) + '<span>' + esc(m.label) + '</span>' + ic('chevron-right', 18, 'muted') + '</a>'; }).join('') +
        '<div style="height:1px;background:var(--c-border);margin:6px 0"></div><button class="menu-item" data-x="sinkron">' + ic('refresh-cw') + '<span>Sinkron Google Sheets</span></button><button class="menu-item" data-x="profil">' + ic('user') + '<span>Profil & PIN saya</span></button><button class="menu-item" data-x="tema">' + ic('moon') + '<span>Mode gelap / terang</span></button><button class="menu-item danger" data-x="keluar">' + ic('log-out') + '<span>Keluar</span></button></div>' });
      h.el.addEventListener('click', function (e) {
        if (e.target.closest('a')) { h.tutup(); return; }
        var b = e.target.closest('[data-x]'); if (!b) return; h.tutup();
        if (b.dataset.x === 'profil') self.profil(); if (b.dataset.x === 'keluar') self.keluar(); if (b.dataset.x === 'sinkron') self.infoSinkron();
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
      var dilarang = menu && ((menu.peran && menu.peran !== Store.me.peran) || (menu.atur && !Store.boleh(menu.id)));
      if (!def || dilarang) { if (dilarang) UI.toast('Menu ' + menu.label + ' tidak dibuka untuk peran ' + Store.me.peran + '.', 'warn'); nama = 'dashboard'; def = window.Halaman.dashboard; seg = ['dashboard']; if (location.hash !== '#/dashboard') history.replaceState(null, '', '#/dashboard'); }
      var ganti = nama !== this.hal;
      this.hal = nama; this.args = seg.slice(1); this.query = q;
      UI.tutupPopover(); if (ganti) UI.tutupSemua();
      this.renderNav();
      var view = document.getElementById('view'); if (!view) return;
      this.el = view;
      if (ganti || awal || !def.segarkan || def.renderUlang) {
        view.classList.remove('enter'); view.onclick = null; view.oninput = null; view.onchange = null; view.onkeydown = null;
        def.render(view, this.args, q);
        view.classList.add('enter');
        if (ganti && !awal) { window.scrollTo({ top: 0 }); }
        if (!awal) { UI.hitungNaik(view); Grafik.hidupkan(view); }
      } else if (def.navigasi) { def.navigasi(view, this.args, q); UI.pasTeks(view); }
      else { def.segarkan(view, this.args, q); UI.pasTeks(view); }
      document.title = (Store.S.APP_NAMA || 'YukBanyuwangi') + ' — ' + (menu ? menu.label : (def.judul || ''));
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
      document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (Store.me) self.cari(); } });
      document.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g && !e.target.closest('button:not([data-go]),a:not([data-go])')) { self.go(g.dataset.go); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var g = e.target.closest && e.target.closest('[data-go]'); if (g) self.go(g.dataset.go); } });
      setInterval(function () { self.indikatorSinkron(); }, 10000);
      this.badgeLonceng();
    },
    tindakan: function () {
      if (!Store.me) return [];
      var D = Store.D, today = U.hariIni(), db = HT.dashboard(D, { today: today, S: Store.S }), peran = Store.me.peran, out = [];
      db.aksi.filter(function (a) { return a.peran === peran; }).slice(0, 18).forEach(function (a) {
        var ik = { kalkulasi: 'calculator', manifest: 'clipboard-list', rekap: 'chart-column', kunci: 'lock', tagihan: 'hand-coins' }[a.jenis] || 'circle-alert';
        out.push({ ikon: ik, tone: a.jenis === 'tagihan' && a.h < 0 ? 'danger' : 'warn', judul: a.label, sub: (a.i.p ? a.i.p.Nama : (a.r ? a.r.p.Nama : '')) + ' · ' + (a.i.jadwal || ''), go: a.go });
      });
      (D.Antrean_Tugas || []).filter(function (t) { return t.Status === 'Gagal'; }).slice(0, 3).forEach(function (t) { out.push({ ikon: 'triangle-alert', tone: 'danger', judul: 'Tugas otomatis gagal: ' + (t.Jenis === 'KAL_SINKRON' ? 'sinkron Calendar' : t.Jenis === 'REKAP_SHEET' ? 'tulis rekap ke Sheet' : t.Jenis), sub: t.Hasil, go: 'log' }); });
      if (Store.info.sumberOk === false && !C.DEMO) out.unshift({ ikon: 'table-2', tone: 'danger', judul: 'Database Pemesanan tidak bisa dibaca', sub: Store.info.sumberPesan || '', go: Store.isAdmin() ? 'pengaturan/sumber' : 'pesanan' });
      return out;
    },
    badgeLonceng: function () { var b = document.getElementById('lonceng-n'); if (!b) return; var n = this.tindakan().length; b.hidden = !n; b.textContent = n > 9 ? '9+' : n; },
    lonceng: function (btn) {
      var list = this.tindakan();
      UI.popover(btn, '<div class="between" style="padding:8px 10px"><b>Perlu tindakan</b><span class="badge ' + (list.length ? 'warn' : 'ok') + '">' + list.length + '</span></div>' +
        (list.length ? '<div class="stack" style="gap:2px;max-height:60vh;overflow:auto">' + list.map(function (a) { return '<button class="menu-item" data-go="' + esc(a.go) + '" style="min-height:56px"><span class="ic-box ' + a.tone + '" style="width:36px;height:36px;border-radius:11px">' + ic(a.ikon, 18) + '</span><span class="row__text"><b class="truncate" style="display:block;font-size:13.5px">' + esc(a.judul) + '</b><small class="muted truncate" style="display:block">' + esc(a.sub) + '</small></span></button>'; }).join('') + '</div>'
          : UI.kosong('circle-check', 'Semua beres', 'Tidak ada yang perlu ditindaklanjuti.')),
        function (e) { if (e.target.closest('[data-go]')) UI.tutupPopover(); });
    },
    menuSaya: function (btn) {
      var self = this, me = Store.me;
      UI.popover(btn, '<div class="row" style="padding:10px">' + UI.avatar(me.nama, me.foto) + '<div class="row__text"><b class="truncate" style="display:block">' + esc(me.nama) + '</b><small class="muted truncate" style="display:block">' + esc(me.email) + '</small></div></div><div style="height:1px;background:var(--c-border);margin:4px 0"></div>' +
        '<button class="menu-item" data-x="profil">' + ic('user') + 'Profil & ganti PIN</button>' + (Store.isAdmin() ? '<button class="menu-item" data-x="atur">' + ic('palette') + 'Tampilan & identitas</button>' : '') +
        '<button class="menu-item" data-x="sinkron">' + ic('refresh-cw') + 'Sinkron Google Sheets</button><button class="menu-item" data-x="perf">' + ic('gauge') + 'Kecepatan koneksi</button><button class="menu-item danger" data-x="keluar">' + ic('log-out') + 'Keluar</button>',
        function (e) { var b = e.target.closest('[data-x]'); if (!b) return; UI.tutupPopover(); if (b.dataset.x === 'profil') self.profil(); if (b.dataset.x === 'keluar') self.keluar(); if (b.dataset.x === 'atur') self.go('pengaturan'); if (b.dataset.x === 'perf') self.perf(); if (b.dataset.x === 'sinkron') self.infoSinkron(); });
    },
    perf: function () {
      var rows = window.Perf.rows.filter(function (r) { return r.aksi !== 'ping'; }).slice(-12).reverse();
      UI.modal({ judul: 'Kecepatan koneksi ke server', sub: C.DEMO ? 'Mode Demo berjalan sepenuhnya di perangkat — tanpa jaringan.' : 'Total = waktu tunggu Anda; Server = kerja Apps Script; selisihnya jaringan.', ukuran: 'sm',
        isi: rows.length ? UI.tabel({ kolom: [{ key: 'aksi', label: 'Aksi' }, { label: 'Total', num: true, render: function (r) { return r.total + ' ms'; } }, { label: 'Server', num: true, render: function (r) { return r.server == null ? '-' : r.server + ' ms'; } }], baris: rows, tanpaMain: true }) : UI.kosong('zap', 'Belum ada panggilan', 'Pindah menu memakai cache perangkat sehingga tidak memanggil server.') });
    },
    profil: function () {
      var me = Store.me;
      var h = UI.modal({ judul: 'Profil saya', sub: esc(me.email) + ' · ' + esc(me.peran), ukuran: 'sm',
        isi: '<div class="row" style="margin-bottom:20px"><span id="pf-av">' + UI.avatar(me.nama, me.foto, 'lg') + '</span><div class="stack"><b>' + esc(me.nama) + '</b><button class="btn btn--soft btn--sm" id="pf-foto">' + ic('camera', 16) + 'Ubah foto</button></div></div>' +
          '<div class="stack" style="gap:12px"><b>Ganti PIN</b>' + UI.form([{ name: 'lama', label: 'PIN lama', type: 'password', attr: ' inputmode="numeric" maxlength="6" autocomplete="current-password"', full: true }, { name: 'baru', label: 'PIN baru (6 angka)', type: 'password', attr: ' inputmode="numeric" maxlength="6" autocomplete="new-password"' }, { name: 'ulang', label: 'Ulangi PIN baru', type: 'password', attr: ' inputmode="numeric" maxlength="6" autocomplete="new-password"' }]) + '</div>',
        aksi: [{ label: 'Tutup' }, { label: 'Simpan PIN', kelas: 'btn--primary', ikon: 'key-round', klik: async function (hh, b) {
          var v = UI.bacaForm(hh.body); if (!v.lama && !v.baru) return true;
          if (v.baru !== v.ulang) { UI.toast('Ulangi PIN baru tidak sama.', 'err'); return false; }
          var r = await C.aksi('pengguna.gantiPin', { lama: v.lama, baru: v.baru }, { btn: b, proses: 'Mengganti PIN' }); return r.success;
        } }] });
      h.el.querySelector('#pf-foto').onclick = async function () {
        var g = await UI.pilihGambar({ max: 320 }); if (!g) return;
        var selesai = UI.proses('Mengunggah foto');
        var up = await C.api('aset.unggah', { kind: 'profil', file: g, id: me.id }); if (!up.success) { selesai(false); UI.toast(up.message, 'err'); return; }
        var r = await C.aksi('pengguna.foto', { id: me.id, url: up.data.url }, { diamProses: true }); selesai(r.success);
        if (r.success) { me.foto = up.data.url; C.LS.set(C.DEMO ? 'yb:sesi:demo' : 'yb:sesi', Object.assign(C.LS.get(C.DEMO ? 'yb:sesi:demo' : 'yb:sesi', {}), { me: me })); h.el.querySelector('#pf-av').innerHTML = UI.avatar(me.nama, me.foto, 'lg'); var bm = document.querySelector('#btn-me .avatar'); if (bm) bm.outerHTML = UI.avatar(me.nama, me.foto); }
      };
    },

    // ------------------------------------------------------------ Cmd/Ctrl+K
    cari: function () {
      if (document.querySelector('.cmdk')) return;
      var D = Store.D, self = this, items = [];
      this.menuBoleh().filter(function (m) { return m.id; }).forEach(function (m) { items.push({ g: 'Menu', ikon: m.ikon, t: m.label, s: 'Buka halaman', go: m.id }); });
      if (Store.isAdmin()) items.push({ g: 'Aksi cepat', ikon: 'circle-plus', t: 'Tambah pesanan', s: 'Ditulis ke Google Sheets', go: 'pesanan?baru=1' }, { g: 'Aksi cepat', ikon: 'receipt', t: 'Buat invoice', s: 'Model invoice YukBanyuwangi', go: 'invoice?baru=1' });
      D.Pesanan.forEach(function (p) { var i = HT.infoPesanan(p, Store.S); items.push({ g: 'Pesanan', av: p.Nama, t: p.Nama, s: p.Trip + ' · ' + i.jadwal + ' · ' + p.Tab, go: 'pesanan/' + p.ID_Pesanan, k: [p.No_HP, p.Email, p.ID_Pesanan, p.Asal].join(' ') }); });
      D.Invoice.forEach(function (i) { var p = Store.get('Pesanan', i.ID_Pesanan) || {}; items.push({ g: 'Invoice', ikon: 'receipt', t: i.No_Invoice + ' · ' + (i.Judul || 'Invoice'), s: (p.Nama || i.Customer_ID) + ' · ' + i.Status, go: 'invoice/' + i.ID_Invoice, k: i.Customer_ID }); });
      var box = UI.el('<div class="cmdk" role="dialog" aria-label="Pencarian"><div class="cmdk__input">' + ic('search') + '<input placeholder="Cari tamu, nomor HP, invoice, menu…" aria-label="Kata kunci"><kbd>Esc</kbd></div><div class="cmdk__list"></div></div>');
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
          var vis = it.av ? UI.avatar(it.av, '', 'sm') : '<span class="ic-box" style="width:36px;height:36px;border-radius:11px">' + ic(it.ikon, 18) + '</span>';
          return head + '<div class="cmdk__item ' + (i === aktif ? 'on' : '') + '" data-i="' + i + '">' + vis + '<div class="row__text"><b class="truncate" style="display:block">' + esc(it.t) + '</b><small class="truncate" style="display:block">' + esc(it.s) + '</small></div>' + ic('chevron-right', 16, 'muted') + '</div>';
        }).join('') : UI.kosong('search', 'Tidak ditemukan', 'Coba nama tamu, nomor HP, atau nomor invoice.');
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
      return '<div class="page-head"><div class="page-head__txt">' + (o.crumbs ? '<div class="crumbs">' + o.crumbs.map(function (c, i) { return '<span>' + esc(c) + '</span>' + (i < o.crumbs.length - 1 ? ic('chevron-right', 14, 'muted') : ''); }).join('') + '</div>' : '') + '<h1>' + esc(o.judul) + '</h1>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div>' + (o.aksi ? '<div class="toolbar">' + o.aksi + '</div>' : '') + '</div>';
    },
    aksiPeta: function (el, peta, lain) {
      el.onclick = function (e) {
        var b = e.target.closest('[data-act]');
        if (b && el.contains(b)) { var f = peta[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset, b, e); return; } }
        if (lain) lain(e);
      };
    },
    hanyaAdmin: function () { if (!Store.isAdmin()) { UI.toast('Aksi ini khusus peran Admin.', 'warn'); return false; } return true; },
    hanyaFinance: function () { if (!Store.isFin()) { UI.toast('Aksi ini khusus peran Finance.', 'warn'); return false; } return true; },
    pilihPesanan: function (id, nilai, kosong, saring) {
      var S = Store.S, rows = U.urutkan(Store.D.Pesanan.filter(saring || function () { return true; }), function (p) { return U.tgl(p.Tgl_Mulai) || '0'; }, true);
      return '<select class="select" id="' + id + '" style="min-width:240px;max-width:100%">' + (kosong ? '<option value="">' + esc(kosong) + '</option>' : '') + rows.map(function (p) { var i = HT.infoPesanan(p, S); return '<option value="' + p.ID_Pesanan + '"' + (p.ID_Pesanan === nilai ? ' selected' : '') + '>' + esc(p.Nama) + ' · ' + esc(i.jadwal) + ' · ' + esc(p.Tab) + '</option>'; }).join('') + '</select>';
    },
    kartuPesanan: function (p, ekstra) {
      var i = HT.infoPesanan(p, Store.S), st = HT.statusTrip(i, U.hariIni());
      return '<div class="psn-kartu"><div class="psn-kartu__ava ' + (i.bagian === 'SB' ? 'sb' : '') + '">' + ic(i.bagian === 'SB' ? 'sailboat' : 'mountain', 22) + '</div><div class="row__text"><b class="truncate" style="display:block;font-size:16px">' + esc(p.Nama) + '</b><small class="muted truncate" style="display:block">' + esc(p.Trip) + '</small></div><div class="psn-kartu__meta">' +
        '<span>' + ic('calendar-days', 15) + esc(i.jadwal) + '</span><span>' + ic('users', 15) + i.pax + ' pax</span><span>' + ic('table-2', 15) + esc(p.Tab) + '</span>' + UI.badge(st) + (ekstra || '') + '</div></div>';
    },
    /** Alur satu pesanan: data → kalkulasi → budgeting TL → manifest → calendar → rekap (urutan kerja nyata). */
    alur: function (p) {
      var D = Store.D, S = Store.S, today = U.hariIni(), ix = HT.indeks(D), id = p.ID_Pesanan;
      var k = HT.ringkasKalkulasi(ix, id), bt = HT.budgetTL(ix, id), m = ix.mnf[id], ev = ix.evt[id], r = HT.rekapPesanan(D, ix, p, S, today), inf = r.inf;
      var undang = m ? (U.parseJson(m.Diundang, []) || []).length : 0;
      return [
        { t: 'Data pesanan', s: 'ok', sub: p.Tab, go: 'pesanan/' + id },
        { t: 'Kalkulasi', s: k.ada ? 'ok' : 'now', sub: k.ada ? 'RAB ' + U.rpRingkas(k.total) : 'Belum dibuat', go: 'kalkulasi/' + id },
        { t: 'Budgeting TL', s: bt.ada ? (bt.tersimpan ? 'ok' : 'now') : k.ada ? 'now' : '', sub: bt.ada ? U.rpRingkas(bt.terima) + ' ke TL' + (bt.tersimpan ? '' : ' · cek') : 'Belum diisi', go: 'budgettl/' + id },
        { t: 'Manifest', s: m && m.Status === 'Terbit' ? 'ok' : m && m.Status === 'Berubah' ? 'bad' : bt.ada ? 'now' : '', sub: m ? (m.Status === 'Terbit' ? 'v' + m.Versi + ' terbit' : m.Status === 'Berubah' ? 'Perlu terbit ulang' : 'Draft') : 'Belum dibuat', go: 'manifest/' + id },
        { t: 'Calendar', s: !inf.mulai ? '' : ev && ev.Status === 'Gagal' ? 'bad' : ev && ev.Status === 'OK' ? 'ok' : '', sub: !inf.mulai ? 'Tanpa tanggal' : ev ? (ev.Status === 'OK' ? (ev.Lampiran ? 'PDF terlampir' : 'Event dibuat') + (undang ? ' · ' + undang + ' TL' : '') : ev.Pesan || ev.Status) : 'Menunggu sinkron', go: 'kalender?bulan=' + (inf.bulan || '') },
        { t: 'Rekap', s: r.kunci ? 'ok' : r.status === 'Siap Dicek' ? 'now' : '', sub: r.kunci ? 'Margin dikunci' : r.status === 'Siap Dicek' ? 'Menunggu Finance' : r.selesai ? 'Lengkapi & ajukan' : 'Setelah trip', go: 'rekap?bulan=' + (inf.bulan || '') + '&id=' + id }
      ];
    },
    alurHTML: function (p, kecil) {
      return '<ol class="steps steps--6' + (kecil ? ' steps--kecil' : '') + '">' + this.alur(p).map(function (s, i) {
        return '<li class="' + s.s + '" data-go="' + esc(s.go) + '" role="link" tabindex="0"><span class="steps__dot">' + (s.s === 'ok' ? ic('check', 13) : s.s === 'bad' ? '!' : i + 1) + '</span><b>' + esc(s.t) + '</b><small>' + esc(s.sub) + '</small></li>';
      }).join('') + '</ol>';
    },
    bulanPilih: function (id, nilai, opsi) {
      opsi = opsi || {}; var today = U.hariIni(), out = [];
      for (var k = (opsi.mundur || 14); k >= -(opsi.maju || 3); k--) out.push(HT.geserBulan(today.slice(0, 7), -k));
      if (/^\d{4}-\d{2}$/.test(nilai) && out.indexOf(nilai) < 0) out.push(nilai);
      return '<select class="select" id="' + id + '" style="width:auto">' + (opsi.semua ? '<option value="semua"' + (nilai === 'semua' ? ' selected' : '') + '>Semua periode</option>' : '') + out.map(function (b) { return '<option value="' + b + '"' + (b === nilai ? ' selected' : '') + '>' + U.labelBulan(b) + '</option>'; }).join('') + '</select>';
    }
  };

  document.addEventListener('DOMContentLoaded', function () { App.mulai(); });
})();
