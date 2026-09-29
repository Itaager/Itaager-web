-- =============================================================================
-- Creator approval: new creator pages start as "pending" and only become
-- public (and able to receive payments) after a super admin approves them.
-- =============================================================================

create type public.creator_approval as enum ('pending', 'approved', 'rejected');

alter table public.creator_profiles
  add column approval_status public.creator_approval not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column review_note text check (review_note is null or char_length(review_note) <= 500);

-- Creators that existed before this migration stay live.
update public.creator_profiles set approval_status = 'approved', reviewed_at = now();

create index creator_profiles_approval_idx on public.creator_profiles (approval_status, created_at desc);

-- Public pages: only approved creators with an active account.
drop policy "creator_profiles: public read active" on public.creator_profiles;
create policy "creator_profiles: public read approved" on public.creator_profiles
  for select to anon, authenticated
  using (approval_status = 'approved' and public.creator_is_public(user_id));

-- Supporters wall only for approved creators.
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
    and cp.approval_status = 'approved'
    and t.status = 'successful'
  order by t.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- A rejected creator who edits their page is automatically sent back for review.
create or replace function public.creator_resubmit_on_edit()
returns trigger
language plpgsql
as $$
begin
  if old.approval_status = 'rejected' and auth.uid() = old.user_id then
    new.approval_status := 'pending';
    new.review_note := null;
  end if;
  return new;
end;
$$;

create trigger creator_profiles_resubmit before update on public.creator_profiles
  for each row execute function public.creator_resubmit_on_edit();

-- Review action for super admins (approval columns are not client-writable).
create or replace function public.admin_review_creator(
  p_creator_id uuid,
  p_decision public.creator_approval,
  p_note text default null
)
returns public.creator_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.creator_profiles;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if p_decision = 'pending' then
    raise exception 'Decision must be approved or rejected';
  end if;

  update public.creator_profiles
  set approval_status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_note = nullif(trim(left(coalesce(p_note, ''), 500)), '')
  where id = p_creator_id
  returning * into v_row;

  if not found then
    raise exception 'Creator not found';
  end if;

  insert into public.admin_activity_logs (admin_id, action, entity_type, entity_id, description)
  values (
    auth.uid(),
    case when p_decision = 'approved' then 'approve_creator' else 'reject_creator' end,
    'creator',
    v_row.id::text,
    (case when p_decision = 'approved' then 'Approved' else 'Rejected' end) || ' @' || v_row.username
      || coalesce(': ' || v_row.review_note, '')
  );
  return v_row;
end;
$$;

revoke all on function public.admin_review_creator(uuid, public.creator_approval, text) from public, anon;
grant execute on function public.admin_review_creator(uuid, public.creator_approval, text) to authenticated;

-- Pending count for the admin dashboard.
create or replace function public.admin_pending_creators_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_admin()
    then (select count(*) from public.creator_profiles where approval_status = 'pending')
    else 0 end;
$$;
grant execute on function public.admin_pending_creators_count() to authenticated;
