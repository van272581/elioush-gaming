-- Elioush Gaming - schema Supabase de migration
-- A executer dans Supabase SQL Editor apres creation du projet.
-- Ce script ne contient aucune cle ni donnee utilisateur.

create extension if not exists "pgcrypto";

create type public.community_role as enum ('member', 'player', 'manager');
create type public.submission_status as enum ('pending', 'review', 'approved', 'refused');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  photo_url text,
  community_role public.community_role not null default 'member',
  discord_user_id text unique,
  discord_username text,
  discord_verified boolean not null default false,
  steam_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  category text not null check (category in ('vehicules', 'peintures', 'cartes', 'divers')),
  description text not null,
  images text[] not null default '{}',
  download_links jsonb not null default '[]'::jsonb,
  version text,
  status public.submission_status not null default 'approved',
  downloads integer not null default 0 check (downloads >= 0),
  source text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null check (category in ('vehicules', 'peintures', 'cartes', 'divers')),
  description text not null,
  images text[] not null default '{}',
  download_links jsonb not null default '[]'::jsonb,
  version text,
  status public.submission_status not null default 'pending',
  status_message text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mod_id uuid references public.mods(id) on delete set null,
  mod_title text not null,
  source text,
  downloaded_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  mod_id uuid not null references public.mods(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mods_status_date_idx on public.mods(status, created_at desc);
create index if not exists submissions_author_date_idx on public.submissions(author_id, created_at desc);
create index if not exists downloads_user_mod_idx on public.downloads(user_id, mod_id, downloaded_at desc);
create index if not exists comments_mod_date_idx on public.comments(mod_id, created_at asc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute procedure public.touch_updated_at();
drop trigger if exists mods_touch_updated_at on public.mods;
create trigger mods_touch_updated_at before update on public.mods for each row execute procedure public.touch_updated_at();
drop trigger if exists submissions_touch_updated_at on public.submissions;
create trigger submissions_touch_updated_at before update on public.submissions for each row execute procedure public.touch_updated_at();

create or replace function public.current_community_role()
returns public.community_role
language sql
stable
security definer set search_path = public
as $$
  select community_role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and community_role = 'manager'
  );
$$;

alter table public.profiles enable row level security;
alter table public.mods enable row level security;
alter table public.submissions enable row level security;
alter table public.downloads enable row level security;
alter table public.comments enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_manager());
drop policy if exists profiles_update_own_safe on public.profiles;
create policy profiles_update_own_safe on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and community_role = public.current_community_role());

drop policy if exists mods_public_read on public.mods;
create policy mods_public_read on public.mods for select using (status = 'approved' or public.is_manager());
drop policy if exists mods_manager_insert on public.mods;
create policy mods_manager_insert on public.mods for insert to authenticated
with check (public.is_manager() and author_id = auth.uid());
drop policy if exists mods_manager_update on public.mods;
create policy mods_manager_update on public.mods for update to authenticated
using (public.is_manager() and author_id = auth.uid())
with check (public.is_manager() and author_id = auth.uid());

-- Les joueurs creent des soumissions. Les gerants peuvent publier directement via Edge Function.
drop policy if exists submissions_owner_read on public.submissions;
create policy submissions_owner_read on public.submissions for select to authenticated using (author_id = auth.uid() or public.is_manager());
drop policy if exists submissions_player_create on public.submissions;
create policy submissions_player_create on public.submissions for insert to authenticated
with check (author_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and community_role in ('player', 'manager')));
drop policy if exists submissions_manager_update on public.submissions;
create policy submissions_manager_update on public.submissions for update to authenticated
using (public.is_manager()) with check (public.is_manager());

 drop policy if exists downloads_owner_read on public.downloads;
create policy downloads_owner_read on public.downloads for select to authenticated using (user_id = auth.uid());
drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments for select using (true);
drop policy if exists comments_authenticated_create on public.comments;
create policy comments_authenticated_create on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists audit_manager_read on public.audit_logs;
create policy audit_manager_read on public.audit_logs for select to authenticated using (public.is_manager());

-- Les insertions downloads et audit_logs seront faites par Edge Functions service-side.
comment on table public.profiles is 'Profils et roles communautaires Elioush Gaming';
comment on table public.mods is 'Mods publies ou en attente';
comment on table public.submissions is 'Soumissions des joueurs';
comment on table public.downloads is 'Historique prive des telechargements';
