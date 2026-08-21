-- Drop the table if it was created with wrong columns
DROP TABLE IF EXISTS public.trigger_audits;

CREATE TABLE public.trigger_audits (
    id uuid primary key default gen_random_uuid(),
    gatilho text not null,
    horario_base timestamp with time zone not null,
    horario_alvo timestamp with time zone not null,
    horario_extra timestamp with time zone not null,
    win boolean,
    created_at timestamp with time zone default now(),
    category text, -- 'raro', 'isolado', 'top1_top5', 'top5'
    analysis_count integer,
    confluences text
);

GRANT SELECT, INSERT, UPDATE ON public.trigger_audits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.trigger_audits TO anon;
GRANT ALL ON public.trigger_audits TO service_role;

ALTER TABLE public.trigger_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read trigger_audits" ON public.trigger_audits FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert trigger_audits" ON public.trigger_audits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update trigger_audits" ON public.trigger_audits FOR UPDATE TO public USING (true);
