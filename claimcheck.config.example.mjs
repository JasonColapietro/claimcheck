// Copy to claimcheck.config.mjs and fill in. Every section is optional —
// configure only the claims you actually make.
export default {
  root: ".",
  pages: ["*.html"],
  claimsUrl: "https://example.com/privacy",

  outboundLinks: {
    requireAttributes: ['data-gate="true"'],
    requireOnPage: ['id="gate-dialog"'],
    requireAnyScript: ["gate.js"],
  },

  storageKeys: {
    sources: ["app.js"],
    declared: { "app-settings-v1": {} },
    disclosedIn: ["privacy.html"],
    erasedBy: { file: "app.js", function: "eraseDeviceData" },
  },

  offlineShell: {
    serviceWorker: "sw.js",
  },
};
