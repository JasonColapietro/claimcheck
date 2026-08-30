import { resolveFiles } from "./files.mjs";
import { outboundLinks } from "./checks/outbound-links.mjs";
import { storageKeys } from "./checks/storage-keys.mjs";
import { offlineShell } from "./checks/offline-shell.mjs";

export const CHECKS = { outboundLinks, storageKeys, offlineShell };

/**
 * Run every configured check. Returns a result rather than exiting, so this is
 * usable from a test as easily as from CI.
 */
export async function run(config) {
  const root = config.root ?? ".";
  const failures = [];
  const fail = (file, message) => failures.push({ file, message });

  const pages = await resolveFiles(root, config.pages ?? [], config.ignore ?? []);
  if (!pages.length && config.pages?.length) {
    fail("config", `no pages matched ${JSON.stringify(config.pages)} under ${root}`);
  }

  const ctx = { root, pages, config, fail };
  const links = await outboundLinks(ctx);
  const storage = await storageKeys(ctx);
  const shell = await offlineShell(ctx);

  return {
    ok: failures.length === 0,
    failures,
    stats: {
      pages: pages.length,
      outboundLinks: links.checked,
      storageKeys: storage.found.size,
      shellUrls: shell.urls,
    },
  };
}
