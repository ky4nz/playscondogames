playscondogames — Source Code (KHUSUS OWNER, RAHASIA)
====================================================
Diekspor: 2026-10-10T12:30:27.908Z
Isi: 58 file TERPISAH di dalam folder playscondogames/
Struktur: playscondogames/src/... , playscondogames/public/... , playscondogames/package.json, config, README, DEPLOY

WAJIB EXTRACT DULU:
1. Klik kanan file .zip ini → Extract All / Extract Here
2. Hasilnya folder playscondogames/ berisi BANYAK file terpisah (bukan 1 file)
3. Tidak perlu susun satu per satu — struktur folder sudah rapi
4. Kalau 1 file bermasalah, cukup perbaiki file itu saja, lainnya tidak ikut rusak

KEAMANAN:
- File ini HANYA untuk Owner. JANGAN bagikan ke admin/penyewa/publik.
- File .env TIDAK ikut (gunakan .env.example sebagai contoh).
- Kode tetap utuh & langsung jalan (tidak ada yang dirusak).

Cara pakai setelah extract:
1. cd playscondogames
2. npm install
3. cp .env.example .env lalu isi DATABASE_URL + AUTH_PEPPER
4. npx drizzle-kit push --config=drizzle.config.ts
5. npm run build && npm run start

Deploy Vercel: baca DEPLOY.md di dalam folder ini
