import { createFileRoute, Link } from '@tanstack/react-router'
import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap, TrendingUp, History, Target, Clock, Lock, BarChart3, Search, Activity, Sun, Moon, CheckCircle2 } from "lucide-react"
import heroAsset from "@/assets/freitas-white-hero.png.asset.json";
import logoTextWhite from "@/assets/logo-text-white.png.asset.json";
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
        {/* Dark Radial Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#0c1527_0%,#020407_70%)]" />
        
        {/* Central Cyan Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-cyan-500/5 blur-[120px] rounded-full" />
        
        {/* Floating Suits like Reference */}
        <div className="absolute top-[15%] left-[15%] w-[120px] h-[120px] opacity-[0.08] rotate-[15deg] animate-pulse">
          <svg viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
            <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
          </svg>
        </div>
        <div className="absolute top-[20%] right-[20%] w-[140px] h-[140px] opacity-[0.05] rotate-[-20deg]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="text-cyan-300">
            <path d="M12,2C12,2 4,9 4,14C4,18.42 7.58,22 12,22C16.42,22 20,18.42 20,14C20,9 12,2 12,2Z" />
          </svg>
        </div>
        <div className="absolute bottom-[20%] left-[20%] w-[100px] h-[100px] opacity-[0.06] rotate-[10deg]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="text-cyan-500">
            <path d="M12,2C9,2 7,4 7,7C7,8.6 7.6,10 8.6,11C6.7,11.3 5,13.2 5,15.5C5,18 7,20 9.5,20C10.5,20 11.5,19.6 12,19C12.5,19.6 13.5,20 14.5,20C17,20 19,18 19,15.5C19,13.2 17.3,11.3 15.4,11C16.4,10 17,8.6 17,7C17,4 15,2 12,2Z" />
          </svg>
        </div>
        <div className="absolute bottom-[15%] right-[25%] w-[130px] h-[130px] opacity-[0.04] rotate-[-5deg]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
            <path d="M12,2L3.5,12L12,22L20.5,12L12,2Z" />
          </svg>
        </div>
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
          Bem-vindo, Jogador!
        </h1>

        <p className="text-base md:text-lg text-[#d1d5db] mb-12 max-w-[700px] leading-relaxed font-medium animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Com a nossa plataforma de resultados, o mercado de apostas pode ser mais lucrativo. Tendo acesso à milhares de resultados catalogados e que podem ser manipulados através de filtros. Em conjunto com bons estudos, você pode ser mais acertivo.
        </p>

        {/* CTA BUTTON */}
        <Link to="/app" className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Button className="h-14 px-10 bg-gradient-to-r from-[#ff4b5c] to-[#e63946] hover:from-[#ff5c6c] hover:to-[#f74a57] text-white font-black uppercase tracking-widest text-xs rounded-md flex items-center gap-3 shadow-[0px_4px_20px_rgba(230,57,70,0.4)] transition-all hover:scale-105 active:scale-95 border-none">
            <span className="text-lg leading-none mt-[2px]">▷</span>
            CONHECENDO AS FERRAMENTAS
          </Button>
        </Link>
      </main>

      {/* MÉTRICAS SECTION */}
      <section className="relative z-20 px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#0c0c0c]/80 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
            {/* Subtle light sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 relative z-10">
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center mb-6 border border-red-600/20 shadow-[0_0_20px_rgba(229,9,20,0.1)]">
                  <History className="text-[#E50914]" size={24} />
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter">1.248.854</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rodadas Registradas</p>
              </div>

              <div className="flex flex-col items-center lg:items-start text-center lg:text-left border-l border-white/5 pl-0 md:pl-0 lg:pl-12">
                <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center mb-6 border border-red-600/20 shadow-[0_0_20px_rgba(229,9,20,0.1)]">
                  <Target className="text-[#E50914]" size={24} />
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter">98,62%</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Precisão dos Dados</p>
              </div>

              <div className="flex flex-col items-center lg:items-start text-center lg:text-left border-l border-white/5 pl-0 md:pl-0 lg:pl-12">
                <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center mb-6 border border-red-600/20 shadow-[0_0_20px_rgba(229,9,20,0.1)]">
                  <Activity className="text-[#E50914]" size={24} />
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter">24/7</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Atualização em Tempo Real</p>
              </div>

              <div className="flex flex-col items-center lg:items-start text-center lg:text-left border-l border-white/5 pl-0 md:pl-0 lg:pl-12">
                <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center mb-6 border border-red-600/20 shadow-[0_0_20px_rgba(229,9,20,0.1)]">
                  <Shield className="text-[#E50914]" size={24} />
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter">100%</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dados Confiáveis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "POR QUE USAR" SECTION */}
      <section className="relative z-10 px-6 py-32 bg-[radial-gradient(circle_at_50%_50%,rgba(229,9,20,0.03),transparent_70%)]">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-[#E50914] mb-4 block">
            POR QUE USAR O FREITASWHITE?
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">
            Tudo que você precisa <br className="hidden md:block" /> em um só lugar
          </h2>
          <div className="w-20 h-1 bg-[#E50914] mx-auto rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard 
            icon={<History size={28} />} 
            title="Histórico Completo" 
            description="Acesse todas as rodadas da Blaze com filtros avançados."
          />
          <FeatureCard 
            icon={<BarChart3 size={28} />} 
            title="Estatísticas Avançadas" 
            description="Gráficos, tendências e insights para turbinar suas análises."
          />
          <FeatureCard 
            icon={<Target size={28} />} 
            title="Probabilidades Reais" 
            description="Saiba as chances reais de cada cor, número ou padrão."
          />
          <FeatureCard 
            icon={<Shield size={28} />} 
            title="Dados Confiáveis" 
            description="Informações 100% reais, seguras e atualizadas em tempo real."
          />
        </div>
      </section>

      {/* DADOS CONFIÁVEIS DETAIL SECTION */}
      <section className="relative z-10 px-6 py-20 bg-black/50 border-y border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mb-8 border border-red-600/20 shadow-[0_0_40px_rgba(229,9,20,0.2)]">
            <CheckCircle2 size={40} className="text-[#E50914]" />
          </div>
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Dados Confiáveis</h3>
          <p className="text-gray-400 text-lg leading-relaxed font-medium">
            Informações 100% reais, seguras e atualizadas em tempo real. Nossa plataforma utiliza tecnologia de ponta para garantir a precisão de cada dado processado.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 bg-[#050505] pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-[#E50914] to-[#7f0000] shadow-[0_0_20px_rgba(229,9,20,0.3)]">
                <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center border border-white/10">
                  <img 
                    src={logoTextWhite.url} 
                    alt="FreitasWhite Logo" 
                    className="w-[85%] h-auto object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter uppercase leading-none">
                  Freitas<span className="text-[#E50914]">White</span>
                </span>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-1">Ecosystem Pro</span>
              </div>
            </Link>
            <p className="text-gray-500 max-w-sm leading-relaxed mb-8">
              A maior e mais precisa plataforma de análise de dados históricos. Tecnologia de ponta para sua estratégia.
            </p>
            <div className="flex gap-4">
              {/* Social icons would go here */}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-8">Navegação</h4>
            <ul className="space-y-4 text-sm font-medium text-gray-500">
              <li><Link to="/app" className="hover:text-white transition-colors">Histórico</Link></li>
              <li><Link to="/app" className="hover:text-white transition-colors">Estatísticas</Link></li>
              <li><Link to="/app" className="hover:text-white transition-colors">Probabilidades</Link></li>
              <li><Link to="/app" className="hover:text-white transition-colors">Sinais VIP</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-8">Suporte</h4>
            <ul className="space-y-4 text-sm font-medium text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">Telegram Oficial</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
            © {new Date().getFullYear()} FreitasWhite Pro Ecosystem · MMXVI. Todos os direitos reservados.
          </span>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <a href="#" className="hover:text-white">Privacidade</a>
            <a href="#" className="hover:text-white">Termos</a>
            <a href="#" className="hover:text-white">Cookies</a>
          </div>
        </div>
      </footer>
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
