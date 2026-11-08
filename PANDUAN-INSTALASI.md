# Panduan Instalasi — Otomatisasi Sistem Laporan YukX v1.1.0

Aplikasi ini terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Isi | Dipasang di | Waktu |
|---|---|---|---|
| **Backend** | 6 berkas `.gs` + `appsscript.json` | Google Apps Script (akun Google pemilik data) | ± 15 menit |
| **Frontend** | ZIP `yukx-laporan.zip` (folder ini) | GitHub Pages (gratis) | ± 20 menit |

Data tersimpan di **Google Sheets**, dokumen PDF di **Google Drive**, jadwal trip di **Google Calendar** (tampil juga di menu **Kalender Trip**), email terkirim lewat **Gmail**, dan WhatsApp lewat **Fonnte**. Semua token dan kunci rahasia tersimpan di **Script Properties** — tidak ada di kode, Sheets, maupun di GitHub.

> **Sudah memakai v1.0.0?** Langsung ke **Bagian E — Update aplikasi**. Data Anda tidak berubah.

### Yang baru di v1.1.0
- **Alur RAB & realisasi anggaran baru** — Admin menyusun RAB dan mencatat realisasi; Finance menyetujui RAB dan mengaudit realisasi. Hanya realisasi yang sudah **Final** yang masuk Laporan Laba Rugi. Trip yang realisasinya melebihi RAB diberi tanda **Melebihi RAB** (dan **RUGI** bila labanya minus). Lihat **Bagian C2**.
- **Menu Kalender Trip** — embed Google Calendar "YukX Trips" + kalender bulanan dengan daftar peserta dan statusnya. Lihat **Bagian C3**.
- **Semua PDF dirapikan untuk kertas A4** — RAB, laporan realisasi, rekap, laba rugi, manifest, invoice, dan kuitansi. Lihat **Bagian C4**.

---

## 0. Coba dulu Mode Demo (tanpa memasang apa pun)

Selama `js/config.js` belum diisi, aplikasi berjalan dalam **Mode Demo**: data contoh lengkap (8 trip bergambar, 40 customer, 33 penjualan, ±50 invoice, RAB berversi, realisasi dengan berbagai status audit, manifest, CRM, riwayat WhatsApp) tersimpan di browser perangkat Anda.

- Klik dua kali `index.html` (Chrome/Edge), atau buka situs GitHub Pages Anda sebelum `config.js` diisi.
- Akun demo (PIN **123456**): **raka@yukx.id** (Admin, pengelola pengguna) · **sinta@yukx.id** (Finance).
- Contoh status realisasi di data demo: Derawan & Bromo **Final**, Labuan Bajo **Diajukan** (melebihi RAB Rp 9,86 jt), Belitung **Perlu Perbaikan** — cocok untuk mencoba alur audit.
- PDF, Calendar, WhatsApp, dan email **disimulasikan** di Mode Demo. Menu **Pengaturan → Integrasi & data → Reset data demo** mengembalikan data contoh.

---

## Bagian A — Pasang backend di Google Apps Script

Gunakan **akun Google yang akan memiliki data** (spreadsheet, folder Drive, kalender, dan pengirim email). Akun ini juga yang nanti menjadi Admin pertama.

### A1. Buat proyek
1. Buka **https://script.google.com** → **Proyek baru**.
2. Klik judul "Proyek tanpa judul" → ganti menjadi **YukX Backend**.

### A2. Tampilkan berkas manifes
1. Klik ⚙️ **Setelan proyek** (ikon roda gigi di kiri).
2. Centang **Tampilkan file manifes "appsscript.json" di editor**.
3. Kembali ke ⟨⟩ **Editor**.

### A3. Salin 7 berkas backend
Berkas backend diberikan terpisah (bukan di dalam ZIP). Untuk setiap berkas:

| Berkas yang diterima | Cara membuat di editor |
|---|---|
| `Kode.gs` | Klik berkas bawaan **Kode.gs / Code.gs**, hapus semua isinya, tempel isi `Kode.gs`. Bila namanya "Code", klik ⋮ → **Ganti nama** → `Kode` |
| `Logika.gs` | Klik **+** di samping "Berkas" → **Skrip** → ketik `Logika` → Enter → tempel isi |
| `Integrasi.gs` | **+** → **Skrip** → `Integrasi` → tempel |
| `Notifikasi.gs` | **+** → **Skrip** → `Notifikasi` → tempel |
| `Setup.gs` | **+** → **Skrip** → `Setup` → tempel |
| `QrLib.gs` | **+** → **Skrip** → `QrLib` → tempel |
| `appsscript.json` | Klik `appsscript.json` → hapus semua → tempel isi `appsscript.json` |

Tekan **Ctrl+S** (Simpan). Urutan berkas tidak berpengaruh.

> `appsscript.json` mengaktifkan layanan lanjutan **Google Calendar API** dan **Google Sheets API** secara otomatis. Bila editor meminta, setujui.

### A4. Jalankan setup (sekali)
1. Di bilah atas editor, pilih fungsi **`setupAppEnvironment`** → klik **▶ Jalankan**.
2. Muncul **Otorisasi diperlukan** → **Tinjau izin** → pilih akun Anda.
3. Bila muncul "Google belum memverifikasi aplikasi ini": klik **Lanjutan** → **Buka YukX Backend (tidak aman)** → **Izinkan**. Ini normal untuk skrip milik sendiri.
4. Tunggu hingga **Log eksekusi** menampilkan `✅ SETUP SELESAI` (±1 menit).
5. **Catat baris ini** — hanya tampil sekali:
   ```
   ★ AKUN ADMIN PERTAMA → email: nama@gmail.com · PIN: 123456
   ```

Setup membuat secara otomatis:
- Spreadsheet **"YukX — Database Laporan"** (23 sheet, kolom nomor HP & tanggal berformat teks agar angka 0 di depan tidak hilang).
- Folder Drive **"YukX — Laporan & Dokumen"** berisi `Trip/`, `Aset Aplikasi/`, `Bukti Transfer/`, `Template Dokumen/`.
- Kalender **"YukX Trips"** (privat), lalu **dibagikan hanya-baca** ke email semua akun tim yang aktif.
- 4 template Google Docs: Invoice, Kuitansi, Manifest per Customer, Manifest per Trip.
- Akun Admin pertama (pengelola pengguna) dengan PIN acak.
- Trigger: pekerja tiap 1 menit, pengingat harian 07:00 WIB, dan pendeteksi edit spreadsheet.
- Rahasia di Script Properties: `SESSION_SECRET`, `PIN_PEPPER`, `SPREADSHEET_ID`, `FOLDER_*`, `CALENDAR_ID`.

Setup **aman dijalankan ulang** kapan saja (misalnya setelah update kode): tidak membuat admin, template, atau data ganda, dan hanya **menambah** kolom yang belum ada.

### A5. (Opsional) Isi data contoh di server
Pilih fungsi **`isiDataDemo`** → **▶ Jalankan**. Data contoh dibuat **tanpa akun ber-PIN diketahui**. Customer contoh bertag `DEMO` dan **tidak pernah dikirimi** WhatsApp/email. Sebelum dipakai sungguhan, jalankan **`kosongkanDataDemo`** (hanya berjalan bila semua customer masih bertag DEMO).

### A6. Deploy sebagai Web App
1. Klik **Terapkan / Deploy** → **Deployment baru**.
2. Klik ⚙️ di samping "Pilih jenis" → **Aplikasi web**.
3. Isi:
   - Deskripsi: `v1.1.0`
   - **Jalankan sebagai: Saya** (akun Anda)
   - **Yang memiliki akses: Siapa saja**
4. **Terapkan** → salin **URL aplikasi web** (berakhiran `/exec`).
5. Uji: buka URL itu di browser. Harus tampil `{"success":true,"message":"YukX API aktif. Gunakan POST.", ...}`.

> "Siapa saja" diperlukan agar browser bisa memanggil API. Keamanan dijaga oleh login email + PIN, token sesi bertanda tangan, dan pemeriksaan hak akses di server untuk setiap aksi.

---

## Bagian B — Pasang frontend di GitHub Pages

### B1. Install Git & buat akun GitHub (sekali saja)
- Windows: unduh **https://git-scm.com/download/win**, install dengan pilihan bawaan. Buka **PowerShell** atau **Git Bash**.
- Mac: buka Terminal, ketik `git --version` (macOS menawarkan instalasi bila belum ada).
- Daftar di **https://github.com**. Username Anda menjadi bagian alamat situs (`username.github.io`).

Atur identitas Git (sekali per komputer):
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### B2. Siapkan folder frontend
1. Ekstrak **`yukx-laporan.zip`**, misalnya ke `Documents\yukx-laporan`.
2. **Folder hasil ekstraksi inilah folder proyek** — tempat `git init` dijalankan nanti. Jangan masuk lebih dalam, jangan naik satu level.
3. Buka `js\config.js` dengan Notepad, ganti URL contoh dengan URL `/exec` dari langkah A6:
   ```js
   window.APP_CONFIG = {
     GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec'
   };
   ```
   Simpan. Hanya URL ini yang ada di frontend — bukan rahasia.

### B3. Buat repository
Di github.com: **+** → **New repository** → nama misalnya `yukx-laporan` → **Public** → **jangan** centang README/.gitignore/license → **Create repository**.

### B4. Masuk ke folder proyek & periksa isinya
Buka folder `yukx-laporan` di File Explorer → klik address bar → ketik `powershell` → Enter. Lalu:
```powershell
dir
```
Yang **harus** terlihat di daftar teratas: `index.html`, `verifikasi.html`, folder `css`, `js`, `assets`. Bila yang terlihat justru sebuah folder `yukx-laporan`, ketik `cd yukx-laporan` lalu `dir` lagi. **Jangan lanjut sebelum `index.html` terlihat** — inilah penyebab utama situs 404.

### B5. Kirim ke GitHub (satu per satu)
```bash
git init
git add .
git commit -m "Upload pertama YukX"
git branch -M main
git remote add origin https://github.com/USERNAME/yukx-laporan.git
git push -u origin main
```
Saat diminta **Password**, tempel **Personal Access Token** (bukan sandi GitHub). Layar memang terlihat kosong saat menempel — itu normal.

Membuat token: **https://github.com/settings/tokens** → **Generate new token (classic)** → centang **repo** → **Generate** → salin `ghp_...` (hanya tampil sekali).

> Jangan pakai "Add file → Upload files" di web GitHub: struktur folder `css/` dan `js/` akan rusak.

### B6. Aktifkan GitHub Pages
Repo → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: **main / (root)** → **Save**. Centang **Enforce HTTPS**. Tunggu 1–2 menit hingga muncul *"Your site is live at https://USERNAME.github.io/yukx-laporan/"*.

---

## Bagian C — Langkah pertama setelah online

1. Buka situs → masuk dengan email & PIN dari langkah A4.
2. Klik avatar (kanan atas) → **Profil** → **Ganti PIN**.
3. **Pengaturan → Perusahaan & invoice → Tautan & kalender**:
   - URL aplikasi: `https://USERNAME.github.io/yukx-laporan/`
   - URL halaman verifikasi QR: `https://USERNAME.github.io/yukx-laporan/verifikasi.html`
   - Lengkapi nama PT, alamat, rekening, penanda tangan → **Simpan perubahan**.
4. **Pengaturan → Identitas & tampilan**: unggah logo & favicon, pilih palet warna dan font. Penyimpanan diblokir otomatis bila kontras warna di bawah standar WCAG (4,5:1).
5. **Pengaturan → Pengguna & RBAC** → **Tambah pengguna** (maks. 5 akun aktif). PIN awal tampil sekali — berikan langsung ke orangnya. **Gunakan email akun Google** (Gmail atau Google Workspace) agar orang itu bisa melihat embed Google Calendar; kalender otomatis dibagikan hanya-baca ke email tersebut.
6. **WhatsApp & CRM → Konfigurasi**:
   - Tempel **token Fonnte** → Simpan (tersimpan di Script Properties, tampil tersamar).
   - **Cek perangkat** → **Kirim tes WA** → **Kirim tes email**.
   - Nyalakan saklar WhatsApp & Email, atur matriks notifikasi per kejadian, ukuran batch blast (10/20/50) dan jeda.
7. **Pengaturan → Template dokumen**: klik **Buka di Google Docs** untuk mengubah tampilan invoice/manifest, lalu **Pindai ulang**.

### C1. Cara kerja otomatisasi
- **Terbitkan invoice** → nomor `YX/INV/2026/11/0001` (urut per tahun, dijamin unik) → PDF dari template Docs tersimpan di `Trip/<kode trip>/Invoice` → event Google Calendar dibuat/diperbarui (**satu event per penjualan, tidak pernah ganda**) dengan PDF terlampir → WhatsApp + email (PDF terlampir) ke customer.
- **Manifest ditandai Final** → PDF + Excel manifest → dilampirkan ke event Calendar customer itu.
- Proses berat berjalan di **antrean latar**: tombol langsung merespons, dokumen menyusul dalam hitungan detik. Bila aplikasi ditutup, trigger tiap menit melanjutkan.
- QR di invoice menuju `verifikasi.html` — siapa pun bisa mengecek keaslian dokumen; nama customer disamarkan.

### C2. Alur RAB & realisasi anggaran (siapa mengerjakan apa)

| Tahap | Dikerjakan | Di menu | Hasil |
|---|---|---|---|
| 1. Susun & revisi RAB | **Admin** | Kalkulasi Budget → Item RAB | Draft, bisa diubah bebas |
| 2. Ajukan RAB | **Admin** | tombol **Ajukan ke Finance** | Status *Menunggu* |
| 3. Setujui / tolak RAB | **Finance** | Kalkulasi Budget | *Aktif* (terkunci) atau *Ditolak* (Admin merevisi lalu mengajukan lagi) |
| 4. Ubah RAB yang sudah disetujui | **Admin** | **Ajukan perubahan RAB** + alasan (mis. *Kesalahan penulisan RAB*) | Versi baru menunggu persetujuan Finance; versi lama tetap berlaku sampai disetujui |
| 5. Catat realisasi (nota + bukti) | **Admin** | Kalkulasi Budget → tab **Realisasi anggaran** → **Catat nota** | Sisa RAB per kategori tampil saat mengisi; peringatan bila melebihi |
| 6. Laporkan ke Finance | **Admin** | **Laporkan ke Finance** (aktif setelah tanggal pulang trip) | Status *Diajukan*; nota terkunci. Bila melebihi RAB, penjelasan wajib diisi |
| 7. Audit realisasi | **Finance** | Rekapitulasi → klik trip → **Audit laporan** | **Setujui (Final)**, **Minta perbaikan**, atau **Tolak** — bisa juga menolak nota tertentu beserta alasannya |
| 8. Masuk laporan keuangan | otomatis | Laba Rugi, Dashboard | Angka **Final** dibekukan dan menjadi Laba Rugi resmi |

Aturan penting:
- **RAB terkunci** setelah disetujui. Saat realisasi sedang diaudit atau sudah Final, pengajuan perubahan RAB ditolak (RAB terkunci permanen setelah Final).
- **Laba Rugi hanya menghitung trip Final.** Trip lain tetap tampil sebagai estimasi di bagian *Belum masuk laporan* dan tidak ikut dijumlahkan.
- **Melebihi RAB**: bila realisasi > RAB yang disetujui, trip diberi tanda merah **Melebihi RAB +Rp … (…%)** di Rekap, Dashboard, Laba Rugi, dan PDF. Bila labanya minus, ditandai **RUGI**.
- **Koreksi setelah Final**: hanya Finance yang bisa **Buka kembali untuk koreksi** (wajib catatan). Status kembali *Perlu Perbaikan* dan trip keluar dari Laba Rugi sampai disetujui lagi.
- Setiap laporan, keputusan audit, dan pembukaan kembali tercatat di riwayat, dan pihak terkait mendapat notifikasi WA/email (bila saklar notifikasi tim aktif).

### C3. Menu Kalender Trip
- Tab **Google Calendar** menampilkan kalender "YukX Trips" langsung di aplikasi (tampilan bulan di komputer, agenda di HP). Setiap booking menjadi event berisi invoice & manifest.
- Tab **Kalender bulanan** menampilkan jadwal trip dari data aplikasi, berwarna menurut status (Open / Berjalan / Selesai). Klik tanggal untuk melihat trip hari itu.
- Kolom kanan: per trip — jumlah peserta/kuota, booking lunas, manifest final, event Calendar, status realisasi, dan tombol **Daftar peserta**: per pemesan — nama & WhatsApp, jumlah pax (dan kelengkapan data rombongan), status pembayaran beserta sisa tagihan, serta status manifest. Data lengkap per orang ada di menu Draft Manifest.
- Embed hanya tampil untuk orang yang **masuk ke Google di browser yang sama** dengan email yang sudah diberi akses. Admin bisa menekan **Bagikan ke akun tim** untuk membagikan ulang ke semua akun aktif. Akun yang dinonaktifkan otomatis dicabut aksesnya.
- Bila embed tidak tampil (mis. Safari memblokir cookie pihak ketiga), pakai tombol **Buka di Google Calendar**.

### C4. Dokumen PDF (kertas A4)
| Dokumen | Dari menu | Orientasi |
|---|---|---|
| RAB per versi (dikelompokkan per kategori, tanda tangan Admin & Finance) | Kalkulasi Budget → tombol PDF | Potret |
| Laporan realisasi anggaran (RAB vs realisasi per kategori, rincian nota, status audit) | tab Realisasi / drawer Rekap → **Laporan PDF** | Potret |
| Rekapitulasi operasional semua trip | Rekapitulasi → PDF | Lanskap |
| Laporan laba rugi (hanya trip Final) | Laba Rugi → PDF | Potret |
| Manifest per trip / per customer | Draft Manifest → pratinjau → **Unduh PDF (A4)** | Lanskap / potret |
| Invoice & kuitansi | Invoice / Penjualan → pratinjau → **Cetak** | Potret |

Semua PDF memiliki kop perusahaan, nomor halaman "Halaman x dari n", kepala tabel yang berulang di setiap halaman, dan watermark **DRAFT / DALAM AUDIT** untuk dokumen yang belum final. Saat memakai tombol **Cetak**, pilih kertas **A4**, margin **Default**, dan centang **Grafik latar belakang** agar warna tabel ikut tercetak.

---

## Bagian D — Pindah data dari spreadsheet lama

Spreadsheet lama **hanya dibaca**, tidak pernah diubah.

1. Pastikan spreadsheet lama bisa dibuka oleh akun pemilik backend.
2. **Pengaturan → Integrasi & data → Import data dari spreadsheet lama** → tempel URL → pilih data (Customer, Trip, Penjualan, Pembayaran, Invoice).
3. Klik **Pindai (dry-run)**: tabel menunjukkan berapa baris akan ditambah/diperbarui/dilewati, plus peringatan (mis. penjualan yang customer-nya tidak ditemukan).
4. Klik **Jalankan import**. Aman diulang — data yang sudah ada tidak digandakan, isian di aplikasi baru tidak ditimpa (hanya kolom kosong yang dilengkapi).
5. Tepat sebelum beralih penuh, **jalankan import sekali lagi** untuk menangkap data terbaru dari spreadsheet lama.

Sheet & kolom dikenali dari namanya (contoh: "Data Pelanggan", "Nama Lengkap", "No. WA", "Tanggal Berangkat"). Nomor HP yang tersimpan sebagai angka otomatis dikembalikan ke format `08…`, tanggal `dd/mm/yyyy` dinormalisasi.

---

## Bagian E — Update aplikasi

### E1. Update dari v1.0.0 ke v1.1.0
Lakukan **backend dulu**, baru frontend.

**Backend:**
1. Di editor Apps Script, untuk **setiap** berkas (`Kode`, `Logika`, `Integrasi`, `Notifikasi`, `Setup`, `QrLib`, `appsscript.json`): klik berkasnya → **Ctrl+A** → tempel isi baru → **Ctrl+S**.
2. Pilih fungsi **`setupAppEnvironment`** → **▶ Jalankan**. Di log akan terlihat antara lain:
   ```
   ✓ Realisasi_Biaya: kolom baru Catatan_Verifikasi, Diverifikasi_Oleh
   ✓ Rekap_Operasional: kolom baru Tgl_Lapor, Dilapor_Oleh, Penjelasan_Lapor, Biaya_Final, Laba_Final, Tgl_Final
   ```
   Lalu kalender dibagikan ke akun tim. Kolom hanya **ditambah** — tidak ada data yang dihapus atau diubah.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.** URL `/exec` tetap sama.

**Frontend** — salin isi ZIP baru ke folder proyek (timpa berkas lama, **jangan** timpa `js/config.js` Anda), lalu dari folder proyek:
```bash
git add .
git commit -m "Update YukX v1.1.0"
git push
```
Tunggu 1–2 menit, lalu **Ctrl+Shift+R** di browser.

**Data realisasi lama** otomatis dipetakan: *Terverifikasi* → **Final** (masuk Laba Rugi), *Menunggu Audit* → **Diajukan**, *Perlu Revisi / Perlu Audit Ulang* → **Perlu Perbaikan**. Realisasi lama yang dulu diisi Finance tetap utuh; mulai sekarang pencatatan dilakukan Admin.

### E2. Update berikutnya (umum)
**Backend** (kode `.gs` berubah):
1. Tempel kode baru → Simpan → jalankan **`setupAppEnvironment`** sekali (menambah kolom/izin baru bila ada).
2. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.** Jangan pilih "Deployment baru" — itu membuat URL baru.

**Frontend** (berkas di folder `yukx-laporan` berubah), dari folder proyek: `git add .` → `git commit -m "Update"` → `git push`, lalu **Ctrl+Shift+R**.

---

## Bagian F — Keamanan

| Rahasia | Tempat | Keterangan |
|---|---|---|
| `SESSION_SECRET` | Script Properties | Penanda tangan token sesi (12 jam) |
| `PIN_PEPPER` | Script Properties | Bumbu hash PIN — jangan dihapus (semua PIN tidak berlaku) |
| `FONNTE_TOKEN` | Script Properties | Diisi dari menu WhatsApp, tidak pernah dikirim ke browser |
| `SPREADSHEET_ID`, `FOLDER_*`, `CALENDAR_ID` | Script Properties | Dibuat oleh setup |

- PIN disimpan sebagai hash berulang + salt + pepper. 5× PIN salah → akun dikunci 15 menit.
- Reset PIN, menonaktifkan akun, atau mengubah peran langsung mencabut sesi lama akun itu.
- Hak akses Admin/Finance diperiksa di server untuk setiap aksi — termasuk pemisahan tugas: Admin tidak bisa menyetujui RAB atau mengaudit realisasinya sendiri, Finance tidak bisa mencatat realisasi.
- **Pengecualian ID kalender:** agar embed di menu Kalender berfungsi, `CALENDAR_ID` dikirim ke browser **hanya untuk pengguna yang sudah login** (tidak pernah ke halaman publik seperti verifikasi QR). ID ini sendiri tidak memberi akses: kalender tetap **privat** dan hanya bisa dibaca akun tim yang dibagikan (hanya-baca). **Jangan** jadikan kalender "Tersedia untuk publik" di setelan Google Calendar.
- Teks berawalan `=` (rumus) disimpan sebagai teks biasa di Sheets.
- Fungsi editor darurat:
  - **`resetAksesDarurat`** — lupa PIN admin pengelola → PIN baru tampil di log.
  - **`rotasiSecretSesi`** — keluarkan semua perangkat (misalnya HP hilang).
- Bagikan spreadsheet database seperlunya; perubahan dianjurkan lewat aplikasi (sheet diberi proteksi peringatan).

---

## Bagian G — Performa & kuota

- Saat masuk, data dimuat **sekali** lalu disimpan di perangkat. Pindah menu (termasuk Kalender) tidak memanggil server sama sekali; simpan data tampil seketika (optimistis) lalu disahkan server.
- Server memakai cache berversi: edit langsung di spreadsheet terdeteksi trigger dan tampil di aplikasi dalam ±45 detik.
- Trigger tiap menit langsung berhenti bila tidak ada pekerjaan (±5 menit runtime/hari). Akun Gmail biasa mendapat 90 menit/hari. Untuk mematikan: jalankan **`matikanPekerja`** (antrean tetap diproses saat aplikasi dibuka); nyalakan lagi dengan **`nyalakanPekerja`**.
- Kuota email Google: ±100/hari (Gmail biasa), ±1.500/hari (Workspace). Sisa kuota tampil di menu WhatsApp & CRM.
- PDF laporan dibuat langsung di browser (tanpa memakai kuota server).
- **`cekPerforma`** di editor menampilkan status cache, antrean, trigger, dan waktu baca database. Di browser, ketik `Perf.table()` di Console (F12) untuk melihat waktu tiap panggilan.

---

## Bagian H — Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Server membalas bukan JSON" | URL salah / akses deployment bukan "Siapa saja" | Periksa `js/config.js` (harus berakhiran `/exec`) dan setelan deployment |
| Situs GitHub 404 | `git init` dijalankan di folder yang salah | Pastikan repo GitHub menampilkan `index.html` di root, bukan folder |
| Tampilan versi lama | Cache browser | Ctrl+Shift+R atau jendela Incognito |
| PDF/Calendar belum muncul | Antrean masih berjalan | Tunggu ±1 menit; lihat tanda proses di halaman invoice; klik **Proses ulang** bila gagal |
| "Calendar: …" gagal | Layanan Calendar API belum aktif | Pastikan `appsscript.json` sudah ditempel, jalankan `setupAppEnvironment` lagi |
| Menu Kalender: "Anda tidak memiliki akses" / kosong | Browser belum masuk Google dengan email tim, atau kalender belum dibagikan | Masuk Google dengan email akun tim; Admin tekan **Bagikan ke akun tim**; di Safari pakai **Buka di Google Calendar** |
| Tombol **Laporkan ke Finance** abu-abu | Trip belum selesai atau belum ada nota | Tombol aktif mulai tanggal pulang trip dan setelah minimal satu nota dicatat |
| **Ajukan perubahan RAB** ditolak | Realisasi sedang diaudit / sudah Final | Tunggu keputusan Finance; bila sudah Final, minta Finance **Buka kembali untuk koreksi** |
| Laba Rugi lebih kecil dari Rekap | Laba Rugi hanya menghitung trip **Final** | Lihat bagian *Belum masuk laporan*; selesaikan audit realisasinya |
| Warna tabel hilang saat dicetak | Grafik latar belakang tidak dicentang | Di dialog cetak centang **Grafik latar belakang**, atau pakai **Unduh PDF (A4)** |
| WhatsApp tidak terkirim | Token/perangkat Fonnte | Menu WhatsApp → Konfigurasi → Cek perangkat; customer bertag DEMO memang tidak dikirimi |
| "Terlalu banyak percobaan PIN salah" | 5× PIN salah | Tunggu 15 menit, atau admin pengelola reset PIN |
| Minta izin lagi setelah update | Ada izin baru | Jalankan `setupAppEnvironment` dan setujui |
| Semua pengguna ter-logout | `rotasiSecretSesi` dijalankan / `SESSION_SECRET` diubah | Masuk lagi |

---

## Hasil pengujian sebelum diserahkan

- **Mesin logika** (dipakai server & Mode Demo): RBAC termasuk pemisahan tugas Admin/Finance, nomor invoice unik, event tidak ganda, versi & kunci RAB, alur realisasi (catat → lapor → audit → final → laba rugi, buka kembali, penolakan per nota, tanda melebihi RAB), kunci manifest, blast per batch, validasi kontras — lulus semua.
- **Backend di simulator Apps Script**: 127 pemeriksaan lulus — setup idempoten, login & penguncian PIN, token palsu ditolak, idempotensi permintaan ulang, cache boot (0 baca Sheets saat hangat), PDF tanpa penanda tersisa, 1 event per penjualan walau diproses ulang, WA/email tidak pernah dikirim saat memegang kunci, impor dry-run & idempoten, rahasia tidak pernah muncul di respons, kalender dibagikan/dicabut otomatis sesuai status akun, ID kalender tidak pernah dikirim ke pengunjung tanpa login, alur RAB → realisasi → audit → Final lewat API dengan angka final tersimpan sebagai angka.
- **Browser (Chromium)**: 19 layar × 3 ukuran (360/768/1440 px) tanpa error JS dan tanpa geser horizontal; alur demo 43/43 (termasuk audit Finance, perbaikan nota & lapor ulang Admin, menu Kalender); kontrak frontend↔backend 16/16 (login 1 panggilan, 12× pindah menu = 0 panggilan server, embed Google Calendar memakai kalender app).
- **Dokumen PDF**: 10 dokumen dirender dan diperiksa visual — semuanya berukuran A4, tanpa teks terpotong atau kolom terlipat.

Pengujian backend memakai simulator layanan Google; uji akhir di akun Anda tetap disarankan (Bagian C langkah 6, satu invoice percobaan, dan buka menu Kalender dari akun Finance).
