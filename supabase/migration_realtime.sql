-- Activa la sincronizacion en tiempo real para ambas tablas
alter publication supabase_realtime add table public.insumos;
alter publication supabase_realtime add table public.hallazgos;
