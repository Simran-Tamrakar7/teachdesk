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

/** Representative on-demand entries — expand as URLs are verified. */
export const CONTENT_CATALOG: ContentCatalogEntry[] = [
  // CDC
  e("cdc", 1, "Nepali", "ne", "मेरो नेपाली कक्षा १"),
  e("cdc", 1, "English", "en", "My English Grade 1"),
  e("cdc", 1, "Mathematics", "en", "My Mathematics Grade 1"),
  e("cdc", 2, "English", "en", "My English Grade 2", {
    sourcePageUrl: "http://lib.moecdc.gov.np/catalog/opac_css/index.php?id=12030&lvl=notice_display",
  }),
  e("cdc", 3, "Science", "en", "Science Grade 3"),
  e("cdc", 4, "Social Studies", "en", "Social Studies Grade 4"),
  e("cdc", 5, "Mathematics", "en", "Mathematics Grade 5"),
  e("cdc", 6, "Nepali", "ne", "मेरो नेपाली कक्षा ६", {
    sourcePageUrl: "https://lib.moecdc.gov.np/elibrary/?r=3886",
  }),
  e("cdc", 6, "English", "en", "My English Grade 6"),
  e("cdc", 6, "Mathematics", "en", "My Mathematics Grade 6"),
  e("cdc", 6, "Mathematics", "ne", "मेरो गणित कक्षा ६"),
  e("cdc", 6, "Science", "en", "Science and Technology Grade 6"),
  e("cdc", 6, "Science", "ne", "विज्ञान तथा प्रविधि कक्षा ६"),
  e("cdc", 6, "Social Studies", "en", "Social Studies Grade 6"),
  e("cdc", 6, "Social Studies", "ne", "सामाजिक अध्ययन कक्षा ६"),
  e("cdc", 7, "Nepali", "ne", "नेपाली कक्षा ७"),
  e("cdc", 7, "English", "en", "English Grade 7"),
  e("cdc", 7, "Mathematics", "en", "Mathematics Grade 7"),
  e("cdc", 7, "Science", "en", "Science and Technology Grade 7"),
  e("cdc", 7, "Social Studies", "en", "Social Studies Grade 7"),
  e("cdc", 8, "Nepali", "ne", "नेपाली कक्षा ८"),
  e("cdc", 8, "English", "en", "English Grade 8"),
  e("cdc", 8, "Mathematics", "en", "Mathematics Grade 8"),
  e("cdc", 8, "Science", "en", "Science and Technology Grade 8 (Part I)", {
    unitTitles: [
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
  }),
  e("cdc", 8, "Science", "ne", "विज्ञान तथा प्रविधि कक्षा ८"),
  e("cdc", 8, "Social Studies", "en", "Social Studies Grade 8"),
  e("cdc", 8, "Health", "en", "Health, Physical and Creative Arts Grade 8"),
  e("cdc", 9, "Nepali", "ne", "नेपाली कक्षा ९"),
  e("cdc", 9, "English", "en", "English Grade 9"),
  e("cdc", 9, "Mathematics", "en", "Mathematics Grade 9"),
  e("cdc", 9, "Science", "en", "Science and Technology Grade 9"),
  e("cdc", 9, "Social Studies", "en", "Social Studies Grade 9"),
  e("cdc", 9, "Computer Science", "en", "Computer Science Grade 9 (Optional)"),
  e("cdc", 9, "Accountancy", "en", "Accountancy Grade 9 (Optional)"),
  e("cdc", 10, "Nepali", "ne", "नेपाली कक्षा १०"),
  e("cdc", 10, "English", "en", "English Grade 10"),
  e("cdc", 10, "Mathematics", "en", "Mathematics Grade 10"),
  e("cdc", 10, "Science", "en", "Science and Technology Grade 10"),
  e("cdc", 10, "Social Studies", "en", "Social Studies Grade 10"),
  e("cdc", 10, "Optional Math", "en", "Elective Mathematics Grade 10", {
    sourcePageUrl: "https://moecdc.gov.np/content/656/elective-mathematics-class-10--corrected-copy-/",
  }),
  e("cdc", 10, "Economics", "en", "Economics Grade 10 (Optional)"),
  e("cdc", 10, "History", "en", "History Grade 10 (Optional)"),

  // CEHRD / Sikai Chautari — portal links + unit seeds
  e("cehrd", 6, "Science", "en", "Sikai Chautari — Class 6 Science", {
    unitTitles: ["Living things", "Matter around us", "Force and energy", "Earth and space"],
  }),
  e("cehrd", 7, "Science", "en", "Sikai Chautari — Class 7 Science", {
    unitTitles: ["Life processes", "Materials", "Motion and force", "Environment"],
  }),
  e("cehrd", 8, "Science", "en", "Sikai Chautari — Class 8 Science", {
    unitTitles: ["Scientific learning", "Living beings", "Force and motion", "Matter", "Earth"],
  }),
  e("cehrd", 8, "Mathematics", "en", "Sikai Chautari — Class 8 Mathematics"),
  e("cehrd", 9, "Science", "en", "Sikai Chautari — Class 9 Science"),
  e("cehrd", 10, "Science", "en", "Sikai Chautari — Class 10 Science"),
  e("cehrd", 5, "English", "en", "Sikai Chautari — Class 5 English"),
  e("cehrd", 6, "Nepali", "ne", "सिकाई चौतारी — कक्षा ६ नेपाली"),

  // e-Pustakalaya
  e("epustakalaya", 1, "English", "en", "e-Pustakalaya — Early readers (English)"),
  e("epustakalaya", 2, "Nepali", "ne", "e-Pustakalaya — बाल कथा (नेपाली)"),
  e("epustakalaya", 4, "Science", "en", "e-Pustakalaya — Science stories Grade 4"),
  e("epustakalaya", 6, "Social Studies", "en", "e-Pustakalaya — Social Studies readers"),
  e("epustakalaya", 8, "English", "en", "e-Pustakalaya — Middle school English"),

  // DLC video lessons (Class 4–11)
  e("dlc", 4, "Mathematics", "en", "DLC Video — Class 4 Mathematics", {
    unitTitles: ["Numbers", "Operations", "Geometry intro", "Measurement"],
  }),
  e("dlc", 5, "Science", "en", "DLC Video — Class 5 Science", {
    unitTitles: ["Living world", "Materials", "Energy", "Earth"],
  }),
  e("dlc", 6, "Science", "en", "DLC Video — Class 6 Science"),
  e("dlc", 7, "Science", "en", "DLC Video — Class 7 Science"),
  e("dlc", 8, "Science", "en", "DLC Video — Class 8 Science", {
    unitTitles: [
      "Scientific Learning",
      "ICT",
      "Living Beings",
      "Biodiversity",
      "Life Process",
      "Force and Motion",
      "Energy",
      "Electricity",
      "Matter",
      "Materials",
      "Earth and Universe",
    ],
  }),
  e("dlc", 8, "Mathematics", "en", "DLC Video — Class 8 Mathematics"),
  e("dlc", 9, "Science", "en", "DLC Video — Class 9 Science"),
  e("dlc", 10, "Science", "en", "DLC Video — Class 10 Science"),
  e("dlc", 11, "Science", "en", "DLC Video — Class 11 Science"),
];

export function listSourceIds(): ContentSourceId[] {
  return ["cdc", "cehrd", "epustakalaya", "dlc"];
}

export function listContentGrades(source?: ContentSourceId): number[] {
  const rows = source ? CONTENT_CATALOG.filter((x) => x.source === source) : CONTENT_CATALOG;
  return [...new Set(rows.map((e) => e.grade))].sort((a, b) => a - b);
}

export function listContentSubjects(source: ContentSourceId, grade: number, medium: ContentMedium): string[] {
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
  return (
    CONTENT_CATALOG.find(
      (e) => e.source === source && e.grade === grade && e.subject === subject && e.medium === medium
    ) ||
    CONTENT_CATALOG.find(
      (e) =>
        e.source === source &&
        e.grade === grade &&
        e.subject === subject &&
        (e.medium === "any" || medium === "any")
    )
  );
}

export function sourceKindFromId(source: ContentSourceId): "cdc" | "cehrd" | "epustakalaya" | "dlc" {
  return source;
}
