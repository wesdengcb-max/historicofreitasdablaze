import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // Check VIP token access on the client
    if (typeof window !== 'undefined') {
      const isVip = localStorage.getItem("freitas_white_vip_status") === "true";
      const vipLevel = localStorage.getItem("freitas_white_vip_level") as "member" | "admin" | null;

      if (!isVip || vipLevel !== 'admin') {
        console.log("[Admin Gate] Access denied: Not an admin token.");
        throw redirect({
          to: '/' as any,
        })
      }
    }
    
    return {
      authType: 'admin'
    }
  },
  component: () => <Outlet />
})
