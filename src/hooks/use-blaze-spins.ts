import { useState, useEffect, useCallback, useRef } from "react";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { type Spin, colorOf, fmtTime } from "@/components/double/types";

const PAGE_SIZE = 300;
const POLL_MS = 5000;

type Row = {
  id: number;
  roll: string;
  color: string;
  created_at: string;
};

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

export function useBlazeSpins(range: { start: string | null; end: string | null; includesNow: boolean }, realtime: boolean = true) {
  const [spins, setSpins] = useState<Spin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  
  const seen = useRef<Set<string>>(new Set());

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
    try {
      const { data, error } = await buildQuery(0, PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const uniq = dedupeById(rows.map(rowToSpin));
      seen.current = new Set(uniq.map((r) => r.id));
      setSpins(uniq);
      setHasMore(rows.length === PAGE_SIZE);
      setStatus("live");
      setErrorMsg("");
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Falha ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    seen.current = new Set();
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = spins.length;
      const { data, error } = await buildQuery(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const newSpins = rows.map(rowToSpin);
      setSpins((prev) => {
        const merged = dedupeById([...prev, ...newSpins]);
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

  // Realtime subscription
  useEffect(() => {
    if (!realtime || !range.includesNow) return;
    
    const channel = supabase
      .channel("blaze_spins_realtime")
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
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [range.includesNow, range.start, range.end, realtime]);

  // Polling as fallback and background processing
  useEffect(() => {
    if (!range.includesNow || !realtime) return;
    
    const poll = async () => {
      try {
        const { data, error } = await buildQuery(0, 50); // Just check first 50
        if (error) throw error;
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
        setStatus("error");
      }
    };

    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [buildQuery, range.includesNow, realtime]);

  return { spins, loading, loadingMore, hasMore, status, errorMsg, loadMore };
}
