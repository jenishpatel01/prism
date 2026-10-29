import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "@/server/migrate";
import { MIGRATIONS } from "@/server/migrations";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI does this); skipped otherwise.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("migrate (real Postgres)", () => {
  const schema = `t_migrate_${process.pid}`;
  let admin: postgres.Sql;
  let sql: postgres.Sql;

  beforeAll(async () => {
    admin = postgres(url!, { max: 1, onnotice: () => {} });
    await admin.unsafe(`drop schema if exists ${schema} cascade; create schema ${schema}`);
    // A pooled connection pinned to the scratch schema, so tests never touch real tables.
    sql = postgres(url!, { max: 1, connection: { search_path: schema } });
  });
  afterAll(async () => {
    await sql?.end();
    await admin?.unsafe(`drop schema if exists ${schema} cascade`);
    await admin?.end();
  });

  it("applies every migration once, in order, and records them", async () => {
    expect(await migrate(sql)).toEqual(MIGRATIONS.map((m) => m.id));
    const rows = await sql<{ id: string }[]>`select id from prism_migrations order by id`;
    expect(rows.map((r) => r.id)).toEqual(MIGRATIONS.map((m) => m.id));
    const tables = await sql<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema = ${schema}`;
    expect(tables.map((t) => t.table_name)).toEqual(expect.arrayContaining(["prism_users", "prism_analyses", "prism_issue_states", "prism_migrations"]));
  });

  it("does nothing the second time", async () => {
    expect(await migrate(sql)).toEqual([]);
  });

  it("adopts a database created by the old create-on-first-use code", async () => {
    await sql.unsafe(`drop table prism_migrations cascade`); // keep the tables, forget the ledger
    expect(await migrate(sql)).toEqual(MIGRATIONS.map((m) => m.id));
  });

  it("leaves the database unchanged when a migration fails", async () => {
    const good = { id: "9001_good", sql: "create table prism_probe (id int);" };
    const bad = { id: "9002_bad", sql: "select definitely_not_a_function();" };
    await expect(migrate(sql, [...MIGRATIONS, good, bad])).rejects.toThrow();
    const probe = await sql`select to_regclass('prism_probe') as t`;
    expect(probe[0].t).toBeNull();
    const ids = await sql<{ id: string }[]>`select id from prism_migrations`;
    expect(ids.map((r) => r.id)).not.toContain("9001_good");
  });

  it("lets two servers start at once without migrating twice", async () => {
    const s2 = `${schema}_b`;
    await admin.unsafe(`drop schema if exists ${s2} cascade; create schema ${s2}`);
    const a = postgres(url!, { max: 1, connection: { search_path: s2 } });
    const b = postgres(url!, { max: 1, connection: { search_path: s2 } });
    try {
      const [x, y] = await Promise.all([migrate(a), migrate(b)]);
      expect([x.length, y.length].sort()).toEqual([0, MIGRATIONS.length]);
    } finally {
      await a.end();
      await b.end();
      await admin.unsafe(`drop schema if exists ${s2} cascade`);
    }
  });
});
