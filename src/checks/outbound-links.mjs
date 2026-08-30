import { read, bodyOf } from "../files.mjs";

/**
 * Claim: "every link that leaves this site goes through <your gate>."
 *
 * A link is only gated if it carries one of the attributes your gate script
 * actually keys on. An outbound anchor with none of them walks the visitor
 * straight out AND falsifies the published claim.
 *
 * The subtler failure, and the one worth having a test for: a page whose links
 * carry the attribute but which never loads the gate script, or is missing the
 * dialog the gate drives. The markup looks protected. Nothing is protected.
 *
 * `strict` exists because "any of these attributes counts" is too generous on
 * pages that fall back to a general-purpose handler. A bare target="_blank" may
 * be gated there today by a driver that a refactor can quietly change, so on
 * those pages you can demand the explicit opt-in instead.
 */
export async function outboundLinks({ root, pages, config, fail }) {
  const rule = config.outboundLinks;
  if (!rule) return { checked: 0 };

  const required = rule.requireAttributes ?? [];
  const onPage = rule.requireOnPage ?? [];
  const anyScript = rule.requireAnyScript ?? [];
  const allow = (rule.allow ?? []).map((p) => (p instanceof RegExp ? p : new RegExp(p)));

  let checked = 0;

  for (const page of pages) {
    const src = await read(root, page);
    const body = bodyOf(src);
    const anchors = [...body.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi)];
    let gatedHere = 0;

    // On pages matching `strict.when`, the generous any-of rule is replaced by
    // an all-of rule, so an implicit gate cannot stand in for an explicit one.
    const strict = rule.strict;
    const strictHere =
      strict &&
      (strict.when?.pageMissing ? !src.includes(strict.when.pageMissing) : true) &&
      (strict.when?.pageIncludes ? src.includes(strict.when.pageIncludes) : true);
    const needed = strictHere ? strict.requireAttributes : required;
    const satisfies = strictHere
      ? (tag) => needed.every((attr) => tag.includes(attr))
      : (tag) => needed.some((attr) => tag.includes(attr));
    const joiner = strictHere ? " and " : " or ";

    for (const [tag, href] of anchors) {
      if (allow.some((re) => re.test(href))) continue;
      checked += 1;
      if (satisfies(tag)) {
        gatedHere += 1;
      } else {
        fail(page, `ungated outbound link (needs ${needed.join(joiner)}): ${href}`);
      }
    }

    if (!gatedHere) continue;

    for (const marker of onPage) {
      if (!src.includes(marker)) {
        fail(
          page,
          `${gatedHere} gated link(s) but the page is missing ${marker}, ` +
            `so the gate silently no-ops and they are NOT gated`
        );
      }
    }

    if (anyScript.length && !anyScript.some((s) => src.includes(s))) {
      fail(page, `${gatedHere} gated link(s) but none of ${anyScript.join(", ")} is loaded`);
    }
  }

  return { checked };
}
