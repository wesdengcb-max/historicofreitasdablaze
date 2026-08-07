import { useState } from "react";
import { ShieldCheck, Megaphone, Dice5, ChevronDown } from "lucide-react";
import { PatternValidator } from "./PatternValidator";
import { PatternNotifier } from "./PatternNotifier";
import type { Spin } from "./types";

type TabId = "notifier" | "validator" | "simulator";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }[] = [
  { id: "notifier", label: "Notificador", icon: Megaphone },
  { id: "validator", label: "Validador de padrão", icon: ShieldCheck },
  { id: "simulator", label: "Simulador", icon: Dice5, soon: true },
];


export function StrategyTabs({ spins }: { spins: Spin[] }) {
  const [tab, setTab] = useState<TabId | null>(null);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.05] bg-white/[0.02] p-1.5 scrollbar-none backdrop-blur-md"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => !t.soon && setTab((cur) => (cur === t.id ? null : t.id))}
              disabled={t.soon}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition sm:text-[11px] font-outfit ${
                active
                  ? "bg-primary text-white shadow-[0_5px_15px_rgba(59,130,246,0.3)]"
                  : t.soon
                  ? "cursor-not-allowed text-[#9CA3AF]/30"
                  : "text-[#9CA3AF] hover:bg-white/[0.04] hover:text-white"
              }`}
              title={t.soon ? "Em breve" : t.label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{t.label}</span>
              {t.soon && (
                <span className="ml-1 rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-muted-foreground">
                  EM BREVE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab !== null && (
        <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
          <button
            type="button"
            onClick={() => setTab(null)}
            aria-label="Minimizar"
            className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#9CA3AF] transition hover:bg-white/[0.08] hover:text-white"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {tab === "notifier" && <PatternNotifier spins={spins} />}
          {tab === "validator" && <PatternValidator spins={spins} />}
        </div>
      )}

    </div>
  );
}
