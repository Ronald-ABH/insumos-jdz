-- Tabla de configuracion general de la app (una sola fila)
create table if not exists public.configuracion (
  id integer primary key default 1,
  correo_respaldo text,
  updated_at timestamptz not null default now(),
  constraint una_sola_fila check (id = 1)
);

insert into public.configuracion (id, correo_respaldo)
values (1, null)
on conflict (id) do nothing;

alter table public.configuracion enable row level security;

create policy "configuracion_select" on public.configuracion for select using (true);
create policy "configuracion_update" on public.configuracion for update using (true);
