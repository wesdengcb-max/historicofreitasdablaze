import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // Relying purely on VIP tokens for admin access as requested
    let isVip = false;
    let vipLevel: 'member' | 'admin' | null = null;
    
    if (typeof window !== 'undefined') {
      isVip = localStorage.getItem("freitas_white_vip_status") === "true";
      vipLevel = localStorage.getItem("freitas_white_vip_level") as "member" | "admin" | null;
    }

    if (vipLevel !== 'admin') {
      console.log("[Admin Gate] Access denied: Not an admin token.");
      throw redirect({
        to: '/' as any,
      })
    }
    
    return {
      authType: 'admin'
    }
  },
  component: () => <Outlet />
})
