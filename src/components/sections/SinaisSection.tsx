
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
} from "lucide-react";
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
import { setSignals } from "@/lib/signalsStore";
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
  const now = Date.now();
  const out: Signal[] = [];
  const maxOffsetMs = Math.max(...ENTRY_OFFSETS) * 60_000;
  const whites = results.filter((r) => r.color === "white");

  for (const w of whites) {
    const base = parseIso(w.createdAt);
    if (Number.isNaN(base.getTime())) continue;
    // Só considera brancos recentes o suficiente para ainda terem entradas futuras.
    if (now - base.getTime() > maxOffsetMs) continue;
    const baseTime = fmtTime(w.createdAt);

    for (let i = 0; i < ENTRY_OFFSETS.length; i++) {
      const t = new Date(base.getTime() + ENTRY_OFFSETS[i] * 60_000);
      const targetTime = t.getTime();
      // só entra na lista se o horário do sinal ainda está no futuro
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

export default function SinaisSection() {
  const [results, setResults] = useState<Result[]>([]);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [robotOn, setRobotOn] = useState(true);
  const [manualSignals, setManualSignals] = useState<Signal[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formDate, setFormDate] = useState(() => spYmd());
  const [formTime, setFormTime] = useState("");
  const [formEntry, setFormEntry] = useState<"1" | "2">("1");
  const [formColor, setFormColor] = useState<Color>("red");


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
      setResults(rows.map(rowToResult));
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
    const now = Date.now();
    const auto = buildSignals(results);
    const manual = manualSignals.filter((s) => s.entryDate.getTime() > now);
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

  // Compartilha os sinais visíveis com o histórico. Só reflete quando o robô estiver ligado.
  useEffect(() => {
    if (!robotOn) {
      setSignals([]);
      return;
    }
    setSignals(visibleForStore);
  }, [visibleForStore, robotOn]);



  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-[#090909] px-4 py-6 sm:px-6 sm:py-8 space-y-8 w-full">
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
            Gerencie sua lista de sinais e estratégias automáticas de forma premium.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Martingale: 3 níveis · ×2
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

      {/* Estratégias Personalizadas */}
      <Card className="glass-card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05] bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <Cpu className="h-5 w-5" />
            </div>
            <h2 className="font-black text-xl text-white font-outfit uppercase tracking-tight">Estratégias Personalizadas</h2>
          </div>
          <div className="text-[11px] tracking-widest font-mono text-muted-foreground border border-border rounded-full px-3 py-1">
            [ ● 0 ATIVAS ]
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr_1fr_100px] px-5 py-3 text-[10px] tracking-widest text-muted-foreground font-mono border-b border-border">
          <div>BOT</div><div>PADRÃO</div><div>PLACAR</div><div className="text-right">AÇÕES</div>
        </div>
        <div className="py-14 flex flex-col items-center justify-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
            <Cpu className="h-7 w-7" />
          </div>
          <div className="font-bold">Nenhuma estratégia cadastrada</div>
          <div className="text-sm text-muted-foreground max-w-xs">
            Crie uma estratégia automática com padrão de cores para o bot seguir.
          </div>
        </div>
      </Card>

      {/* Lista de Sinais */}
      <Card className="glass-card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05] bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF1F3D]/10 text-[#FF1F3D] shadow-[0_0_15px_rgba(255,31,61,0.1)]">
              <Radio className="h-5 w-5" />
            </div>
            <h2 className="font-black text-xl text-white font-outfit uppercase tracking-tight">Lista de Sinais</h2>
          </div>
          <div className="text-[11px] tracking-widest font-mono text-red-400 border border-red-500/40 rounded-full px-3 py-1">
            [ ● {visible.length} SINAIS ]
          </div>
        </div>

        {/* Table */}
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
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggleSelect(s.id)}
                    />
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-bold font-mono">{s.time}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{s.date}</div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
                      <ResultCircle color={s.color} size="sm" animate={false} />
                      <span className="text-sm font-semibold">
                        {s.color === "white" ? "Branco" : s.color === "red" ? "Vermelho" : "Preto"}
                      </span>

                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1 font-mono text-xs">
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
