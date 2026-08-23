import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/_authenticated')({ component: () => <Outlet />,
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
    
    return {
      session,
      user: session.user,
    }
  },
})
