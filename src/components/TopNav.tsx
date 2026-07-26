import {
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Flame,
  Radio,
  Network,
  PlayCircle,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { setSection, useSection, type SectionId } from "@/lib/sectionStore";

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
  return (
    <nav className="border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1720px] gap-1 overflow-x-auto px-3 py-2 scrollbar-none sm:px-8">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition sm:text-xs ${
                isActive
                  ? "bg-gradient-to-r from-red-500/20 to-transparent border border-red-500/40 text-foreground"
                  : "border border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{item.title}</span>
              {item.badge && (
                <Badge className={`ml-1 text-[9px] font-mono tracking-widest px-1.5 py-0 h-4 ${item.badgeClass}`}>
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
