-- Revoke execute from public roles for all identified security definer functions in public schema
REVOKE EXECUTE ON FUNCTION public.cleanup_audit_24h() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_audit_fifo() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_strategy_stats(integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.gatilhos_analise_fifo() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.clean_historico_audit_fifo() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_trigger_audits_24h() FROM PUBLIC, authenticated, anon;

-- Explicitly grant to authenticated only where needed
GRANT EXECUTE ON FUNCTION public.get_strategy_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
