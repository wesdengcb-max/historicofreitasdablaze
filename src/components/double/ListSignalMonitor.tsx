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

        // Current time in SP for expiry checks
        const spTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const now = new Date(spTimeStr).getTime();
        
        // Signal time is already in SP (from generateProximaLista)
        const signalDate = new Date(signal.entryDate);
        const signalStartTime = signalDate.getTime();
        
        // Strategy: Signal Minute (0-59s) + Gale 1 Minute (60-119s)
        const signalEndTime = signalStartTime + 60_000;
        const gale1EndTime = signalStartTime + 120_000;
        const expiryTime = gale1EndTime + 30_000; // 30s buffer to ensure DB has recorded Gale 1 rolls

        if (now < signalStartTime) return signal; // Future signal

        const targetColor = signal.symbols.startsWith("🔴") ? 1 : (signal.symbols.startsWith("⚫️") ? 2 : 0);
        const targetColorName = targetColor === 1 ? "VERMELHO" : (targetColor === 2 ? "PRETO" : "BRANCO");
        
        // Find ALL results strictly within the Signal + Gale 1 window
        const signalResults = latestResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          return resTimeInSP >= signalStartTime && resTimeInSP < signalEndTime;
        });

        const gale1Results = latestResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          return resTimeInSP >= signalEndTime && resTimeInSP < gale1EndTime;
        });

        const allResults = [...signalResults, ...gale1Results];

        console.log(`\n[SINAL]
horário exato do sinal: ${signal.time}
cor esperada: ${targetColorName} (${targetColor})
timestamp início janela: ${new Date(signalStartTime).toISOString()}
timestamp fim janela (G1): ${new Date(gale1EndTime).toISOString()}`);

        console.log(`[RESULTADOS ENCONTRADOS]`);
        if (allResults.length === 0) {
          console.log("(Nenhum resultado encontrado até agora)");
        }
        allResults.forEach(r => {
          console.log(`ID: ${r.id} | created_at: ${r.created_at} | roll: ${r.roll} | color: ${r.color}`);
        });

        // 1. Check if ANY result is GREEN (Target color or White protection)
        const greenResult = allResults.find(r => {
          const resColor = Number(r.color);
          const resRoll = Number(r.roll);
          const isWhite = resColor === 0 || resRoll === 0;
          return resColor === targetColor || isWhite;
        });

        if (greenResult) {
          console.log(`[RESULTADO DA VALIDAÇÃO]
status: GREEN
motivo: Sucesso encontrado no resultado ID ${greenResult.id} (Cor: ${greenResult.color}, Roll: ${greenResult.roll})`);
          changed = true;
          return { ...signal, outcome: "green" as const };
        }

        // 2. Determine if it's RED
        // A signal is RED only if the Gale 1 window has fully passed AND we have confirmed results that weren't the target.
        const galeHasFinished = now > expiryTime;
        
        if (galeHasFinished) {
          if (allResults.length > 0) {
            console.log(`[RESULTADO DA VALIDAÇÃO]
status: RED
motivo: Janela G1 finalizada. ${allResults.length} resultado(s) analisado(s) e nenhum correspondeu à cor esperada.`);
          } else {
            console.log(`[RESULTADO DA VALIDAÇÃO]
status: RED
motivo: Prazo máximo expirado sem nenhum registro de resultado no banco.`);
          }
          changed = true;
          return { ...signal, outcome: "red" as const };
        }

        // 3. Otherwise WAIT
        console.log(`[RESULTADO DA VALIDAÇÃO]
status: WAIT
motivo: Aguardando processamento da janela (Sinal/Gale 1). Resultados atuais não conferem.`);
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
