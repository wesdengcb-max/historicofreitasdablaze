-- Fix security for newly created function
REVOKE EXECUTE ON FUNCTION public.cleanup_trigger_audits_24h() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_trigger_audits_24h() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_trigger_audits_24h() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_trigger_audits_24h() TO service_role;
