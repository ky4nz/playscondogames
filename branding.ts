import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export type Branding = {
  siteName1: string;
  siteName2: string;
  heroTitle: string;
  heroSubtitle: string;
  heroVideo: string;
  heroAvatar: string;
  heroAvatarName: string;
  sectionTitle: string;
};

export const DEFAULT_BRANDING: Branding = {
  siteName1: "CONDO",
  siteName2: "GAMES",
  heroTitle: "Condo Games Private",
  heroSubtitle: "Choose your favorite Roblox private server and join now",
  heroVideo: "https://raw.githubusercontent.com/tokun787-boop/Condo-Games-/main/image/vidio.mp4",
  heroAvatar: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-A4F764CB5B7A62140A826DCBA9EE5F7E-Png/150/150/AvatarHeadshot/Webp/noFilter",
  heroAvatarName: "Condo_Games",
  sectionTitle: "Private Servers",
};

const FIELDS: (keyof Branding)[] = [
  "siteName1",
  "siteName2",
  "heroTitle",
  "heroSubtitle",
  "heroVideo",
  "heroAvatar",
  "heroAvatarName",
  "sectionTitle",
];

function bkey(slug: string, field: string) {
  return `brand:${slug}:${field}`;
}

export async function getBranding(slug: string): Promise<Branding> {
  const out: Branding = { ...DEFAULT_BRANDING };
  try {
    for (const f of FIELDS) {
      const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, bkey(slug, f)));
      if (rows.length > 0 && rows[0].value) {
        (out as Record<string, string>)[f] = rows[0].value;
      }
    }
  } catch {}
  return out;
}

export async function saveBranding(slug: string, patch: Partial<Branding>): Promise<Branding> {
  for (const f of FIELDS) {
    const v = patch[f];
    if (v === undefined) continue;
    const val = String(v).slice(0, 500);
    const k = bkey(slug, f);
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, k));
    if (rows.length === 0) {
      await db.insert(siteSettings).values({ key: k, value: val }).onConflictDoNothing();
    } else {
      await db.update(siteSettings).set({ value: val, updatedAt: new Date() }).where(eq(siteSettings.key, k));
    }
  }
  return getBranding(slug);
}
