import { useState } from "react";
import { Sparkles, ShieldCheck, Megaphone, Dice5, ChevronDown } from "lucide-react";
import { SignalGenerator } from "./SignalGenerator";
import { PatternValidator } from "./PatternValidator";
import { PatternNotifier } from "./PatternNotifier";
import type { Spin } from "./types";

type TabId = "signal" | "notifier" | "validator" | "simulator";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }[] = [
  { id: "signal", label: "Gerador de sinal", icon: Sparkles },
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
        className="flex gap-1 overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02] p-1 scrollbar-none"
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
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition sm:text-xs ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : t.soon
                  ? "cursor-not-allowed text-muted-foreground/50"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
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
            className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {tab === "signal" && <SignalGenerator spins={spins} />}
          {tab === "notifier" && <PatternNotifier spins={spins} />}
          {tab === "validator" && <PatternValidator spins={spins} />}
        </div>
      )}

    </div>
  );
}
