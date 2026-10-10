# 🚀 Deploy playscondogames ke Vercel (5 menit, URL bagus)

Hasil akhir: `https://playscondogames.vercel.app` (bukan URL sandbox jelek).

## Cara tercepat (tanpa install git, via browser saja)

### 1. Download source (1 menit)
1. Buka web sandbox → ketuk **Diamond kiri-atas 3×** → tab **OWNER** → login
2. Panel ⑥ **Download Source** → simpan file-nya
3. Extract/unzip di laptop kamu

### 2. Upload ke GitHub (2 menit)
1. Buka https://github.com/new → Repository name: `playscondogames` → **Private** → Create
2. Klik **uploading an existing file** → drag semua file source → **Commit changes**

### 3. Database gratis Neon (2 menit)
1. Buka https://neon.tech → Sign up → **New Project**
   - Name: `playscondogames`, Region: **Singapore**
2. Copy **Connection string (Pooled)** yang ada `sslmode=require`

### 4. Deploy Vercel (2 menit)
1. Buka https://vercel.com/new → **Import** repo `playscondogames`
2. **Project Name: `playscondogames`** (URL jadi `playscondogames.vercel.app`)
3. Environment Variables (Production + Preview):
   - `DATABASE_URL` = connection string Neon
   - `AUTH_PEPPER` = string acak panjang (misal hasil `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
4. **Deploy** → tunggu hijau ✅

### 5. Buat tabel DB (sekali saja, dari laptop)
```bash
npm install
DATABASE_URL="isi-connection-string-neon" npx drizzle-kit push --config=drizzle.config.ts
```

### 6. Cek
- `https://playscondogames.vercel.app/api/health` → `{ "ok": true }`
- Buka web → Diamond 3× → Owner → isi Link 1/2/3 → selesai.
- **Segera ganti password Owner** di Panel Pengaturan!

---
Setiap push ke GitHub `main` = auto re-deploy di Vercel. Custom domain
`playscondogames.com` bisa ditambah di Vercel → Settings → Domains.
