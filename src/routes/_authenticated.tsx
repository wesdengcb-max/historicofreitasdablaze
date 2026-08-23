import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/_authenticated')({ 
  component: () => <Outlet />,
  beforeLoad: async ({ location }) => {
    // Check Supabase session (traditional admin login - disabled by user request, using hybrid flow only)
    const session = null;
    
    // Check VIP token access (hybrid flow)
    let isVip = false;
    let vipLevel: 'member' | 'admin' | null = null;
    
    if (typeof window !== 'undefined') {
      isVip = localStorage.getItem("freitas_white_vip_status") === "true";
      vipLevel = localStorage.getItem("freitas_white_vip_level") as "member" | "admin" | null;
    }

    const hasAdminAccess = vipLevel === 'admin';

    // Admin routes REQUIRE admin privileges
    if (location.pathname.startsWith('/admin')) {
      if (!hasAdminAccess) {
        console.log("[Route Gate] Non-admin attempting to access admin route:", location.pathname);
        throw redirect({
          to: '/' as any,
        })
      }
      return { authType: 'admin' }
    }

    // VIP area (like /app, /sinais, etc) is now public by default
    // Access to specific tabs/features is controlled inside Sidebar.tsx and components
    
    return {
      session: null,
      user: null,
      authType: hasAdminAccess ? 'admin' : (isVip ? 'vip' : 'public')
    }
  },
})
