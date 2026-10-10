import { eq } from "drizzle-orm";
import { db } from "@/db";
import { serverConfigs, siteSettings } from "@/db/schema";
import { hashPassword, OWNER_DEFAULT_PASSWORD } from "./auth";

const DEFAULT_IMAGES = [
  "https://i.ibb.co.com/cKZZwDDK/Whats-App-Image-2026-10-07-at-2-09-28-AM.jpg",
  "https://raw.githubusercontent.com/tokun787-boop/Condo-Games-/main/image/server2.jpg",
  "https://i.ibb.co.com/cKZZwDDK/Whats-App-Image-2026-10-07-at-2-09-28-AM.jpg",
];

const DEFAULT_TITLES = ["Server 01", "Server 02", "Server 03"];

// TIDAK ADA link default dari AI — Owner/Penyewa yang mengisi Link 1/2/3 sendiri.
// Link 1 & 2 = penutup/bodyguard, Link 3 = utama.
export async function ensureDefaults() {
  const ow = await db.select().from(siteSettings).where(eq(siteSettings.key, "owner_password_hash"));
  if (ow.length === 0) {
    await db.insert(siteSettings).values({ key: "owner_password_hash", value: hashPassword(OWNER_DEFAULT_PASSWORD) }).onConflictDoNothing();
  }
  if ((await db.select().from(siteSettings).where(eq(siteSettings.key, "announcement"))).length === 0) {
    await db.insert(siteSettings).values({ key: "announcement", value: "" }).onConflictDoNothing();
  }
  const existing = await db.select().from(serverConfigs).where(eq(serverConfigs.tenantSlug, "owner"));
  const have = new Set(existing.map((r) => r.slot));
  for (let slot = 1; slot <= 3; slot++) {
    if (!have.has(slot)) {
      await db.insert(serverConfigs).values({
        tenantSlug: "owner",
        slot,
        title: DEFAULT_TITLES[slot - 1],
        realUrl: "",
        decoy1: "",
        decoy2: "",
        online: slot === 1 ? 14 : slot === 2 ? 2 : 0,
        maxOnline: 20,
        imageUrl: DEFAULT_IMAGES[slot - 1],
        gameBy: "",
        gameDesc: "",
        maturity: "",
        // 2 server aktif — Server 03 nonaktif default
        isActive: slot <= 2,
      });
    }
  }
  // Kunci: Server 03 kosong wajib nonaktif agar join & panel tetap 2
  try {
    const { and } = await import("drizzle-orm");
    await db
      .update(serverConfigs)
      .set({ isActive: false })
      .where(
        and(
          eq(serverConfigs.tenantSlug, "owner"),
          eq(serverConfigs.slot, 3),
          eq(serverConfigs.decoy1, ""),
          eq(serverConfigs.decoy2, ""),
          eq(serverConfigs.realUrl, "")
        )
      );
  } catch {}
}

export async function ensureTenantServers(slug: string) {
  const existing = await db.select().from(serverConfigs).where(eq(serverConfigs.tenantSlug, slug));
  if (existing.length < 3) {
    const have = new Set(existing.map((r) => r.slot));
    for (let slot = 1; slot <= 3; slot++) {
      if (!have.has(slot)) {
        await db.insert(serverConfigs).values({
          tenantSlug: slug,
          slot,
          title: DEFAULT_TITLES[slot - 1],
          realUrl: "",
          decoy1: "",
          decoy2: "",
          online: 0,
          maxOnline: 20,
          imageUrl: DEFAULT_IMAGES[slot - 1],
          gameBy: "",
          gameDesc: "",
          maturity: "",
          isActive: slot <= 2,
        });
      }
    }
  }
  // Kunci: Server 03 kosong wajib nonaktif
  try {
    const { and } = await import("drizzle-orm");
    await db
      .update(serverConfigs)
      .set({ isActive: false })
      .where(
        and(
          eq(serverConfigs.tenantSlug, slug),
          eq(serverConfigs.slot, 3),
          eq(serverConfigs.decoy1, ""),
          eq(serverConfigs.decoy2, ""),
          eq(serverConfigs.realUrl, "")
        )
      );
  } catch {}
}
