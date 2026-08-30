import { readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";

/**
 * Minimal glob: supports `*` inside a single path segment and `**` as a
 * leading-or-mid directory wildcard. Deliberately small — a config that needs
 * more than this is describing too much of its own site.
 */
function toRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, "(?:.*/)?");
  return new RegExp(`^${escaped}$`);
}

async function walk(root, dir, out) {
  let entries;
  try {
    entries = await readdir(join(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = dir ? posix.join(dir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      await walk(root, rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

/** Resolve glob patterns against `root`, minus anything `ignore` matches. */
export async function resolveFiles(root, patterns, ignore = []) {
  const all = await walk(root, "", []);
  const include = patterns.map(toRegExp);
  const exclude = ignore.map(toRegExp);
  return all
    .filter((f) => include.some((re) => re.test(f)))
    .filter((f) => !exclude.some((re) => re.test(f)))
    .sort();
}

export async function read(root, file) {
  return readFile(join(root, file), "utf-8");
}

/** Everything after </head> — the part of a page a visitor can click. */
export function bodyOf(html) {
  const i = html.indexOf("</head>");
  return i === -1 ? html : html.slice(i + 7);
}
