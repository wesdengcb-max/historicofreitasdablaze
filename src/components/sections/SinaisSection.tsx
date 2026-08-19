import { useCallback, useEffect, useMemo, useState } from "react";
import { setPredictiveSignals } from "@/lib/signalsStore";
import { Loader2, Sparkles, Target, Layers } from "lucide-react";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { parseUtcDate } from "@/lib/utils";
import { Card } from "@/components/double/Card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { ResultCircle } from "@/components/double/ResultCircle";
import { colorOf, fmtTime, type Color } from "@/components/double/types";
import { setSignals, getRobotEnabled, setRobotEnabled, subscribeRobot, getPredictiveSignals, subscribePredictive, type PredictiveSignal } from "@/lib/signalsStore";
import { Radio, Plus, ChevronDown, PlusCircle, Cpu, Upload, Power, Trash2, FileDown, Clock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { buildSignals } from "@/components/sections/SinaisSection";
import { buildRecAlerts } from "@/lib/predictive";

type Signal = {
  id: string;
  time: string;
  date: string;
  entry: number; 
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

export default function SinaisSection() {
  const [results, setResults] = useState<Result[]>([]);
  const [tick, setTick] = useState(0);
  const [resultsForValidation, setResultsForValidation] = useState<Result[]>([]);
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
  const [auditStats, setAuditStats] = useState<{ wins: number; losses: number; pct: number; total: number }>({ wins: 0, losses: 0, pct: 0, total: 0 });

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

          // Delay de Auditoria (Horário Alvo + 2 min)
          if (now < entryTime + 2 * 60_000) return { ...s, outcome: "pending" as const };

          const rangeStart = entryTime - 60_000;
          const rangeEnd = entryTime + 60_000;

          const matchedResult = (resultsForValidation || []).find(r => {
            if (!r || r.roll !== 0) return false;
            const rt = new Date(r.createdAt).getTime();
            return rt >= rangeStart && rt <= rangeEnd;
          });

          if (matchedResult) {
            const res = { ...s, outcome: "green" as const, resultTime: fmtTime(matchedResult.createdAt), label: "WIN", completedAt: now };
            void supabase.from('historico_sinais_audit').insert({
              analise: s.confluence || "Analise",
              status: "WIN",
              predicao_horario: s.time,
              minuto_alvo: new Date(entryTime).toISOString(),
            } as any);
            return res;
          }

          const res = { ...s, outcome: "red" as const, label: "LOSS", completedAt: now };
          void supabase.from('historico_sinais_audit').insert({
            analise: s.confluence || "Analise",
            status: 'LOSS',
            predicao_horario: s.time,
            minuto_alvo: new Date(entryTime).toISOString(),
          } as any);
          return res;
        } catch (e) { return s; }
      }).filter((s): s is PredictiveSignal => s !== null);
      
      setPredictiveList(validated);
      setPredictiveSignals(validated);
    };

    update();
    const sub = subscribePredictive(update);
    const interval = setInterval(update, 5000);
    return () => { sub(); clearInterval(interval); };
  }, [resultsForValidation]);

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-[#090909] px-4 py-6">
      <h1 className="text-4xl font-black tracking-tighter text-white font-outfit uppercase">Feed de Sinais</h1>
      {/* ... rest of the UI ... */}
    </div>
  );
}
