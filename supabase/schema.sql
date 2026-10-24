-- PRISM database schema. PRISM creates these tables automatically on first use;
-- you can also paste this into Supabase → SQL Editor → New query → Run.

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
