-- Voluntarios del bar (jueves) · proyecto Supabase ClubBelga
-- Una fila por jueves con datos. Los jueves sin fila se muestran vacíos en la app.
create table if not exists public.bar_voluntarios (
  fecha        date primary key check (extract(isodow from fecha) = 4), -- solo jueves
  voluntario_1 text not null default '',
  voluntario_2 text not null default '',
  descripcion  text not null default '',
  updated_at   timestamptz not null default now()
);

-- RLS activado sin políticas: solo el servidor (service role) accede.
alter table public.bar_voluntarios enable row level security;

-- Solo el servidor (service role) accede; ocultar a anon/authenticated
revoke all on table public.bar_voluntarios from anon, authenticated;

-- Lista de voluntarios para los desplegables
create table if not exists public.bar_voluntarios_nombres (
  id         bigint generated always as identity primary key,
  nombre     text not null check (length(trim(nombre)) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists bar_voluntarios_nombres_nombre_uq on public.bar_voluntarios_nombres (lower(trim(nombre)));
alter table public.bar_voluntarios_nombres enable row level security;
revoke all on table public.bar_voluntarios_nombres from anon, authenticated;
insert into public.bar_voluntarios_nombres (nombre) values
  ('Alejandra'),('Jan'),('Ingrid'),('Mieke'),('Roger'),('Nick'),('Flor'),('Paul'),('Francine'),('Soni'),('Leen')
on conflict do nothing;

-- Jueves ya pasados: cerrados salvo que el admin los desbloquee
alter table public.bar_voluntarios add column if not exists desbloqueado boolean not null default false;

-- Días especiales (no jueves) y "club cerrado"
alter table public.bar_voluntarios drop constraint if exists bar_voluntarios_fecha_check;
alter table public.bar_voluntarios add column if not exists cerrado boolean not null default false;
create table if not exists public.bar_dias_especiales (
  fecha      date primary key check (extract(isodow from fecha) <> 4),
  created_at timestamptz not null default now()
);
alter table public.bar_dias_especiales enable row level security;
revoke all on table public.bar_dias_especiales from anon, authenticated;

-- Quién abre y quién cierra (lista fija en la app)
alter table public.bar_voluntarios add column if not exists apertura text not null default '';
alter table public.bar_voluntarios add column if not exists cierre   text not null default '';
