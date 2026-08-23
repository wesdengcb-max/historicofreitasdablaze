import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { listUsers, createUser, updateUserStatus, deleteUser, updateUserRole } from '@/lib/admin.functions'
import { Card } from '@/components/double/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Calendar,
  Key
} from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const queryClient = useQueryClient()
  const fetchUsers = useServerFn(listUsers)
  const doCreateUser = useServerFn(createUser)
  const doUpdateStatus = useServerFn(updateUserStatus)
  const doDeleteUser = useServerFn(deleteUser)
  const doUpdateRole = useServerFn(updateUserRole)

  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user')

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchUsers()
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => doCreateUser({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setIsAdding(false)
      setNewEmail('')
      setNewPassword('')
      toast.success('Usuário criado com sucesso')
    },
    onError: (err: any) => toast.error('Erro ao criar usuário', { description: err.message })
  })

  const statusMutation = useMutation({
    mutationFn: (data: any) => doUpdateStatus({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Status atualizado')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => doDeleteUser({ data: { userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Usuário removido')
    }
  })

  const roleMutation = useMutation({
    mutationFn: (data: any) => doUpdateRole({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Permissão atualizada')
    }
  })

  if (isLoading) return <div className="p-8 text-white">Carregando painel...</div>

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
          <p className="text-muted-foreground text-sm">Gerenciamento de membros e permissões do sistema.</p>
        </div>

        <Button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Novo Membro
        </Button>
      </div>

      {isAdding && (
        <Card className="max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-500" />
            Adicionar Novo Usuário
          </h2>
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate({ email: newEmail, password: newPassword, role: newRole })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">E-mail</label>
              <Input 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Senha Inicial</label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargo</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              >
                <option value="user">Membro Normal</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {createMutation.isPending ? 'Criando...' : 'Confirmar Cadastro'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {users?.map((user: any) => (
          <Card key={user.id} className="hover:border-white/20 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${user.role === 'admin' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                  {user.role === 'admin' ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{user.email}</span>
                    {user.status === 'inactive' && (
                      <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-black uppercase">Bloqueado</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.id}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Criado em: {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  title={user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                  onClick={() => roleMutation.mutate({ userId: user.id, role: user.role === 'admin' ? 'user' : 'admin' })}
                  className={user.role === 'admin' ? 'text-amber-500 hover:text-amber-400' : 'text-muted-foreground'}
                >
                  <Shield className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  title={user.status === 'active' ? 'Desativar Conta' : 'Ativar Conta'}
                  onClick={() => statusMutation.mutate({ userId: user.id, active: user.status !== 'active' })}
                  className={user.status === 'active' ? 'text-emerald-500 hover:text-emerald-400' : 'text-red-500 hover:text-red-400'}
                >
                  {user.status === 'active' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  title="Excluir Usuário"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este usuário permanentemente?')) {
                      deleteMutation.mutate(user.id)
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
      </div>
    </div>
  )
}
