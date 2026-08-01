-- Hace opcional el campo CECO en ambas tablas
alter table public.insumos alter column ceco drop not null;
alter table public.hallazgos alter column ceco drop not null;
