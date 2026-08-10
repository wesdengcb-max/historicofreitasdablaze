import { useCallback, useEffect, useMemo, useState } from "react";
import { setPredictiveSignals, setProximaListaSignals, getProximaListaSignals, subscribeProximaLista, type ProximaListaSignal } from "@/lib/signalsStore";
import { Loader2, Sparkles, Target, List, Layers } from "lucide-react";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { Card } from "@/components/double/Card";
import {
  buildA1,
  buildA2,
  buildA3,
  buildA4,
  buildA5,
  computeTop,
  cyclesOf,
  fmtClock,
  latestByValue,
  MAX_ZEROS,
  MAX_ZEROS_A4,
  checkHighTendency,
  type Cycle,
  type Row,
} from "@/lib/predictive";

type Mode1Signal = { 
  key: string; 
  title: string; 
  at: Date; 
  pct: number; 
  label: string; 
  analysisCount: number; 
  sources: Array<{ analysis: 1 | 2 | 3 | 4 | 5; value: number }>;
  isHighTendency: boolean;
  outcome?: "pending" | "green" | "red";
  resultTime?: string;
};
type Mode2Signal = {
  key: string;
  title: string;
  times: Date[];
  pct: number;
  sources: Array<{ analysis: 1 | 2 | 3 | 4 | 5; value: number; pct: number; top5: boolean }>;
  confluence: string;
  analysisCount: number;
  isHighTendency: boolean;
  outcome?: "pending" | "green" | "red";
  resultTime?: string;
};

const MIN_ASSERTIVIDADE_TOP1 = 65;
const MIN_ASSERTIVIDADE_CONFLUENCIA = 55;
const MIN_GATILHOS = 5;

function addMinutes(d: Date, m: number) {
  const out = new Date(d.getTime() + m * 60_000);
  out.setSeconds(0, 0);
  return out;
}

/** Quantidade de projeções consideradas como candidatas por análise/pedra. */
const CANDIDATE_DEPTH = 10;
/** Somente as N primeiras contam como Top 5 validador. */
const TOP5_DEPTH = 5;

const getMedalStyles = (count: number) => {
  if (count >= 4) return { 
    label: "Ouro", 
    classes: "border-yellow-400 bg-yellow-950/50 text-yellow-300 shadow-yellow-500/20",
    badge: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30"
  };
  if (count === 3) return { 
    label: "Prata", 
    classes: "border-slate-300 bg-slate-800/40 text-slate-100",
    badge: "bg-slate-300/20 text-slate-100 border-slate-300/30"
  };
  if (count === 2) return { 
    label: "Bronze", 
    classes: "border-amber-700 bg-amber-950/30 text-amber-300",
    badge: "bg-amber-700/20 text-amber-300 border-amber-700/30"
  };
  return null;
};

export function PredictiveSignals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mode1, setMode1] = useState<Mode1Signal[] | null>(null);
  const [mode2, setMode2] = useState<Mode2Signal[] | null>(null);
  const [hasClicked, setHasClicked] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("blaze_results")
          .select("id, roll, color, created_at")
          .order("created_at", { ascending: false })
          .limit(5000);
        if (!alive) return;
        if (error) {
          setErr(error.message);
          console.error("[PredictiveSignals] Supabase error:", error);
          setLoading(false);
          return;
        }
        setRows(((data ?? []) as Row[]).slice().reverse());
      } catch (e) {
        if (alive) {
          setErr("Erro ao carregar resultados.");
          console.error("[PredictiveSignals] Fetch error:", e);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const engine = useMemo(() => {
    const a1 = buildA1(rows);
    const a2 = buildA2(rows);
    const a3 = buildA3(rows);
    const a4 = buildA4(rows);
    const a5 = buildA5(rows);
    return { 1: a1, 2: a2, 3: a3, 4: a4, 5: a5 } as Record<1 | 2 | 3 | 4 | 5, Cycle[]>;
  }, [rows]);

  /** Ciclos em aberto (status < MAX_ZEROS) por análise + valor. */
  const active = useMemo(() => {
    const out: Array<{ analysis: 1 | 2 | 3 | 4 | 5; value: number; open: Cycle }> = [];
    ([1, 2, 3, 4, 5] as const).forEach((a) => {
      const latest = latestByValue(engine[a]);
      latest.forEach((cycle, value) => {
        const limit = (a === 4 || a === 5) ? MAX_ZEROS_A4 : MAX_ZEROS;
        if (cycle.gaps.length < limit) out.push({ analysis: a, value, open: cycle });
      });
    });
    return out;
  }, [engine]);

  const hasOpportunity = active.length > 0;

  const generate = useCallback(() => {
    setHasClicked(true);
    const now = new Date();
    now.setSeconds(0, 0);
    setGeneratedAt(now);

    // ---- Modo 1: Top 1 (posição central M) de cada análise ativa, unificado por horário ----
    const byTime = new Map<
      number,
      { values: number[]; analyses: Set<number>; pct: number; label: string; sources: Array<{ analysis: number; value: number }>; isHighTendency: boolean }
    >();
    for (const item of active) {
      const hist = engine[item.analysis].filter(c => c.value === item.value);
      // FILTRO DE MASSA CRÍTICA (Mínimo de 5 gatilhos)
      if (hist.length < MIN_GATILHOS) continue;

      const top1 = computeTop(hist, 1)[0];
      if (!top1) continue;
      
      // FILTRO DE ASSERTIVIDADE RÍGIDO (Top 1 em 65%)
      if (top1.pct < MIN_ASSERTIVIDADE_TOP1) continue;
      
      const at = addMinutes(item.open.triggerAt, top1.m);
      if (at.getTime() <= now.getTime()) continue; 
      const t = at.getTime();

      const isTendency = checkHighTendency(engine[item.analysis], item.value);

      const cur = byTime.get(t);
      if (!cur) {
        byTime.set(t, { 
          values: [item.value], 
          analyses: new Set([item.analysis]),
          pct: top1.pct, 
          label: top1.label,
          sources: [{ analysis: item.analysis as 1 | 2 | 3 | 4 | 5, value: item.value }],
          isHighTendency: isTendency
        });
      } else {
        if (!cur.values.includes(item.value)) cur.values.push(item.value);
        cur.analyses.add(item.analysis);
        cur.sources.push({ analysis: item.analysis as 1 | 2 | 3 | 4 | 5, value: item.value });
        if (isTendency) cur.isHighTendency = true;
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
          analysisCount: info.analyses.size,
          sources: info.sources as Array<{ analysis: 1 | 2 | 3 | 4 | 5; value: number }>,
          isHighTendency: info.isHighTendency
        };
      });
    setMode1(m1);

    const usedTimes = new Set<number>(m1.map((s) => s.at.getTime()));

    // ---- Modo 2: Estratégia de Coincidência ----
    type Proj = { analysis: 1 | 2 | 3 | 4 | 5; value: number; pct: number; top5: boolean };
    const byMinute = new Map<number, Proj[]>();

    for (const item of active) {
      const hist = engine[item.analysis].filter(c => c.value === item.value);
      // FILTRO DE MASSA CRÍTICA (Mínimo de 5 gatilhos)
      if (hist.length < MIN_GATILHOS) continue;

      const list = computeTop(hist, CANDIDATE_DEPTH);
      list.forEach((g, idx) => {
        const at = addMinutes(item.open.triggerAt, g.m).getTime();
        if (at <= now.getTime()) return;
        const arr = byMinute.get(at) ?? [];
        arr.push({
          analysis: item.analysis as 1 | 2 | 3 | 4 | 5,
          value: item.value,
          pct: g.pct,
          top5: idx < TOP5_DEPTH,
        });
        byMinute.set(at, arr);
      });
    }

    const m2: Mode2Signal[] = [];
    for (const [at, projs] of byMinute) {
      const distinctAnalyses = new Set(projs.map((p) => p.analysis));
      if (distinctAnalyses.size < 2) continue;
      
      const validators = projs.filter((p) => p.top5);
      if (!validators.length) continue;

      const pct = projs.reduce((s, p) => s + p.pct, 0) / projs.length;
      
      // FILTRO DE ASSERTIVIDADE RÍGIDO (55% para confluências)
      if (pct < MIN_ASSERTIVIDADE_CONFLUENCIA) continue;
      
      if (usedTimes.has(at)) continue;
      usedTimes.add(at);

      const sources = projs.slice().sort((a, b) => b.pct - a.pct);
      const confluence = validators
        .slice()
        .sort((a, b) => b.pct - a.pct)
        .map((p) => `A${p.analysis}·${p.value}`)
        .join(", ");
      
      const isHighTendency = projs.some(p => checkHighTendency(engine[p.analysis as 1 | 2 | 3 | 4 | 5], p.value));

      m2.push({
        key: `m2-${at}`,
        title: Array.from(distinctAnalyses)
          .sort()
          .map((a) => `Análise ${a}`)
          .join(" + "),
        times: [new Date(at)],
        pct,
        sources,
        confluence,
        analysisCount: distinctAnalyses.size,
        isHighTendency
      });
    }
    m2.sort((a, b) => a.times[0].getTime() - b.times[0].getTime());
    setMode2(m2);

    // Sync with global store for SinaisSection
    const syncSignals: any[] = [
      ...m1.map(s => ({
        key: s.key,
        time: fmtClock(s.at),
        pct: s.pct,
        label: s.label,
        confluence: s.sources.map(src => `A${src.analysis}·${src.value}`).join(", "),
        medal: getMedalStyles(s.analysisCount)?.label,
        entryDate: s.at,
        outcome: "pending"
      })),
      ...m2.map(s => ({
        key: s.key,
        time: s.times.map(t => fmtClock(t)).join(" / "),
        pct: s.pct,
        label: "Confluência",
        confluence: s.confluence,
        medal: getMedalStyles(s.analysisCount)?.label,
        entryDate: s.times[0],
        outcome: "pending"
      }))
    ].sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

    setPredictiveSignals(syncSignals);
  }, [active, engine]);

  // Sync projections with global store for SinaisSection automatically
  useEffect(() => {
    if (rows.length > 0 && !loading) {
      const now = new Date();
      now.setSeconds(0, 0);

      const m1List: Mode1Signal[] = [];
      const usedTimes = new Set<number>();

      // Internal calculation for Mode 1
      const byTime = new Map<number, any>();
      for (const item of active) {
        const hist = engine[item.analysis].filter(c => c.value === item.value);
        if (hist.length < MIN_GATILHOS) continue;
        const top1 = computeTop(hist, 1)[0];
        if (!top1 || top1.pct < MIN_ASSERTIVIDADE_TOP1) continue;
        const at = addMinutes(item.open.triggerAt, top1.m);
        if (at.getTime() <= now.getTime()) continue;
        const t = at.getTime();
        const cur = byTime.get(t);
        if (!cur) {
          byTime.set(t, { 
            pct: top1.pct, 
            label: top1.label,
            sources: [{ analysis: item.analysis, value: item.value }],
            analyses: new Set([item.analysis])
          });
        } else {
          cur.analyses.add(item.analysis);
          cur.sources.push({ analysis: item.analysis, value: item.value });
          if (top1.pct > cur.pct) { cur.pct = top1.pct; cur.label = top1.label; }
        }
      }

      const syncM1 = Array.from(byTime.entries()).map(([t, info]) => {
        usedTimes.add(t);
        return {
          key: `m1-${t}`,
          time: fmtClock(new Date(t)),
          pct: info.pct,
          label: info.label,
          confluence: info.sources.map((src: any) => `A${src.analysis}·${src.value}`).join(", "),
          medal: getMedalStyles(info.analyses.size)?.label,
          entryDate: new Date(t),
          outcome: "pending"
        };
      });

      // Internal calculation for Mode 2 (Confluences)
      const byMinute = new Map<number, any[]>();
      for (const item of active) {
        const hist = engine[item.analysis].filter(c => c.value === item.value);
        if (hist.length < MIN_GATILHOS) continue;
        const list = computeTop(hist, CANDIDATE_DEPTH);
        list.forEach((g, idx) => {
          const at = addMinutes(item.open.triggerAt, g.m).getTime();
          if (at <= now.getTime()) return;
          const arr = byMinute.get(at) ?? [];
          arr.push({ analysis: item.analysis, value: item.value, pct: g.pct, top5: idx < TOP5_DEPTH });
          byMinute.set(at, arr);
        });
      }

      const syncM2: any[] = [];
      for (const [at, projs] of byMinute) {
        const distinctAnalyses = new Set(projs.map((p) => p.analysis));
        if (distinctAnalyses.size < 2) continue;
        const validators = projs.filter((p) => p.top5);
        if (!validators.length) continue;
        const pct = projs.reduce((s, p) => s + p.pct, 0) / projs.length;
        if (pct < MIN_ASSERTIVIDADE_CONFLUENCIA) continue;
        if (usedTimes.has(at)) continue;
        usedTimes.add(at);

        syncM2.push({
          key: `m2-${at}`,
          time: fmtClock(new Date(at)),
          pct,
          label: "Confluência",
          confluence: validators.map(p => `A${p.analysis}·${p.value}`).join(", "),
          medal: getMedalStyles(distinctAnalyses.size)?.label,
          entryDate: new Date(at),
          outcome: "pending"
        });
      }

      setPredictiveSignals([...syncM1, ...syncM2].sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime()));
    }
  }, [rows, loading, active, engine]);

  const generateProximaLista = useCallback(() => {
    if (rows.length === 0) return;

    // Horário atual no fuso de São Paulo
    const nowInSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentYear = nowInSP.getFullYear();
    const currentMonth = nowInSP.getMonth();
    const currentDate = nowInSP.getDate();
    const currentHour = nowInSP.getHours();

    // Determinar a hora anterior (ex: se agora é 02:xx, analisar 01:00-01:59)
    // Se agora for 00:xx, a hora anterior é 23:xx do dia anterior.
    const startTimeInSP = new Date(currentYear, currentMonth, currentDate, currentHour - 1, 0, 0);
    const endTimeInSP = new Date(currentYear, currentMonth, currentDate, currentHour - 1, 59, 59, 999);

    // Filtrar resultados da Blaze que caíram na hora anterior (no fuso SP)
    const previousHourRows = rows.filter(r => {
      const d = new Date(r.created_at);
      const dInSP = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      return dInSP >= startTimeInSP && dInSP <= endTimeInSP;
    });

    // Agrupar por minuto e pegar EXCLUSIVAMENTE a primeira pedra de cada minuto (created_at mais antigo)
    const firstByMinute = new Map<number, Row>();
    previousHourRows.forEach(r => {
      const d = new Date(r.created_at);
      const dInSP = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const min = dInSP.getMinutes();
      
      const existing = firstByMinute.get(min);
      if (!existing || new Date(r.created_at).getTime() < new Date(existing.created_at).getTime()) {
        firstByMinute.set(min, r);
      }
    });

    const listSignals: ProximaListaSignal[] = [];
    
    // Iterar pelos minutos 0-59 para garantir ordem e consistência
    for (let min = 0; min <= 59; min++) {
      const firstRow = firstByMinute.get(min);
      if (!firstRow) continue;

      const roll = Number(firstRow.roll);
      let symbols = "";
      
      // Regra 1: Pedra 6 ou 7 -> 🔴⚪️ (mesmo minuto + 1 hora)
      if (roll === 6 || roll === 7) {
        symbols = "🔴⚪️";
      } 
      // Regra 2: Pedra 8 ou 9 -> ⚫️ (mesmo minuto + 1 hora)
      else if (roll === 8 || roll === 9) {
        symbols = "⚫️";
      }

      if (symbols) {
        // O horário do sinal é EXATAMENTE a mesma hora atual (que é hora_anterior + 1)
        const displayTime = `${currentHour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        
        // Criar data de entrada para ordenação e validação (no dia atual)
        const entryDate = new Date(currentYear, currentMonth, currentDate, currentHour, min, 0);

        listSignals.push({
          key: `pl-${currentHour}-${min}`,
          time: displayTime,
          symbols,
          entryDate,
          outcome: "pending"
        });
      }
    }

    setProximaListaSignals(listSignals);
  }, [rows]);

  return (
    <div className="space-y-6">
      <Card className="glass-card !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] bg-white/[0.02] px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary font-outfit">
                Gerador preditivo
              </div>
              <h2 className="text-xl font-black text-white font-outfit uppercase tracking-tight">Próximo branco</h2>
            </div>
          </div>
          <button
            type="button"
            disabled={!hasOpportunity || loading}
            onClick={generate}
            className={
              hasOpportunity && !loading
                ? "relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-blue-600 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_25px_-6px_rgba(59,130,246,0.6)] active:scale-[0.98] font-outfit border border-white/10 group"
                : "rounded-xl border border-white/5 bg-white/[0.03] px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] opacity-50 font-outfit"
            }
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
            <div className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                </>
              ) : hasOpportunity ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Próximo branco</span>
                </>
              ) : (
                "Aguardando gatilho"
              )}
            </div>
          </button>
        </div>
        <div className="space-y-5 px-5 py-5">
        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {!hasClicked && !err && (
          <p className="text-sm text-muted-foreground">
            {hasOpportunity
              ? `${active.length} ciclo(s) em aberto. Clique em "Próximo branco" para projetar os horários.`
              : "Nenhum ciclo em aberto no momento."}
          </p>
        )}

        {hasClicked && mode1 && (
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
                {mode1.map((s) => {
                  const medal = getMedalStyles(s.analysisCount);
                  return (
                    <div
                      key={s.key}
                      className={`rounded-2xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 ${
                        medal 
                          ? medal.classes 
                          : "border-white/[0.05] bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-muted-foreground opacity-80">{s.title}</div>
                        {medal && (
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${medal.badge}`}>
                            {medal.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-3xl font-black tabular-nums text-white font-outfit">
                          {fmtClock(s.at)}
                        </div>
                        {s.isHighTendency && (
                          <span className="flex items-center gap-1 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[9px] font-black text-red-400 animate-pulse border border-red-500/30">
                            🔥 Alta Tendência
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] tabular-nums font-bold flex items-center gap-1.5">
                        <span className={medal ? "text-inherit" : "text-primary"}>
                          {s.pct.toFixed(1)}%
                        </span>
                        <span className="opacity-50 text-[10px]">· janela {s.label}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.sources.map((src, idx) => (
                          <span key={idx} className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-black text-white/70">
                            A{src.analysis}·{src.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {hasClicked && mode2 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Coincidências · validadas pelo Top 5
            </div>
            {mode2.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem coincidências validadas (mín. 2 análises no mesmo minuto + presença no Top 5)
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {mode2.map((s) => {
                  const medal = getMedalStyles(s.analysisCount);
                  return (
                    <div
                      key={s.key}
                      className={`rounded-2xl border px-5 py-4 backdrop-blur-sm transition-all duration-300 ${
                        medal 
                          ? medal.classes 
                          : "border-primary/20 bg-primary/5 shadow-[0_0_25px_rgba(59,130,246,0.1)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-tighter">{s.title}</span>
                        {medal ? (
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${medal.badge}`}>
                            {medal.label}
                          </span>
                        ) : (
                          <span className="rounded-full border border-primary/30 bg-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                            Alta assertividade
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-3xl font-black tabular-nums text-white font-outfit">
                          {s.times.map((t) => fmtClock(t)).join(" / ")}
                        </div>
                        {s.isHighTendency && (
                          <span className="flex items-center gap-1 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[9px] font-black text-red-400 animate-pulse border border-red-500/30">
                            🔥 Alta Tendência
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] tabular-nums font-black">
                        <span className={medal ? "text-inherit" : "text-primary"}>
                          {s.pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] leading-relaxed text-muted-foreground opacity-80">
                        Confluência Top 5:{" "}
                        <span className={`font-bold ${medal ? "text-inherit" : "text-primary"}`}>{s.confluence}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.sources.map((p) => (
                          <span
                            key={`${p.analysis}-${p.value}`}
                            className={
                              p.top5
                                ? `rounded-full border px-2 py-0.5 text-[9px] font-black tabular-nums ${
                                    medal ? "border-current/30 bg-current/10 text-inherit" : "border-primary/30 bg-primary/20 text-white"
                                  }`
                                : "rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold tabular-nums text-[#9CA3AF]"
                            }
                          >
                            A{p.analysis}·{p.value} {p.pct.toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </Card>

    <Card className="glass-card !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] bg-white/[0.02] px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <List className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 font-outfit">
              Estratégia horária
            </div>
            <h2 className="text-xl font-black text-white font-outfit uppercase tracking-tight">Próxima lista</h2>
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={generateProximaLista}
          className={
            !loading
              ? "relative overflow-hidden rounded-xl bg-gradient-to-br from-red-600 via-red-500 to-red-700 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_8px_20px_-6px_rgba(239,68,68,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_25px_-6px_rgba(239,68,68,0.6)] active:scale-[0.98] font-outfit border border-white/10 group"
              : "rounded-xl border border-white/5 bg-white/[0.03] px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] opacity-50 font-outfit"
          }
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
          <div className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </>
            ) : (
              <>
                <List className="h-3.5 w-3.5" />
                <span>Gerar Lista de Cor</span>
              </>
            )}
          </div>
        </button>
      </div>

      <div className="px-5 py-5">
        <ProximaListaDisplay />
      </div>
    </Card>
    </div>
  );
}

function ProximaListaDisplay() {
  const [list, setList] = useState<ProximaListaSignal[]>(getProximaListaSignals());

  useEffect(() => {
    const update = () => setList(getProximaListaSignals());
    const sub = subscribeProximaLista(update);
    return sub;
  }, []);

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma lista gerada. Clique em "Gerar Lista de Cor" para analisar a hora anterior.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-6 space-y-4">
      <div className="text-center space-y-1">
        <div className="text-sm font-black text-white font-outfit">
          💥🧑🏻‍💻ATÉ G1📊@FreitasWhite
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {list.map((s) => (
          <div key={s.key} className="flex items-center justify-center gap-2 bg-white/[0.03] rounded-lg py-2 px-3 border border-white/[0.05]">
            <span className="text-sm font-black tabular-nums text-white font-outfit">{s.time}</span>
            <span className="text-lg">{s.symbols}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
