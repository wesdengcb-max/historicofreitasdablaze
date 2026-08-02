import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MAX_GATILHOS = 10;
export const BRAZIL_TZ = "America/Sao_Paulo";

export type GatilhoRow = {
  id: string;
  analise: string;
  pedra: number;
  minuto: number;
  fuso_horario: string;
  trigger_at: string;
  detalhe: string | null;
  gaps: number[] | null;
};

export type GatilhoInput = {
  analise: string;
  pedra: number;
  minuto: number;
  trigger_at: string; // ISO absoluto
  detalhe: string;
  gaps: number[];
};

/**
 * Persiste os gatilhos da aba Análise no banco (janela FIFO de 10 por
 * análise/pedra), lê apenas os 10 mais recentes e escuta mudanças em
 * tempo real para refletir em todos os dispositivos.
 */
export function useGatilhos(analise: string, pedra: number, pending: GatilhoInput[]) {
  const [rows, setRows] = useState<GatilhoRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("gatilhos_analise")
      .select("id, analise, pedra, minuto, fuso_horario, trigger_at, detalhe, gaps")
      .eq("analise", analise)
      .eq("pedra", pedra)
      .order("trigger_at", { ascending: false })
      .limit(MAX_GATILHOS);
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setRows(((data ?? []) as GatilhoRow[]).slice().reverse());
  }, [analise, pedra]);

  // Carrega ao montar / trocar de pedra
  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: qualquer novo gatilho recarrega a janela de 10
  useEffect(() => {
    const channel = supabase
      .channel(`gatilhos-${analise}-${pedra}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gatilhos_analise" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [analise, pedra, load]);

  // Grava/atualiza os gatilhos detectados (últimos 10). O trigger no banco
  // apaga automaticamente qualquer registro além dos 10 mais recentes.
  useEffect(() => {
    if (pending.length === 0) return;
    const payload = pending.slice(-MAX_GATILHOS).map((g) => ({
      analise: g.analise,
      pedra: g.pedra,
      minuto: g.minuto,
      fuso_horario: BRAZIL_TZ,
      trigger_at: g.trigger_at,
      detalhe: g.detalhe,
      gaps: g.gaps,
    }));
    const signature = JSON.stringify(payload);
    if (signature === lastSent.get(`${analise}:${pedra}`)) return;
    lastSent.set(`${analise}:${pedra}`, signature);
    void (async () => {
      const { error: err } = await supabase
        .from("gatilhos_analise")
        .upsert(payload, {
          onConflict: "analise,pedra,trigger_at",
          // Atualiza os gaps do gatilho existente conforme novos "0" saem
          // (cada gatilho mantém seu próprio histórico até 14 ocorrências).
          ignoreDuplicates: false,
        });
      if (err) setError(err.message);
      else await load();
    })();
  }, [analise, pedra, pending, load]);

  return { rows, error };
}

// Evita reenviar o mesmo lote repetidamente entre re-renders.
const lastSent = new Map<string, string>();
