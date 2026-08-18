import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { SinaisTabs, AnalysesTab } from "@/components/sections/SinaisTabs";

import {
  Plus,
  ChevronDown,
  Radio,
  PlusCircle,
  Cpu,
  Upload,
  Power,
  ShieldCheck,
  Trash2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/double/Card";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { blazeSupabase } from "@/integrations/supabase/blaze-client";
import { ResultCircle } from "@/components/double/ResultCircle";
import { colorOf, fmtTime, type Color } from "@/components/double/types";
import { setSignals, getRobotEnabled, setRobotEnabled, subscribeRobot, getPredictiveSignals, subscribePredictive, type PredictiveSignal } from "@/lib/signalsStore";
import { CheckCircle2 } from "lucide-react";

import { BlazeRoulette } from "@/components/double/BlazeRoulette";
import { PredictiveSignals } from "@/components/double/PredictiveSignals";


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
  manual?: boolean;
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

// YYYY-MM-DD em SP.
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
  // Returns empty to avoid duplication as manual signals handle auditing
  return [];
}

export default function SinaisSection() {
  const [results, setResults] = useState<Result[]>([]);
  const [tick, setTick] = useState(0);
  const [resultsForValidation, setResultsForValidation] = useState<Result[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [robotOn, setRobotOn] = useState(getRobotEnabled());
  const [manualSignals, setManualSignals] = useState<Signal[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [predictiveList, setPredictiveList] = useState<PredictiveSignal[]>(getPredictiveSignals());
  const [menuOpen, setMenuOpen] = useState(false);
  const [formDate, setFormDate] = useState(() => spYmd());
  const [formTime, setFormTime] = useState("");
  const [formEntry, setFormEntry] = useState<"1" | "2">("1");
  const [formColor, setFormColor] = useState<Color>("red");

  const [auditFilter, setAuditFilter] = useState<"hoje" | "geral">("geral");
  const [topStrategies, setTopStrategies] = useState<Array<{ analise: string, wins: number, total: number, pct: number }>>([]);
  const [auditStats, setAuditStats] = useState<{
    wins: number;
    losses: number;
    pct: number;
    tendency: boolean;
    analysis: string;
    total: number;
  }>({ wins: 0, losses: 0, pct: 0, tendency: false, analysis: "---", total: 0 });

  const [activeTab, setActiveTab] = useState<'sinais' | 'analises'>('sinais');




  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const table = 'historico_sinais_audit';
        
        // 1. Fetch statistics for the current filter
        let statsQuery = supabase.from(table).select("*");
        if (auditFilter === "hoje") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          statsQuery = statsQuery.gte("created_at", today.toISOString());
        }
        
        const { data: statsData, error: statsError } = await statsQuery.order("created_at", { ascending: false });
        
        if (!statsError && statsData) {
          const wins = statsData.filter(r => r.status && r.status.startsWith("WIN")).length;
          const losses = statsData.filter(r => r.status === "LOSS").length;
          const total = wins + losses;
          const pct = total > 0 ? (wins / total) * 100 : 0;
          const latest = statsData[0];

          setAuditStats({
            wins,
            losses,
            total,
            pct,
            analysis: latest?.analise || "Confluência · Top 1",
            tendency: statsData.slice(0, 5).filter(r => r.status && r.status.startsWith("WIN")).length >= 4,
          });
        }

        // 2. Fetch Top Strategies (Always from total history for "Geral" or filtered for "Hoje")
        const { data: allData, error: allErr } = await supabase.from(table).select("analise, status, minuto_alvo");
        if (!allErr && allData) {
          const strategyMap = new Map<string, { wins: number, total: number }>();
          const today = spYmd();
          const startLimit = new Date(spToUtcIso(today, "00:00")).getTime();
          
          allData.forEach(r => {
            if (!r.analise || !r.status || r.status === 'PENDENTE') return;
            
            const itemDate = new Date(r.minuto_alvo || 0).getTime();
            if (itemDate < startLimit) return;
            
            const cur = strategyMap.get(r.analise) || { wins: 0, total: 0 };
            cur.total++;
            if (r.status.startsWith('WIN')) cur.wins++;
            strategyMap.set(r.analise, cur);
          });


          const sorted = Array.from(strategyMap.entries())
            .map(([analise, stats]) => ({
              analise,
              wins: stats.wins,
              total: stats.total,
              pct: (stats.wins / stats.total) * 100
            }))
            .sort((a, b) => b.pct - a.pct || b.total - a.total)
            .slice(0, 5);
          
          setTopStrategies(sorted);
        }
      } catch (e) {
        console.error("fetchAudit execution error:", e);
      }
    };
    void fetchAudit();
    const interval = setInterval(fetchAudit, 10000);
    return () => clearInterval(interval);
  }, [auditFilter]);

  useEffect(() => {
    const handleSwitch = (e: any) => {
      setAuditFilter("hoje");
    };


    window.addEventListener('switch-audit-filter', handleSwitch);
    return () => window.removeEventListener('switch-audit-filter', handleSwitch);
  }, []);


  // Re-render frequente para avaliar a margem de 1 minuto e remover expirados.
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 5_000);
    return () => clearInterval(t);
  }, []);

  // Busca as rodadas recentes e monta os sinais a partir dos brancos do dia.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const today = spYmd();
      const start = new Date(spToUtcIso(today, "00:00")).getTime() - 30 * 60_000;
      const end = spToUtcIso(today, "23:59:59.999");
      const { data, error } = await (blazeSupabase as any)
        .from("blaze_results")
        .select("id, color, roll, created_at")
        .gte("created_at", new Date(start).toISOString())
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error || !alive) return;
      const rows = data as any[];
      const mapped = rows.map(rowToResult);
      setResults(mapped);
      setResultsForValidation(mapped);
    };
    void load();

    const channel = supabase
      .channel("sinais_results")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blaze_results" },
        (payload) => {
          const r = payload.new as { id: number; color: string; roll: string; created_at: string };
          const next = rowToResult(r);
          setResultsForValidation(prev => [next, ...prev].slice(0, 1000));
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
    const auto = buildSignals(results);
    const manual = manualSignals;
    return [...auto, ...manual].sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
  }, [results, tick, manualSignals]);

  const openAdd = () => {
    setMenuOpen(false);
    setFormDate(spYmd());
    setFormTime("");
    setFormEntry("1");
    setFormColor("red");
    setAddOpen(true);
  };

  const saveManual = () => {
    if (!formDate || !formTime) return;
    const iso = spToUtcIso(formDate, formTime);
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    const entry = Number(formEntry);
    setManualSignals((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        time: fmtTime(iso),
        date: fmtDateShort(d),
        entry,
        baseTime: fmtTime(iso),
        entryDate: d,
        outcome: "pending",
        color: formColor,
        manual: true,
        targetIso: iso,

      },
    ]);
    setAddOpen(false);
  };


  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleStatus = (id: string) =>
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const removeSignal = (id: string) => setDisabled((prev) => new Set(prev).add(id));

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
    const update = () => {
      const raw = getPredictiveSignals();
      if (!Array.isArray(raw)) return;
      const now = Date.now();
      
      const validated = raw.map(s => {
        try {
          if (!s.entryDate) return s;
          const entryTime = typeof s.entryDate === 'string' ? new Date(s.entryDate).getTime() : (s.entryDate instanceof Date ? s.entryDate.getTime() : new Date(s.entryDate).getTime());
          
          if (Number.isNaN(entryTime)) return s;

          if (s.outcome && s.outcome !== "pending") return s;

          // Janela de ±1 minuto (Anterior -1, Exato 0, Posterior +1)
          const rangeStart = entryTime - 60_000;
          const rangeEnd = entryTime + 60_000;

          const matchedResult = (resultsForValidation || []).find(r => {
            if (!r || r.color !== "white") return false;
            const rt = new Date(r.createdAt).getTime();
            // Verifica se está dentro da janela de 3 minutos (±1 min do alvo)
            return rt >= rangeStart && rt <= rangeEnd && rt <= now;
          });

          if (matchedResult) {
            const status = "WIN"; 
            const res = { ...s, outcome: "green" as const, resultTime: fmtTime(matchedResult.createdAt), label: status, completedAt: now };
            
            const table = 'historico_sinais_audit';
            const isGreenSeal = !!(s as any).isGreenSeal;
            const tag = isGreenSeal ? `SOMA_${s.confluence.split('·')[1]}` : (((s as any).isGreenSeal === false && (s as any).greenSealAssertivity !== undefined) ? `SOMA_${s.confluence.split('·')[1]}` : null);
            
            void supabase.from(table).insert({
              analise: s.confluence || "Analise",
              tipo_sinal: isGreenSeal ? "Confirmação" : (s.label === "Confluência" ? "Confluência" : "Top 1 Isolado"),
              nivel: s.medal || 'Top 1 Isolado',
              predicao_horario: s.time,
              status: status,
              minuto_alvo: new Date(entryTime).toISOString(),
              is_verified: s.isVerified ? (true as any) : (false as any),
              tag: tag || undefined,
              pedra_anterior: (isGreenSeal || tag) ? parseInt(s.label) : undefined
            } as any);
            return res;
          }

          // Só marca RED se a janela de ±1 minuto expirar completamente
          if (now > rangeEnd) {
            const res = { ...s, outcome: "red" as const, label: "LOSS", completedAt: now };
            const table = 'historico_sinais_audit';
            const isGreenSeal = !!(s as any).isGreenSeal;
            const tag = isGreenSeal ? `SOMA_${s.confluence.split('·')[1]}` : (((s as any).isGreenSeal === false && (s as any).greenSealAssertivity !== undefined) ? `SOMA_${s.confluence.split('·')[1]}` : null);

            void supabase.from(table).insert({
              analise: s.confluence || "Analise",
              tipo_sinal: isGreenSeal ? "Confirmação" : (s.label === "Confluência" ? "Confluência" : "Top 1 Isolado"),
              nivel: s.medal || 'Top 1 Isolado',
              predicao_horario: s.time,
              status: 'LOSS',
              minuto_alvo: new Date(entryTime).toISOString(),
              is_verified: s.isVerified ? (true as any) : (false as any),
              tag: tag || undefined,
              pedra_anterior: (isGreenSeal || tag) ? parseInt(s.label) : undefined
            } as any);
            return res;
          }

          
          return s;
        } catch (e) {
          console.error("Error validating signal:", e, s);
          return s;
        }
      });


      // Expiração e Limpeza Automática (1 Minuto após carimbo)
      const visible = validated.filter(s => {
        try {
          if (!s.outcome || s.outcome === "pending") return true;
          if (!s.completedAt) return true;
          return now < s.completedAt + 60_000;
        } catch {
          return true;
        }
      });


      setPredictiveList(visible);
    };

    update();
    const sub = subscribePredictive(update);
    const interval = setInterval(update, 5000);
    return () => {
      sub();
      clearInterval(interval);
    };
  }, [resultsForValidation]);

  useEffect(() => {
    const sub = subscribeRobot(() => {
      setRobotOn(getRobotEnabled());
    });
    return sub;
  }, []);

  useEffect(() => {
    setRobotEnabled(robotOn);
    if (!robotOn) {
      setSignals([]);
      return;
    }
    setSignals(visibleForStore);
  }, [visibleForStore, robotOn]);



  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-[#090909] px-4 py-6 sm:px-6 sm:py-8 space-y-8 w-full">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF1F3D]/10 text-[#FF1F3D] shadow-[0_0_15px_rgba(255,31,61,0.1)]">
              <Radio className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white font-outfit uppercase">
              Feed de Sinais
            </h1>
          </div>
        </div>
        
        <PredictiveSignals />
      </div>

      <div className="space-y-8">

        {/* Assertividade topo */}
        <div className="flex w-full flex-wrap items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl">
          <div>
            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1 font-outfit">
              Histórico Operacional (4h)
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white font-outfit">{auditStats.pct.toFixed(1)}%</span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Assertividade</span>
            </div>
          </div>
          
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Acertos</div>
              <div className="text-xl font-black text-emerald-400 font-outfit">{auditStats.wins}W</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Erros</div>
              <div className="text-xl font-black text-red-500 font-outfit">{auditStats.losses}L</div>
            </div>
            <div className="text-center border-l border-white/10 pl-8">
              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Total</div>
              <div className="text-xl font-black text-white font-outfit">{auditStats.total}</div>
            </div>
          </div>
        </div>
        </div>

        <div className="flex items-center gap-3">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button className="premium-btn text-white rounded-full h-11 px-6 font-bold uppercase tracking-widest text-[11px] font-outfit">
                <Plus className="h-4 w-4" />
                Adicionar
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2 bg-surface border-border">
              <div className="px-2 pt-2 pb-1 text-[10px] tracking-widest text-red-400 font-mono">
                ● CRIAR
              </div>
              <MenuAction onClick={openAdd} icon={<PlusCircle className="h-5 w-5 text-red-400" />} title="Novo Sinal" desc="Adicionar um sinal manual" />
              <MenuAction icon={<Cpu className="h-5 w-5 text-amber-400" />} title="Estratégia" desc="Criar bot com padrão de cores" />
              <div className="px-2 pt-3 pb-1 text-[10px] tracking-widest text-red-400 font-mono">
                ● IMPORTAR
              </div>
              <MenuAction icon={<Upload className="h-5 w-5 text-muted-foreground" />} title="Importar Lista" desc="Colar vários sinais de uma vez" />
            </PopoverContent>
          </Popover>


          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-2.5 backdrop-blur-md">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Power className="h-5 w-5" />
            </div>
            <div className="text-xs leading-tight">
              <div className="text-[#9CA3AF] font-bold tracking-widest text-[9px] uppercase">
                ROBÔ · SINAIS
              </div>
              <div className="font-black text-emerald-400 text-lg font-outfit">
                {robotOn ? "ACTIVE" : "STANDBY"}
              </div>
            </div>
            <Switch checked={robotOn} onCheckedChange={setRobotOn} />
          </div>
        </div>
      </div>



      {/* Lista de Sinais */}
      <Card className="glass-card !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between px-6 py-5 border-b border-white/[0.05] bg-white/[0.02] gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF1F3D]/10 text-[#FF1F3D] shadow-[0_0_15px_rgba(255,31,61,0.1)]">
              <Radio className="h-5 w-5" />
            </div>
            <h2 className="font-black text-xl text-white font-outfit uppercase tracking-tight">Painel de Auditoria</h2>
          </div>
          
          <div className="flex items-center gap-3">
             <Select defaultValue="hoje">
               <SelectTrigger className="w-[140px] h-9 text-[10px] font-black uppercase tracking-widest font-mono bg-black/40 border-white/10">
                 <SelectValue placeholder="Período" />
               </SelectTrigger>
               <SelectContent className="bg-surface border-border">
                 <SelectItem value="hoje">Hoje</SelectItem>
                 <SelectItem value="ontem">Ontem</SelectItem>
                 <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                 <SelectItem value="custom">Selecionar Data</SelectItem>
               </SelectContent>
             </Select>

            <div className="text-[11px] tracking-widest font-mono text-red-400 border border-red-500/40 rounded-full px-3 py-1">
              [ ● {visible.length + predictiveList.length} SINAIS ]
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
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
                        {(!s.outcome || s.outcome === "pending") && (
                          <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
                        )}
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white font-outfit leading-none">{s.time}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Horário Alvo</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-primary font-outfit">{s.pct.toFixed(0)}%</div>
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

                  {s.isHighTendency && !s.outcome && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[8px] font-black text-red-400 animate-pulse border border-red-500/30 uppercase">
                      🔥 Alta Tendência
                    </div>
                  )}
                </Card>
              ))}
            </AnimatePresence>
            
            {predictiveList.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Cpu className="h-6 w-6 text-white/20 animate-pulse" />
                </div>
                <h3 className="text-white font-bold mb-1 uppercase tracking-widest text-sm">Monitoramento Ativo</h3>
                <p className="text-muted-foreground text-[11px] max-w-[200px]">Aguardando ativação de novos gatilhos pelo motor preditivo...</p>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-white/5">
          <table className="w-full min-w-[720px]">
            <tbody>
              {visible.length > 0 && (
                <tr className="bg-white/[0.02]">
                  <td colSpan={6} className="px-4 py-3 text-[10px] font-black tracking-[0.3em] text-muted-foreground/40 uppercase font-outfit border-b border-white/[0.05]">
                    [ Histórico de Sinais Auditados ]
                  </td>
                </tr>
              )}
              {visible.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-white/[0.03] transition-colors ${
                    s.outcome === "green"
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                      : s.outcome === "red"
                        ? "bg-red-500/5 hover:bg-red-500/10"
                        : "hover:bg-white/[0.03]"
                  }`}
                >
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggleSelect(s.id)}
                    />
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-bold font-mono text-white">{s.time}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{s.date}</div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-3 py-1.5">
                      <ResultCircle color={s.color} size="sm" animate={false} />
                      <span className="text-xs font-bold text-white/90">
                        {s.color === "white" ? "Branco" : s.color === "red" ? "Vermelho" : "Preto"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-1 font-mono text-[10px] text-white/70">
                      {s.entry}ª · G{s.entry - 1}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div
                      className={`inline-flex items-center rounded-md px-3 py-1 font-mono text-[10px] font-black tracking-widest border ${
                        s.outcome === "green"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {s.outcome === "green" ? "WIN" : "LOSS"}
                      {s.resultTime ? ` · ${s.resultTime}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <button
                      onClick={() => removeSignal(s.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.05] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
                <PlusCircle className="h-5 w-5" />
              </div>
              Adicionar Sinal
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-widest text-muted-foreground font-mono">DATA</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-widest text-muted-foreground font-mono">HORÁRIO</Label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-widest text-muted-foreground font-mono">APOSTAR EM</Label>
              <Select value={formEntry} onValueChange={(v) => setFormEntry(v as "1" | "2")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1º resultado do minuto</SelectItem>
                  <SelectItem value="2">2º resultado do minuto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] tracking-widest text-muted-foreground font-mono">COR</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["red", "black", "white"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      formColor === c ? "border-red-500 bg-red-500/10" : "border-border bg-surface-2 hover:bg-surface"
                    }`}
                  >
                    <ResultCircle color={c} size="sm" animate={false} />
                    {c === "red" ? "Vermelho" : c === "black" ? "Preto" : "Branco"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={saveManual} className="bg-red-500 hover:bg-red-600 text-white">✓ Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>

  );
}

function MenuAction({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-2 text-left transition-colors">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 border border-border shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
