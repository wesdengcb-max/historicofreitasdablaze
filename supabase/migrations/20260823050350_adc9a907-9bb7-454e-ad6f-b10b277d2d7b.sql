-- Revoke execute on the has_role function from public and authenticated roles
-- It should only be used by the system (RLS policies) or through specific grants if needed
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- Explicitly allow service_role if needed (though RLS uses owner permissions)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
