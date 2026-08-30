#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { run } from "../src/index.mjs";
import { format } from "../src/report.mjs";

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  console.log(`claimcheck — turn the promises on your privacy page into tests.

  claimcheck [path-to-config]

Defaults to ./claimcheck.config.mjs. Exits 1 when a published claim is false.`);
  process.exit(0);
}

const configPath = resolve(args[0] ?? "claimcheck.config.mjs");
let config;
try {
  config = (await import(pathToFileURL(configPath).href)).default;
} catch (error) {
  console.error(`Could not load config at ${configPath}\n${error.message}`);
  process.exit(2);
}

const result = await run({ ...config, root: resolve(config.root ?? ".") });
const { text, ok } = format(result, { claimsUrl: config.claimsUrl });
(ok ? console.log : console.error)(text);
process.exit(ok ? 0 : 1);
