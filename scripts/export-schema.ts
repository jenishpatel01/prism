import { writeFileSync } from "node:fs";
import { schemaScript } from "../src/server/migrations";

// Regenerates supabase/schema.sql from the migrations.
writeFileSync(new URL("../supabase/schema.sql", import.meta.url), schemaScript());
console.log("Wrote supabase/schema.sql");
