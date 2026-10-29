import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, schemaScript } from "@/server/migrations";

describe("migrations", () => {
  it("have unique, ordered ids", () => {
    const ids = MIGRATIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
    for (const id of ids) expect(id).toMatch(/^\d{4}_[a-z0-9_]+$/);
  });

  it("are safe to run again (every statement is idempotent)", () => {
    for (const m of MIGRATIONS) {
      expect(m.sql).not.toMatch(/\bcreate (table|index)\b(?! if not exists| unique index if not exists)/i);
      if (/alter table [\w_]+\s+add column/i.test(m.sql)) expect(m.sql).toMatch(/add column if not exists/i);
    }
  });

  it("supabase/schema.sql is up to date (run `npm run db:schema` if this fails)", () => {
    expect(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8")).toBe(schemaScript());
  });
});
