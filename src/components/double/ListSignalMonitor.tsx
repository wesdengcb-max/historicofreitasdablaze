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
        .limit(50);

      if (!latestResults || latestResults.length === 0) return;

      let changed = false;
      const updatedSignals = currentSignals.map(signal => {
        if (signal.outcome && signal.outcome !== "pending") return signal;

        const signalDate = new Date(signal.entryDate);
        const signalTime = signalDate.getTime();
        
        const now = new Date().getTime();
        // Give it 2 minutes + 30s buffer to account for the result being recorded
        const twoMinutesAfter = signalTime + 120_000;
        const expiryTime = twoMinutesAfter + 30_000;

        if (now < signalTime) return signal; // Future signal

        const targetColor = signal.symbols.startsWith("🔴") ? 1 : (signal.symbols.startsWith("⚫️") ? 2 : 0);
        
        // Find results in the window [signalTime, signalTime + 2min]
        // We include a 30s lead buffer in case of minor timestamp drifts in the DB
        const matches = latestResults.filter(r => {
          const resTime = new Date(r.created_at).getTime();
          return resTime >= (signalTime - 30_000) && resTime < twoMinutesAfter;
        });

        if (matches.length > 0) {
          const isGreen = matches.some(r => {
            const resColor = Number(r.color);
            return resColor === targetColor || resColor === 0;
          });
          
          if (isGreen) {
            changed = true;
            return { ...signal, outcome: "green" as const };
          }
        }

        // Only mark as RED if the time window (G1) has fully passed + buffer
        if (now > expiryTime) {
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
