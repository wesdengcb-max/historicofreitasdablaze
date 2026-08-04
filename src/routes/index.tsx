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

      {/* Central Login Card (Based on LoveKing Pro) */}
      <main className="relative z-10 mx-auto flex min-h-[100svh] w-full items-center justify-center px-6 py-8">
        <div className="glass-card-glow relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/5 bg-[#0C0C0C]/90 p-8 text-center backdrop-blur-xl sm:p-12">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <img 
                src={kingImg.url} 
                alt="Logo" 
                className="h-16 w-16 rounded-full object-cover ring-2 ring-[#FF1F3D]/20" 
              />
              <div className="absolute -inset-2 rounded-full bg-[#FF1F3D]/20 blur-xl" />
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white font-outfit">
            Entre no <span className="text-[#FF1F3D]">Reino</span>
          </h1>
          <p className="mb-8 text-sm text-white/40">
            Painel oficial Freitas da Blaze
          </p>

          {/* Action Tabs Mockup */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 rounded-xl bg-[#FF1F3D] py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,31,61,0.4)] transition-transform hover:scale-[1.02]">
              <ArrowRight className="h-4 w-4" />
              Entrar
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10">
              Cadastrar
            </button>
          </div>

          {/* Form Fields Mockup */}
          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/30">E-mail</label>
              <div className="flex h-12 w-full items-center rounded-xl border border-white/5 bg-[#111111] px-4">
                <div className="mr-3 h-4 w-4 text-white/20" />
                <div className="h-2 w-24 rounded bg-white/5" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/30">Senha</label>
              <div className="flex h-12 w-full items-center rounded-xl border border-white/5 bg-[#111111] px-4">
                <div className="mr-3 h-4 w-4 text-white/20" />
                <div className="h-2 w-32 rounded bg-white/5" />
              </div>
            </div>
          </div>

          <button className="mt-4 w-full text-right text-[11px] font-medium text-white/30 hover:text-white/60 transition-colors">
            Esqueceu a senha?
          </button>

          {/* Main Action Button */}
          <div className="mt-8">
            <Link
              to="/app"
              preload="intent"
              onClick={(e) => {
                e.preventDefault();
                goWithTransition("/app");
              }}
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-[#FF1F3D] py-4 text-sm font-bold text-white shadow-[0_0_30px_rgba(255,31,61,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,31,61,0.4)] active:scale-[0.98]"
            >
              <span>Entrar no Painel</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-white/5" />
            <span className="text-[10px] font-bold text-white/20 uppercase">ou</span>
            <div className="h-[1px] flex-1 bg-white/5" />
          </div>

          {/* Secondary Action */}
          <button className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF1F3D]/10 text-[#FF1F3D]">
                <kingImg.url className="h-4 w-4" /> {/* Fallback or icon */}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Torne-se Revendedor</div>
                <div className="text-[10px] text-white/30">Ganhe com o sistema</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/20" />
          </button>
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
