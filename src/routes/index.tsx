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
      {/* Red Background Glow Efeito (Based on Reference) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Main top-center glow */}
        <div 
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] opacity-40 blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(255, 31, 61, 0.3) 0%, transparent 70%)' }}
        />
        {/* Left red beam/glow */}
        <div 
          className="absolute top-[20%] -left-[10%] w-[50%] h-[60%] opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(255, 31, 61, 0.2) 0%, transparent 70%)' }}
        />
        {/* Right red beam/glow */}
        <div 
          className="absolute top-[10%] -right-[10%] w-[50%] h-[70%] opacity-25 blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(255, 31, 61, 0.25) 0%, transparent 70%)' }}
        />
        
        {/* Subtle diagonal lines (grid/beams) as seen in reference */}
        <div className="absolute inset-0 opacity-[0.05]" 
          style={{ 
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255, 31, 61, 0.2) 40px, rgba(255, 31, 61, 0.2) 41px)`,
          }} 
        />
      </div>

      {/* Background Image Layer - Positioned to the right behind the card */}
      <div 
        className="absolute inset-y-0 right-0 z-[1] opacity-50 bg-contain bg-right-bottom bg-no-repeat pointer-events-none mix-blend-screen"
        style={{ 
          backgroundImage: `url(${bgImg.url})`,
          width: '55%',
          maxWidth: '900px',
        }}
      />
      
      {/* Noise and grain texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-[2]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      
      {/* Subtle Grid Overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03] z-[2]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent 90%)",
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
        <div className="glass-card-glow relative w-full max-w-[420px] overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0C0C0C]/90 p-8 text-center backdrop-blur-xl sm:p-12">
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <div className="relative">
              <div className="flex items-center gap-2">
                <img 
                  src={kingImg.url} 
                  alt="Logo" 
                  className="h-10 w-10 rounded-full object-cover" 
                />
                <div className="flex flex-col items-start leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-black tracking-tighter text-white">love</span>
                    <span className="relative flex h-6 w-6 items-center justify-center rounded-sm bg-[#FF1F3D] text-[10px] font-black text-white">
                      K
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px]">👑</div>
                    </span>
                    <span className="text-xl font-black tracking-tighter text-white">ing</span>
                  </div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase ml-auto">pro</span>
                </div>
              </div>
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
              <div className="flex h-14 w-full items-center rounded-2xl border border-white/5 bg-[#111111] px-4 transition-colors focus-within:border-[#FF1F3D]/30">
                <div className="mr-3 flex h-5 w-5 items-center justify-center rounded-lg bg-white/5 text-white/20">
                  <span className="text-[10px]">✉</span>
                </div>
                <input 
                  type="text" 
                  placeholder="Email" 
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex h-14 w-full items-center rounded-2xl border border-white/5 bg-[#111111] px-4 transition-colors focus-within:border-[#FF1F3D]/30">
                <div className="mr-3 flex h-5 w-5 items-center justify-center rounded-lg bg-white/5 text-white/20">
                  <span className="text-[10px]">🔒</span>
                </div>
                <input 
                  type="password" 
                  placeholder="Senha" 
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                />
                <button className="ml-2 text-white/20 hover:text-white/40">
                  <span className="text-[10px]">👁</span>
                </button>
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
          <button className="mt-6 flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/10 hover:border-[#FF1F3D]/20 group">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF1F3D]/10 text-[#FF1F3D] ring-1 ring-[#FF1F3D]/20">
                <span className="text-sm">👑</span>
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white uppercase tracking-tight">Torne-se Revendedor</div>
                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Ganhe até R$ 147 por chave</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/20 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </main>

      {/* Footer Stats (Based on Reference) */}
      <footer className="absolute bottom-0 left-0 z-20 w-full border-t border-white/5 bg-black/40 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1366px] flex-wrap items-center justify-center gap-8 text-[10px] font-bold tracking-[0.1em] text-white/30 uppercase sm:justify-between sm:text-[11px]">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#FF1F3D]" />
              <span>Criptografia AES-256</span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="font-outfit text-white/20">UPTIME</span>
              <span className="text-white">99.9%</span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="font-outfit text-white/20">LATÊNCIA</span>
              <span className="text-white">&lt;50ms</span>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="font-outfit text-white/20">CHAVES EMITIDAS</span>
              <span className="text-white">+18.4k</span>
            </div>
          </div>
          <div className="font-outfit tracking-normal">
            © 2026 <span className="text-white/60">Freitas da Blaze</span>
          </div>
        </div>
      </footer>

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
