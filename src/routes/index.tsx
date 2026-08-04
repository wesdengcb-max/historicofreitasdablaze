import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import kingImg from "@/assets/freitas-king.png.asset.json";
import bgImg from "@/assets/freitas-bg.png.asset.json";

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
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[#090909] text-white">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-y-0 right-0 z-0 opacity-40 bg-contain bg-right-bottom bg-no-repeat pointer-events-none"
        style={{ 
          backgroundImage: `url(${bgImg.url})`,
          width: '50%',
          maxWidth: '800px',
        }}
      />
      
      {/* Premium background effects */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% -20%, rgba(255, 31, 61, 0.2) 0%, transparent 60%), radial-gradient(circle at 50% 120%, rgba(255, 31, 61, 0.1) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 50%, black, transparent 80%)",
        }}
      />

      {/* Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute rounded-full ${p.color} animate-[floaty_var(--d)_ease-in-out_infinite]`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Top right icon */}
      <Link
        to="/app"
        preload="intent"
        onClick={(e) => {
          e.preventDefault();
          goWithTransition("/app");
        }}
        className="absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#c9a84c]/40 bg-black/40 text-[#c9a84c] backdrop-blur transition hover:border-[#c9a84c] hover:bg-[#c9a84c]/10"
        aria-label="Abrir painel"
      >
        <BarChart3 className="h-5 w-5" />
      </Link>

      {/* Content */}
      <main className="relative z-10 mx-auto flex min-h-[100svh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-8 text-center sm:gap-6 sm:px-8">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF1F3D] animate-[fadeIn_0.6s_ease-out_both] sm:text-[12px] font-outfit">
          Freitas da Blaze
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

        {/* Hero image — o Rei da Blaze */}
        <div className="relative flex aspect-square w-[min(35vh,200px)] items-center justify-center sm:w-[min(38vh,240px)]">
          {/* red glow halo */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(229,57,53,0.55) 0%, rgba(229,57,53,0.25) 35%, transparent 70%)",
              filter: "blur(24px)",
              animation: "kingGlow 4.5s ease-in-out infinite",
            }}
          />
          {/* rotating ring */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[108%] w-[108%] rounded-full"
            style={{
              border: "1px solid rgba(229,57,53,0.35)",
              boxShadow:
                "inset 0 0 30px rgba(229,57,53,0.25), 0 0 30px rgba(229,57,53,0.25)",
              animation: "ringSpin 22s linear infinite",
            }}
          />
          {/* floating portrait */}
          <div
            className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-red-500/40 animate-[fadeUp_0.9s_ease-out_0.3s_both]"
            style={{
              boxShadow:
                "0 30px 80px -20px rgba(229,57,53,0.6), inset 0 0 40px rgba(0,0,0,0.6)",
            }}
          >
            <img
              src={kingImg.url}
              alt="Freitas da Blaze"
              draggable={false}
              className="h-full w-full select-none object-cover"
              style={{ animation: "kingFloat 6s ease-in-out infinite" }}
            />
            {/* diagonal light sweep */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                animation: "sweep 5.5s ease-in-out infinite",
              }}
            />
            {/* inner vignette to blend with page */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          </div>
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
          A versão 2.0 do Freitas da Blaze está no ar.
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
