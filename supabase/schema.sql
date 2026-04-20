-- =====================================================================
-- NovaFit · Supabase schema
-- Ejecutar todo este archivo en: SQL Editor → New Query → Run
-- Idempotente (drop & create) para iteración rápida en dev.
-- =====================================================================

-- --- Extensiones ---------------------------------------------------------
create extension if not exists pgcrypto;

-- =====================================================================
-- TABLAS
-- =====================================================================

-- --- profiles ----------------------------------------------------------
-- 1:1 con auth.users (el id es el uid de Supabase Auth)
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text unique not null
                   check (char_length(username) between 3 and 24
                          and username ~ '^[a-z0-9_]+$'),
  display_name   text not null,
  friend_code    text unique not null,
  avatar_color   text not null default '#5ce1ff',
  created_at     timestamptz not null default now()
);

-- --- routines ----------------------------------------------------------
create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_routines_user on public.routines(user_id);

-- --- routine_exercises -------------------------------------------------
create table if not exists public.routine_exercises (
  id              uuid primary key default gen_random_uuid(),
  routine_id      uuid not null references public.routines(id) on delete cascade,
  position        int  not null,
  name            text not null,
  planned_sets    int  not null default 3 check (planned_sets >= 1),
  default_reps    int  not null default 10 check (default_reps >= 0),
  default_weight  numeric not null default 0 check (default_weight >= 0)
);
create index if not exists idx_routine_ex_routine on public.routine_exercises(routine_id);

-- --- sessions ----------------------------------------------------------
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  routine_id    uuid references public.routines(id) on delete set null,
  routine_name  text not null,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz
);
create index if not exists idx_sessions_user on public.sessions(user_id);
create index if not exists idx_sessions_ended on public.sessions(user_id, ended_at desc);

-- Solo una sesión activa (ended_at null) por usuario
create unique index if not exists uniq_one_active_session_per_user
  on public.sessions(user_id) where ended_at is null;

-- --- session_exercises -------------------------------------------------
create table if not exists public.session_exercises (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.sessions(id) on delete cascade,
  position              int  not null,
  exercise_template_id  uuid,
  name                  text not null
);
create index if not exists idx_session_ex_session on public.session_exercises(session_id);

-- --- sets --------------------------------------------------------------
create table if not exists public.sets (
  id                   uuid primary key default gen_random_uuid(),
  session_exercise_id  uuid not null references public.session_exercises(id) on delete cascade,
  position             int  not null,
  reps                 int  not null default 0 check (reps >= 0),
  weight               numeric not null default 0 check (weight >= 0)
);
create index if not exists idx_sets_session_ex on public.sets(session_exercise_id);

-- --- friendships -------------------------------------------------------
-- Invitaciones entre cazadores. Status: pending (enviada) | accepted.
create table if not exists public.friendships (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid not null references public.profiles(id) on delete cascade,
  addressee_id   uuid not null references public.profiles(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','accepted')),
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id);

-- =====================================================================
-- HELPERS
-- =====================================================================

-- Generador de friend_code: 6 caracteres alfanuméricos (sin chars ambiguos)
create or replace function public.generate_friend_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  attempts int := 0;
begin
  loop
    code := '';
    for _ in 1..6 loop
      code := code || substr(alphabet, 1 + (random() * (length(alphabet) - 1))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'No se pudo generar un friend_code único.';
    end if;
  end loop;
  return code;
end;
$$;

-- Hash estable para color de avatar (mismo username → mismo color)
create or replace function public.avatar_color_for(seed text)
returns text
language plpgsql
as $$
declare
  palette text[] := array[
    '#5ce1ff','#a87bff','#ffd76a','#ff4fa3',
    '#34d399','#60a5fa','#f472b6','#fb7185'
  ];
  h int := 0;
  i int;
begin
  for i in 1..char_length(seed) loop
    h := (h * 31 + ascii(substr(seed, i, 1))) % 2147483647;
  end loop;
  return palette[1 + (abs(h) % array_length(palette, 1))];
end;
$$;

-- =====================================================================
-- TRIGGER: crear profile al registrarse un nuevo auth.users
-- Usa raw_user_meta_data.username y raw_user_meta_data.display_name
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname       text;
  base_uname  text;
  dname       text;
  attempt     int := 0;
begin
  -- 1) Normalizar el username que viene del cliente (o derivarlo del email)
  uname := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if uname = '' or uname !~ '^[a-z0-9_]{3,24}$' then
    uname := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1),
                                  '[^a-z0-9_]', '_', 'g'));
    if char_length(uname) > 24 then
      uname := substr(uname, 1, 24);
    end if;
    if char_length(uname) < 3 then
      uname := uname || substr(replace(new.id::text, '-', ''), 1, 6);
      uname := substr(uname, 1, 24);
    end if;
  end if;

  -- 2) Si ya existe, añadir sufijo numérico en vez de explotar
  base_uname := uname;
  while exists (select 1 from public.profiles where username = uname) loop
    attempt := attempt + 1;
    uname := substr(base_uname, 1, 21) || '_' || attempt::text;
    exit when attempt > 99;
  end loop;

  dname := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), uname);

  -- 3) Intentar crear el profile; si falla por cualquier motivo, NO abortamos el
  --    signup: dejamos que el cliente lo cree en el primer login.
  begin
    insert into public.profiles (id, username, display_name, friend_code, avatar_color)
    values (
      new.id,
      uname,
      dname,
      public.generate_friend_code(),
      public.avatar_color_for(uname)
    );
  exception when others then
    raise warning 'handle_new_user: no se pudo crear profile (%): %',
      sqlstate, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- FUNCIÓN: stats semanales (suma peso×reps, últimos 7 días)
-- Útil para la comparativa de amigos con RLS.
-- =====================================================================

create or replace function public.weekly_stats(for_user uuid)
returns table (
  volume_kg         numeric,
  sessions_count    int
)
language sql
stable
security definer
set search_path = public
as $$
  with completed as (
    select s.id
    from public.sessions s
    where s.user_id = for_user
      and s.ended_at is not null
      and s.ended_at >= now() - interval '7 days'
      and (
        for_user = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = auth.uid() and f.addressee_id = for_user)
              or (f.addressee_id = auth.uid() and f.requester_id = for_user))
        )
      )
  ),
  vol as (
    select coalesce(sum(st.reps * st.weight), 0)::numeric as v
    from completed c
    join public.session_exercises se on se.session_id = c.id
    join public.sets st on st.session_exercise_id = se.id
  )
  select v, (select count(*)::int from completed) from vol;
$$;

-- =====================================================================
-- FUNCIÓN: serie diaria de volumen (últimos N días)
-- =====================================================================

create or replace function public.daily_volume(for_user uuid, days int default 7)
returns table (
  day    date,
  volume numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with series as (
    select generate_series(
      (current_date - (days - 1))::date,
      current_date,
      interval '1 day'
    )::date as day
  ),
  vols as (
    select (s.ended_at at time zone 'UTC')::date as day,
           coalesce(sum(st.reps * st.weight), 0)::numeric as volume
    from public.sessions s
    join public.session_exercises se on se.session_id = s.id
    join public.sets st on st.session_exercise_id = se.id
    where s.user_id = for_user
      and s.ended_at is not null
      and s.ended_at >= (current_date - (days - 1))::timestamptz
      and (
        for_user = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = auth.uid() and f.addressee_id = for_user)
              or (f.addressee_id = auth.uid() and f.requester_id = for_user))
        )
      )
    group by 1
  )
  select se.day, coalesce(v.volume, 0)
  from series se
  left join vols v on v.day = se.day
  order by se.day;
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.routines            enable row level security;
alter table public.routine_exercises   enable row level security;
alter table public.sessions            enable row level security;
alter table public.session_exercises   enable row level security;
alter table public.sets                enable row level security;
alter table public.friendships         enable row level security;

-- --- profiles: SELECT libre para buscar amigos; UPDATE solo uno mismo ---
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (auth.uid() = id);

-- --- routines (owned by user_id) ---
drop policy if exists routines_all on public.routines;
create policy routines_all on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- routine_exercises: acceso a través de la rutina ---
drop policy if exists routine_exercises_all on public.routine_exercises;
create policy routine_exercises_all on public.routine_exercises
  for all using (
    exists (select 1 from public.routines r
            where r.id = routine_exercises.routine_id and r.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.routines r
            where r.id = routine_exercises.routine_id and r.user_id = auth.uid())
  );

-- --- sessions (owned) ---
drop policy if exists sessions_all on public.sessions;
create policy sessions_all on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- session_exercises ---
drop policy if exists session_exercises_all on public.session_exercises;
create policy session_exercises_all on public.session_exercises
  for all using (
    exists (select 1 from public.sessions s
            where s.id = session_exercises.session_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.sessions s
            where s.id = session_exercises.session_id and s.user_id = auth.uid())
  );

-- --- sets ---
drop policy if exists sets_all on public.sets;
create policy sets_all on public.sets
  for all using (
    exists (
      select 1 from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      where se.id = sets.session_exercise_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      where se.id = sets.session_exercise_id and s.user_id = auth.uid()
    )
  );

-- --- friendships: ambos lados pueden leer / modificar su relación ---
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update using (auth.uid() in (requester_id, addressee_id))
  with check (auth.uid() in (requester_id, addressee_id));

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete using (auth.uid() in (requester_id, addressee_id));

-- =====================================================================
-- GRANTS (Supabase ya otorga a anon/authenticated por defecto, pero por si acaso)
-- =====================================================================

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant execute on function public.weekly_stats(uuid) to authenticated;
grant execute on function public.daily_volume(uuid, int) to authenticated;
