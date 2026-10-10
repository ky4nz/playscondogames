import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_PEPPER || "condo-pepper-kyanz-2026";
const TTL_MS = 10 * 60 * 1000; // frameSrc kedaluwarsa 10 menit — tidak bisa dishare/disimpan

export function makeFrameToken(tenant: string, slot: number): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(8).toString("hex");
  const data = `${tenant}.${slot}.${ts}.${rand}`;
  const sig = createHmac("sha256", SECRET).update(`frame::${data}`).digest("hex").slice(0, 32);
  return `${ts}.${rand}.${sig}`;
}

export function verifyFrameToken(tenant: string, slot: number, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ts36, rand, sig] = parts;
  if (!/^[0-9a-z]+$/i.test(ts36)) return false;
  if (!/^[0-9a-f]{16}$/.test(rand)) return false;
  if (!/^[0-9a-f]{32}$/.test(sig)) return false;
  const ts = parseInt(ts36, 36);
  if (!Number.isFinite(ts)) return false;
  const now = Date.now();
  if (ts > now + 60_000) return false;
  if (now - ts > TTL_MS) return false;
  const data = `${tenant}.${slot}.${ts36}.${rand}`;
  const expect = createHmac("sha256", SECRET).update(`frame::${data}`).digest("hex").slice(0, 32);
  if (expect.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expect), Buffer.from(sig));
  } catch {
    return false;
  }
}
