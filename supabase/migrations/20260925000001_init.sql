-- =============================================================================
-- Itaager — initial schema
-- Creator-support platform (Buy-Me-a-Coffee style) for Somalia.
--
-- Security model:
--   * Every table has RLS enabled.
--   * Clients (anon / authenticated) NEVER write transactions, supporters or
--     payment_logs. Only Edge Functions using the service role do, via
--     finalize_transaction() and direct inserts.
--   * Aggregate earnings columns are protected with column-level privileges.
--   * Role / status of a profile can only be changed by a super_admin.
-- =============================================================================

create extension if not exists citext;
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('super_admin', 'creator', 'supporter');
create type public.account_status as enum ('active', 'suspended');
create type public.transaction_status as enum (
  'pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded'
);
create type public.currency_code as enum ('USD', 'SOS');

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 80),
  username    citext not null unique
              check (username ~ '^[a-z0-9_]{3,30}$'),
  email       citext not null,
  phone       text check (phone is null or phone ~ '^\+?[0-9]{7,15}$'),
  avatar_url  text,
  bio         text check (bio is null or char_length(bio) <= 300),
  location    text check (location is null or char_length(location) <= 80),
  role        public.user_role not null default 'supporter',
  status      public.account_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Reserved usernames (collide with routes or could be used for impersonation).
create table public.reserved_usernames (username citext primary key);
insert into public.reserved_usernames (username) values
  ('admin'), ('administrator'), ('api'), ('auth'), ('dashboard'), ('login'),
  ('logout'), ('register'), ('signup'), ('settings'), ('support'), ('help'),
  ('explore'), ('creator'), ('creators'), ('pay'), ('payment'), ('payments'),
  ('itaager'), ('root'), ('system'), ('hormuud'), ('evc'), ('onboarding'),
  ('about'), ('terms'), ('privacy'), ('contact'), ('staff'), ('moderator');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'super_admin'
      and status = 'active'
  );
$$;

-- Prevent non-admins from escalating role / changing status / username.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (Edge Functions, SQL editor) bypasses this guard.
  if auth.role() = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    if new.role is distinct from old.role then
      -- A supporter may upgrade themselves to creator, nothing else.
      if not (old.role = 'supporter' and new.role = 'creator') then
        raise exception 'Not allowed to change role';
      end if;
    end if;
    if new.status is distinct from old.status then
      raise exception 'Not allowed to change account status';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'Not allowed to change owner';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Email is managed by authentication';
    end if;
  else
    -- Admins cannot demote the last active super admin by accident.
    if old.role = 'super_admin' and new.role <> 'super_admin' and
       (select count(*) from public.profiles
         where role = 'super_admin' and status = 'active') <= 1 then
      raise exception 'Cannot remove the last super admin';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Creates a profile when a user signs up. Only "creator" or "supporter" can
-- come from signup metadata — super_admin can never be self-assigned.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username citext;
  v_role public.user_role;
begin
  v_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if v_username !~ '^[a-z0-9_]{3,30}$'
     or exists (select 1 from public.reserved_usernames where username = v_username)
     or exists (select 1 from public.profiles where username = v_username) then
    -- Fallback: unique, valid username derived from the user id.
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  v_role := case
    when new.raw_user_meta_data ->> 'account_type' = 'creator' then 'creator'
    else 'supporter'
  end::public.user_role;

  insert into public.profiles (user_id, full_name, username, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user'),
    v_username,
    new.email,
    v_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when auth email changes.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(p_username) ~ '^[a-z0-9_]{3,30}$'
    and not exists (select 1 from public.reserved_usernames where username = lower(p_username))
    and not exists (select 1 from public.profiles where username = lower(p_username));
$$;

-- -----------------------------------------------------------------------------
-- creator_profiles
-- -----------------------------------------------------------------------------
create table public.creator_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 2 and 80),
  username           citext not null unique references public.profiles (username)
                     on update cascade,
  bio                text check (bio is null or char_length(bio) <= 500),
  category           text not null default 'Other'
                     check (char_length(category) <= 40),
  avatar_url         text,
  cover_url          text,
  location           text check (location is null or char_length(location) <= 80),
  website            text check (website is null or website ~ '^https?://'),
  twitter            text check (twitter is null or twitter ~ '^https?://'),
  facebook           text check (facebook is null or facebook ~ '^https?://'),
  instagram          text check (instagram is null or instagram ~ '^https?://'),
  linkedin           text check (linkedin is null or linkedin ~ '^https?://'),
  -- Aggregates: written only by finalize_transaction() (service role).
  total_earnings     numeric(12, 2) not null default 0,
  total_supporters   integer not null default 0,
  total_transactions integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index creator_profiles_category_idx on public.creator_profiles (category);
create trigger creator_profiles_updated_at before update on public.creator_profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- creator_social_links (extra links beyond the fixed columns)
-- -----------------------------------------------------------------------------
create table public.creator_social_links (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.creator_profiles (id) on delete cascade,
  platform    text not null check (char_length(platform) between 2 and 30),
  url         text not null check (url ~ '^https?://' and char_length(url) <= 300),
  created_at  timestamptz not null default now()
);

create index creator_social_links_creator_idx on public.creator_social_links (creator_id);

-- -----------------------------------------------------------------------------
-- supporters (people who paid; may or may not have an account)
-- -----------------------------------------------------------------------------
create table public.supporters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  email       citext,
  phone       text not null unique check (phone ~ '^\+?[0-9]{7,15}$'),
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- platform_settings (single row)
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  id                uuid primary key default gen_random_uuid(),
  singleton         boolean not null default true unique check (singleton),
  platform_name     text not null default 'Itaager',
  logo_url          text,
  support_email     text not null default 'support@itaager.so',
  default_currency  public.currency_code not null default 'USD',
  platform_fee      numeric(5, 2) not null default 5.00
                    check (platform_fee >= 0 and platform_fee <= 50),
  sos_per_usd       numeric(12, 2) not null default 26000
                    check (sos_per_usd > 0),
  min_amount_usd    numeric(10, 2) not null default 0.50 check (min_amount_usd > 0),
  max_amount_usd    numeric(10, 2) not null default 1000 check (max_amount_usd > 0),
  payments_enabled  boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

insert into public.platform_settings default values;
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
create table public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  transaction_reference   text not null unique,
  idempotency_key         uuid not null unique,
  creator_id              uuid not null references public.creator_profiles (id) on delete restrict,
  supporter_id            uuid references public.supporters (id) on delete set null,
  supporter_user_id       uuid references auth.users (id) on delete set null,
  supporter_name          text not null check (char_length(supporter_name) between 1 and 80),
  supporter_email         citext,
  supporter_phone         text not null check (supporter_phone ~ '^\+?[0-9]{7,15}$'),
  amount                  numeric(12, 2) not null check (amount > 0),
  currency                public.currency_code not null default 'USD',
  amount_usd              numeric(12, 2) not null check (amount_usd > 0),
  platform_fee            numeric(12, 2) not null default 0 check (platform_fee >= 0),
  creator_amount          numeric(12, 2) not null check (creator_amount >= 0),
  payment_provider        text not null,
  provider_transaction_id text,
  status                  public.transaction_status not null default 'pending',
  message                 text check (message is null or char_length(message) <= 500),
  is_anonymous            boolean not null default false,
  client_ip_hash          text,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index transactions_creator_idx on public.transactions (creator_id, created_at desc);
create index transactions_status_idx on public.transactions (status, created_at desc);
create index transactions_phone_idx on public.transactions (supporter_phone, created_at desc);
create index transactions_ip_idx on public.transactions (client_ip_hash, created_at desc);
create unique index transactions_provider_tx_idx
  on public.transactions (payment_provider, provider_transaction_id)
  where provider_transaction_id is not null;

create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- payment_logs (raw provider traffic — admin-only, secrets must be redacted
-- by the Edge Function before insert)
-- -----------------------------------------------------------------------------
create table public.payment_logs (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid references public.transactions (id) on delete cascade,
  provider        text not null,
  event           text not null default 'request',
  request_data    jsonb,
  response_data   jsonb,
  status          text,
  error_message   text,
  created_at      timestamptz not null default now()
);

create index payment_logs_tx_idx on public.payment_logs (transaction_id, created_at desc);

-- -----------------------------------------------------------------------------
-- admin_activity_logs
-- -----------------------------------------------------------------------------
create table public.admin_activity_logs (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references auth.users (id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  description  text,
  created_at   timestamptz not null default now()
);

create index admin_activity_logs_created_idx on public.admin_activity_logs (created_at desc);

-- =============================================================================
-- Payment finalisation (idempotent, atomic). Service role only.
-- =============================================================================
create or replace function public.finalize_transaction(
  p_reference text,
  p_status public.transaction_status,
  p_provider_transaction_id text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions;
begin
  -- Lock the row so concurrent callbacks / polls cannot double-process.
  select * into v_tx
  from public.transactions
  where transaction_reference = p_reference
  for update;

  if not found then
    raise exception 'Transaction % not found', p_reference;
  end if;

  -- Terminal states are final (except successful -> refunded).
  if v_tx.status in ('successful', 'failed', 'cancelled', 'refunded') then
    if not (v_tx.status = 'successful' and p_status = 'refunded') then
      return v_tx;
    end if;
  end if;

  if v_tx.status = p_status then
    return v_tx;
  end if;

  update public.transactions
  set status = p_status,
      provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
      completed_at = case when p_status in ('successful', 'failed', 'cancelled', 'refunded')
                          then now() else completed_at end
  where id = v_tx.id
  returning * into v_tx;

  if p_status in ('successful', 'refunded') then
    update public.creator_profiles cp
    set total_earnings = coalesce((
          select sum(creator_amount) from public.transactions
          where creator_id = cp.id and status = 'successful'), 0),
        total_transactions = (
          select count(*) from public.transactions
          where creator_id = cp.id and status = 'successful'),
        total_supporters = (
          select count(distinct supporter_phone) from public.transactions
          where creator_id = cp.id and status = 'successful')
    where cp.id = v_tx.creator_id;
  end if;

  return v_tx;
end;
$$;

revoke all on function public.finalize_transaction(text, public.transaction_status, text)
  from public, anon, authenticated;

-- =============================================================================
-- Public read helpers (expose only safe columns)
-- =============================================================================

-- Recent supporters for a public creator page. Never returns phone/email.
create or replace function public.get_recent_supporters(p_username text, p_limit int default 10)
returns table (
  id uuid,
  supporter_name text,
  amount numeric,
  currency public.currency_code,
  message text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id,
         case when t.is_anonymous then 'Someone' else t.supporter_name end,
         t.amount,
         t.currency,
         t.message,
         t.created_at
  from public.transactions t
  join public.creator_profiles cp on cp.id = t.creator_id
  where cp.username = lower(p_username)
    and t.status = 'successful'
  order by t.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Payment status for the supporter waiting screen. Reference is a random,
-- unguessable token, so it acts as a capability.
create or replace function public.get_payment_status(p_reference text)
returns table (
  transaction_reference text,
  status public.transaction_status,
  amount numeric,
  currency public.currency_code,
  creator_username text,
  creator_display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.transaction_reference, t.status, t.amount, t.currency,
         cp.username::text, cp.display_name, t.created_at
  from public.transactions t
  join public.creator_profiles cp on cp.id = t.creator_id
  where t.transaction_reference = p_reference;
$$;

-- Monthly earnings for the signed-in creator (dashboard chart).
create or replace function public.creator_monthly_earnings(p_months int default 12)
returns table (month date, earnings numeric, supporters bigint)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id from public.creator_profiles where user_id = auth.uid()
  ), months as (
    select generate_series(
      date_trunc('month', now()) - make_interval(months => least(greatest(p_months, 1), 36) - 1),
      date_trunc('month', now()),
      interval '1 month'
    )::date as month
  )
  select m.month,
         coalesce(sum(t.creator_amount), 0),
         count(distinct t.supporter_phone)
  from months m
  left join public.transactions t
    on date_trunc('month', t.created_at)::date = m.month
   and t.status = 'successful'
   and t.creator_id = (select id from me)
  group by m.month
  order by m.month;
$$;

-- Platform-wide stats for super admins.
create or replace function public.admin_platform_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v json;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select json_build_object(
    'total_users',          (select count(*) from public.profiles),
    'total_creators',       (select count(*) from public.profiles where role = 'creator'),
    'total_supporters',     (select count(*) from public.supporters),
    'total_transactions',   (select count(*) from public.transactions),
    'successful_payments',  (select count(*) from public.transactions where status = 'successful'),
    'failed_payments',      (select count(*) from public.transactions where status = 'failed'),
    'pending_payments',     (select count(*) from public.transactions where status in ('pending', 'processing')),
    'gross_volume',         (select coalesce(sum(amount_usd), 0) from public.transactions where status = 'successful'),
    'platform_revenue',     (select coalesce(sum(platform_fee), 0) from public.transactions where status = 'successful'),
    'creator_earnings',     (select coalesce(sum(creator_amount), 0) from public.transactions where status = 'successful')
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_monthly_volume(p_months int default 12)
returns table (month date, volume numeric, revenue numeric, transactions bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
  with months as (
    select generate_series(
      date_trunc('month', now()) - make_interval(months => least(greatest(p_months, 1), 36) - 1),
      date_trunc('month', now()),
      interval '1 month'
    )::date as month
  )
  select m.month,
         coalesce(sum(t.amount_usd), 0),
         coalesce(sum(t.platform_fee), 0),
         count(t.id)
  from months m
  left join public.transactions t
    on date_trunc('month', t.created_at)::date = m.month
   and t.status = 'successful'
  group by m.month
  order by m.month;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles             enable row level security;
alter table public.reserved_usernames   enable row level security;
alter table public.creator_profiles     enable row level security;
alter table public.creator_social_links enable row level security;
alter table public.supporters           enable row level security;
alter table public.platform_settings    enable row level security;
alter table public.transactions         enable row level security;
alter table public.payment_logs         enable row level security;
alter table public.admin_activity_logs  enable row level security;

-- Helper: is the creator profile owned by an active account?
create or replace function public.creator_is_public(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = p_user_id and status = 'active'
  );
$$;

-- profiles --------------------------------------------------------------------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles: admin read all" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- reserved_usernames: no client access (used via security definer functions).

-- creator_profiles ------------------------------------------------------------
create policy "creator_profiles: public read active" on public.creator_profiles
  for select to anon, authenticated using (public.creator_is_public(user_id));
create policy "creator_profiles: owner read" on public.creator_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "creator_profiles: admin read" on public.creator_profiles
  for select to authenticated using (public.is_admin());
create policy "creator_profiles: owner insert" on public.creator_profiles
  for insert to authenticated with check (
    user_id = auth.uid()
    and username = (select p.username from public.profiles p where p.user_id = auth.uid())
  );
create policy "creator_profiles: owner update" on public.creator_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Column privileges: clients can never write aggregates or ownership.
revoke insert, update on public.creator_profiles from anon, authenticated;
grant insert (user_id, display_name, username, bio, category, avatar_url, cover_url,
              location, website, twitter, facebook, instagram, linkedin)
  on public.creator_profiles to authenticated;
grant update (display_name, bio, category, avatar_url, cover_url, location,
              website, twitter, facebook, instagram, linkedin)
  on public.creator_profiles to authenticated;

-- Profile columns a user may edit themselves.
revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, bio, location, role, status)
  on public.profiles to authenticated;  -- role/status guarded by trigger

-- creator_social_links --------------------------------------------------------
create policy "social_links: public read" on public.creator_social_links
  for select to anon, authenticated using (true);
create policy "social_links: owner write" on public.creator_social_links
  for all to authenticated
  using (exists (select 1 from public.creator_profiles cp
                 where cp.id = creator_id and cp.user_id = auth.uid()))
  with check (exists (select 1 from public.creator_profiles cp
                      where cp.id = creator_id and cp.user_id = auth.uid()));

-- supporters: admin read only --------------------------------------------------
create policy "supporters: admin read" on public.supporters
  for select to authenticated using (public.is_admin());

-- platform_settings: public read (no secrets stored here), admin update ------
create policy "platform_settings: public read" on public.platform_settings
  for select to anon, authenticated using (true);
create policy "platform_settings: admin update" on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- transactions: creators read their own, admins read all, nobody writes ------
create policy "transactions: creator read own" on public.transactions
  for select to authenticated using (
    exists (select 1 from public.creator_profiles cp
            where cp.id = creator_id and cp.user_id = auth.uid())
  );
create policy "transactions: supporter read own" on public.transactions
  for select to authenticated using (supporter_user_id = auth.uid());
create policy "transactions: admin read" on public.transactions
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.transactions from anon, authenticated;

-- payment_logs: admin read only -----------------------------------------------
create policy "payment_logs: admin read" on public.payment_logs
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.payment_logs from anon, authenticated;

-- admin_activity_logs ----------------------------------------------------------
create policy "admin_logs: admin read" on public.admin_activity_logs
  for select to authenticated using (public.is_admin());
create policy "admin_logs: admin insert own" on public.admin_activity_logs
  for insert to authenticated with check (public.is_admin() and admin_id = auth.uid());
revoke update, delete on public.admin_activity_logs from anon, authenticated;

-- Function execution grants ---------------------------------------------------
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.get_recent_supporters(text, int) to anon, authenticated;
grant execute on function public.get_payment_status(text) to anon, authenticated;
grant execute on function public.creator_monthly_earnings(int) to authenticated;
grant execute on function public.admin_platform_stats() to authenticated;
grant execute on function public.admin_monthly_volume(int) to authenticated;
revoke execute on function public.creator_monthly_earnings(int) from anon;
revoke execute on function public.admin_platform_stats() from anon;
revoke execute on function public.admin_monthly_volume(int) from anon;

-- =============================================================================
-- Storage: public avatars/covers bucket, users write only in their own folder
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');
create policy "avatars: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- Backfill: accounts created before this migration ran get a profile too.
-- =============================================================================
insert into public.profiles (user_id, full_name, username, email, role)
select u.id,
       coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1), 'New user'),
       'user_' || substr(replace(u.id::text, '-', ''), 1, 10),
       u.email,
       case when u.raw_user_meta_data ->> 'account_type' = 'creator' then 'creator' else 'supporter' end::public.user_role
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id);

-- Use the username they chose at signup when it is valid and free.
update public.profiles p
set username = lower(u.raw_user_meta_data ->> 'username')
from auth.users u
where p.user_id = u.id
  and p.username like 'user\_%'
  and lower(coalesce(u.raw_user_meta_data ->> 'username', '')) ~ '^[a-z0-9_]{3,30}$'
  and not exists (select 1 from public.reserved_usernames r where r.username = lower(u.raw_user_meta_data ->> 'username'))
  and not exists (select 1 from public.profiles p2 where p2.username = lower(u.raw_user_meta_data ->> 'username'));
