/* =====================================================================
   YukX — core.js : util, store (SWR), API (fetch ke GAS), optimistic UI,
   pekerja antrean (PDF/Calendar/notifikasi), router SPA, tema.
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var DEMO = !CFG.GAS_URL || /GANTI|XXXX/i.test(CFG.GAS_URL);
  var U = YX.util, HT = YX.hitung;

  // ---------------------------------------------------------------- util
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(name, size, cls) {
    var b = (window.ICONS || {})[name];
    if (!b) { console.warn('Ikon hilang:', name); b = '<circle cx="12" cy="12" r="9"/>'; }
    var s = size || 20;
    return '<svg class="i ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + b + '</svg>';
  }
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  function uuid() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
    catch (e) { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  }
  // SHA-256 sinkron (hanya untuk Mode Demo — produksi memakai hash iteratif di server)
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, mw = mp(2, 32), res = '', words = [], bl = ascii.length * 8, h = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], pl = k.length, ic2 = {};
    for (var c = 2; pl < 64; c++) { if (!ic2[c]) { for (var i = 0; i < 313; i += c) ic2[i] = c; h[pl] = (mp(c, .5) * mw) | 0; k[pl++] = (mp(c, 1 / 3) * mw) | 0; } }
    ascii = unescape(encodeURIComponent(ascii)); bl = ascii.length * 8; ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) { var j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((bl / mw) | 0); words[words.length] = (bl);
    var hash = h.slice(0, 8);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oh = hash; hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oh[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; res += ((b < 16) ? 0 : '') + b.toString(16); }
    return res;
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Format tampilan
  var F = {
    rp: U.rp, rpS: U.rpRingkas, tgl: U.tglId, tglP: U.tglPanjang, rentang: U.rentangTgl,
    rpTip: function (n) { return '<span class="num" title="' + U.rp(n) + '">' + (window.innerWidth <= 720 && Math.abs(n) >= 1e7 ? U.rpRingkas(n) : U.rp(n)) + '</span>'; },
    persen: function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ',') + '%'; },
    jam: function (iso) { return iso ? String(iso).slice(11, 16) : ''; },
    relatif: function (iso) {
      if (!iso) return '-'; var now = U.nowIso().replace('T', ' '), d = (new Date(now.replace(' ', 'T') + 'Z') - new Date(String(iso).slice(0, 19) + 'Z')) / 1000;
      if (isNaN(d)) return iso; if (d < 60) return 'baru saja'; if (d < 3600) return Math.floor(d / 60) + ' mnt lalu'; if (d < 86400) return Math.floor(d / 3600) + ' jam lalu';
      if (d < 86400 * 7) return Math.floor(d / 86400) + ' hari lalu'; return U.tglId(iso);
    },
    waktu: function (iso) { return iso ? U.tglId(iso) + (String(iso).length > 10 ? ', ' + String(iso).slice(11, 16) : '') : '-'; },
    av: function (nama) { var s = 0; String(nama || '').split('').forEach(function (c) { s += c.charCodeAt(0); }); return 'av-' + (s % 6 + 1); }
  };

  // ---------------------------------------------------------------- store
  var Store = {
    D: null, S: {}, me: null, ver: '', info: {}, token: '', busy: 0,
    kunciCache: function () { return 'yukx:cache:' + (DEMO ? 'demo' : (this.me ? this.me.email : 'anon')); },
    setBoot: function (b) {
      this.D = b.D; this.S = b.S || {}; this.ver = b.ver || ''; this.info = b.info || {};
      if (b.me) this.me = b.me;
      this.simpanCache();
    },
    simpanCache: debounce(function () {
      if (DEMO) { LS.set('yukx:demo:db', { D: Store.D, t: Date.now(), v: YX.VERSI }); return; }
      LS.set(Store.kunciCache(), { D: Store.D, S: Store.S, ver: Store.ver, info: Store.info, me: Store.me, t: Date.now() });
    }, 400),
    terapkan: function (res) {
      var D = this.D; if (!D || !res) return;
      var ch = res.changes || {}, rm = res.removed || {};
      Object.keys(ch).forEach(function (t) {
        var key = YX.SKEMA[t].key, arr = D[t] = D[t] || [], idx = {};
        arr.forEach(function (r, i) { idx[r[key]] = i; });
        ch[t].forEach(function (row) { if (idx[row[key]] !== undefined) arr[idx[row[key]]] = row; else arr.push(row); });
      });
      Object.keys(rm).forEach(function (t) { var key = YX.SKEMA[t].key; D[t] = (D[t] || []).filter(function (r) { return rm[t].indexOf(r[key]) < 0; }); });
      if (ch.Pengaturan) { var S = this.S; ch.Pengaturan.forEach(function (r) { S[r.Kunci] = r.Nilai; }); Tema.terapkan(S); }
      if (res.ver) this.ver = res.ver;
      this.simpanCache();
    },
    S_: function () { var o = {}; Object.keys(YX.PENGATURAN_DEFAULT).forEach(function (k) { o[k] = YX.PENGATURAN_DEFAULT[k][0]; }); (this.D ? this.D.Pengaturan : []).forEach(function (r) { o[r.Kunci] = r.Nilai; }); return o; },
    isAdmin: function () { return this.me && this.me.peran === 'Admin'; },
    isFin: function () { return this.me && this.me.peran === 'Finance'; },
    get: function (t, id) { var k = YX.SKEMA[t].key; return (this.D[t] || []).find(function (r) { return String(r[k]) === String(id); }) || null; }
  };

  // Host lokal untuk engine (Mode Demo & optimistic UI)
  function hostLokal(D) {
    return {
      db: {
        all: function (t) { return D[t] || (D[t] = []); },
        insert: function (t, rows) { (D[t] = D[t] || []).push.apply(D[t], rows); },
        update: function (t, key, id, patch) { var r = (D[t] || []).find(function (x) { return String(x[key]) === String(id); }); if (r) Object.assign(r, patch); return r; },
        remove: function (t, key, id) { var a = D[t] || [], i = a.findIndex(function (x) { return String(x[key]) === String(id); }); if (i > -1) a.splice(i, 1); }
      },
      now: function () { return new Date(); }, uuid: uuid,
      hash: function (pin, salt) { return sha256(salt + ':' + pin); },
      waSiap: function () { return DEMO ? true : !!Store.info.waSiap; },
      sisaEmail: function () { return 100; }
    };
  }

  // ---------------------------------------------------------------- API
  var Perf = { rows: [], add: function (a, t, s) { this.rows.push({ aksi: a, total: t, server: s == null ? null : s, net: s == null ? null : t - s }); if (this.rows.length > 120) this.rows.shift(); }, table: function () { console.table(this.rows.slice(-30)); } };
  window.Perf = Perf;
  var BACA = /^(boot|ping|verifikasi\.publik|sistem\.status|template\.daftar|wa\.audiens|wa\.device|import\.pindai)$/;

  async function apiOnce(action, data, timeout, reqId) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, timeout), t0 = performance.now();
    try {
      var res = await fetch(CFG.GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: Store.token || '', reqId: reqId, data: data || {} }) });
      var text = await res.text();
      try { var j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
      catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429, message: 'Server membalas bukan JSON (HTTP ' + res.status + '). Pastikan URL /exec benar & deployment "Anyone".' }; }
    } catch (err) {
      return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus. Periksa internet Anda.' };
    } finally { clearTimeout(timer); }
  }
  async function api(action, data, opt) {
    opt = opt || {};
    if (DEMO) return Demo.call(action, data || {});
    var baca = BACA.test(action), reqId = baca ? '' : (opt.reqId || uuid()), tries = baca ? 3 : 2, res;
    for (var i = 0; i < tries; i++) {
      if (i) { await sleep(1200 * i); }
      res = await apiOnce(action, data, opt.timeout || (baca ? (i ? 40000 : 25000) : 90000), reqId);
      if (res.success || !res.retryable) break;
    }
    if (!res.success && res.data && res.data.code === 'AUTH') { App.sesiBerakhir(); }
    return res;
  }

  // Antrean tulis berurutan → optimistic aman (tidak saling timpa)
  var rantai = Promise.resolve();
  function aksi(action, data, opt) {
    opt = opt || {};
    var p = rantai.then(function () { return aksiJalan(action, data, opt); });
    rantai = p.catch(function () { });
    return p;
  }
  var TANPA_OPTIMIS = /^(pengguna\.|wa\.|notif\.|crm\.sync|rekap\.hitungUlang)/;
  async function aksiJalan(action, data, opt) {
    var btn = opt.btn, label;
    if (btn) { label = btn.innerHTML; btn.classList.add('loading'); btn.innerHTML = ic('loader-circle', 18, 'spin') + '<span>' + (opt.loadingText || 'Memproses…') + '</span>'; }
    Store.busy++;
    try {
      var engine = !!YX.ROUTES[action], res;
      if (engine && (DEMO || !TANPA_OPTIMIS.test(action))) {
        var snap = JSON.stringify(Store.D);
        var lok = YX.jalankan(hostLokal(Store.D), Store.me, action, data);
        if (!lok.success) { Store.D = JSON.parse(snap); if (!opt.diam) UI.toast(lok.message, 'err'); return lok; }
        if (DEMO) {
          Store.simpanCache(); App.segarkan();
          if (lok.message && !opt.diam) UI.toast(lok.message, 'ok');
          if ((lok.jobs && lok.jobs.length) || lok.nq) Pekerja.jalan();
          return lok;
        }
        App.segarkan();                               // tampil instan (optimistic)
        res = await api(action, data);
        Store.D = JSON.parse(snap);                     // buang tebakan lokal…
        if (res.success) Store.terapkan(res);           // …pakai hasil resmi server
        App.segarkan();
      } else {
        res = await api(action, data);
        if (res.success) { Store.terapkan(res); App.segarkan(); }
      }
      if (!opt.diam) UI.toast(res.message || (res.success ? 'Tersimpan.' : 'Gagal.'), res.success ? 'ok' : 'err');
      if (res.success && ((res.jobs && res.jobs.length) || res.nq)) Pekerja.jalan();
      return res;
    } finally {
      Store.busy--;
      if (btn && btn.isConnected) { btn.classList.remove('loading'); btn.innerHTML = label; }
    }
  }

  // ---------------------------------------------------------------- pekerja antrean
  var Pekerja = {
    aktif: false,
    jalan: async function () {
      if (this.aktif) { this.lagi = true; return; }
      this.aktif = true; this.lagi = false;
      try {
        for (var putaran = 0; putaran < 8; putaran++) {
          var r = await api('tugas.proses', {});
          if (r && r.success) { Store.terapkan(r); App.segarkan(); }
          var sisa = r && r.data ? r.data.sisa : 0;
          if (!sisa && !this.lagi) break; this.lagi = false;
          if (r && !r.success) break;
        }
        var n = await api('notif.proses', {});
        if (n && n.success) { Store.terapkan(n); App.segarkan(); }
      } finally { this.aktif = false; }
    }
  };

  // ---------------------------------------------------------------- tema
  var FONTS = ['Plus Jakarta Sans', 'Poppins', 'Inter', 'Outfit', 'Manrope', 'DM Sans', 'Nunito', 'Sora', 'Lexend', 'Figtree', 'Urbanist', 'Montserrat'];
  function campur(hex, ke, p) {
    function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    var a = rgb(hex), b = rgb(ke); return '#' + a.map(function (v, i) { return ('0' + Math.round(v + (b[i] - v) * p).toString(16)).slice(-2); }).join('');
  }
  var Tema = {
    vars: function (S) {
      var p = U.paletAktif(S || {});
      return { '--c-primary': p.primary, '--c-primary-dark': p.primaryDark, '--c-primary-soft': p.primarySoft, '--c-primary-hover': campur(p.primary, '#000000', .14),
        '--c-primary-tint': campur(p.primary, '#ffffff', .9), '--c-primary-tint-2': campur(p.primary, '#ffffff', .8), '--c-bg': p.bg, '--c-surface': p.surface, '--c-text': p.text, '--c-text-muted': p.muted, '--c-accent': p.accent,
        '--c-ink': campur(p.primaryDark, '#000000', .45), '--c-ink-2': campur(p.primaryDark, '#000000', .2),
        '--font-body': "'" + (S.FONT_BODY || FONTS[0]) + "',system-ui,-apple-system,'Segoe UI',sans-serif", '--font-head': "'" + (S.FONT_HEAD || S.FONT_BODY || FONTS[0]) + "',system-ui,sans-serif" };
    },
    terapkan: function (S, simpan) {
      var v = this.vars(S), root = document.documentElement, gelap = root.getAttribute('data-theme') === 'dark';
      Object.keys(v).forEach(function (k) {
        if (gelap && /--c-(bg|surface|text|text-muted|primary-tint|primary-tint-2|ink|ink-2)$/.test(k)) { root.style.removeProperty(k); return; }
        root.style.setProperty(k, v[k]);
      });
      this.muatFont([S.FONT_BODY, S.FONT_HEAD]);
      document.title = (S.APP_NAMA || 'YukX') + ' — ' + (S.APP_TAGLINE || 'Report Automation');
      var fav = document.getElementById('favicon'); if (fav) fav.href = S.FAVICON_URL || 'assets/favicon.png';
      if (simpan !== false) LS.set('yukx:tema', { vars: v, fonts: [S.FONT_BODY, S.FONT_HEAD], title: document.title, fav: S.FAVICON_URL || '' });
    },
    muatFont: function (list) {
      (list || []).forEach(function (f) {
        if (!f || f === 'Plus Jakarta Sans') return; var id = 'font-' + f.replace(/\s/g, '-'); if (document.getElementById(id)) return;
        var l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/\s/g, '+') + ':wght@400;500;600;700;800&display=swap'; document.head.appendChild(l);
      });
    },
    gelap: function (on) {
      var root = document.documentElement; root.setAttribute('data-theme', on ? 'dark' : 'light');
      LS.set('yukx:gelap', !!on); this.terapkan(Store.S, false);
    },
    FONTS: FONTS
  };

  window.Halaman = window.Halaman || {};
  window.Core = { DEMO: DEMO, CFG: CFG, esc: esc, ic: ic, LS: LS, uuid: uuid, sha256: sha256, debounce: debounce, sleep: sleep, F: F, Store: Store, hostLokal: hostLokal, api: api, aksi: aksi, Pekerja: Pekerja, Tema: Tema, U: U, HT: HT };
})();
