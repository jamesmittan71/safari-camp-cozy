import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("migration validation accepts the canonical append-only chain", () => {
  const output = execFileSync(process.execPath, ["scripts/validate-migrations.mjs"], {
    encoding: "utf8",
  });

  assert.match(output, /Validated 11 append-only migrations/);
});
