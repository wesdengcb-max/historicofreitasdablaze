-- Security fix for gatilhos_analise table
DROP POLICY IF EXISTS "Allow public update" ON public.gatilhos_analise;
DROP POLICY IF EXISTS "Allow public delete" ON public.gatilhos_analise;
DROP POLICY IF EXISTS "Allow public insert" ON public.gatilhos_analise;

GRANT SELECT ON public.gatilhos_analise TO authenticated;
GRANT SELECT ON public.gatilhos_analise TO anon;
GRANT ALL ON public.gatilhos_analise TO service_role;
