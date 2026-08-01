-- Esquema para la app de Insumos JDZ y Hallazgos BPM/SST
-- Ejecutar completo en Supabase: SQL Editor -> New query -> pegar -> Run

-- Tabla de Solicitud de Insumos
create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  ceco text not null,
  tienda text not null,
  cantidad integer not null default 1,
  insumo text not null,
  fecha_envio date,
  evidencia_url text,
  created_at timestamptz not null default now()
);

-- Tabla de Hallazgos BPM y SST (misma estructura)
create table if not exists public.hallazgos (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  ceco text not null,
  tienda text not null,
  cantidad integer not null default 1,
  insumo text not null,
  fecha_envio date,
  evidencia_url text,
  created_at timestamptz not null default now()
);

-- Activar seguridad a nivel de fila (obligatorio en Supabase)
alter table public.insumos enable row level security;
alter table public.hallazgos enable row level security;

-- Como el acceso a la app ya está protegido por contraseña compartida,
-- permitimos lectura/escritura desde la clave publishable (anon) para ambas tablas.
create policy "insumos_select" on public.insumos for select using (true);
create policy "insumos_insert" on public.insumos for insert with check (true);
create policy "insumos_update" on public.insumos for update using (true);
create policy "insumos_delete" on public.insumos for delete using (true);

create policy "hallazgos_select" on public.hallazgos for select using (true);
create policy "hallazgos_insert" on public.hallazgos for insert with check (true);
create policy "hallazgos_update" on public.hallazgos for update using (true);
create policy "hallazgos_delete" on public.hallazgos for delete using (true);

-- Bucket de almacenamiento para las fotos de evidencia
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

-- Permitir subir/leer archivos del bucket "evidencias" con la clave publishable
create policy "evidencias_select" on storage.objects for select using (bucket_id = 'evidencias');
create policy "evidencias_insert" on storage.objects for insert with check (bucket_id = 'evidencias');
create policy "evidencias_update" on storage.objects for update using (bucket_id = 'evidencias');
create policy "evidencias_delete" on storage.objects for delete using (bucket_id = 'evidencias');
