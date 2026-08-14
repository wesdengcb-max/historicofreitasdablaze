import { memo } from "react";
import { ChevronLeft, Menu, Clock, Crown, PanelLeftOpen, PanelLeftClose, BarChart3 } from "lucide-react";
import { useVipStatus, setVipStatus } from "@/lib/auth/vipStore";
import { useSidebarStore } from "@/lib/sidebarStore";
import { toast } from "sonner";

export const AppHeader = memo(function AppHeader() {
  const isVip = useVipStatus();
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#0A0A0A]/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#1A1A1A] text-white transition hover:bg-red-500 shadow-2xl ring-2 ring-black/80 group"
        >
          <div className="flex items-center justify-center transition-transform group-active:scale-90">
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </div>
        </button>
        
        <div className="h-6 w-px bg-white/5 mx-2" />
        
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white font-outfit">Análise em tempo real (Últimos 6 Gatilhos)</span>
        </div>

        <button
          onClick={() => {
            const ev = new CustomEvent('open-stats-drawer');
            window.dispatchEvent(ev);
          }}
          className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-all hover:bg-white/[0.08] hover:text-red-500 active:scale-95"
          title="Ver Estatísticas do Branco"
        >
          <BarChart3 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-2 sm:flex">
          <Clock className="h-3.5 w-3.5 text-red-500" />
          <span className="text-[12px] font-bold tabular-nums text-white">16:39:49</span>
        </div>

        <button 
          onClick={() => {
            const next = !isVip;
            setVipStatus(next);
            toast.success(next ? "Modo VIP Ativado" : "Modo VIP Desativado");
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest transition active:scale-95 ${
            isVip 
              ? "bg-red-500 text-white shadow-[0_4px_15px_rgba(239,68,68,0.3)]"
              : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
          }`}
        >
          <Crown className="h-3.5 w-3.5" />
          <span>VIP</span>
        </button>
      </div>
    </header>
  );
});
