
import { useEffect, useMemo, useState } from "react";
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
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { ResultCircle } from "@/components/double/ResultCircle";
import { colorOf, fmtTime, type Color } from "@/components/double/types";
import { setSignals, getRobotEnabled, setRobotEnabled, subscribeRobot, getPredictiveSignals, subscribePredictive, type PredictiveSignal } from "@/lib/signalsStore";
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

  const [auditFilter, setAuditFilter] = useState<"hoje" | "geral">("hoje");
  const [auditStats, setAuditStats] = useState<{
    wins: number;
    losses: number;
    pct: number;
    tendency: boolean;
    analysis: string;
    total: number;
  }>({ wins: 0, losses: 0, pct: 0, tendency: false, analysis: "---", total: 0 });

  useEffect(() => {
    const fetchAudit = async () => {
      let query = supabase.from("historico_sinais_audit").select("*");
      if (auditFilter === "hoje") {
        const today = spYmd();
        const start = spToUtcIso(today, "00:00");
        const end = spToUtcIso(today, "23:59:59.999");
        query = query.gte("created_at", start).lte("created_at", end);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error || !data) return;

      const wins = data.filter(r => r.status.startsWith("WIN")).length;
      const losses = data.filter(r => r.status === "LOSS").length;
      const total = data.length;
      const pct = total > 0 ? (wins / total) * 100 : 0;
      const latest = data[0];

      setAuditStats({
        wins,
        losses,
        total,
        pct,
        analysis: latest?.analise || "---",
        tendency: data.slice(0, 5).filter(r => r.status.startsWith("WIN")).length >= 4,
      });
    };
    void fetchAudit();
    const interval = setInterval(fetchAudit, 10000);
    return () => clearInterval(interval);
  }, [auditFilter]);


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
      const { data, error } = await supabase
        .from("blaze_results")
        .select("id, color, roll, created_at")
        .gte("created_at", new Date(start).toISOString())
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error || !alive) return;
      const rows = (data ?? []) as Array<{ id: number; color: string; roll: string; created_at: string }>;
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
      const now = Date.now();
      const WHITE_MARGIN_MS = 60_000;
      const MARGIN_MS = 2 * 60_000; // Janela de 2 minutos para margem
      const REMOVE_DELAY_MS = 3 * 60_000;

      const validated = raw.map(s => {
        if (!s.entryDate) return s;
        // Se já é um Date, usa direto. Se for string, parseia.
        const entryTime = typeof s.entryDate === 'string' ? new Date(s.entryDate).getTime() : (s.entryDate instanceof Date ? s.entryDate.getTime() : new Date(s.entryDate).getTime());
        const windowEnd = entryTime + WHITE_MARGIN_MS;

        if (s.outcome && s.outcome !== "pending") return s;

        const matchedExact = resultsForValidation.find(r => {
          if (r.color !== "white") return false;
          const rt = new Date(r.createdAt).getTime();
          return rt >= entryTime - 60_000 && rt <= entryTime + 60_000 && rt <= now;
        });

        if (matchedExact) {
          const res = { ...s, outcome: "green" as const, resultTime: fmtTime(matchedExact.createdAt), label: "WIN_DIRETO" };
          // Persist to audit table
          void supabase.from('historico_sinais_audit').insert({
            analise: s.confluence,
            tipo_sinal: s.label === "Confluência" ? "Confluência" : "Top 1 Isolado",
            nivel: s.medal || 'Top 1 Isolado',
            predicao_horario: s.time,
            status: 'WIN_DIRETO',
            minuto_alvo: (s.entryDate as any)?.toISOString()
          });
          return res;
        }

        const matchedMargin = resultsForValidation.find(r => {
          if (r.color !== "white") return false;
          const rt = new Date(r.createdAt).getTime();
          // TARGET ± 1 minuto
          return rt >= entryTime - 60_000 && rt <= entryTime + 60_000 && rt <= now;
        });

        if (matchedMargin) {
          const res = { ...s, outcome: "green" as const, resultTime: fmtTime(matchedMargin.createdAt), label: "WIN_VIZINHO" };
          // Persist to audit table
          void supabase.from('historico_sinais_audit').insert({
            analise: s.confluence,
            tipo_sinal: s.label === "Confluência" ? "Confluência" : "Top 1 Isolado",
            nivel: s.medal || 'Top 1 Isolado',
            predicao_horario: s.time,
            status: 'WIN_VIZINHO',
            minuto_alvo: (s.entryDate as any)?.toISOString()
          });
          return res;
        }

        if (now > entryTime + 60_000) {
          const res = { ...s, outcome: "red" as const, label: "LOSS" };
          // Persist to audit table in background if not already red
          if (s.outcome !== ("red" as any)) {
            void supabase.from('historico_sinais_audit').insert({
              analise: s.confluence,
              tipo_sinal: s.label === "Confluência" ? "Confluência" : "Top 1 Isolado",
              nivel: s.medal || 'Top 1 Isolado',
              predicao_horario: s.time,
              status: 'LOSS',
              minuto_alvo: (s.entryDate as any)?.toISOString()
            });
          }
          return res;
        }
        return s;
      }).filter(s => {
        if (!s.entryDate || !s.outcome || s.outcome === "pending") return true;
        const entryTime = new Date(s.entryDate).getTime();
        // Remove from UI after 3 minutes to keep list clean
        return now < entryTime + (3 * 60_000);
      });

      setPredictiveList(validated);
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
      {/* Resumo de Assertividade (Audit Dashboard) */}
      <Card className="glass-card !p-0 overflow-hidden border-primary/20 bg-primary/[0.02]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-outfit">
                Dashboard de Auditoria
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white font-outfit uppercase">
                  {auditStats.analysis}
                </h2>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Assertividade Binária
                </span>
                {auditStats.tendency && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 animate-pulse">
                      🔥 ALTA TENDÊNCIA
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-black/40 p-1 border border-white/5">
              <button
                onClick={() => setAuditFilter("hoje")}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  auditFilter === "hoje" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                )}
              >
                Rodadas Atuais
              </button>
              <button
                onClick={() => setAuditFilter("geral")}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  auditFilter === "geral" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                )}
              >
                Visão Geral
              </button>
            </div>
            <div className="h-8 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-4 px-2">
              <div className="text-right">
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Placar</div>
                <div className="text-xs font-black text-white font-mono">
                  <span className="text-emerald-400">{auditStats.wins}W</span>
                  <span className="mx-1 text-white/20">/</span>
                  <span className="text-red-400">{auditStats.losses}L</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
                <div className="text-right">
                  <div className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">Eficiência</div>
                  <div className="text-xl font-black text-primary font-outfit">
                    {auditStats.pct.toFixed(1)}%
                  </div>
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase vertical-lr tracking-tighter opacity-40">
                  {auditStats.total}Q
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Gerador de sinais preditivos */}
      <PredictiveSignals />

      {/* Top header */}
      <div className="flex w-full flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] tracking-[0.5em] text-[#FF1F3D] font-black font-outfit uppercase">
              [ TRANSMISSION · CONTROL ]
            </span>
          </div>
          <div className="flex items-center gap-3">
             <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF1F3D]/10 text-[#FF1F3D] shadow-[0_0_15px_rgba(255,31,61,0.1)]">
              <Radio className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white font-outfit uppercase">Sinais</h1>
          </div>
          <p className="mt-2 text-sm text-[#9CA3AF] font-medium">
            Gerencie sua lista baseada nos últimos 6 gatilhos e estratégias automáticas (limite 120 min / 14 tempos).
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Martingale: 3 níveis · ×2
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase font-mono tracking-widest">Auditoria Real-Time</span>
              <div className="flex gap-1">
                 <span className="text-[9px] font-bold text-emerald-400">WIN_DIRETO</span>
                 <span className="text-[9px] font-bold text-emerald-500">WIN_VIZINHO</span>
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

      {/* Roleta ao vivo */}
      <BlazeRoulette results={results} />


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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-[10px] tracking-widest text-muted-foreground font-mono border-b border-border">
                <th className="w-10 px-4 py-3 text-left"></th>
                <th className="px-3 py-3 text-left font-normal uppercase">Horário</th>
                <th className="px-3 py-3 text-left font-normal uppercase">Assertividade</th>
                <th className="px-3 py-3 text-left font-normal uppercase">Confluência / Top</th>
                <th className="px-3 py-3 text-left font-normal uppercase">Status</th>
                <th className="w-14 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {/* Sinais Preditos Automáticos (Próximo Branco) */}
              {predictiveList.map((s) => (
                <tr key={s.key} className="border-b border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-4 text-center">
                    <Sparkles className="h-3 w-3 text-primary/60" />
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-black text-lg text-white font-outfit">{s.time}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="text-[9px] text-muted-foreground font-mono tracking-widest uppercase">PROJETADO</div>
                      {s.isHighTendency && (
                        <span className="flex items-center gap-1 rounded bg-red-500/20 px-1 py-0.5 text-[8px] font-black text-red-400 animate-pulse border border-red-500/30">
                          🔥 ALTA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1">
                      <span className="text-sm font-black text-primary font-outfit">{s.pct.toFixed(1)}%</span>
                      <span className="text-[9px] opacity-60 font-bold uppercase tracking-tighter">Win Rate</span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {s.medal && (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-400">
                            {s.medal}
                          </span>
                        )}
                        <span className="text-xs font-bold text-white/90">{s.confluence}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground opacity-60">Janela: {s.label}</div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    {!s.outcome || s.outcome === "pending" ? (
                      <div className="inline-flex items-center gap-2 rounded-md bg-white/[0.05] border border-white/10 px-3 py-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase font-mono">
                        MONITORANDO
                      </div>
                    ) : (
                      <div
                        className={`inline-flex items-center rounded-md px-3 py-1 font-mono text-[10px] font-black tracking-widest border ${
                          s.outcome === "green"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {s.outcome === "green" ? `WIN ${s.label === "MARGEM" ? "MARGEM" : "EXATO"}` : "LOSS"}
                        {s.resultTime ? ` · ${s.resultTime}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4"></td>
                </tr>
              ))}

              {visible.length > 0 && (
                <tr className="bg-white/[0.02]">
                  <td colSpan={6} className="px-4 py-3 text-[10px] font-black tracking-[0.3em] text-muted-foreground/40 uppercase font-outfit border-b border-white/[0.05]">
                    [ Histórico de Sinais ]
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
                    {s.outcome === "pending" ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!disabled.has(s.id)}
                          onCheckedChange={() => toggleStatus(s.id)}
                        />
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase font-mono">
                          Aguardando
                        </span>
                      </div>
                    ) : (
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
                    )}
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
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum sinal ativo. Aguardando próximo branco…
                  </td>
                </tr>
              )}
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
