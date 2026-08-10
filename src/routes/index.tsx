import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react"
import bgImage from "@/assets/freitas-white-pro-bg.png.asset.json";
import logoFreitas from "@/assets/logo-freitas.png.asset.json";

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Background Image with optimized professional overlays */}
      <div 
        className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat transition-transform duration-[2000ms] hover:scale-105"
        style={{ 
          backgroundImage: `url(${bgImage.url})`,
        }}
      />
      
      {/* Dynamic Glassmorphism Overlays */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/90 via-black/20 to-black/95" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1),transparent_70%)]" />

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 md:p-10 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4 group cursor-pointer">
           <div className="relative h-12 w-12 md:h-14 md:w-14 overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1 backdrop-blur-xl transition-all group-hover:border-red-500/50 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]">
             <img src={logoFreitas.url} alt="Freitas" className="h-full w-full object-cover rounded-xl" />
           </div>
           <div className="flex flex-col">
             <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-white leading-none">Freitas White</span>
             <span className="text-[8px] md:text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1">Ecosystem Pro</span>
           </div>
        </div>
        
        <Link to="/app">
          <Button variant="ghost" className="hidden md:flex text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/5 rounded-full px-8">
            SUPORTE
          </Button>
        </Link>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-20 min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div className="w-full max-w-5xl flex flex-col items-center text-center">
          
          {/* Top Badge */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 rounded-full bg-red-500/10 border border-red-500/20 px-6 py-2 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-red-500">
                PRO VERSION 2.0 ONLINE
              </span>
            </div>
          </div>

          {/* Centered Large Logo for High Visibility */}
          <div className="mb-12 relative group">
            <div className="absolute inset-0 bg-red-500/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <img 
              src={logoFreitas.url} 
              alt="Freitas White Logo" 
              className="h-32 md:h-48 w-auto drop-shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-transform duration-700 hover:scale-110" 
            />
          </div>

          {/* Hero Heading */}
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase mb-6 leading-[0.9] drop-shadow-2xl">
            DOMINE O <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500">MERCADO</span>
          </h1>

          {/* Description */}
          <p className="max-w-2xl text-gray-400 text-sm md:text-lg font-medium mb-12 tracking-wide leading-relaxed opacity-90">
            A plataforma definitiva de análise em tempo real para investidores profissionais. 
            Tecnologia preditiva de alta assertividade agora ao seu alcance.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <Link to="/app" className="w-full sm:w-auto">
              <Button className="h-20 px-16 w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-sm md:text-base font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.5)] transition-all hover:scale-105 active:scale-95 group border-t border-white/20">
                Entrar no sistema
                <ArrowRight className="ml-4 h-6 w-6 transition-transform group-hover:translate-x-2" />
              </Button>
            </Link>
          </div>

          {/* Features Grid (Minimalist) */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl opacity-50 hover:opacity-100 transition-opacity duration-500">
            {[
              { icon: <Shield className="h-5 w-5" />, text: "SEGURANÇA TOTAL" },
              { icon: <Zap className="h-5 w-5" />, text: "ALTA VELOCIDADE" },
              { icon: <TrendingUp className="h-5 w-5" />, text: "94.8% ASSERTIVIDADE" }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-3 border border-white/5 bg-white/5 py-4 px-6 rounded-xl backdrop-blur-sm">
                <div className="text-red-500">{item.icon}</div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-10 left-0 right-0 z-20 flex justify-center items-center gap-6">
        <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-white/10" />
        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">
          Histórico Freitas da Blaze · 2026
        </span>
        <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-white/10" />
      </footer>
    </div>
  )
}
