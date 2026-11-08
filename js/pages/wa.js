/* YukX — Halaman WhatsApp & Notifikasi + CRM Kontak (Fonnte, Email, blast per batch) */
(function () {
  'use strict';
  var C = window.Core, Store = C.Store, esc = C.esc, ic = C.ic, F = C.F, U = C.U;
  var st = { tab: 'blast', aud: null, pilih: {}, pesan: 'Halo {nama} 👋\n\n', judul: '', batch: 0, jeda: '', blast: '', auto: false, qf: 'semua', kanal: '', crmQ: '', crmSeg: '', crmF: '', crmPilih: {}, crmHal: 1 }, autoT = null;

  function kpiAntrean() { var a = Store.D.AntrianNotif; return { antri: a.filter(function (r) { return r.Status === 'Antri' || r.Status === 'Proses'; }).length, ok: a.filter(function (r) { return r.Status === 'Terkirim'; }).length, gagal: a.filter(function (r) { return r.Status === 'Gagal'; }).length, batal: a.filter(function (r) { return r.Status === 'Batal'; }).length }; }
  function waBadge(s) { return s === 'Terdaftar' ? '<span class="badge ok" style="height:20px;font-size:10.5px">✓ WA</span>' : s === 'Tidak Terdaftar' ? '<span class="badge danger" style="height:20px;font-size:10.5px">✕ bukan WA</span>' : '<span class="badge neutral" style="height:20px;font-size:10.5px">? belum dicek</span>'; }
  function bubble(txt) { return '<div style="background:#E7FFDB;color:#111B21;border-radius:12px 12px 12px 4px;padding:10px 12px;font-size:14px;white-space:pre-wrap;box-shadow:0 1px 1px rgba(0,0,0,.08);max-width:100%;word-break:break-word">' + esc(txt).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') + '<div style="text-align:right;font-size:11px;color:#667781;margin-top:4px">' + F.jam(U.nowIso()) + ' ✓✓</div></div>'; }
  async function deteksi(nomor, btn) {
    nomor = nomor.filter(function (n, i, a) { return U.hpValid(n) && a.indexOf(n) === i; }); if (!nomor.length) { UI.toast('Tidak ada nomor valid untuk dicek.', 'warn'); return; }
    var peta = {}, label = btn ? btn.innerHTML : '';
    for (var i = 0; i < nomor.length; i += 50) {
      if (btn) btn.innerHTML = ic('loader-circle', 16, 'spin') + 'Mengecek ' + Math.min(nomor.length, i + 50) + '/' + nomor.length;
      var r = await C.api('wa.cek', { nomor: nomor.slice(i, i + 50) }); if (!r.success) { UI.toast(r.message, 'err'); break; } Object.assign(peta, r.data.peta);
    }
    if (btn) btn.innerHTML = label;
    if (Object.keys(peta).length) await C.aksi('wa.simpanCek', { peta: peta });
  }

  // --------------------------------------------------------------- tab Blast
  function tabBlast(el) {
    var S = Store.S, trips = U.urutkan(Store.D.Trip.filter(function (t) { return t.Status !== 'Batal'; }), function (t) { return t.Tgl_Berangkat; }, true);
    st.batch = st.batch || Number(S.WA_BATCH_DEFAULT || 20); st.jeda = st.jeda || S.WA_JEDA_DETIK || '5';
    return '<div class="grid-12" style="align-items:start"><div class="span-6 span-lg-12 card stack" style="gap:14px"><h3 class="row" style="gap:8px">' + ic('users', 20, 'primary') + '1. Pilih sasaran</h3>' +
      '<div class="form"><div class="field"><label>Segmen</label><select class="select" id="bl-seg"><option value="Customer">Customer</option><option value="Tim Admin">Tim Admin</option><option value="Tim Finance">Tim Finance</option><option value="">Semua kontak</option></select></div><div class="field"><label>Peserta trip</label><select class="select" id="bl-trip"><option value="">Semua (tanpa filter trip)</option>' + trips.map(function (t) { return '<option value="' + t.ID_Trip + '">' + esc(t.Nama) + ' · ' + U.tglId(t.Tgl_Berangkat) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Tag mengandung</label><input class="input" id="bl-tag" placeholder="VIP, Repeat…"></div><div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" id="bl-wa">Hanya nomor terdeteksi WA</label></div></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn btn--primary btn--sm" data-act="muat">' + ic('users', 16) + 'Muat penerima</button><button class="btn btn--soft btn--sm" data-act="deteksi">' + ic('smartphone', 16) + 'Deteksi nomor WA</button></div><div id="bl-aud"></div></div>' +
      '<div class="span-6 span-lg-12 stack" style="gap:16px"><div class="card stack" style="gap:12px"><h3 class="row" style="gap:8px">' + ic('message-square-text', 20, 'primary') + '2. Tulis pesan</h3><div class="field"><label>Judul internal</label><input class="input" id="bl-judul" value="' + esc(st.judul) + '" placeholder="contoh: Promo early bird Desember"></div>' +
      '<div class="row wrap" style="gap:6px">' + ['{nama}', '{trip}', '{sisa}', '{perusahaan}'].map(function (v) { return '<button class="chip" data-act="var" data-v="' + v + '">' + v + '</button>'; }).join('') + '</div><textarea class="textarea" id="bl-pesan" rows="6">' + esc(st.pesan) + '</textarea>' +
      '<span class="label">Pratinjau (penerima pertama)</span><div id="bl-prev" style="background:#EFE7DE;border-radius:var(--r-md);padding:14px"></div></div>' +
      '<div class="card stack" style="gap:12px"><h3 class="row" style="gap:8px">' + ic('timer', 20, 'primary') + '3. Ukuran batch & jeda</h3><div class="row wrap" style="gap:12px"><div class="seg seg--primary" id="bl-batch">' + [10, 20, 50].map(function (n) { return '<button data-b="' + n + '" class="' + (st.batch === n ? 'on' : '') + '">' + n + '/batch</button>'; }).join('') + '</div><div class="input-group" style="max-width:180px"><span class="addon">Jeda</span><input class="input" id="bl-jeda" value="' + esc(st.jeda) + '" placeholder="5 atau 3-8"></div></div><div id="bl-ring" class="note"></div>' +
      '<button class="btn btn--primary btn--block" data-act="mulai">' + ic('megaphone', 18) + '<span id="bl-mulai">Mulai blast</span></button><small class="muted">Tips anti-banned: mulai batch 10, jeda acak ≥5 dtk, hindari tautan yang sama ke ratusan orang dalam 1 jam. Kontak opt-out & bertag DEMO otomatis dilewati.</small></div></div></div>' +
      '<div id="bl-aktif" style="margin-top:16px"></div><div class="card card--pad0" style="margin-top:16px"><div style="padding:16px 20px"><h3>Riwayat blast</h3></div><div id="bl-riwayat"></div></div>';
  }
  function isiBlast(el) {
    var a = st.aud, box = el.querySelector('#bl-aud'); if (!box) return;
    if (a) {
      var r = a.ringkas, pilih = a.rows.filter(function (x) { return st.pilih[x.id] !== false && x.valid && !x.ganda && !x.optOut && (!el.querySelector('#bl-wa').checked || x.statusWA === 'Terdaftar'); });
      box.innerHTML = '<div class="row wrap" style="gap:6px">' + [['Total', r.total, ''], ['Valid', r.valid, 'ok'], ['Tidak valid', r.tidakValid, 'danger'], ['Ganda', r.ganda, 'warn'], ['Terdaftar WA', r.terdaftarWA, 'ok'], ['Opt-out', r.optOut, 'neutral']].map(function (x) { return '<span class="badge ' + x[2] + '">' + x[0] + ' ' + x[1] + '</span>'; }).join('') + '</div>' +
        '<div class="table-wrap" style="max-height:340px;overflow:auto;margin-top:10px">' + UI.tabel({ tanpaMain: true, kolom: [{ label: '', mlabel: '', render: function (x) { return '<input type="checkbox" data-pil="' + x.id + '"' + (st.pilih[x.id] !== false && x.valid && !x.ganda && !x.optOut ? ' checked' : '') + (x.valid && !x.optOut ? '' : ' disabled') + ' style="width:18px;height:18px">'; } }, { label: 'Nama', render: function (x) { return '<b style="' + (x.valid ? '' : 'opacity:.5') + '">' + esc(x.nama) + '</b>' + (x.optOut ? ' <span class="badge neutral">opt-out</span>' : '') + (x.demo ? ' <span class="badge accent" style="height:18px;font-size:10px">DEMO</span>' : ''); } }, { label: 'Nomor', render: function (x) { return '<span class="mono">' + esc(x.hp || '-') + '</span>'; } }, { label: 'WA', render: function (x) { return waBadge(x.statusWA); } }], baris: a.rows }) + '</div>';
      st.target = pilih;
    } else { box.innerHTML = '<div class="note">' + ic('info') + '<span>Klik "Muat penerima" untuk menyusun daftar dari CRM.</span></div>'; st.target = []; }
    var first = (st.target || [])[0]; el.querySelector('#bl-prev').innerHTML = bubble(U.isiTemplate(st.pesan, Object.assign({ nama: first ? first.nama : 'Budi', perusahaan: Store.S.PT_NAMA }, first ? first.vars : { trip: 'Sailing Komodo & Padar', sisa: 'Rp 4.450.000' })));
    var n = (st.target || []).length, jeda = String(st.jeda).split('-').map(Number), rata = jeda.length > 1 ? (jeda[0] + jeda[1]) / 2 : jeda[0] || 5;
    el.querySelector('#bl-ring').innerHTML = ic('info') + '<span><b>' + n + '</b> penerima → <b>' + Math.ceil(n / st.batch) + '</b> batch · estimasi ±' + Math.max(1, Math.round(n * rata / 60)) + ' menit</span>';
    el.querySelector('#bl-mulai').textContent = 'Mulai blast (' + n + ' nomor)';
    var aktif = Store.D.BlastWA.filter(function (b) { return b.Status === 'Berjalan'; }), box2 = el.querySelector('#bl-aktif');
    box2.innerHTML = aktif.map(function (b) { var p = b.Total ? Math.round((b.Terkirim + b.Gagal) / b.Total * 100) : 0; return '<div class="card stack" style="gap:12px;border-color:var(--c-primary-soft)"><div class="between wrap"><div><span class="label">Blast berjalan</span><h3>' + esc(b.Judul) + '</h3></div><span class="badge solid">' + ic('activity', 14) + 'Berjalan</span></div><div class="progress"><i style="width:' + p + '%"></i></div><div class="row wrap" style="gap:12px;font-size:13px"><span class="ok"><b>' + b.Terkirim + '</b> terkirim</span><span class="danger"><b>' + b.Gagal + '</b> gagal</span><span class="muted"><b>' + (b.Total - b.Terkirim - b.Gagal) + '</b> sisa</span><span class="muted">batch ' + b.UkuranBatch + ' · jeda ' + esc(b.JedaDetik) + ' dtk</span></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn btn--primary btn--sm" data-act="batch" data-id="' + b.BlastID + '">' + ic('play', 16) + 'Kirim batch berikutnya sekarang</button><label class="switch" style="min-height:36px"><input type="checkbox" id="bl-auto"' + (st.auto ? ' checked' : '') + '><span class="track"></span>Otomatis</label><button class="btn btn--danger-ghost btn--sm" data-act="stop" data-id="' + b.BlastID + '">' + ic('square', 16) + 'Hentikan</button></div><small class="muted">Server tetap mengirim 1 batch/menit lewat trigger walau halaman ditutup.</small></div>'; }).join('');
    var ab = el.querySelector('#bl-auto'); if (ab) ab.onchange = function () { st.auto = ab.checked; jalanOtomatis(el); };
    el.querySelector('#bl-riwayat').innerHTML = UI.tabel({ kolom: [{ label: 'Judul', render: function (b) { return '<b>' + esc(b.Judul) + '</b><span class="sub">' + F.waktu(b.Tanggal) + ' · ' + esc(b.DibuatOleh) + '</span>'; } }, { label: 'Sasaran', key: 'Sasaran' }, { label: 'Batch · jeda', render: function (b) { return b.UkuranBatch + ' · ' + esc(b.JedaDetik) + ' dtk'; } }, { label: 'Progres', render: function (b) { return '<b>' + b.Terkirim + '</b>/' + b.Total + (b.Gagal ? ' <span class="danger">(' + b.Gagal + ' gagal)</span>' : ''); } }, { label: 'Status', render: function (b) { return UI.badge(b.Status); } }], baris: U.urutkan(Store.D.BlastWA, function (b) { return b.Tanggal; }, true), kosong: 'Belum ada blast', kosongIkon: 'megaphone' });
  }
  function jalanOtomatis(el) {
    clearInterval(autoT); if (!st.auto) return;
    autoT = setInterval(async function () {
      var b = Store.D.BlastWA.find(function (x) { return x.Status === 'Berjalan'; }); if (!b || !el.isConnected || !st.auto) { clearInterval(autoT); st.auto = false; return; }
      var r = await C.api('notif.proses', { blastId: b.BlastID, hanyaBlast: true }); if (r.success) { Store.terapkan(r); App.segarkan(); }
    }, C.DEMO ? 4000 : 30000);
  }

  // --------------------------------------------------------------- tab Antrean
  function tabAntrean() {
    var k = kpiAntrean();
    return '<div class="bento two-sm stagger">' + UI.stat({ label: 'Menunggu', ikon: 'hourglass', tone: 'warn', nilai: UI.hitung(k.antri) }) + UI.stat({ label: 'Terkirim', ikon: 'circle-check', tone: 'ok', nilai: UI.hitung(k.ok) }) + UI.stat({ label: 'Gagal', ikon: 'circle-x', tone: 'danger', nilai: UI.hitung(k.gagal) }) + UI.stat({ label: 'Dibatalkan', ikon: 'circle', nilai: UI.hitung(k.batal) }) + '</div>' +
      '<div class="card card--pad0" style="margin-top:16px"><div class="toolbar" style="padding:16px;gap:10px"><div class="chips-scroll" id="an-f">' + [['semua', 'Semua'], ['Antri', 'Menunggu'], ['Terkirim', 'Terkirim'], ['Gagal', 'Gagal'], ['Batal', 'Batal']].map(function (f) { return '<button class="chip ' + (st.qf === f[0] ? 'on' : '') + '" data-act="qf" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div><select class="select" id="an-kanal" style="width:auto"><option value="">Semua kanal</option><option' + (st.kanal === 'WA' ? ' selected' : '') + '>WA</option><option' + (st.kanal === 'EMAIL' ? ' selected' : '') + '>EMAIL</option></select><span class="grow"></span><button class="btn btn--ghost btn--sm" data-act="ulangi">' + ic('rotate-ccw', 16) + 'Ulangi yang gagal</button><button class="btn btn--primary btn--sm" data-act="proses">' + ic('send', 16) + 'Proses sekarang</button></div><div id="an-list"></div></div>';
  }
  function isiAntrean(el) {
    var box = el.querySelector('#an-list'); if (!box) return;
    var rows = U.urutkan(Store.D.AntrianNotif.filter(function (r) { return (st.qf === 'semua' || r.Status === st.qf || (st.qf === 'Antri' && r.Status === 'Proses')) && (!st.kanal || r.Kanal === st.kanal); }), function (r) { return r.DibuatPada; }, true).slice(0, 300);
    box.innerHTML = UI.tabel({ kolom: [{ label: 'Waktu', render: function (r) { return '<b>' + F.waktu(r.DibuatPada) + '</b><span class="sub">' + (r.DikirimPada ? 'terkirim ' + F.jam(r.DikirimPada) : '') + '</span>'; } }, { label: 'Kanal', render: function (r) { return '<span class="badge ' + (r.Kanal === 'WA' ? 'ok' : '') + '">' + ic(r.Kanal === 'WA' ? 'message-circle' : 'mail', 13) + r.Kanal + '</span>'; } }, { label: 'Tujuan', render: function (r) { return '<b class="truncate" style="display:block;max-width:180px">' + esc(r.NamaPenerima) + '</b><span class="sub mono">' + esc(r.Tujuan) + '</span>'; } }, { label: 'Event', render: function (r) { return '<span class="badge neutral">' + esc(r.Event) + '</span>'; } }, { label: 'Pesan', render: function (r) { return '<span class="clamp-2" style="max-width:320px;font-size:13px">' + esc(r.Subjek ? r.Subjek + ' — ' : '') + esc(r.Pesan) + '</span>'; } }, { label: 'Status', render: function (r) { return UI.badge(r.Status === 'Antri' ? 'Menunggu' : r.Status) + (r.Respon && r.Status !== 'Terkirim' ? '<span class="sub danger">' + esc(r.Respon) + '</span>' : ''); } }], baris: rows, kosong: 'Antrean kosong', kosongIkon: 'inbox', tanpaMain: true });
  }

  // --------------------------------------------------------------- tab CRM
  function tabCrm() {
    return '<div id="crm-kpi" class="bento two-sm stagger"></div><div class="card card--pad0" style="margin-top:16px"><div class="stack" style="padding:16px;gap:12px"><div class="toolbar" style="gap:10px"><div class="input-ic grow" style="min-width:200px">' + ic('search', 18) + '<input class="input" id="crm-q" type="search" placeholder="Cari nama, email, nomor…" value="' + esc(st.crmQ) + '"></div><button class="btn btn--ghost btn--sm" data-act="sync">' + ic('refresh-cw', 16) + 'Sinkron sekarang</button><button class="btn btn--ghost btn--sm" data-act="crmXls">' + ic('download', 16) + 'Ekspor</button></div><div class="chips-scroll" id="crm-seg"></div><div id="crm-bulk"></div></div><div id="crm-list"></div></div>';
  }
  function isiCrm(el) {
    var box = el.querySelector('#crm-list'); if (!box) return;
    var kk = Store.D.CRM_Kontak, hpN = {}, emN = {}; kk.forEach(function (k) { if (k.NoWA) hpN[k.NoWA] = (hpN[k.NoWA] || 0) + 1; if (k.Email) emN[k.Email] = (emN[k.Email] || 0) + 1; });
    var dup = function (k) { return (k.NoWA && hpN[k.NoWA] > 1) || (k.Email && emN[k.Email] > 1); };
    var n = { total: kk.length, wa: kk.filter(function (k) { return k.StatusWA === 'Terdaftar'; }).length, email: kk.filter(function (k) { return k.EmailValid === 'YA'; }).length, belum: kk.filter(function (k) { return k.NoWA && !k.StatusWA; }).length, opt: kk.filter(function (k) { return k.OptOut === 'YA'; }).length, dup: kk.filter(dup).length };
    el.querySelector('#crm-kpi').innerHTML = [['Total kontak', n.total, 'contact', '', ''], ['WA terverifikasi', n.wa, 'circle-check', 'ok', 'wa'], ['Email valid', n.email, 'mail', '', 'email'], ['Belum dicek WA', n.belum, 'smartphone', 'warn', 'belum'], ['Opt-out', n.opt, 'circle-x', 'danger', 'opt'], ['Duplikat', n.dup, 'files', 'warn', 'dup']].map(function (x) { return '<div class="card stat lift press" style="min-height:0;cursor:pointer" data-act="crmF" data-f="' + x[4] + '"><div class="between"><span class="label">' + x[0] + '</span><span class="ic-box ' + x[3] + '" style="width:36px;height:36px">' + ic(x[2], 18) + '</span></div><div class="stat__val">' + x[1] + '</div></div>'; }).join('');
    var seg = {}; kk.forEach(function (k) { seg[k.Segmen] = (seg[k.Segmen] || 0) + 1; });
    el.querySelector('#crm-seg').innerHTML = '<button class="chip ' + (!st.crmSeg && !st.crmF ? 'on' : '') + '" data-act="crmSeg" data-s="">Semua <span class="n">' + kk.length + '</span></button>' + Object.keys(seg).map(function (s) { return '<button class="chip ' + (st.crmSeg === s ? 'on' : '') + '" data-act="crmSeg" data-s="' + esc(s) + '">' + esc(s) + ' <span class="n">' + seg[s] + '</span></button>'; }).join('') + (st.crmF ? '<button class="chip on" data-act="crmF" data-f="">Filter: ' + esc(st.crmF) + ' ✕</button>' : '');
    var q = st.crmQ.toLowerCase(), rows = kk.filter(function (k) {
      if (st.crmSeg && k.Segmen !== st.crmSeg) return false;
      if (st.crmF === 'wa' && k.StatusWA !== 'Terdaftar') return false; if (st.crmF === 'email' && k.EmailValid !== 'YA') return false; if (st.crmF === 'belum' && !(k.NoWA && !k.StatusWA)) return false; if (st.crmF === 'opt' && k.OptOut !== 'YA') return false; if (st.crmF === 'dup' && !dup(k)) return false;
      return !q || (k.Nama + ' ' + k.Email + ' ' + k.NoWA + ' ' + k.Tag).toLowerCase().indexOf(q) > -1;
    });
    rows = U.urutkan(rows, function (k) { return k.Nama.toLowerCase(); }); var PER = 30, mx = Math.max(1, Math.ceil(rows.length / PER)); st.crmHal = Math.min(st.crmHal, mx);
    var dipilih = Object.keys(st.crmPilih).filter(function (k) { return st.crmPilih[k]; });
    el.querySelector('#crm-bulk').innerHTML = dipilih.length ? '<div class="row wrap fade" style="gap:8px;padding:10px 12px;border-radius:var(--r-md);background:var(--c-primary-tint)"><b>' + dipilih.length + ' dipilih</b><button class="btn btn--soft btn--sm" data-act="bulk" data-a="deteksi">' + ic('smartphone', 15) + 'Deteksi WA</button><button class="btn btn--soft btn--sm" data-act="bulk" data-a="tag">' + ic('tag', 15) + 'Beri tag</button><button class="btn btn--soft btn--sm" data-act="bulk" data-a="blast">' + ic('megaphone', 15) + 'Blast ke terpilih</button><button class="btn btn--ghost btn--sm" data-act="bulk" data-a="optout">Opt-out</button><button class="btn btn--ghost btn--sm" data-act="bulk" data-a="optin">Opt-in</button><button class="btn btn--plain btn--sm" data-act="bulk" data-a="bersih">Batal pilih</button></div>' : '';
    box.innerHTML = UI.tabel({ tanpaMain: true, kolom: [{ label: '', mlabel: '', render: function (k) { return '<input type="checkbox" data-cp="' + k.KontakID + '"' + (st.crmPilih[k.KontakID] ? ' checked' : '') + ' style="width:18px;height:18px">'; } },
      { label: 'Kontak', render: function (k) { return '<div class="cell-main">' + UI.avatar(k.Nama, '', 'sm') + '<div class="row__text"><b class="truncate">' + esc(k.Nama) + '</b><span class="sub">' + esc(k.Segmen) + (dup(k) ? ' · <span class="warn">duplikat</span>' : '') + '</span></div></div>'; } },
      { label: 'Email', render: function (k) { return k.Email ? '<span class="truncate" style="display:block;max-width:200px">' + (k.EmailValid === 'YA' ? '' : '⚠ ') + esc(k.Email) + '</span>' : '<span class="muted">—</span>'; } },
      { label: 'WhatsApp', render: function (k) { return k.NoWA ? '<span class="mono">' + esc(k.NoWA) + '</span> ' + waBadge(k.StatusWA) + ' <a href="https://wa.me/' + U.hp62(k.NoWA) + '" target="_blank" rel="noopener" aria-label="Chat">' + ic('external-link', 14) + '</a>' : '<span class="warn">kosong</span>'; } },
      { label: 'Tag', render: function (k) { return esc(String(k.Tag || '').replace(/DEMO,?\s*/, '')) || '<span class="muted">—</span>'; } },
      { label: 'Dihubungi', render: function (k) { return k.TerakhirDihubungi ? F.relatif(k.TerakhirDihubungi) + '<span class="sub">' + k.JumlahPesan + ' pesan</span>' : '<span class="muted">Belum</span>'; } },
      { label: '', mlabel: '', render: function (k) { return (k.OptOut === 'YA' ? '<span class="badge neutral">opt-out</span> ' : '') + (k.Sumber === 'customer' ? '<a class="btn btn--plain btn--sm btn--icon" href="#/customer/' + k.RefID + '" aria-label="Detail">' + ic('chevron-right', 16) + '</a>' : ''); } }
    ], baris: rows.slice((st.crmHal - 1) * PER, st.crmHal * PER), kosong: 'Tidak ada kontak', kosongIkon: 'contact' }) +
      (mx > 1 ? '<div class="between" style="padding:12px 16px;border-top:1px solid var(--c-border)"><small class="muted">' + rows.length + ' kontak</small><div class="row" style="gap:6px">' + Array.from({ length: mx }, function (_, i) { return '<button class="btn btn--sm ' + (st.crmHal === i + 1 ? 'btn--primary' : 'btn--ghost') + '" data-act="crmHal" data-n="' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>' : '');
  }

  // --------------------------------------------------------------- tab Konfigurasi
  function tabKonfig() {
    var S = Store.S, m = YX.matriksNotif(S), waOn = S.NOTIF_WA_AKTIF === 'YA', emOn = S.NOTIF_EMAIL_AKTIF === 'YA', tok = C.DEMO ? C.LS.get('yukx:demo:token', '') : (Store.info.waToken || '');
    return '<div class="grid-12" style="align-items:start"><div class="span-6 span-lg-12 card stack" style="gap:14px"><div class="between"><h3 class="row" style="gap:8px">' + ic('message-circle', 20, 'ok') + 'WhatsApp (Fonnte)</h3><span class="badge ' + (Store.info.waSiap ? 'ok' : 'warn') + '">' + (Store.info.waSiap ? 'Token tersimpan' : 'Token belum diisi') + '</span></div>' +
      '<label class="switch"><input type="checkbox" id="kf-wa"' + (waOn ? ' checked' : '') + '><span class="track"></span><b>Notifikasi WhatsApp ' + (waOn ? 'AKTIF' : 'NONAKTIF') + '</b></label>' +
      '<div class="field"><label>Token Fonnte <span class="soft">disimpan di Script Properties</span></label><div class="row" style="gap:8px"><input class="input" type="password" id="kf-token" autocomplete="off" placeholder="' + esc(tok || 'Tempel token dari fonnte.com → Device') + '"><button class="btn btn--soft" data-act="token">' + ic('key-round', 16) + 'Simpan</button></div><div class="help">Token tidak pernah dikirim balik ke browser — hanya versi tersamar.</div></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn btn--ghost btn--sm" data-act="device">' + ic('smartphone', 16) + 'Cek perangkat</button><button class="btn btn--ghost btn--sm" data-act="tesWa">' + ic('send', 16) + 'Kirim tes WA</button></div><div id="kf-dev"></div>' +
      '<div class="form"><div class="field"><label>Batch default</label><select class="select" id="kf-batch">' + [10, 20, 50].map(function (n) { return '<option' + (Number(S.WA_BATCH_DEFAULT) === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div><div class="field"><label>Jeda antarpesan (detik)</label><input class="input" id="kf-jeda" value="' + esc(S.WA_JEDA_DETIK) + '"></div></div>' +
      '<label class="switch"><input type="checkbox" id="kf-det"' + (S.WA_DETEKSI_OTOMATIS === 'YA' ? ' checked' : '') + '><span class="track"></span>Deteksi otomatis nomor kontak baru</label><label class="switch"><input type="checkbox" id="kf-demo"' + (S.NOTIF_KIRIM_DEMO === 'YA' ? ' checked' : '') + '><span class="track"></span>Kirimi juga kontak bertag DEMO</label></div>' +
      '<div class="span-6 span-lg-12 card stack" style="gap:14px"><div class="between"><h3 class="row" style="gap:8px">' + ic('mail', 20, 'primary') + 'Email (Gmail)</h3><span class="badge">Sisa kuota ±' + (Store.info.emailSisa != null ? Store.info.emailSisa : 100) + '/hari</span></div><label class="switch"><input type="checkbox" id="kf-em"' + (emOn ? ' checked' : '') + '><span class="track"></span><b>Notifikasi Email ' + (emOn ? 'AKTIF' : 'NONAKTIF') + '</b></label>' +
      '<div class="field"><label>Nama pengirim</label><input class="input" id="kf-nama" value="' + esc(S.EMAIL_NAMA_PENGIRIM) + '"></div><div class="field"><label>URL aplikasi (untuk {link})</label><input class="input" id="kf-url" value="' + esc(S.APP_URL) + '" placeholder="https://username.github.io/yukx-laporan/"></div><button class="btn btn--ghost btn--sm" data-act="tesEmail" style="width:max-content">' + ic('send', 16) + 'Kirim tes email ke saya</button>' +
      '<div class="note">' + ic('clock') + '<span>Trigger 1 menit mengirim antrean & pengingat harian (jatuh tempo H-1, keberangkatan H-3).</span></div></div>' +
      '<div class="span-12 card card--pad0"><div class="between wrap" style="padding:16px 20px"><div class="card__title"><h3>Matriks notifikasi otomatis</h3><p>Pilih event mana yang dikirim lewat WhatsApp/Email, dan ubah isi pesannya.</p></div><button class="btn btn--primary" data-act="simpanKonfig">' + ic('save', 18) + 'Simpan konfigurasi</button></div>' +
      UI.tabel({ tanpaMain: true, kolom: [{ label: 'Event', render: function (e) { return '<b>' + esc(e.label) + '</b><span class="sub mono">' + e.kode + ' → ' + esc(e.target) + '</span>'; } }, { label: 'WhatsApp', render: function (e) { return '<label class="switch" style="min-height:36px"><input type="checkbox" data-mx="' + e.kode + '" data-k="wa"' + (e.wa ? ' checked' : '') + '><span class="track"></span></label>'; } }, { label: 'Email', render: function (e) { return '<label class="switch" style="min-height:36px"><input type="checkbox" data-mx="' + e.kode + '" data-k="email"' + (e.email ? ' checked' : '') + '><span class="track"></span></label>'; } }, { label: '', mlabel: '', render: function (e) { return '<button class="btn btn--ghost btn--sm" data-act="tpl" data-k="' + e.kode + '">' + ic('pencil', 15) + 'Ubah pesan</button>'; } }], baris: Object.keys(m).map(function (k) { return m[k]; }) }) + '</div></div>';
  }

  var H = {
    judul: 'WhatsApp & CRM',
    render: function (el, args) {
      if (!Hal.hanyaAdmin()) return;
      st.tab = args[0] || st.tab; st.mx = st.mx || null;
      var k = kpiAntrean();
      el.innerHTML = Hal.kepala({ crumbs: ['Sistem', 'WhatsApp & notifikasi'], judul: 'WhatsApp, Notifikasi & CRM', sub: 'Notifikasi otomatis ke pelanggan & tim internal (Fonnte + Gmail), blast per batch anti-banned, dan CRM kontak Nama · Email · WhatsApp.',
        aksi: '<span class="status-pill">' + ic('message-circle', 16, Store.S.NOTIF_WA_AKTIF === 'YA' ? 'ok' : 'muted') + 'WA ' + (Store.S.NOTIF_WA_AKTIF === 'YA' ? 'aktif' : 'nonaktif') + '</span><span class="status-pill">' + ic('mail', 16, Store.S.NOTIF_EMAIL_AKTIF === 'YA' ? 'primary' : 'muted') + 'Email ' + (Store.S.NOTIF_EMAIL_AKTIF === 'YA' ? 'aktif' : 'nonaktif') + '</span>' }) +
        '<div class="tabs">' + [['blast', 'megaphone', 'Blast WhatsApp'], ['antrean', 'inbox', 'Antrean & riwayat'], ['crm', 'contact', 'CRM kontak'], ['konfig', 'settings', 'Konfigurasi']].map(function (t) { return '<button data-act="tab" data-t="' + t[0] + '" class="' + (st.tab === t[0] ? 'on' : '') + '">' + ic(t[1], 16) + t[2] + (t[0] === 'antrean' && k.gagal ? ' <span class="badge danger" style="height:18px">' + k.gagal + '</span>' : '') + '</button>'; }).join('') + '</div><div id="wa-body" class="fade"></div>';
      Hal.aksiPeta(el, aksiWa(el));
      el.oninput = function (e) {
        if (e.target.id === 'bl-pesan') { st.pesan = e.target.value; isiBlast(el); }
        if (e.target.id === 'bl-judul') st.judul = e.target.value;
        if (e.target.id === 'bl-jeda') { st.jeda = e.target.value; isiBlast(el); }
        if (e.target.id === 'crm-q') { clearTimeout(H._t); H._t = setTimeout(function () { st.crmQ = e.target.value; st.crmHal = 1; isiCrm(el); }, 200); }
      };
      el.onchange = function (e) {
        var t = e.target;
        if (t.dataset.pil) { st.pilih[t.dataset.pil] = t.checked; isiBlast(el); }
        if (t.id === 'bl-wa') isiBlast(el);
        if (t.dataset.cp) { st.crmPilih[t.dataset.cp] = t.checked; isiCrm(el); }
        if (t.id === 'an-kanal') { st.kanal = t.value; isiAntrean(el); }
        if (t.dataset.mx) { st.mx = st.mx || YX.matriksNotif(Store.S); st.mx[t.dataset.mx][t.dataset.k] = t.checked; }
      };
      H.tab(el);
    },
    tab: function (el) {
      var b = el.querySelector('#wa-body'); b.classList.remove('fade'); void b.offsetWidth; b.classList.add('fade');
      el.querySelectorAll('.tabs [data-t]').forEach(function (x) { x.classList.toggle('on', x.dataset.t === st.tab); });
      if (st.tab === 'blast') { b.innerHTML = tabBlast(el); isiBlast(el); el.querySelector('#bl-batch').onclick = function (e) { var x = e.target.closest('[data-b]'); if (!x) return; st.batch = +x.dataset.b; this.querySelectorAll('button').forEach(function (y) { y.classList.toggle('on', y === x); }); isiBlast(el); }; }
      if (st.tab === 'antrean') { b.innerHTML = tabAntrean(); isiAntrean(el); }
      if (st.tab === 'crm') { b.innerHTML = tabCrm(); isiCrm(el); }
      if (st.tab === 'konfig') { st.mx = null; b.innerHTML = tabKonfig(); }
      UI.hitungNaik(b);
    },
    navigasi: function (el, args) { st.tab = args[0] || st.tab; H.tab(el); },
    segarkan: function (el) { if (st.tab === 'blast') isiBlast(el); if (st.tab === 'antrean') { var k = kpiAntrean(); var s = el.querySelectorAll('#wa-body .stat__val'); [k.antri, k.ok, k.gagal, k.batal].forEach(function (v, i) { if (s[i]) s[i].textContent = v; }); isiAntrean(el); } if (st.tab === 'crm') isiCrm(el); }
  };
  function aksiWa(el) {
    return {
      tab: function (d) { st.tab = d.t; history.replaceState(null, '', '#/wa/' + d.t); H.tab(el); },
      muat: async function (d, b) { var r = await C.aksi('wa.audiens', { segmen: el.querySelector('#bl-seg').value, idTrip: el.querySelector('#bl-trip').value, tag: el.querySelector('#bl-tag').value }, { btn: b, diam: true }); if (r.success) { st.aud = r.data; st.pilih = {}; isiBlast(el); UI.toast(r.data.rows.length + ' kontak dimuat.', 'ok'); } },
      deteksi: async function (d, b) { if (!st.aud) { UI.toast('Muat penerima dulu.', 'warn'); return; } await deteksi(st.aud.rows.map(function (x) { return x.hp; }), b); var r = await C.aksi('wa.audiens', { segmen: el.querySelector('#bl-seg').value, idTrip: el.querySelector('#bl-trip').value, tag: el.querySelector('#bl-tag').value }, { diam: true }); if (r.success) { st.aud = r.data; isiBlast(el); } },
      'var': function (d) { var ta = el.querySelector('#bl-pesan'), p = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, p) + d.v + ta.value.slice(p); st.pesan = ta.value; ta.focus(); isiBlast(el); },
      mulai: async function (d, b) {
        var t = st.target || []; if (!t.length) { UI.toast('Belum ada penerima terpilih.', 'warn'); return; }
        if (!(await UI.konfirmasi({ judul: 'Mulai blast ke ' + t.length + ' nomor?', teks: 'Dikirim bertahap ' + st.batch + ' pesan per batch dengan jeda ' + st.jeda + ' detik.', ok: 'Mulai blast', ikon: 'megaphone' }))) return;
        var r = await C.aksi('wa.blastBuat', { judul: st.judul, pesan: st.pesan, ukuranBatch: st.batch, jeda: st.jeda, sasaran: el.querySelector('#bl-seg').value + (el.querySelector('#bl-trip').value ? ' · ' + el.querySelector('#bl-trip').selectedOptions[0].text : ''), penerima: t.map(function (x) { return { hp: x.hp, nama: x.nama, vars: x.vars }; }) }, { btn: b });
        if (r.success) { st.aud = null; isiBlast(el); }
      },
      batch: async function (d, b) { var l = b.innerHTML; b.innerHTML = ic('loader-circle', 16, 'spin') + 'Mengirim…'; var r = await C.api('notif.proses', { blastId: d.id, hanyaBlast: true }); b.innerHTML = l; if (r.success) { Store.terapkan(r); App.segarkan(); UI.toast(r.data.terkirim + ' pesan diproses.', 'ok'); } else UI.toast(r.message, 'err'); },
      stop: async function (d) { if (await UI.konfirmasi({ judul: 'Hentikan blast?', teks: 'Pesan yang belum terkirim dibatalkan.', ok: 'Hentikan', bahaya: true })) { st.auto = false; C.aksi('wa.blastStop', { blastId: d.id }); } },
      qf: function (d) { st.qf = d.f; el.querySelectorAll('#an-f .chip').forEach(function (c) { c.classList.toggle('on', c.dataset.f === d.f); }); isiAntrean(el); },
      proses: async function (d, b) { var l = b.innerHTML; b.innerHTML = ic('loader-circle', 16, 'spin') + 'Memproses…'; var r = await C.api('notif.proses', {}); b.innerHTML = l; if (r.success) { Store.terapkan(r); App.segarkan(); UI.toast(r.data.terkirim + ' pesan diproses.', 'ok'); } else UI.toast(r.message, 'err'); },
      ulangi: function (d, b) { C.aksi('notif.ulangi', {}, { btn: b }); },
      sync: function (d, b) { C.aksi('crm.sync', {}, { btn: b }); },
      crmSeg: function (d) { st.crmSeg = d.s; st.crmF = ''; st.crmHal = 1; isiCrm(el); }, crmF: function (d) { st.crmF = d.f; st.crmHal = 1; isiCrm(el); }, crmHal: function (d) { st.crmHal = +d.n; isiCrm(el); },
      crmXls: function () { Dok.excel('CRM Kontak ' + U.hariIni(), [{ nama: 'Kontak', rows: [['ID', 'Nama', 'Email', 'WhatsApp', 'Segmen', 'Status WA', 'Tag', 'Opt-out', 'Jumlah Pesan', 'Terakhir Dihubungi']].concat(Store.D.CRM_Kontak.map(function (k) { return [k.KontakID, k.Nama, k.Email, k.NoWA, k.Segmen, k.StatusWA, k.Tag, k.OptOut, k.JumlahPesan, k.TerakhirDihubungi]; })) }]).catch(function (e) { UI.toast(e.message, 'err'); }); },
      bulk: async function (d, b) {
        var ids = Object.keys(st.crmPilih).filter(function (k) { return st.crmPilih[k]; });
        if (d.a === 'bersih') { st.crmPilih = {}; isiCrm(el); return; }
        if (d.a === 'deteksi') { await deteksi(ids.map(function (id) { return (Store.get('CRM_Kontak', id) || {}).NoWA; }), b); return; }
        if (d.a === 'blast') { var kk = ids.map(function (id) { return Store.get('CRM_Kontak', id); }); st.aud = { rows: kk.map(function (k) { return { id: k.KontakID, nama: k.Nama, hp: U.hp08(k.NoWA), statusWA: k.StatusWA, optOut: k.OptOut === 'YA', valid: U.hpValid(k.NoWA), ganda: false, demo: /DEMO/.test(k.Tag), vars: { nama: k.Nama } }; }), ringkas: { total: kk.length, valid: kk.filter(function (k) { return U.hpValid(k.NoWA); }).length, tidakValid: 0, ganda: 0, terdaftarWA: kk.filter(function (k) { return k.StatusWA === 'Terdaftar'; }).length, optOut: kk.filter(function (k) { return k.OptOut === 'YA'; }).length } }; st.pilih = {}; st.tab = 'blast'; H.tab(el); return; }
        var nilai = ''; if (d.a === 'tag') { nilai = await UI.konfirmasi({ judul: 'Beri tag ke ' + ids.length + ' kontak', input: { label: 'Nama tag', wajib: true, placeholder: 'contoh: Prospek Desember' }, ok: 'Terapkan' }); if (!nilai) return; }
        var r = await C.aksi('crm.bulk', { ids: ids, aksi: d.a, nilai: nilai }, { btn: b }); if (r.success) { st.crmPilih = {}; isiCrm(el); }
      },
      token: async function (d, b) { var v = el.querySelector('#kf-token').value.trim(); if (!v) { UI.toast('Tempel token Fonnte dulu.', 'warn'); return; } var r = await C.api('rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai: v }); el.querySelector('#kf-token').value = ''; UI.toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { Store.info.waSiap = r.data.ada; Store.info.waToken = r.data.samar; el.querySelector('#kf-token').placeholder = r.data.samar; } },
      device: async function (d, b) { var r = await C.api('wa.device', {}); el.querySelector('#kf-dev').innerHTML = r.success ? '<dl class="kv"><dt>Nomor</dt><dd>' + esc(r.data.device) + '</dd><dt>Status</dt><dd class="' + (r.data.status === 'connect' ? 'ok' : 'danger') + '">' + esc(r.data.status) + '</dd><dt>Paket</dt><dd>' + esc(r.data.paket) + '</dd><dt>Kuota</dt><dd>' + esc(r.data.kuota) + '</dd></dl>' : '<div class="note danger">' + ic('circle-alert') + esc(r.message) + '</div>'; },
      tesWa: async function () { var n = await UI.konfirmasi({ judul: 'Kirim tes WhatsApp', input: { label: 'Nomor tujuan', wajib: true, nilai: Store.me.wa || '' }, ok: 'Kirim tes' }); if (n) { var r = await C.api('wa.tes', { nomor: n }); UI.toast(r.message, r.success ? 'ok' : 'err'); } },
      tesEmail: async function () { var r = await C.api('email.tes', { email: Store.me.email }); UI.toast(r.message, r.success ? 'ok' : 'err'); },
      tpl: function (d) {
        st.mx = st.mx || YX.matriksNotif(Store.S); var e = st.mx[d.k];
        UI.modal({ judul: 'Template: ' + e.label, sub: 'Variabel: {nama} {trip} {tglTrip} {pax} {total} {noInvoice} {jenis} {nominal} {jatuhTempo} {sisa} {terbayar} {rekening} {link} {meetingPoint} {perusahaan}', ukuran: 'lg',
          isi: UI.form([{ name: 'subjek', label: 'Subjek email', full: true, nilai: e.subjek }, { name: 'pesan', label: 'Isi pesan (WA & email)', type: 'textarea', rows: 7, full: true, nilai: e.pesan }]) + '<span class="label" style="display:block;margin:12px 0 6px">Pratinjau</span><div id="tp-prev" style="background:#EFE7DE;border-radius:var(--r-md);padding:14px"></div>',
          onBuka: function (h) { var f = function () { h.body.querySelector('#tp-prev').innerHTML = bubble(U.isiTemplate(h.body.querySelector('[name=pesan]').value, { nama: 'Budi Santoso', trip: 'Sailing Komodo & Padar 4D3N', tglTrip: '10–13 Nov 2026', pax: 2, total: 'Rp 17.800.000', noInvoice: 'YX/INV/2026/11/0071', jenis: 'DP', nominal: 'Rp 8.900.000', jatuhTempo: '11 November 2026', sisa: 'Rp 8.900.000', terbayar: 'Rp 8.900.000', rekening: Store.S.BANK_NAMA + ' ' + Store.S.BANK_NOREK, link: Store.S.APP_URL || 'https://…', meetingPoint: 'Bandara Komodo (LBJ)', perusahaan: Store.S.PT_NAMA, customer: 'Budi Santoso', oleh: Store.me.nama, versi: 3, keputusan: 'DISETUJUI', alasan: 'Harga kapal naik', metode: 'QRIS', jenisBayar: 'DP' })); }; h.body.addEventListener('input', f); f(); },
          aksi: [{ label: 'Kembalikan bawaan', kelas: 'btn--plain', tutup: false, klik: function (h) { h.body.querySelector('[name=pesan]').value = e.pesanDefault; h.body.querySelector('[name=subjek]').value = e.subjekDefault; h.body.dispatchEvent(new Event('input')); } }, { label: 'Pakai template ini', kelas: 'btn--primary', klik: function (h) { e.pesan = h.body.querySelector('[name=pesan]').value; e.subjek = h.body.querySelector('[name=subjek]').value; UI.toast('Template diubah — klik "Simpan konfigurasi".', 'info'); } }] });
      },
      simpanKonfig: async function (d, b) {
        var g = function (id) { return el.querySelector(id); };
        var r = await C.aksi('notif.simpanKonfig', { waAktif: g('#kf-wa').checked, emailAktif: g('#kf-em').checked, batchDefault: g('#kf-batch').value, jeda: g('#kf-jeda').value, deteksiOtomatis: g('#kf-det').checked, kirimDemo: g('#kf-demo').checked, namaPengirim: g('#kf-nama').value, appUrl: g('#kf-url').value, matriks: st.mx || YX.matriksNotif(Store.S) }, { btn: b });
        if (r.success) { st.mx = null; H.tab(el); }
      }
    };
  }
  window.Halaman.wa = H;
})();
