import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("request middleware exposes a JSON health response before application rendering", async () => {
  const server = await readFile("src/start.ts", "utf8");

  assert.match(server, /pathname === "\/health"/);
  assert.match(server, /Response\.json\(\{ status: "ok" \}\)/);
});
