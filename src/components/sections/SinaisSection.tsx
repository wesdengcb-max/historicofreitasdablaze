import { useCallback, useEffect, useMemo, useState } from "react";
import { setPredictiveSignals, getRobotEnabled, setRobotEnabled, subscribeRobot, getPredictiveSignals, subscribePredictive, type PredictiveSignal } from "@/lib/signalsStore";
import { useSignalStatsStore } from "@/lib/signalStatsStore";
import { Radio, Power, Trash2, FileDown, Clock, Cpu } from "lucide-react";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { ResultCircle } from "@/components/double/ResultCircle";
import { colorOf, fmtTime, type Color } from "@/components/double/types";
import { AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/double/Card";
import { PredictiveSignals } from "@/components/double/PredictiveSignals";

type Result = {
  id: string;
  roll: number;
  color: Color;
  createdAt: string;
};

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

export default function SinaisSection() {
  const [resultsForValidation, setResultsForValidation] = useState<Result[]>([]);
  const [robotOn, setRobotOn] = useState(getRobotEnabled());
  const [predictiveList, setPredictiveList] = useState<PredictiveSignal[]>(getPredictiveSignals());
  const [auditFilter, setAuditFilter] = useState<'geral' | 'hoje'>('geral');
  const updateStats = useSignalStatsStore(state => state.updateStats);
  const getAssertivity = useSignalStatsStore(state => state.getAssertivity);
  const [strategyStats, setStrategyStats] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("blaze_results").select("*").order("created_at", { ascending: false }).limit(1000);
      if (data) setResultsForValidation(data.map(rowToResult));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const { data, error } = await supabase.rpc('get_strategy_stats', { lookback_hours: 24 });
      if (data) setStrategyStats(data.sort((a, b) => b.assertividade - a.assertividade).slice(0, 10));
    };
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const update = () => {
      const raw = getPredictiveSignals();
      if (!Array.isArray(raw)) return;
      const now = Date.now();
      
      const validated = raw.map(s => {
        try {
          if (!s.entryDate) return s;
          const entryTime = typeof s.entryDate === 'string' ? new Date(s.entryDate).getTime() : (s.entryDate instanceof Date ? s.entryDate.getTime() : new Date(s.entryDate).getTime());
          
          if (Number.isNaN(entryTime)) return s;

          if (s.outcome && s.outcome !== "pending") {
            if (s.completedAt && now - s.completedAt > 3 * 60_000) return null;
            return s;
          }

          if (now < entryTime + 2 * 60_000) return { ...s, outcome: "pending" as const };

          const rangeStart = entryTime - 60_000;
          const rangeEnd = entryTime + 60_000;

          const matchedResult = (resultsForValidation || []).find(r => {
            if (!r || r.roll !== 0) return false;
            const rt = new Date(r.createdAt).getTime();
            return rt >= rangeStart && rt <= rangeEnd;
          });

          if (matchedResult) {
            if (s.strategyKey) updateStats(s.strategyKey, "green");
            return { ...s, outcome: "green" as const, resultTime: fmtTime(matchedResult.createdAt), label: "WIN", completedAt: now };
          }
 
          if (now > rangeEnd + 60_000) {
            if (s.strategyKey) updateStats(s.strategyKey, "red");
            return { ...s, outcome: "red" as const, label: "LOSS", completedAt: now };
          }

          return s;
        } catch (e) { return s; }
      }).filter((s): s is PredictiveSignal => s !== null);
      
      setPredictiveList(validated);
      setPredictiveSignals(validated);
    };

    update();
    const sub = subscribePredictive(update);
    const interval = setInterval(update, 5000);

    const handleSwitchFilter = (e: any) => {
      if (e.detail === 'hoje') setAuditFilter('hoje');
    };
    window.addEventListener('switch-audit-filter', handleSwitchFilter);

    return () => { 
      sub(); 
      clearInterval(interval); 
      window.removeEventListener('switch-audit-filter', handleSwitchFilter);
    };
  }, [resultsForValidation]);

  // Estatísticas das Rodadas Atuais
  const activeStats = useMemo(() => {
    const finished = predictiveList.filter(s => s.outcome && s.outcome !== 'pending');
    const wins = finished.filter(s => s.outcome === 'green').length;
    const losses = finished.filter(s => s.outcome === 'red').length;
    const total = wins + losses;
    const pct = total > 0 ? (wins / total) * 100 : 100;
    return { wins, losses, pct };
  }, [predictiveList]);

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-[#090909] px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <Radio className="h-5 w-5 text-red-500" />
        <h1 className="text-4xl font-black tracking-tighter text-white font-outfit uppercase">Feed de Sinais</h1>
      </div>
      
      <PredictiveSignals />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {predictiveList.map((s, idx) => (
            <Card
              key={s.key}
              title={s.medal || "Sinal Preditivo"}
              subtitle={s.time}
              isRare={s.isRare}
              isGreenSeal={s.isGreenSeal}
              greenSealAssertivity={s.greenSealAssertivity}
              outcome={s.outcome}
              delay={idx * 0.05}
              className="group relative transition-all duration-500 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ResultCircle color="white" pulse={!s.outcome || s.outcome === "pending"} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white font-outfit leading-none">{s.time}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Horário Alvo</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-primary font-outfit">{(s.strategyKey ? getAssertivity(s.strategyKey) : s.pct).toFixed(0)}%</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-tighter font-bold">Assertividade</div>
                </div>
              </div>
              
              {s.confluence && (
                <div className="mt-4 flex flex-wrap gap-1 border-t border-white/5 pt-4">
                  {s.confluence.split(',').map((c, i) => (
                    <span key={i} className="rounded-full bg-white/5 px-2 py-0.5 text-[8px] font-black text-white/40 border border-white/5 uppercase tracking-widest">
                      {c.trim()}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-2.5 backdrop-blur-md">
          <Power className="h-5 w-5 text-emerald-500" />
          <div className="text-xs leading-tight">
            <div className="text-[#9CA3AF] font-bold tracking-widest text-[9px] uppercase">ROBÔ · SINAIS</div>
            <div className="font-black text-emerald-400 text-lg font-outfit">{robotOn ? "ACTIVE" : "STANDBY"}</div>
          </div>
          <Switch checked={robotOn} onCheckedChange={(v) => { setRobotOn(v); setRobotEnabled(v); }} />
        </div>
      </div>
    </div>
  );
}
