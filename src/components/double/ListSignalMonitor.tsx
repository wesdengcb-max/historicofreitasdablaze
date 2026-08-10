import { useEffect, useState } from "react";
import { getProximaListaSignals, setProximaListaSignals, type ProximaListaSignal } from "@/lib/signalsStore";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";

export function ListSignalMonitor() {
  const [signals, setSignals] = useState<ProximaListaSignal[]>([]);

  useEffect(() => {
    // Initial load
    setSignals(getProximaListaSignals());

    // Listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "freitas.proxima.lista") {
        setSignals(getProximaListaSignals());
      }
    };
    window.addEventListener("storage", handleStorage);
    
    // Check signals against new results periodically
    const interval = setInterval(async () => {
      const currentSignals = getProximaListaSignals();
      if (currentSignals.length === 0) return;

      const pendingSignals = currentSignals.filter(s => s.outcome === "pending" || !s.outcome);
      if (pendingSignals.length === 0) return;

      // Get latest results to verify signals
      const { data: latestResults } = await supabase
        .from("blaze_results")
        .select("id, roll, color, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!latestResults || latestResults.length === 0) return;

      let changed = false;
      const updatedSignals = currentSignals.map(signal => {
        if (signal.outcome && signal.outcome !== "pending") return signal;

        const spTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const now = new Date(spTimeStr).getTime();
        
        const signalDate = new Date(signal.entryDate);
        const signalTime = signalDate.getTime();
        
        // Window for validation: Target minute and next minute (Gale 1)
        const gale1EndTime = signalTime + 120_000;
        const expiryTime = gale1EndTime + 60_000;

        if (now < signalTime) return signal; // Future signal

        const targetColor = signal.symbols.startsWith("🔴") ? 1 : (signal.symbols.startsWith("⚫️") ? 2 : 0);
        const targetColorName = targetColor === 1 ? "VERMELHO" : (targetColor === 2 ? "PRETO" : "BRANCO");
        
        // Find results in the window [signalTime, signalTime + 2min)
        const matches = latestResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          // Strict interval association: timestamp must be within the signal minute or Gale minute
          return resTimeInSP >= signalTime && resTimeInSP < gale1EndTime;
        });

        console.log(`\n[SINAL]
horário do sinal: ${signal.time}
cor/pedra esperada: ${targetColorName} (${targetColor})`);

        console.log(`[RESULTADOS USADOS NA VALIDAÇÃO]`);
        matches.forEach(r => {
          console.log(`timestamp: ${r.created_at}
cor: ${r.color}
número: ${r.roll}
id: ${r.id}`);
        });

        // 1. Check for GREEN first
        const greenResult = matches.find(r => {
          const resColor = Number(r.color);
          const resRoll = Number(r.roll);
          const isWhite = resColor === 0 || resRoll === 0;
          return resColor === targetColor || isWhite;
        });

        if (greenResult) {
          console.log(`[VALIDAÇÃO]
resultado: GREEN
motivo: Encontrado resultado compatível (ID: ${greenResult.id}).`);
          changed = true;
          return { ...signal, outcome: "green" as const };
        }

        // 2. Determine if it's RED
        // Rule: Only mark RED if the window is expired OR we have contrary results and window for Gale is done
        const hasPassedGale = now > expiryTime;
        
        // If we have results but none are green, and we have reached the end of the second minute (Gale 1)
        if (hasPassedGale && matches.length > 0) {
          console.log(`[VALIDAÇÃO]
resultado: RED
motivo: Janela (incluindo Gale 1) encerrada com resultados contrários.`);
          changed = true;
          return { ...signal, outcome: "red" as const };
        }

        // 3. Fallback to RED on timeout even with no matches (Rule 14)
        if (hasPassedGale) {
          console.log(`[VALIDAÇÃO]
resultado: RED
motivo: Prazo máximo expirado sem confirmação.`);
          changed = true;
          return { ...signal, outcome: "red" as const };
        }

        // 4. Otherwise stay WAIT
        console.log(`[VALIDAÇÃO]
resultado: WAIT
motivo: Aguardando resultados compatíveis na janela.`);
        return signal;
      });

      if (changed) {
        setProximaListaSignals(updatedSignals);
        setSignals(updatedSignals);
      }
    }, 10000); // Check every 10s

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  return null; // Background component
}
