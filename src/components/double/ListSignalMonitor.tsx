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
        
        // IMPORTANT: The validation must only respect results that happened AFTER the signal generation timestamp
        const signalGenerationTime = signal.generatedAt;
        
        // Find results strictly within the Signal + Gale 1 window AND AFTER the signal was generated
        const allRelevantResults = latestResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          
          // Must be within the window [signalStartTime, gale1EndTime)
          const inWindow = resTimeInSP >= signalStartTime && resTimeInSP < gale1EndTime;
          // AND Must be strictly AFTER the moment the signal was generated
          const afterGeneration = resTimeInSP > signalGenerationTime;
          
          return inWindow && afterGeneration;
        });

        const resultsBeforeSignal = latestResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          return resTimeInSP >= signalStartTime && resTimeInSP <= signalGenerationTime;
        });

        console.log(`\n[SINAL]
horário exibido: ${signal.time}
timestamp exato do sinal: ${signalGenerationTime} (${new Date(signalGenerationTime).toISOString()})
cor esperada: ${targetColorName} (${targetColor})`);

        console.log(`[RESULTADOS ANTERIORES AO SINAL]`);
        if (resultsBeforeSignal.length === 0) {
          console.log("(Nenhum resultado anterior encontrado na janela)");
        }
        resultsBeforeSignal.forEach(r => {
          console.log(`ID: ${r.id} | created_at: ${r.created_at} | roll: ${r.roll} | color: ${r.color} -> IGNORADO (Anterior ao sinal)`);
        });

        console.log(`[RESULTADOS POSTERIORES AO SINAL]`);
        if (allRelevantResults.length === 0) {
          console.log("(Nenhum resultado posterior encontrado na janela até agora)");
        }
        allRelevantResults.forEach(r => {
          console.log(`ID: ${r.id} | created_at: ${r.created_at} | roll: ${r.roll} | color: ${r.color} -> USADO NA VALIDAÇÃO`);
        });

        // Split into Sinal and Gale 1 for specific logging if needed
        const signalResults = allRelevantResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          return resTimeInSP < signalEndTime;
        });

        const gale1Results = allRelevantResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          return resTimeInSP >= signalEndTime;
        });

        // 1. Check if ANY result is GREEN (Target color or White protection)
        const greenResult = allRelevantResults.find(r => {
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
          if (allRelevantResults.length > 0) {
            console.log(`[RESULTADO DA VALIDAÇÃO]
status: RED
motivo: Janela G1 finalizada. ${allRelevantResults.length} resultado(s) analisado(s) e nenhum correspondeu à cor esperada.`);
          } else {
            console.log(`[RESULTADO DA VALIDAÇÃO]
status: RED
motivo: Prazo máximo expirado sem nenhum registro de resultado posterior ao sinal no banco.`);
          }
          changed = true;
          return { ...signal, outcome: "red" as const };
        }

        // 3. Otherwise WAIT
        console.log(`[RESULTADO DA VALIDAÇÃO]
status: WAIT
motivo: Aguardando processamento da janela (Sinal/Gale 1). Resultados atuais não conferem.`);
        return signal;

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
