/* YukX — Realisasi anggaran trip: Admin mencatat nota & melapor → Finance mengaudit → Final masuk laba rugi.
   Dipakai di Kalkulasi Budget (tab Realisasi) dan Rekapitulasi (laci RAB & nota). */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var ST = { 'Belum Ada Realisasi': ['neutral', 'circle-dashed'], 'Draft': ['info', 'pencil-line'], 'Diajukan': ['warn', 'hourglass'], 'Perlu Perbaikan': ['danger', 'circle-alert'], 'Ditolak': ['danger', 'circle-x'], 'Final': ['ok', 'badge-check'] };
  var NOTA = { 'Tercatat': ['neutral', 'circle'], 'Disetujui': ['ok', 'circle-check'], 'Ditolak': ['danger', 'circle-x'] };

  function rek(idTrip) { var t = Store.get('Trip', idTrip); return t ? HT.rekapTrip(Store.D, HT.indeks(Store.D), t, U.hariIni()) : null; }
  function badgeStatus(st) { var x = ST[st] || ['info', 'circle']; return UI.badge(st === 'Final' ? 'Final · disetujui Finance' : st, x[0], x[1]); }
  /** Tanda risiko: melebihi RAB (kerugian anggaran) & trip rugi */
  function tanda(r, kecil) {
    var o = '';
    if (r.overBudget) o += '<span class="badge danger"' + (kecil ? ' style="height:22px;font-size:11px"' : '') + ' title="Realisasi melebihi RAB yang disetujui">' + ic('triangle-alert', 13) + 'Melebihi RAB +' + (kecil ? U.rpRingkas(r.lebih) : U.rp(r.lebih)) + ' (' + F.persen(r.lebihPersen) + ')</span>';
    if (r.rugi) o += '<span class="badge solid-danger"' + (kecil ? ' style="height:22px;font-size:11px"' : '') + '>' + ic('trending-down', 13) + 'Trip rugi ' + (kecil ? U.rpRingkas(r.laba) : U.rp(r.laba)) + '</span>';
    return o;
  }
  function langkah(r) {
    var masalah = r.statusAudit === 'Perlu Perbaikan' || r.statusAudit === 'Ditolak';
    var s = [
      ['RAB disetujui', r.budgetAktif ? 'v' + r.versiBudget + ' · ' + U.rpRingkas(r.budget) : 'Menunggu Finance', r.budgetAktif ? 'ok' : 'now'],
      ['Nota dicatat Admin', r.nota ? r.nota + ' nota · ' + U.rpRingkas(r.realisasi) : 'Belum ada', r.adaRealisasi ? 'ok' : r.budgetAktif ? 'now' : ''],
      ['Dilaporkan ke Finance', r.tglLapor ? F.tgl(r.tglLapor.slice(0, 10)) : r.tripSelesai ? 'Siap dilaporkan' : 'Setelah ' + U.tglId(r.trip.Tgl_Pulang), r.statusAudit === 'Diajukan' || r.final || (masalah && r.tglLapor) ? 'ok' : r.adaRealisasi ? 'now' : ''],
      ['Diverifikasi Finance', r.final ? 'Final · ' + F.tgl(r.tglFinal.slice(0, 10)) : masalah ? r.statusAudit : r.statusAudit === 'Diajukan' ? 'Sedang diaudit' : '—', r.final ? 'ok' : masalah ? 'bad' : r.statusAudit === 'Diajukan' ? 'now' : '']
    ];
    return '<ol class="steps">' + s.map(function (x, i) { return '<li class="' + x[2] + '"><span class="steps__dot">' + (x[2] === 'ok' ? ic('check', 14) : x[2] === 'bad' ? ic('x', 14) : i + 1) + '</span><b>' + x[0] + '</b><small>' + esc(x[1]) + '</small></li>'; }).join('') + '</ol>';
  }
  function bukti(n) {
    if (!n.Link_Bukti) return '<span class="badge neutral" style="height:20px;font-size:10.5px">' + ic('image-off', 12) + 'Tanpa bukti</span>';
    if (/^demo:/.test(n.Link_Bukti)) return '<span class="badge info" style="height:20px;font-size:10.5px">' + ic('paperclip', 12) + 'Bukti terlampir</span>';
    return '<a class="badge info" style="height:20px;font-size:10.5px" href="' + esc(n.Link_Bukti) + '" target="_blank" rel="noopener">' + ic('paperclip', 12) + 'Lihat bukti</a>';
  }

  /** Panel lengkap realisasi satu trip. o.ringkas = tanpa riwayat (untuk laci sempit tetap lengkap). */
  function panel(idTrip) {
    var r = rek(idTrip); if (!r) return UI.kosong('receipt', 'Trip tidak ditemukan');
    var admin = Store.isAdmin(), fin = Store.isFin(), ix = HT.indeks(Store.D);
    var kat = HT.rabVsRealisasi(ix, idTrip), nota = U.urutkan(ix.rlsPerTrip[idTrip] || [], function (x) { return x.Tanggal + x.ID_Realisasi; }, true);
    var riwayat = U.urutkan(Store.D.Log_Revisi_Budget.filter(function (l) { return l.ID_Trip === idTrip && /^REALISASI — /.test(l.Item); }), function (l) { return l.Kapan; }, true);
    var aksi = '';
    if (admin && r.bisaEdit) {
      aksi += '<button class="btn btn--soft btn--sm" data-rx="nota">' + ic('plus', 16) + 'Catat nota</button>';
      aksi += r.bisaLapor ? '<button class="btn btn--primary btn--sm" data-rx="lapor">' + ic('send', 16) + (r.tglLapor ? 'Laporkan ulang ke Finance' : 'Laporkan ke Finance') + '</button>'
        : '<button class="btn btn--primary btn--sm" disabled title="' + esc(!r.adaRealisasi ? 'Catat nota dulu' : 'Bisa dilaporkan setelah trip selesai') + '">' + ic('send', 16) + 'Laporkan ke Finance</button>';
    }
    if (fin && r.statusAudit === 'Diajukan') aksi += '<button class="btn btn--primary btn--sm" data-rx="audit">' + ic('shield-check', 16) + 'Audit laporan</button>';
    if (fin && r.final) aksi += '<button class="btn btn--danger-ghost btn--sm" data-rx="buka">' + ic('lock-open', 16) + 'Buka kembali untuk koreksi</button>';
    if (r.adaRealisasi) aksi += '<button class="btn btn--ghost btn--sm" data-rx="pdf">' + ic('file-down', 16) + 'Laporan PDF</button>';
    var petunjuk = '';
    if (!r.budgetAktif) petunjuk = '<div class="note warn">' + ic('lock') + '<span>RAB trip ini belum disetujui Finance. Nota realisasi bisa dicatat setelah RAB aktif.</span></div>';
    else if (admin && r.bisaEdit && !r.tripSelesai) petunjuk = '<div class="note">' + ic('info') + '<span>Catat pengeluaran kapan saja. Laporan dikirim ke Finance setelah trip selesai (' + U.tglId(r.trip.Tgl_Pulang) + ').</span></div>';
    else if (admin && r.statusAudit === 'Diajukan') petunjuk = '<div class="note">' + ic('hourglass') + '<span>Sedang diaudit Finance — nota terkunci sampai ada keputusan.</span></div>';
    else if (admin && r.final) petunjuk = '<div class="note ok">' + ic('badge-check') + '<span>Final. Angka ini sudah masuk laporan laba rugi dan terkunci.</span></div>';
    else if (fin && r.perluLapor && !r.final) petunjuk = '<div class="note">' + ic('info') + '<span>Menunggu Admin melaporkan realisasi trip ini.</span></div>';
    var sel = r.budget - r.realisasi;
    return '<div class="stack" style="gap:14px">' +
      '<div class="card card--tight stack' + (r.overBudget ? ' card--alert' : '') + '" style="gap:12px"><div class="between wrap" style="gap:8px"><span class="label">Status realisasi anggaran</span>' + badgeStatus(r.statusAudit) + '</div>' +
      (tanda(r) ? '<div class="row wrap" style="gap:6px">' + tanda(r) + '</div>' : '') + langkah(r) +
      (r.penjelasan ? '<div class="quote"><b>Penjelasan Admin (' + esc(r.dilaporOleh) + '):</b> ' + esc(r.penjelasan) + '</div>' : '') +
      (r.catatanAudit && r.diverifikasiOleh ? '<div class="quote ' + (r.final ? '' : 'danger') + '"><b>Catatan Finance (' + esc(r.diverifikasiOleh) + ', ' + F.waktu(r.tglVerifikasi) + '):</b> ' + esc(r.catatanAudit) + '</div>' : '') +
      petunjuk + (aksi ? '<div class="row wrap" style="gap:6px">' + aksi + '</div>' : '') + '</div>' +
      '<div class="mini-kpi"><div><span class="label">RAB aktif v' + r.versiBudget + '</span><b class="num">' + U.rp(r.budget) + '</b></div><div><span class="label">Realisasi diakui</span><b class="num">' + U.rp(r.realisasi) + '</b></div><div><span class="label">' + (sel >= 0 ? 'Hemat' : 'Melebihi RAB') + '</span><b class="num ' + (sel >= 0 ? 'ok' : 'danger') + '">' + (r.adaRealisasi ? (sel >= 0 ? '' : '+') + U.rp(Math.abs(sel)) : '—') + '</b></div><div><span class="label">Laba ' + (r.final ? 'final' : 'estimasi') + '</span><b class="num ' + (r.laba < 0 ? 'danger' : 'primary') + '">' + U.rp(r.laba) + '</b></div></div>' +
      '<div class="card card--tight card--pad0"><div style="padding:12px 14px 0"><span class="label">RAB vs realisasi per kategori</span></div>' + UI.tabel({ tanpaMain: true, kolom: [
        { label: 'Kategori', render: function (x) { return '<b>' + esc(x.kategori) + '</b>' + (x.diLuarRab ? '<span class="sub danger">Di luar RAB</span>' : ''); } },
        { label: 'RAB', num: true, render: function (x) { return U.rp(x.rab); } },
        { label: 'Realisasi', num: true, render: function (x) { return '<b>' + U.rp(x.realisasi) + '</b><div class="progress thin ' + (x.over ? 'danger' : 'ok') + '" style="margin-top:4px"><i style="width:' + Math.min(100, x.persen) + '%"></i></div>'; } },
        { label: 'Selisih', num: true, render: function (x) { return x.realisasi || x.rab ? '<b class="' + (x.over ? 'danger' : 'ok') + '">' + (x.over ? '+' + U.rp(-x.selisih) : U.rp(x.selisih)) + '</b>' + (x.over ? '<span class="sub danger">' + ic('triangle-alert', 11) + ' lebih</span>' : '') : '—'; } }
      ], baris: kat, kosong: 'Belum ada RAB atau nota' }) + '</div>' +
      '<div class="card card--tight stack" style="gap:8px"><div class="between"><span class="label">Nota realisasi (' + nota.length + ')' + (r.notaDitolak ? ' · ' + r.notaDitolak + ' ditolak' : '') + '</span>' + (admin && r.bisaEdit ? '<button class="btn btn--plain btn--sm" data-rx="nota">' + ic('plus', 15) + 'Tambah</button>' : '') + '</div>' +
      (nota.map(function (n) {
        var x = NOTA[n.Status] || NOTA.Tercatat;
        return '<div class="nota ' + (n.Status === 'Ditolak' ? 'nota--tolak' : '') + '"><div class="row__text grow"><b>' + esc(n.Uraian) + '</b><small class="muted">' + esc(n.Kategori) + ' · ' + U.tglId(n.Tanggal) + ' · ' + esc(n.Diinput_Oleh) + '</small>' +
          (n.Catatan ? '<small class="muted">' + esc(n.Catatan) + '</small>' : '') + (n.Catatan_Verifikasi ? '<small class="danger">' + ic('message-square-warning', 12) + ' ' + esc(n.Catatan_Verifikasi) + '</small>' : '') +
          '<div class="row wrap" style="gap:4px;margin-top:4px">' + UI.badge(n.Status, x[0], x[1]) + bukti(n) + '</div></div>' +
          '<div class="stack" style="align-items:flex-end;gap:4px"><b class="num' + (n.Status === 'Ditolak' ? ' strike' : '') + '">' + U.rp(n.Nominal) + '</b>' + (admin && r.bisaEdit ? '<span class="row" style="gap:2px"><button class="btn btn--plain btn--sm btn--icon" data-rx="ubah" data-id="' + n.ID_Realisasi + '" aria-label="Ubah nota">' + ic('pencil', 15) + '</button><button class="btn btn--plain btn--sm btn--icon" data-rx="hapus" data-id="' + n.ID_Realisasi + '" aria-label="Hapus nota">' + ic('trash-2', 15) + '</button></span>' : '') + '</div></div>';
      }).join('') || '<small class="muted">Belum ada nota realisasi.</small>') + '</div>' +
      (riwayat.length ? '<div class="card card--tight"><span class="label">Riwayat laporan & audit</span><div class="timeline" style="margin-top:10px">' + riwayat.map(function (l) { var bad = /PERBAIKAN|DITOLAK|Dibuka/.test(l.Item), ok = /DISETUJUI/.test(l.Item); return '<div class="tl ' + (ok ? 'on' : bad ? 'bad' : '') + '"><b style="font-size:13px">' + esc(l.Item.replace(/^REALISASI — /, '')) + '</b><small>' + esc(l.Siapa) + ' · ' + F.waktu(l.Kapan) + '</small><small>' + esc(l.Nilai_Baru) + '</small>' + (l.Alasan ? '<div class="quote" style="margin-top:4px">' + esc(l.Alasan) + '</div>' : '') + '</div>'; }).join('') + '</div></div>' : '') +
      '</div>';
  }

  function bacaBerkas(file) {
    return new Promise(function (ok, no) {
      if (file.size > 2 * 1024 * 1024 && file.type === 'application/pdf') return no(new Error('PDF maksimal 2 MB.'));
      if (/^image\//.test(file.type)) return UI.perkecil(file, 1400, 'image/jpeg', 0.8).then(ok, no);
      var fr = new FileReader(); fr.onload = function () { ok({ name: file.name, mime: file.type, b64: String(fr.result).split(',')[1] }); }; fr.onerror = function () { no(new Error('Berkas tidak bisa dibaca.')); }; fr.readAsDataURL(file);
    });
  }
  function formNota(idTrip, n) {
    n = n || {}; var r = rek(idTrip), ix = HT.indeks(Store.D), kat = HT.rabVsRealisasi(ix, idTrip), sisa = {};
    kat.forEach(function (k) { sisa[k.kategori] = k.rab - k.realisasi + (n.Kategori === k.kategori && n.Status !== 'Ditolak' ? (+n.Nominal || 0) : 0); });
    var opsi = Store.D.Kategori_Biaya.filter(function (k) { return k.Aktif !== 'TIDAK'; }).map(function (k) { return { v: k.Nama, l: k.Nama + (sisa[k.Nama] !== undefined ? ' — sisa RAB ' + U.rpRingkas(sisa[k.Nama]) : ' — tidak ada di RAB') }; });
    var berkas = null;
    var h = UI.modal({ judul: n.ID_Realisasi ? 'Ubah nota realisasi' : 'Catat nota realisasi', sub: r.trip.Nama + ' · RAB v' + r.versiBudget + ' ' + U.rp(r.budget), ukuran: 'md',
      isi: UI.form([{ name: 'Kategori', label: 'Kategori biaya (sesuai RAB)', type: 'select', opsi: opsi, full: true, nilai: n.Kategori }, { name: 'Uraian', label: 'Uraian pengeluaran', wajib: true, full: true, ph: 'contoh: Pelunasan sewa kapal', nilai: n.Uraian }, { name: 'Tanggal', label: 'Tanggal nota', type: 'date', nilai: n.Tanggal || U.hariIni() }, { name: 'Nominal', label: 'Nominal', type: 'rupiah', wajib: true, nilai: n.Nominal || '' }, { name: 'Catatan', label: 'Catatan (opsional)', full: true, nilai: n.Catatan },
        { html: '<label class="field-label">Bukti nota / kuitansi</label><label class="drop" id="rx-bukti" tabindex="0">' + ic('paperclip', 22) + '<b>' + (n.Link_Bukti ? 'Ganti bukti (sudah ada)' : 'Pilih foto atau PDF nota') + '</b><small>Foto diperkecil otomatis · PDF maks 2 MB · disimpan ke folder Bukti di Drive</small><input type="file" accept="image/*,application/pdf" hidden></label><div id="rx-sisa" class="note" style="margin-top:8px"></div>', full: true }]),
      aksi: [{ label: 'Batal' }, { label: 'Simpan nota', kelas: 'btn--primary', ikon: 'save', klik: async function (hh, b) {
        if (!UI.cekWajib(hh.body)) return false;
        var v = UI.bacaForm(hh.body); v.ID_Trip = idTrip; v.ID_Realisasi = n.ID_Realisasi || ''; v.Link_Bukti = n.Link_Bukti || '';
        if (berkas) {
          if (C.DEMO) v.Link_Bukti = 'demo:' + berkas.name;
          else { b.classList.add('loading'); var up = await C.api('bukti.unggah', { file: berkas, idTrip: idTrip }); b.classList.remove('loading'); if (!up.success) { UI.toast(up.message, 'err'); return false; } v.Link_Bukti = up.data.url; }
        }
        var res = await C.aksi('realisasi.simpan', v, { btn: b }); return res.success;
      } }] });
    UI.siapkanForm(h.body);
    var inp = h.body.querySelector('#rx-bukti input'), sel = h.body.querySelector('[name="Kategori"]'), info = h.body.querySelector('#rx-sisa'), nom = h.body.querySelector('[name="Nominal"]');
    function cekSisa() {
      var s = sisa[sel.value], v = Number(String(nom.value).replace(/\D/g, '')) || 0;
      if (s === undefined) { info.className = 'note warn'; info.innerHTML = ic('triangle-alert') + '<span>Kategori ini tidak ada di RAB — seluruh nominal dihitung sebagai kelebihan.</span>'; return; }
      var akhir = s - v; info.className = 'note ' + (akhir < 0 ? 'danger' : ''); info.innerHTML = ic(akhir < 0 ? 'triangle-alert' : 'info') + '<span>Sisa RAB ' + esc(sel.value) + ': ' + U.rp(s) + (v ? ' → setelah nota ini ' + (akhir < 0 ? '<b>melebihi ' + U.rp(-akhir) + '</b>' : U.rp(akhir)) : '') + '</span>';
    }
    sel.addEventListener('change', cekSisa); nom.addEventListener('input', cekSisa); cekSisa();
    inp.addEventListener('change', async function () {
      var f = inp.files[0]; if (!f) return;
      try { berkas = await bacaBerkas(f); var d = h.body.querySelector('#rx-bukti'); d.querySelector('b').textContent = f.name; d.classList.add('on'); }
      catch (e) { UI.toast(e.message, 'err'); }
    });
  }
  async function lapor(idTrip) {
    var r = rek(idTrip);
    var isi = '<div class="stack" style="gap:12px"><div class="mini-kpi"><div><span class="label">RAB v' + r.versiBudget + '</span><b class="num">' + U.rp(r.budget) + '</b></div><div><span class="label">Realisasi</span><b class="num">' + U.rp(r.realisasi) + '</b></div><div><span class="label">' + (r.overBudget ? 'Melebihi RAB' : 'Hemat') + '</span><b class="num ' + (r.overBudget ? 'danger' : 'ok') + '">' + U.rp(Math.abs(r.budget - r.realisasi)) + '</b></div></div>' +
      (r.overBudget ? '<div class="note danger">' + ic('triangle-alert') + '<span>Realisasi <b>melebihi RAB ' + U.rp(r.lebih) + ' (' + F.persen(r.lebihPersen) + ')</b>. Trip akan ditandai kerugian anggaran. Jelaskan penyebabnya untuk Finance.</span></div>' +
        '<div class="field"><label for="rx-jelas">Penjelasan kelebihan biaya *</label><textarea class="input" id="rx-jelas" rows="3" placeholder="contoh: Cuaca buruk, rute dialihkan dengan speedboat tambahan"></textarea></div>' : '<div class="note ok">' + ic('circle-check') + '<span>Realisasi masih dalam RAB.</span></div><div class="field"><label for="rx-jelas">Catatan untuk Finance (opsional)</label><textarea class="input" id="rx-jelas" rows="2"></textarea></div>') +
      '<label class="check"><input type="checkbox" id="rx-cek"> Semua nota & bukti pengeluaran trip ini sudah dicatat lengkap</label></div>';
    UI.modal({ judul: 'Laporkan realisasi ke Finance', sub: r.trip.Nama + ' · ' + r.nota + ' nota', ukuran: 'md', isi: isi,
      aksi: [{ label: 'Batal' }, { label: 'Kirim laporan', kelas: 'btn--primary', ikon: 'send', klik: async function (h, b) {
        var j = h.body.querySelector('#rx-jelas').value.trim();
        if (!h.body.querySelector('#rx-cek').checked) { UI.toast('Centang konfirmasi kelengkapan nota dulu.', 'warn'); return false; }
        if (r.overBudget && j.length < 10) { UI.toast('Penjelasan kelebihan biaya wajib (min. 10 karakter).', 'warn'); h.body.querySelector('#rx-jelas').focus(); return false; }
        var res = await C.aksi('realisasi.lapor', { ID_Trip: idTrip, penjelasan: j }, { btn: b }); return res.success;
      } }] });
  }
  function audit(idTrip) {
    var r = rek(idTrip), nota = U.urutkan((HT.indeks(Store.D).rlsPerTrip[idTrip] || []), function (x) { return x.Tanggal; });
    var isi = '<div class="stack" style="gap:12px"><div class="mini-kpi"><div><span class="label">RAB v' + r.versiBudget + '</span><b class="num">' + U.rp(r.budget) + '</b></div><div><span class="label">Dilaporkan</span><b class="num">' + U.rp(r.realisasi) + '</b></div><div><span class="label">Pendapatan</span><b class="num">' + U.rp(r.pendapatan) + '</b></div></div>' +
      (tanda(r) ? '<div class="row wrap" style="gap:6px">' + tanda(r) + '</div>' : '') + (r.penjelasan ? '<div class="quote"><b>Penjelasan Admin:</b> ' + esc(r.penjelasan) + '</div>' : '') +
      '<div><span class="label">Periksa nota · centang untuk menolak nota tertentu</span><div class="stack" style="gap:6px;margin-top:8px" id="rx-nota">' + nota.map(function (n) { return '<div class="nota"><label class="check grow" style="align-items:flex-start"><input type="checkbox" data-tolak="' + n.ID_Realisasi + '"' + (n.Status === 'Ditolak' ? ' checked' : '') + '><span class="row__text"><b>' + esc(n.Uraian) + '</b><small class="muted">' + esc(n.Kategori) + ' · ' + U.tglId(n.Tanggal) + '</small></span></label><div class="stack" style="align-items:flex-end;gap:4px"><b class="num">' + U.rp(n.Nominal) + '</b>' + bukti(n) + '</div><input class="input" data-alasan="' + n.ID_Realisasi + '" placeholder="Alasan nota ditolak" value="' + esc(n.Catatan_Verifikasi) + '" style="min-height:36px;flex-basis:100%;' + (n.Status === 'Ditolak' ? '' : 'display:none') + '"></div>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="field-label">Keputusan audit</span><div class="seg seg--col" id="rx-kep">' +
      [['setujui', 'badge-check', 'Setujui — final', 'Angka masuk laba rugi & terkunci'], ['perbaikan', 'circle-alert', 'Minta perbaikan', 'Kembali ke Admin dengan catatan'], ['tolak', 'circle-x', 'Tolak laporan', 'Admin wajib menyusun ulang']].map(function (x, i) { return '<button type="button" data-k="' + x[0] + '" class="' + (i === 0 ? 'on' : '') + '">' + ic(x[1], 18) + '<span><b>' + x[2] + '</b><small>' + x[3] + '</small></span></button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="rx-cat">Catatan Finance</label><textarea class="input" id="rx-cat" rows="2" placeholder="Wajib bila minta perbaikan / tolak"></textarea></div></div>';
    var kep = 'setujui';
    var h = UI.modal({ judul: 'Audit realisasi anggaran', sub: r.trip.Nama + ' · dilaporkan ' + esc(r.dilaporOleh) + ' ' + F.waktu(r.tglLapor), ukuran: 'lg', isi: isi,
      aksi: [{ label: 'Batal' }, { label: 'Simpan keputusan', kelas: 'btn--primary', ikon: 'shield-check', klik: async function (hh, b) {
        var item = {}; hh.body.querySelectorAll('[data-tolak]').forEach(function (c) { if (c.checked) item[c.dataset.tolak] = hh.body.querySelector('[data-alasan="' + c.dataset.tolak + '"]').value.trim() || 'Ditolak saat audit'; });
        var cat = hh.body.querySelector('#rx-cat').value.trim();
        if (kep !== 'setujui' && cat.length < 5) { UI.toast('Tulis catatan untuk Admin.', 'warn'); hh.body.querySelector('#rx-cat').focus(); return false; }
        var res = await C.aksi('realisasi.verifikasi', { ID_Trip: idTrip, keputusan: kep, catatan: cat, item: item }, { btn: b }); return res.success;
      } }] });
    h.body.querySelector('#rx-kep').addEventListener('click', function (e) { var x = e.target.closest('[data-k]'); if (!x) return; kep = x.dataset.k; this.querySelectorAll('button').forEach(function (bb) { bb.classList.toggle('on', bb === x); }); });
    h.body.querySelector('#rx-nota').addEventListener('change', function (e) { var c = e.target.closest('[data-tolak]'); if (!c) return; var a = h.body.querySelector('[data-alasan="' + c.dataset.tolak + '"]'); a.style.display = c.checked ? '' : 'none'; if (c.checked) a.focus(); });
  }
  async function bukaKembali(idTrip) {
    var al = await UI.konfirmasi({ judul: 'Buka kembali laporan final?', teks: 'Trip keluar dari laporan laba rugi sampai Admin memperbaiki dan Finance menyetujui lagi.', input: { label: 'Alasan koreksi', wajib: true, area: true }, ok: 'Buka kembali', bahaya: true, ikon: 'lock-open' });
    if (al) C.aksi('realisasi.bukaKembali', { ID_Trip: idTrip, catatan: al });
  }
  /** Pasang penangan klik pada elemen yang berisi panel. */
  function pasang(root, ambilId) {
    root.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-rx]'); if (!b || !root.contains(b)) return;
      var id = ambilId(), x = b.dataset.rx;
      if (x === 'nota') formNota(id);
      if (x === 'ubah') formNota(id, Store.get('Realisasi_Biaya', b.dataset.id));
      if (x === 'hapus') { if (await UI.konfirmasi({ judul: 'Hapus nota ini?', ok: 'Hapus', bahaya: true })) C.aksi('realisasi.hapus', { id: b.dataset.id }); }
      if (x === 'lapor') lapor(id);
      if (x === 'audit') audit(id);
      if (x === 'buka') bukaKembali(id);
      if (x === 'pdf') Dok.laporanRealisasi(id).catch(function (er) { UI.toast(er.message, 'err'); });
    });
  }
  window.Realisasi = { panel: panel, pasang: pasang, tanda: tanda, badgeStatus: badgeStatus, rek: rek, ST: ST };
})();
