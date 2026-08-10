import { createFileRoute, Link } from '@tanstack/react-router'
import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, TrendingUp, History, Target, Clock, Lock, BarChart3, Search, Activity, Sun, Moon, CheckCircle2 } from "lucide-react"
import heroAsset from "@/assets/freitas-white-hero.png.asset.json";
import logoTextWhite from "@/assets/logo-text-white.png.asset.json";
import bgAsset from "@/assets/homepage-bg.png.asset.json";
import { useState, useEffect } from "react";

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#020407] text-white font-sans flex flex-col items-center justify-center overflow-hidden selection:bg-red-500/30">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Main Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgAsset.url})` }}
        />
        
        {/* Overlays for depth and contrast */}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020407]/40 via-transparent to-[#020407]" />
        
        {/* Atmospheric Cyan Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-cyan-500/10 blur-[150px] rounded-full" />
      </div>

      {/* HERO CONTENT - CENTERED VERTICALLY & HORIZONTALLY */}
      <main className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center py-20">
        
        {/* LOGO - CENTERED AT TOP OF HERO */}
        <div className="flex items-center gap-4 mb-16 animate-fade-in">
          {/* Flame Icon with Clock */}
          <div className="w-16 h-16 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-[#ff3b5c] rounded-2xl rotate-45 opacity-20 blur-sm" />
            <div className="relative z-10 text-[#ff3b5c]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14">
                <path d="M12,2C12,2 12,7 9,10C6,13 6,17 9.5,20C10.5,21 13.5,21 14.5,20C18,17 18,13 15,10C12,7 12,2 12,2Z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pt-2">
                <Clock size={16} strokeWidth={2.5} className="text-white" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold tracking-[0.5em] text-gray-400 uppercase leading-none mb-1">
              HISTÓRICOS
            </span>
            <span className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-white">
              Blaze
            </span>
          </div>
        </div>

        {/* WELCOME TEXT */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-8 text-white animate-fade-in-up">
          vc esqueceu de me responder se ta pegando perfeito
        </h1>

        <p className="text-base md:text-lg text-[#d1d5db] mb-12 max-w-[700px] leading-relaxed font-medium animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          analise na aba sinais se ainda ta pegando o alta tendencia pq tem q manter funcionamento perfeito ocmo estava antas pegando tudo entende? Dps q fiz a mudança não mudou algo não na estrategia ou algo do tipo? Pq tem q mandar pegando perfeito pow
        </p>

        {/* CTA BUTTON */}
        <Link to="/app" className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Button className="h-14 px-10 bg-gradient-to-r from-[#ff4b5c] to-[#e63946] hover:from-[#ff5c6c] hover:to-[#f74a57] text-white font-black uppercase tracking-widest text-xs rounded-md flex items-center gap-3 shadow-[0px_4px_20px_rgba(230,57,70,0.4)] transition-all hover:scale-105 active:scale-95 border-none">
            <span className="text-lg leading-none mt-[2px]">▷</span>
            CONHECENDO AS FERRAMENTAS
          </Button>
        </Link>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group relative bg-[#0c0c0c] border border-white/5 rounded-3xl p-10 transition-all duration-500 hover:translate-y-[-8px] hover:border-red-500/30 hover:shadow-[0_20px_40px_rgba(229,9,20,0.1)] overflow-hidden">
      {/* Hover background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10">
        <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mb-8 text-[#E50914] border border-red-600/10 transition-all duration-500 group-hover:bg-[#E50914] group-hover:text-white group-hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]">
          {icon}
        </div>
        <h3 className="text-xl font-black uppercase tracking-tighter mb-4">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </div>
  );
}
