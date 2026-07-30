import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Target, Layers } from "lucide-react";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { Card } from "@/components/double/Card";
import {
  buildA1,
  buildA2,
  buildA3,
  computeTop,
  cyclesOf,
  fmtClock,
  latestByValue,
  MAX_ZEROS,
  type Cycle,
  type Row,
} from "@/lib/predictive";

type Mode1Signal = { key: string; title: string; at: Date; pct: number; label: string };
type Mode2Signal = { key: string; title: string; times: Date[]; pct: number };

const MIN_ASSERTIVIDADE = 30;

function addMinutes(d: Date, m: number) {
  const out = new Date(d.getTime() + m * 60_000);
  out.setSeconds(0, 0);
  return out;
}

function combos<T>(arr: T[], size: number): T[][] {
  if (size > arr.length) return [];
  const res: T[][] = [];
  const walk = (start: number, acc: T[]) => {
    if (acc.length === size) {
      res.push(acc.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) walk(i + 1, [...acc, arr[i]]);
  };
  walk(0, []);
  return res;
}

export function PredictiveSignals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mode1, setMode1] = useState<Mode1Signal[] | null>(null);
  const [mode2, setMode2] = useState<Mode2Signal[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("blaze_results")
        .select("id, roll, color, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!alive) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setRows(((data ?? []) as Row[]).slice().reverse());
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const engine = useMemo(() => {
    const a1 = buildA1(rows);
    const a2 = buildA2(rows);
    const a3 = buildA3(rows);
    return { 1: a1, 2: a2, 3: a3 } as Record<1 | 2 | 3, Cycle[]>;
  }, [rows]);

  /** Ciclos em aberto (status < 14/14) por análise + valor. */
  const active = useMemo(() => {
    const out: Array<{ analysis: 1 | 2 | 3; value: number; open: Cycle }> = [];
    ([1, 2, 3] as const).forEach((a) => {
      const latest = latestByValue(engine[a]);
      latest.forEach((cycle, value) => {
        if (cycle.gaps.length < MAX_ZEROS) out.push({ analysis: a, value, open: cycle });
      });
    });
    return out;
  }, [engine]);

  const hasOpportunity = active.length > 0;

  const generate = useCallback(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    setGeneratedAt(now);

    // ---- Modo 1: Top 1 (posição central M) de cada análise ativa, unificado por horário ----
    const byTime = new Map<
      number,
      { values: number[]; pct: number; label: string }
    >();
    for (const item of active) {
      const hist = cyclesOf(engine[item.analysis], item.value);
      if (!hist.length) continue;
      const top1 = computeTop(hist, 1)[0];
      if (!top1) continue;
      const at = addMinutes(item.open.triggerAt, top1.m);
      if (at.getTime() <= now.getTime()) continue; // elimina horários passados
      const t = at.getTime();
      const cur = byTime.get(t);
      if (!cur) {
        byTime.set(t, { values: [item.value], pct: top1.pct, label: top1.label });
      } else {
        if (!cur.values.includes(item.value)) cur.values.push(item.value);
        if (top1.pct > cur.pct) {
          cur.pct = top1.pct;
          cur.label = top1.label;
        }
      }
    }
    const m1: Mode1Signal[] = Array.from(byTime.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([t, info]) => {
        const values = info.values.slice().sort((a, b) => a - b);
        return {
          key: `m1-${t}`,
          title: `Análise ${values.join(" + ")}`,
          at: new Date(t),
          pct: info.pct,
          label: info.label,
        };
      });
    setMode1(m1);

    const usedTimes = new Set<number>(m1.map((s) => s.at.getTime()));

    // ---- Modo 2: cruzamento de coincidências (Análise 1, pedras 0..9) ----
    const a1Active = active.filter((i) => i.analysis === 1 && i.value <= 9);
    const projections = new Map<number, Array<{ at: number; pct: number }>>();
    for (const item of a1Active) {
      const hist = cyclesOf(engine[1], item.value);
      if (!hist.length) continue;
      const list = computeTop(hist, 5)
        .map((g) => ({ at: addMinutes(item.open.triggerAt, g.m).getTime(), pct: g.pct }))
        .filter((p) => p.at > now.getTime());
      if (list.length) projections.set(item.value, list);
    }

    const values = Array.from(projections.keys()).sort((a, b) => a - b);
    const m2: Mode2Signal[] = [];
    for (const size of [3, 2]) {
      for (const combo of combos(values, size)) {
        // coincidência com margem de ±1 minuto entre todos os membros
        const base = projections.get(combo[0])!;
        for (const anchor of base) {
          const picks: Array<{ at: number; pct: number }> = [anchor];
          let ok = true;
          for (let i = 1; i < combo.length; i++) {
            const near = (projections.get(combo[i]) ?? []).filter(
              (p) => Math.abs(p.at - anchor.at) <= 60_000,
            );
            if (!near.length) {
              ok = false;
              break;
            }
            near.sort((a, b) => b.pct - a.pct);
            picks.push(near[0]);
          }
          if (!ok) continue;
          const pct = picks.reduce((s, p) => s + p.pct, 0) / picks.length;
          if (pct < MIN_ASSERTIVIDADE) continue;

          const best = Math.max(...picks.map((p) => p.pct));
          const tied = picks.filter((p) => Math.abs(p.pct - best) < 0.001);
          // desduplicação absoluta: remove horários já exibidos em qualquer bloco
          const times = Array.from(new Set(tied.map((p) => p.at)))
            .filter((t) => !usedTimes.has(t))
            .sort((a, b) => a - b);
          if (!times.length) continue;
          times.forEach((t) => usedTimes.add(t));
          m2.push({
            key: `m2-${times[0]}`,
            title: `Análise ${combo.join(" + ")}`,
            times: times.map((t) => new Date(t)),
            pct,
          });
        }
      }
    }
    m2.sort((a, b) => a.times[0].getTime() - b.times[0].getTime());
    setMode2(m2);
  }, [active, engine]);

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Gerador preditivo
            </div>
            <h2 className="text-base font-bold text-foreground">Próximo branco</h2>
          </div>
        </div>
        <button
          type="button"
          disabled={!hasOpportunity || loading}
          onClick={generate}
          className={
            hasOpportunity && !loading
              ? "relative rounded-xl border-2 border-emerald-400 bg-emerald-500/10 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.55)] transition hover:bg-emerald-500/20 animate-pulse"
              : "rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground opacity-60"
          }
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </span>
          ) : hasOpportunity ? (
            "Próximo branco"
          ) : (
            "Aguardando novo gatilho..."
          )}
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {!mode1 && !err && (
          <p className="text-sm text-muted-foreground">
            {hasOpportunity
              ? `${active.length} ciclo(s) em aberto. Clique em "Próximo branco" para projetar os horários.`
              : "Nenhum ciclo em aberto no momento."}
          </p>
        )}

        {mode1 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Projeção Top 1
              {generatedAt && (
                <span className="normal-case tracking-normal opacity-60">
                  · base {fmtClock(generatedAt)}
                </span>
              )}
            </div>
            {mode1.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem horários futuros projetados no momento.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {mode1.map((s) => (
                  <div
                    key={s.key}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="text-xs font-semibold text-muted-foreground">{s.title}</div>
                    <div className="mt-1 text-2xl font-black tabular-nums text-foreground">
                      {fmtClock(s.at)}
                    </div>
                    <div className="mt-1 text-[11px] tabular-nums text-emerald-300">
                      {s.pct.toFixed(1)}% · janela {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {mode2 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Coincidências · confirmações
            </div>
            {mode2.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem coincidências de alta assertividade no momento
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {mode2.map((s) => (
                  <div
                    key={s.key}
                    className="rounded-xl border border-emerald-400/40 bg-emerald-500/[0.07] px-4 py-3 shadow-[0_0_20px_-6px_rgba(52,211,153,0.6)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">{s.title}</span>
                      <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                        Alta assertividade
                      </span>
                    </div>
                    <div className="mt-1 text-2xl font-black tabular-nums text-foreground">
                      {s.times.map((t) => fmtClock(t)).join(" / ")}
                    </div>
                    <div className="mt-1 text-[11px] tabular-nums text-emerald-300">
                      {s.pct.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Card>
  );
}
