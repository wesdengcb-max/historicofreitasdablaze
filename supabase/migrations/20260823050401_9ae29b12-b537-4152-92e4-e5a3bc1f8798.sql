-- Revoke execute on maintain_audit_limit from public roles
REVOKE EXECUTE ON FUNCTION public.maintain_audit_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maintain_audit_limit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.maintain_audit_limit() FROM anon;
GRANT EXECUTE ON FUNCTION public.maintain_audit_limit() TO service_role;
