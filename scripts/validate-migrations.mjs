import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(migrationsDirectory))
  .filter((file) => /^\d{14}_[a-z0-9_-]+\.sql$/.test(file))
  .sort();

if (files.length === 0) throw new Error("No migrations found.");
if (new Set(files).size !== files.length) throw new Error("Migration names must be unique.");

const forbidden = /\bDROP\s+(TABLE|SCHEMA|TYPE)\b|\bTRUNCATE\b/i;
for (const file of files) {
  const sql = await readFile(join(migrationsDirectory.pathname, file), "utf8");
  if (forbidden.test(sql)) throw new Error(`${file} contains a destructive database statement.`);
}

const roleMigration = await readFile(
  join(migrationsDirectory.pathname, "20260806150000_admin_role_security.sql"),
  "utf8",
);
for (const required of [
  "SECURITY DEFINER",
  "SET search_path = pg_catalog, public",
  "Cannot remove the final administrator",
  "user_role_audit",
]) {
  if (!roleMigration.includes(required)) throw new Error(`Role migration is missing: ${required}`);
}

console.log(`Validated ${files.length} append-only migrations.`);
