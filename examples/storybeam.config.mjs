// The real configuration StoryBeam Kids runs in CI (storybeamkids.com).
// Kept here as a worked example: this is what a filled-in config looks like on
// a site whose privacy page makes absolute claims.
export default {
  root: ".",
  claimsUrl: "https://storybeamkids.com/privacy",

  pages: ["*.html", "episodes/*.html", "blog-posts/*.html"],
  ignore: ["public/**"],

  // "Every App Store, podcast, social, book, and research link on this site
  //  opens through the grown-up check."
  outboundLinks: {
    requireAttributes: ['data-parent-lock="true"', 'target="_blank"'],
    requireOnPage: ['id="parental-gate"'],
    requireAnyScript: ["parent-gate.js", "app.js"],
    // index.html drives the gate from app.js, which also catches bare _blank
    // links. On those pages we still demand the explicit lock, so a driver
    // regression cannot silently reopen the exit.
    strict: {
      when: { pageMissing: "parent-gate.js" },
      requireAttributes: ['data-parent-lock="true"'],
    },
  },

  // "What stays in the browser" enumerates these, and "Erase everything on
  //  this device ... clears all of it" promises the button removes them.
  storageKeys: {
    sources: ["app.js", "parent-gate.js", "sw.js"],
    keyPrefix: "storybeam-",
    declared: {
      "storybeam-safe-hub-state-v1": { disclosedAs: /storybeam-safe-hub-state-v1/ },
      "storybeam-gate-lock-v1": { disclosedAs: /grown-up check attempts/i },
      // Disclosed in prose rather than by key name, so that is what we match.
      "storybeam-reading-nook-v1": { disclosedAs: /Reading Nook storybooks/ },
    },
    disclosedIn: ["privacy.html"],
    erasedBy: { file: "app.js", function: "eraseDeviceData" },
  },

  // "The shell loads offline."
  offlineShell: {
    serviceWorker: "sw.js",
    listName: "SHELL_URLS",
    rewritesFrom: "vercel.json",
  },
};
