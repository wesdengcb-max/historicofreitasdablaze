import { useCallback, useEffect, useMemo, useState } from "react";
import { setPredictiveSignals } from "@/lib/signalsStore";
import { Radio, Power, Trash2, FileDown, Clock, Cpu, Sparkles, Target, Layers, Download } from "lucide-react";
import { saveTriggerAudit, updateTriggerAuditResult, getBlockStats, getTriggerAuditsForExport } from "@/lib/triggerAudits.functions";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { ResultCircle } from "@/components/double/ResultCircle";
import { AnimatePresence, motion } from "framer-motion";
import { parseUtcDate } from "@/lib/utils";
import { Card } from "@/components/double/Card";
import {
  buildA1,
  buildA2,
  buildA3,
  buildA4,
  buildA5,
  buildA6,
  buildA7,
  buildA8,
  buildA9,
  buildSomas,
  buildA8_11,
  buildA11_11,
  buildA4_11,
  buildA4_14,
  buildA7_11,
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
  type RecAlert,
  buildRecAlerts,
} from "@/lib/predictive";

function fmtClockLocal(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}


type Mode1Signal = { 
  key: string; 
  title: string; 
  at: Date; 
  pct: number; 
  label: string; 
  analysisCount: number; 
  sources: Array<{ analysis: number; value: number }>;
  isHighTendency: boolean;
  isPossibleRec?: boolean;
  isRare?: boolean;
  outcome?: "pending" | "green" | "red";
  resultTime?: string;
  isSuperSignal?: boolean;
  isTop1?: boolean;
  isTop5Confluence?: boolean;
  peakAnalysisCount: number;
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
  isRare?: boolean;

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

const getMedalStyles = (count: number) => {
  if (count >= 7) return { 
    label: "👑 Supremo", 
    classes: "border-purple-400 bg-purple-950/50 text-purple-300 shadow-purple-500/20 animate-pulse",
    badge: "bg-purple-400/20 text-purple-300 border-purple-400/30"
  };
  if (count === 6) return { 
    label: "👑 Rei", 
    classes: "border-red-400 bg-red-950/40 text-red-200 shadow-red-500/10",
    badge: "bg-red-400/20 text-red-200 border-red-400/30"
  };
  if (count === 5) return { 
    label: "🏆 Mestre", 
    classes: "border-yellow-400 bg-yellow-950/50 text-yellow-300 shadow-yellow-500/20",
    badge: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30"
  };
  if (count === 4) return { 
    label: "🥇 Ouro", 
    classes: "border-yellow-600/50 bg-yellow-900/20 text-yellow-200 shadow-yellow-500/10",
    badge: "bg-yellow-600/20 text-yellow-200 border-yellow-600/30"
  };
  if (count === 3) return { 
    label: "🥈 Prata", 
    classes: "border-slate-300 bg-slate-800/40 text-slate-100 shadow-slate-500/10",
    badge: "bg-slate-300/20 text-slate-100 border-slate-300/30"
  };
  if (count === 2) return { 
    label: "🥉 Bronze", 
    classes: "border-amber-700 bg-amber-950/30 text-amber-300",
    badge: "bg-amber-700/20 text-amber-300 border-amber-700/30"
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
  const [peakStates, setPeakStates] = useState<Record<string, number>>({});
  const [auditIds, setAuditIds] = useState<Record<string, string>>({});
  const [sections, setSections] = useState<{
    top1Confluence: Mode1Signal[];
    top1Isolated: Mode1Signal[];
    top1Top5: Mode1Signal[];
    top5Only: Mode1Signal[];
  }>({
    top1Confluence: [],
    top1Isolated: [],
    top1Top5: [],
    top5Only: [],
  });
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [blockStats, setBlockStats] = useState<Record<string, { signals: number, wins: number, reds: number, pct: number }>>({});
  const [currentBlockLabel, setCurrentBlockLabel] = useState("");

  const fetchBlockStats = useCallback(async () => {
    try {
      const { blockStart, blockEnd, stats } = await getBlockStats();
      const fmt = (iso: string) => fmtClock(new Date(iso));
      setCurrentBlockLabel(`${fmt(blockStart)} - ${fmt(blockEnd)}`);
      
      const newStats: Record<string, { signals: number, wins: number, reds: number, pct: number }> = {};
      const categories = ['raro', 'isolado', 'top1_top5', 'top5'];
      
      categories.forEach(cat => {
        const catStats = stats?.filter(s => s.category === cat) || [];
        const wins = catStats.filter(s => s.win === true).length;
        const reds = catStats.filter(s => s.win === false).length;
        const total = wins + reds;
        newStats[cat] = {
          signals: catStats.length,
          wins,
          reds,
          pct: total > 0 ? (wins / total) * 100 : 100
        };
      });
      setBlockStats(newStats);
    } catch (e) {
      console.error("[fetchBlockStats] Error:", e);
    }
  }, []);

  const handleDownloadReport = async () => {
    try {
      const data = await getTriggerAuditsForExport();
      const csv = [
        ["ID", "Gatilho", "Horário Base", "Horário Alvo", "Categoria", "Confluências", "Win", "Criado Em"].join(","),
        ...data.map(r => [
          r.id,
          r.gatilho,
          r.horario_base,
          r.horario_alvo,
          r.category,
          `"${r.confluences || ""}"`,
          r.win === null ? "PENDENTE" : (r.win ? "SIM" : "NÃO"),
          r.created_at
        ].join(","))
      ].join("\n");
      
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-sinais-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (e) {
      console.error("[handleDownloadReport] Error:", e);
    }
  };

  useEffect(() => {
    fetchBlockStats();
    const interval = setInterval(fetchBlockStats, 60000);
    return () => clearInterval(interval);
  }, [fetchBlockStats]);

  // O renderSignalCard foi definido no final do arquivo


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
      8: (buildA8 as any)(rows),
      9: (buildA9 as any)(rows),
      217: buildSomas(rows).filter((c: Cycle) => c.value === 17),
      218: buildSomas(rows).filter((c: Cycle) => c.value === 18),
      219: buildSomas(rows).filter((c: Cycle) => c.value === 19),
      221: buildSomas(rows).filter((c: Cycle) => c.value === 21),
      10: buildA8_11(rows),
      11: buildA11_11(rows),
      12: buildA4_11(rows),
      13: buildA4_14(rows),
      20711: buildA7_11(rows),
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
    const mainIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
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

  const generate = useCallback(async () => {
    const now = new Date();
    now.setSeconds(0, 0);
    setGeneratedAt(now);

    // Monitorar resultados para auditoria
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const nowMs = now.getTime();
      const lastResultTime = parseUtcDate(lastRow.created_at).getTime();
      
      // Se saiu um Branco (0) recentemente
      if (Number(lastRow.roll) === 0) {
        Object.entries(auditIds).forEach(async ([key, id]) => {
          const signalTime = parseInt(key.split('-')[1]);
          if (!signalTime) return;

          if (Math.abs(lastResultTime - signalTime) <= 60000) {
            console.log(`[AUDITORIA] WIN detectado para sinal em ${fmtClock(new Date(signalTime))}`);
            await updateTriggerAuditResult({ data: { id, win: true } });
            setAuditIds(prev => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
            fetchBlockStats();
          }
        });
      }

      // Marcar LOSS se passou da janela (horário alvo + 2 min)
      Object.entries(auditIds).forEach(async ([key, id]) => {
        const signalTime = parseInt(key.split('-')[1]);
        if (nowMs > signalTime + 120000) {
          console.log(`[AUDITORIA] LOSS detectado para sinal em ${fmtClock(new Date(signalTime))}`);
          await updateTriggerAuditResult({ data: { id, win: false } });
          setAuditIds(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          fetchBlockStats();
        }
      });
    }

    // Alertas de Segurança ("possível rec")
    const recAlerts = buildRecAlerts(rows);
    const activeAlerts = recAlerts.filter((alert: RecAlert) => {
      const diff = (now.getTime() - alert.triggerAt.getTime()) / 60000;
      return diff >= 0 && diff <= alert.duration;
    });

    // Dispara evento global para o SinaisSection alternar para "Rodadas Atuais"
    window.dispatchEvent(new CustomEvent('switch-audit-filter', { detail: 'hoje' }));

    const byTime = new Map<
      number,
      { 
        values: number[]; 
        analyses: Set<number>; 
        pct: number; 
        label: string; 
        sources: Array<{ analysis: number; value: number }>; 
        isHighTendency: boolean; 
        isPossibleRec: boolean;
        isGreenSeal?: boolean;
        triggerAt: Date;
      }
    >();

    const confluenciaIds = [8, 9, 10, 11, 12, 13, 217, 218, 219, 221, 20711];

    for (const item of active) {
      const isConfluenceGatilho = confluenciaIds.includes(item.analysis);
      const isMainAnalysis = [1, 2, 3, 4, 5, 6, 7].includes(item.analysis);

      let targetMinutes = 0;
      let displayPct = 0;
      let displayLabel = "";

      if (isConfluenceGatilho) {
        if ([8, 9, 10, 11, 12, 13].includes(item.analysis)) {
          targetMinutes = item.open.gaps[0] || 0;
          displayPct = 100;
        } else {
          targetMinutes = 1;
          displayPct = 100;
        }
        displayLabel = targetMinutes.toString();
      } else if (isMainAnalysis) {
        const hist = engine[item.analysis].filter(c => c.value === item.value).slice(-6);
        if (hist.length < MIN_GATILHOS) continue;
        const top1 = computeTop(hist, 1)[0];
        if (!top1) continue;
        if (top1.pct < MIN_ASSERTIVIDADE_TOP1) continue;
        
        targetMinutes = top1.m;
        displayPct = top1.pct;
        displayLabel = targetMinutes.toString();
      } else {
        continue;
      }

      const at = addMinutes(item.open.triggerAt, targetMinutes);
      if (at.getTime() <= now.getTime()) continue; 
      const t = at.getTime();

      const isTendency = isConfluenceGatilho ? true : checkHighTendency(engine[item.analysis], item.value);
      const isPossibleRec = activeAlerts.some((alert: RecAlert) => {
        const signalTime = at.getTime();
        const alertStart = alert.triggerAt.getTime();
        const alertEnd = alertStart + alert.duration * 60000;
        return signalTime >= alertStart && signalTime <= alertEnd;
      });

      const cur = byTime.get(t);
      if (!cur) {
        byTime.set(t, { 
          values: [item.value], 
          analyses: new Set([item.analysis]),
          pct: displayPct, 
          label: displayLabel,
          sources: [{ analysis: item.analysis, value: item.value }],
          isHighTendency: isTendency,
          isPossibleRec,
          triggerAt: item.open.triggerAt
        });
      } else {
        if (!cur.values.includes(item.value)) cur.values.push(item.value);
        cur.analyses.add(item.analysis);
        cur.sources.push({ analysis: item.analysis, value: item.value });
        if (isTendency) cur.isHighTendency = true;
        if (isPossibleRec) cur.isPossibleRec = true;
        if (displayPct > cur.pct) {
          cur.pct = displayPct;
          cur.label = displayLabel;
        }
      }
    }
    const finalMode1: Mode1Signal[] = [];

    for (const [t, info] of Array.from(byTime.entries()).sort((a: [number, any], b: [number, any]) => a[0] - b[0])) {
      const entryDate = new Date(t);
      const values = info.values.slice().sort((a: number, b: number) => a - b);
      const isTop1 = info.analyses.has(1);
      const top5Analyses = [2, 3, 4, 5];
      const hasTop5 = top5Analyses.some(a => info.analyses.has(a));
      const confluenceCount = info.analyses.size;

      const isRare = isTop1 && Array.from(byTime.keys()).some(otherT => 
        otherT !== t && 
        Math.abs(otherT - t) <= 60000 && 
        byTime.get(otherT)?.analyses.has(1)
      );

      const signalKey = `m1-${t}`;
      const currentPeak = peakStates[signalKey] || 0;
      const newPeak = Math.max(currentPeak, confluenceCount);
      
      if (newPeak > currentPeak) {
        setPeakStates(prev => ({ ...prev, [signalKey]: newPeak }));
      }

      const signal: Mode1Signal = {
        key: signalKey,
        title: `Análise ${values.join(" + ")}`,
        at: entryDate,
        pct: info.pct,
        label: info.label,
        analysisCount: confluenceCount,
        peakAnalysisCount: newPeak,
        sources: info.sources,
        isHighTendency: info.isHighTendency,
        isPossibleRec: info.isPossibleRec,
        isTop1,
        isTop5Confluence: hasTop5,
        isSuperSignal: confluenceCount >= 4,
        isRare
      };

      // Auditoria: Salvar se for novo
      if (!auditIds[signalKey]) {
        (async () => {
          try {
            let category = 'top5';
            if (isRare) category = 'raro';
            else if (isTop1 && !hasTop5) category = 'isolado';
            else if (isTop1 && hasTop5) category = 'top1_top5';

            const confluenceStr = Array.from(info.analyses).map(a => `A${a}`).join(', ');

            const { data: res } = await saveTriggerAudit({ 
              data: {
                gatilho: confluenceStr,
                horario_base: fmtClock(new Date(t - 60000)),
                horario_alvo: fmtClock(entryDate),
                category,
                analysis_count: newPeak,
                confluences: confluenceStr
              }
            }) as any;
            
            if (res?.id) {
              setAuditIds(prev => ({ ...prev, [signalKey]: res.id }));
            }
          } catch (e) {
            console.error("Erro ao salvar auditoria:", e);
          }
        })();
      }

      finalMode1.push(signal);
    }

    setMode1(finalMode1);
    
    setSections({
      top1Confluence: finalMode1.filter(s => s.isRare),
      top1Isolated: finalMode1.filter(s => s.isTop1 && !s.isTop5Confluence && !s.isRare),
      top1Top5: finalMode1.filter(s => s.isTop1 && s.isTop5Confluence && !s.isRare),
      top5Only: finalMode1.filter(s => !s.isTop1 && s.isTop5Confluence)
    });


    const usedTimes = new Set<number>(finalMode1.map((s: Mode1Signal) => s.at.getTime()));

    // ---- Modo 2: Estratégia de Coincidência ----
    type Proj = { analysis: number; value: number; pct: number; top5: boolean };
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
          analysis: item.analysis,
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
      
      const isHighTendency = projs.some(p => checkHighTendency(engine[p.analysis], p.value));

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

    // ---- Level Elevation, Unification and Proximity Filtering ----
    const rawUnifiedM1: Mode1Signal[] = [];
    const sortedM1 = Array.from(byTime.entries()).sort((a: [number, any], b: [number, any]) => a[0] - b[0]);
    
    for (let i = 0; i < sortedM1.length; i++) {
      const [t, info]: [number, any] = sortedM1[i];
      const next1 = sortedM1[i + 1];
      const next2 = sortedM1[i + 2];
      
      const isConsecutive3 = next1 && next2 && 
        Math.abs(next1[0] - t) <= 60000 && 
        Math.abs(next2[0] - next1[0]) <= 60000;
      
      const isConsecutive2 = !isConsecutive3 && next1 && 
        Math.abs(next1[0] - t) <= 60000;

      if (isConsecutive3) {
        const middleTime = next1[0];
        const combinedSources = [...info.sources, ...next1[1].sources, ...next2[1].sources];
        const combinedAnalyses = new Set([...info.analyses, ...next1[1].analyses, ...next2[1].analyses]);
        const maxPct = Math.max(info.pct, next1[1].pct, next2[1].pct);
        
        rawUnifiedM1.push({
          key: `m1-c3-${middleTime}`,
          title: `Supremo · ${info.values.join("+")}`,
          at: new Date(middleTime),
          pct: maxPct,
          label: info.label,
          analysisCount: combinedAnalyses.size + 4,
          sources: combinedSources,
          isHighTendency: info.isHighTendency || next1[1].isHighTendency || next2[1].isHighTendency,
          isTop1: combinedAnalyses.has(1),
          isTop5Confluence: [2, 3, 4, 5].some(a => combinedAnalyses.has(a)),
          isSuperSignal: true
        });
        i += 2;
      } else if (isConsecutive2) {
        const best = info.pct >= next1[1].pct ? { t, info } : { t: next1[0], info: next1[1] };
        const combinedSources = [...info.sources, ...next1[1].sources];
        const combinedAnalyses = new Set([...info.analyses, ...next1[1].analyses]);
        
        rawUnifiedM1.push({
          key: `m1-c2-${best.t}`,
          title: `Confluência · ${best.info.values.join("+")}`,
          at: new Date(best.t),
          pct: best.info.pct,
          label: best.info.label,
          analysisCount: combinedAnalyses.size + 1,
          sources: combinedSources,
          isHighTendency: info.isHighTendency || next1[1].isHighTendency,
          isTop1: combinedAnalyses.has(1),
          isTop5Confluence: [2, 3, 4, 5].some(a => combinedAnalyses.has(a)),
          isSuperSignal: (combinedAnalyses.size + 1) >= 4
        });
        i += 1;
      } else {
        rawUnifiedM1.push({
          key: `m1-${t}`,
          title: `Análise ${info.values.join(" + ")}`,
          at: new Date(t),
          pct: info.pct,
          label: info.label,
          analysisCount: info.analyses.size,
          sources: info.sources,
          isHighTendency: info.isHighTendency,
          isTop1: info.analyses.has(1),
          isTop5Confluence: [2, 3, 4, 5].some(a => info.analyses.has(a)),
          isSuperSignal: info.analyses.size >= 4
        });
      }
    }

    // FILTRO DE VIZINHANÇA PARA MINUTOS SEGUIDOS (Deduplicação/Unificação)
    const unifiedM1: Mode1Signal[] = [];
    const sortedRawUnified = [...rawUnifiedM1].sort((a, b) => a.at.getTime() - b.at.getTime());
    
    for (let i = 0; i < sortedRawUnified.length; i++) {
      const current = sortedRawUnified[i];
      const next = sortedRawUnified[i + 1];
      
      const isCurrentHighConfluence = current.analysisCount >= 4;
      const isNextHighConfluence = next && next.analysisCount >= 4;
      
      // Regra 2: Se existirem dois ou mais sinais Top 1 com diferença de até 2 minutos entre si
      const diffMin = next ? Math.abs(next.at.getTime() - current.at.getTime()) / 60000 : 999;
      
      if (next && diffMin <= 2) {
        console.log(`[FILTRO VIZINHANÇA] Sinais em ${fmtClock(current.at)} e ${fmtClock(next.at)} detectados -> Unificando.`);
        
        // Prioridade: Maior confluência (analysisCount)
        if (current.analysisCount >= next.analysisCount) {
          unifiedM1.push({
            ...current,
            isRare: current.analysisCount >= 4,
            key: `unified-${current.key}-${next.key}`
          });
        } else {
          unifiedM1.push({
            ...next,
            isRare: next.analysisCount >= 4,
            key: `unified-${current.key}-${next.key}`
          });
        }
        i++; // Pula o próximo já que foi unificado
      } else {
        unifiedM1.push(current);
      }
    }

    // Secondary Verification Logic (Simplificado - sem selo azul/verde)
    const secondaryProjections = new Map<number, Set<number>>();
    for (const item of (secondaryActive as any)) {
      const hist = engine[item.analysis].filter((c: any) => c.value === item.value).slice(-6);
      if (hist.length < 6) continue;
      const top1 = computeTop(hist, 1)[0];
      if (!top1) continue;
      const at = addMinutes(item.open.triggerAt, top1.m).getTime();
      if (!secondaryProjections.has(at)) secondaryProjections.set(at, new Set());
      secondaryProjections.get(at)!.add(item.value);
    }

    // Badge "Sinal RARO" reservada para analysisCount >= 4 (Super Sinal ou Confluência Suprema)
    const isRareTime = (time: number) => {
      return unifiedM1.some(s => s.at.getTime() === time && s.analysisCount >= 4);
    };

    const finalM1 = unifiedM1.map(s => {
      const t = s.at.getTime();
      const isRare = isRareTime(t);
      return { ...s, isRare };
    });

    // APLICAR REGRA DE FILTRO: 
    // - Mostrar apenas se for Análise Principal (A1-A7) fortalecida (sources contêm 1-7)
    // - OU se for Super Sinal (analysisCount >= 4)
    const filteredM1 = finalM1.filter(s => {
      const hasMainAnalysis = s.sources.some(src => src.analysis >= 1 && src.analysis <= 7);
      const isSuperSignal = s.analysisCount >= 4;
      return hasMainAnalysis || isSuperSignal;
    });

    setMode1(filteredM1);


    // Organizar nas 4 Seções Hierárquicas
    const top1Confluence: Mode1Signal[] = [];
    const top1Isolated: Mode1Signal[] = [];
    const top1Top5: Mode1Signal[] = [];
    const top5Only: Mode1Signal[] = [];

    filteredM1.forEach(s => {
      const hasTop1 = s.isTop1;
      const confluenceCount = s.analysisCount;
      const hasTop5 = s.isTop5Confluence;

      if (hasTop1 && (s.isRare || confluenceCount >= 4)) {
        top1Confluence.push(s);
      } else if (hasTop1 && hasTop5) {
        top1Top5.push(s);
      } else if (hasTop1) {
        top1Isolated.push(s);
      } else if (confluenceCount >= 2) {
        top5Only.push(s);
      }
    });

    setSections({ top1Confluence, top1Isolated, top1Top5, top5Only });

  }, [active, engine, rows]);

  // Alertas de Recuperação "possível rec"
  const activeRecAlerts = useMemo(() => {
    const alerts: Array<{ type: string; start: number; end: number }> = [];
    const now = new Date().getTime();

    // Procurar gatilhos no histórico recente (últimas 20 pedras para garantir cobertura da janela)
    const recent = rows.slice(-20);
    for (let i = 1; i < recent.length; i++) {
      const p1 = Number(recent[i - 1].roll);
      const p2 = Number(recent[i].roll);
      const dt = parseUtcDate(recent[i].created_at).getTime();

      // Gatilho 7-14: 14 min
      if (p1 === 7 && p2 === 14) alerts.push({ type: "7-14", start: dt, end: dt + 14 * 60000 });
      // Gatilho 4-7: 9 min
      if (p1 === 4 && p2 === 7) alerts.push({ type: "4-7", start: dt, end: dt + 9 * 60000 });
      // Gatilho 5-14: 14 min
      if (p1 === 5 && p2 === 14) alerts.push({ type: "5-14", start: dt, end: dt + 14 * 60000 });
    }
    return alerts.filter(a => a.end > now);
  }, [rows]);


  // Auto-generate triggers
  useEffect(() => {
    if (active.length > 0 && !loading) {
      generate();
    }
  }, [active.length, loading, generate]);


  useEffect(() => {
    if (rows.length > 0 && !loading && mode1 && mode2) {
      const syncSignals: any[] = [
        ...mode1.map(s => ({
          key: s.key,
          time: fmtClock(s.at),
          pct: s.pct,
          label: s.label,
          confluence: s.sources.map(src => `A${src.analysis}·${src.value}`).join(", "),
          medal: getMedalStyles(s.analysisCount)?.label,
          entryDate: s.at,
          outcome: "pending",
           isHighTendency: s.isHighTendency,
           isRare: s.isRare
         })),
         ...mode2.map(s => ({
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
    }
  }, [rows, loading, mode1, mode2]);


  const renderSignalCard = (s: Mode1Signal) => {
    const medal = getMedalStyles(s.peakAnalysisCount);
    return (
      <motion.div
        key={s.key}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <Card
          title={medal.label}
          subtitle={fmtClock(s.at)}
          isRare={s.isRare}
          outcome={s.outcome}
          className={cn("group relative border-2 transition-all duration-500 hover:scale-[1.02]", medal.classes)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ResultCircle color="white" pulse={!s.outcome || s.outcome === "pending"} />
              </div>
              <div>
                <div className="text-2xl font-black text-white font-outfit leading-none">{fmtClock(s.at)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Horário Alvo</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-primary font-outfit">{s.pct.toFixed(0)}%</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-tighter font-bold">Assertividade</div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-1 border-t border-white/5 pt-4">
            {s.sources.map((src, i) => (
              <span key={i} className={cn("rounded-full px-2 py-0.5 text-[8px] font-black border uppercase tracking-widest", medal.badge)}>
                A{src.analysis}·{src.value}
              </span>
            ))}
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <Card className="glass-card !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] bg-white/[0.02] px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white font-outfit uppercase tracking-tight">Painel de Inteligência</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Motor Preditivo · {currentBlockLabel}</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadReport}
          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white transition-all hover:bg-white/10 active:scale-95 border border-white/10"
        >
          <Download className="h-3.5 w-3.5" />
          RELATÓRIO 24H
        </button>
      </div>

      <div className="p-6 space-y-12">
        {/* SEÇÃO 1 */}
        <div className="space-y-6">
          <SectionHeader 
            icon={<Sparkles className="h-5 w-5 text-purple-400" />}
            title="💎 TOP 1 + CONFLUÊNCIA (SINAIS RAROS)"
            subtitle="2+ projeções TOP 1 convergindo ou confluência suprema."
            stats={blockStats['raro']}
            recAlerts={activeRecAlerts}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sections.top1Confluence.map(s => renderSignalCard(s))}
            </AnimatePresence>
            {sections.top1Confluence.length === 0 && <EmptyState />}
          </div>
        </div>

        {/* SEÇÃO 2 */}
        <div className="space-y-6">
          <SectionHeader 
            icon={<Target className="h-5 w-5 text-red-500" />}
            title="🎯 TOP 1 ISOLADO"
            subtitle="Análises individuais de alta precisão sem confluência externa."
            stats={blockStats['isolado']}
            recAlerts={activeRecAlerts}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sections.top1Isolated.map(s => renderSignalCard(s))}
            </AnimatePresence>
            {sections.top1Isolated.length === 0 && <EmptyState />}
          </div>
        </div>

        {/* SEÇÃO 3 */}
        <div className="space-y-6">
          <SectionHeader 
            icon={<Layers className="h-5 w-5 text-yellow-500" />}
            title="⚡️ TOP 1 + CONFLUÊNCIA TOP 5"
            subtitle="Ponto de convergência entre Análise Principal e Secundárias."
            stats={blockStats['top1_top5']}
            recAlerts={activeRecAlerts}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sections.top1Top5.map(s => renderSignalCard(s))}
            </AnimatePresence>
            {sections.top1Top5.length === 0 && <EmptyState />}
          </div>
        </div>

        {/* SEÇÃO 4 */}
        <div className="space-y-6">
          <SectionHeader 
            icon={<Cpu className="h-5 w-5 text-blue-400" />}
            title="📊 CONFLUÊNCIA TOP 5"
            subtitle="Cruzamento técnico apenas entre análises secundárias (Top 2-5)."
            stats={blockStats['top5']}
            recAlerts={activeRecAlerts}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sections.top5Only.map(s => renderSignalCard(s))}
            </AnimatePresence>
            {sections.top5Only.length === 0 && <EmptyState />}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({ icon, title, subtitle, stats, recAlerts }: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  stats?: { signals: number, wins: number, reds: number, pct: number };
  recAlerts: any[];
}) {
  const activeRec = recAlerts.length > 0 ? recAlerts[0] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-black text-white font-outfit uppercase tracking-wider">{title}</h3>
        </div>
        {stats && (
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
            {stats.signals} SINAIS | ASSERTIVIDADE: <span className="text-emerald-400">{stats.pct.toFixed(0)}%</span> ({stats.wins}W/{stats.reds}R)
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground font-medium">{subtitle}</p>
      
      {activeRec && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] flex items-center gap-2 mt-1 animate-pulse"
        >
          <span>⚠️ Possível REC ativo até às {fmtClock(new Date(activeRec.end))}</span>
        </motion.div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full py-8 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Aguardando Projeção...</div>
    </div>
  );
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

