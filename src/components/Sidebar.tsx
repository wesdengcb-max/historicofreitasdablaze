import { memo } from "react";
import { 
  LayoutDashboard, 
  BarChart3, 
  Radio, 
  Network, 
  PlayCircle, 
  Activity, 
  Flame, 
  Bell, 
  ShieldCheck, 
  Dice5,
  Lock,
  Crown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { setSection, useSection, type SectionId } from "@/lib/sectionStore";
import { useVipStatus } from "@/lib/auth/vipStore";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useSidebarStore } from "@/lib/sidebarStore";
import { cn } from "@/lib/utils";

type MenuItem = {
  id: SectionId | "notificador" | "validador" | "simulador";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeClass?: string;
  isTool?: boolean;
  soon?: boolean;
};

const NAVEGACAO: MenuItem[] = [
  { id: "dashboard", title: "Histórico", icon: LayoutDashboard },
  { id: "analise", title: "Análise", icon: BarChart3, badge: "NOVO", badgeClass: "bg-emerald-500 text-black" },
  { id: "sinais", title: "Sinais", icon: Radio },
  { id: "estrategias", title: "Estratégias", icon: Network },
  { id: "videos", title: "Vídeos", icon: PlayCircle },
  { id: "blaze", title: "Blaze Dashboard", icon: Activity },
  { id: "hostman", title: "Hostman Branco", icon: Flame, badge: "NOVO", badgeClass: "bg-red-500 text-white" },
];

const FERRAMENTAS: MenuItem[] = [
  { id: "notificador", title: "Notificador", icon: Bell, isTool: true },
  { id: "validador", title: "Validador de Padrão", icon: ShieldCheck, isTool: true },
  { id: "simulador", title: "Simulador", icon: Dice5, isTool: true, soon: true },
];

import logoFreitas from "@/assets/logo-freitas.png.asset.json";

export const Sidebar = memo(function Sidebar() {

  const active = useSection();
  const isVip = useVipStatus();
  const { isCollapsed, toggle } = useSidebarStore();

  const handleItemClick = (item: MenuItem) => {
    if (item.soon) return;
    
    // Tools logic would typically open a modal or scroll to section
    if (item.isTool) {
       toast.info(`Abrindo ${item.title}...`);
       return;
    }

    if (item.id !== "dashboard" && item.id !== "videos" && !isVip) {
      toast.error("Área Exclusiva", {
        description: "Você precisa ser Membro VIP para acessar esta aba.",
      });
      return;
    }
    setSection(item.id as SectionId);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/5 bg-[#0A0A0A]">
      {/* Profile / Logo Section */}
      <div className="flex flex-col items-center px-6 py-8">
        <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full border-2 border-red-500/20 p-1">
          <div className="h-full w-full rounded-full bg-gradient-to-b from-red-500 to-red-900 flex items-center justify-center overflow-hidden">
             <img src={logoFreitas.url} alt="Freitas" className="h-full w-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 rounded-full bg-red-500 p-1 shadow-lg">
             <Crown className="h-3 w-3 text-white" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-black tracking-tight text-white font-outfit">Freitas da Blaze</h2>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500 uppercase tracking-widest">VIP</span>
            <span className="text-[11px] text-muted-foreground">Analista Premium</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-8 scrollbar-none">
        {/* Navegação Group */}
        <div>
          <h3 className="mb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Navegação</h3>
          <div className="space-y-1">
            {NAVEGACAO.map((item) => (
              <SidebarItem 
                key={item.id} 
                item={item} 
                active={active === item.id} 
                isVip={isVip} 
                onClick={() => handleItemClick(item)} 
              />
            ))}
          </div>
        </div>

        {/* Ferramentas Group */}
        <div>
          <h3 className="mb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Ferramentas</h3>
          <div className="space-y-1">
            {FERRAMENTAS.map((item) => (
              <SidebarItem 
                key={item.id} 
                item={item} 
                active={false} 
                isVip={isVip} 
                onClick={() => handleItemClick(item)} 
              />
            ))}
          </div>
        </div>
      </nav>

      {/* VIP Upgrade Card */}
      <div className="p-4">
        <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-5 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-red-500/10 p-2">
              <Crown className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Seja VIP</h4>
          <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">Tenha acesso total a todas as ferramentas e recursos exclusivos.</p>
          <button className="mt-4 w-full rounded-xl bg-red-500 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-red-600 active:scale-95 shadow-[0_4px_15px_rgba(239,68,68,0.3)]">
            Quero ser VIP
          </button>
        </div>
      </div>
    </aside>
  );
});

function SidebarItem({ item, active, isVip, onClick }: { item: MenuItem; active: boolean; isVip: boolean; onClick: () => void }) {
  const Icon = item.icon;
  const isLocked = !item.isTool && item.id !== "dashboard" && item.id !== "videos" && !isVip;

  return (
    <button
      onClick={onClick}
      disabled={item.soon}
      className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
        active 
          ? "bg-red-500/10 text-white shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]" 
          : "text-muted-foreground hover:bg-white/[0.03] hover:text-white"
      } ${item.soon ? "opacity-40 cursor-not-allowed" : ""} ${isLocked ? "opacity-60" : ""}`}
    >
      <div className="relative">
        <Icon className={`h-4 w-4 ${active ? "text-red-500" : "group-hover:text-white"}`} />
        {isLocked && (
          <div className="absolute -right-1 -top-1 rounded-full bg-black/80 p-0.5">
            <Lock className="h-2 w-2 text-red-500" />
          </div>
        )}
      </div>
      <span className="flex-1 text-left text-[12px]">{item.title}</span>
      {item.badge && (
        <Badge className={`h-4 px-1.5 py-0 text-[8px] font-black tracking-widest ${item.badgeClass}`}>
          {item.badge}
        </Badge>
      )}
      {item.soon && (
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground">BREVE</span>
      )}
      {active && (
        <div className="h-1 w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
      )}
    </button>
  );
}
