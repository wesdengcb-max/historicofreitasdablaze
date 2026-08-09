import { memo } from "react";
import { ChevronLeft, Menu, Clock, Crown } from "lucide-react";
import { useVipStatus, setVipStatus } from "@/lib/auth/vipStore";
import { toast } from "sonner";

export const AppHeader = memo(function AppHeader() {
  const isVip = useVipStatus();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-white/5 bg-[#080808] px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pr-4">
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            <Dice5 className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-black uppercase tracking-tighter text-white font-outfit">Freitas da Blaze</span>
        </div>
        
        <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] text-muted-foreground transition hover:bg-white/[0.06] hover:text-white">
          <Menu className="h-4 w-4" />
        </button>
        
        <div className="h-5 w-px bg-white/5 mx-1" />
        
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 font-outfit">Análise em tempo real</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 sm:flex border border-white/5">
          <Clock className="h-3.5 w-3.5 text-red-500" />
          <span className="text-[11px] font-bold tabular-nums text-white/90">
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <button 
          onClick={() => {
            const next = !isVip;
            setVipStatus(next);
            toast.success(next ? "Modo VIP Ativado" : "Modo VIP Desativado");
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition active:scale-95 ${
            isVip 
              ? "bg-red-600 text-white shadow-[0_4px_15px_rgba(220,38,38,0.3)]"
              : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
          }`}
        >
          <Crown className="h-3 w-3" />
          <span>VIP</span>
        </button>
      </div>
    </header>
  );
});
