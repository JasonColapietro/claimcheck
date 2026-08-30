import { read } from "../files.mjs";

/**
 * Claim: "here is everything we keep in your browser, and this button erases
 * all of it."
 *
 * Both halves rot silently. A new feature writes a key nobody adds to the
 * disclosure list; the erase function keeps clearing the three keys it knew
 * about at the time. The page still says "all of it."
 */
export async function storageKeys({ root, pages, config, fail }) {
  const rule = config.storageKeys;
  if (!rule) return { found: new Set() };

  const declared = rule.declared ?? {};
  const sources = [...(rule.sources ?? []), ...pages];
  const found = new Set();

  const apis = (rule.apis ?? ["localStorage", "sessionStorage"]).join("|");
  const literal = new RegExp(`(?:${apis})\\.(?:set|get|remove)Item\\(\\s*["'\`]([^"'\`]+)["'\`]`, "g");
  const viaConst = rule.keyPrefix
    ? new RegExp(
        `(?:const|let|var)\\s+\\w*[Kk][Ee][Yy]\\w*\\s*=\\s*["'\`](${rule.keyPrefix}[^"'\`]*)["'\`]`,
        "g"
      )
    : null;

  for (const file of sources) {
    let src;
    try {
      src = await read(root, file);
    } catch {
      fail(file, "listed as a storage source but could not be read");
      continue;
    }
    for (const m of src.matchAll(literal)) found.add(m[1]);
    if (viaConst) for (const m of src.matchAll(viaConst)) found.add(m[1]);
  }

  for (const key of found) {
    if (!(key in declared)) {
      fail(
        "config",
        `storage key "${key}" is written by the site but is not declared. ` +
          `Disclose it on your privacy page, clear it in your erase function, then declare it here.`
      );
    }
  }

  // Each declared key has to be visible to a reader on every disclosure page.
  for (const page of rule.disclosedIn ?? []) {
    const src = await read(root, page);
    for (const [key, meta] of Object.entries(declared)) {
      const needle = meta?.disclosedAs ?? key;
      const present = needle instanceof RegExp ? needle.test(src) : src.includes(needle);
      if (!present) {
        fail(
          page,
          `does not disclose "${key}" (looked for ${
            needle instanceof RegExp ? needle : `"${needle}"`
          }), but the page enumerates what is stored`
        );
      }
    }
  }

  // And the erase control has to actually name every key it promises to clear.
  if (rule.erasedBy) {
    const { file, function: fnName } = rule.erasedBy;
    const src = await read(root, file);
    const fn = src.match(new RegExp(`function ${fnName}\\s*\\([^)]*\\)[\\s\\S]*?\\n}`));
    if (!fn) {
      fail(file, `${fnName}() not found, so the erase claim cannot be verified`);
    } else {
      const consts = [...src.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*["'`]([^"'`]+)["'`]/g)];
      for (const [key, meta] of Object.entries(declared)) {
        if (meta?.exemptFromErase) continue;
        const names = consts.filter((m) => m[2] === key).map((m) => m[1]);
        const cleared =
          fn[0].includes(`"${key}"`) ||
          fn[0].includes(`'${key}'`) ||
          fn[0].includes(`\`${key}\``) ||
          names.some((n) => fn[0].includes(n));
        if (!cleared) {
          fail(file, `${fnName}() does not remove "${key}", but the erase control promises all of it`);
        }
      }
    }
  }

  return { found };
}
