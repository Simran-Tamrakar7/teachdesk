import type { Material } from "./types";

/** grade-8-science-and-technology-part-i → Grade 8 — Science and Technology, Part I */
export function formatBookTitle(raw: string): string {
  let s = raw.replace(/\.[^.]+$/, "").replace(/[_]+/g, "-").trim();
  if (!s.includes("-") && !/\s/.test(s)) return s;
  s = s.replace(/[-]+/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/\bpart\s*([ivx\d]+)\b/gi, (_, p) => `Part ${String(p).toUpperCase()}`);
  s = s.replace(/\b(grade|class)\s*(\d+)\b/gi, (_, g, n) => `${g[0].toUpperCase()}${g.slice(1).toLowerCase()} ${n}`);
  s = s.replace(/\b\w/g, (c) => c.toUpperCase());
  // "Grade 8 Science And Technology, Part I" → insert em dash after grade
  s = s.replace(/^(Grade|Class)\s+(\d+)\s+/i, "$1 $2 — ");
  s = s.replace(/\s+And\s+/g, " and ").replace(/\s+Of\s+/g, " of ").replace(/\s+The\s+/g, " the ");
  // Fix "Science and Technology Part I" → comma before Part
  s = s.replace(/\s+(Part\s+[IVX\d]+)$/i, ", $1");
  return s;
}

export function materialFingerprint(fileName: string, sizeBytes: number): string {
  return `${fileName.trim().toLowerCase()}|${sizeBytes}`;
}

export function findDuplicateMaterial(
  materials: Material[],
  classIds: string[],
  fingerprint: string
): Material | undefined {
  return materials.find(
    (m) =>
      !m.deletedAt &&
      classIds.includes(m.classId) &&
      (m.fileFingerprint === fingerprint ||
        (m.versions.at(-1)?.fileName?.toLowerCase() === fingerprint.split("|")[0] &&
          m.fileSizeBytes === Number(fingerprint.split("|")[1])))
  );
}

/** Keep newest of each fingerprint within class scope; returns ids to remove */
export function duplicateMaterialIds(materials: Material[], classIds: string[]): string[] {
  const alive = materials.filter((m) => !m.deletedAt && classIds.includes(m.classId));
  const byKey = new Map<string, Material[]>();
  for (const m of alive) {
    const key =
      m.fileFingerprint ||
      `${(m.versions.at(-1)?.fileName || m.title).toLowerCase()}|${m.fileSizeBytes ?? m.sizeLabel}`;
    const list = byKey.get(key) ?? [];
    list.push(m);
    byKey.set(key, list);
  }
  const remove: string[] = [];
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    for (const d of list.slice(1)) remove.push(d.id);
  }
  return remove;
}

export type SourceBadge =
  | { label: string; tone: "upload" | "official" | "import" | "ai" | "syllabus" | "video" };

export function sourceBadgeFor(m: Material): SourceBadge {
  if (m.sourceLabel) {
    const l = m.sourceLabel;
    if (/CDC/i.test(l)) return { label: l, tone: "official" };
    if (/CEHRD|Sikai/i.test(l)) return { label: l, tone: "official" };
    if (/e-Pustakalaya|Library/i.test(l)) return { label: l, tone: "import" };
    if (/DLC|Video/i.test(l)) return { label: l, tone: "video" };
    if (/AI/i.test(l)) return { label: l, tone: "ai" };
    if (/syllabus/i.test(l)) return { label: l, tone: "syllabus" };
    return { label: l, tone: "import" };
  }
  switch (m.sourceKind) {
    case "cdc":
      return { label: "Official — CDC", tone: "official" };
    case "cehrd":
      return { label: "Official — CEHRD", tone: "official" };
    case "epustakalaya":
      return { label: "Library — e-Pustakalaya", tone: "import" };
    case "dlc":
      return { label: "Video Lessons — DLC (not official curriculum)", tone: "video" };
    case "ai":
      return { label: "AI-generated", tone: "ai" };
    case "syllabus":
      return { label: "From syllabus", tone: "syllabus" };
    default:
      return { label: "Uploaded by you", tone: "upload" };
  }
}

export function subjectAccent(subject: string): string {
  const s = subject.toLowerCase();
  if (/science|technology|विज्ञान/.test(s)) return "#1f6f63";
  if (/social|सामाजिक/.test(s)) return "#c47a1a";
  if (/math|गणित/.test(s)) return "#2b5ea7";
  if (/english|नेपाली|nepali/.test(s)) return "#7a3e9d";
  if (/health|computer|account|econom|history/.test(s)) return "#0e7490";
  return "#1f6f63";
}

/** Parse a short syllabus outline into unit titles + topic lines */
export function parseSyllabusUnits(text: string): { title: string; topics: string[] }[] {
  const cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) return [];

  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const units: { title: string; topics: string[] }[] = [];
  const unitRe =
    /^(?:unit|chapter|एकाइ|अध्याय|पाठ|topic)\s*[\d०-९]+[.\-–—:\s]+(.+)$/i;
  const numberedRe = /^(\d{1,2})[.\-–—)\s]+(.{3,80})$/;

  let current: { title: string; topics: string[] } | null = null;

  for (const line of lines) {
    const u = line.match(unitRe);
    if (u) {
      current = { title: u[1].trim(), topics: [] };
      units.push(current);
      continue;
    }
    const n = line.match(numberedRe);
    if (n && !/^(week|hour|period|marks)/i.test(n[2])) {
      // New unit if looks like a chapter heading (short, no trailing period dump)
      if (n[2].length <= 70 && !n[2].includes("  ")) {
        current = { title: n[2].trim(), topics: [] };
        units.push(current);
        continue;
      }
    }
    if (/^[-•*]\s+/.test(line) || /^\t/.test(line)) {
      if (!current) {
        current = { title: `Unit ${units.length + 1}`, topics: [] };
        units.push(current);
      }
      current.topics.push(line.replace(/^[-•*\t]\s*/, "").trim());
      continue;
    }
    if (current && line.length < 100 && !/[.!?]$/.test(line)) {
      current.topics.push(line);
    }
  }

  if (units.length >= 2) return units;

  // Fallback: treat non-empty lines as unit titles
  const fallback = lines
    .filter((l) => l.length >= 3 && l.length <= 100)
    .slice(0, 20)
    .map((title) => ({ title: title.replace(/^[\d.\-–—)\s]+/, "").trim() || title, topics: [] as string[] }));
  return fallback.length ? fallback : [{ title: "Syllabus overview", topics: lines.slice(0, 12) }];
}
