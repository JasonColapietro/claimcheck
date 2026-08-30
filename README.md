# claimcheck

Turn the promises on your privacy page into tests that fail the build.

```
Checked 213 outbound link(s) across 47 page(s), 3 storage key(s), and 13 offline-shell URL(s).
Every claim holds.
```

Zero dependencies. Node 18+. One config file.

## Why

Privacy pages make claims that are true the day they are written and quietly
stop being true later:

> Every outbound link opens through the grown-up check.
> Here is everything we keep in your browser, and this button erases all of it.
> The site works offline.

Nothing enforces any of that. A new page ships a link that skips the gate. A
feature adds a fifth storage key while the erase button still clears four. A
service worker precaches a URL that was renamed. The page still says *all*, and
the claim is now false — not because anyone lied, but because prose does not
have a test suite and code does.

claimcheck is that test suite. You write down what your page promises; it fails
CI when the code stops matching.

## Install

```bash
npm install --save-dev claimcheck
```

Or run it without installing:

```bash
npx claimcheck
```

## Use

Create `claimcheck.config.mjs` at the root of your site:

```js
export default {
  pages: ["*.html", "blog/*.html"],
  claimsUrl: "https://example.com/privacy",

  outboundLinks: {
    requireAttributes: ['data-gate="true"'],
    requireOnPage: ['id="gate-dialog"'],
    requireAnyScript: ["gate.js"],
  },

  storageKeys: {
    sources: ["app.js", "sw.js"],
    declared: {
      "app-settings-v1": {},
      "app-progress-v1": { disclosedAs: /how far you have read/ },
    },
    disclosedIn: ["privacy.html"],
    erasedBy: { file: "app.js", function: "eraseDeviceData" },
  },

  offlineShell: {
    serviceWorker: "sw.js",
    rewrites: { "/privacy": "/privacy.html" },
  },
};
```

Then:

```bash
npx claimcheck
```

Exit 0 when every claim holds, exit 1 when one does not. Wire it into CI next
to your other checks.

## The three checks

Each one exists because the failure it catches is invisible until someone looks.

### `outboundLinks` — "every link off this site goes through the gate"

Finds outbound anchors that carry none of the attributes your gate script keys
on. It also catches the subtler version: a page whose links *do* carry the
attribute but which never loads the gate script, or is missing the dialog the
gate drives. The markup looks protected. Nothing is protected.

`strict` handles the case where a general-purpose handler also happens to gate
bare `target="_blank"` links. That works until a refactor changes the handler,
so on pages relying on it you can demand the explicit opt-in instead:

```js
strict: {
  when: { pageMissing: "gate.js" },
  requireAttributes: ['data-gate="true"'],
}
```

### `storageKeys` — "here is everything we store, and this erases all of it"

Scans your scripts and pages for `localStorage` / `sessionStorage` writes,
including keys held in a constant, and requires each one to be:

1. declared in the config,
2. visible on every page listed in `disclosedIn` — literally, or matching the
   `disclosedAs` pattern if you disclose it in prose, and
3. removed by the function named in `erasedBy`.

The third is the one that rots. Erase functions are written once and features
keep arriving. Use `exemptFromErase: true` for a key that legitimately survives,
which forces you to say so out loud.

### `offlineShell` — "this works offline"

A service worker precache list is a promise with an unusually quiet failure
mode: `cache.addAll()` rejects atomically, so **one** missing URL means the new
worker never installs. Visitors keep running the old one, offline keeps working
the way it used to, and nothing tells you the deploy did not take. This resolves
every URL in the list against the filesystem, following host rewrites.

## Config reference

| Key | Type | Notes |
| --- | --- | --- |
| `root` | string | Defaults to `.` |
| `pages` | string[] | Globs. `*` within a segment, `**/` across segments |
| `ignore` | string[] | Globs excluded from `pages` |
| `claimsUrl` | string | Printed on failure, so the reader can go read the claim |
| `outboundLinks.requireAttributes` | string[] | Any one of these marks a link gated |
| `outboundLinks.requireOnPage` | string[] | Markup every page with gated links must contain |
| `outboundLinks.requireAnyScript` | string[] | At least one must be loaded |
| `outboundLinks.allow` | (string\|RegExp)[] | Links exempt from the claim |
| `outboundLinks.strict` | object | `{ when: { pageMissing \| pageIncludes }, requireAttributes }` — all-of, not any-of |
| `storageKeys.sources` | string[] | Scripts to scan, in addition to every page |
| `storageKeys.apis` | string[] | Defaults to `localStorage`, `sessionStorage` |
| `storageKeys.keyPrefix` | string | Also catch `const FOO_KEY = "prefix-…"` |
| `storageKeys.declared` | object | key → `{ disclosedAs?, exemptFromErase? }` |
| `storageKeys.disclosedIn` | string[] | Pages that enumerate storage |
| `storageKeys.erasedBy` | object | `{ file, function }` |
| `offlineShell.serviceWorker` | string | Path to the worker |
| `offlineShell.listName` | string | Defaults to `SHELL_URLS` |
| `offlineShell.rewrites` | object | Clean URL → file |
| `offlineShell.rewritesFrom` | string | Read rewrites from a `vercel.json` |

## Used in production

`examples/storybeam.config.mjs` is the real configuration from
[storybeamkids.com](https://storybeamkids.com), a closed-catalog audio app for
children ages three to eight. It guards 213 outbound links across 47 pages,
three storage keys, and a thirteen-URL offline shell on every commit.

Both classes of failure it checks were originally found by adversarial review
rather than by tests — twice. That is the whole origin of this tool: the second
time you find the same class of bug by hand, write the test instead.

## What this does not do

Worth saying plainly, because the name promises more than any static tool can
deliver:

- **It reads source, it does not run your site.** It cannot see a link injected
  at runtime, a key written by a dependency, or a request made by a third-party
  script. If your page pulls in code you do not control, this proves nothing
  about that code.
- **It checks the claims you tell it about.** It has no opinion on whether your
  privacy page is honest, only on whether the three mechanical claims above
  still match the code.
- **It is not a compliance tool.** No GDPR, no COPPA, no legal anything. It is a
  linter for promises you chose to make.

What it is good at is the narrow, real thing: catching the moment a claim you
already published quietly stopped being true.

## Development

```bash
npm test        # node:test, no framework
```

Tests run against two fixture sites in `test/fixtures/` — one whose claims hold,
one that breaks every check in a different way. New checks need both.

## License

MIT
