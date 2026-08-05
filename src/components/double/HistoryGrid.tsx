import { memo, useMemo } from "react";
import { type Spin, colorOf } from "@/components/double/types";
import { BlazeResultCard } from "@/components/double/BlazeResultCard";
import { spTimeWithSeconds } from "@/lib/date-utils";

type GridRow = { key: string; label: string; order: number; cells: Spin[][] };

interface HistoryGridProps {
  spins: Spin[];
  numerado: boolean;
  exibirSegundos: boolean;
  inverse: boolean;
}

export const HistoryGrid = memo(({ spins, numerado, exibirSegundos, inverse }: HistoryGridProps) => {
  const gridRows = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const rowMap = new Map<string, GridRow>();
    
    for (const s of spins) {
      const raw = (s.createdAt ?? "").trim();
      if (!raw) continue;
      const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
      const d = new Date(hasTz ? raw : `${raw.replace(" ", "T")}Z`);
      if (Number.isNaN(d.getTime())) continue;
      
      const parts = formatter.formatToParts(d);
      const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
      const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
      const tens = Math.floor(minute / 10);
      const unit = minute % 10;
      const key = `${hour}:${tens}`;
      
      let row = rowMap.get(key);
      if (!row) {
        row = {
          key,
          label: `${String(hour).padStart(2, "0")}:${tens}0`,
          order: hour * 6 + tens,
          cells: Array.from({ length: 10 }, () => []),
        };
        rowMap.set(key, row);
      }
      row.cells[unit].push(s);
    }

    const rows = Array.from(rowMap.values());
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.length > 1) {
          cell.sort((a, b) => {
            const at = new Date(a.createdAt ?? "").getTime();
            const bt = new Date(b.createdAt ?? "").getTime();
            return (Number.isFinite(at) ? at : 0) - (Number.isFinite(bt) ? bt : 0);
          });
        }
      }
    }
    return rows.sort((a, b) => inverse ? a.order - b.order : b.order - a.order);
  }, [spins, inverse]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-surface/30 backdrop-blur-sm">
      <div className="min-w-[1240px] p-4">
         {/* Column Headers 0-9 */}
         <div className="grid grid-cols-[80px_1fr] mb-2 border-b border-white/5 pb-2">
            <div />
            <div className="grid grid-cols-10 text-center">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{i}</div>
              ))}
            </div>
         </div>

         <div className="space-y-4">
           {gridRows.map(row => (
             <div key={row.key} className="grid grid-cols-[80px_1fr] items-start gap-4">
                <div className="sticky left-0 py-2 text-[11px] font-black text-white/40 font-mono tracking-tighter">
                  {row.label}
                </div>
                <div className="grid grid-cols-10 gap-x-3">
                  {row.cells.map((cell, idx) => (
                    <div key={idx} className="flex flex-col gap-2 min-w-[110px] items-center p-1.5 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">
                       <div className="flex flex-wrap gap-2 justify-center">
                         {cell.map(spin => (
                           <BlazeResultCard 
                              key={spin.id} 
                              n={spin.n}
                              color={colorOf(spin.n)}
                              time={exibirSegundos ? spTimeWithSeconds(spin) : (spin.time || "00:00")}
                              numbered={numerado} 
                           />
                         ))}
                       </div>
                    </div>
                  ))}
                </div>


                    </div>
                  ))}
                </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
});
