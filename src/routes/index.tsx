import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react"
import bgImage from "@/assets/freitas-white-pro-bg.png.asset.json";
import logoFreitas from "@/assets/logo-freitas.png.asset.json";
import dashboardPreview from "@/assets/freitas-white-hero-preview.png.asset.json";

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Background Image with professional overlays */}
      <div 
        className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat"
        style={{ 
          backgroundImage: `url(${bgImage.url})`,
        }}
      />
      
      {/* Premium Overlays */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/95 via-black/40 to-black/95" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(239,68,68,0.15),transparent_70%)]" />

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
            ENTRAR
          </Button>
        </Link>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-20 min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20">
        <div className="w-full max-w-6xl flex flex-col items-center text-center">
          
          {/* Pro Status Badge */}
          <div className="mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-3 rounded-full bg-red-500/10 border border-red-500/20 px-6 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-red-500">
                PRO VERSION 2.0 ONLINE
              </span>
            </div>
          </div>

          {/* Floating Dashboard Preview (Reference to image-93) */}
          <div className="relative mb-16 group perspective-1000">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl transition-all duration-700 hover:scale-[1.02] hover:-rotate-y-2">
              <img 
                src={dashboardPreview.url} 
                alt="Plataforma Profissional" 
                className="w-full max-w-4xl h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-40" />
            </div>
            
            {/* Logo Overlaying or Nearby */}
            <div className="absolute -bottom-10 -right-10 md:-right-20 z-30 hidden lg:block">
               <img src={logoFreitas.url} className="h-40 w-auto drop-shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-float" />
            </div>
          </div>

          {/* New Professional Headline (Replaced "Domine o Mercado") */}
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-6 leading-[0.9] drop-shadow-2xl">
            TECNOLOGIA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-red-500">ESTRATÉGICA</span>
          </h1>

          {/* Description */}
          <p className="max-w-2xl text-gray-400 text-sm md:text-lg font-medium mb-12 tracking-wide leading-relaxed opacity-90">
            O ecossistema definitivo para investidores profissionais. Análise técnica 
            avançada com confluência de dados em tempo real.
          </p>

          {/* Primary Action */}
          <Link to="/app" className="w-full sm:w-auto">
            <Button className="h-20 px-16 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-sm md:text-base font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 group border-t border-white/10">
              Acessar Sistema
              <ArrowRight className="ml-4 h-6 w-6 transition-transform group-hover:translate-x-2" />
            </Button>
          </Link>

          {/* Minimal Feature Bar */}
          <div className="mt-20 flex flex-wrap justify-center gap-10 opacity-40">
             <div className="flex items-center gap-3">
               <Shield className="h-4 w-4 text-red-500" />
               <span className="text-[10px] font-black uppercase tracking-widest">Protocolo Seguro</span>
             </div>
             <div className="flex items-center gap-3">
               <Zap className="h-4 w-4 text-red-500" />
               <span className="text-[10px] font-black uppercase tracking-widest">Tempo Real</span>
             </div>
             <div className="flex items-center gap-3">
               <TrendingUp className="h-4 w-4 text-red-500" />
               <span className="text-[10px] font-black uppercase tracking-widest">Confluência VIP</span>
             </div>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-10 border-t border-white/5 bg-black/20 text-center">
        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">
          Freitas White Pro Ecosystem · MMXVI
        </span>
      </footer>
    </div>
  )
}
