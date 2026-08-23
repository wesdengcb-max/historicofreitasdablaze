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
    
    // Inscrição em tempo real para re-render imediato
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blaze_results'
        },
        (payload) => {
          setResultsForValidation(prev => [rowToResult(payload.new as any), ...prev].slice(0, 1000));
        }
      )
      .subscribe();

    const interval = setInterval(load, 15000); // Polling de segurança menos frequente
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const { data, error } = await supabase.rpc('get_strategy_stats', { lookback_hours: 24 });
      if (data) setStrategyStats(data.sort((a: any, b: any) => b.assertividade - a.assertividade).slice(0, 10));
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

          // Se já está concluído, removemos da tela após 3 minutos
          if (s.outcome && s.outcome !== "pending") {
            if (s.completedAt && now - s.completedAt > 3 * 60_000) return null;
            return s;
          }

          // Janela de auditoria de 3 minutos: Horário -1, Exato, +1
          const rangeStart = entryTime - 60_000;
          const rangeEnd = entryTime + 60_000;

          // Se o tempo atual ainda não atingiu o final da janela (mais uma margem de segurança de processamento), mantém pendente
          if (now < rangeEnd + 30_000) {
            // Verificação em tempo real dentro da janela
            const matchedResult = (resultsForValidation || []).find(r => {
              if (!r || r.roll !== 0) return false;
              const rt = new Date(r.createdAt).getTime();
              return rt >= rangeStart && rt <= rangeEnd;
            });

            if (matchedResult) {
              if (s.strategyKey) updateStats(s.strategyKey, "green");
              return { ...s, outcome: "green" as const, resultTime: fmtTime(matchedResult.createdAt), label: "WIN", completedAt: now };
            }
            
            return { ...s, outcome: "pending" as const };
          }

          // Se passou da janela e não deu WIN, é LOSS
          if (s.strategyKey) updateStats(s.strategyKey, "red");
          return { ...s, outcome: "red" as const, label: "LOSS", completedAt: now };
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
      
      <div className="flex flex-col gap-6">
        {/* Card de Auditoria */}
        <div className="rounded-2xl border border-white/5 bg-[#0c0c0c] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Cpu className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white font-outfit">Painel de Auditoria</h3>
            </div>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setAuditFilter('geral')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${auditFilter === 'geral' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white/60'}`}
              >
                Visão Geral
              </button>
              <button 
                onClick={() => setAuditFilter('hoje')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${auditFilter === 'hoje' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white/60'}`}
              >
                Rodadas Atuais
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {auditFilter === 'geral' ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {strategyStats.length > 0 ? strategyStats.map((s, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter truncate">{s.analise}</span>
                    <span className="text-xl font-black text-white font-outfit">{s.assertividade.toFixed(0)}%</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-bold text-emerald-500">{s.wins}W</span>
                      <span className="text-[9px] font-bold text-red-500">{s.losses}L</span>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-4 text-center text-xs text-white/20 italic">Carregando ranking global...</div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-around py-2">
                <div className="text-center">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Assertividade Real</div>
                  <div className="text-4xl font-black text-white font-outfit">{activeStats.pct.toFixed(1)}%</div>
                </div>
                <div className="h-12 w-px bg-white/5" />
                <div className="text-center">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Placar (Hoje)</div>
                  <div className="flex items-baseline gap-2 justify-center">
                    <span className="text-3xl font-black text-emerald-500 font-outfit">{activeStats.wins}</span>
                    <span className="text-lg font-black text-white/20">/</span>
                    <span className="text-3xl font-black text-red-500 font-outfit">{activeStats.losses}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <PredictiveSignals />
      </div>

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
