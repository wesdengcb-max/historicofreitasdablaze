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
  return (
    <nav className="border-b border-white/[0.05] bg-[#101114]/80 backdrop-blur-2xl sticky top-0 z-50">
      <div className="mx-auto flex max-w-[1366px] gap-1 overflow-x-auto px-3 py-2 scrollbar-none sm:px-8">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition sm:text-xs font-outfit ${
                isActive
                  ? "bg-[#FF1F3D]/10 border border-[#FF1F3D]/30 text-white shadow-[0_0_15px_rgba(255,31,61,0.1)]"
                  : "border border-transparent text-[#9CA3AF] hover:bg-white/[0.03] hover:text-white"
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
