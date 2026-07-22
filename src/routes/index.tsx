import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Código da Elite — Liberado" },
      { name: "description", content: "A versão 2.0 do Código da Elite está no ar." },
      { property: "og:title", content: "Código da Elite — Liberado" },
      { property: "og:description", content: "A versão 2.0 do Código da Elite está no ar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
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
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Radial glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(201,168,76,0.08), transparent 70%)",
        }}
      />
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
        className="absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#c9a84c]/40 bg-black/40 text-[#c9a84c] backdrop-blur transition hover:border-[#c9a84c] hover:bg-[#c9a84c]/10"
        aria-label="Abrir painel"
      >
        <BarChart3 className="h-5 w-5" />
      </Link>

      {/* Content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#c9a84c] animate-[fadeIn_0.6s_ease-out_both]">
          Freitas da Blaze
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/5 px-4 py-1.5 animate-[fadeIn_0.6s_ease-out_0.15s_both]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-300">
            No Ar
          </span>
        </div>

        <h1
          className="mt-8 text-[clamp(4rem,14vw,10rem)] font-black leading-none tracking-tight animate-[fadeUp_0.8s_ease-out_0.25s_both]"
          style={{
            background:
              "linear-gradient(180deg, #b6f4ff 0%, #6fe3f5 45%, #e6fbff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter:
              "drop-shadow(0 0 30px rgba(103,232,249,0.45)) drop-shadow(0 0 80px rgba(34,211,238,0.35))",
          }}
        >
          LIBERADO
        </h1>

        <p className="mt-6 max-w-md text-base text-white/70 sm:text-lg animate-[fadeUp_0.6s_ease-out_0.5s_both]">
          A versão 2.0 do Freitas da Blaze está no ar.
        </p>

        <div className="mt-10 animate-[fadeUp_0.6s_ease-out_0.7s_both]">
          <Link
            to="/app"
            preload="intent"
            className="group relative inline-flex items-center gap-3 rounded-full px-9 py-4 text-base font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(180deg, #a5f3fc 0%, #67e8f9 100%)",
              boxShadow:
                "0 0 40px rgba(103,232,249,0.55), 0 0 90px rgba(34,211,238,0.35), inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            <span>Entrar no sistema</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>
    </div>
  );
}