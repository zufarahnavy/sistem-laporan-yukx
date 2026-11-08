/* =====================================================================
   YukX — demo.js : "backend" Mode Demo. Aktif otomatis bila GAS_URL di
   js/config.js belum diisi. Memakai mesin logika yang SAMA dengan server
   (engine.js = Logika.gs), data tersimpan di localStorage perangkat ini.
   Integrasi Google (PDF, Calendar, Gmail) & WhatsApp disimulasikan.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  function tabelKosong() { var D = {}; Object.keys(YX.SKEMA).forEach(function (t) { D[t] = []; }); return D; }
  function jeda(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var Demo = {
    siapkan: function (paksa) {
      var simpan = C.LS.get('yukx:demo:db', null);
      if (!paksa && simpan && simpan.D && simpan.v === YX.VERSI && simpan.D.Trip && simpan.D.Trip.length) return simpan.D;
      var D = tabelKosong();
      var base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
      YX.isiDemo(C.hostLokal(D), { simulasi: true, denganPengguna: true, appUrl: base, verifUrl: base + 'verifikasi.html' });
      C.LS.set('yukx:demo:db', { D: D, t: Date.now(), v: YX.VERSI });
      return D;
    },
    S: function (D) { var o = {}; Object.keys(YX.PENGATURAN_DEFAULT).forEach(function (k) { o[k] = YX.PENGATURAN_DEFAULT[k][0]; }); D.Pengaturan.forEach(function (r) { o[r.Kunci] = r.Nilai; }); return o; },
    me: function (u) { return { id: u.ID_Pengguna, nama: u.Nama, email: u.Email, peran: u.Peran, pengelola: u.Pengelola, foto: u.Foto_URL, wa: u.No_WA }; },
    call: async function (action, d) {
      var D = C.Store.D || this.siapkan(), H = C.hostLokal(D), me = C.Store.me;
      switch (action) {
        case 'auth.login': {
          await jeda(350);
          var u = D.Pengguna.find(function (x) { return x.Email.toLowerCase() === String(d.email || '').trim().toLowerCase(); });
          if (!u || u.Status !== 'Aktif' || u.Hash_PIN !== H.hash(String(d.pin || ''), u.Salt)) return YX.fail('Email atau PIN salah. Akun demo: raka@yukx.id / sinta@yukx.id · PIN 123456');
          u.Terakhir_Login = YX.util.nowIso(); var me2 = this.me(u);
          var tx = new YX.Tx(H, me2); tx.log('Login', 'Sistem', u.ID_Pengguna, 'Mode Demo · ' + navigator.userAgent.split(') ')[0].split('(').pop());
          return YX.ok({ token: 'demo.' + u.ID_Pengguna, me: me2 }, 'Selamat datang, ' + u.Nama.split(' ')[0] + '!');
        }
        case 'boot': return YX.ok({ D: D, S: this.S(D), ver: 'demo', info: { waSiap: true, emailSisa: 100, demo: true, integrasi: this.integrasi() } });
        case 'ping': return YX.ok({ ver: 'demo' });
        case 'tugas.proses': {
          var res = { changes: {} }, total = 0;
          for (var loop = 0; loop < 6; loop++) {
            var tx1 = new YX.Tx(H, me || { nama: 'Sistem', peran: 'Admin' }), list = YX.klaimTugas(tx1, 4);
            if (!list.length) { this.gabung(res, tx1.hasil()); break; }
            this.gabung(res, tx1.hasil()); C.Store.terapkan(tx1.hasil()); App.segarkan();
            for (var i = 0; i < list.length; i++) {
              var k = list[i]; await jeda(380 + Math.random() * 380);
              var tx2 = new YX.Tx(H, me), dat = {};
              if (k.Jenis === 'INVOICE_PDF') dat = { fileId: 'demo', url: '' };
              if (k.Jenis === 'CAL_UPSERT') dat = { eventId: k.eventId || ('evt' + C.uuid().replace(/-/g, '').slice(0, 14)) };
              if (k.Jenis === 'MANIFEST_PDF') dat = { fileId: 'demo', url: '', excelUrl: '' };
              if (k.Jenis === 'CAL_LAMPIRAN') dat = { lampiranId: k.eventId || 'demo' };
              if (k.Jenis === 'TRIP_FOLDER') dat = { folderId: 'demo-folder' };
              YX.selesaikanTugas(tx2, k.ID_Tugas, { ok: true, pesan: 'OK (simulasi demo)', data: dat });
              var h2 = tx2.hasil(); this.gabung(res, h2); C.Store.terapkan(h2); App.segarkan(); total++;
            }
          }
          C.Store.simpanCache();
          return Object.assign(YX.ok({ diproses: total, sisa: YX.tugasTertunda(D) }), { changes: res.changes, removed: {} });
        }
        case 'notif.proses': {
          await jeda(300);
          var tx3 = new YX.Tx(H, me), kl = YX.klaimNotif(tx3, d || {}), hasil = {};
          var peta = {}; D.CRM_Kontak.forEach(function (k) { if (k.NoWA) peta[YX.util.hp62(k.NoWA)] = k.StatusWA; });
          kl.wa.forEach(function (r) { hasil[r.AntrianID] = peta[r.Tujuan] === 'Tidak Terdaftar' ? { ok: false, respon: 'Nomor tidak terdaftar WhatsApp (simulasi)' } : { ok: true, respon: 'OK (simulasi Fonnte)' }; });
          kl.email.forEach(function (r) { hasil[r.AntrianID] = { ok: true, respon: 'OK (simulasi Gmail)' }; });
          YX.selesaikanNotif(tx3, hasil); C.Store.simpanCache();
          return Object.assign(YX.ok({ terkirim: Object.keys(hasil).length, sisa: D.AntrianNotif.filter(function (r) { return r.Status === 'Antri'; }).length }), tx3.hasil());
        }
        case 'wa.cek': {
          await jeda(500); var p = {};
          (d.nomor || []).forEach(function (n, i) { var s = C.sha256(String(n)); p[YX.util.hp08(n)] = parseInt(s.slice(0, 2), 16) % 9 === 0 ? 'Tidak Terdaftar' : 'Terdaftar'; });
          return YX.ok({ peta: p }, Object.keys(p).length + ' nomor dicek (simulasi).');
        }
        case 'wa.device': await jeda(300); return YX.ok({ device: '6281211110001', status: 'connect', paket: 'Demo (simulasi)', kuota: 'tanpa batas', expired: '-' });
        case 'wa.tes': await jeda(400); return YX.ok(null, 'Pesan tes terkirim ke ' + d.nomor + ' (simulasi).');
        case 'email.tes': await jeda(400); return YX.ok(null, 'Email tes terkirim ke ' + d.email + ' (simulasi).');
        case 'rahasia.simpan': await jeda(250); C.LS.set('yukx:demo:token', d.nilai === '__HAPUS__' ? '' : String(d.nilai || '').slice(0, 4) + '••••••'); return YX.ok({ ada: d.nilai !== '__HAPUS__', samar: C.LS.get('yukx:demo:token', '') }, 'Token tersimpan (demo: hanya versi tersamar).');
        case 'aset.unggah': case 'bukti.unggah': await jeda(300); return YX.ok({ url: 'data:' + d.file.mime + ';base64,' + d.file.b64 }, 'Gambar tersimpan.');
        case 'template.daftar': return YX.ok({ rows: D.Template_Dokumen });
        case 'template.pindai': await jeda(700); var tpl = D.Template_Dokumen.find(function (t) { return t.Kode === d.kode; }); return YX.ok({ bidang: YX.util.parseJson(tpl && tpl.Bidang, []), versi: tpl ? tpl.Versi : 1 }, 'Template dipindai: ' + (tpl ? YX.util.parseJson(tpl.Bidang, []).length : 0) + ' placeholder (simulasi).');
        case 'sistem.status': return YX.ok(this.integrasi());
        case 'verifikasi.publik': return YX.hitung.verifikasiPublik(D, d.k);
        case 'demo.reset': C.LS.del('yukx:demo:db'); var Dn = this.siapkan(true); C.Store.D = Dn; return YX.ok({ D: Dn }, 'Data demo dikembalikan seperti semula.');
        case 'import.pindai': case 'import.jalankan': return YX.fail('Import dari spreadsheet lama hanya tersedia setelah backend Apps Script terpasang.');
        case 'auth.keluar': return YX.ok(null, 'Sampai jumpa!');
        default:
          if (YX.ROUTES[action]) { var r = YX.jalankan(H, me, action, d); C.Store.simpanCache(); return r; }
          return YX.fail('Aksi ' + action + ' tidak tersedia di Mode Demo.');
      }
    },
    gabung: function (res, h) { Object.keys(h.changes || {}).forEach(function (t) { res.changes[t] = (res.changes[t] || []).concat(h.changes[t]); }); },
    integrasi: function () {
      return { sheets: { ok: true, info: 'Mode Demo — data di perangkat ini' }, drive: { ok: true, info: 'Simulasi folder per trip' }, calendar: { ok: true, info: 'Simulasi kalender "YukX Trips"' },
        gmail: { ok: true, info: 'Kuota simulasi 100/hari' }, fonnte: { ok: true, info: 'Perangkat simulasi terhubung' }, demo: true, versi: YX.VERSI };
    }
  };
  window.Demo = Demo;
})();
