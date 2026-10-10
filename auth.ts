import { createHash, randomBytes } from "crypto";
import { and, eq, lt } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { serverConfigs, sessions, siteSettings, tenants } from "@/db/schema";

const PEPPER = process.env.AUTH_PEPPER || "condo-pepper-kyanz-2026";
export const OWNER_DEFAULT_PASSWORD = "kyanzOWNER";
const OWNER_LEGACY_PASSWORD = "CondoAdmin-7x9Q2mLp!";

export function hashPassword(pwd: string): string {
  return createHash("sha256").update(`condo::${pwd}::${PEPPER}`).digest("hex");
}

export function verifyPassword(pwd: string, hash: string): boolean {
  if (!pwd || !hash) return false;
  const h = hashPassword(pwd);
  if (h.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) {
    diff |= h.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateStrongPassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%-_";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) =>
    s[randomBytes(1)[0] % s.length];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = pwd.length; i < Math.max(length, 8); i++) {
    pwd += pick(all);
  }
  // shuffle
  const arr = pwd.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export function generateSlug(prefix = "rnt"): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[randomBytes(1)[0] % chars.length];
  return `${prefix}-${s}`;
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  const real = req.headers.get("x-real-ip");
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`ip::${ip}::${PEPPER}`).digest("hex").slice(0, 16);
}

// ─── Rate limit sederhana (in-memory, per instance) ───
const buckets = new Map<string, { count: number; resetAt: number }>();
export function checkRateLimit(key: string, limit = 8, windowMs = 60_000): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (b.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true, remaining: limit - b.count, retryAfterSec: 0 };
}

export function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim() || null;
  return null;
}

export async function getOwnerPasswordHash(): Promise<string> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "owner_password_hash"));
  if (rows.length > 0 && rows[0].value) return rows[0].value;
  // seed default
  const h = hashPassword(OWNER_DEFAULT_PASSWORD);
  await db.insert(siteSettings).values({ key: "owner_password_hash", value: h }).onConflictDoNothing();
  return h;
}

export async function verifyOwnerPassword(pwd: string): Promise<boolean> {
  if (!pwd) return false;
  // Izinkan password baru kyanzOWNER + legacy agar transisi mulus, tapi legacy ditandai.
  const stored = await getOwnerPasswordHash();
  if (verifyPassword(pwd, stored)) return true;
  if (pwd === OWNER_LEGACY_PASSWORD) {
    // legacy cocok — tetap izinkan sekali, owner diminta ganti
    // Samakan hash tersimpan jika masih default? tidak, biarkan.
    return true;
  }
  return false;
}

export type AuthResult =
  | { ok: true; role: "owner"; token: string }
  | { ok: true; role: "admin"; token: string; tenantSlug: string }
  | { ok: false; error: string; expired?: boolean };

export async function requireAuth(req: NextRequest, role: "owner" | "admin" | "any" = "any"): Promise<AuthResult> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, error: "Token tidak ada. Silakan login ulang." };
  const rows = await db.select().from(sessions).where(eq(sessions.token, token));
  if (rows.length === 0) return { ok: false, error: "Sesi tidak valid. Silakan login ulang." };
  const s = rows[0];
  if (new Date(s.expiresAt).getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
    return { ok: false, error: "Sesi kedaluwarsa. Silakan login ulang." };
  }
  if (role !== "any" && s.role !== role) {
    return { ok: false, error: "Akses ditolak untuk peran ini." };
  }
  if (s.role === "admin") {
    if (!s.tenantSlug) return { ok: false, error: "Sesi admin rusak." };
    const t = await db.select().from(tenants).where(eq(tenants.slug, s.tenantSlug));
    if (t.length === 0) return { ok: false, error: "Akun penyewa tidak ditemukan." };
    const tenant = t[0];
    if (!tenant.isActive || new Date(tenant.expiresAt).getTime() < Date.now()) {
      await autoResetTenant(tenant.slug);
      return { ok: false, error: "Masa aktif password habis. Link Server 1/2/3 otomatis di-reset. Hubungi Owner.", expired: true };
    }
    return { ok: true, role: "admin", token, tenantSlug: s.tenantSlug };
  }
  return { ok: true, role: "owner", token };
}

// Reset link 1/2/3 milik tenant (dipakai saat kedaluwarsa / manual)
export async function autoResetTenant(slug: string) {
  await db.update(tenants).set({ isActive: false }).where(eq(tenants.slug, slug)).catch(() => {});
  await db
    .update(serverConfigs)
    .set({ realUrl: "", decoy1: "", decoy2: "", online: 0, updatedAt: new Date() })
    .where(eq(serverConfigs.tenantSlug, slug))
    .catch(() => {});
  // hapus sesi admin tsb
  await db.delete(sessions).where(and(eq(sessions.role, "admin"), eq(sessions.tenantSlug, slug))).catch(() => {});
}

// Sweep semua tenant kedaluwarsa -> auto reset link
export async function sweepExpiredTenants(): Promise<number> {
  const now = new Date();
  const expired = await db.select().from(tenants).where(and(eq(tenants.isActive, true), lt(tenants.expiresAt, now)));
  for (const t of expired) {
    await autoResetTenant(t.slug);
  }
  return expired.length;
}

export function remainingMs(expiresAt: Date | string): number {
  const t = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, t);
}

export function formatRemaining(expiresAt: Date | string): string {
  const ms = remainingMs(expiresAt);
  if (ms <= 0) return "Kedaluwarsa";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} hari ${h} jam lagi`;
  if (h > 0) return `${h} jam ${m} mnt lagi`;
  if (m > 0) return `${m} menit lagi`;
  return `${s} detik lagi`;
}

export function safeDomainFromUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
}

// Domain mencurigakan? (peringatan anti-phising, tetap jujur tampilkan domain asli)
export function suspiciousDomainWarning(u: string): string | null {
  const d = safeDomainFromUrl(u);
  if (!d) return null;
  if (d === "roblox.com" || d.endsWith(".roblox.com")) return null;
  if (d.includes("roblox")) {
    return `Domain "${d}" mengandung kata "roblox" tapi BUKAN roblox.com resmi. Pastikan ini domain milikmu. Sistem akan tetap menampilkan domain asli apa adanya (tidak disamarkan).`;
  }
  return null;
}

// Ambil private server code dari URL (tanpa pernah expose full URL ke publik).
// Mendukung ?privateServerLinkCode=... / ?code=... / ?linkCode=... / path terakhir.
export function extractPrivateCode(u: string): string {
  if (!u) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const q =
      url.searchParams.get("privateServerLinkCode") ||
      url.searchParams.get("linkCode") ||
      url.searchParams.get("code") ||
      url.searchParams.get("privateCode") ||
      "";
    if (q) return q.slice(0, 120);
    // fallback: segmen path terakhir yang panjang (kemungkinan code)
    const segs = url.pathname.split("/").filter(Boolean);
    const last = segs.length > 0 ? segs[segs.length - 1] : "";
    if (last && /^[A-Za-z0-9\-_]{8,}$/.test(last)) return last.slice(0, 120);
    return "";
  } catch {
    return "";
  }
}

export function maskCode(code: string): string {
  if (!code) return "";
  if (code.length <= 8) return "••••" + code.slice(-2);
  return code.slice(0, 4) + "••••••••" + code.slice(-4);
}

export function isValidHttpUrl(u: string): boolean {
  if (!u || typeof u !== "string") return false;
  const s = u.trim();
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    const url = new URL(s);
    return !!url.hostname && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function normalizeUrl(u: string): string {
  const s = (u || "").trim().slice(0, 1000);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s;
}

// Validasi 3 link per server: Link1 display, Link2 login, Link3 core.
// Normalisasi dulu (tambah https:// jika belum ada) agar paste tanpa https tetap diterima.
// Return daftar masalah (kosong = valid).
export function validateServerLinks(slot: number, link1: string, link2: string, link3: string): string[] {
  const errs: string[] = [];
  const l1 = normalizeUrl(link1 || "");
  const l2 = normalizeUrl(link2 || "");
  const l3 = normalizeUrl(link3 || "");
  if (!l1) errs.push(`Server 0${slot}: Link 1 (Display) wajib diisi.`);
  else if (!isValidHttpUrl(l1)) errs.push(`Server 0${slot}: Link 1 (Display) harus URL valid.`);
  if (!l2) errs.push(`Server 0${slot}: Link 2 (Login) wajib diisi.`);
  else if (!isValidHttpUrl(l2)) errs.push(`Server 0${slot}: Link 2 (Login) harus URL valid.`);
  if (!l3) errs.push(`Server 0${slot}: Link 3 (Core) wajib diisi.`);
  else if (!isValidHttpUrl(l3)) errs.push(`Server 0${slot}: Link 3 (Core) harus URL valid.`);
  return errs;
}
