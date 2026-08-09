/** On-demand multi-source catalog for Library Import Content.
 *  Only official / listed sources — CDC, CEHRD (Sikai Chautari), e-Pustakalaya, DLC.
 */

export type ContentMedium = "en" | "ne" | "any";

export type ContentSourceId = "cdc" | "cehrd" | "epustakalaya" | "dlc";

export type ContentCatalogEntry = {
  id: string;
  source: ContentSourceId;
  grade: number;
  subject: string;
  medium: ContentMedium;
  title: string;
  sourcePageUrl: string;
  pdfUrl?: string;
  unitTitles?: string[];
  /** Badge + note for DLC etc. */
  badge: string;
  official?: boolean;
};

const CDC_HOME = "https://moecdc.gov.np/en/text-books";
const CEHRD_HOME = "https://learning.cehrd.gov.np/";
const EPUST_HOME = "https://www.olenepal.org/e-pustakalaya/";
const DLC_HOME = "https://dlc.dwit.edu.np/";

export const SOURCE_META: Record<
  ContentSourceId,
  { name: string; portal: string; blurb: string; badge: string }
> = {
  cdc: {
    name: "Curriculum Development Centre (CDC)",
    portal: CDC_HOME,
    blurb: "Official Nepal government textbooks, Grade 1–10, Nepali & English medium.",
    badge: "Official — CDC",
  },
  cehrd: {
    name: "Sikai Chautari (CEHRD)",
    portal: CEHRD_HOME,
    blurb: "Official digital courses and reading materials from CEHRD.",
    badge: "Official — CEHRD",
  },
  epustakalaya: {
    name: "e-Pustakalaya (OLE Nepal)",
    portal: EPUST_HOME,
    blurb: "Digital library of children’s and school books.",
    badge: "Library — e-Pustakalaya",
  },
  dlc: {
    name: "Deerwalk Learning Center (DLC)",
    portal: DLC_HOME,
    blurb: "Free CDC-aligned video lessons (Class 4–11). Not an official curriculum PDF.",
    badge: "Video Lessons — DLC (not official curriculum)",
  },
};

function e(
  source: ContentSourceId,
  grade: number,
  subject: string,
  medium: ContentMedium,
  title: string,
  opts?: Partial<Pick<ContentCatalogEntry, "pdfUrl" | "unitTitles" | "sourcePageUrl" | "official">>
): ContentCatalogEntry {
  const meta = SOURCE_META[source];
  return {
    id: `${source}-g${grade}-${subject.toLowerCase().replace(/\s+/g, "-")}-${medium}`,
    source,
    grade,
    subject,
    medium,
    title,
    sourcePageUrl: opts?.sourcePageUrl ?? meta.portal,
    pdfUrl: opts?.pdfUrl,
    unitTitles: opts?.unitTitles,
    badge: meta.badge,
    official: opts?.official ?? (source === "cdc" || source === "cehrd"),
  };
}

/**
 * Confirmed CDC subject structure by grade band (not chapter-by-chapter syllabi).
 * Chapter lists stay on-demand from moecdc.gov.np — we only hardcode units when verified.
 */
export const CDC_SUBJECTS_BY_GRADE: Record<number, string[]> = {
  1: [
    "Nepali",
    "English",
    "Mathematics",
    "Science (Serofero)",
    "Health & Physical Education",
    "Social Studies",
    "Creative Arts",
  ],
  2: [
    "Nepali",
    "English",
    "Mathematics",
    "Science (Serofero)",
    "Health & Physical Education",
    "Social Studies",
    "Creative Arts",
  ],
  3: [
    "Nepali",
    "English",
    "Mathematics",
    "Science (Serofero)",
    "Health & Physical Education",
    "Social Studies",
    "Creative Arts",
  ],
  4: ["Nepali", "English", "Mathematics", "Science", "Social Studies", "Health & Physical Education"],
  5: ["Nepali", "English", "Mathematics", "Science", "Social Studies", "Health & Physical Education"],
  6: ["Nepali", "English", "Mathematics", "Science", "Social Studies", "Health & Physical Education"],
  7: ["Nepali", "English", "Mathematics", "Science", "Social Studies", "Health & Physical Education"],
  8: ["Nepali", "English", "Mathematics", "Science", "Social Studies", "Health & Physical Education"],
  9: [
    "Nepali",
    "English",
    "Mathematics",
    "Science",
    "Social Studies",
    "Computer Science",
    "Accountancy",
    "Economics",
    "Optional Math",
  ],
  10: [
    "Nepali",
    "English",
    "Mathematics",
    "Science",
    "Social Studies",
    "Computer Science",
    "Accountancy",
    "Economics",
    "Optional Math",
    "History",
  ],
};

/** Verified unit titles only — Grade 8 Science Part I TOC (textbook). Do not invent other grades. */
export const VERIFIED_CDC_UNITS: Record<string, string[]> = {
  "8|Science|en": [
    "Scientific Learning",
    "Information and Communication Technology",
    "Living Beings and Their Structure",
    "Biodiversity and Environment",
    "Life Process",
    "Force and Motion",
    "Energy in Daily Life",
    "Electricity and Magnetism",
    "Matter",
    "Materials Used in Daily Life",
    "The Earth and Universe",
  ],
};

function cdcBookTitle(grade: number, subject: string, medium: ContentMedium): string {
  const neat = subject.replace(/\s*\(Serofero\)\s*/i, "").trim();
  if (medium === "ne") {
    const neMap: Record<string, string> = {
      Nepali: `नेपाली कक्षा ${grade}`,
      Mathematics: `गणित कक्षा ${grade}`,
      Science: `विज्ञान तथा प्रविधि कक्षा ${grade}`,
      "Social Studies": `सामाजिक अध्ययन कक्षा ${grade}`,
      "Health & Physical Education": `स्वास्थ्य तथा शारीरिक शिक्षा कक्षा ${grade}`,
      "Creative Arts": `सृजनात्मक कला कक्षा ${grade}`,
      "Science (Serofero)": `सेरोफेरो कक्षा ${grade}`,
    };
    return neMap[subject] || neMap[neat] || `${neat} कक्षा ${grade}`;
  }
  if (/Serofero/i.test(subject)) return `Serofero (Our Surroundings) Grade ${grade}`;
  if (neat === "Science") return `Science and Technology Grade ${grade}`;
  return `${neat} Grade ${grade}`;
}

function buildCdcCatalog(): ContentCatalogEntry[] {
  const out: ContentCatalogEntry[] = [];
  for (let grade = 1; grade <= 10; grade++) {
    for (const subject of CDC_SUBJECTS_BY_GRADE[grade] ?? []) {
      for (const medium of ["en", "ne"] as ContentMedium[]) {
        // Nepali subject is primarily Nepali-medium; still list both for picker clarity
        const key = `${grade}|${subject.replace(/\s*\(Serofero\)\s*/i, "Science").trim()}|${medium}`;
        const keyAlt = `${grade}|${subject}|${medium}`;
        const units = VERIFIED_CDC_UNITS[key] || VERIFIED_CDC_UNITS[keyAlt];
        out.push(
          e("cdc", grade, subject, medium, cdcBookTitle(grade, subject, medium), {
            unitTitles: units,
            sourcePageUrl:
              grade === 10 && subject === "Optional Math"
                ? "https://moecdc.gov.np/content/656/elective-mathematics-class-10--corrected-copy-/"
                : CDC_HOME,
          })
        );
      }
    }
  }
  return out;
}

/** Sparse extras for non-CDC sources + full CDC grade×subject grid. */
export const CONTENT_CATALOG: ContentCatalogEntry[] = [
  ...buildCdcCatalog(),

  // CEHRD / Sikai Chautari — portal links (no invented chapter lists)
  e("cehrd", 1, "Nepali", "ne", "सिकाई चौतारी — कक्षा १"),
  e("cehrd", 1, "English", "en", "Sikai Chautari — Class 1 English"),
  e("cehrd", 1, "Mathematics", "en", "Sikai Chautari — Class 1 Mathematics"),
  e("cehrd", 1, "Science (Serofero)", "en", "Sikai Chautari — Class 1 Serofero"),
  e("cehrd", 6, "Science", "en", "Sikai Chautari — Class 6 Science"),
  e("cehrd", 6, "Social Studies", "en", "Sikai Chautari — Class 6 Social Studies"),
  e("cehrd", 8, "Science", "en", "Sikai Chautari — Class 8 Science"),
  e("cehrd", 9, "Science", "en", "Sikai Chautari — Class 9 Science"),
  e("cehrd", 10, "Science", "en", "Sikai Chautari — Class 10 Science"),

  // e-Pustakalaya
  e("epustakalaya", 1, "English", "en", "e-Pustakalaya — Early readers (English)"),
  e("epustakalaya", 1, "Nepali", "ne", "e-Pustakalaya — बाल सामग्री"),
  e("epustakalaya", 2, "Nepali", "ne", "e-Pustakalaya — बाल कथा (नेपाली)"),
  e("epustakalaya", 6, "Social Studies", "en", "e-Pustakalaya — Social Studies readers"),
  e("epustakalaya", 8, "English", "en", "e-Pustakalaya — Middle school English"),

  // DLC video lessons (Class 4–11) — clearly not official curriculum PDFs
  e("dlc", 4, "Mathematics", "en", "DLC Video — Class 4 Mathematics"),
  e("dlc", 5, "Science", "en", "DLC Video — Class 5 Science"),
  e("dlc", 6, "Science", "en", "DLC Video — Class 6 Science"),
  e("dlc", 6, "Social Studies", "en", "DLC Video — Class 6 Social Studies"),
  e("dlc", 8, "Science", "en", "DLC Video — Class 8 Science", {
    unitTitles: VERIFIED_CDC_UNITS["8|Science|en"],
  }),
  e("dlc", 9, "Science", "en", "DLC Video — Class 9 Science"),
  e("dlc", 10, "Science", "en", "DLC Video — Class 10 Science"),
  e("dlc", 11, "Science", "en", "DLC Video — Class 11 Science"),
];

export function listSourceIds(): ContentSourceId[] {
  return ["cdc", "cehrd", "epustakalaya", "dlc"];
}

export function listContentGrades(source?: ContentSourceId): number[] {
  if (!source || source === "cdc") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  if (source === "dlc") return [4, 5, 6, 7, 8, 9, 10, 11];
  const rows = CONTENT_CATALOG.filter((x) => x.source === source);
  const grades = [...new Set(rows.map((e) => e.grade))].sort((a, b) => a - b);
  return grades.length ? grades : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

/** Subject picker: CDC uses confirmed grade-band structure (shown for any medium). */
export function listContentSubjects(source: ContentSourceId, grade: number, medium: ContentMedium): string[] {
  if (source === "cdc") {
    return [...(CDC_SUBJECTS_BY_GRADE[grade] ?? [])];
  }
  if (source === "cehrd") {
    // Same structure as CDC for picker; catalog rows may be sparse
    return CDC_SUBJECTS_BY_GRADE[grade] ?? listFromCatalog(source, grade, medium);
  }
  return listFromCatalog(source, grade, medium);
}

function listFromCatalog(source: ContentSourceId, grade: number, medium: ContentMedium): string[] {
  return [
    ...new Set(
      CONTENT_CATALOG.filter(
        (e) =>
          e.source === source &&
          e.grade === grade &&
          (medium === "any" || e.medium === medium || e.medium === "any")
      ).map((e) => e.subject)
    ),
  ].sort();
}

export function findContentEntry(
  source: ContentSourceId,
  grade: number,
  subject: string,
  medium: ContentMedium
): ContentCatalogEntry | undefined {
  const hit =
    CONTENT_CATALOG.find(
      (e) => e.source === source && e.grade === grade && e.subject === subject && e.medium === medium
    ) ||
    CONTENT_CATALOG.find(
      (e) =>
        e.source === source &&
        e.grade === grade &&
        e.subject === subject &&
        (e.medium === "any" || medium === "any")
    );
  if (hit) return hit;

  // On-demand stub so Grade 1 (etc.) always importable even if a row is missing
  if (source === "cdc" && (CDC_SUBJECTS_BY_GRADE[grade] ?? []).includes(subject)) {
    const scienceKey = subject.replace(/\s*\(Serofero\)\s*/i, "Science").trim();
    const units =
      VERIFIED_CDC_UNITS[`${grade}|${scienceKey}|${medium}`] ||
      VERIFIED_CDC_UNITS[`${grade}|${subject}|${medium}`];
    return e("cdc", grade, subject, medium, cdcBookTitle(grade, subject, medium), {
      unitTitles: units,
      sourcePageUrl: CDC_HOME,
    });
  }
  return undefined;
}

export function hasVerifiedUnits(grade: number, subject: string, medium: ContentMedium): boolean {
  const scienceKey = subject.replace(/\s*\(Serofero\)\s*/i, "Science").trim();
  return !!(
    VERIFIED_CDC_UNITS[`${grade}|${scienceKey}|${medium}`] ||
    VERIFIED_CDC_UNITS[`${grade}|${subject}|${medium}`]
  );
}

export function sourceKindFromId(source: ContentSourceId): "cdc" | "cehrd" | "epustakalaya" | "dlc" {
  return source;
}
