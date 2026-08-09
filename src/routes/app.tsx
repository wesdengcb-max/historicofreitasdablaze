import { createFileRoute } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  Bell,
  Flame,
  Loader2,
  Moon,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  Wifi,
  WifiOff,
  Maximize2,
  X,
  Clock,
  ChevronDown,
  BarChart3,
  Crown,
  Send,
  Layers,
  ShieldCheck,
} from "lucide-react";

import { useVipStatus } from "@/lib/auth/vipStore";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { setSection } from "@/lib/sectionStore";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { Card } from "@/components/double/Card";
import { ResultCircle } from "@/components/double/ResultCircle";
import { Switch } from "@/components/double/Switch";
import { WhiteCelebration, WhiteAlertToggleFx } from "@/components/double/WhiteCelebration";
import { StrategyTabs } from "@/components/double/StrategyTabs";
import { LeftStatsDrawer } from "@/components/double/LeftStatsDrawer";

import { colorOf, fmtTime, type Spin } from "@/components/double/types";
import {
  BlazeResultCard,
  BLAZE_CARD_W,
  BLAZE_GAP_X,
  BLAZE_GAP_Y,
} from "@/components/double/BlazeResultCard";
import { PredictiveSignals } from "@/components/double/PredictiveSignals";


import { getSignals, subscribeSignals, type StoredSignal } from "@/lib/signalsStore";
import { Sidebar } from "@/components/Sidebar";
import { AppHeader } from "@/components/AppHeader";
import { useSection } from "@/lib/sectionStore";
const SinaisPage = lazy(() => import("@/components/sections/SinaisSection"));
const AnaliseSection = lazy(() => import("@/components/sections/AnaliseSection"));
const EstrategiasSection = lazy(() => import("@/components/sections/EstrategiasSection"));

function SectionFallback() {
  return (
    <div className="flex h-[400px] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-red-500" />
    </div>
  );
}




export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Freitas da Blaze — Análise do Histórico da Blaze" },
      {
        name: "description",
        content:
          "Freitas da Blaze: análise do histórico da Blaze em tempo real, sequências, frequência e alerta de branco.",
      },
      { property: "og:title", content: "Freitas da Blaze — Análise do Histórico da Blaze" },
      { property: "og:description", content: "Freitas da Blaze: análise do histórico da Blaze em tempo real, sequências, frequência e alerta de branco." },
    ],
  }),
  component: Index,
});

const POLL_MS = 10000;
const PAGE_SIZE = 150;

type Row = {
  id: number;
  roll: string;
  color: string;
  created_at: string;
};

type FilterId = "hoje" | "ontem" | "7d" | "30d" | "custom";


function normalizeColor(v: string): Spin["color"] | null {
  const s = (v ?? "").toString().trim().toLowerCase();
  if (["red", "vermelho", "vermelha", "r"].includes(s)) return "red";
  if (["black", "preto", "preta", "b"].includes(s)) return "black";
  if (["white", "branco", "branca", "w"].includes(s)) return "white";
  return null;
}

function rowToSpin(r: Row): Spin {
  const rollNumber = Number(r.roll);
  const colorNumber = Number(r.color);
  const hasRollNumber = Number.isFinite(rollNumber);
  const hasColorNumber = Number.isFinite(colorNumber);
  const n = hasRollNumber ? rollNumber : hasColorNumber ? colorNumber : 0;
  const color = normalizeColor(r.color) ?? normalizeColor(r.roll) ?? colorOf(n);
  return {
    id: String(r.id),
    n,
    color,
    time: fmtTime(r.created_at),
    createdAt: r.created_at,
  };
}

function dedupeById<T extends { id: number | string }>(items: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    const key = String(item.id);
    if (!key || key === "undefined" || key === "null") continue;
    if (!byId.has(key)) byId.set(key, item);
  }
  return Array.from(byId.values());
}

const spSecondsFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function spTimeWithSeconds(spin: Spin): string {
  const raw = (spin.createdAt ?? "").trim();
  if (!raw) return spin.time;
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  const d = new Date(hasTz ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return spin.time;
  return spSecondsFormatter.format(d);
}

import brancoTile from "@/assets/branco-tile.png.asset.json";
import freitasLogo from "@/assets/freitas-logo.jpg.asset.json";


// Retorna YYYY-MM-DD para uma data no fuso America/Sao_Paulo.
function spYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Constrói um instante ISO UTC a partir de uma data (YYYY-MM-DD) e hora (HH:mm[:ss]) no fuso SP (UTC-3, sem DST).
function spToUtcIso(ymd: string, hms: string): string {
  const time = hms.length === 5 ? `${hms}:00` : hms;
  return new Date(`${ymd}T${time}-03:00`).toISOString();
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + delta);
  return base.toISOString().slice(0, 10);
}

function computeRange(
  filter: FilterId,
  customStart: string,
  customEnd: string,
  timeStart: string,
  timeEnd: string,
): { start: string | null; end: string | null; includesNow: boolean } {
  const today = spYmd();
  const now = new Date().toISOString();
  const tStart = timeStart || "00:00";
  const tEnd = timeEnd || "23:59:59.999";

  if (filter === "hoje") {
    return {
      start: spToUtcIso(today, tStart),
      end: spToUtcIso(today, tEnd),
      includesNow: true,
    };
  }
  if (filter === "ontem") {
    const y = addDaysYmd(today, -1);
    return { start: spToUtcIso(y, tStart), end: spToUtcIso(y, tEnd), includesNow: false };
  }
  if (filter === "7d") {
    return { start: spToUtcIso(addDaysYmd(today, -6), tStart), end: now, includesNow: true };
  }
  if (filter === "30d") {
    return { start: spToUtcIso(addDaysYmd(today, -29), tStart), end: now, includesNow: true };
  }
  // custom
  if (!customStart && !customEnd) return { start: null, end: null, includesNow: true };
  const s = customStart || customEnd;
  const e = customEnd || customStart;
  return {
    start: spToUtcIso(s, tStart),
    end: spToUtcIso(e, tEnd),
    includesNow: new Date(spToUtcIso(e, tEnd)).getTime() >= Date.now(),
  };
}

const ColumnBlock = memo(function ColumnBlock({
  col,
  spins,
  highlightN,
  highlightKey,
  inverse,
  numerado,
  destaqueHorario,
  exibirSegundos,
  contarColunas,
  futureSlots,
  slotPredictions,
  cycleSlotPrediction,
}: any) {
  const isActive = highlightKey === String(col);
  const filtered = spins.filter((s: any) => s.time.endsWith(String(col)));
  const rows = chunk(filtered, 2);

  return (
    <div
      className={`flex min-w-[120px] flex-col gap-y-4 rounded-lg border border-transparent p-1 transition-colors duration-300 ${
        isActive ? "bg-primary/10" : ""
      }`}
    >
      {rows.map((pair: any[], rIdx: number) => (
        <div key={rIdx} className="flex gap-x-2">
          <BlazeResultCardWrapper
            item={pair[0]}
            isActive={isActive}
            highlightKey={highlightKey}
            highlightN={highlightN}
            numerado={numerado}
            destaqueHorario={destaqueHorario}
            exibirSegundos={exibirSegundos}
          />
          <BlazeResultCardWrapper
            item={pair[1]}
            isActive={isActive}
            highlightKey={highlightKey}
            highlightN={highlightN}
            numerado={numerado}
            destaqueHorario={destaqueHorario}
            exibirSegundos={exibirSegundos}
          />
        </div>
      ))}
    </div>
  );
});

const BlazeResultCardWrapper = memo(function BlazeResultCardWrapper({
  item,
  isActive,
  highlightKey,
  highlightN,
  numerado,
  destaqueHorario,
  exibirSegundos,
}: any) {
  if (!item) return <div className="h-[68px] w-[48px]" />;
  return (
    <div className="flex flex-col items-center">
      <BlazeResultCard
        n={item.n}
        color={item.color}
        time={exibirSegundos ? spTimeWithSeconds(item) : item.time}
        numbered={numerado}
        timeHighlight={destaqueHorario}
        dimmed={
          (highlightKey !== null && !isActive) ||
          (highlightN.size > 0 && !highlightN.has(item.n))
        }
      />
    </div>
  );
});

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function Index() {
  const section = useSection();
  const [inverse, setInverse] = useState(false);
  const [viewMode, setViewMode] = useState<"colunas" | "lista">("colunas");
  const isVip = useVipStatus();

  // Removido o switch automático para lista em mobile para manter layout de PC em todos os dispositivos
  useEffect(() => {
    // setViewMode("colunas"); // Força o modo colunas por padrão
  }, []);

  // Protect current section if VIP is lost
  useEffect(() => {
    if (section !== "dashboard" && section !== "videos" && !isVip) {
      setSection("dashboard");
      toast.error("Membro VIP Expirado", {
        description: "Você foi redirecionado para o Histórico pois não possui acesso VIP.",
      });
    }
  }, [section, isVip]);

  const [whiteAlert, setWhiteAlert] = useState(false);
  const [alertFx, setAlertFx] = useState<"on" | "off" | null>(null);
  const toggleWhiteAlert = useCallback((next: boolean) => {
    setWhiteAlert(next);
    setAlertFx(next ? "on" : "off");
  }, []);
  const [realtime, setRealtime] = useState(true);
  const [numerado, setNumerado] = useState(false);
  const [destaqueHorario, setDestaqueHorario] = useState(false);
  const [exibirSegundos, setExibirSegundos] = useState(false);
  const [contarColunas, setContarColunas] = useState(false);
  const [contarLinhas, setContarLinhas] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [futureSlots, setFutureSlots] = useState<0 | 10 | 20 | 30>(0);
  const [highlightN, setHighlightN] = useState<Set<number>>(() => new Set());
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [slotPredictions, setSlotPredictions] = useState<Record<string, "white" | "red" | "black">>({});
  const cycleSlotPrediction = (key: string) =>
    setSlotPredictions((prev) => {
      const cur = prev[key];
      const next = cur === undefined ? "white" : cur === "white" ? "red" : cur === "red" ? "black" : undefined;
      const copy = { ...prev };
      if (next === undefined) delete copy[key];
      else copy[key] = next;
      return copy;
    });

  const [spins, setSpins] = useState<Spin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [whiteFlash, setWhiteFlash] = useState<Spin | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const ThemeToggle = () => (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-8 w-8 place-items-center rounded-xl border border-white/5 bg-white/5 text-muted-foreground transition-all duration-300 hover:bg-white/[0.08] hover:text-foreground active:scale-90 sm:h-10 sm:w-10 lg:h-11 lg:w-11"
      aria-label="Trocar brilho"
      title="Alternar entre modo claro e escuro"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );

  // Filtros
  const [filter, setFilter] = useState<FilterId>("hoje");
  const today = useMemo(() => spYmd(), []);
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [appliedTick, setAppliedTick] = useState(0);

  const range = useMemo(
    () => computeRange(filter, customStart, customEnd, timeStart, timeEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, appliedTick],
  );

  const seen = useRef<Set<string>>(new Set());
  const lastWhiteId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const buildQuery = useCallback(
    (from: number, to: number) => {
      let q = supabase
        .from("blaze_results")
        .select("id, roll, color, created_at")
        .order("id", { ascending: false })
        .range(from, to);
      if (range.start) q = q.gte("created_at", range.start);
      if (range.end) q = q.lte("created_at", range.end);
      return q;
    },
    [range.start, range.end],
  );

  const loadInitial = useCallback(async () => {
    const { data, error } = await buildQuery(0, PAGE_SIZE - 1);
    if (error) throw error;
    return (data ?? []) as Row[];
  }, [buildQuery]);

  // Carga inicial ao trocar filtro.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setHasMore(true);
    seen.current = new Set();
    isFirstLoad.current = true;
    (async () => {
      try {
        const rows = await loadInitial();
        if (!alive) return;
        const uniq = dedupeById(rows);
        seen.current = new Set(uniq.map((r) => String(r.id)));
        setSpins(uniq.map(rowToSpin));
        setHasMore(rows.length === PAGE_SIZE);
        setStatus("live");
        setErrorMsg("");
      } catch (error) {
        setStatus("error");
        setErrorMsg(error instanceof Error ? error.message : "Falha ao carregar histórico");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = spins.length;
      const { data, error } = await buildQuery(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      setSpins((prev) => {
        const merged = dedupeById([...prev, ...rows.map(rowToSpin)]);
        seen.current = new Set(merged.map((s) => s.id));
        return merged;
      });
      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Falha ao carregar mais");
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, hasMore, loadingMore, spins.length]);

  // Realtime — só insere se a nova rodada está no intervalo ativo.
  useEffect(() => {
    if (!realtime) return;
    const channel = supabase
      .channel("blaze_results_inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blaze_results" },
        (payload: any) => {
          const r = payload.new as Row;
          const key = String(r?.id);
          if (!r || seen.current.has(key)) return;
          const t = new Date(r.created_at).getTime();
          if (range.start && t < new Date(range.start).getTime()) return;
          if (range.end && t > new Date(range.end).getTime()) return;
          seen.current.add(key);
          setSpins((prev) => {
            if (prev.some((s) => s.id === key)) return prev;
            return dedupeById([rowToSpin(r), ...prev]);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [range.start, range.end, realtime]);

  // Polling leve e Processamento de Gatilhos em Background
  useEffect(() => {
    if (!range.includesNow || !realtime) return;
    let alive = true;

    const poll = async () => {
      if (!alive) return;
      // Removido document.hidden para processar gatilhos em segundo plano
      try {
        const { data, error } = await buildQuery(0, PAGE_SIZE - 1);
        if (error) throw error;
        if (!alive) return;
        const rows = (data ?? []) as Row[];
        const fresh = rows.filter((r) => !seen.current.has(String(r.id)));
        
        if (fresh.length > 0) {
          setSpins((prev) => {
            const merged = dedupeById([...fresh.map(rowToSpin), ...prev]);
            seen.current = new Set(merged.map((s) => s.id));
            return merged;
          });
        }
        setStatus("live");
      } catch (error) {
        if (!alive) return;
        setStatus("error");
        setErrorMsg(error instanceof Error ? error.message : "Falha ao atualizar");
      }
    };

    const timer = setInterval(poll, POLL_MS);
    // Notificamos mudanças mesmo com a aba "escondida" para garantir que Gatilhos e Sinais
    // continuem sendo calculados em background.
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [buildQuery, range.includesNow, realtime]);

  // Countdown estético
  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? 15 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // White alert.
  useEffect(() => {
    if (spins.length === 0) return;
    const newestWhite = spins.find((s) => s.color === "white");
    if (!newestWhite) return;
    if (isFirstLoad.current) {
      lastWhiteId.current = newestWhite.id;
      isFirstLoad.current = false;
      return;
    }
    if (newestWhite.id === lastWhiteId.current) return;
    lastWhiteId.current = newestWhite.id;
    if (!whiteAlert) return;
    setWhiteFlash(newestWhite);
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.connect(g).connect(ctx.destination);
      o.start();
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.stop(ctx.currentTime + 0.65);
    } catch {
      /* noop */
    }
    const t = setTimeout(() => setWhiteFlash(null), 3000); // Reduzido para 3 segundos para sumir mais rápido
    return () => clearTimeout(t);

  }, [spins, whiteAlert]);

  // spins já é dedup no setter (loadInitial/loadMore/poll/realtime), evita O(n) por render.
  const visibleSpins = spins;
  // Rendering de listas longas é deferrable para manter cliques/toggles responsivos.
  const deferredSpins = useDeferredValue(visibleSpins);

  // Stats
  const total = visibleSpins.length;
  const counts = useMemo(
    () =>
      visibleSpins.reduce(
        (acc, spin) => {
          acc[spin.color] += 1;
          acc.byNumber[spin.n] = (acc.byNumber[spin.n] ?? 0) + 1;
          return acc;
        },
        { red: 0, black: 0, white: 0, byNumber: {} as Record<number, number> },
      ),
    [visibleSpins],
  );
  const reds = counts.red;
  const blacks = counts.black;
  const whites = counts.white;
  const redPct = total ? (reds / total) * 100 : 0;
  const blackPct = total ? (blacks / total) * 100 : 0;
  const whitePct = total ? (whites / total) * 100 : 0;
  const last = visibleSpins[0];
  const lastWhiteIdx = visibleSpins.findIndex((s) => s.color === "white");
  const lastWhiteAgo = lastWhiteIdx >= 0 ? lastWhiteIdx : visibleSpins.length;

  const freq = useMemo(
    () => Array.from({ length: 15 }, (_, n) => ({ n, count: counts.byNumber[n] ?? 0 })),
    [counts.byNumber],
  );

  const storedSignals = useSyncExternalStore(subscribeSignals, getSignals, getSignals);

  type GridRow = { key: string; label: string; order: number; cells: Spin[][] };

  const gridRows: GridRow[] = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const rowMap = new Map<string, GridRow>();
    for (const s of deferredSpins) {
      const raw = (s.createdAt ?? "").trim();
      if (!raw) continue;
      const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
      const d = new Date(hasTz ? raw : `${raw.replace(" ", "T")}Z`);
      if (Number.isNaN(d.getTime())) continue;
      const parts = formatter.formatToParts(d);
      const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
      const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
      const tens = Math.floor(minute / 10);
      const unit = minute % 10;

      // Filtro de Coluna no modo Colunas Fixas removido para permitir ver todas as pedras
      // (a seleção visual agora é feita via opacidade/dimmed)

      const key = `${hour}:${tens}`;
      let row = rowMap.get(key);
      if (!row) {
        row = {
          key,
          label: `${String(hour).padStart(2, "0")}:${tens}0`,
          order: hour * 6 + tens,
          cells: Array.from({ length: 10 }, () => []),
        };
        rowMap.set(key, row);
      }
      row.cells[unit].push(s);
    }
    // Garante que blocos com sinais pendentes/verdes apareçam mesmo sem spins ainda.
    for (const s of storedSignals) {
      const d = new Date(s.targetIso);
      if (Number.isNaN(d.getTime())) continue;
      const parts = formatter.formatToParts(d);
      const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
      const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
      const tens = Math.floor(minute / 10);
      const unit = minute % 10;

      // Filtro de Coluna no modo Colunas Fixas para sinais removido

      const key = `${hour}:${tens}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          label: `${String(hour).padStart(2, "0")}:${tens}0`,
          order: hour * 6 + tens,
          cells: Array.from({ length: 10 }, () => []),
        });
      }
    }
    // Adiciona blocos futuros vazios (+10/+20/+30 minutos à frente do agora).
    if (futureSlots > 0) {
      const now = new Date(Date.now() + futureSlots * 60_000);
      const start = new Date();
      // gera todos os blocos de 10min entre agora e agora+futureSlots
      const stepMs = 10 * 60_000;
      for (let t = start.getTime(); t <= now.getTime(); t += stepMs) {
        const d = new Date(t);
        const parts = formatter.formatToParts(d);
        const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
        const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
        const tens = Math.floor(minute / 10);
        const key = `${hour}:${tens}`;
        
        // No filtro de coluna, a lógica de blocos futuros pode ser complexa.
        // Mantemos a simplicidade: se o bloco de 10min existe, ele é exibido.
        // O unit filter acima já garante que apenas a coluna certa dentro desse bloco apareça.

        if (!rowMap.has(key)) {
          rowMap.set(key, {
            key,
            label: `${String(hour).padStart(2, "0")}:${tens}0`,
            order: hour * 6 + tens,
            cells: Array.from({ length: 10 }, () => []),
          });
        }
      }
    }
    // Pré-ordena cada célula por tempo (antes era feito por célula em cada render).
    const rows = Array.from(rowMap.values());
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.length > 1) {
          cell.sort((a, b) => {
            const at = new Date(a.createdAt ?? "").getTime();
            const bt = new Date(b.createdAt ?? "").getTime();
            return (Number.isFinite(at) ? at : 0) - (Number.isFinite(bt) ? bt : 0);
          });
        }
      }
    }
    return rows.sort((a, b) => b.order - a.order);
  }, [deferredSpins, storedSignals, futureSlots, viewMode, highlightKey]);


  const applyCustom = () => setAppliedTick((v) => v + 1);
  const historyGridTemplate = `repeat(10, var(--colW, 120px))`;

  // Contagens auxiliares dos toggles "Contar colunas" / "Contar linhas".
  const colCounts = useMemo(() => {
    const acc = Array.from({ length: 10 }, () => 0);
    for (const row of gridRows) {
      row.cells.forEach((cell, i) => {
        acc[i] += cell.length;
      });
    }
    return acc;
  }, [gridRows]);

  /** Percentual de vermelho / preto / branco por coluna (00–09). */
  const colStats = useMemo(() => {
    const acc = Array.from({ length: 10 }, () => ({ red: 0, black: 0, white: 0, total: 0 }));
    for (const row of gridRows) {
      row.cells.forEach((cell, i) => {
        for (const spin of cell) {
          if (spin.color === "red") acc[i].red += 1;
          else if (spin.color === "black") acc[i].black += 1;
          else if (spin.color === "white") acc[i].white += 1;
          else continue;
          acc[i].total += 1;
        }
      });
    }
    return acc.map((c) => ({
      ...c,
      redPct: c.total ? (c.red / c.total) * 100 : 0,
      blackPct: c.total ? (c.black / c.total) * 100 : 0,
      whitePct: c.total ? (c.white / c.total) * 100 : 0,
    }));
  }, [gridRows]);

  const signalsByHM = useMemo(() => {

    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const map = new Map<string, StoredSignal[]>();
    for (const s of storedSignals) {
      const d = new Date(s.targetIso);
      if (Number.isNaN(d.getTime())) continue;
      const key = fmt.format(d); // "HH:MM"
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [storedSignals]);


  return (
    <div className="flex h-screen w-full bg-[#080808] text-white">
      {/* Sidebar lateral fixa */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Área principal scrollable */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        
        <div className="flex-1 overflow-y-auto scrollbar-none bg-[#080808]">
          {section === "sinais" ? (
            <Suspense fallback={<SectionFallback />}><SinaisPage /></Suspense>
          ) : section === "analise" ? (
            <Suspense fallback={<SectionFallback />}><AnaliseSection /></Suspense>
          ) : section === "estrategias" ? (
            <Suspense fallback={<SectionFallback />}><EstrategiasSection /></Suspense>
          ) : section !== "dashboard" ? (
        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-10 sm:gap-6 sm:px-6 sm:py-16">
          <Card delay={0.05}>
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Seção
              </div>
              <h2 className="text-2xl font-semibold text-foreground capitalize">{section}</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Conteúdo desta seção em construção. Em breve você verá aqui os dados
                específicos de <span className="capitalize text-foreground">{section}</span>.
              </p>
            </div>
          </Card>
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:gap-6 lg:px-8 lg:py-6">
          <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr_300px] lg:gap-6">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-600/30" />


            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col justify-center min-h-[70px] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-600/30" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Status da rodada</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${countdown > 3 ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <h3 className="text-sm font-black uppercase tracking-tight text-white font-outfit">
                    {countdown > 3 ? "Apostas abertas" : "Rodando…"}
                  </h3>
                </div>
              </div>
              
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col justify-center min-h-[70px] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-600/30" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Próximo Giro</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-lg font-black tabular-nums text-white font-outfit">00:{String(countdown).padStart(2, '0')}</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col justify-center min-h-[70px] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-600/30" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Último Resultado</p>
                <div className="flex items-center gap-2">
                  {spins[0] && <ResultCircle color={spins[0].color} n={spins[0].n} size="sm" animate={false} />}
                  <span className="text-sm font-bold text-white/90">{spins[0] ? (spins[0].color === 'white' ? 'Branco' : spins[0].color === 'red' ? 'Vermelho' : 'Preto') : '--'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Vermelho', color: 'red', count: stats.red, pct: stats.redPct },
                { label: 'Branco', color: 'white', count: stats.white, pct: stats.whitePct },
                { label: 'Preto', color: 'black', count: stats.black, pct: stats.blackPct }
              ].map((c) => (
                <div key={c.color} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-600/30" />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${c.color === 'red' ? 'bg-red-500' : c.color === 'white' ? 'bg-white' : 'bg-neutral-700'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{c.label}</span>
                    </div>
                    <span className="text-[10px] font-black text-white">{c.pct.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-black text-white tabular-nums">{c.count}</span>
                    <span className="text-[9px] text-muted-foreground mb-1">Rodadas</span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${c.color === 'red' ? 'bg-red-500' : c.color === 'white' ? 'bg-white' : 'bg-neutral-600'}`} 
                      style={{ width: `${c.pct}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div
                className={
                  fullscreen
                    ? "fixed inset-0 z-50 flex flex-col bg-[#080808] p-4 backdrop-blur-md sm:p-6"
                    : "overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
                }
              >
                {fullscreen && (
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">
                        Histórico — Tela Cheia
                      </p>
                      <h2 className="truncate text-lg font-black text-white">{total} rodadas · Brasília</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFullscreen(false)}
                      className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.01]">
                   <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-red-600" />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Rodadas Recentes</h3>
                      <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[9px] font-black text-red-500 border border-red-600/20">{total}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={() => setViewMode(viewMode === "colunas" ? "lista" : "colunas")}
                       className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground transition-colors"
                       title="Mudar visualização"
                     >
                       {viewMode === "colunas" ? <BarChart3 className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                     </button>
                     <button 
                       onClick={() => setFullscreen(true)}
                       className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground transition-colors"
                       title="Tela cheia"
                     >
                       <Maximize2 className="h-3.5 w-3.5" />
                     </button>
                   </div>
                </div>

                <div
                  className={
                    fullscreen
                      ? "min-h-0 flex-1 overflow-auto bg-black/20 p-4"
                      : "max-h-[600px] overflow-auto p-4 scrollbar-thin scrollbar-thumb-white/10"
                  }
                  style={{ direction: inverse && viewMode === "colunas" ? "rtl" : "ltr" }}
                >
                   {viewMode === "colunas" ? (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-10 gap-2 mb-2">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <div className="w-full py-1.5 rounded bg-white/[0.03] border border-white/5 text-center text-[10px] font-black text-white/40">
                                {i}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-10 gap-2">
                          {Array.from({ length: 10 }).map((_, colIndex) => (
                            <div key={colIndex} className="flex flex-col gap-3">
                              {gridRows.map((row) => (
                                <div key={row.key} className="flex flex-col gap-2">
                                  {row.cells[colIndex].map((spin) => (
                                    <BlazeResultCard
                                      key={spin.id}
                                      n={spin.n}
                                      color={spin.color}
                                      time={exibirSegundos ? spTimeWithSeconds(spin) : spin.time}
                                      numbered={numerado}
                                      timeHighlight={destaqueHorario}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                   ) : (
                     <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                        {visibleSpins.map((spin) => (
                          <BlazeResultCard
                            key={spin.id}
                            n={spin.n}
                            color={spin.color}
                            time={exibirSegundos ? spTimeWithSeconds(spin) : spin.time}
                            numbered={numerado}
                            timeHighlight={destaqueHorario}
                          />
                        ))}
                     </div>
                   )}
                   
                   {hasMore && (
                     <div className="mt-8 flex justify-center">
                       <button
                         onClick={loadMore}
                         disabled={loadingMore}
                         className="rounded-lg border border-white/10 bg-white/5 px-6 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                       >
                         {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Carregar mais"}
                       </button>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-600/30" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-red-600" />
                Estratégias Ativas
              </h3>
              <StrategyTabs spins={visibleSpins} />
            </Card>

            <PredictiveSignals />
          </div>
        </section>
      </main>
    )}
  </div>
</div>


<WhiteCelebration 
  spin={whiteFlash} 
  onClose={() => setWhiteFlash(null)} 
/>
<WhiteAlertToggleFx state={alertFx} onDone={() => setAlertFx(null)} />
</div>

)
}

const TipMinerCard = memo(function TipMinerCard({

  spin,
  delay = 0,
  showTime = true,
  numbered = false,
  showSeconds = false,
  timeHighlight = false,
  highlightN,
  isActive: isActiveProp,
  onClick,
}: {
  spin: Spin;
  delay?: number;
  showTime?: boolean;
  numbered?: boolean;
  showSeconds?: boolean;
  timeHighlight?: boolean;
  highlightN?: Set<number> | null;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const isWhite = spin.color === "white";
  const bg =
    spin.color === "red"
      ? "#DE2143"
      : spin.color === "black"
        ? "#16171d"
        : "#ffffff";
  const ring = isWhite ? "#16171d" : "#ffffff";
  const fg = isWhite ? "#16171d" : "#ffffff";
  
  const isHit = !!highlightN && highlightN.has(spin.n);
  const isActive = isActiveProp !== undefined ? isActiveProp : true;

  const delayStyle = delay > 0 ? { animationDelay: `${delay}s` } : undefined;
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center justify-center overflow-hidden rounded-[6px] border border-white/[0.08] shadow-sm transition-[transform,opacity] duration-200 hover:-translate-y-0.5 animate-in fade-in zoom-in-95 ${
          isHit && isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
        style={{
          width: "var(--stone, 48px)",
          height: "var(--stone-h, 48px)",
          background: isWhite ? "#ffffff" : bg,
          opacity: isActive ? 1 : 0.25,
          ...(delayStyle ?? {}),
        }}
      >
        {isWhite ? (
          <span className="relative flex h-full w-full items-center justify-center">
            <img
              src={brancoTile.url}
              alt="Branco"
              className="h-full w-full object-cover"
              draggable={false}
            />
            {numbered && (
              <span
                className="absolute inset-0 grid place-items-center font-bold leading-none tabular-nums text-black/85"
                style={{ fontSize: "14px" }}
              >
                {spin.n}
              </span>
            )}
          </span>
        ) : (
          <div
            className="flex items-center justify-center rounded-full font-bold leading-none tabular-nums"
            style={{ 
              height: "32px", 
              width: "32px", 
              border: `2px solid #ffffff`, 
              color: fg, 
              fontSize: "14px" 
            }}
          >
            {spin.n}
          </div>
        )}
      </button>

      {showTime && (
        <span
          className={`mt-1 leading-none tabular-nums ${
            timeHighlight ? "font-bold text-primary" : "text-muted-foreground"
          }`}
          style={{ fontSize: "12px" }}
        >
          {showSeconds ? spTimeWithSeconds(spin) : spin.time}
        </span>
      )}
    </div>
  );
});

const EmptySlot = memo(function EmptySlot({
  prediction,
  onClick,
}: {
  prediction?: "white" | "red" | "black";
  onClick?: () => void;
}) {
  const isWhite = prediction === "white";
  const bg =
    prediction === "red" ? "#DE2143" : prediction === "black" ? "#16171d" : "#ffffff";
  const ring = isWhite ? "#16171d" : "#ffffff";
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        aria-label="Marcar previsão"
        className={`flex items-center justify-center overflow-hidden rounded-md transition-colors ${
          prediction
            ? "shadow-sm hover:-translate-y-0.5"
            : "border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
        }`}
        style={{
          width: "var(--stone, 48px)",
          height: "var(--stone-h, 48px)",
          background: prediction ? (isWhite ? "#ffffff" : bg) : undefined
        }}
      >
        {prediction ? (
          isWhite ? (
            <img
              src={brancoTile.url}
              alt="Branco"
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="h-[32px] w-[32px] rounded-full border-2"
              style={{ border: `2px solid #ffffff` }}
            />
          )
        ) : null}
      </button>
      <span
        className="mt-1 select-none leading-none text-transparent"
        style={{ fontSize: "var(--stone-time, 12px)" }}
      >
        --:--
      </span>
    </div>
  );
});




function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("light", !isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("light", !next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* noop */
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors duration-200 hover:bg-white/[0.09] hover:text-foreground"
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}


const FieldInput = memo(function FieldInput({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: "date" | "time";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-[12px] text-foreground outline-none transition-colors focus:border-white/25"
      />
    </label>
  );
});

function countConsecutive(spins: Spin[], color: Spin["color"]): number {
  let n = 0;
  for (const s of spins) {
    if (s.color === color) n += 1;
    else break;
  }
  return n;
}

const StatusPill = memo(function StatusPill({
  status,
  message,
}: {
  status: "loading" | "live" | "error";
  message: string;
}) {
  const cls =
    status === "live"
      ? "border-positive/25 bg-positive/10 text-positive"
      : status === "error"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-white/10 bg-white/5 text-muted-foreground";
  const label =
    status === "live" ? "Análise em Tempo Real" : status === "error" ? "Sem conexão" : "Carregando…";
  return (
    <span
      title={message}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${cls}`}
    >
      {status === "error" ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
});
