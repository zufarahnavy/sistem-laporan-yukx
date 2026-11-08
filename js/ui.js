/* =====================================================================
   YukX — ui.js : komponen UI (toast, modal/bottom-sheet, drawer, popover,
   konfirmasi, form, tabel→kartu, stat, count-up, unggah gambar, cmd+K)
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, esc = C.esc, ic = C.ic, F = C.F, U = C.U;
  var lapisan = [];

  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  // ---------------------------------------------------------------- toast
  function toast(msg, tone, ms) {
    if (!msg) return; tone = tone || 'ok';
    var box = document.getElementById('toasts');
    var ikon = { ok: 'circle-check', err: 'circle-alert', warn: 'triangle-alert', info: 'info' }[tone] || 'info';
    var t = el('<div class="toast ' + tone + '" role="status">' + ic(ikon, 20) + '<div>' + esc(msg) + '</div></div>');
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 260); }, ms || (tone === 'err' ? 5200 : 3200));
  }

  // ---------------------------------------------------------------- lapisan (modal/drawer)
  function scrim(onClick) { var s = el('<div class="scrim"></div>'); document.body.appendChild(s); requestAnimationFrame(function () { s.classList.add('show'); }); s.addEventListener('click', onClick); return s; }
  function kunciScroll(on) { document.documentElement.style.overflow = on ? 'hidden' : ''; }
  function fokusPertama(box) { var f = box.querySelector('[autofocus],input:not([type=hidden]):not([disabled]),select,textarea,button.btn--primary'); if (f && window.innerWidth > 720) setTimeout(function () { f.focus({ preventScroll: true }); }, 60); }

  function modal(o) {
    var prevFocus = document.activeElement;
    var aksi = (o.aksi || []).map(function (a, i) { return '<button type="button" class="btn ' + (a.kelas || 'btn--ghost') + '" data-i="' + i + '">' + (a.ikon ? ic(a.ikon, 18) : '') + '<span>' + esc(a.label) + '</span></button>'; }).join('');
    var m = el('<div class="modal modal--' + (o.ukuran || 'md') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.judul) + '"><div class="grabber"></div>' +
      '<div class="modal__head"><div class="grow"><h2>' + esc(o.judul) + '</h2>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div><button class="icon-btn" data-tutup aria-label="Tutup">' + ic('x') + '</button></div>' +
      '<div class="modal__body">' + (o.isi || '') + '</div>' + (aksi ? '<div class="modal__foot">' + aksi + '</div>' : '') + '</div>');
    var h = { el: m, body: m.querySelector('.modal__body'), tutup: tutup, ditutup: false };
    var s = scrim(function () { if (!o.wajib) tutup(); });
    document.body.appendChild(m); kunciScroll(true);
    requestAnimationFrame(function () { m.classList.add('show'); });
    m.querySelector('[data-tutup]').onclick = tutup;
    m.querySelectorAll('.modal__foot [data-i]').forEach(function (b) {
      b.onclick = async function () { var a = o.aksi[+b.dataset.i]; if (a.klik) { var r = await a.klik(h, b); if (r === false) return; } if (a.tutup !== false) tutup(); };
    });
    // geser turun untuk menutup (bottom sheet ponsel)
    var gr = m.querySelector('.grabber'), y0 = null;
    gr.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    gr.addEventListener('touchmove', function (e) { if (y0 == null) return; var dy = Math.max(0, e.touches[0].clientY - y0); m.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
    gr.addEventListener('touchend', function (e) { var dy = parseFloat((m.style.transform.match(/\d+/) || [0])[0]); m.style.transform = ''; if (dy > 90) tutup(); y0 = null; });
    function tutup() {
      if (h.ditutup) return; h.ditutup = true;
      m.classList.remove('show'); s.classList.remove('show');
      setTimeout(function () { m.remove(); s.remove(); }, 300);
      lapisan = lapisan.filter(function (x) { return x !== h; }); if (!lapisan.length) kunciScroll(false);
      if (o.onTutup) o.onTutup(); if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    }
    lapisan.push(h);
    if (o.onBuka) o.onBuka(h);
    fokusPertama(m);
    return h;
  }

  function drawer(o) {
    var d = el('<aside class="drawer" role="dialog" aria-modal="true"><div class="drawer__head">' + (o.kepala || '') + '</div><div class="drawer__body">' + (o.isi || '') + '</div>' + (o.kaki ? '<div class="drawer__foot">' + o.kaki + '</div>' : '') + '</aside>');
    var h = { el: d, tutup: tutup, ditutup: false };
    var s = scrim(tutup); document.body.appendChild(d); kunciScroll(true);
    requestAnimationFrame(function () { d.classList.add('show'); });
    function tutup() { if (h.ditutup) return; h.ditutup = true; d.classList.remove('show'); s.classList.remove('show'); setTimeout(function () { d.remove(); s.remove(); }, 350); lapisan = lapisan.filter(function (x) { return x !== h; }); if (!lapisan.length) kunciScroll(false); if (o.onTutup) o.onTutup(); }
    d.addEventListener('click', function (e) { if (e.target.closest('[data-tutup]')) tutup(); });
    lapisan.push(h); if (o.onBuka) o.onBuka(h);
    return h;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lapisan.length) { lapisan[lapisan.length - 1].tutup(); } });
  function tutupSemua() { lapisan.slice().forEach(function (h) { h.tutup(); }); }

  function konfirmasi(o) {
    return new Promise(function (res) {
      var isi = '<p class="muted" style="margin-bottom:12px">' + (o.teks || '') + '</p>' + (o.input ? '<div class="field"><label>' + esc(o.input.label) + (o.input.wajib ? ' <span class="req">*</span>' : '') + '</label>' + (o.input.area ? '<textarea class="textarea" id="kf-in" placeholder="' + esc(o.input.placeholder || '') + '"></textarea>' : '<input class="input" id="kf-in" placeholder="' + esc(o.input.placeholder || '') + '" value="' + esc(o.input.nilai || '') + '">') + '<div class="err" id="kf-err"></div></div>' : '');
      var selesai = false;
      modal({ judul: o.judul, isi: isi, ukuran: 'sm', onTutup: function () { if (!selesai) res(false); },
        aksi: [{ label: o.batal || 'Batal', kelas: 'btn--ghost' }, { label: o.ok || 'Ya, lanjutkan', kelas: o.bahaya ? 'btn--danger' : 'btn--primary', ikon: o.ikon, klik: function (h) {
          var v = true; if (o.input) { v = h.el.querySelector('#kf-in').value.trim(); if (o.input.wajib && !v) { h.el.querySelector('#kf-err').textContent = 'Wajib diisi.'; h.el.querySelector('#kf-in').classList.add('is-err'); return false; } }
          selesai = true; res(v);
        } }] });
    });
  }

  function popover(anchor, html, onClick) {
    tutupPopover();
    var p = el('<div class="popover">' + html + '</div>'); document.body.appendChild(p);
    var r = anchor.getBoundingClientRect(), w = p.offsetWidth;
    var left = Math.min(Math.max(12, r.right - w), window.innerWidth - w - 12), top = r.bottom + 8;
    if (top + p.offsetHeight > window.innerHeight - 12) top = Math.max(12, r.top - p.offsetHeight - 8);
    p.style.left = left + 'px'; p.style.top = top + 'px';
    requestAnimationFrame(function () { p.classList.add('show'); });
    p.addEventListener('click', function (e) { if (onClick) onClick(e, p); });
    setTimeout(function () { document.addEventListener('click', luar, true); }, 0);
    function luar(e) { if (!p.contains(e.target)) { tutupPopover(); } }
    UI._pop = { el: p, luar: luar };
    return p;
  }
  function tutupPopover() { if (UI._pop) { var p = UI._pop; document.removeEventListener('click', p.luar, true); p.el.classList.remove('show'); setTimeout(function () { p.el.remove(); }, 200); UI._pop = null; } }

  // ---------------------------------------------------------------- form
  function rupiahKetik(inp) {
    inp.addEventListener('input', function () { var n = inp.value.replace(/[^0-9]/g, ''); inp.value = n ? Number(n).toLocaleString('id-ID') : ''; inp.dispatchEvent(new Event('rupiah')); });
  }
  function form(fields, v) {
    v = v || {};
    return '<div class="form">' + fields.map(function (f) {
      if (f.html) return '<div class="field ' + (f.full ? 'field--full' : '') + '">' + f.html + '</div>';
      var val = v[f.name] != null ? v[f.name] : (f.nilai != null ? f.nilai : ''), id = 'f-' + f.name, inp;
      var attrs = ' id="' + id + '" name="' + f.name + '"' + (f.wajib ? ' required' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.disabled ? ' disabled' : '') + (f.attr || '');
      if (f.type === 'select') inp = '<select class="select"' + attrs + '>' + (f.kosong ? '<option value="">' + esc(f.kosong) + '</option>' : '') + (f.opsi || []).map(function (o) {
        if (o.grup) return '<optgroup label="' + esc(o.grup) + '">' + o.opsi.map(function (x) { return '<option value="' + esc(x.v) + '"' + (String(x.v) === String(val) ? ' selected' : '') + '>' + esc(x.l) + '</option>'; }).join('') + '</optgroup>';
        var ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
      else if (f.type === 'textarea') inp = '<textarea class="textarea" rows="' + (f.rows || 3) + '"' + attrs + '>' + esc(val) + '</textarea>';
      else if (f.type === 'rupiah') inp = '<div class="input-group"><span class="addon">Rp</span><input class="input num" inputmode="numeric" data-rupiah' + attrs + ' value="' + (val !== '' ? Number(val).toLocaleString('id-ID') : '') + '"></div>';
      else if (f.type === 'switch') inp = '<label class="switch"><input type="checkbox"' + attrs + (val === true || val === 'YA' ? ' checked' : '') + '><span class="track"></span><span>' + esc(f.teks || '') + '</span></label>';
      else inp = (f.ikon ? '<div class="input-ic">' + ic(f.ikon, 18) : '') + '<input class="input" type="' + (f.type || 'text') + '"' + attrs + ' value="' + esc(val) + '"' + (f.type === 'tel' ? ' inputmode="tel"' : '') + '>' + (f.ikon ? '</div>' : '');
      return '<div class="field ' + (f.full ? 'field--full' : '') + '"><label for="' + id + '"><span>' + esc(f.label) + (f.wajib ? ' <span class="req">*</span>' : '') + '</span>' + (f.labelKanan || '') + '</label>' + inp + (f.help ? '<div class="help">' + f.help + '</div>' : '') + '<div class="err" data-err="' + f.name + '"></div></div>';
    }).join('') + '</div>';
  }
  function siapkanForm(root) { root.querySelectorAll('[data-rupiah]').forEach(rupiahKetik); }
  function bacaForm(root) {
    var o = {};
    root.querySelectorAll('[name]').forEach(function (i) {
      if (i.type === 'checkbox') o[i.name] = i.checked;
      else if (i.hasAttribute('data-rupiah')) o[i.name] = Number(String(i.value).replace(/[^0-9]/g, '')) || 0;
      else o[i.name] = i.value;
    });
    return o;
  }
  function cekWajib(root) {
    var ok = true;
    root.querySelectorAll('[required]').forEach(function (i) {
      var e = root.querySelector('[data-err="' + i.name + '"]'), kosong = !String(i.value).trim();
      i.classList.toggle('is-err', kosong); if (e) e.textContent = kosong ? 'Wajib diisi.' : '';
      if (kosong && ok) { ok = false; i.focus(); }
    });
    return ok;
  }

  // ---------------------------------------------------------------- tabel & potongan UI
  function tabel(o) {
    if (!o.baris.length) return kosong(o.kosongIkon || 'inbox', o.kosong || 'Belum ada data', o.kosongTeks || '');
    var head = '<thead><tr>' + o.kolom.map(function (k) { return '<th class="' + (k.num ? 'num' : '') + (k.center ? ' center' : '') + '">' + esc(k.label) + '</th>'; }).join('') + '</tr></thead>';
    var body = '<tbody>' + o.baris.map(function (r, i) {
      if (r.__grup) return '<tr class="row-group"><td colspan="' + o.kolom.length + '" data-label="">' + r.__grup + '</td></tr>';
      var kelas = [o.klik ? 'click' : '', o.kelasBaris ? o.kelasBaris(r) || '' : ''].join(' ').trim();
      return '<tr' + (kelas ? ' class="' + kelas + '"' : '') + (o.klik ? ' data-row="' + esc(o.klik(r)) + '" tabindex="0"' : '') + '>' + o.kolom.map(function (k, j) {
        var v = k.render ? k.render(r, i) : esc(r[k.key]); return '<td class="' + (k.num ? 'num' : '') + (k.center ? ' center' : '') + (j === 0 && !o.tanpaMain ? ' main' : '') + (k.cls ? ' ' + k.cls : '') + '" data-label="' + esc(k.mlabel != null ? k.mlabel : k.label) + '">' + v + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<div class="table-wrap"><table>' + head + body + (o.foot || '') + '</table></div>';
  }
  function kosong(ikon, judul, teks, aksi) { return '<div class="empty fade"><div class="ic-box">' + ic(ikon, 26) + '</div><b>' + esc(judul) + '</b>' + (teks ? '<p>' + teks + '</p>' : '') + (aksi || '') + '</div>'; }
  function avatar(nama, foto, ukuran) {
    var cls = 'avatar ' + (ukuran || '') + ' ' + F.av(nama);
    if (foto) return '<span class="' + cls + '"><img src="' + esc(foto) + '" alt="" width="36" height="36" loading="lazy" onerror="this.parentNode.textContent=\'' + esc(U.inisial(nama)) + '\'"></span>';
    return '<span class="' + cls + '">' + esc(U.inisial(nama)) + '</span>';
  }
  var TONE = { 'Lunas': 'ok', 'Terverifikasi': 'ok', 'Final': 'ok', 'Aktif': 'ok', 'Terkirim': 'ok', 'Selesai': 'ok', 'Open': 'info', 'Berjalan': 'solid', 'Terbit': 'info', 'DP': 'info', 'Booking': 'warn', 'Menunggu': 'warn', 'Menunggu Audit': 'warn', 'Perlu Audit Ulang': 'warn', 'Draft': 'neutral', 'Antri': 'neutral', 'Proses': 'info', 'Digantikan': 'neutral', 'Batal': 'danger', 'Ditolak': 'danger', 'Gagal': 'danger', 'Perlu Revisi': 'danger', 'Dihapus': 'danger', 'Nonaktif': 'neutral', 'Belum Ada Realisasi': 'neutral', 'Jatuh Tempo': 'danger', 'Dihentikan': 'neutral' };
  var IKON_STATUS = { ok: 'circle-check', warn: 'clock', danger: 'circle-x', info: 'circle', neutral: 'circle', solid: 'activity' };
  function badge(teks, tone, ikon) { tone = tone || TONE[teks] || 'info'; return '<span class="badge ' + tone + '">' + (ikon !== false ? ic(ikon || IKON_STATUS[tone] || 'circle', 14) : '') + esc(teks) + '</span>'; }
  function stat(o) {
    return '<div class="card stat lift press ' + (o.hero ? 'stat--hero' : '') + (o.ink ? ' stat--ink' : '') + ' ' + (o.cls || '') + '"' + (o.go ? ' data-go="' + o.go + '" role="link" tabindex="0" style="cursor:pointer"' : '') + '>' +
      '<div class="stat__top"><div class="stat__title"><span class="label">' + esc(o.label) + '</span>' + (o.judul ? '<b>' + esc(o.judul) + '</b>' : '') + '</div>' +
      (o.hero ? '<span class="round-ic">' + ic('arrow-up-right', 20) + '</span>' : (o.ikon ? '<span class="ic-box ' + (o.tone || '') + '">' + ic(o.ikon, 22) + '</span>' : '')) + '</div>' +
      '<div class="stat__val' + (o.valCls ? ' ' + o.valCls : '') + '"' + (o.valTitle ? ' title="' + esc(o.valTitle) + '"' : '') + '>' + o.nilai + '</div>' +
      (o.kaki ? '<div class="stat__foot">' + o.kaki + '</div>' : '') + '</div>';
  }
  function hitung(n, fmt) { return '<span class="count num" data-to="' + n + '" data-fmt="' + (fmt || 'n') + '">' + formatAngka(n, fmt) + '</span>'; }
  function formatAngka(n, fmt) { return fmt === 'rp' ? U.rp(n) : fmt === 'rpS' ? U.rpRingkas(n) : fmt === 'pct' ? F.persen(n) : Math.round(n).toLocaleString('id-ID'); }
  // Angka besar (Rp ratusan juta) tetap utuh: font diperkecil sampai muat, bukan dipotong "…"
  function pasTeks(root) {
    (root || document).querySelectorAll('.stat__val').forEach(function (e) {
      if (e.querySelector('.count[data-jalan]')) return; // sedang animasi hitung naik → ukuran sudah diukur dari nilai akhir
      e.style.fontSize = ''; var w = e.clientWidth, s = e.scrollWidth;
      if (w && s > w + 1) { var f = parseFloat(getComputedStyle(e).fontSize); e.style.fontSize = Math.max(f * 0.6, Math.floor(f * w / s * 0.98)) + 'px'; }
    });
  }
  var _pasT; window.addEventListener('resize', function () { clearTimeout(_pasT); _pasT = setTimeout(function () { pasTeks(document.getElementById('view')); }, 150); });
  function hitungNaik(root) {
    pasTeks(root);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    (root || document).querySelectorAll('.count[data-to]').forEach(function (e) {
      var to = Number(e.dataset.to), fmt = e.dataset.fmt, t0 = performance.now(), dur = 900;
      if (!to || e.dataset.jalan) return; e.dataset.jalan = '1';
      (function step(t) { var p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3); e.textContent = formatAngka(to * k, fmt); if (p < 1 && e.isConnected) requestAnimationFrame(step); else { e.textContent = formatAngka(to, fmt); delete e.dataset.jalan; } })(t0);
    });
  }

  // ---------------------------------------------------------------- unggah gambar (diperkecil di browser)
  function toB64(b) { return new Promise(function (r) { var f = new FileReader(); f.onload = function () { r(f.result.split(',')[1]); }; f.readAsDataURL(b); }); }
  async function perkecil(file, max, type, q) {
    if (file.type === 'image/svg+xml') return { name: file.name, mime: file.type, b64: await toB64(file) };
    var bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    var c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    var blob = await new Promise(function (r) { c.toBlob(r, type || 'image/webp', q || 0.85); });
    return { name: file.name.replace(/\.\w+$/, '.webp'), mime: type || 'image/webp', b64: await toB64(blob), w: c.width, h: c.height };
  }
  function pilihGambar(o) {
    o = o || {};
    return new Promise(function (res) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = o.svg ? 'image/png,image/jpeg,image/webp,image/svg+xml' : 'image/png,image/jpeg,image/webp';
      inp.onchange = async function () {
        var f = inp.files[0]; if (!f) return res(null);
        if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type) || (f.type === 'image/svg+xml' && !o.svg)) { toast('Format tidak didukung. Pakai PNG, JPG' + (o.svg ? ', WebP, atau SVG.' : ', atau WebP.'), 'err'); return res(null); }
        try { var r = await perkecil(f, o.max || 512, o.mime, o.q); if (r.b64.length > 2.8 * 1024 * 1024) { toast('Gambar masih lebih dari 2 MB setelah diperkecil.', 'err'); return res(null); } res(r); }
        catch (e) { toast('Gagal membaca gambar: ' + e.message, 'err'); res(null); }
      };
      inp.click();
    });
  }

  window.UI = { el: el, toast: toast, modal: modal, drawer: drawer, konfirmasi: konfirmasi, popover: popover, tutupPopover: tutupPopover, tutupSemua: tutupSemua, form: form, siapkanForm: siapkanForm, bacaForm: bacaForm, cekWajib: cekWajib,
    tabel: tabel, kosong: kosong, avatar: avatar, badge: badge, TONE: TONE, stat: stat, hitung: hitung, hitungNaik: hitungNaik, pasTeks: pasTeks, pilihGambar: pilihGambar, perkecil: perkecil };
})();
