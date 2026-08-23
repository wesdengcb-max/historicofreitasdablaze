import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw redirect({
        to: '/auth' as any,
        search: {
          redirect: location.href,
        } as any,
      })
    }

    // Check for admin role
    const { data: isAdmin, error } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin'
    })

    if (error || !isAdmin) {
      throw redirect({
        to: '/app' as any
      })
    }
    
    return {
      session,
      user: session.user,
    }
  },
  component: () => <Outlet />
})
