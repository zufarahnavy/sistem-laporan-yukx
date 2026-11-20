/* =====================================================================
   YukBanyuwangi — Budgeting Tim Lapang
   Rencana anggaran yang DIPEGANG Tim Lapang untuk satu trip: KETERANGAN,
   BUDGET, TERIMA TL (boleh dengan judul grup). Inilah tabel BUDGETING di
   PDF manifest. Terpisah dari Kalkulasi (RAB kantor untuk realisasi &
   rekap): bisa diisi manual atau disalin dari item kalkulasi lalu diubah.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, U = C.U, HT = C.HT;
  var st = { daftar: 'perlu', id: '', items: [], pax: 0, catatan: '', asal: 'Manual', kotor: false };

  function angka(v) { var x = String(v == null ? '' : v).replace(/\D/g, ''); return x === '' ? '' : Number(x); }
  function rp0(v) { return v === '' || v == null ? '' : Number(v).toLocaleString('id-ID'); }
  function terimaDari(x) { return x.judul ? 0 : (x.terima === '' || x.terima == null ? Number(x.budget) || 0 : Number(x.terima) || 0); }
  function hitung() {
    var isi = st.items.filter(function (x) { return !x.judul && String(x.uraian || '').trim(); });
    return { n: isi.length, budget: isi.reduce(function (a, x) { return a + (Number(x.budget) || 0); }, 0), terima: isi.reduce(function (a, x) { return a + terimaDari(x); }, 0) };
  }

  // ---------------------------------------------------------------- muat
  function muat(id) {
    var ix = HT.indeks(Store.D), p = ix.psn[id], bt = HT.budgetTL(ix, id), k = HT.ringkasKalkulasi(ix, id), inf = HT.infoPesanan(p, Store.S);
    st.id = id; st.kotor = false; st.asal = bt.tersimpan ? (bt.row.Asal || 'Manual') : (bt.asal || 'Manual');
    st.items = bt.items.map(function (x) { return x.judul ? { uraian: x.uraian, judul: true } : { uraian: x.uraian, budget: x.budget, terima: x.sama ? '' : x.terima }; });
    st.pax = bt.pax || (k.ada ? Number(k.k.Pax) : 0) || inf.pax; st.catatan = bt.catatan || '';
    st.bt = bt;
  }

  // ---------------------------------------------------------------- tabel isian
  function barisHTML(x, i) {
    var akhir = st.items.length - 1;
    var urut = '<span class="bt__urut"><button class="icon-btn" data-bt="naik" aria-label="Pindah ke atas"' + (i === 0 ? ' disabled' : '') + '>' + ic('arrow-up', 16) + '</button><button class="icon-btn" data-bt="turun" aria-label="Pindah ke bawah"' + (i === akhir ? ' disabled' : '') + '>' + ic('arrow-down', 16) + '</button></span>';
    if (x.judul) return '<div class="bt bt--judul" data-i="' + i + '">' + urut + '<label class="bt__ket"><span class="sr-only">Judul grup</span><input class="input" data-f="uraian" value="' + esc(x.uraian) + '" placeholder="Judul grup, mis. MAN POWER" autocomplete="off"></label><span class="bt__tanda">' + ic('heading', 15) + 'Judul grup</span><button class="icon-btn bt__hapus" data-bt="hapus" aria-label="Hapus baris">' + ic('trash-2', 18) + '</button></div>';
    return '<div class="bt" data-i="' + i + '">' + urut +
      '<label class="bt__ket"><span class="sr-only">Keterangan</span><input class="input" data-f="uraian" value="' + esc(x.uraian) + '" placeholder="Keterangan, mis. DRIVER TL" autocomplete="off"></label>' +
      '<label class="bt__uang"><span class="bt__l">Budget</span><input class="input num" data-f="budget" inputmode="numeric" value="' + rp0(x.budget) + '" placeholder="0"></label>' +
      '<label class="bt__uang"><span class="bt__l">Terima TL</span><input class="input num" data-f="terima" inputmode="numeric" value="' + rp0(x.terima) + '" placeholder="' + (Number(x.budget) ? rp0(x.budget) : 'sama dengan budget') + '"></label>' +
      '<button class="icon-btn bt__hapus" data-bt="hapus" aria-label="Hapus baris">' + ic('trash-2', 18) + '</button></div>';
  }
  function tabelHTML() {
    return '<div class="bt-kepala hide-sm" aria-hidden="true"><span></span><span>Keterangan</span><span class="num">Budget (Rp)</span><span class="num">Terima TL (Rp)</span><span></span></div>' +
      '<div class="bt-daftar">' + (st.items.length ? st.items.map(barisHTML).join('') : '<div class="ki-kosong muted">Belum ada baris. Salin dari kalkulasi atau tambah baris baru.</div>') + '</div>' +
      '<div class="row wrap" style="gap:8px;margin-top:10px"><button class="btn btn--soft btn--sm" data-bt="tambah">' + ic('plus', 16) + 'Tambah baris</button><button class="btn btn--ghost btn--sm" data-bt="judul">' + ic('heading', 16) + 'Tambah judul grup</button></div>';
  }
  // Pratinjau tabel BUDGETING seperti di PDF manifest
  function pratinjauHTML() {
    var h = hitung(), S = Store.S;
    return '<div class="bt-pdf"><b class="bt-pdf__judul">' + esc(S.MNF_L_BUDGET || 'BUDGETING') + '</b><table><thead><tr><th>KETERANGAN</th><th>BUDGET</th><th>TERIMA TL</th></tr></thead><tbody>' +
      '<tr><td></td><td class="num">' + esc(st.pax || '') + '</td><td></td></tr>' +
      st.items.filter(function (x) { return String(x.uraian || '').trim(); }).map(function (x) { return x.judul ? '<tr class="judul"><td colspan="3">' + esc(String(x.uraian).toUpperCase()) + '</td></tr>' : '<tr><td>' + esc(String(x.uraian).toUpperCase()) + '</td><td class="num">' + (Number(x.budget) || 0) + '</td><td class="num">' + terimaDari(x) + '</td></tr>'; }).join('') +
      '<tr class="total"><td>TOTAL</td><td class="num">' + h.budget + '</td><td class="num">' + h.terima + '</td></tr></tbody></table></div>';
  }
  function ringkasHTML(p) {
    var h = hitung(), k = HT.ringkasKalkulasi(HT.indeks(Store.D), st.id);
    return '<div class="ringkas-kal ringkas-kal--3"><div><span class="label">Budget TL</span><b class="num">' + U.rp(h.budget) + '</b><small class="muted">' + h.n + ' baris</small></div>' +
      '<div><span class="label">Diterima TL</span><b class="num">' + U.rp(h.terima) + '</b><small class="muted">' + (h.budget !== h.terima ? 'selisih ' + U.rp(h.budget - h.terima) : 'sama dengan budget') + '</small></div>' +
      '<div><span class="label">RAB kalkulasi kantor</span><b class="num">' + (k.ada ? U.rp(k.total) : '—') + '</b><small class="muted">' + (k.ada ? 'dasar rekap · <a href="#/kalkulasi/' + esc(st.id) + '">buka</a>' : '<a href="#/kalkulasi/' + esc(st.id) + '">Buat kalkulasi</a>') + '</small></div></div>';
  }

  // ---------------------------------------------------------------- salin dari kalkulasi
  function salinKalkulasi(el) {
    var ix = HT.indeks(Store.D), saran = HT.saranBudgetTL(ix, st.id);
    if (!saran.length) { UI.toast('Kalkulasi pesanan ini belum ada. Buat kalkulasi dulu atau isi manual.', 'warn'); return; }
    var p = Store.get('Pesanan', st.id), L = HT.labelRekap(Store.S)[HT.infoPesanan(p, Store.S).bagian], lab = {}; L.kolom.forEach(function (k) { lab[k.k] = k.l; });
    var h = UI.modal({ judul: 'Salin dari kalkulasi', sub: 'Centang item yang dipegang Tim Lapang. Setelah disalin, budgeting bisa diubah tanpa mengubah kalkulasi.', ukuran: 'md',
      isi: '<div class="salin-daftar">' + saran.map(function (x, i) { return '<label class="check salin-item"><input type="checkbox" data-s="' + i + '"' + (x.pilih ? ' checked' : '') + '><span class="row__text"><b>' + esc(x.uraian) + '</b><small class="muted">kolom rekap ' + esc(lab[x.kolom] || x.kolom || '-') + '</small></span><span class="num">' + U.ribuan(x.budget) + '</span></label>'; }).join('') + '</div>' +
        '<div class="row wrap" style="gap:16px;margin-top:14px"><label class="check"><input type="radio" name="cara" value="ganti" checked><span>Ganti isian sekarang</span></label><label class="check"><input type="radio" name="cara" value="tambah"' + (st.items.length ? '' : ' disabled') + '><span>Tambahkan di bawah</span></label></div>',
      aksi: [{ label: 'Pilih semua', kelas: 'btn--plain', tutup: false, klik: function (hh) { var cb = hh.body.querySelectorAll('[data-s]'), semua = Array.from(cb).every(function (c) { return c.checked; }); cb.forEach(function (c) { c.checked = !semua; }); } },
        { label: 'Batal' }, { label: 'Salin', kelas: 'btn--primary', ikon: 'copy', klik: function (hh) {
          var dipilih = Array.from(hh.body.querySelectorAll('[data-s]:checked')).map(function (c) { return saran[+c.dataset.s]; });
          if (!dipilih.length) { UI.toast('Centang minimal satu item.', 'warn'); return false; }
          var baru = dipilih.map(function (x) { return { uraian: x.uraian, budget: x.budget, terima: '' }; });
          if (hh.body.querySelector('[name=cara]:checked').value === 'tambah') st.items = st.items.concat(baru); else st.items = baru;
          var k = HT.ringkasKalkulasi(ix, st.id); if (k.ada && Number(k.k.Pax)) st.pax = Number(k.k.Pax);
          st.asal = 'Kalkulasi'; st.kotor = true; H.editor(el); UI.toast(baru.length + ' item disalin — periksa angka TERIMA TL lalu simpan.', 'ok');
        } }] });
    return h;
  }

  // ---------------------------------------------------------------- daftar
  function daftarRows() {
    var S = Store.S, today = U.hariIni(), ix = HT.indeks(Store.D);
    var rows = Store.D.Pesanan.map(function (p) { var i = HT.infoPesanan(p, S); i.p = p; i.bt = HT.budgetTL(ix, p.ID_Pesanan); i.k = HT.ringkasKalkulasi(ix, p.ID_Pesanan); i.m = ix.mnf[p.ID_Pesanan]; i.h = i.mulai ? U.selisihHari(today, i.mulai) : null; return i; });
    if (st.daftar === 'perlu') rows = rows.filter(function (i) { return i.h !== null && i.h >= 0 && i.h <= 21 && !i.bt.tersimpan; });
    if (st.daftar === 'mendatang') rows = rows.filter(function (i) { return i.selesai && i.selesai >= today; });
    if (st.daftar === 'ada') rows = rows.filter(function (i) { return i.bt.ada; });
    return U.urutkan(rows, function (i) { return st.daftar === 'ada' ? (i.bt.diperbarui || '') : (i.mulai || '9999'); }, st.daftar === 'ada');
  }
  function tabelDaftar() {
    return UI.tabel({ baris: daftarRows(), klik: function (i) { return i.id; }, kosong: st.daftar === 'perlu' ? 'Semua trip 3 minggu ke depan sudah punya budgeting TL' : 'Tidak ada data', kosongIkon: st.daftar === 'perlu' ? 'circle-check' : 'inbox',
      kolom: [
        { label: 'Tamu', render: function (i) { return '<div class="cell-main"><span class="psn-ava ' + (i.bagian === 'SB' ? 'sb' : '') + '">' + ic(i.bagian === 'SB' ? 'sailboat' : 'mountain', 18) + '</span><div class="row__text"><b class="truncate">' + esc(i.p.Nama) + '</b><span class="sub truncate">' + esc(i.p.Trip) + '</span></div></div>'; } },
        { label: 'Jadwal', render: function (i) { return esc(i.jadwal || '-') + (i.h !== null && i.h >= 0 && i.h <= 21 ? '<span class="sub">' + (i.h === 0 ? 'Hari ini' : 'H-' + i.h) + '</span>' : ''); } },
        { label: 'Pax', num: true, render: function (i) { return i.pax; } },
        { label: 'Budgeting', render: function (i) { return i.bt.tersimpan ? UI.badge('Tersimpan', 'ok') + '<span class="sub">' + i.bt.n + ' baris</span>' : i.bt.ada ? UI.badge('Kalkulasi lama', 'warn') : UI.badge('Belum', 'neutral'); } },
        { label: 'Budget TL', num: true, render: function (i) { return i.bt.ada ? U.ribuan(i.bt.total) : '<span class="muted">—</span>'; } },
        { label: 'Terima TL', num: true, render: function (i) { return i.bt.ada ? U.ribuan(i.bt.terima) : '<span class="muted">—</span>'; } },
        { label: 'RAB kantor', num: true, render: function (i) { return i.k.ada ? U.ribuan(i.k.total) : '<span class="muted">—</span>'; } },
        { label: 'Manifest', render: function (i) { return i.m ? UI.badge(i.m.Status) : '<span class="muted">—</span>'; } }
      ] });
  }

  // ---------------------------------------------------------------- halaman
  var H = window.Halaman.budgettl = {
    render: function (el, args) {
      if (args[0]) { if (Hal.hanyaAdmin()) { H.renderEditor(el, args[0]); return; } args = []; }
      el.innerHTML = Hal.kepala({ judul: 'Budgeting Tim Lapang', sub: 'Rencana anggaran yang dipegang Tim Lapang (BUDGET & TERIMA TL) — tampil di tabel BUDGETING PDF manifest. Terpisah dari kalkulasi kantor yang menjadi dasar rekap.' }) +
        '<div class="tabs" role="tablist">' + [['perlu', 'Perlu diisi'], ['mendatang', 'Trip mendatang'], ['ada', 'Sudah ada'], ['semua', 'Semua']].map(function (t) { return '<button data-act="daftar" data-t="' + t[0] + '" class="' + (st.daftar === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="bt-isi"></div>';
      Hal.aksiPeta(el, { daftar: function (d) { st.daftar = d.t; el.querySelectorAll('[data-act="daftar"]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === st.daftar); }); H.isiDaftar(el); } },
        function (e) { var r = e.target.closest('tr[data-row]'); if (!r) return; if (Store.isAdmin()) App.go('budgettl/' + r.dataset.row); else UI.toast('Budgeting TL diisi oleh Admin.', 'info'); });
      H.isiDaftar(el);
    },
    isiDaftar: function (el) { var b = el.querySelector('#bt-isi'); if (b) b.innerHTML = '<div class="card card--pad0">' + tabelDaftar() + '</div>'; },
    navigasi: function (el, args) { H.render(el, args); },
    segarkan: function (el, args) {
      if (args[0] && el.querySelector('#bt-item')) { if (!st.kotor) { muat(args[0]); H.editor(el); } return; }
      if (!args[0]) H.isiDaftar(el); else H.render(el, args);
    },
    renderEditor: function (el, id) {
      if (!Store.get('Pesanan', id)) { el.innerHTML = UI.kosong('search', 'Pesanan tidak ditemukan', 'Mungkin barisnya dihapus di Google Sheets. <a href="#/budgettl">Kembali</a>'); return; }
      if (st.id !== id || !st.kotor) muat(id);
      el.innerHTML = '<div id="bte"></div>'; H.editor(el);
    },
    editor: function (el) {
      var box = el.querySelector('#bte'); if (!box) return;
      var p = Store.get('Pesanan', st.id), inf = HT.infoPesanan(p, Store.S), m = Store.get('Manifest', st.id), bt = st.bt || {};
      box.innerHTML = Hal.kepala({ crumbs: ['Budgeting TL', p.Tab], judul: p.Nama, sub: esc(p.Trip) + ' · ' + esc(inf.jadwal || 'tanpa tanggal') + ' · ' + inf.pax + ' pax',
        aksi: '<a class="btn btn--ghost" href="#/budgettl">' + ic('arrow-left', 18) + '<span>Daftar</span></a><a class="btn btn--soft" href="#/manifest/' + esc(st.id) + '">' + ic('clipboard-list', 18) + '<span>Lanjut ke manifest</span></a>' }) +
        Hal.alurHTML(p) +
        (!bt.tersimpan && bt.asal === 'Kalkulasi lama' && !st.kotor ? '<div class="note warn" style="margin-top:16px">' + ic('info') + '<span>Isian ini diambil dari item bertanda <b>Ke TL</b> di kalkulasi versi lama. Periksa lalu <b>Simpan</b> agar budgeting TL berdiri sendiri.</span></div>' : '') +
        (m && m.Status === 'Terbit' && st.kotor ? '<div class="note warn" style="margin-top:16px">' + ic('triangle-alert') + '<span>Manifest sudah terbit. Setelah disimpan, terbitkan ulang manifest agar PDF di Calendar ikut berubah.</span></div>' : '') +
        '<div class="mf-grid"><div class="stack" style="gap:16px">' +
        '<section class="card"><div class="card__head"><div class="card__title"><h2>Isian budgeting</h2><p>KETERANGAN, BUDGET, dan TERIMA TL persis seperti tabel di PDF manifest. Kosongkan TERIMA TL bila sama dengan budget.</p></div>' +
        (st.kotor ? '<span class="badge warn">' + ic('pencil', 14) + 'Belum disimpan</span>' : bt.tersimpan ? '<span class="badge ok">' + ic('check', 14) + 'Tersimpan ' + esc(C.F.relatif(bt.diperbarui)) + '</span>' : '') + '</div>' +
        '<div class="row wrap" style="gap:12px;align-items:flex-end;margin-bottom:14px"><button class="btn btn--primary" data-bt="salin">' + ic('copy', 18) + '<span>Salin dari kalkulasi</span></button>' +
        '<div class="field" style="width:150px;margin:0"><label for="bt-pax">Pax (baris pertama)</label><input class="input num" id="bt-pax" type="number" min="0" value="' + esc(st.pax || '') + '"></div>' +
        '<span class="badge neutral" style="margin-left:auto">Asal: ' + esc(st.asal === 'Kalkulasi' ? 'disalin dari kalkulasi' : st.asal === 'Kalkulasi lama' ? 'kalkulasi versi lama' : 'diisi manual') + '</span></div>' +
        '<div id="bt-item"></div>' +
        '<div class="field" style="margin-top:16px"><label for="bt-cat">Catatan untuk Tim Lapang (opsional, tidak tampil di PDF)</label><textarea class="textarea" id="bt-cat" rows="2">' + esc(st.catatan) + '</textarea></div>' +
        '<div class="between wrap" style="margin-top:16px;gap:12px">' + (bt.tersimpan ? '<button class="btn btn--plain" data-bt="hapusSemua">' + ic('trash-2', 18) + 'Hapus budgeting</button>' : '<span></span>') +
        '<button class="btn btn--primary" data-bt="simpan">' + ic('save', 18) + '<span>Simpan budgeting</span></button></div></section></div>' +
        '<aside class="mf-samping mf-samping--gulir"><div class="card card--tight" id="bt-ringkas">' + ringkasHTML(p) + '</div><div class="card card--tight" id="bt-pdf">' + pratinjauHTML() + '</div></aside></div>';
      var itemBox = box.querySelector('#bt-item');
      function gambar() { itemBox.innerHTML = tabelHTML(); segarSamping(); }
      function segarSamping() { var r = box.querySelector('#bt-ringkas'), q = box.querySelector('#bt-pdf'); if (r) r.innerHTML = ringkasHTML(p); if (q) q.innerHTML = pratinjauHTML(); }
      function ubah() { if (!st.kotor) { st.kotor = true; var bd = box.querySelector('.card__head .badge'); if (bd) bd.outerHTML = '<span class="badge warn">' + ic('pencil', 14) + 'Belum disimpan</span>'; else box.querySelector('.card__head').insertAdjacentHTML('beforeend', '<span class="badge warn">' + ic('pencil', 14) + 'Belum disimpan</span>'); } segarSamping(); }
      itemBox.addEventListener('input', function (e) {
        var x = e.target.closest('[data-f]'), row = e.target.closest('[data-i]'); if (!x || !row) return;
        var it = st.items[+row.dataset.i], f = x.dataset.f;
        if (f === 'uraian') it.uraian = x.value;
        else { var v = angka(x.value); x.value = rp0(v); it[f] = v; if (f === 'budget') { var t = row.querySelector('[data-f="terima"]'); if (t) t.placeholder = v ? rp0(v) : 'sama dengan budget'; } }
        ubah();
      });
      itemBox.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('[data-f]')) { e.preventDefault(); var row = e.target.closest('[data-i]'); if (+row.dataset.i === st.items.length - 1) { st.items.push({ uraian: '', budget: '', terima: '' }); gambar(); ubah(); var r = itemBox.querySelectorAll('[data-f="uraian"]'); r[r.length - 1].focus(); } else { var nx = itemBox.querySelector('[data-i="' + (+row.dataset.i + 1) + '"] [data-f="' + e.target.dataset.f + '"]') || itemBox.querySelector('[data-i="' + (+row.dataset.i + 1) + '"] [data-f="uraian"]'); if (nx) nx.focus(); } } });
      box.querySelector('#bt-pax').oninput = function (e) { st.pax = Math.max(0, Number(e.target.value) || 0); ubah(); };
      box.querySelector('#bt-cat').oninput = function (e) { st.catatan = e.target.value; if (!st.kotor) ubah(); };
      Hal.aksiPeta(el, {}, null);
      box.onclick = async function (e) {
        var b = e.target.closest('[data-bt]'); if (!b) return; var a = b.dataset.bt, row = b.closest('[data-i]'), i = row ? +row.dataset.i : -1;
        if (a === 'tambah') { st.items.push({ uraian: '', budget: '', terima: '' }); gambar(); ubah(); var r = itemBox.querySelectorAll('[data-f="uraian"]'); r[r.length - 1].focus(); }
        else if (a === 'judul') { st.items.push({ uraian: '', judul: true }); gambar(); ubah(); var r2 = itemBox.querySelectorAll('[data-f="uraian"]'); r2[r2.length - 1].focus(); }
        else if (a === 'hapus') { st.items.splice(i, 1); gambar(); ubah(); }
        else if (a === 'naik' && i > 0) { var t = st.items[i]; st.items[i] = st.items[i - 1]; st.items[i - 1] = t; gambar(); ubah(); var f = itemBox.querySelector('[data-i="' + (i - 1) + '"] [data-bt="naik"]'); (f && !f.disabled ? f : itemBox.querySelector('[data-i="' + (i - 1) + '"] [data-bt="turun"]')).focus(); }
        else if (a === 'turun' && i < st.items.length - 1) { var t2 = st.items[i]; st.items[i] = st.items[i + 1]; st.items[i + 1] = t2; gambar(); ubah(); var f2 = itemBox.querySelector('[data-i="' + (i + 1) + '"] [data-bt="turun"]'); (f2 && !f2.disabled ? f2 : itemBox.querySelector('[data-i="' + (i + 1) + '"] [data-bt="naik"]')).focus(); }
        else if (a === 'salin') salinKalkulasi(el);
        else if (a === 'simpan') {
          var isi = st.items.filter(function (x) { return String(x.uraian || '').trim() || x.budget || x.terima; });
          if (!isi.some(function (x) { return !x.judul; })) { UI.toast('Isi minimal satu baris budgeting.', 'warn'); return; }
          var r3 = await C.aksi('budgettl.simpan', { ID_Pesanan: st.id, Pax: st.pax, Catatan: st.catatan, Asal: st.asal, items: isi.map(function (x) { return x.judul ? { uraian: x.uraian, judul: true } : { uraian: x.uraian, budget: x.budget === '' ? 0 : x.budget, terima: x.terima }; }) }, { btn: b });
          if (r3.success) { muat(st.id); H.editor(el); }
        }
        else if (a === 'hapusSemua') {
          if (!(await UI.konfirmasi({ judul: 'Hapus budgeting TL?', teks: 'Tabel BUDGETING di manifest menjadi kosong sampai diisi lagi. Kalkulasi kantor tidak berubah.', ok: 'Hapus', bahaya: true }))) return;
          var r4 = await C.aksi('budgettl.hapus', { id: st.id }, { btn: b }); if (r4.success) { muat(st.id); H.editor(el); }
        }
      };
      gambar();
    }
  };
})();
