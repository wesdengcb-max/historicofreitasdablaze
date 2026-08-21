CREATE TABLE IF NOT EXISTS public.trigger_audits (
    id uuid primary key default gen_random_uuid(),
    trigger_name text not null,
    time_minus_1 timestamp with time zone not null,
    time_target timestamp with time zone not null,
    time_plus_1 timestamp with time zone not null,
    is_win boolean,
    created_at timestamp with time zone default now(),
    section_category text -- 'raro', 'isolado', 'top1_top5', 'top5'
);

GRANT SELECT, INSERT, UPDATE ON public.trigger_audits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.trigger_audits TO anon;
GRANT ALL ON public.trigger_audits TO service_role;

ALTER TABLE public.trigger_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read trigger_audits" ON public.trigger_audits FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert trigger_audits" ON public.trigger_audits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update trigger_audits" ON public.trigger_audits FOR UPDATE TO public USING (true);
