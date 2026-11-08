# Panduan Instalasi — Otomatisasi Sistem Laporan YukX v1.0.0

Aplikasi ini terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Isi | Dipasang di | Waktu |
|---|---|---|---|
| **Backend** | 6 berkas `.gs` + `appsscript.json` | Google Apps Script (akun Google pemilik data) | ± 15 menit |
| **Frontend** | ZIP `yukx-laporan.zip` (folder ini) | GitHub Pages (gratis) | ± 20 menit |

Data tersimpan di **Google Sheets**, dokumen PDF di **Google Drive**, jadwal trip di **Google Calendar**, email terkirim lewat **Gmail**, dan WhatsApp lewat **Fonnte**. Semua token dan kunci rahasia tersimpan di **Script Properties** — tidak ada di kode, Sheets, maupun di GitHub.

---

## 0. Coba dulu Mode Demo (tanpa memasang apa pun)

Selama `js/config.js` belum diisi, aplikasi berjalan dalam **Mode Demo**: data contoh lengkap (8 trip bergambar, 40 customer, 33 penjualan, ±50 invoice, budget, manifest, CRM, riwayat WhatsApp) tersimpan di browser perangkat Anda.

- Klik dua kali `index.html` (Chrome/Edge), atau buka situs GitHub Pages Anda sebelum `config.js` diisi.
- Akun demo (PIN **123456**): **raka@yukx.id** (Admin, pengelola pengguna) · **sinta@yukx.id** (Finance).
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
- Kalender **"YukX Trips"**.
- 4 template Google Docs: Invoice, Kuitansi, Manifest per Customer, Manifest per Trip.
- Akun Admin pertama (pengelola pengguna) dengan PIN acak.
- Trigger: pekerja tiap 1 menit, pengingat harian 07:00 WIB, dan pendeteksi edit spreadsheet.
- Rahasia di Script Properties: `SESSION_SECRET`, `PIN_PEPPER`, `SPREADSHEET_ID`, `FOLDER_*`, `CALENDAR_ID`.

Setup **aman dijalankan ulang** kapan saja (misalnya setelah update kode): tidak membuat admin, template, atau data ganda.

### A5. (Opsional) Isi data contoh di server
Pilih fungsi **`isiDataDemo`** → **▶ Jalankan**. Data contoh dibuat **tanpa akun ber-PIN diketahui**. Customer contoh bertag `DEMO` dan **tidak pernah dikirimi** WhatsApp/email. Sebelum dipakai sungguhan, jalankan **`kosongkanDataDemo`** (hanya berjalan bila semua customer masih bertag DEMO).

### A6. Deploy sebagai Web App
1. Klik **Terapkan / Deploy** → **Deployment baru**.
2. Klik ⚙️ di samping "Pilih jenis" → **Aplikasi web**.
3. Isi:
   - Deskripsi: `v1.0.0`
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
5. **Pengaturan → Pengguna & RBAC** → **Tambah pengguna** (maks. 5 akun aktif). PIN awal tampil sekali — berikan langsung ke orangnya.
6. **WhatsApp & CRM → Konfigurasi**:
   - Tempel **token Fonnte** → Simpan (tersimpan di Script Properties, tampil tersamar).
   - **Cek perangkat** → **Kirim tes WA** → **Kirim tes email**.
   - Nyalakan saklar WhatsApp & Email, atur matriks notifikasi per kejadian, ukuran batch blast (10/20/50) dan jeda.
7. **Pengaturan → Template dokumen**: klik **Buka di Google Docs** untuk mengubah tampilan invoice/manifest, lalu **Pindai ulang**.

### Cara kerja otomatisasi
- **Terbitkan invoice** → nomor `YX/INV/2026/11/0001` (urut per tahun, dijamin unik) → PDF dari template Docs tersimpan di `Trip/<kode trip>/Invoice` → event Google Calendar dibuat/diperbarui (**satu event per penjualan, tidak pernah ganda**) dengan PDF terlampir → WhatsApp + email (PDF terlampir) ke customer.
- **Manifest ditandai Final** → PDF + Excel manifest → dilampirkan ke event Calendar customer itu.
- Proses berat berjalan di **antrean latar**: tombol langsung merespons, dokumen menyusul dalam hitungan detik. Bila aplikasi ditutup, trigger tiap menit melanjutkan.
- QR di invoice menuju `verifikasi.html` — siapa pun bisa mengecek keaslian dokumen; nama customer disamarkan.

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

**Backend** (kode `.gs` berubah):
1. Tempel kode baru → Simpan → jalankan **`setupAppEnvironment`** sekali (menambah kolom/izin baru bila ada).
2. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.** URL `/exec` tetap sama.
   Jangan pilih "Deployment baru" — itu membuat URL baru.

**Frontend** (berkas di folder `yukx-laporan` berubah), dari folder proyek:
```bash
git add .
git commit -m "Update tampilan"
git push
```
Tunggu 1–2 menit, lalu **Ctrl+Shift+R** di browser.

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
- Hak akses Admin/Finance diperiksa di server untuk setiap aksi.
- Teks berawalan `=` (rumus) disimpan sebagai teks biasa di Sheets.
- Fungsi editor darurat:
  - **`resetAksesDarurat`** — lupa PIN admin pengelola → PIN baru tampil di log.
  - **`rotasiSecretSesi`** — keluarkan semua perangkat (misalnya HP hilang).
- Bagikan spreadsheet database seperlunya; perubahan dianjurkan lewat aplikasi (sheet diberi proteksi peringatan).

---

## Bagian G — Performa & kuota

- Saat masuk, data dimuat **sekali** lalu disimpan di perangkat. Pindah menu tidak memanggil server sama sekali; simpan data tampil seketika (optimistis) lalu disahkan server.
- Server memakai cache berversi: edit langsung di spreadsheet terdeteksi trigger dan tampil di aplikasi dalam ±45 detik.
- Trigger tiap menit langsung berhenti bila tidak ada pekerjaan (±5 menit runtime/hari). Akun Gmail biasa mendapat 90 menit/hari. Untuk mematikan: jalankan **`matikanPekerja`** (antrean tetap diproses saat aplikasi dibuka); nyalakan lagi dengan **`nyalakanPekerja`**.
- Kuota email Google: ±100/hari (Gmail biasa), ±1.500/hari (Workspace). Sisa kuota tampil di menu WhatsApp & CRM.
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
| WhatsApp tidak terkirim | Token/perangkat Fonnte | Menu WhatsApp → Konfigurasi → Cek perangkat; customer bertag DEMO memang tidak dikirimi |
| "Terlalu banyak percobaan PIN salah" | 5× PIN salah | Tunggu 15 menit, atau admin pengelola reset PIN |
| Minta izin lagi setelah update | Ada izin baru | Jalankan `setupAppEnvironment` dan setujui |
| Semua pengguna ter-logout | `rotasiSecretSesi` dijalankan / `SESSION_SECRET` diubah | Masuk lagi |

---

## Hasil pengujian sebelum diserahkan

- **Mesin logika** (dipakai server & Mode Demo): RBAC, nomor invoice unik, event tidak ganda, versi budget, kunci manifest, blast per batch, validasi kontras — lulus semua.
- **Backend di simulator Apps Script**: 104 pemeriksaan lulus — setup idempoten, login & penguncian PIN, token palsu ditolak, idempotensi permintaan ulang, cache boot (0 baca Sheets saat hangat), PDF tanpa penanda tersisa, 1 event per penjualan walau diproses ulang, WA/email tidak pernah dikirim saat memegang kunci, impor dry-run & idempoten, rahasia tidak pernah muncul di respons.
- **Browser (Chromium)**: 17 layar × 3 ukuran (360/768/1440 px) tanpa error JS dan tanpa geser horizontal; alur demo 29/29; kontrak frontend↔backend 14/14 (login 1 panggilan, 11× pindah menu = 0 panggilan server).

Pengujian backend memakai simulator layanan Google; uji akhir di akun Anda tetap disarankan (Bagian C langkah 6 dan satu invoice percobaan).
