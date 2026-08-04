-- Correcting RLS policies for gatilhos_analise.
-- The current policies in context are 'gatilhos leitura publica' and 'gatilhos insercao validada'.
-- The security scan reported PUBLIC_WRITE_ACCESS (UPDATE/DELETE) and REDUNDANT_INSERT_POLICY.
-- Even though read_query only showed two policies, I will explicitly drop the problematic ones by name if they were missed or just to be safe.
-- We want ONLY SELECT for public and the validated INSERT.

DROP POLICY IF EXISTS "Allow public update" ON public.gatilhos_analise;
DROP POLICY IF EXISTS "Allow public delete" ON public.gatilhos_analise;
DROP POLICY IF EXISTS "Allow public insert" ON public.gatilhos_analise;
DROP POLICY IF EXISTS "gatilhos_analise_public_update_delete" ON public.gatilhos_analise;
DROP POLICY IF EXISTS "gatilhos_analise_unrestricted_insert_policy" ON public.gatilhos_analise;

-- Ensure RLS is active
ALTER TABLE public.gatilhos_analise ENABLE ROW LEVEL SECURITY;

-- The 'gatilhos leitura publica' and 'gatilhos insercao validada' are already correct.
-- I am not re-creating them to avoid 'already exists' errors, unless the scanner thinks they are the ones.
-- The scanner says 'Allow public update', 'Allow public delete' and 'Allow public insert' are the issues.
