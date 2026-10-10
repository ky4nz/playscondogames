// Helper Roblox generik — bisa map apa pun, bukan cuma condo.
export function extractPlaceId(u: string): string {
  if (!u) return "";
  try {
    const m = u.match(/\/games\/(\d+)/);
    if (m && m[1]) return m[1];
    return "";
  } catch {
    return "";
  }
}

export function slugToTitle(u: string): string {
  try {
    const m = u.match(/\/games\/\d+\/([^?#]+)/);
    if (m && m[1]) {
      const s = decodeURIComponent(m[1]).replace(/-/g, " ").trim();
      if (s) return s;
    }
  } catch {}
  return "";
}

export type MapInfo = {
  placeId: string;
  universeId: string;
  name: string;
  creator: string;
  description: string;
  iconUrl: string;
};

export async function fetchMapInfo(linkUrl: string): Promise<MapInfo> {
  const placeId = extractPlaceId(linkUrl);
  const fallbackName = slugToTitle(linkUrl);
  const info: MapInfo = {
    placeId,
    universeId: "",
    name: fallbackName,
    creator: "",
    description: "",
    iconUrl: "",
  };
  if (!placeId) return info;
  try {
    // 1) placeId -> universeId
    const uRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (uRes.ok) {
      const uj = (await uRes.json().catch(() => ({}))) as { universeId?: number };
      if (uj.universeId) info.universeId = String(uj.universeId);
    }
  } catch {}
  if (!info.universeId) return info;
  try {
    // 2) game details
    const gRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${info.universeId}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (gRes.ok) {
      const gj = (await gRes.json().catch(() => ({}))) as {
        data?: { name?: string; creator?: { name?: string }; description?: string }[];
      };
      const d = gj.data?.[0];
      if (d?.name) info.name = d.name;
      if (d?.creator?.name) info.creator = d.creator.name;
      if (d?.description) info.description = d.description.slice(0, 600);
    }
  } catch {}
  try {
    // 3) game icon (banner otomatis dari map apa pun) — coba 512x512 lalu 150x150
    for (const size of ["512x512", "150x150"]) {
      try {
        const tRes = await fetch(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${info.universeId}&size=${size}&format=Png&isCircular=false`,
          { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) }
        );
        if (tRes.ok) {
          const tj = (await tRes.json().catch(() => ({}))) as { data?: { imageUrl?: string }[] };
          if (tj.data?.[0]?.imageUrl) {
            info.iconUrl = tj.data[0].imageUrl;
            break;
          }
        }
      } catch {}
    }
  } catch {}
  // Fallback nama dari slug jika API gagal
  if (!info.name && fallbackName) info.name = fallbackName;
  return info;
}
