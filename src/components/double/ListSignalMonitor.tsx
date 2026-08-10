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
        .select("roll, color, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!latestResults || latestResults.length === 0) return;

      let changed = false;
      const updatedSignals = currentSignals.map(signal => {
        if (signal.outcome && signal.outcome !== "pending") return signal;

        const spTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const now = new Date(spTimeStr).getTime();
        
        const signalDate = new Date(signal.entryDate);
        const signalTime = signalDate.getTime();
        
        // Window for validation: Target minute and next minute (Gale 1)
        // With expanded tolerance for late result recording
        const gale1EndTime = signalTime + 120_000;
        const expiryTime = gale1EndTime + 60_000;

        if (now < signalTime) return signal; // Future signal

        const targetColor = signal.symbols.startsWith("🔴") ? 1 : (signal.symbols.startsWith("⚫️") ? 2 : 0);
        
        // Find results in the window [signalTime, signalTime + 2min]
        // Expanded window to capture signals that might be delayed in database recording
        const matches = latestResults.filter(r => {
          const resDate = new Date(r.created_at);
          const resTimeInSP = new Date(resDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
          // Look from 1.5 min before to capture early rolls, and up to Gale 1 end
          return resTimeInSP >= (signalTime - 90_000) && resTimeInSP < (gale1EndTime + 30_000);
        });

        const isGreen = matches.some(r => {
          const resColor = Number(r.color);
          const resRoll = Number(r.roll);
          // Special case: Blaze result might have color 1/2 but roll 0 is white.
          // In Blaze, 0 is white. 1-7 is Red, 8-14 is Black.
          const isWhite = resColor === 0 || resRoll === 0;
          const isTarget = resColor === targetColor;
          
          return isTarget || isWhite;
        });

        if (isGreen) {
          console.log(`[ListSignalMonitor] Signal ${signal.time} is GREEN`, matches);
          changed = true;
          return { ...signal, outcome: "green" as const };
        }

        // Only mark as RED if the time window (G1) has fully passed + buffer
        if (now > expiryTime) {
          console.log(`[ListSignalMonitor] Signal ${signal.time} is RED`, matches);
          changed = true;
          return { ...signal, outcome: "red" as const };
        }

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
