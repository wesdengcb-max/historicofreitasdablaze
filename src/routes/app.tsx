import { createFileRoute } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  Send,
} from "lucide-react";

import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { Card } from "@/components/double/Card";
import { ResultCircle } from "@/components/double/ResultCircle";
import { Switch } from "@/components/double/Switch";
import { WhiteCelebration, WhiteAlertToggleFx } from "@/components/double/WhiteCelebration";
import { StrategyTabs } from "@/components/double/StrategyTabs";
import { LeftStatsDrawer } from "@/components/double/LeftStatsDrawer";


import { colorOf, fmtTime, type Spin } from "@/components/double/types";
import brancoVip from "@/assets/branco-vip.png.asset.json";
import brancoTile from "@/assets/branco-tile.png.asset.json";
import {
  BlazeResultCard,
  BLAZE_CARD_W,
  BLAZE_GAP_X,
  BLAZE_GAP_Y,
} from "@/components/double/BlazeResultCard";
import freitasLogo from "@/assets/freitas-logo.jpg.asset.json";

import { getSignals, subscribeSignals, type StoredSignal } from "@/lib/signalsStore";
import { TopNav } from "@/components/TopNav";
import { useSection } from "@/lib/sectionStore";
const SinaisPage = lazy(() =>
  import("@/components/sections/SinaisSection").then((m) => ({ default: m.SinaisPage })),
);
const AnaliseSection = lazy(() =>
  import("@/components/sections/AnaliseSection").then((m) => ({ default: m.AnaliseSection })),
);
const EstrategiasSection = lazy(() =>
  import("@/components/sections/EstrategiasSection").then((m) => ({ default: m.EstrategiasSection })),
);

function SectionFallback() {
  return (
    <div className="mx-auto flex w-full max-w-[1720px] items-center justify-center px-3 py-24 sm:px-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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

const POLL_MS = 5000;
const PAGE_SIZE = 300;

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
  return dedupeByIdImpl(items);
}

const spSecondsFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

// Exibe HH:MM:SS no fuso de Brasília; cai para o horário já formatado se não houver timestamp.
function spTimeWithSeconds(spin: Spin): string {
  const raw = (spin.createdAt ?? "").trim();
  if (!raw) return spin.time;
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  const d = new Date(hasTz ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return spin.time;
  return spSecondsFormatter.format(d);
}

function dedupeByIdImpl<T extends { id: number | string }>(items: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    const key = String(item.id);
    if (!key || key === "undefined" || key === "null") continue;
    if (!byId.has(key)) byId.set(key, item);
  }
  return Array.from(byId.values());
}

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

function Index() {
  const section = useSection();
  const [inverse, setInverse] = useState(false);
  const [viewMode, setViewMode] = useState<"colunas" | "lista">("colunas");
  // Em celular/tablet inicia em lista (sentido normal); desktop mantém colunas fixas.
  useEffect(() => {
    if (window.innerWidth < 1024) setViewMode("lista");
  }, []);
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
        .order("created_at", { ascending: false })
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
        (payload) => {
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
    const t = setTimeout(() => setWhiteFlash(null), 8000);
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
  }, [deferredSpins, storedSignals, futureSlots]);


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
    <div
      className="history-metrics min-h-dvh [--cols:10]"
    >
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto grid h-12 max-w-[1720px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 sm:h-14 sm:gap-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-white/40 sm:h-9 sm:w-9"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              <img src={freitasLogo.url} alt="Freitas Blaze" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[12px] font-semibold tracking-tight sm:text-sm">Freitas da Blaze</p>
              <p className="truncate text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px] sm:tracking-[0.18em]">
                Análise do Histórico da Blaze
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <StatusPill status={status} message={errorMsg} />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => toggleWhiteAlert(!whiteAlert)}
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/5 bg-white/5 text-muted-foreground transition-colors duration-200 hover:bg-white/[0.08] hover:text-foreground sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              aria-label="Notificar branco"
              title={whiteAlert ? "Alerta de branco: ligado" : "Alerta de branco: desligado"}
            >
              <Bell className={`h-4 w-4 ${whiteAlert ? "text-foreground" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setStatsOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/5 bg-white/5 text-muted-foreground transition-colors duration-200 hover:bg-white/[0.08] hover:text-foreground sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              aria-label="Abrir estatísticas"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <a
              href="https://t.me/freitaswhite"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir Telegram"
              className="grid h-8 w-8 place-items-center rounded-xl text-white transition-transform duration-200 hover:scale-105 sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              style={{ background: "linear-gradient(135deg, #29b6f6, #0288d1)" }}
            >
              <Send className="h-4 w-4 -translate-x-[1px] translate-y-[1px] fill-white" />
            </a>
          </div>
        </div>
      </header>

      <TopNav />

      {section === "sinais" ? (
        <Suspense fallback={<SectionFallback />}><SinaisPage /></Suspense>
      ) : section === "analise" ? (
        <Suspense fallback={<SectionFallback />}><AnaliseSection /></Suspense>
      ) : section === "estrategias" ? (
        <Suspense fallback={<SectionFallback />}><EstrategiasSection /></Suspense>
      ) : section !== "dashboard" ? (
        <main className="mx-auto flex w-full max-w-[1720px] flex-col gap-5 px-3 py-10 sm:gap-6 sm:px-8 sm:py-16">
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
      <main className="mx-auto flex w-full max-w-[1720px] flex-col gap-3 px-1.5 py-3 sm:gap-5 sm:px-4 sm:py-6 lg:gap-6 lg:px-8 lg:py-10">

        <section className="space-y-3 sm:space-y-5 lg:space-y-6">
          <Card delay={0.05}>
            {/* Cabeçalho compacto: status + contagem + último número */}
            <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Status da rodada
                </p>
                <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {countdown > 3 ? "Apostas abertas" : "Rodando…"}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="relative inline-flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive/70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
                    </span>
                    Próximo giro em{" "}
                    <b className="tabular-nums text-foreground">{String(countdown).padStart(2, "0")}s</b>
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{total} rodadas</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:block">
                  Último
                </p>
                {last ? (
                  <div key={last.id} className="animate-in fade-in zoom-in-95 duration-200">
                    <ResultCircle color={last.color} n={last.n} size="md" glow />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full border border-dashed border-white/10" />
                )}
              </div>
            </div>

            {(() => {
              const items = [
                { key: "red" as const, color: "red" as const, count: reds, pct: redPct, tint: "#DE2143" },
                { key: "white" as const, color: "white" as const, count: whites, pct: whitePct, tint: "#ffffff" },
                { key: "black" as const, color: "black" as const, count: blacks, pct: blackPct, tint: "#16171d" },
              ];
              const leader = items.reduce((a, b) => (b.count > a.count ? b : a), items[0]);
              return (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {items.map((it) => {
                    const isLeader = it.key === leader.key && it.count > 0;
                    return (
                      <div
                        key={it.key}
                        className={`rounded-xl border p-2 transition-colors sm:p-2.5 ${
                          isLeader
                            ? "border-emerald-400/70 shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_8px_24px_-12px_rgba(16,185,129,0.45)]"
                            : "border-white/5 bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ResultCircle color={it.color} n={it.color === "white" ? undefined : 0} size="sm" animate={false} />
                          <div className="min-w-0 flex-1">
                            <div className={`text-[13px] font-semibold tabular-nums ${isLeader ? "text-emerald-400" : "text-foreground"}`}>
                              {it.pct.toFixed(1)}%
                            </div>
                            <div className="truncate text-[10px] tabular-nums text-muted-foreground">
                              {it.count} apostas
                            </div>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${Math.min(100, it.pct)}%`,
                              background: isLeader
                                ? "linear-gradient(90deg,#10b981,#34d399)"
                                : it.tint,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="mt-3 grid gap-2 border-t border-white/5 pt-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5" />
                  Último branco há <b className="text-foreground">{lastWhiteAgo}</b> rodadas
                </span>
                <span className="inline-flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" />
                  Brancos seguidos <b className="text-foreground">{countConsecutive(visibleSpins, "white")}</b>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Frequência
                </span>
                {freq.map((f) => (
                  <div key={f.n} className="flex items-center gap-1">
                    <ResultCircle color={colorOf(f.n)} n={f.n} size="sm" animate={false} />
                    <span className="text-[10px] tabular-nums text-muted-foreground">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <StrategyTabs spins={visibleSpins} />

          <Card
            title="Histórico"
            subtitle={`${total} rodadas · horário de Brasília`}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            delay={0.08}
            action={
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-foreground"
                  aria-label="Tela cheia"
                  title="Tela cheia"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            }
          >
            {/* Filtros de período */}
            <div className="mb-3 flex flex-wrap gap-1 sm:mb-4 sm:gap-1.5">
              {([
                ["hoje", "Hoje"],
                ["ontem", "Ontem"],
                ["7d", "Últimos 7 dias"],
                ["30d", "Últimos 30 dias"],
                ["custom", "Personalizado"],
              ] as [FilterId, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-full border px-2 py-1 text-[10px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-[11px] ${
                    filter === id
                      ? "border-white/20 bg-white/10 text-foreground"
                      : "border-white/5 bg-white/[0.03] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filter === "custom" && (
              <div className="mb-3 grid gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:mb-4 sm:grid-cols-[repeat(4,1fr)_auto] sm:items-end">
                <FieldInput label="Data inicial" type="date" value={customStart} onChange={setCustomStart} />
                <FieldInput label="Data final" type="date" value={customEnd} onChange={setCustomEnd} />
                <FieldInput label="Hora inicial" type="time" value={timeStart} onChange={setTimeStart} placeholder="00:00" />
                <FieldInput label="Hora final" type="time" value={timeEnd} onChange={setTimeEnd} placeholder="23:59" />
                <button
                  type="button"
                  onClick={applyCustom}
                  className="h-9 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Pesquisar
                </button>
              </div>
            )}

            {/* Cabeçalho das colunas (0-9) movido para fora do "quadrado" */}
            {viewMode === "colunas" && (
              <div className="history-scroll mb-3 w-full border-b border-white/5 pb-3">
                <div className="grid justify-center gap-[var(--gap-col,8px)] px-[1px]" style={{ gridTemplateColumns: "repeat(10, var(--colW, 120px))", width: "1274px", margin: "0 auto" }}>
                  {Array.from({ length: 10 }).map((_, ci) => {
                    const stats = colStats[ci];
                    return (
                      <div
                        key={`header-outer-${ci}`}
                        className="flex flex-col items-center gap-2"
                        style={{ width: "var(--colW, 120px)" }}
                      >
                        <div className="flex h-[22px] w-full items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.03] text-[13px] font-medium tabular-nums text-[#eaeaea] transition-colors hover:bg-white/10 hover:text-white">
                          {ci}
                        </div>
                        {contarColunas && (
                          <div className="flex w-full flex-col gap-0.5 overflow-hidden rounded-[4px] bg-white/[0.03] p-1 shadow-inner">
                            <div className="flex items-center justify-between px-0.5 text-[8px] font-bold tabular-nums">
                              <span className="text-white">B: {stats.white}</span>
                              <span className="text-white/40">{stats.whitePct.toFixed(0)}%</span>
                            </div>
                            <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/5">
                              <div className="flex h-full w-full">
                                <div
                                  className="h-full bg-red-500 transition-all duration-500"
                                  style={{ width: `${stats.redPct}%` }}
                                />
                                <div
                                  className="h-full bg-slate-800 transition-all duration-500"
                                  style={{ width: `${stats.blackPct}%` }}
                                />
                                <div
                                  className="h-full bg-white transition-all duration-500"
                                  style={{ width: `${stats.whitePct}%` }}
                                />
                              </div>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between px-0.5 text-[7px] font-medium text-muted-foreground/60 tabular-nums uppercase">
                              <span>V: {stats.red}</span>
                              <span>P: {stats.black}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Painel de controles alinhado */}
            <div className="mb-3 rounded-2xl border border-white/5 bg-white/[0.02] p-2 sm:mb-4 sm:p-4">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:gap-x-8 sm:gap-y-3.5 lg:grid-cols-4">
                <div className="flex min-w-0 items-center">
                  <Switch checked={realtime} onChange={setRealtime} label="Tempo real" />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch
                    checked={viewMode === "colunas"}
                    onChange={(v) => setViewMode(v ? "colunas" : "lista")}
                    label="Colunas fixas"
                  />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch checked={contarColunas} onChange={setContarColunas} label="Contar colunas" />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch checked={inverse} onChange={setInverse} label="Sentido inverso" />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch checked={numerado} onChange={setNumerado} label="Numerado" />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch checked={exibirSegundos} onChange={setExibirSegundos} label="Exibir segundos" />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch checked={contarLinhas} onChange={setContarLinhas} label="Contar linhas" />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch checked={whiteAlert} onChange={toggleWhiteAlert} label="Alerta de branco" />
                </div>
                <div className="flex min-w-0 items-center">
                  <Switch checked={destaqueHorario} onChange={setDestaqueHorario} label="Destaque horário" />
                </div>
                <div className="flex min-w-0 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-foreground"
                        title="Slots futuros"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Slots futuros: {futureSlots === 0 ? "Off" : `+${futureSlots} min`}</span>
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[7rem]">
                      {([0, 10, 20, 30] as const).map((v) => (
                        <DropdownMenuItem
                          key={v}
                          onSelect={() => setFutureSlots(v)}
                          className={futureSlots === v ? "bg-white/10" : ""}
                        >
                          {v === 0 ? "Off" : `+${v} min`}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div
              className={
                fullscreen
                  ? "fixed inset-0 z-50 flex flex-col bg-background/95 p-4 backdrop-blur-md sm:p-6"
                  : "overflow-hidden rounded-2xl border border-white/5 bg-black/15"
              }
            >
              {fullscreen && (
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Histórico — tela cheia
                    </p>
                    <h2 className="truncate text-lg font-semibold">{total} rodadas · horário de Brasília</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-foreground"
                    aria-label="Fechar tela cheia"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div
                className={
                  fullscreen
                    ? "min-h-0 flex-1 overflow-auto rounded-2xl border border-white/5 bg-black/20"
                    : ""
                }
                style={{ direction: inverse && viewMode === "colunas" ? "rtl" : "ltr" }}
              >


                {loading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico…
                  </div>
                ) : visibleSpins.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    {status === "error"
                      ? `Erro ao buscar histórico: ${errorMsg}`
                      : "Nenhum resultado no período selecionado."}
                  </div>
                ) : viewMode === "colunas" ? (
                  <div className="history-scroll w-full p-1 [container-type:inline-size] sm:p-3 lg:p-4">
                    <div className="flex flex-col gap-[var(--slot-gap,14px)]">

                      {gridRows.map((row) => (
                        <div key={row.key} className="flex flex-col gap-3">
                          <div className="grid justify-center gap-[var(--gap-col,8px)] relative px-[1px]" style={{ gridTemplateColumns: "repeat(10, var(--colW, 120px))", width: "1274px", margin: "0 auto" }}>
                            {/* Marcador de hora na lateral esquerda, visível apenas se Contar Linhas estiver ativo */}
                            {contarLinhas && (
                              <div className="absolute -left-12 top-1/2 -translate-y-1/2 rotate-180 [writing-mode:vertical-lr] text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase select-none">
                                {row.label}
                              </div>
                            )}
                            {row.cells.map((cell, ci) => {
                            const [hh, mmPrefix] = row.label.split(":");
                            const hm = `${hh}:${mmPrefix[0]}${ci}`;
                            const cellSignals = signalsByHM.get(hm) ?? [];
                            const green = cellSignals.find((s) => s.outcome === "green");
                            const pending = cellSignals.find((s) => s.outcome === "pending");
                            const red = cellSignals.find((s) => s.outcome === "red");
                            let badge: null | { label: string; tone: "exato" | "margem" | "pending" | "loss" } = null;
                            if (green) {
                              const diff = green.matchedIso
                                ? Math.abs(new Date(green.matchedIso).getTime() - new Date(green.targetIso).getTime())
                                : 0;
                              badge = diff <= 15_000
                                ? { label: "EXATO", tone: "exato" }
                                : { label: "MARGEM", tone: "margem" };
                            } else if (pending) {
                              badge = { label: "SINAL", tone: "pending" };
                            } else if (red) {
                              badge = { label: "LOSS", tone: "loss" };
                            }
                            const badgeCls =
                              badge?.tone === "exato" || badge?.tone === "pending"
                                ? "bg-emerald-500 text-black border border-emerald-300 shadow-[0_2px_8px_rgba(16,185,129,0.35)]"
                                : badge?.tone === "margem"
                                  ? "bg-amber-400 text-black border border-amber-200 shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
                                  : "bg-red-500 text-white border border-red-300 shadow-[0_2px_8px_rgba(239,68,68,0.35)]";
                            return (
                              <div
                                key={ci}
                                className="flex flex-col items-center justify-center"
                                style={{ width: "var(--colW, 120px)", height: "var(--cell-min-h, 66px)", direction: "ltr", gap: "var(--gap-col, 8px)" }}
                              >

                                <div className="flex flex-col items-center">
                                  <span className={`inline-flex h-3.5 items-center rounded-full px-1 text-[7px] font-black tracking-wider sm:h-4 sm:px-2 sm:text-[9px] ${badge ? badgeCls : "opacity-0 invisible"}`}>
                                    {badge?.label ?? "·"}
                                  </span>
                                  <div className="grid grid-cols-2 gap-[var(--gap-col,8px)]">
                                    {(cell.length >= 2
                                      ? [cell[0], cell[1]]
                                      : cell.length === 1
                                        ? [cell[0], undefined]
                                        : [undefined, undefined]
                                    ).map((spin, i) => {
                                      const slotKey = `${hm}-${i}`;
                                      if (spin) {
                                        return (
                                          <div key={(spin as Spin).id} className="flex flex-col items-center">
                                            <TipMinerCard
                                              spin={spin as Spin}
                                              highlightN={highlightN}
                                              numbered={numerado}
                                              showSeconds={exibirSegundos}
                                              timeHighlight={destaqueHorario}
                                              showTime={false}
                                              onClick={() =>
                                                setHighlightN((h) => {
                                                  const next = new Set(h);
                                                  const n = (spin as Spin).n;
                                                  if (next.has(n)) next.delete(n);
                                                  else next.add(n);
                                                  return next;
                                                })
                                              }
                                            />
                                            <span className={`text-[10px] tabular-nums leading-none ${destaqueHorario ? "font-bold text-primary" : "text-muted-foreground"}`}>
                                              {exibirSegundos ? spTimeWithSeconds(spin as Spin) : (spin as Spin).time}
                                            </span>
                                          </div>
                                        );
                                      }
                                      
                                      if (pending && i === 0) {
                                         return (
                                          <div key={`p-${ci}-${i}`} className="flex flex-col items-center gap-0.5">
                                            <div className="relative flex h-[var(--stone,52px)] w-[var(--stone,52px)] items-center justify-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-emerald-400/40">
                                              <img
                                                src={brancoTile.url}
                                                alt="Sinal"
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                              />
                                            </div>
                                            <span className="text-[10px] tabular-nums text-muted-foreground">
                                              {hm}
                                            </span>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div key={`e-${ci}-${i}`} className="flex flex-col items-center">
                                          <EmptySlot
                                            prediction={slotPredictions[slotKey]}
                                            onClick={() => cycleSlotPrediction(slotKey)}
                                          />
                                          <span className="select-none text-[10px] text-transparent">--:--</span>
                                        </div>
                                      );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  (() => {
                    return (
                       <div
                         className="history-scroll grid justify-center p-1 [--blaze-card-h:36px] [--blaze-card-w:42px] [--blaze-dot:24px] [--blaze-num:11px] [--blaze-time:10px] sm:p-3 sm:[--blaze-card-h:46px] sm:[--blaze-card-w:48px] sm:[--blaze-dot:28px] sm:[--blaze-num:12px] sm:[--blaze-time:11px] lg:p-4 lg:[--blaze-card-h:50px] lg:[--blaze-card-w:52px] lg:[--blaze-dot:30px] lg:[--blaze-num:13px] lg:[--blaze-time:12px]"
                         style={{
                           gridTemplateColumns:
                             `repeat(auto-fill, var(--blaze-card-w, ${BLAZE_CARD_W}px))`,
                           columnGap: "clamp(4px, 1.2vw, 8px)",
                           rowGap: "clamp(10px, 2vw, 18px)",
                           direction: inverse ? "rtl" : "ltr",
                         }}
                       >
                         {visibleSpins.map((spin, i) => {
                           const hasSel = highlightN.size > 0;
                           const hit = highlightN.has(spin.n);
                           return (
                             <div key={spin.id} style={{ direction: "ltr" }}>
                               <BlazeResultCard
                                 n={spin.n}
                                 color={spin.color}
                                 time={exibirSegundos ? spTimeWithSeconds(spin) : spin.time}
                                 numbered={numerado}
                                 timeHighlight={destaqueHorario}
                                 selected={hit}
                                 dimmed={hasSel && !hit}
                                 delay={i < 20 ? i * 0.015 : 0}
                                 onClick={() =>
                                   setHighlightN((h) => {
                                     const next = new Set(h);
                                     if (next.has(spin.n)) next.delete(spin.n);
                                     else next.add(spin.n);
                                     return next;
                                   })
                                 }
                               />
                             </div>
                           );
                         })}
                       </div>
                    );
                  })()
                )}

                {!loading && visibleSpins.length > 0 && (
                  <div className="mt-5 flex justify-center pb-4">
                    {hasMore ? (
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-white/[0.09] disabled:opacity-60"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                          </>
                        ) : (
                          <>+ Carregar mais {PAGE_SIZE} resultados</>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Fim do histórico do período.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>
      </main>
      )}



      <WhiteCelebration spin={whiteFlash} onClose={() => setWhiteFlash(null)} />
      <WhiteAlertToggleFx state={alertFx} onDone={() => setAlertFx(null)} />

      <LeftStatsDrawer
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        spins={visibleSpins}
      />
    </div>
  );
}

const TipMinerCard = memo(function TipMinerCard({
  spin,
  delay = 0,
  showTime = true,
  numbered = false,
  showSeconds = false,
  timeHighlight = false,
  highlightN,
  onClick,
}: {
  spin: Spin;
  delay?: number;
  showTime?: boolean;
  numbered?: boolean;
  showSeconds?: boolean;
  timeHighlight?: boolean;
  highlightN?: Set<number> | null;
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
  const hasSelection = !!highlightN && highlightN.size > 0;
  const isHit = !!highlightN && highlightN.has(spin.n);
  const isActive = !hasSelection || isHit;

  const delayStyle = delay > 0 ? { animationDelay: `${delay}s` } : undefined;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center justify-center overflow-hidden rounded-md shadow-sm transition-[transform,opacity] duration-200 hover:-translate-y-0.5 animate-in fade-in zoom-in-95 ${
          isHit ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
        style={{
          width: "var(--stone, 52px)",
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
              height: "30px", 
              width: "30px", 
              border: `3px solid ${ring}`, 
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
          className={`leading-none tabular-nums ${
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
    <div className="flex flex-col items-center gap-0.5">
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
          width: "var(--stone, 52px)",
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
              className="h-[calc(var(--stone-size,44px)*0.75)] w-[calc(var(--stone-size,44px)*0.75)] rounded-full"
              style={{ border: `2px solid ${ring}` }}
            />
          )
        ) : null}
      </button>
      <span
        className="select-none leading-none text-transparent"
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
