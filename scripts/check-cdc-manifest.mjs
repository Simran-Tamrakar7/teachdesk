#!/usr/bin/env node
/**
 * ponytail: HEAD-check every CDC manifest URL. Ceiling: no PDF body parse.
 * Upgrade: run import-cdc against one entry when debugging chapter split.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "data/cdc-manifest.json"), "utf8"));
let failed = 0;

for (const e of manifest.entries) {
  try {
    const res = await fetch(e.url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "TeachDeskCDCImport/2.0",
        Referer: e.sourcePageUrl || "https://moecdc.gov.np/",
      },
    });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const ok = res.ok && ct.includes("pdf");
    console.log(`${ok ? "OK" : "BAD"} ${e.id} HTTP ${res.status} ${ct || "(no ct)"}`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`BAD ${e.id} ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} manifest URL(s) failed verification.`);
  process.exit(1);
}
console.log(`\nAll ${manifest.entries.length} CDC manifest URLs look fetchable.`);
