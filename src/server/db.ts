import postgres from "postgres";
import type { AnalysisResult } from "@/lib/analysisTypes";

/*
 * Postgres (Supabase) access for users and saved analyses. Uses DATABASE_URL;
 * with Supabase, use the pooler connection string (port 6543). Tables are
 * created on first use (same SQL as supabase/schema.sql).
 */

type Sql = postgres.Sql;
const g = globalThis as unknown as { __prismSql?: Sql; __prismSchema?: Promise<void> };

function client(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!g.__prismSql) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    g.__prismSql = postgres(url, {
      prepare: false, // required by Supabase's transaction pooler
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: local ? false : "require",
    });
  }
  return g.__prismSql;
}

export const SCHEMA = `
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
`;

/** A ready connection, or null when no database is configured. */
export async function db(): Promise<Sql | null> {
  const sql = client();
  if (!sql) return null;
  g.__prismSchema ??= sql.unsafe(SCHEMA).then(() => undefined);
  try {
    await g.__prismSchema;
  } catch (e) {
    g.__prismSchema = undefined; // retry next time
    throw e;
  }
  return sql;
}

/** Runs a database task, logging and swallowing failures so pages still render. */
export async function safely<T>(task: (sql: Sql) => Promise<T>, fallback: T): Promise<T> {
  try {
    const sql = await db();
    return sql ? await task(sql) : fallback;
  } catch (e) {
    console.error("PRISM database error", e);
    return fallback;
  }
}

/* ---------------- Users ---------------- */

export function upsertUser(u: { githubId: number; login: string; name: string | null; avatar: string }) {
  return safely(
    (sql) => sql`
      insert into prism_users (github_id, login, name, avatar_url)
      values (${u.githubId}, ${u.login}, ${u.name}, ${u.avatar})
      on conflict (github_id) do update
        set login = excluded.login, name = excluded.name, avatar_url = excluded.avatar_url, last_login_at = now()
    `.then(() => true),
    false,
  );
}

/* ---------------- Analyses ---------------- */

export type SavedRow = {
  id: string;
  owner: string;
  repo: string;
  commit_sha: string;
  is_private: boolean;
  score: number;
  grade: string | null;
  issues: number;
  critical: number;
  created_at: Date;
};

export function saveAnalysis(user: { githubId: number; login: string; name: string | null; avatar: string }, r: AnalysisResult) {
  const critical = r.severityCounts.find((s) => s.key === "critical")?.count ?? 0;
  return safely(async (sql) => {
    // The user row normally exists from sign-in, but not if the database was added after they signed in.
    await sql`
      insert into prism_users (github_id, login, name, avatar_url)
      values (${user.githubId}, ${user.login}, ${user.name}, ${user.avatar})
      on conflict (github_id) do nothing
    `;
    await sql`
      insert into prism_analyses (user_id, owner, repo, branch, commit_sha, is_private, score, grade, issues, critical, result)
      values (${user.githubId}, ${r.repo.owner}, ${r.repo.name}, ${r.repo.branch}, ${r.repo.commit}, ${Boolean(r.repo.private)},
              ${r.health.score}, ${r.health.grade}, ${r.issues.length}, ${critical}, ${sql.json(r as unknown as postgres.JSONValue)})
      on conflict (user_id, lower(owner), lower(repo), commit_sha) do nothing
    `;
    return true;
  }, false);
}

const ROW = (sql: Sql) => sql`id, owner, repo, commit_sha, is_private, score, grade, issues, critical, created_at`;

export function repoHistory(userId: number, owner: string, repo: string, limit = 12) {
  return safely(
    (sql) => sql<SavedRow[]>`
      select ${ROW(sql)} from prism_analyses
      where user_id = ${userId} and lower(owner) = lower(${owner}) and lower(repo) = lower(${repo})
      order by created_at desc limit ${limit}
    `,
    [] as SavedRow[],
  );
}

export function userAnalyses(userId: number, limit = 100) {
  return safely(
    (sql) => sql<SavedRow[]>`
      select ${ROW(sql)} from prism_analyses where user_id = ${userId}
      order by created_at desc limit ${limit}
    `,
    [] as SavedRow[],
  );
}

/** Most recent saved result for a repo, if it's newer than `maxAgeMinutes`. Used for private repos. */
export function recentResult(userId: number, owner: string, repo: string, maxAgeMinutes: number) {
  return safely(
    (sql) =>
      sql<{ result: AnalysisResult }[]>`
        select result from prism_analyses
        where user_id = ${userId} and lower(owner) = lower(${owner}) and lower(repo) = lower(${repo})
          and created_at > now() - make_interval(mins => ${maxAgeMinutes})
        order by created_at desc limit 1
      `.then((rows) => rows[0]?.result ?? null),
    null as AnalysisResult | null,
  );
}

export async function checkDatabase(): Promise<{ ok: boolean; message: string }> {
  if (!process.env.DATABASE_URL) return { ok: false, message: "DATABASE_URL is not set." };
  try {
    const sql = await db();
    const [row] = await sql!`select count(*)::int as n from prism_analyses`;
    return { ok: true, message: `Connected. ${row.n} saved ${row.n === 1 ? "analysis" : "analyses"}.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Couldn't connect: ${msg.replace(/postgres(ql)?:\/\/[^\s]+/g, "<connection string>")}` };
  }
}
