-- =============================================================================
-- 1. CMS pages (Terms, Privacy, Contact, About, ...) managed by super admins.
-- 2. First-party analytics: page views and clicks with country / region / city.
--    No IP addresses are stored; geo is resolved on the server and discarded.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pages
-- -----------------------------------------------------------------------------
create type public.page_status as enum ('draft', 'published');

create table public.pages (
  id               uuid primary key default gen_random_uuid(),
  slug             citext not null unique
                   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  title            text not null check (char_length(title) between 2 and 120),
  content          text not null default '' check (char_length(content) <= 100000),
  meta_description text check (meta_description is null or char_length(meta_description) <= 300),
  status           public.page_status not null default 'draft',
  show_in_footer   boolean not null default true,
  sort_order       integer not null default 0,
  updated_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

-- Slugs that collide with app routes can't be used for pages.
create or replace function public.guard_page_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug in ('admin', 'dashboard', 'account', 'api', 'auth', 'creator', 'explore', 'login',
                  'register', 'forgot-password', 'reset-password', 'onboarding', 'pay',
                  'suspended', 'setup-incomplete', 'sitemap', 'robots', 'llms') then
    raise exception 'The address "/%" is reserved', new.slug;
  end if;
  return new;
end;
$$;

create trigger pages_slug_guard before insert or update of slug on public.pages
  for each row execute function public.guard_page_slug();

alter table public.pages enable row level security;

create policy "pages: public read published" on public.pages
  for select to anon, authenticated using (status = 'published');
create policy "pages: admin read all" on public.pages
  for select to authenticated using (public.is_admin());
create policy "pages: admin insert" on public.pages
  for insert to authenticated with check (public.is_admin());
create policy "pages: admin update" on public.pages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "pages: admin delete" on public.pages
  for delete to authenticated using (public.is_admin());

-- Starter pages (editable from the admin dashboard).
insert into public.pages (slug, title, meta_description, status, sort_order, content) values
('about', 'About Itaager',
 'Itaager is a Somali creator-support platform where fans support creators, developers, artists and educators with EVC Plus mobile money.',
 'published', 1,
$md$## What is Itaager?

**Itaager** is a creator-support platform built for Somalia. Creators — developers, designers, writers, artists, musicians, educators and students — get a free public page where their audience can support them with a small payment.

Supporters pay with **EVC Plus** (Hormuud mobile money) straight from their phone. No card or bank account is needed.

## How it works

1. **Create a page.** Sign up, add a photo, a short bio and your social links.
2. **Share your link.** For example `itaager.com/creator/yourname`.
3. **Get supported.** Fans choose an amount, leave a message and approve the payment on their phone.

## Why Itaager?

- Built around how people in Somalia actually pay: mobile money.
- Every payment is verified on the server before it counts.
- Creators see every supporter, message and payment in a simple dashboard.
- Free to start. A small platform fee applies only to successful payments.
$md$),
('terms', 'Terms & Conditions',
 'The terms that apply when you use Itaager as a creator or a supporter.',
 'published', 2,
$md$## Terms & Conditions

*Last updated: replace this date when you publish.*

By creating an account or making a payment on Itaager you agree to these terms.

### Accounts
- You must give accurate information and keep your password safe.
- Creator pages are reviewed before they go live. We may suspend pages that break these terms.

### Payments
- Support payments are voluntary contributions to a creator.
- A platform fee is deducted from each successful payment, as shown in the dashboard.
- Payments are processed by the mobile money provider (Hormuud EVC Plus).

### Content
- Creators are responsible for the content on their page.
- Illegal, hateful or misleading content is not allowed.

### Contact
Questions about these terms? See our [Contact](/contact) page.

> Edit this page from **Admin → Pages** with your final legal text.
$md$),
('privacy', 'Privacy Policy',
 'How Itaager collects, uses and protects your personal information.',
 'published', 3,
$md$## Privacy Policy

*Last updated: replace this date when you publish.*

### What we collect
- **Account details:** name, username, email and (optionally) phone number.
- **Payment details:** the amount, your phone number and an optional message. We never see your EVC Plus PIN.
- **Usage statistics:** pages visited and approximate location (country, region, city). We do **not** store IP addresses.

### How we use it
- To run your account and process payments.
- To show creators who supported them (unless you choose to stay anonymous).
- To improve the platform.

### Your choices
You can edit your profile at any time, or contact us to delete your account.

> Edit this page from **Admin → Pages** with your final policy.
$md$),
('contact', 'Contact us',
 'Get in touch with the Itaager team.',
 'published', 4,
$md$## Contact us

We're happy to help creators and supporters.

- **Email:** support@itaager.com
- **Website:** [itaager.com](https://itaager.com)

For payment questions, include your payment **reference** (it starts with `ITG-`).

> Edit this page from **Admin → Pages** to add your phone number, WhatsApp or office address.
$md$);

-- -----------------------------------------------------------------------------
-- analytics_events
-- -----------------------------------------------------------------------------
create table public.analytics_events (
  id          bigint generated always as identity primary key,
  type        text not null check (type in ('pageview', 'click')),
  path        text not null check (char_length(path) <= 300),
  label       text check (label is null or char_length(label) <= 200),
  target      text check (target is null or char_length(target) <= 300),
  referrer    text check (referrer is null or char_length(referrer) <= 200),
  visitor_id  text not null check (char_length(visitor_id) <= 64),
  session_id  text check (session_id is null or char_length(session_id) <= 64),
  country     text check (country is null or char_length(country) <= 2),
  region      text check (region is null or char_length(region) <= 100),
  city        text check (city is null or char_length(city) <= 100),
  device      text check (device is null or char_length(device) <= 20),
  browser     text check (browser is null or char_length(browser) <= 40),
  os          text check (os is null or char_length(os) <= 40),
  created_at  timestamptz not null default now()
);

create index analytics_events_created_idx on public.analytics_events (created_at desc);
create index analytics_events_type_created_idx on public.analytics_events (type, created_at desc);

alter table public.analytics_events enable row level security;
-- Inserts come only from the server (service role). Admins can read.
create policy "analytics: admin read" on public.analytics_events
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.analytics_events from anon, authenticated;

-- One call returns everything the admin Analytics page needs.
create or replace function public.admin_analytics(p_days int default 30)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 365));
  v json;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  with e as (select * from public.analytics_events where created_at >= v_since),
       pv as (select * from e where type = 'pageview')
  select json_build_object(
    'pageviews',  (select count(*) from pv),
    'visitors',   (select count(distinct visitor_id) from pv),
    'sessions',   (select count(distinct session_id) from pv),
    'clicks',     (select count(*) from e where type = 'click'),
    'daily', coalesce((
      select json_agg(json_build_object('day', d.day, 'pageviews', coalesce(c.pv, 0), 'visitors', coalesce(c.vis, 0)) order by d.day)
      from generate_series(date_trunc('day', v_since)::date, current_date, interval '1 day') as d(day)
      left join (
        select date_trunc('day', created_at)::date as day, count(*) as pv, count(distinct visitor_id) as vis
        from pv group by 1
      ) c on c.day = d.day::date
    ), '[]'::json),
    'pages', coalesce((select json_agg(x) from (
      select path as name, count(*) as views, count(distinct visitor_id) as visitors
      from pv group by path order by views desc limit 15) x), '[]'::json),
    'countries', coalesce((select json_agg(x) from (
      select coalesce(country, '??') as name, count(*) as views, count(distinct visitor_id) as visitors
      from pv group by 1 order by visitors desc limit 15) x), '[]'::json),
    'regions', coalesce((select json_agg(x) from (
      select coalesce(region, 'Unknown') || coalesce(', ' || country, '') as name, count(distinct visitor_id) as visitors
      from pv group by region, country order by visitors desc limit 15) x), '[]'::json),
    'cities', coalesce((select json_agg(x) from (
      select coalesce(city, 'Unknown') || coalesce(', ' || country, '') as name, count(distinct visitor_id) as visitors
      from pv group by city, country order by visitors desc limit 15) x), '[]'::json),
    'referrers', coalesce((select json_agg(x) from (
      select coalesce(nullif(referrer, ''), 'Direct') as name, count(distinct visitor_id) as visitors
      from pv group by 1 order by visitors desc limit 10) x), '[]'::json),
    'devices', coalesce((select json_agg(x) from (
      select coalesce(device, 'Unknown') as name, count(distinct visitor_id) as visitors
      from pv group by 1 order by visitors desc) x), '[]'::json),
    'browsers', coalesce((select json_agg(x) from (
      select coalesce(browser, 'Unknown') as name, count(distinct visitor_id) as visitors
      from pv group by 1 order by visitors desc limit 8) x), '[]'::json),
    'top_clicks', coalesce((select json_agg(x) from (
      select coalesce(label, target, '(no label)') as name, max(target) as target, path, count(*) as clicks
      from e where type = 'click' group by 1, path order by clicks desc limit 15) x), '[]'::json)
  ) into v;
  return v;
end;
$$;

revoke all on function public.admin_analytics(int) from public, anon;
grant execute on function public.admin_analytics(int) to authenticated;
