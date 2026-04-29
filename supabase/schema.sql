-- ============================================================
-- FitWithAnge — Supabase schema + RLS policies
-- Paste this entire file into Supabase Dashboard → SQL Editor → New query → Run
-- Re-running is safe (idempotent).
-- ============================================================


-- ------------------------------------------------------------
-- ENQUIRIES TABLE
-- Stores every contact form submission from the FitWithAnge website.
-- Angelina can see, update, and delete rows via the admin panel.
-- Visitors can only insert (submit) — they cannot read any data.
-- ------------------------------------------------------------
create table if not exists enquiries (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null    default now(),
  first_name          text        not null,
  last_name           text        not null,
  email               text        not null,
  phone               text        not null,
  instagram           text,                           -- nullable: not everyone has Instagram
  goals               text        not null,
  blockers            text        not null,
  status              text        not null    default 'pending'
                        check (status in ('pending', 'confirmed', 'archived')),
  calendly_scheduled  boolean     not null    default false,
  notes               text                            -- nullable: Ange's private notes only
);


-- ------------------------------------------------------------
-- INDEXES
-- Speed up the two most common queries:
--   1. Listing enquiries newest-first (admin dashboard default sort)
--   2. Filtering by status (e.g. show only 'pending')
-- ------------------------------------------------------------
create index if not exists enquiries_created_at_idx on enquiries (created_at desc);
create index if not exists enquiries_status_idx     on enquiries (status);


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- RLS is what enforces who can do what.
-- Enabling it means NO access is granted by default — only what
-- the policies below explicitly allow.
-- ------------------------------------------------------------
alter table enquiries enable row level security;


-- ------------------------------------------------------------
-- POLICIES
-- Drop before recreating so re-runs don't error.
-- ------------------------------------------------------------

-- Allow anyone (including unauthenticated website visitors) to submit a new enquiry.
-- They can INSERT but CANNOT read, update, or delete anything.
drop policy if exists "Anyone can submit enquiries" on enquiries;
create policy "Anyone can submit enquiries"
  on enquiries
  for insert
  to anon, authenticated
  with check (true);

-- Only Angelina (logged-in authenticated user) can read all enquiries.
drop policy if exists "Authenticated users can read all enquiries" on enquiries;
create policy "Authenticated users can read all enquiries"
  on enquiries
  for select
  to authenticated
  using (true);

-- Only Angelina can update an enquiry (e.g. change status, add notes).
drop policy if exists "Authenticated users can update enquiries" on enquiries;
create policy "Authenticated users can update enquiries"
  on enquiries
  for update
  to authenticated
  using (true)
  with check (true);

-- Only Angelina can delete an enquiry.
drop policy if exists "Authenticated users can delete enquiries" on enquiries;
create policy "Authenticated users can delete enquiries"
  on enquiries
  for delete
  to authenticated
  using (true);

-- NOTE: There is intentionally NO select/update/delete policy for the 'anon' role.
-- Anon users can only INSERT. They cannot read back any rows — not even their own.
