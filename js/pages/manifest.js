/* YukX — Halaman Draft Manifest (per customer → lampiran Calendar, per trip → PDF/Excel) */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U, HT = C.HT;
  var st = { trip: '', f: 'semua' };

  function tripDefault() { var today = U.hariIni(), t = U.urutkan(Store.D.Trip.filter(function (x) { return x.Status !== 'Batal' && x.Tgl_Pulang >= today; }), function (x) { return x.Tgl_Berangkat; })[0]; return (t || Store.D.Trip[0] || {}).ID_Trip || ''; }

  function editor(idPj) {
    var pj = Store.get('Penjualan', idPj), c = Store.get('Customer', pj.ID_Customer) || {}, m = Store.D.Manifest.find(function (x) { return x.ID_Penjualan === idPj && x.Tipe === 'Per Customer'; });
    var ang = U.urutkan(Store.D.Anggota_Rombongan.filter(function (a) { return a.ID_Penjualan === idPj; }), function (a) { return a.Urutan; });
    var kunci = m && m.Status === 'Final', rows = [];
    for (var i = 0; i < pj.Jumlah_Pax; i++) rows.push(ang[i] || { Nama: i === 0 ? c.Nama : '' });
    var dis = kunci || !Store.isAdmin() ? ' disabled' : '';
    var isi = (kunci ? '<div class="note warn" style="margin-bottom:12px">' + ic('lock') + '<span>Manifest sudah Final (v' + m.Versi + '). Buka revisi untuk mengubah data — lampiran Calendar akan diganti saat final lagi.</span></div>' : '') +
      '<div class="stack" style="gap:10px">' + rows.map(function (a, i) {
        return '<div class="card card--tight card--flat" data-row="' + i + '" style="background:var(--c-surface-2)"><div class="between" style="margin-bottom:10px"><b>Peserta ' + (i + 1) + (i === 0 ? ' · pemesan' : '') + '</b>' + (a.Nama && a.Identitas ? '<span class="badge ok">' + ic('check', 14) + 'Lengkap</span>' : '<span class="badge warn">Belum lengkap</span>') + '</div>' +
          '<input type="hidden" data-k="ID_Anggota" value="' + esc(a.ID_Anggota || '') + '"><div class="form" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">' +
          [['Nama', 'Nama sesuai identitas', 'text'], ['Identitas', 'No. KTP / paspor', 'text'], ['Tgl_Lahir', 'Tanggal lahir', 'date'], ['No_HP', 'No. HP', 'tel'], ['Kamar', 'Kamar / kabin', 'text'], ['Catatan', 'Catatan (alergi dll.)', 'text']].map(function (f) { return '<div class="field"><label>' + f[1] + '</label><input class="input" type="' + f[2] + '" data-k="' + f[0] + '" value="' + esc(a[f[0]] || '') + '"' + dis + '></div>'; }).join('') +
          '<div class="field"><label>L/P</label><select class="select" data-k="Gender"' + dis + '><option value="">-</option><option' + (a.Gender === 'L' ? ' selected' : '') + '>L</option><option' + (a.Gender === 'P' ? ' selected' : '') + '>P</option></select></div>' +
          '<div class="field"><label>Ukuran baju</label><select class="select" data-k="Ukuran_Baju"' + dis + '>' + ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL'].map(function (s) { return '<option' + (a.Ukuran_Baju === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div></div>';
      }).join('') + '</div>';
    UI.modal({ judul: 'Data rombongan — ' + c.Nama, sub: pj.Jumlah_Pax + ' pax · ' + esc((Store.get('Trip', pj.ID_Trip) || {}).Nama), ukuran: 'lg', isi: isi,
      aksi: kunci || !Store.isAdmin() ? [{ label: 'Tutup' }] : [{ label: 'Batal' }, { label: 'Simpan data rombongan', kelas: 'btn--primary', ikon: 'save', klik: async function (h, b) {
        var list = Array.from(h.body.querySelectorAll('[data-row]')).map(function (r) { var o = {}; r.querySelectorAll('[data-k]').forEach(function (i) { o[i.dataset.k] = i.value; }); return o; });
        var res = await C.aksi('anggota.simpan', { ID_Penjualan: idPj, anggota: list }, { btn: b }); return res.success;
      } }] });
  }

  var H = {
    judul: 'Draft Manifest',
    render: function (el, args, q) {
      st.trip = args[0] || st.trip || tripDefault();
      el.innerHTML = '<div id="mf-head"></div><div id="mf-body"></div>';
      Hal.aksiPeta(el, {
        edit: function (d) { editor(d.pj); },
        lihat: function (d) { var p = Store.get('Penjualan', d.pj); Dok.pratinjau('Manifest — ' + (Store.get('Customer', p.ID_Customer) || {}).Nama, Dok.manifestHTML({ idPenjualan: d.pj, idTrip: p.ID_Trip })); },
        final: async function (d, b) {
          var m = Store.get('Manifest', d.m), p = Store.get('Penjualan', m.ID_Penjualan), ang = Store.D.Anggota_Rombongan.filter(function (a) { return a.ID_Penjualan === p.ID_Penjualan && a.Nama; }).length, paksa = false;
          if (ang < p.Jumlah_Pax) { paksa = await UI.konfirmasi({ judul: 'Data rombongan belum lengkap', teks: 'Baru ' + ang + ' dari ' + p.Jumlah_Pax + ' nama terisi. Tetap tandai Final?', ok: 'Tetap final', ikon: 'triangle-alert' }); if (!paksa) return; }
          C.aksi('manifest.final', { ID_Manifest: d.m, paksa: !!paksa }, { btn: b, loadingText: 'Memfinalkan…' });
        },
        revisi: async function (d, b) { if (await UI.konfirmasi({ judul: 'Buka revisi manifest?', teks: 'Status kembali Draft dengan versi baru. Saat final lagi, lampiran lama di Google Calendar diganti otomatis.', ok: 'Buka revisi', ikon: 'git-compare' })) C.aksi('manifest.revisi', { ID_Manifest: d.m }, { btn: b }); },
        buat: function (d, b) { C.aksi('manifest.buat', { ID_Penjualan: d.pj }, { btn: b }); },
        gabung: function (d, b) { C.aksi('manifest.trip', { ID_Trip: st.trip }, { btn: b, loadingText: 'Membuat…' }); },
        pdfTrip: function () { Dok.pratinjau('Manifest trip', Dok.manifestHTML({ idTrip: st.trip })); },
        xlsTrip: function () {
          var d = HT.dataManifest(Store.D, { idTrip: st.trip }, Store.S), t = Store.get('Trip', st.trip);
          Dok.excel('Manifest ' + t.Kode, [{ nama: 'Manifest', rows: [['No', 'Nama', 'Booking', 'Identitas', 'L/P', 'Tgl Lahir', 'No HP', 'Kamar', 'Ukuran Baju', 'Catatan']].concat(d.rows.map(function (r) { return [r.NO, r.NAMA, r.BOOKING, r.IDENTITAS, r.GENDER, r.TGL_LAHIR, r.HP, r.KAMAR, r.BAJU, r.CATATAN]; })), lebar: [5, 28, 24, 20, 5, 14, 16, 16, 8, 30] }]).then(function () { C.aksi('laporan.catat', { jenis: 'manifest', periode: t.Kode, format: 'xlsx' }, { diam: true }); }).catch(function (e) { UI.toast(e.message, 'err'); });
        },
        f: function (d) { st.f = d.f; H.isi(el); }
      });
      el.onchange = function (e) { if (e.target.id === 'mf-trip') App.go('manifest/' + e.target.value); };
      H.isi(el);
      if (q.pj) setTimeout(function () { editor(q.pj); history.replaceState(null, '', '#/manifest/' + st.trip); }, 120);
    },
    navigasi: function (el, args, q) { st.trip = args[0] || st.trip; H.isi(el); if (q.pj) editor(q.pj); },
    segarkan: function (el) { H.isi(el); },
    isi: function (el) {
      var D = Store.D, t = Store.get('Trip', st.trip); if (!t) { el.innerHTML = UI.kosong('clipboard-list', 'Belum ada trip'); return; }
      var ix = HT.indeks(D), today = U.hariIni(), admin = Store.isAdmin();
      var pjs = (ix.pjPerTrip[t.ID_Trip] || []).filter(function (p) { return p.Status !== 'Batal'; }).map(function (p) { return HT.ringkasPj(D, ix, p, today, Store.S); });
      var pax = U.jumlah(pjs, function (r) { return r.pj.Jumlah_Pax; }), lengkap = U.jumlah(pjs, function (r) { return Math.min(r.anggotaLengkap, r.pj.Jumlah_Pax); }), final = pjs.filter(function (r) { return r.manifest && r.manifest.Status === 'Final'; }), lamp = final.filter(function (r) { return r.manifest.ID_Lampiran_Calendar; }).length;
      var mTrip = ix.mnfTrip[t.ID_Trip], h = U.selisihHari(today, t.Tgl_Berangkat);
      el.querySelector('#mf-head').innerHTML = Hal.kepala({ crumbs: ['Operasional', 'Draft manifest', t.Kode], judul: 'Draft Manifest Peserta & Rooming', sub: 'Manifest per customer otomatis dilampirkan ke event Google Calendar saat ditandai Final; manifest gabungan per trip untuk tim lapangan.',
        aksi: '<button class="btn btn--ghost" data-act="xlsTrip">' + ic('file-spreadsheet', 18) + '<span class="hide-sm">Excel</span></button><button class="btn btn--ghost" data-act="pdfTrip">' + ic('printer', 18) + '<span class="hide-sm">PDF trip</span></button>' + (admin ? '<button class="btn btn--primary" data-act="gabung">' + ic('layers', 18) + 'Generate manifest trip</button>' : '') }) +
        '<div class="card card--tight row wrap" style="margin-bottom:16px;gap:12px">' + Hal.tripFoto(t) + '<div class="grow" style="min-width:220px">' + Hal.pilihTrip('mf-trip', t.ID_Trip) + '<small class="muted" style="display:block;margin-top:6px">' + F.rentang(t.Tgl_Berangkat, t.Tgl_Pulang) + ' · ' + esc(t.Meeting_Point) + ' · ' + esc(t.Akomodasi) + '</small></div><span class="badge ' + (h < 0 ? 'neutral' : h <= 7 ? 'warn' : '') + '">' + (h < 0 ? 'Selesai' : h === 0 ? 'Berangkat hari ini' : 'H-' + h) + '</span></div>';
      var pct = pax ? Math.round(lengkap / pax * 100) : 0;
      var kpi = '<div class="bento two-sm stagger">' + UI.stat({ hero: true, label: 'Kelengkapan data tamu', nilai: UI.hitung(pct) + '<small style="color:#fff">%</small>', kaki: '<span>' + lengkap + ' dari ' + pax + ' pax lengkap (nama + identitas)</span>' }) +
        UI.stat({ label: 'Manifest final', ikon: 'file-check', tone: final.length === pjs.length && pjs.length ? 'ok' : 'warn', nilai: final.length + ' <small>/ ' + pjs.length + ' booking</small>', kaki: '<span>' + U.jumlah(final, function (r) { return r.pj.Jumlah_Pax; }) + ' pax siap</span>' }) +
        UI.stat({ label: 'Lampiran Google Calendar', ikon: 'calendar-check', nilai: lamp + ' <small>event</small>', kaki: '<span>Revisi mengganti lampiran lama</span>' }) +
        UI.stat({ label: 'Manifest gabungan trip', ikon: 'layers', tone: mTrip ? 'ok' : '', nilai: mTrip ? 'v' + mTrip.Versi : '<small>Belum dibuat</small>', kaki: mTrip ? '<span>' + F.waktu(mTrip.Tgl_Final) + '</span>' + (mTrip.Link_File ? '<a href="' + esc(mTrip.Link_File) + '" target="_blank" rel="noopener">PDF Drive</a>' : '') : '<span>Klik "Generate manifest trip"</span>' }) + '</div>';
      var n = { semua: pjs.length, draft: pjs.filter(function (r) { return !r.manifest || r.manifest.Status !== 'Final'; }).length, final: final.length, kurang: pjs.filter(function (r) { return r.anggotaLengkap < r.pj.Jumlah_Pax; }).length };
      var list = pjs.filter(function (r) { return st.f === 'semua' || (st.f === 'draft' && (!r.manifest || r.manifest.Status !== 'Final')) || (st.f === 'final' && r.manifest && r.manifest.Status === 'Final') || (st.f === 'kurang' && r.anggotaLengkap < r.pj.Jumlah_Pax); });
      var kartu = list.map(function (r) {
        var m = r.manifest, fin = m && m.Status === 'Final', p = Math.round(Math.min(r.anggotaLengkap, r.pj.Jumlah_Pax) / r.pj.Jumlah_Pax * 100);
        return '<article class="card card--tight lift stack" style="gap:12px"><div class="row">' + UI.avatar(r.cust.Nama) + '<div class="row__text"><b class="truncate" style="display:block">' + esc(r.cust.Nama) + '</b><small class="muted">' + r.pj.Jumlah_Pax + ' pax · ' + esc(r.pj.Status) + '</small></div>' + (m ? UI.badge((fin ? 'Final' : 'Draft') + ' v' + m.Versi, fin ? 'ok' : 'neutral', fin ? 'file-check' : 'pencil') : '<span class="badge warn">Belum dibuat</span>') + '</div>' +
          '<div class="stack" style="gap:6px"><div class="between" style="font-size:12.5px"><span class="muted">Data rombongan</span><b>' + Math.min(r.anggotaLengkap, r.pj.Jumlah_Pax) + '/' + r.pj.Jumlah_Pax + '</b></div><div class="progress ' + (p >= 100 ? 'ok' : 'warn') + ' thin"><i style="width:' + p + '%"></i></div></div>' +
          (fin ? '<div class="note ok">' + ic('calendar-check') + '<span>' + (m.ID_Lampiran_Calendar ? 'Terlampir di event Calendar' : 'Melampirkan ke Calendar…') + (m.Link_File ? ' · <a href="' + esc(m.Link_File) + '" target="_blank" rel="noopener">PDF</a>' : '') + '</span></div>' : '') +
          '<div class="row wrap" style="gap:6px"><button class="btn btn--ghost btn--sm" data-act="edit" data-pj="' + r.id + '">' + ic(fin || !admin ? 'eye' : 'users', 16) + (fin || !admin ? 'Lihat data' : 'Isi data rombongan') + '</button><button class="btn btn--ghost btn--sm" data-act="lihat" data-pj="' + r.id + '">' + ic('file-text', 16) + 'Pratinjau</button>' +
          (admin ? (m ? (fin ? '<button class="btn btn--soft btn--sm" data-act="revisi" data-m="' + m.ID_Manifest + '">' + ic('git-compare', 16) + 'Buka revisi</button>' : '<button class="btn btn--primary btn--sm" data-act="final" data-m="' + m.ID_Manifest + '">' + ic('circle-check', 16) + 'Tandai final & sinkron</button>') : '<button class="btn btn--soft btn--sm" data-act="buat" data-pj="' + r.id + '">' + ic('plus', 16) + 'Buat draft</button>') : '') + '</div></article>';
      }).join('');
      var kamar = {}; pjs.forEach(function (r) { (ix.angPerPj[r.id] || []).forEach(function (a) { (kamar[a.Kamar || 'Belum diatur'] = kamar[a.Kamar || 'Belum diatur'] || []).push(a.Nama + (a.Gender ? ' (' + a.Gender + ')' : '')); }); });
      var rooming = '<div class="card"><div class="card__head"><div class="card__title"><span class="label">Allotment kamar / kabin</span><h3 class="row" style="gap:8px">' + ic('bed-double', 20, 'primary') + 'Rooming list</h3></div></div><div class="stack" style="gap:8px">' + (Object.keys(kamar).length ? Object.keys(kamar).sort().map(function (k) { return '<div class="kv" style="grid-template-columns:auto 1fr"><dt style="font-weight:700;color:var(--c-text)">' + esc(k) + '</dt><dd style="white-space:normal;font-weight:500;color:var(--c-text-muted)">' + kamar[k].map(esc).join(', ') + '</dd></div>'; }).join('') : '<small class="muted">Belum ada data kamar.</small>') + '</div></div>';
      el.querySelector('#mf-body').innerHTML = kpi + '<div class="between wrap" style="margin:20px 0 12px"><h2>Manifest per customer <small class="muted" style="font-weight:600">(' + pjs.length + ' booking)</small></h2><div class="chips-scroll">' + [['semua', 'Semua'], ['draft', 'Draft'], ['final', 'Final'], ['kurang', 'Data kurang']].map(function (f) { return '<button class="chip ' + (st.f === f[0] ? 'on' : '') + '" data-act="f" data-f="' + f[0] + '">' + f[1] + ' <span class="n">' + n[f[0]] + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="grid-12" style="align-items:start"><div class="span-8 span-lg-12"><div class="bento stagger" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))">' + (kartu || '<div class="card">' + UI.kosong('clipboard-list', 'Tidak ada booking', 'Booking muncul di sini setelah invoice pertama terbit.') + '</div>') + '</div></div><div class="span-4 span-lg-12">' + rooming + '</div></div>';
    }
  };
  window.Halaman.manifest = H;
})();
