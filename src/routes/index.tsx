import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import bgImage from "@/assets/freitas-bg.png.asset.json";

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat transition-transform duration-1000"
        style={{ 
          backgroundImage: `url(${bgImage.url})`,
        }}
      />
      
      {/* Dark vignette/gradient overlays to match the reference style */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/40 to-black/80" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-transparent to-black" />

      {/* Header / Top Nav */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-end">
        <Link to="/app">
          <Button variant="outline" className="border-white/20 bg-black/40 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] h-10 rounded-full px-6 hover:bg-white/10 transition-all border">
            ACESSO BÁSICO
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-20 w-full max-w-4xl px-6 text-center flex flex-col items-center">
        {/* Status Indicator */}
        <div className="mb-4 flex flex-col items-center gap-4">
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-red-500 mb-2">
             FREITAS WHITE
           </span>
           <div className="inline-flex items-center gap-2 rounded-full bg-black/40 border border-emerald-500/30 px-4 py-1.5 backdrop-blur-md">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
               NO AR
             </span>
           </div>
        </div>

        {/* Hero Title */}
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase mb-2 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          LIBERADO
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-sm md:text-base font-medium mb-12 tracking-wide opacity-80">
          A versão 2.0 do Freitas White está no ar.
        </p>

        {/* Action Button */}
        <Link to="/app">
          <Button className="h-16 px-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-sm font-black uppercase tracking-[0.2em] rounded-full shadow-[0_10px_40px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 group">
            Entrar no sistema
            <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>

      {/* Footer / Disclaimer (Optional) */}
      <div className="absolute bottom-10 z-20 text-[9px] font-bold text-gray-500 uppercase tracking-[0.3em] opacity-50">
        Histórico Freitas da Blaze · Ecosystem v2.0
      </div>
    </div>
  )
}
