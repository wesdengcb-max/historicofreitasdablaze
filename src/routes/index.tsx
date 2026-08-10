import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageSquare, ShieldCheck, Zap, Globe, Crown } from "lucide-react"
import logoFreitas from "@/assets/logo-freitas.png.asset.json";

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-red-500/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080808]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-red-500/30 p-0.5">
              <img src={logoFreitas.url} alt="Freitas" className="h-full w-full rounded-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-[0.2em] text-white font-outfit leading-none">Histórico Freitas da Blaze</span>
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-0.5">Premium Analysis</span>
            </div>
          </div>
          
          <div className="hidden items-center gap-10 md:flex">
            <a href="#features" className="text-xs font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-white">Recursos</a>
            <a href="#stats" className="text-xs font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-white">Metodologia</a>
            <Link to="/app">
              <Button size="sm" className="bg-red-600 px-6 font-black uppercase tracking-widest text-[10px] hover:bg-red-700 shadow-[0_4px_15px_rgba(239,68,68,0.3)] h-10 rounded-xl">
                Acessar Plataforma
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-40 pb-24 lg:pt-56 lg:pb-40">
        <div className="absolute top-0 left-1/2 -z-10 h-[800px] w-[1200px] -translate-x-1/2 bg-red-600/10 blur-[140px] rounded-full opacity-50" />
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative z-10 text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 animate-pulse">
              <Crown className="h-3 w-3" />
              <span>Tecnologia Preditiva 2.0</span>
            </div>
            
            <h1 className="text-6xl font-black tracking-tighter sm:text-8xl lg:text-9xl font-outfit uppercase leading-[0.85] text-white">
              A ELITE DA <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800">BLAZE</span>
            </h1>
            
            <p className="mx-auto mt-10 max-w-2xl text-lg font-medium text-gray-400 sm:text-xl leading-relaxed">
              O ecossistema definitivo para investidores de Double. <br className="hidden sm:block" />
              Combine confluência técnica e inteligência artificial para dominar o mercado.
            </p>
            
            <div className="mt-14 flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Link to="/app" className="w-full sm:w-auto">
                <Button size="lg" className="h-16 w-full sm:w-64 bg-red-600 text-sm font-black uppercase tracking-[0.2em] hover:bg-red-700 group rounded-2xl shadow-[0_10px_30px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95">
                  COMEÇAR AGORA
                  <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-2" />
                </Button>
              </Link>
              <a href="https://t.me/freitaswhite" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-16 w-full sm:w-64 border-white/5 bg-white/[0.03] text-sm font-black uppercase tracking-[0.2em] hover:bg-white/[0.08] transition-all rounded-2xl backdrop-blur-sm">
                  <MessageSquare className="mr-3 h-5 w-5 text-red-500" />
                  GRUPO FREE
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </header>

      {/* Features */}
      <section id="features" className="py-32 relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-20 text-center">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-4">Arquitetura de Dados</h2>
            <h3 className="text-3xl font-black uppercase font-outfit tracking-tight sm:text-5xl">Diferenciais Premium</h3>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Zap className="h-7 w-7 text-red-500" />,
                title: "SCANNER REAL-TIME",
                desc: "Processamento instantâneo de cada giro. Nossa engine não descansa para entregar o padrão perfeito."
              },
              {
                icon: <ShieldCheck className="h-7 w-7 text-red-500" />,
                title: "CONFLUÊNCIA VIP",
                desc: "Apenas sinais que passam por 5 camadas de validação são disparados. Qualidade sobre quantidade."
              },
              {
                icon: <Globe className="h-7 w-7 text-red-500" />,
                title: "GLOBAL ANALYTICS",
                desc: "Visão macro do mercado. Histórico detalhado e métricas de assertividade atualizadas em tempo real."
              }
            ].map((feature, i) => (
              <div key={i} className="group relative rounded-[32px] border border-white/5 bg-[#0c0c0c] p-10 transition-all hover:border-red-500/20 hover:-translate-y-2">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 transition-transform group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="mb-4 text-lg font-black font-outfit uppercase tracking-tight text-white">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 bg-[#060606]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-8 opacity-50">
             <div className="h-6 w-6 overflow-hidden rounded-full grayscale">
              <img src={logoFreitas.url} alt="Freitas" className="h-full w-full object-cover" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] font-outfit">Histórico Freitas da Blaze</span>
          </div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            © {new Date().getFullYear()} Histórico Freitas da Blaze · Ecosystem for Strategic Players
          </p>
        </div>
      </footer>
    </div>
  )
}
