import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({ 
  component: () => <Outlet />,
  beforeLoad: async ({ location }) => {
    // Check VIP token access on the client
    if (typeof window !== 'undefined') {
      const isVip = localStorage.getItem("freitas_white_vip_status") === "true";
      const vipLevel = localStorage.getItem("freitas_white_vip_level") as "member" | "admin" | null;

      // Admin routes REQUIRE admin privileges
      if (location.pathname.startsWith('/admin')) {
        if (!isVip || vipLevel !== 'admin') {
          console.log("[Route Gate] Access denied to admin route:", location.pathname);
          throw redirect({
            to: '/' as any,
          });
        }
      }
      
      return { 
        authType: vipLevel === 'admin' ? 'admin' : (isVip ? 'vip' : 'public') 
      };
    }

    return { authType: 'public' };
  },
})
