import postgres from "postgres";
import type { AnalysisResult } from "@/lib/analysisTypes";
import { factsOf } from "@/lib/score";
import { migrate } from "./migrate";

/*
 * Postgres (Supabase) access for users and saved analyses. Uses DATABASE_URL;
 * with Supabase, use the pooler connection string (port 6543). Pending
 * migrations (src/server/migrations.ts) are applied on first use.
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

/** A ready connection, or null when no database is configured. */
export async function db(): Promise<Sql | null> {
  const sql = client();
  if (!sql) return null;
  g.__prismSchema ??= migrate(sql).then(() => undefined);
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

/**
 * Deletes a user and, through the foreign key, every saved analysis of theirs.
 * True when it's done (or there's no database, so nothing is stored); false if the delete failed.
 */
export async function deleteUserData(githubId: number): Promise<boolean> {
  if (!process.env.DATABASE_URL) return true;
  return safely(async (sql) => {
    await sql`delete from prism_users where github_id = ${githubId}`;
    return true;
  }, false);
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

export function saveAnalysis(user: { githubId: number; login: string; name: string | null; avatar: string }, r: AnalysisResult, triggeredBy: "manual" | "push" | "pr" = "manual") {
  const critical = r.severityCounts.find((s) => s.key === "critical")?.count ?? 0;
  // What it takes to rescore this analysis later without loading the whole result.
  const inputs = r.scoreInputs ? { scoreInputs: r.scoreInputs, facts: factsOf(r.issues) } : null;
  return safely(async (sql) => {
    // The user row normally exists from sign-in, but not if the database was added after they signed in.
    await sql`
      insert into prism_users (github_id, login, name, avatar_url)
      values (${user.githubId}, ${user.login}, ${user.name}, ${user.avatar})
      on conflict (github_id) do nothing
    `;
    // The score and counts saved here are the raw ones, never adjusted for anyone's triage.
    await sql`
      insert into prism_analyses (user_id, owner, repo, branch, commit_sha, is_private, score, grade, issues, critical, result,
                                  commit_full, score_version, inputs, overflow, triggered_by)
      values (${user.githubId}, ${r.repo.owner}, ${r.repo.name}, ${r.repo.branch}, ${r.repo.commit}, ${Boolean(r.repo.private)},
              ${r.health.raw?.score ?? r.health.score}, ${r.health.raw?.grade ?? r.health.grade}, ${r.issues.length + (r.triaged?.length ?? 0)}, ${critical},
              ${sql.json(r as unknown as postgres.JSONValue)},
              ${r.repo.commitFull ?? null}, ${r.scoreVersion ?? null}, ${inputs ? sql.json(inputs as unknown as postgres.JSONValue) : null}, ${r.overflow ?? null}, ${triggeredBy})
      on conflict (user_id, lower(owner), lower(repo), commit_sha) do update set
        commit_full   = coalesce(prism_analyses.commit_full, excluded.commit_full),
        score_version = coalesce(prism_analyses.score_version, excluded.score_version),
        overflow      = coalesce(prism_analyses.overflow, excluded.overflow),
        -- Rows saved before fingerprints existed are upgraded when the same commit is analysed again.
        result        = case when prism_analyses.inputs is null then excluded.result else prism_analyses.result end,
        inputs        = coalesce(prism_analyses.inputs, excluded.inputs)
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
