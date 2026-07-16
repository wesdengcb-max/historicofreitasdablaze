import { createFileRoute } from "@tanstack/react-router";

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

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.6",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: "https://blaze.bet.br/",
  Origin: "https://blaze.bet.br",
};

function normalize(payload: unknown): BlazeRound[] | null {
  if (Array.isArray(payload)) return payload as BlazeRound[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { records?: unknown }).records)) {
    return (payload as { records: BlazeRound[] }).records;
  }
  return null;
}

function mapColor(c: number): "white" | "red" | "black" {
  if (c === 0) return "white";
  if (c === 1) return "red";
  return "black";
}

// Format a UTC ISO timestamp to YYYY-MM-DD and HH:mm:ss in America/Sao_Paulo (UTC-3).
function toSaoPaulo(iso: string) {
  const d = new Date(iso);
  // BRT has no DST since 2019; offset is fixed at -03:00.
  const sp = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const data = sp.toISOString().slice(0, 10);
  const hora = sp.toISOString().slice(11, 19);
  return { data, hora };
}

async function fetchUpstream(): Promise<BlazeRound[] | null> {
  for (const url of SOURCES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) continue;
      const text = (await r.text()).slice(0, 512 * 1024);
      const parsed = JSON.parse(text);
      const rounds = normalize(parsed);
      if (rounds && rounds.length) return rounds;
    } catch {
      /* try next */
    }
  }
  return null;
}

export const Route = createFileRoute("/api/public/collect")({
  server: {
    handlers: {
      GET: async () => handle(),
      POST: async () => handle(),
    },
  },
});

async function handle() {
  const rounds = await fetchUpstream();
  if (!rounds) {
    return Response.json({ ok: false, inserted: 0, error: "upstream unavailable" }, { status: 200 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const rows = rounds
    .filter((r) => r && r.id && r.created_at && typeof r.roll === "number")
    .map((r) => {
      const { data, hora } = toSaoPaulo(r.created_at);
      return {
        blaze_id: String(r.id),
        numero: r.roll,
        cor: mapColor(r.color),
        data,
        hora,
        timestamp: r.created_at,
      };
    });

  if (!rows.length) {
    return Response.json({ ok: true, inserted: 0 });
  }

  const { error, count } = await supabaseAdmin
    .from("historico_blaze")
    .upsert(rows, { onConflict: "blaze_id", ignoreDuplicates: true, count: "exact" });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
  return Response.json({ ok: true, inserted: count ?? 0, received: rows.length });
}
