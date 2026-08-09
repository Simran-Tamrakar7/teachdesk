import manifestJson from "../../data/cdc-manifest.json";

export type CdcMedium = "en" | "ne";

export type CdcManifestEntry = {
  id: string;
  grade: number;
  subject: string;
  medium: CdcMedium;
  title: string;
  url: string;
  sourcePageUrl: string;
  verifiedDate: string;
};

type ManifestFile = {
  portal: string;
  notes?: string;
  entries: CdcManifestEntry[];
};

const manifest = manifestJson as ManifestFile;

export const CDC_MANIFEST_PORTAL = manifest.portal;
export const CDC_MANIFEST_ENTRIES: CdcManifestEntry[] = manifest.entries;

export function listManifestGrades(): number[] {
  return [...new Set(CDC_MANIFEST_ENTRIES.map((e) => e.grade))].sort((a, b) => a - b);
}

export function listManifestSubjects(grade: number, medium?: CdcMedium): string[] {
  return [
    ...new Set(
      CDC_MANIFEST_ENTRIES.filter(
        (e) => e.grade === grade && (medium ? e.medium === medium : true)
      ).map((e) => e.subject)
    ),
  ].sort();
}

/** Mediums available for a grade (optionally narrowed to one subject). */
export function listManifestMediums(grade: number, subject?: string): CdcMedium[] {
  return [
    ...new Set(
      CDC_MANIFEST_ENTRIES.filter(
        (e) => e.grade === grade && (subject ? e.subject === subject : true)
      ).map((e) => e.medium)
    ),
  ] as CdcMedium[];
}

export function findManifestEntry(
  grade: number,
  subject: string,
  medium: CdcMedium
): CdcManifestEntry | undefined {
  return CDC_MANIFEST_ENTRIES.find((e) => e.grade === grade && e.subject === subject && e.medium === medium);
}

export function coverageSummary(): string {
  const byGrade = new Map<number, string[]>();
  for (const e of CDC_MANIFEST_ENTRIES) {
    const list = byGrade.get(e.grade) ?? [];
    const label = `${e.subject} (${e.medium === "ne" ? "NE" : "EN"})`;
    if (!list.includes(label)) list.push(label);
    byGrade.set(e.grade, list);
  }
  return [...byGrade.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([g, subs]) => `Class ${g}: ${subs.join(", ")}`)
    .join(" · ");
}
