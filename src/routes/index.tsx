import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import kingImg from "@/assets/freitas-white-hero.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Histórico Freitas — Blaze" },
      { name: "description", content: "A versão 2.0 do Histórico Freitas está no ar." },
      { property: "og:title", content: "Histórico Freitas — Blaze" },
      { property: "og:description", content: "A versão 2.0 do Histórico Freitas está no ar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [exitTo, setExitTo] = useState<null | "/app" | "/sinais" | "/estrategias">(null);
  const navigate = useNavigate();

  const goWithTransition = (to: "/app" | "/sinais" | "/estrategias") => {
    if (exitTo) return;
    setExitTo(to);
    window.setTimeout(() => {
      navigate({ to });
    }, 620);
  };

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 6,
        color:
          i % 5 === 0
            ? "bg-[#e53935]"
            : i % 3 === 0
              ? "bg-[#c9a84c]"
              : "bg-white/60",
      })),
    [],
  );

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-black text-white">
      {/* Hero Image as Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={kingImg.url}
          alt=""
          className="h-full w-full object-cover opacity-60"
        />
        {/* Professional overlays for readability */}
        <div 
          className="absolute inset-0" 
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 50%, #000 100%)"
          }} 
        />
        <div 
          className="absolute inset-0" 
          style={{
            background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)"
          }} 
        />
      </div>

      {/* Top right icon */}
      <Link
        to="/app"
        preload="intent"
        onClick={(e) => {
          e.preventDefault();
          goWithTransition("/app");
        }}
        className="absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-red-500/40 bg-black/40 text-red-500 backdrop-blur transition hover:border-red-500 hover:bg-red-500/10"
        aria-label="Abrir painel"
      >
        <BarChart3 className="h-5 w-5" />
      </Link>

      {/* Content */}
      <main className="relative z-10 mx-auto flex min-h-[100svh] max-w-4xl flex-col items-center justify-center gap-4 px-4 py-8 text-center sm:gap-6 sm:px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF1F3D] animate-[fadeIn_0.6s_ease-out_both] sm:text-[12px] font-outfit">
          Freitas White
        </p>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/5 px-4 py-1 animate-[fadeIn_0.6s_ease-out_0.15s_both]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300 sm:text-[11px]">
            No Ar
          </span>
        </div>


        <h1
          className="text-[clamp(3rem,10vw,7rem)] font-black leading-none tracking-tight animate-[fadeUp_0.8s_ease-out_0.35s_both] font-outfit uppercase"
          style={{
            background:
              "linear-gradient(180deg, #FFFFFF 0%, #FF1F3D 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter:
              "drop-shadow(0 0 30px rgba(229,57,53,0.55)) drop-shadow(0 0 80px rgba(229,57,53,0.35))",
          }}
        >
          LIBERADO
        </h1>

        <p className="max-w-md text-sm text-white/70 sm:text-base animate-[fadeUp_0.6s_ease-out_0.55s_both]">
          A versão 2.0 do Freitas White está no ar.
        </p>

        <div className="mt-2 animate-[fadeUp_0.6s_ease-out_0.75s_both]">
          <Link
            to="/app"
            preload="intent"
            onClick={(e) => {
              e.preventDefault();
              goWithTransition("/app");
            }}
            className="group relative inline-flex items-center gap-3 rounded-full px-8 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] sm:px-9 sm:py-3.5 sm:text-base"
            style={{
              background:
                "linear-gradient(180deg, #ffb0b0 0%, #ff4d4d 100%)",
              boxShadow:
                "0 0 40px rgba(229,57,53,0.55), 0 0 90px rgba(229,57,53,0.35), inset 0 1px 0 rgba(255,255,255,0.55)",
            }}
          >
            <span>Entrar no sistema</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>

      {/* Page-exit transition (slides across from left) */}
      {exitTo && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
          <div
            className="absolute inset-y-0 -left-full w-full animate-[slideOver_0.62s_cubic-bezier(0.7,0,0.2,1)_forwards]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(229,57,53,0.85) 45%, #000 100%)",
              boxShadow:
                "0 0 80px 20px rgba(229,57,53,0.45), 0 0 160px 40px rgba(0,0,0,0.6)",
            }}
          />
        </div>
      )}
    </div>
  );
}
