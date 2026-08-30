export default {
  pages: ["*.html"],
  outboundLinks: {
    requireAttributes: ['data-parent-lock="true"'],
    requireOnPage: ['id="parental-gate"'],
    requireAnyScript: ["gate.js"],
  },
  storageKeys: {
    sources: ["app.js"],
    keyPrefix: "demo-",
    declared: {
      "demo-settings-v1": {},
      "demo-gate-lock-v1": {},
    },
    disclosedIn: ["privacy.html"],
    erasedBy: { file: "app.js", function: "eraseDeviceData" },
  },
  offlineShell: {
    serviceWorker: "sw.js",
    rewrites: { "/privacy": "/privacy.html" },
  },
};
