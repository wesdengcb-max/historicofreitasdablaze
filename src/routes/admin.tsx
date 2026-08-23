import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // Verificação de acesso admin via Token VIP
    if (typeof window !== 'undefined') {
      const isVip = localStorage.getItem("freitas_white_vip_status") === "true";
      const vipLevel = localStorage.getItem("freitas_white_vip_level");

      // Bloqueio rigoroso: Se não for VIP ou o nível não for 'admin', redireciona
      if (!isVip || vipLevel !== 'admin') {
        console.warn("[Admin Gate] Acesso negado: Token não possui privilégios administrativos.");
        throw redirect({
          to: '/' as any,
        });
      }
    }
    
    return {
      authType: 'admin'
    }
  },
  component: () => <Outlet />
})
