-- PRISM database schema. PRISM applies these steps automatically on first use;
-- you can also paste this into Supabase → SQL Editor → New query → Run.
-- Generated from src/server/migrations.ts by `npm run db:schema`. Do not edit by hand.

create table if not exists prism_migrations (
  id         text primary key,
  applied_at timestamptz not null default now()
);

-- 0001_init
create table if not exists prism_users (
  github_id     bigint primary key,
  login         text not null,
  name          text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists prism_analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     bigint not null references prism_users(github_id) on delete cascade,
  owner       text not null,
  repo        text not null,
  branch      text,
  commit_sha  text not null,
  is_private  boolean not null default false,
  score       integer not null,
  grade       text,
  issues      integer not null,
  critical    integer not null,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists prism_analyses_user_commit
  on prism_analyses (user_id, lower(owner), lower(repo), commit_sha);
create index if not exists prism_analyses_user_recent
  on prism_analyses (user_id, created_at desc);

-- Row level security on, with no policies: Supabase's public API can't read
-- these tables. PRISM's server connects directly and isn't affected.
alter table prism_users enable row level security;
alter table prism_analyses enable row level security;
insert into prism_migrations (id) values ('0001_init') on conflict do nothing;

-- 0002_analysis_inputs
-- The full commit id, the score formula version, the score's inputs plus a compact
-- list of finding fingerprints (so a score can be recalculated without loading the
-- whole result), and how many findings were dropped by the caps.
alter table prism_analyses
  add column if not exists commit_full   text,
  add column if not exists score_version integer,
  add column if not exists inputs        jsonb,
  add column if not exists overflow      integer,
  add column if not exists triggered_by  text not null default 'manual';
insert into prism_migrations (id) values ('0002_analysis_inputs') on conflict do nothing;

-- 0003_issue_states
-- One person's decision about one finding: ignored, a false positive, or an
-- accepted risk (optionally until a date). Keyed by the finding's fingerprint.
create table if not exists prism_issue_states (
  user_id     bigint not null references prism_users(github_id) on delete cascade,
  owner       text not null,
  repo        text not null,
  fingerprint text not null,
  state       text not null check (state in ('ignored', 'false_positive', 'accepted')),
  note        text,
  expires_at  timestamptz,
  issue_url   text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, owner, repo, fingerprint)
);

alter table prism_issue_states enable row level security;
insert into prism_migrations (id) values ('0003_issue_states') on conflict do nothing;
