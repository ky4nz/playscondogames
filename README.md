# 💎 playscondogames — Private Servers

Web private-server Roblox: publik bisa JOIN dan tetap di dalam web (tanpa buka tab baru),
Owner bisa menyewakan ke banyak Admin/Penyewa, tiap penyewa punya **website sendiri**
(`/r/KODE`) dengan link map miliknya masing-masing — anti tabrakan.

Stack: **Next.js (App Router) + PostgreSQL + Drizzle ORM + Tailwind CSS.**

---

## 1. Struktur penting

| Path | Fungsi |
|---|---|
| `/` | Web publik Owner |
| `/r/[slug]` | Web publik tiap penyewa (link map miliknya sendiri) |
| `/owner` | Dashboard Owner (Diamond kiri-atas diketuk 3× → tab OWNER) |
| `/admin` | Dashboard Admin/Penyewa (Diamond 3× → tab ADMIN) |
| `/cgx-7k2q9-panel` | Jalur admin lama (tetap didukung) |
| `/api/health` | Healthcheck (`{ ok: true }`) |

Login default:

- **Owner:** `kyanzOWNER` (segera ganti di Panel Owner → Pengaturan)
- **Admin:** password unik yang di-generate Owner (1 password = 1 admin sendiri)

---

## 2. Deploy ke GitHub + Vercel (URL bagus `playscondogames.vercel.app`)

### Langkah 1 — Push ke GitHub

```bash
# di folder project ini
git init
git add -A
git commit -m "playscondogames: initial deploy"
git branch -M main
# buat repo BARU di github.com dengan nama: playscondogames (Private disarankan)
git remote add origin https://github.com/USERNAME_KAMU/playscondogames.git
git push -u origin main
```

> Jangan push file `.env` (sudah di-ignore). Password & database hanya diisi via Environment Variables.

### Langkah 2 — Buat database PostgreSQL gratis (Neon, 2 menit)

1. Buka https://neon.tech → Sign up → **New Project**
   - Project name: `playscondogames`
   - Region: **Singapore (ap-southeast-1)** (terdekat)
2. Buat database `playscondogames` (atau pakai default `neondb`)
3. Copy **Connection string** (mode **Pooled** + `sslmode=require`), contoh:
   `postgresql://user:pass@ep-xxxx.ap-southeast-1.aws.neon.tech/playscondogames?sslmode=require`

### Langkah 3 — Import ke Vercel

1. Buka https://vercel.com/new → **Import** repo `playscondogames`
2. **Project Name:** `playscondogames` → URL jadi `https://playscondogames.vercel.app`
3. Framework: **Next.js** (otomatis), Root Directory: `/` (default)
4. **Environment Variables** (wajib, centang Production + Preview):
   - `DATABASE_URL` = connection string Neon dari Langkah 2
   - `AUTH_PEPPER` = string acak panjang (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
5. Klik **Deploy**

### Langkah 4 — Buat tabel database (sekali saja)

```bash
# di laptop/komputer kamu (bukan di Vercel):
git clone https://github.com/USERNAME_KAMU/playscondogames.git
cd playscondogames
npm install
DATABASE_URL="postgresql://user:pass@ep-xxxx.../playscondogames?sslmode=require" npx drizzle-kit push --config=drizzle.config.ts
```

Lalu buka `https://playscondogames.vercel.app/api/health` → harus `{ "ok": true }`.
Buka web → ketuk Diamond kiri-atas 3× → login Owner → isi Link 1/2/3 → web langsung jalan.

> Setiap `git push` ke branch `main` otomatis re-deploy di Vercel.

---

## 3. Custom domain (opsional, misal `playscondogames.com`)

1. Vercel → Project `playscondogames` → **Settings → Domains** → Add `playscondogames.com` (+ `www.playscondogames.com`)
2. Di DNS registrar domain kamu, tambahkan record sesuai instruksi Vercel (biasanya `A @ → 76.76.21.21` dan `CNAME www → cname.vercel-dns.com`)
3. Tunggu propagasi ±5–60 menit → web tampil di domain sendiri dengan HTTPS otomatis.

---

## 4. Jalankan lokal (sandbox / laptop)

```bash
npm install
cp .env.example .env
# isi DATABASE_URL lokal di .env, lalu:
npx drizzle-kit push
npm run dev
```

Validasi sebelum push:

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

---

## 5. Catatan keamanan

- Password Owner default `kyanzOWNER` — **wajib diganti** setelah deploy.
- `AUTH_PEPPER` beda tiap environment, jangan disamakan & jangan di-commit.
- Panel `/owner`, `/admin`, `/cgx-7k2q9-panel` sudah `noindex` (tidak muncul di Google).
- Link 3 (core) tidak pernah dikirim mentah ke browser — iframe lewat `/api/go` bertoken 10 menit.
- Proteksi DevTools di web ini **senyap** (blokir F12/klik-kanan/shortcut tanpa overlay/teks).
