import { memo } from "react";
import { ResultCircle } from "./ResultCircle";
import { colorOf, type Spin } from "./types";
import { cn } from "@/lib/utils";
import blazeLogo from "@/assets/freitas-logo.jpg.asset.json";

interface StatsRowProps {
  label: string;
  value?: string | number;
  valueColor?: string;
  children?: React.ReactNode;
  className?: string;
}

const StatsRow = ({ label, value, valueColor, children, className }: StatsRowProps) => (
  <div className={cn("flex flex-col gap-2 rounded-xl bg-[#0c0c0c] border border-white/5 p-4", className)}>
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {value !== undefined && (
        <span className={cn("text-[11px] font-bold tabular-nums", valueColor || "text-yellow-500")}>
          {typeof value === "number" && label.includes("Pessoas") ? `→ ${value}` : value}
        </span>
      )}
    </div>
    {children}
  </div>
);

export const LiveStats = memo(function LiveStats({ 
  total, 
  reds, 
  blacks, 
  whites,
  redPct,
  blackPct,
  whitePct 
}: { 
  total: number;
  reds: number;
  blacks: number;
  whites: number;
  redPct: number;
  blackPct: number;
  whitePct: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Plataforma Atual */}
      <StatsRow label="Plataforma Atual" className="flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex items-center gap-2">
             <img src={blazeLogo.url} alt="Blaze" className="h-8 w-8 rounded-lg object-cover" />
             <span className="text-xl font-black italic tracking-tighter text-white">blaze</span>
          </div>
          <div className="flex gap-2">
            <button className="rounded border border-red-500/50 bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-red-500/20">
              Blaze.com
            </button>
            <button className="rounded border border-red-500/50 bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-red-500/20">
              Double
            </button>
          </div>
        </div>
      </StatsRow>

      {/* Pessoas Entrando */}
      <StatsRow label="Pessoas Entrando" value={Math.floor(700 + Math.random() * 200)}>
        <div className="grid grid-cols-3 gap-2 py-1">
          {[
            { color: "red", count: reds, val: "R$ 2.036,35" },
            { color: "white", count: whites, val: "R$ 4.432,03" },
            { color: "black", count: blacks, val: "R$ 1.112,80" }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-white bg-black/40 px-1.5 rounded">{item.count}</span>
              <ResultCircle color={item.color as any} n={item.color === "white" ? undefined : 0} size="sm" animate={false} />
              <span className="text-[8px] font-medium text-muted-foreground">{item.val}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
          <span className="text-[9px] text-muted-foreground italic">Entradas Abertas...</span>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
      </StatsRow>

      {/* Proporção de Cores */}
      <StatsRow label="Proporção de Cores" value={`(${total} Rodadas)`} valueColor="text-red-500">
        <div className="grid grid-cols-3 gap-2 py-1">
          {[
            { color: "red", count: reds, pct: redPct },
            { color: "white", count: whites, pct: whitePct },
            { color: "black", count: blacks, pct: blackPct }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-white bg-black/40 px-1.5 rounded">{item.count} X</span>
              <ResultCircle color={item.color as any} n={item.color === "white" ? undefined : 0} size="sm" animate={false} />
              <span className="text-[9px] font-bold text-white">{item.pct.toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-white/5 pt-2 text-center">
          <span className="text-[9px] font-medium text-muted-foreground">
            <span className="text-white">Quantidade</span> e <span className="text-white">Porcentagem</span> das cores na tela.
          </span>
        </div>
      </StatsRow>

      {/* Puxadas */}
      <StatsRow label="Puxadas">
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-red-500 mb-1">7 Casts</span>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <ResultCircle color="red" n={0} size="xs" animate={false} />
                <span className="text-[8px] mt-1">3 X</span>
              </div>
              <div className="flex flex-col items-center">
                <ResultCircle color="black" n={0} size="xs" animate={false} />
                <span className="text-[8px] mt-1">3 X</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-red-500 mb-1">8 Casais atuais</span>
            <div className="flex gap-2">
              <ResultCircle color="white" size="xs" animate={false} />
              <ResultCircle color="red" n={0} size="xs" animate={false} />
              <ResultCircle color="red" n={0} size="xs" animate={false} />
              <ResultCircle color="black" n={0} size="xs" animate={false} />
            </div>
          </div>
        </div>
        <div className="mt-1 border-t border-white/5 pt-2 text-center">
          <span className="text-[9px] font-medium text-muted-foreground">
            <span className="text-white">Quantidade</span> de os puxadas.
          </span>
        </div>
      </StatsRow>
    </div>
  );
});
