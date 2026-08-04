import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Flame,
  Radio,
  Network,
  PlayCircle,
  Activity,
  Crown,
  Lock,
  Sun,
  Moon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { setSection, useSection, type SectionId } from "@/lib/sectionStore";
import { useVipStatus, setVipStatus } from "@/lib/auth/vipStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";


type Item = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeClass?: string;
};

const ITEMS: Item[] = [
  { id: "dashboard", title: "Histórico", icon: LayoutDashboard },
  { id: "analise", title: "Análise", icon: BarChart3, badge: "NOVO", badgeClass: "bg-emerald-500 text-black" },
  { id: "sinais", title: "Sinais", icon: Radio },
  { id: "estrategias", title: "Estratégias", icon: Network },
  { id: "videos", title: "Vídeos", icon: PlayCircle },
  { id: "blaze", title: "Blaze Dashboard", icon: Activity },
  { id: "hostman", title: "Hostman Branco", icon: Flame, badge: "NOVO", badgeClass: "bg-red-500 text-white" },
];

export function TopNav() {
  const active = useSection();
  const isVip = useVipStatus();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setIsDark(!isLight);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
      }
      return next;
    });
  }, []);

  const handleSectionClick = (item: Item) => {
    // Only dashboard is public, others require VIP
    if (item.id !== "dashboard" && !isVip) {
      toast.error("Área Exclusiva", {
        description: "Você precisa ser Membro VIP para acessar esta aba.",
      });
      return;
    }
    setSection(item.id);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#101114]/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1366px] items-center justify-between px-3 py-2 sm:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const isLocked = item.id !== "dashboard" && !isVip;

            return (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition sm:text-xs font-outfit ${
                  isActive
                    ? "bg-[#FF1F3D]/10 border border-[#FF1F3D]/30 text-white shadow-[0_0_15px_rgba(255,31,61,0.1)]"
                    : "border border-transparent text-[#9CA3AF] hover:bg-white/[0.03] hover:text-white"
                } ${isLocked ? "opacity-60" : ""}`}
              >
                <div className="relative">
                  <Icon className="h-3.5 w-3.5" />
                  {isLocked && (
                    <div className="absolute -right-1 -top-1 rounded-full bg-black/80 p-0.5">
                      <Lock className="h-2 w-2 text-[#FF1F3D]" />
                    </div>
                  )}
                </div>
                <span className="whitespace-nowrap">{item.title}</span>
                {item.badge && (
                  <Badge
                    className={`ml-1 h-4 px-1.5 py-0 font-mono text-[9px] tracking-widest ${item.badgeClass}`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-4 flex shrink-0 items-center gap-2 pr-10 sm:pr-12">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-all hover:bg-white/10 light:border-black/10 light:bg-black/5"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                  isVip
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 light:border-black/10 light:bg-black/5"
                }`}
              >
                <Crown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#101114] light:bg-white light:border-black/10">
              <div className="px-2 py-2">
                <p className="font-outfit text-xs font-black uppercase tracking-widest text-[#FF1F3D]">
                  Membro VIP
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isVip
                    ? "Assinatura ativa. Aproveite os recursos premium."
                    : "Desbloqueie todas as análises e sinais exclusivos."}
                </p>
              </div>
              <DropdownMenuItem
                onClick={() => {
                  const next = !isVip;
                  setVipStatus(next);
                  toast.success(next ? "Modo VIP Ativado" : "Modo VIP Desativado", {
                    description: next 
                      ? "Agora você tem acesso total ao sistema." 
                      : "Recursos premium foram bloqueados.",
                  });
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 font-bold text-white light:text-black focus:bg-[#FF1F3D]/20 focus:text-white light:focus:text-black"
              >
                <Crown className={`h-4 w-4 ${isVip ? "text-amber-400" : ""}`} />
                <span>{isVip ? "Desativar VIP (Demo)" : "Ativar VIP (Demo)"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

