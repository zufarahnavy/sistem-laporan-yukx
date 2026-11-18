/* =====================================================================
   YukBanyuwangi — demo.js : "backend" Mode Demo. Aktif otomatis bila GAS_URL
   di js/config.js belum diisi. Memakai mesin logika yang SAMA dengan server
   (engine.js = Logika.gs); data contoh = isi file Dummy Database Pemesanan
   klien + data tambahan, tersimpan di localStorage perangkat ini.
   Google Sheets, Drive, Calendar, Gmail & WhatsApp disimulasikan.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  function tabelKosong() { var D = {}; Object.keys(YX.SKEMA).forEach(function (t) { D[t] = []; }); return D; }
  function jeda(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // Isi file contoh klien: KALKULASI_AGUNG (Kalkulasi CS) & ITINERARY_INDOFARMA (Google Docs)
  var CS_AGUNG = [['BUS', 10000000], ['JEEP BALURAN', 5000000], ['TL', 1500000], ['TIM DOKUMENTASI', 2500000], ['AIR MINERAL', 500000], ['MAKAN DAY 1', 4000000], ['MAKAN DAY 2', 4000000], ['MAKAN DAY 3', 400000], ['PAKET PULAU', 5000000], ['DJAWATAN', 500000], ['PAKET PULAU SB', 5000000], ['PAKET GREEN ISLAND', 2000000], ['PULAU MERAH', 500000], ['BALURAN', 500000], ['GWD', 500000], ['IJEN', 500000], ['GUIDE IJEN', 500000], ['SERVICE', 500000]];
  var ITIN_DOC = "Hari Pertama\\u000b07:00 Penjemputan di Stasiun / Hotel sekitar Banyuwangi. Jika anda menggunakan flight maka trip ini masih bisa menyesuaikan dengan jadwal kedatangan.\\u000b07:30 Sarapan pagi di resto lokal dan dilanjutkan Persiapan untuk melanjutkan tour\\u000b10:00 Mengunjungi Hutan De Djawatan\\u000b11:30 Menuju Taman Nasional Baluran (Bisa additional charge jeep safari*)\\u000b13:00 Makan siang di resto lokal searah perjalanan kawasan Baluran\\u000b14:00 Sampai di Taman Nasional Baluran, Anda akan diajak menikmati keindahan lansekap sanava Bekol lewat menara Pandang dan mengabadikan momen kunjungan Anda di savana Bekol dengan background gunung Baluran\\u000b14:30 Mengunjungi pantai Bama dan mangrove trail\\u000b15:30 Meninggalkan Taman Nasional Baluran, peserta bisa melihat panorama sunset di savana bekol. Jika beruntung anda akan berjumpa dengan satwa endemik seperti rusa, merak hijau, ayam hutan, kerbau liar dll\\u000b18:30 Makan malam\\u000b20:00 Kembali ke hotel dan istirahat\\u000b\nHari Kedua\\u000b07:00 Makan pagi di hotel\\u000b08:00 Berangkat menuju meeting point Pantai Grandwatudodol persiapan menyebrang transit kapal wisata\\u000b09:00 Menyeberang ke pulau Menjangan dari pantai Watudodol dengan estimasi perjalanan satu jam dengan view pasir putih dan gradasi pantai taman nasional Bali Barat\\u000b10:00 Registrasi pengunjung, dilanjut agenda bebas dan photo session di dermaga Pulau Menjangan dan takat Pasir\\u000b11:00 Snorkeling di spot pertama\\u000b12:00 Makan siang\\u000b13:00 Snorkeling di spot kedua\\u000b14:00 Mengunjungi Pulau Tabuhan, Anda bisa snorkeling di area dangkal atau berkeliling pulau sambil mengambil gambar, tidak sampai 10 menit untuk mengelilingi seluruh pulau\\u000b15:00 Meninggalkan Pulau Tabuhan\\u000b16:00 Bilas \u2013 bilas dan diantar kembali ke Hotel\\u000b19:00 Makan malam kuliner daerah Banyuwangi sambil menikmati suasana malam kota Banyuwangi\\u000b20:30 Kembali ke Hotel dan istirahat untuk persiapan naik ke Ijen\\u000b\nHari Ketiga\\u000b00:10 Penjemputan Hotel sekitar Banyuwangi Kota\\u000b00:30 Berangkat menuju Kawah Ijen (Bisa additional charge ke Kawah Wurung*)\\u000b01:30 Sampai Paltuding, kemudian konfirmasi tiket online\\u000b02:00 Persiapan melakukan pendakian\\u000b04:00 Sampai area Puncak, jika beruntung Anda bisa melihat panorama kawah ijen dan Sunrise Point\\u000b06:00 Kembali ke Paltuding\\u000b08:00 Peserta akan diantar ke meeting point penjemputan\\u000b09:00 Paket wisata berakhir dan kami akan mengantar Anda kembali ke Stasiun / Bandara / Hotel";
  function pdfUrl(file) { try { var bin = atob(file.b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([a], { type: 'application/pdf' })); } catch (e) { return ''; } }
  function catatEvent(D, H, me, id, tamu) {
    var tx = new YX.Tx(H, me), p = tx.get('Pesanan', id); if (!p) return {};
    var ev = YX.hitung.eventPesanan(tx.D, YX.hitung.indeks(tx.D), p, Demo.S(D)); if (!ev) return {};
    var row = { Event_ID: 'yb' + YX.util.hashTeks(id) + 'demo', Hash: ev.hash, Lampiran: ev.lampiran ? ev.lampiran.fileId : '', Tamu: JSON.stringify(tamu || ev.tamu), Status: 'OK', Pesan: 'Tersinkron (simulasi)', Diperbarui: tx.now() };
    if (tx.get('Kalender_Event', id)) tx.update('Kalender_Event', id, row); else { row.ID_Pesanan = id; tx.insert('Kalender_Event', row); }
    return tx.hasil().changes;
  }
  function gabung(res, ch) { res.changes = res.changes || {}; Object.keys(ch || {}).forEach(function (t) { res.changes[t] = (res.changes[t] || []).concat(ch[t]); }); }

  var Demo = {
    siapkan: function (paksa) {
      var simpan = C.LS.get('yb:demo:db', null);
      if (!paksa && simpan && simpan.D && simpan.v === YX.VERSI && simpan.D.Pesanan && simpan.D.Pesanan.length) return simpan.D;
      var D = tabelKosong();
      var base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
      YX.isiDemo(C.hostLokal(D), { simulasi: true, denganPengguna: true, appUrl: base, verifUrl: base + 'verifikasi.html' });
      C.LS.set('yb:demo:db', { D: D, t: Date.now(), v: YX.VERSI });
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
          if (!u || u.Status !== 'Aktif' || u.Hash_PIN !== H.hash(String(d.pin || ''), u.Salt)) return YX.fail('Email atau PIN salah. Akun demo: admin@yukbanyuwangi.demo / finance@yukbanyuwangi.demo · PIN 123456');
          u.Terakhir_Login = YX.util.nowIso(); var me2 = this.me(u);
          var tx = new YX.Tx(H, me2); tx.log('Login', 'Sistem', u.ID_Pengguna, 'Mode Demo · ' + navigator.userAgent.split(') ')[0].split('(').pop());
          return YX.ok({ token: 'demo.' + u.ID_Pengguna, me: me2 }, 'Selamat datang, ' + u.Nama.split(' ')[0] + '!');
        }
        case 'boot': return YX.ok({ D: D, S: this.S(D), ver: 'demo', src: 'demo', info: { waSiap: true, emailSisa: 100, demo: true, sumberOk: true, sumberNama: 'Dummy Database Pemesanan YukX (contoh)', integrasi: this.integrasi(), kalender: { id: '' } } });
        case 'ping': return YX.ok({ ver: 'demo', src: 'demo' });
        case 'sumber.tarik': await jeda(300); return YX.ok({ src: 'demo', ok: true, Pesanan: [], hapus: [], Sumber_Tab: D.Sumber_Tab });
        case 'sumber.info': await jeda(250); return YX.ok({ pesanan: { nama: 'Dummy Database Pemesanan YukX', ok: true, samar: '1Dem••••••Pes0', diubah: YX.util.nowIso() }, rekap: C.LS.get('yb:demo:rekap', true) ? { nama: 'Dummy Rekapitulasi Trip', ok: true, samar: '1Dem••••••Rek0' } : null, trigger: true, tab: D.Sumber_Tab });
        case 'sumber.atur': await jeda(900); if (d.jenis === 'rekap') C.LS.set('yb:demo:rekap', d.url !== '__HAPUS__'); return d.url === '__HAPUS__' ? YX.ok(null, 'Link dilepas (simulasi).') : (/docs\.google\.com\/spreadsheets\/d\//.test(d.url) ? YX.ok(null, 'Terhubung (simulasi Mode Demo). Di versi live, aplikasi membaca file ini & memasang trigger perubahan.') : YX.fail('Link Google Sheets tidak valid.'));
        case 'sumber.siapkan': await jeda(700); return YX.ok(null, 'Kolom TANGGAL PESAN & ID SISTEM siap di ' + D.Sumber_Tab.length + ' tab (simulasi).');
        case 'sumber.sembunyi': await jeda(400); return YX.ok({ n: D.Sumber_Tab.length }, 'Kolom ID SISTEM ' + (d.sembunyi ? 'disembunyikan' : 'ditampilkan') + ' di ' + D.Sumber_Tab.length + ' tab (simulasi).');
        case 'kalkulasi.baca':
          await jeda(800);
          // Demo: link Google Sheets apa pun dibaca sebagai file contoh KALKULASI_AGUNG (versi live membaca file aslinya)
          if (!/docs\.google\.com\/spreadsheets\/d\//.test(d.url || '')) return YX.fail('Link bukan Google Sheets.');
          var asli = /1ContohKalkulasiAgungDemoYukBanyuwangi000000/.test(d.url);
          return YX.ok({ judul: asli ? 'KALKULASI AGUNG' : 'KALKULASI AGUNG (contoh demo)', tab: 'INDOFARMA', pax: asli ? 30 : null, items: CS_AGUNG.map(function (x) { return { uraian: x[0], budget: x[1], terima: null, grup: '' }; }) });
        case 'itinerary.baca':
          await jeda(700);
          if (!/docs\.google\.com\/document\/d\//.test(d.url || '')) return YX.fail('Link bukan Google Docs.');
          return YX.ok({ judul: /1ContohItineraryIndofarmaDemoYukBanyuwangi0/.test(d.url) ? 'ITINERARY INDOFARMA' : 'ITINERARY INDOFARMA (contoh demo)', teks: ITIN_DOC.replace(/\\u000b/g, '\u000b') });
        case 'dokumen.simpan': {
          await jeda(650);
          var url = pdfUrl(d.file), fid = 'demo-' + C.uuid().slice(0, 8), res;
          if (d.jenis === 'manifest') { res = YX.jalankan(H, me, 'manifest.catatTerbit', { ID_Pesanan: d.ref, url: url, fileId: fid }); if (res.success) { await jeda(450); gabung(res, catatEvent(D, H, me, d.ref)); res.kalender = { ok: true, pesan: 'Event diperbarui (simulasi)' }; } }
          else res = YX.jalankan(H, me, 'invoice.catatTerbit', { ID_Invoice: d.ref, url: url, fileId: fid, kirim: d.kirim });
          C.Store.simpanCache(); return res;
        }
        case 'kalender.undang': {
          await jeda(700);
          var r0 = YX.jalankan(H, me, 'manifest.catatUndang', { ID_Pesanan: d.idPesanan, emails: d.emails, kabari: d.kabari, wa: d.wa });
          if (r0.success) { var m0 = D.Manifest.find(function (m) { return m.ID_Pesanan === d.idPesanan; }); gabung(r0, catatEvent(D, H, me, d.idPesanan, YX.util.parseJson(m0 && m0.Diundang, []))); r0.kalender = { ok: true }; }
          C.Store.simpanCache(); return r0;
        }
        case 'kalender.sinkron': { var txK = new YX.Tx(H, me); txK.job('KAL_SINKRON', 'semua', {}); return Object.assign(txK.hasil(YX.ok(null, 'Sinkron Google Calendar dijadwalkan (simulasi).'))); }
        case 'rekap.tulisSheet': { var txR = new YX.Tx(H, me); txR.job('REKAP_SHEET', d.bulan || 'semua', {}); return Object.assign(txR.hasil(YX.ok(null, 'Rekap ditulis ke Google Sheet Rekapitulasi (simulasi).'))); }
        case 'tugas.proses': {
          var res = { changes: {} }, total = 0;
          for (var loop = 0; loop < 6; loop++) {
            var tx1 = new YX.Tx(H, me || { nama: 'Sistem', peran: 'Admin' }), list = YX.klaimTugas(tx1, 4);
            if (!list.length) { this.gabung(res, tx1.hasil()); break; }
            this.gabung(res, tx1.hasil()); C.Store.terapkan(tx1.hasil()); App.segarkan();
            for (var i = 0; i < list.length; i++) {
              var k = list[i]; await jeda(380 + Math.random() * 380);
              var tx2 = new YX.Tx(H, me), dat = {};
              if (k.Jenis === 'KAL_SINKRON') dat = { hasil: (k.events || []).map(function (e) { return { id: e.id, eventId: e.eventId || 'yb' + YX.util.hashTeks(e.id) + 'demo', hash: e.hash, ok: true, pesan: 'Tersinkron (simulasi)', lampiran: e.lampiran ? e.lampiran.fileId : '', tamu: e.tamu }; }), hapus: (k.hapus || []).map(function (x) { return x.id; }), sisa: k.sisa };
              YX.selesaikanTugas(tx2, k.ID_Tugas, { ok: true, pesan: k.Jenis === 'REKAP_SHEET' ? 'Rekap ' + (k.bulan || []).map(function (b) { return b.label; }).join(', ') + ' ditulis (simulasi)' : 'OK (simulasi demo)', data: dat });
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
        case 'rahasia.simpan': await jeda(250); C.LS.set('yb:demo:token', d.nilai === '__HAPUS__' ? '' : String(d.nilai || '').slice(0, 4) + '••••••'); return YX.ok({ ada: d.nilai !== '__HAPUS__', samar: C.LS.get('yb:demo:token', '') }, 'Token tersimpan (demo: hanya versi tersamar).');
        case 'aset.unggah': case 'bukti.unggah': await jeda(300); return YX.ok({ url: 'data:' + d.file.mime + ';base64,' + d.file.b64 }, 'Gambar tersimpan.');
        case 'sistem.status': return YX.ok(this.integrasi());
        case 'verifikasi.publik': return YX.hitung.verifikasiPublik(D, d.k);
        case 'demo.reset': C.LS.del('yb:demo:db'); var Dn = this.siapkan(true); C.Store.D = Dn; return YX.ok({ D: Dn }, 'Data demo dikembalikan seperti semula.');
        case 'auth.keluar': return YX.ok(null, 'Sampai jumpa!');
        default:
          if (YX.ROUTES[action]) { var r = YX.jalankan(H, me, action, d); C.Store.simpanCache(); return r; }
          return YX.fail('Aksi ' + action + ' tidak tersedia di Mode Demo.');
      }
    },
    gabung: function (res, h) { Object.keys(h.changes || {}).forEach(function (t) { res.changes[t] = (res.changes[t] || []).concat(h.changes[t]); }); },
    integrasi: function () {
      return { sumber: { ok: true, info: '"Dummy Database Pemesanan YukX" · simulasi' }, rekap: { ok: true, info: '"Dummy Rekapitulasi Trip" · simulasi' }, sheets: { ok: true, info: 'Mode Demo — data di perangkat ini' }, drive: { ok: true, info: 'Simulasi folder Manifest & Invoice' }, calendar: { ok: true, info: 'Simulasi kalender "YukBanyuwangi Trips"' },
        gmail: { ok: true, info: 'Kuota simulasi 100/hari' }, fonnte: { ok: true, info: 'Perangkat simulasi terhubung' }, demo: true, versi: YX.VERSI };
    }
  };
  window.Demo = Demo;
})();
