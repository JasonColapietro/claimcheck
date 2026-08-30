/** Human-readable summary. Kept apart from run() so results stay machine-usable. */
export function format(result, { claimsUrl } = {}) {
  const s = result.stats;
  const lines = [
    `Checked ${s.outboundLinks} outbound link(s) across ${s.pages} page(s), ` +
      `${s.storageKeys} storage key(s), and ${s.shellUrls} offline-shell URL(s).`,
  ];

  if (result.ok) {
    lines.push("Every claim holds.");
    return { text: lines.join("\n"), ok: true };
  }

  lines.push("", `${result.failures.length} broken claim(s):`);
  for (const f of result.failures) lines.push(`  [${f.file}] ${f.message}`);
  lines.push(
    "",
    "These are published as absolutes, so a failure means the shipped site contradicts",
    "something it tells people — not that a nicety is missing. Fix the code or fix the",
    "claim. Do not quietly weaken the claim to a hedge."
  );
  if (claimsUrl) lines.push(`The claims being checked: ${claimsUrl}`);
  return { text: lines.join("\n"), ok: false };
}
