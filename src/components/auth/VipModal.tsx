import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Crown, LogOut, Loader2, ShieldCheck, ArrowRight, User, Lock } from "lucide-react";
import { useVipStatus, setVipStatus, logoutVip, useMemberName, useVipToken } from "@/lib/auth/vipStore";
import { validateToken } from "@/lib/vip.functions";
import { toast } from "sonner";

export function VipModal() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isVip = useVipStatus();
  const memberName = useMemberName();
  const activeToken = useVipToken();

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-vip-modal', handleOpen);
    return () => window.removeEventListener('open-vip-modal', handleOpen);
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputToken = token.trim();
    if (!inputToken) return;

    setIsLoading(true);
    try {
      console.log("[VipModal] Activating token:", inputToken);
      
      const result = await validateToken({ data: { token: inputToken } });
      
      console.log("[VipModal] Validation result:", result);
      
      if (result && result.success) {
        setVipStatus(true, result.member_name, result.level, inputToken);
        toast.success(`Modo VIP Ativado: Bem-vindo, ${result.member_name}!`);
        setOpen(false);
        setToken('');
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error: any) {
      console.error("[VipModal] Activation error:", error);
      toast.error(error.message || 'Token inválido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("freitas_white_vip_token");
      localStorage.removeItem("freitas_white_vip_status");
      localStorage.removeItem("freitas_white_member_name");
      localStorage.removeItem("freitas_white_vip_level");
    }
    logoutVip();
    toast.success("Modo VIP desativado");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[#0c0c0c] border-white/5 text-white max-w-sm sm:max-w-md overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />
        
        {!isVip ? (
          <>
            <DialogHeader className="space-y-4 pt-4">
              <div className="mx-auto w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center border border-red-600/20">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <DialogTitle className="text-2xl font-black text-center uppercase tracking-tighter">
                🔐 Ativar Modo VIP
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-center">
                Digite seu Token VIP para liberar as funções exclusivas do Freitas da Blaze.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleActivate} className="space-y-6 mt-4">
              <div className="space-y-2">
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Digite seu Token VIP"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    className="bg-black/50 border-white/10 h-12 pl-10 text-white placeholder:text-gray-600 focus:border-red-600/50 transition-colors uppercase font-mono tracking-widest"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1 px-1">
                  <ShieldCheck className="w-3 h-3" />
                  Seu acesso é verificado com segurança.
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
                    ATIVAR VIP
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader className="space-y-4 pt-4">
              <div className="mx-auto w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center border border-red-600/20">
                <Crown className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              <DialogTitle className="text-2xl font-black text-center uppercase tracking-tighter">
                ⭐ MODO VIP ATIVO
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 px-2">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Membro</p>
                    <p className="text-sm font-black text-white">{memberName}</p>
                  </div>
                </div>
                
                <div className="h-px bg-white/5 w-full" />
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Token</p>
                    <p className="text-sm font-mono text-white tracking-widest">{activeToken}</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleDeactivate}
                variant="outline"
                className="w-full h-12 border-red-600/20 bg-red-600/5 hover:bg-red-600/20 text-red-500 font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                SAIR DO MODO VIP
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}