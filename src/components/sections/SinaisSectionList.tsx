
import { useEffect, useMemo, useState } from "react";
import { Radio, Trash2 } from "lucide-react";
import { Card } from "@/components/double/Card";
import { Switch } from "@/components/ui/switch";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { ResultCircle } from "@/components/double/ResultCircle";
import { colorOf, fmtTime, type Color } from "@/components/double/types";
import { setSignals } from "@/lib/signalsStore";

type Signal = {
  id: string;
  time: string;
  date: string;
  entry: number; // 1, 2, 3 (G0/G1/G2)
  baseTime: string;
  entryDate: Date;
  outcome: "pending" | "green" | "red";
  resultTime?: string;
  targetIso: string;
  matchedIso?: string;
  color: Color;
};

type Result = {
  id: string;
  roll: number;
  color: Color;
  createdAt: string;
};

const ENTRY_OFFSETS = [11, 16, 21];
const WHITE_MARGIN_MS = 60_000;
const RESULT_VISIBLE_MS = 45_000;

function spYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function spToUtcIso(ymd: string, hms: string): string {
  const time = hms.length === 5 ? `${hms}:00` : hms;
  return new Date(`${ymd}T${time}-03:00`).toISOString();
}

function fmtDateShort(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

function normalizeColor(v: unknown): Color | null {
  const s = (v ?? "").toString().trim().toLowerCase();
  if (["red", "vermelho", "vermelha", "r"].includes(s)) return "red";
  if (["black", "preto", "preta", "b"].includes(s)) return "black";
  if (["white", "branco", "branca", "w", "0"].includes(s)) return "white";
  return null;
}

function rowToResult(r: { id: number | string; color: string; roll: string; created_at: string }): Result {
  const rollNumber = Number(r.roll);
  const colorNumber = Number(r.color);
  const hasRollNumber = Number.isFinite(rollNumber);
  const hasColorNumber = Number.isFinite(colorNumber);
  const n = hasRollNumber ? rollNumber : hasColorNumber ? colorNumber : 0;

  return {
    id: String(r.id),
    roll: n,
    color: normalizeColor(r.color) ?? normalizeColor(r.roll) ?? colorOf(n),
    createdAt: r.created_at,
  };
}

function parseIso(iso: string): Date {
  const raw = (iso ?? "").trim();
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  return new Date(hasTz ? raw : `${raw.replace(" ", "T")}Z`);
}

function buildSignals(results: Result[]): Signal[] {
  const now = Date.now();
  const out: Signal[] = [];
  const maxOffsetMs = Math.max(...ENTRY_OFFSETS) * 60_000;
  const whites = results.filter((r) => r.color === "white");

  for (const w of whites) {
    const base = parseIso(w.createdAt);
    if (Number.isNaN(base.getTime())) continue;
    if (now - base.getTime() > maxOffsetMs) continue;
    const baseTime = fmtTime(w.createdAt);

    for (let i = 0; i < ENTRY_OFFSETS.length; i++) {
      const t = new Date(base.getTime() + ENTRY_OFFSETS[i] * 60_000);
      const targetTime = t.getTime();
      if (targetTime <= now) continue;
      const windowStart = targetTime - WHITE_MARGIN_MS;
      const windowEnd = targetTime + WHITE_MARGIN_MS;

      const matchedWhite = results.find((r) => {
        if (r.color !== "white" || r.id === w.id) return false;
        const resultTime = parseIso(r.createdAt).getTime();
        return resultTime >= windowStart && resultTime <= windowEnd;
      });

      const outcome: Signal["outcome"] = matchedWhite
        ? "green"
        : now > windowEnd
          ? "red"
          : "pending";
      const matchedWhiteTime = matchedWhite ? parseIso(matchedWhite.createdAt).getTime() : null;
      const removeAt =
        outcome === "green"
          ? Math.max(matchedWhiteTime ?? targetTime, targetTime) + RESULT_VISIBLE_MS
          : outcome === "red"
            ? windowEnd + RESULT_VISIBLE_MS
            : Number.POSITIVE_INFINITY;

      if (now > removeAt) continue;

      out.push({
        id: `${w.id}-${i}`,
        time: fmtTime(t.toISOString()),
        date: fmtDateShort(t),
        entry: i + 1,
        baseTime,
        entryDate: t,
        outcome,
        resultTime: matchedWhite ? fmtTime(matchedWhite.createdAt) : undefined,
        color: "white",
        targetIso: t.toISOString(),
        matchedIso: matchedWhite?.createdAt,
      });
    }
  }
  return out.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
}

export function SinaisSectionList() {
  const [results, setResults] = useState<Result[]>([]);
  const [tick, setTick] = useState(0);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [robotOn, setRobotOn] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 5_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const today = spYmd();
      const start = new Date(spToUtcIso(today, "00:00")).getTime() - 30 * 60_000;
      const end = spToUtcIso(today, "23:59:59.999");
      const { data, error } = await supabase
        .from("blaze_results")
        .select("id, color, roll, created_at")
        .gte("created_at", new Date(start).toISOString())
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error || !alive) return;
      const rows = (data ?? []) as Array<{ id: number; color: string; roll: string; created_at: string }>;
      setResults(rows.map(rowToResult));
    };
    void load();

    const channel = supabase
      .channel("sinais_results_list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blaze_results" },
        (payload) => {
          const r = payload.new as { id: number; color: string; roll: string; created_at: string };
          const next = rowToResult(r);
          setResults((prev) =>
            prev.some((item) => item.id === next.id)
              ? prev
              : [next, ...prev]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 1000),
          );
        },
      )
      .subscribe();

    const poll = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  const signals = useMemo(() => {
    void tick;
    return buildSignals(results);
  }, [results, tick]);

  const visible = useMemo(
    () => signals.filter((s) => !disabled.has(s.id)),
    [signals, disabled],
  );

  const visibleForStore = useMemo(
    () =>
      visible.map((s) => ({
        id: s.id,
        color: s.color,
        entry: s.entry,
        targetIso: s.targetIso,
        outcome: s.outcome,
        matchedIso: s.matchedIso,
      })),
    [visible],
  );

  useEffect(() => {
    if (!robotOn) {
      setSignals([]);
      return;
    }
    setSignals(visibleForStore);
  }, [visibleForStore, robotOn]);

  const toggleStatus = (id: string) =>
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    
  const removeSignal = (id: string) => setDisabled((prev) => new Set(prev).add(id));

  return (
    <Card className="glass-card !p-0 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05] bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF1F3D]/10 text-[#FF1F3D] shadow-[0_0_15px_rgba(255,31,61,0.1)]">
            <Radio className="h-5 w-5" />
          </div>
          <h2 className="font-black text-xl text-white font-outfit uppercase tracking-tight">Lista de Sinais</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[11px] tracking-widest font-mono text-red-400 border border-red-500/40 rounded-full px-3 py-1">
            [ ● {visible.length} SINAIS ]
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ROBÔ</span>
            <Switch checked={robotOn} onCheckedChange={setRobotOn} className="scale-75" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="text-[10px] tracking-widest text-muted-foreground font-mono border-b border-border">
              <th className="w-10 px-4 py-3 text-left"></th>
              <th className="px-3 py-3 text-left font-normal">HORÁRIO</th>
              <th className="px-3 py-3 text-left font-normal">COR</th>
              <th className="px-3 py-3 text-left font-normal">ENTRADA</th>
              <th className="px-3 py-3 text-left font-normal">STATUS</th>
              <th className="w-14 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr
                key={s.id}
                className={`border-b last:border-0 transition-colors ${
                  s.outcome === "green"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : s.outcome === "red"
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-border hover:bg-surface/40"
                }`}
              >
                <td className="px-4 py-4">
                  <div className="h-2 w-2 rounded-full bg-red-500/40" />
                </td>
                <td className="px-3 py-4">
                  <div className="font-bold font-mono text-white">{s.time}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{s.date}</div>
                </td>
                <td className="px-3 py-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
                    <ResultCircle color={s.color} size="sm" animate={false} />
                    <span className="text-sm font-semibold text-white">
                      {s.color === "white" ? "Branco" : s.color === "red" ? "Vermelho" : "Preto"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1 font-mono text-xs text-white">
                    {s.entry}ª · G{s.entry - 1}
                  </div>
                </td>
                <td className="px-3 py-4">
                  {s.outcome === "pending" ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!disabled.has(s.id)}
                        onCheckedChange={() => toggleStatus(s.id)}
                        className="scale-75"
                      />
                      <span className="text-xs font-mono tracking-widest text-muted-foreground">
                        AGUARDANDO
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`inline-flex items-center rounded-md px-3 py-1 font-mono text-xs font-black tracking-widest ${
                        s.outcome === "green"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {s.outcome === "green" ? "GREEN" : "RED"}
                      {s.resultTime ? ` · ${s.resultTime}` : ""}
                    </div>
                  )}
                </td>
                <td className="px-3 py-4">
                  <button
                    onClick={() => removeSignal(s.id)}
                    className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum sinal ativo no momento...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
