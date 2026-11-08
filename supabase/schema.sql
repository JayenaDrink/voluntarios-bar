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
