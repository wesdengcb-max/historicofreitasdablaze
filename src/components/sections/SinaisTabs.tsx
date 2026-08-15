import { useState } from "react";
import { cn } from "@/lib/utils";
import { Radio, BarChart3, Target, Layers, ShieldCheck } from "lucide-react";
import { PredictiveSignals } from "@/components/double/PredictiveSignals";
import { Card } from "@/components/double/Card";
import { Button } from "@/components/ui/button";

export function SinaisTabs({ activeTab, setActiveTab }: { activeTab: 'sinais' | 'analises', setActiveTab: (tab: 'sinais' | 'analises') => void }) {
  return (
    <div className="flex rounded-lg bg-black/40 p-1 border border-white/5 w-fit">
      <button
        onClick={() => setActiveTab('sinais')}
        className={cn(
          "px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-2",
          activeTab === 'sinais' ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
        )}
      >
        <Radio className="h-3.5 w-3.5" />
        Sinais
      </button>
      <button
        onClick={() => setActiveTab('analises')}
        className={cn(
          "px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-2",
          activeTab === 'analises' ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
        )}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Análises
      </button>
    </div>
  );
}

export function AnalysesTab({ topStrategies, auditStats }: any) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topStrategies.map((strat: any, i: number) => (
          <Card key={i} className="p-5 border-primary/20 bg-primary/[0.02]">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
              {strat.analise.replace("Analise", "Estratégia ")}
            </div>
            <div className="text-3xl font-black text-primary font-outfit">{strat.pct.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">Assertividade ({strat.wins}/{strat.total} Wins)</div>
          </Card>
        ))}
      </div>
      {/* Aqui viriam os detalhes de A8/A9 conforme necessário */}
    </div>
  );
}
