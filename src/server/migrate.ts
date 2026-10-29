import type postgres from "postgres";
import { MIGRATIONS, MIGRATIONS_TABLE, type Migration } from "./migrations";

/*
 * Applies pending migrations once each, in order. Everything runs in a single
 * transaction behind an advisory lock, so two servers starting at the same time
 * can't both migrate, and a failing step leaves the database untouched.
 */

type Sql = postgres.Sql;

const LOCK_KEY = 727_274; // any constant that is unique to PRISM

export async function migrate(sql: Sql, migrations: Migration[] = MIGRATIONS): Promise<string[]> {
  const applied: string[] = [];
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_KEY})`;
    await tx.unsafe(MIGRATIONS_TABLE);
    const done = new Set((await tx<{ id: string }[]>`select id from prism_migrations`).map((r) => r.id));
    for (const m of migrations) {
      if (done.has(m.id)) continue;
      await tx.unsafe(m.sql);
      await tx`insert into prism_migrations (id) values (${m.id}) on conflict do nothing`;
      applied.push(m.id);
    }
  });
  return applied;
}
