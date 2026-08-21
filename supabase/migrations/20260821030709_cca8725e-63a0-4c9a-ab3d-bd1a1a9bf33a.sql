-- Create trigger_audits table
CREATE TABLE public.trigger_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gatilho TEXT NOT NULL,
    horario_alvo TIMESTAMPTZ NOT NULL,
    horario_base TIMESTAMPTZ NOT NULL,
    win BOOLEAN DEFAULT NULL,
    analysis_count INTEGER DEFAULT 1,
    category TEXT NOT NULL, -- rare, top1, top5, secondary
    confluences TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant access
GRANT SELECT ON public.trigger_audits TO authenticated;
GRANT SELECT ON public.trigger_audits TO anon;
GRANT ALL ON public.trigger_audits TO service_role;

-- Enable RLS
ALTER TABLE public.trigger_audits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public select" ON public.trigger_audits
    FOR SELECT USING (true);

-- Function for cleanup (24h)
CREATE OR REPLACE FUNCTION public.cleanup_trigger_audits_24h()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.trigger_audits
    WHERE created_at < NOW() - INTERVAL '24 hours';
$$;
