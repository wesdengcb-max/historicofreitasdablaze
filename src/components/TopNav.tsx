import {
  LayoutDashboard,
  BarChart3,
  Flame,
  Radio,
  Network,
  PlayCircle,
  Activity,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type SectionId } from "@/lib/sectionStore";

type Item = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeClass?: string;
  isVip?: boolean;
};

const ITEMS: Item[] = [
  { id: "historico", title: "Histórico", icon: LayoutDashboard },
  { id: "analise", title: "Análise", icon: BarChart3, badge: "NOVO", badgeClass: "bg-emerald-500 text-black", isVip: true },
  { id: "sinais", title: "Sinais", icon: Radio, isVip: true },
  { id: "estrategias", title: "Estratégias", icon: Network, isVip: true },
  { id: "videos", title: "Vídeos", icon: PlayCircle, isVip: true },
  { id: "blaze", title: "Blaze Dashboard", icon: Activity, isVip: true },
  { id: "hostman", title: "Hostman Branco", icon: Flame, badge: "NOVO", badgeClass: "bg-red-500 text-white", isVip: true },
];

export function TopNav({ 
  activeSection, 
  onSectionChange,
  isVip = false 
}: { 
  activeSection: SectionId, 
  onSectionChange: (id: SectionId) => void,
  isVip?: boolean
}) {
  const active = activeSection;
  return (
    <nav className="border-b border-white/[0.05] bg-[#101114]/80 backdrop-blur-2xl sticky top-0 z-50">
      <div className="mx-auto flex max-w-[1366px] gap-1 overflow-x-auto px-3 py-2 scrollbar-none sm:px-8">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const locked = item.isVip && !isVip;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition sm:text-xs font-outfit relative ${
                isActive
                  ? "bg-[#FF1F3D]/10 border border-[#FF1F3D]/30 text-white shadow-[0_0_15px_rgba(255,31,61,0.1)]"
                  : locked
                    ? "border border-transparent text-[#9CA3AF]/40"
                    : "border border-transparent text-[#9CA3AF] hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              {locked ? <Lock className="h-3 w-3 opacity-60" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="whitespace-nowrap">{item.title}</span>
              {item.badge && (
                <Badge className={`ml-1 text-[9px] font-mono tracking-widest px-1.5 py-0 h-4 ${item.badgeClass}`}>
                  {item.badge}
                </Badge>
              )}
              {locked && (
                <div className="absolute -right-0.5 -top-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FF1F3D] shadow-[0_0_8px_#FF1F3D]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
