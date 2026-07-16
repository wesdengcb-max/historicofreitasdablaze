import { createServerFn } from "@tanstack/react-start";

type BlazeRound = {
  id: string;
  color: number;
  roll: number;
  created_at: string;
};

const SOURCES = [
  "https://blaze.bet.br/api/singleplayer-originals/originals/roulette_games/recent/1",
  "https://api-v2.blaze1.space/api/singleplayer-originals/originals/roulette_games/recent/1",
  "https://api-v2.blaze1.space/api/singleplayer-originals/originals/roulette_games/recent/history/1",
];

const PROXY_SOURCES = SOURCES.flatMap((url) => [
  `https://cors.zme.ink/${url}`,
  `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
]);

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: "https://blaze.bet.br/",
  Origin: "https://blaze.bet.br",
};

async function fetchOne(url: string): Promise<BlazeRound[] | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const text = (await r.text()).slice(0, 512 * 1024);
    let json = JSON.parse(text) as unknown;
    if (json && typeof json === "object" && typeof (json as { contents?: unknown }).contents === "string") {
      json = JSON.parse((json as { contents: string }).contents) as unknown;
    }
    const arr = Array.isArray(json)
      ? (json as BlazeRound[])
      : Array.isArray((json as { records?: unknown }).records)
        ? ((json as { records: BlazeRound[] }).records)
        : null;
    return arr && arr.length ? arr : null;
  } catch {
    return null;
  }
}

async function fetchUpstream(): Promise<BlazeRound[] | null> {
  const fastSources = [...PROXY_SOURCES, ...SOURCES];
  const settled = await Promise.allSettled(fastSources.map(fetchOne));
  for (const item of settled) {
    if (item.status === "fulfilled" && item.value?.length) return item.value;
  }
  return null;
}

function sanitize(input: unknown): BlazeRound[] | null {
  if (!Array.isArray(input)) return null;
  const out: BlazeRound[] = [];
  for (const raw of input.slice(0, 50)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" || typeof r.id === "number" ? String(r.id) : null;
    const color = typeof r.color === "number" ? r.color : null;
    const roll = typeof r.roll === "number" ? r.roll : null;
    const created_at = typeof r.created_at === "string" ? r.created_at : null;
    if (!id || color === null || roll === null || !created_at) continue;
    if (color < 0 || color > 2) continue;
    if (roll < 0 || roll > 14) continue;
    if (Number.isNaN(Date.parse(created_at))) continue;
    out.push({ id, color, roll, created_at });
  }
  return out.length ? out : null;
}

export const ingestBlazeNow = createServerFn({ method: "POST" })
  .inputValidator((data: { rounds?: unknown } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    let rounds = sanitize(data?.rounds);
    if (!rounds) rounds = await fetchUpstream();
    if (!rounds) return { ok: false, inserted: 0, reason: "upstream_blocked" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows = rounds.map((r) => {
      const ts = new Date(r.created_at);
      const sp = new Date(ts.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const data = `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}-${String(sp.getDate()).padStart(2, "0")}`;
      const hora = `${String(sp.getHours()).padStart(2, "0")}:${String(sp.getMinutes()).padStart(2, "0")}:${String(sp.getSeconds()).padStart(2, "0")}`;
      return {
        blaze_id: r.id,
        numero: r.roll,
        cor: r.color === 0 ? "white" : r.color === 1 ? "red" : "black",
        data,
        hora,
        timestamp: ts.toISOString(),
      };
    });

    const { error, count } = await supabaseAdmin
      .from("historico_blaze")
      .upsert(rows, { onConflict: "blaze_id", ignoreDuplicates: true, count: "exact" });

    if (error) return { ok: false, inserted: 0, reason: error.message };
    return { ok: true, inserted: count ?? 0 };
  });
