import { read } from "../files.mjs";

/**
 * Claim: "this works offline."
 *
 * A service worker precache list is a promise with an unusually quiet failure
 * mode: cache.addAll() rejects atomically, so ONE missing URL means the new
 * worker never installs. Visitors keep running the old one, offline keeps
 * working the way it used to, and nothing in the console tells you the deploy
 * silently did not take.
 */
export async function offlineShell({ root, config, fail }) {
  const rule = config.offlineShell;
  if (!rule) return { urls: 0 };

  const sw = await read(root, rule.serviceWorker);
  const listName = rule.listName ?? "SHELL_URLS";
  const list = sw.match(new RegExp(`${listName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!list) {
    fail(rule.serviceWorker, `${listName} not found; the precache guard cannot run`);
    return { urls: 0 };
  }

  const urls = [...list[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  if (!urls.length) fail(rule.serviceWorker, `${listName} is empty`);

  // Clean URLs usually resolve through host rewrites rather than to a file.
  const rewrites = new Map(Object.entries(rule.rewrites ?? {}));
  if (rule.rewritesFrom) {
    const json = JSON.parse(await read(root, rule.rewritesFrom));
    for (const r of json.rewrites ?? []) rewrites.set(r.source, r.destination);
  }

  for (const url of urls) {
    const target = url === "/" ? (rule.indexFile ?? "/index.html") : rewrites.get(url) ?? url;
    if (/^https?:/.test(target)) continue;
    const rel = target.replace(/^\//, "");
    try {
      await read(root, rel);
    } catch {
      fail(
        rule.serviceWorker,
        `${listName} entry ${url} resolves to ${rel}, which does not exist; ` +
          `cache.addAll would reject and the new service worker would never install`
      );
    }
  }

  return { urls: urls.length };
}
