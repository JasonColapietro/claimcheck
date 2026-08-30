import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { run } from "../src/index.mjs";
import { format } from "../src/report.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(HERE, "fixtures", name);

async function check(name) {
  const config = (await import(join(fixture(name), "config.mjs"))).default;
  return run({ ...config, root: fixture(name) });
}

const has = (result, needle) => result.failures.some((f) => f.message.includes(needle));

test("a site whose claims hold passes", async () => {
  const result = await check("good");
  assert.deepEqual(result.failures, [], "expected no failures");
  assert.equal(result.ok, true);
  assert.equal(result.stats.pages, 2);
  assert.equal(result.stats.storageKeys, 2);
  assert.equal(result.stats.shellUrls, 3);
});

test("the good fixture actually exercises the link check", async () => {
  // Guards against a fixture that passes because nothing was examined.
  const result = await check("good");
  assert.ok(result.stats.outboundLinks > 0, "no outbound links were checked");
});

test("an ungated outbound link fails", async () => {
  const result = await check("broken");
  assert.ok(has(result, "ungated outbound link"), "expected the open-web link to fail");
  assert.ok(has(result, "example.net/open-web"));
});

test("a gated link on a page with no dialog fails, because the gate no-ops", async () => {
  const result = await check("broken");
  assert.ok(has(result, 'missing id="parental-gate"'), "expected the inert-gate failure");
});

test("a storage key the site writes but does not declare fails", async () => {
  const result = await check("broken");
  assert.ok(has(result, '"demo-undeclared-v1" is written by the site'));
});

test("a declared key missing from the disclosure page fails", async () => {
  const result = await check("broken");
  assert.ok(has(result, 'does not disclose "demo-gate-lock-v1"'));
});

test("a key the erase function forgets fails", async () => {
  const result = await check("broken");
  assert.ok(has(result, 'does not remove "demo-gate-lock-v1"'));
});

test("a precache URL with no file behind it fails", async () => {
  const result = await check("broken");
  assert.ok(has(result, "does-not-exist.js"));
  assert.ok(has(result, "would never install"));
});

test("keys held in a constant are found, not just string literals", async () => {
  const result = await check("good");
  assert.equal(result.stats.storageKeys, 2);
});

test("the report names the file and refuses to soften the verdict", async () => {
  const { text, ok } = format(await check("broken"));
  assert.equal(ok, false);
  assert.match(text, /broken claim\(s\)/);
  assert.match(text, /\[index\.html\]/);
  assert.match(text, /Do not quietly weaken the claim/);
});

test("an empty config checks nothing and passes rather than throwing", async () => {
  const result = await run({ root: fixture("good") });
  assert.equal(result.ok, true);
  assert.equal(result.stats.outboundLinks, 0);
});

test("a page glob that matches nothing is itself a failure", async () => {
  const result = await run({ root: fixture("good"), pages: ["nope/*.html"] });
  assert.ok(has(result, "no pages matched"));
});

test("a bare target=_blank does not count as gated on a page without the gate script", async () => {
  const result = await check("broken");
  const hit = result.failures.find((f) => f.file === "fallback.html");
  assert.ok(hit, "expected the fallback page to fail");
  assert.match(hit.message, /needs data-parent-lock="true"/);
  assert.match(hit.message, /example\.org\/elsewhere/);
});

test("the same link passes on a page that does load the gate script", async () => {
  const result = await check("good");
  assert.equal(result.failures.length, 0);
});
