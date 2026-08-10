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
    <div className="relative min-h-screen bg-[#030303] text-white font-sans overflow-x-hidden selection:bg-red-500/30">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
        
        {/* Glow Effects */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-red-600/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/5 blur-[120px]" />
        
        {/* Geometric Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 L100 100 M100 0 L0 100" stroke="red" strokeWidth="0.1" />
        </svg>
      </div>

      {/* HEADER / NAVBAR */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b ${
          isScrolled ? "bg-black/80 backdrop-blur-xl border-white/10 py-4" : "bg-transparent border-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-[#E50914] to-[#7f0000] shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-transform duration-500 group-hover:rotate-[360deg] group-hover:scale-110">
              <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center border border-white/10">
                <img 
                  src={logoTextWhite.url} 
                  alt="FreitasWhite Logo" 
                  className="w-[85%] h-auto object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter uppercase leading-none">
                Freitas<span className="text-[#E50914]">White</span>
              </span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-1">Ecosystem Pro</span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8">
            {['Início', 'Histórico', 'Estatísticas', 'Probabilidades', 'Planos', 'Suporte'].map((item) => (
              <Link 
                key={item} 
                to={item === 'Início' ? '/' : '/app'} 
                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-red-600 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            
            <Link to="/auth" className="hidden sm:block text-xs font-bold uppercase tracking-widest text-white hover:text-red-500 transition-colors px-4">
              Entrar
            </Link>
            
            <Link to="/auth">
              <Button className="bg-[#E50914] hover:bg-[#ff1a1a] text-white text-xs font-bold uppercase tracking-widest px-8 rounded-full h-11 shadow-[0_0_20px_rgba(229,9,20,0.3)] border-t border-white/20 transition-all hover:scale-105 active:scale-95">
                Cadastrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 lg:pt-48 pb-20 px-6 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <div className="flex flex-col animate-fade-in-up">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-[2px] bg-red-600" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-[#E50914]">
                HISTÓRICO COMPLETO DA BLAZE
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black leading-[0.9] tracking-tighter uppercase mb-8">
              O histórico que separa <br />
              amadores de <span className="text-[#E50914] drop-shadow-[0_0_20px_rgba(229,9,20,0.5)]">vencedores.</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed font-medium">
              Acesse cada rodada, analise padrões e tome decisões <br className="hidden md:block" /> com base em dados reais da Blaze.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
              <Link to="/app" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-16 px-10 bg-[#E50914] hover:bg-[#ff1a1a] text-white font-black uppercase tracking-widest text-sm rounded-xl flex items-center gap-3 group shadow-[0_15px_30px_rgba(229,9,20,0.4)] transition-all hover:translate-y-[-4px]">
                  Ver Histórico
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link to="/app" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-16 px-10 bg-transparent border-white/10 hover:border-red-500/50 hover:bg-red-500/5 text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all">
                  Ver Estatísticas
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-8 opacity-90">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#E50914]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Dados 100% Reais</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#E50914]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Atualizado em Tempo Real</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#E50914]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Confiável e Seguro</span>
              </div>
            </div>
          </div>

          {/* Right Visual (Personagem) */}
          <div className="relative animate-fade-in group">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#E50914]/10 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Frame/Integration */}
            <div className="relative z-10 transition-transform duration-700 group-hover:scale-[1.02]">
              <div className="absolute -inset-2 bg-gradient-to-br from-[#E50914]/30 to-transparent rounded-3xl blur opacity-30 group-hover:opacity-60 transition-opacity" />
              <img 
                src={heroAsset.url} 
                alt="Freitas White" 
                className="relative w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mask-edge"
              />
              
              {/* Particles/Geometric detail */}
              <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-[#E50914]/40 rounded-tr-3xl" />
              <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-[#E50914]/40 rounded-bl-3xl" />
            </div>
          </div>
        </div>
      </section>

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
