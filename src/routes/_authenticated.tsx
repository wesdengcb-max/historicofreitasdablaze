import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({ 
  component: () => <Outlet />,
  beforeLoad: async ({ location }) => {
    // Check VIP token access on the client
    if (typeof window !== 'undefined') {
      const isVip = localStorage.getItem("freitas_white_vip_status") === "true";
      const vipLevel = localStorage.getItem("freitas_white_vip_level") as "member" | "admin" | null;

      // Rotas administrativas exigem EXCLUSIVAMENTE privilégios de admin
      // Rotas protegidas (VIP e Admin)
      if (location.pathname.startsWith('/app') || location.pathname.startsWith('/admin')) {
        const needsAdmin = location.pathname.startsWith('/admin');
        const hasAccess = isVip && (!needsAdmin || vipLevel === 'admin');
        
        if (!hasAccess) {
          console.warn("[Route Gate] Acesso negado:", location.pathname);
          throw redirect({ to: location.pathname as any });
        }
      }
      
      return { 
        authType: vipLevel === 'admin' ? 'admin' : (isVip ? 'vip' : 'public') 
      };
    }

    return { authType: 'public' };
  },
})
