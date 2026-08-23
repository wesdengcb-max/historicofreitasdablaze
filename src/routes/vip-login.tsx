import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { validateToken } from '@/lib/vip.functions'
import { useVipStore } from '@/lib/vipStore'
import { toast } from 'sonner'
import fwLogoAsset from "@/assets/fw-logo-link.png.asset.json"

export const Route = createFileRoute('/vip-login')({
  component: VipLoginPage,
})

function VipLoginPage() {
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const search = useSearch({ from: '/vip-login' }) as any
  const setVip = useVipStore(state => state.setVip)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return

    setIsLoading(true)
    try {
      const result = await validateToken({ data: { token: token.trim() } })
      if (result.success) {
        setVip(true, result.member_name)
        toast.success(`Bem-vindo, ${result.member_name}!`)
        
        const redirectTo = search.redirect || '/app'
        navigate({ to: redirectTo })
      }
    } catch (error: any) {
      toast.error(error.message || 'Token inválido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020407] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full" />
      </div>

      <Card className="relative z-10 w-full max-w-md bg-[#0c0c0c] border-white/5 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />
        
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-black rounded-full border border-red-600/30 flex items-center justify-center p-2">
              <img src={fwLogoAsset.url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter">Área VIP</CardTitle>
          <CardDescription className="text-gray-400">
            Informe seu token exclusivo para acessar as ferramentas Premium.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Ex: FW-XXXX-XXXX"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="bg-black/50 border-white/10 h-12 pl-10 text-white placeholder:text-gray-600 focus:border-red-600/50 transition-colors uppercase font-mono tracking-widest"
                  disabled={isLoading}
                />
              </div>
              <p className="text-[10px] text-gray-500 flex items-center gap-1 px-1">
                <ShieldCheck className="w-3 h-3" />
                Sua conexão é segura e criptografada
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Entrar na Área VIP
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <div className="pt-4 text-center">
              <Link to="/" className="text-xs text-gray-500 hover:text-white transition-colors">
                Voltar para a Página Inicial
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
