import { createFileRoute, Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import fwLogoAsset from "@/assets/fw-logo-link.png.asset.json"

export const Route = createFileRoute('/auth')({
  component: AuthPage,
})

function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const search = useRouterState({ select: (s) => s.location.search }) as { redirect?: string }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Erro no login', { description: error.message })
      setLoading(false)
      return
    }

    toast.success('Login realizado com sucesso!')
    const redirectTo = search.redirect || '/app'
    navigate({ to: redirectTo })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020407] p-4 text-white">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-[#0c0c0c] p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 h-20 w-20 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-red-600 rounded-full opacity-20 blur-md animate-pulse" />
            <div className="relative z-10 w-full h-full p-2 bg-black rounded-full border border-red-600/50 overflow-hidden flex items-center justify-center">
              <img src={fwLogoAsset.url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Acessar Conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Insira suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-[0_4px_20px_rgba(220,38,38,0.3)] transition-all active:scale-95 border-none"
          >
            {loading ? 'Carregando...' : 'Entrar Agora'}
          </Button>

          <div className="text-center">
            <Link to="/" className="text-xs font-bold text-muted-foreground hover:text-white transition-colors">
              Voltar para a Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
