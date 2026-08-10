import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, ShieldCheck, Zap, Globe, MessageSquare } from "lucide-react"

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 font-black italic tracking-tighter text-white">
              FW
            </div>
            <span className="text-lg font-black tracking-tight font-outfit uppercase">Freitas White</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-400 transition-colors hover:text-white">Recursos</a>
            <a href="#stats" className="text-sm font-medium text-gray-400 transition-colors hover:text-white">Resultados</a>
            <Link to="/app">
              <Button size="sm" className="bg-red-600 font-bold hover:bg-red-700">PODE ME AJUDAR?</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 bg-red-600/20 blur-[120px] rounded-full" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-red-400">
              <Sparkles className="h-4 w-4" />
              <span>Inteligência Artificial de Elite</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl font-outfit uppercase leading-none">
              DOMINE A <span className="text-red-600">BLAZE</span> <br />
              COM PRECISÃO
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-400 sm:text-xl">
              A plataforma definitiva de análise preditiva para Double. 
              Tecnologia avançada de confluência para encontrar o próximo branco com assertividade recorde.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/app" className="w-full sm:w-auto">
                <Button size="lg" className="h-14 w-full bg-red-600 px-8 text-lg font-bold hover:bg-red-700 sm:w-auto group">
                  COMEÇAR AGORA
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="https://t.me/freitaswhite" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-14 w-full border-white/10 bg-white/5 px-8 text-lg font-bold hover:bg-white/10 sm:w-auto">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  GRUPO FREE
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-24 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Zap className="h-8 w-8 text-red-500" />,
                title: "ANÁLISE EM TEMPO REAL",
                desc: "Monitoramento contínuo de cada rodada com processamento instantâneo de padrões."
              },
              {
                icon: <ShieldCheck className="h-8 w-8 text-red-500" />,
                title: "CONFLUÊNCIA TOP 5",
                desc: "Algoritmos que validam entradas apenas quando múltiplos indicadores convergem."
              },
              {
                icon: <Globe className="h-8 w-8 text-red-500" />,
                title: "GESTÃO PREMIUM",
                desc: "Ferramentas completas para controle de banca e histórico detalhado do dia."
              }
            ].map((feature, i) => (
              <div key={i} className="rounded-3xl border border-white/10 bg-black p-8 transition-transform hover:-translate-y-1">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="mb-2 text-xl font-bold font-outfit uppercase">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Freitas White. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
