import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'

import { listVipTokens, createVipToken, updateVipToken, deleteVipToken, generateVipToken } from '@/lib/vip.functions'
import { Card } from '@/components/double/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Trash2, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Key,
  Plus,
  RefreshCw,
  Clock,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'tokens'>('tokens')
  

  // Token Management Functions
  const fetchTokens = useServerFn(listVipTokens)
  const doCreateToken = useServerFn(createVipToken)
  const doUpdateToken = useServerFn(updateVipToken)
  const doDeleteToken = useServerFn(deleteVipToken)


  const [isAddingToken, setIsAddingToken] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenExpiry, setNewTokenExpiry] = useState('')
  const [newTokenManual, setNewTokenManual] = useState('')
  const [newTokenLevel, setNewTokenLevel] = useState<'member' | 'admin'>('member')



  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['admin', 'tokens'],
    queryFn: () => fetchTokens(),
    enabled: activeTab === 'tokens'
  })

  const createTokenMutation = useMutation({
    mutationFn: (data: any) => doCreateToken({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] })
      setIsAddingToken(false)
      setNewTokenName('')
      setNewTokenExpiry('')
      setNewTokenManual('')
      setNewTokenLevel('member')

      toast.success('Token VIP gerado com sucesso')
    },
    onError: (err: any) => toast.error('Erro ao gerar token', { description: err.message })
  })

  const deleteTokenMutation = useMutation({
    mutationFn: (id: string) => doDeleteToken({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] })
      toast.success('Token revogado')
    }
  })

  const updateTokenStatusMutation = useMutation({
    mutationFn: (data: any) => doUpdateToken({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tokens'] })
      toast.success('Status do token atualizado')
    }
  })


  return (
    <div className="min-h-screen bg-[#020407] p-4 sm:p-8 text-white space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Painel Admin</h1>
          </div>
          <p className="text-muted-foreground text-sm">Gerenciamento de membros, tokens VIP e permissões do sistema.</p>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
          <button
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-2 bg-red-600 text-white"
          >
            <Key className="w-3.5 h-3.5" />
            Tokens VIP
          </button>
        </div>
      </div>


      {activeTab === 'tokens' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-2">
              <Key className="w-5 h-5 text-red-500" />
              Gestão de Tokens VIP
            </h2>
            <Button 
              onClick={() => setIsAddingToken(!isAddingToken)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 text-xs uppercase tracking-widest h-9"
            >
              <Plus className="w-4 h-4" />
              Gerar Novo Token
            </Button>
          </div>

          {isAddingToken && (
            <Card className="max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-tighter">Gerar Token VIP</h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  createTokenMutation.mutate({ 
                    member_name: newTokenName, 
                    expires_at: newTokenExpiry || undefined,
                    token: newTokenManual || undefined,
                    level: newTokenLevel
                  })

                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nome do Membro</label>
                  <Input 
                    type="text" 
                    value={newTokenName} 
                    onChange={e => setNewTokenName(e.target.value)}
                    placeholder="Ex: João Silva"
                    required
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Token Personalizado (Opcional)</label>
                  <div className="flex gap-2">
                    <Input 
                      type="text" 
                      value={newTokenManual} 
                      onChange={e => setNewTokenManual(e.target.value)}
                      placeholder="Ex: FW-XXXX-XXXX"
                      className="bg-white/5 border-white/10 font-mono"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setNewTokenManual(generateVipToken())}
                      className="border-white/10"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Data de Expiração (Opcional)</label>
                  <Input 
                    type="date" 
                    value={newTokenExpiry} 
                    onChange={e => setNewTokenExpiry(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nível de Acesso</label>
                  <select 
                    value={newTokenLevel}
                    onChange={(e) => setNewTokenLevel(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-white/10 bg-black/50 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                  >
                    <option value="member">Membro VIP</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">

                  <Button type="button" variant="ghost" onClick={() => setIsAddingToken(false)}>Cancelar</Button>
                  <Button 
                    type="submit" 
                    disabled={createTokenMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {createTokenMutation.isPending ? 'Gerando...' : 'Gerar Token'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {tokensLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">Carregando tokens...</div>
            ) : tokens?.map((token: any) => (
              <Card key={token.id} className="hover:border-white/20 transition-colors border-white/5 bg-white/[0.02]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${token.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                      <Key className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-primary tracking-widest uppercase">{token.token}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-black uppercase",
                          token.status === 'active' ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                        )}>
                          {token.status === 'active' ? 'Ativo' : token.status === 'expired' ? 'Expirado' : 'Inativo'}
                        </span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-black uppercase",
                          token.level === 'admin' ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500"
                        )}>
                          {token.level === 'admin' ? 'ADMIN' : 'Membro'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {token.member_name}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expira em: {token.expires_at ? new Date(token.expires_at).toLocaleDateString() : 'Nunca'}</span>
                        {token.expires_at && (
                          <span className={cn(
                            "flex items-center gap-1 font-bold",
                            Math.ceil((new Date(token.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 5 ? "text-red-500" : "text-emerald-500"
                          )}>
                            <Clock className="w-3 h-3" />
                            {Math.ceil((new Date(token.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias restantes
                          </span>
                        )}

                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Criado em: {new Date(token.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      title={token.status === 'active' ? 'Desativar Token' : 'Ativar Token'}
                      onClick={() => updateTokenStatusMutation.mutate({ 
                        id: token.id, 
                        status: token.status === 'active' ? 'inactive' : 'active' 
                      })}
                      className={token.status === 'active' ? 'text-emerald-500 hover:text-emerald-400' : 'text-red-500 hover:text-red-400'}
                    >
                      {token.status === 'active' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      title="Revogar Token"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja revogar este token permanentemente?')) {
                          deleteTokenMutation.mutate(token.id)
                        }
                      }}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {!tokensLoading && tokens?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                Nenhum token gerado ainda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
