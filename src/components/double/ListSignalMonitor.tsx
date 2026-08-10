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
        
        // Find if the exact minute or minute+1 (G1) has passed
        const now = new Date().getTime();
        const twoMinutesAfter = signalTime + 120_000;

        if (now < signalTime) return signal; // Future signal

        // Strategy verification: 
        // Signal color is the first symbol (🔴 or ⚫️)
        // Check for Green: Match at target minute OR next minute (G1)
        const targetColor = signal.symbols.startsWith("🔴") ? 1 : (signal.symbols.startsWith("⚫️") ? 2 : 0);
        
        // Look for matching results in the window [signalTime, signalTime + 2min)
        const matches = latestResults.filter(r => {
          const resTime = new Date(r.created_at).getTime();
          // We look for a match in the minute of the signal OR the next minute (G1)
          // We use a small tolerance for the comparison to handle network/processing delays
          return resTime >= (signalTime - 30_000) && resTime < (signalTime + 120_000);
        });

        if (matches.length > 0) {
          // color 0 is White (⚪️), 1 is Red (🔴), 2 is Black (⚫️)
          const isGreen = matches.some(r => {
            const resultColor = Number(r.color);
            // Check if result matches signal color OR is White (protection)
            return resultColor === targetColor || resultColor === 0;
          });
          
          if (isGreen) {
            changed = true;
            return { ...signal, outcome: "green" as const };
          }
        }

        // If time has passed 2 minutes and no green, it's a red
        if (now > twoMinutesAfter) {
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
