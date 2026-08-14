import { useCallback, useEffect, useMemo, useState } from "react";
import { setPredictiveSignals } from "@/lib/signalsStore";
import { Loader2, Sparkles, Target, Layers } from "lucide-react";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { Card } from "@/components/double/Card";
import {
  buildA1,
  buildA2,
  buildA3,
  buildA4,
  buildA5,
  buildA6,
  buildA7,
  buildSecondary,

  computeTop,
  cyclesOf,
  fmtClock,
  latestByValue,
  MAX_ZEROS,
  TIMEOUT_MINUTES,
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
  sources: Array<{ analysis: number; value: number }>;
  isHighTendency: boolean;
  isVerified?: boolean;

  outcome?: "pending" | "green" | "red";
  resultTime?: string;
};
type Mode2Signal = {
  key: string;
  title: string;
  times: Date[];
  pct: number;
  sources: Array<{ analysis: number; value: number; pct: number; top5: boolean }>;
  confluence: string;
  analysisCount: number;
  isHighTendency: boolean;
  isVerified?: boolean;

  outcome?: "pending" | "green" | "red";
  resultTime?: string;
};

const MIN_ASSERTIVIDADE_TOP1 = 65;
const MIN_ASSERTIVIDADE_CONFLUENCIA = 55;
const MIN_GATILHOS = 6;

function addMinutes(d: Date, m: number) {
  const out = new Date(d.getTime() + m * 60_000);
  out.setSeconds(0, 0);
  return out;
}

/** Quantidade de projeções consideradas como candidatas por análise/pedra. */
const CANDIDATE_DEPTH = 10;
/** Somente as N primeiras contam como Top 5 validador. */
const TOP5_DEPTH = 5;

const getMedalStyles = (count: number, isConsecutive?: boolean, levelOffset: number = 0) => {
  const totalLevel = count + levelOffset;
  
  if (totalLevel >= 7) return { 
    label: "👑 Supremo", 
    classes: "border-purple-400 bg-purple-950/50 text-purple-300 shadow-purple-500/20 animate-pulse",
    badge: "bg-purple-400/20 text-purple-300 border-purple-400/30"
  };
  if (totalLevel === 6) return { 
    label: "💎 Diamante", 
    classes: "border-blue-400 bg-blue-950/40 text-blue-200 shadow-blue-500/10",
    badge: "bg-blue-400/20 text-blue-200 border-blue-400/30"
  };
  if (totalLevel === 5) return { 
    label: "🥇 Ouro", 
    classes: "border-yellow-400 bg-yellow-950/50 text-yellow-300 shadow-yellow-500/20",
    badge: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30"
  };
  if (totalLevel === 4) return { 
    label: "🥈 Prata", 
    classes: "border-slate-300 bg-slate-800/40 text-slate-100",
    badge: "bg-slate-300/20 text-slate-100 border-slate-300/30"
  };
  if (totalLevel === 3) return { 
    label: "🥉 Bronze", 
    classes: "border-amber-700 bg-amber-950/30 text-amber-300",
    badge: "bg-amber-700/20 text-amber-300 border-amber-700/30"
  };
  if (totalLevel === 2) return { 
    label: "Top 1 + Confluência", 
    classes: "border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-cyan-500/10",
    badge: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30"
  };
  return {
    label: "Top 1 Isolado",
    classes: "border-white/[0.05] bg-white/[0.02]",
    badge: "bg-white/10 text-white border-white/20"
  };
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
    const main: Record<number, Cycle[]> = {
      1: buildA1(rows),
      2: buildA2(rows),
      3: buildA3(rows),
      4: buildA4(rows),
      5: buildA5(rows),
      6: buildA6(rows),
      7: buildA7(rows),
    };
    const secondary: Record<number, Cycle[]> = {};
    for (let i = 1; i <= 9; i++) {
      secondary[100 + i] = buildSecondary(rows, i);
    }
    return { ...main, ...secondary } as Record<number, Cycle[]>;
  }, [rows]);

  /** Ciclos em aberto (status < MAX_ZEROS) por análise + valor. */
  const active = useMemo(() => {
    const out: Array<{ analysis: number; value: number; open: Cycle }> = [];
    const mainIds = [1, 2, 3, 4, 5, 6, 7];
    mainIds.forEach((a) => {
      const latest = latestByValue(engine[a]);
      latest.forEach((cycle, value) => {
        const hist = engine[a].filter(c => c.value === value);
        if (hist.length > 0) {
           const last = hist[hist.length - 1];
           const now = new Date().getTime();
           const triggerTime = new Date(last.triggerAt).getTime();
           const isTimedOut = now - triggerTime > (TIMEOUT_MINUTES * 60000);
           if (last.gaps.length === 0 && isTimedOut) return;
        }
        if (cycle.gaps.length < MAX_ZEROS) out.push({ analysis: a, value, open: cycle });
      });
    });
    return out;
  }, [engine]);

  const secondaryActive = useMemo(() => {
    const out: Array<{ analysis: number; value: number; open: Cycle }> = [];
    for (let i = 1; i <= 9; i++) {
      const a = 100 + i;
      const latest = latestByValue(engine[a]);
      latest.forEach((cycle, value) => {
        if (cycle.gaps.length < MAX_ZEROS) out.push({ analysis: a, value, open: cycle });
      });
    }
    return out;
  }, [engine]);


  const hasOpportunity = active.length > 0;

  const generate = useCallback(() => {
    setHasClicked(true);
    const now = new Date();
    now.setSeconds(0, 0);
    setGeneratedAt(now);

    // Dispara evento global para o SinaisSection alternar para "Rodadas Atuais"
    window.dispatchEvent(new CustomEvent('switch-audit-filter', { detail: 'hoje' }));

    // ---- Modo 1: Top 1 (posição central M) de cada análise ativa, unificado por horário ----
    const byTime = new Map<
      number,
      { values: number[]; analyses: Set<number>; pct: number; label: string; sources: Array<{ analysis: number; value: number }>; isHighTendency: boolean }
    >();
    for (const item of active) {
      // Janela de Histórico Recente: Últimos 6 gatilhos
      const hist = engine[item.analysis].filter(c => c.value === item.value).slice(-6);
      // Massa Crítica Mínima: 6 gatilhos
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
          sources: [{ analysis: item.analysis as 1 | 2 | 3 | 4 | 5 | 6 | 7, value: item.value }],
          isHighTendency: isTendency
        });
      } else {
        if (!cur.values.includes(item.value)) cur.values.push(item.value);
        cur.analyses.add(item.analysis);
        cur.sources.push({ analysis: item.analysis as 1 | 2 | 3 | 4 | 5 | 6 | 7, value: item.value });
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
          sources: info.sources as Array<{ analysis: 1 | 2 | 3 | 4 | 5 | 6 | 7; value: number }>,
          isHighTendency: info.isHighTendency
        };
      });
    setMode1(m1);

    const usedTimes = new Set<number>(m1.map((s) => s.at.getTime()));

    // ---- Modo 2: Estratégia de Coincidência ----
    type Proj = { analysis: 1 | 2 | 3 | 4 | 5 | 6 | 7; value: number; pct: number; top5: boolean };
    const byMinute = new Map<number, Proj[]>();

    for (const item of active) {
      const hist = engine[item.analysis].filter(c => c.value === item.value).slice(-6);
      // FILTRO DE MASSA CRÍTICA (Mínimo de 6 gatilhos)
      if (hist.length < MIN_GATILHOS) continue;

      const list = computeTop(hist, CANDIDATE_DEPTH);
      list.forEach((g, idx) => {
        const at = addMinutes(item.open.triggerAt, g.m).getTime();
        if (at <= now.getTime()) return;
        const arr = byMinute.get(at) ?? [];
        arr.push({
          analysis: item.analysis as 1 | 2 | 3 | 4 | 5 | 6 | 7,
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
      
      const isHighTendency = projs.some(p => checkHighTendency(engine[p.analysis as 1 | 2 | 3 | 4 | 5 | 6 | 7], p.value));

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

    // ---- Level Elevation and Unification Logic ----
    const unifiedM1: Mode1Signal[] = [];
    const sortedM1 = Array.from(byTime.entries()).sort((a, b) => a[0] - b[0]);
    
    for (let i = 0; i < sortedM1.length; i++) {
      const [t, info] = sortedM1[i];
      const next1 = sortedM1[i + 1];
      const next2 = sortedM1[i + 2];
      
      const isConsecutive3 = next1 && next2 && 
        Math.abs(next1[0] - t) <= 60000 && 
        Math.abs(next2[0] - next1[0]) <= 60000;
      
      const isConsecutive2 = !isConsecutive3 && next1 && 
        Math.abs(next1[0] - t) <= 60000;

      if (isConsecutive3) {
        // Use Middle Time, elevate level
        const middleTime = next1[0];
        const combinedSources = [...info.sources, ...next1[1].sources, ...next2[1].sources];
        const combinedAnalyses = new Set([...info.analyses, ...next1[1].analyses, ...next2[1].analyses]);
        const maxPct = Math.max(info.pct, next1[1].pct, next2[1].pct);
        
        unifiedM1.push({
          key: `m1-c3-${middleTime}`,
          title: `Supremo · ${info.values.join("+")}`,
          at: new Date(middleTime),
          pct: maxPct,
          label: info.label,
          analysisCount: combinedAnalyses.size + 4, // level elevation
          sources: combinedSources,
          isHighTendency: info.isHighTendency || next1[1].isHighTendency || next2[1].isHighTendency,
          isVerified: false // will be checked below
        });
        i += 2; // skip next two
      } else if (isConsecutive2) {
        // Use highest pct time, elevate level
        const best = info.pct >= next1[1].pct ? { t, info } : { t: next1[0], info: next1[1] };
        const combinedSources = [...info.sources, ...next1[1].sources];
        const combinedAnalyses = new Set([...info.analyses, ...next1[1].analyses]);
        
        unifiedM1.push({
          key: `m1-c2-${best.t}`,
          title: `Confluência · ${best.info.values.join("+")}`,
          at: new Date(best.t),
          pct: best.info.pct,
          label: best.info.label,
          analysisCount: combinedAnalyses.size + 1, // level elevation
          sources: combinedSources,
          isHighTendency: info.isHighTendency || next1[1].isHighTendency,
          isVerified: false
        });
        i += 1;
      } else {
        unifiedM1.push({
          key: `m1-${t}`,
          title: `Análise ${info.values.join(" + ")}`,
          at: new Date(t),
          pct: info.pct,
          label: info.label,
          analysisCount: info.analyses.size,
          sources: info.sources,
          isHighTendency: info.isHighTendency,
          isVerified: false
        });
      }
    }

    // Secondary Verification Selo Azul Logic
    const secondaryProjections = new Map<number, Set<number>>(); // time -> values
    for (const item of (secondaryActive as any)) {
      const hist = engine[item.analysis].filter((c: any) => c.value === item.value).slice(-6);
      if (hist.length < 6) continue;
      const top1 = computeTop(hist, 1)[0];
      if (!top1) continue;
      const at = addMinutes(item.open.triggerAt, top1.m).getTime();
      if (!secondaryProjections.has(at)) secondaryProjections.set(at, new Set());
      secondaryProjections.get(at)!.add(item.value);
    }



    const finalM1 = unifiedM1.map(s => {
      const t = s.at.getTime();
      const secValues = secondaryProjections.get(t);
      const isVerified = secValues && s.sources.some(src => secValues.has(src.value));
      return { ...s, isVerified };
    });

    setMode1(finalM1);

    // Sync with global store
    const syncSignals: any[] = [
      ...finalM1.map(s => ({
        key: s.key,
        time: fmtClock(s.at),
        pct: s.pct,
        label: s.label,
        confluence: s.sources.map(src => `A${src.analysis}·${src.value}`).join(", "),
        medal: getMedalStyles(s.analysisCount)?.label,
        entryDate: s.at,
        outcome: "pending",
        isHighTendency: s.isHighTendency,
        isVerified: s.isVerified
      })),
      ...m2.map(s => ({
        key: s.key,
        time: s.times.map(t => fmtClock(t)).join(" / "),
        pct: s.pct,
        label: "Confluência",
        confluence: s.confluence,
        medal: getMedalStyles(s.analysisCount)?.label,
        entryDate: s.times[0],
        outcome: "pending",
        isHighTendency: s.isHighTendency
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
        const hist = engine[item.analysis].filter(c => c.value === item.value).slice(-6);
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
        const hist = engine[item.analysis].filter(c => c.value === item.value).slice(-6);
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

  return (
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
              ? "relative premium-btn rounded-xl px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white animate-pulse font-outfit"
              : "rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#9CA3AF] opacity-60 font-outfit"
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

        {!hasClicked && !err && (
          <p className="text-sm text-muted-foreground">
            {hasOpportunity
              ? `${active.length} ciclo(s) em aberto analisando os últimos 6 gatilhos (limite 120 min / 14 tempos). Clique em "Próximo branco" para projetar.`
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
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-semibold text-muted-foreground opacity-80">{s.title}</div>
                          {s.isVerified && (
                            <span className="flex items-center gap-0.5 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-black text-blue-400 border border-blue-500/30">
                              ✓ Verificado
                            </span>
                          )}
                        </div>
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
                        <span className="opacity-50 text-[10px]">· janela {s.label} (limite 120m/14t)</span>
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
                        Origem:{" "}
                        <span className={`font-bold ${medal ? "text-inherit" : "text-primary"}`}>{s.confluence}</span> (limite 120m/14t)
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
  );
}
