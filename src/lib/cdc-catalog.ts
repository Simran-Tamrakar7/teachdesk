/** On-demand CDC (Nepal) textbook catalog — Grade 1–10, Nepali/English medium.
 *  PDF URLs change by year; each entry includes a source page to verify.
 *  Prefer importing one grade+subject at a time.
 */

export type CdcMedium = "en" | "ne";

export type CdcCatalogEntry = {
  id: string;
  grade: number;
  subject: string;
  medium: CdcMedium;
  title: string;
  /** Official CDC content / listing page */
  sourcePageUrl: string;
  /** Direct PDF when known (may 404 if CDC rotates files) */
  pdfUrl?: string;
  /** Seed chapter titles when PDF text cannot be extracted */
  unitTitles?: string[];
};

const CDC_HOME = "https://moecdc.gov.np/en/text-books";
const CDC_TEXTBOOKS = "https://moecdc.gov.np/category/textbook/";

function entry(
  grade: number,
  subject: string,
  medium: CdcMedium,
  title: string,
  opts?: Partial<Pick<CdcCatalogEntry, "pdfUrl" | "unitTitles" | "sourcePageUrl">>
): CdcCatalogEntry {
  return {
    id: `cdc-g${grade}-${subject.toLowerCase().replace(/\s+/g, "-")}-${medium}`,
    grade,
    subject,
    medium,
    title,
    sourcePageUrl: opts?.sourcePageUrl ?? CDC_TEXTBOOKS,
    pdfUrl: opts?.pdfUrl,
    unitTitles: opts?.unitTitles,
  };
}

/** Representative catalog — not every CDC book; expand as URLs are verified. */
export const CDC_CATALOG: CdcCatalogEntry[] = [
  // Grade 6–8 Science / Social / English / Math / Nepali (common compulsory set)
  entry(6, "Nepali", "ne", "मेरो नेपाली कक्षा ६", {
    sourcePageUrl: "https://lib.moecdc.gov.np/elibrary/?r=3886",
  }),
  entry(6, "English", "en", "My English Grade 6", { sourcePageUrl: CDC_HOME }),
  entry(6, "Mathematics", "en", "My Mathematics Grade 6", { sourcePageUrl: CDC_HOME }),
  entry(6, "Mathematics", "ne", "मेरो गणित कक्षा ६", { sourcePageUrl: CDC_HOME }),
  entry(6, "Science", "en", "Science and Technology Grade 6", { sourcePageUrl: CDC_HOME }),
  entry(6, "Science", "ne", "विज्ञान तथा प्रविधि कक्षा ६", { sourcePageUrl: CDC_HOME }),
  entry(6, "Social Studies", "en", "Social Studies Grade 6", { sourcePageUrl: CDC_HOME }),
  entry(6, "Social Studies", "ne", "सामाजिक अध्ययन कक्षा ६", { sourcePageUrl: CDC_HOME }),

  entry(7, "Nepali", "ne", "नेपाली कक्षा ७", { sourcePageUrl: CDC_HOME }),
  entry(7, "English", "en", "English Grade 7", { sourcePageUrl: CDC_HOME }),
  entry(7, "Mathematics", "en", "Mathematics Grade 7", { sourcePageUrl: CDC_HOME }),
  entry(7, "Science", "en", "Science and Technology Grade 7", { sourcePageUrl: CDC_HOME }),
  entry(7, "Social Studies", "en", "Social Studies Grade 7", { sourcePageUrl: CDC_HOME }),

  entry(8, "Nepali", "ne", "नेपाली कक्षा ८", { sourcePageUrl: CDC_HOME }),
  entry(8, "English", "en", "English Grade 8", { sourcePageUrl: CDC_HOME }),
  entry(8, "Mathematics", "en", "Mathematics Grade 8", { sourcePageUrl: CDC_HOME }),
  entry(8, "Science", "en", "Science and Technology Grade 8 (Part I)", {
    sourcePageUrl: CDC_HOME,
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
  entry(8, "Science", "ne", "विज्ञान तथा प्रविधि कक्षा ८", { sourcePageUrl: CDC_HOME }),
  entry(8, "Social Studies", "en", "Social Studies Grade 8", { sourcePageUrl: CDC_HOME }),
  entry(8, "Health", "en", "Health, Physical and Creative Arts Grade 8", { sourcePageUrl: CDC_HOME }),

  entry(9, "Nepali", "ne", "नेपाली कक्षा ९", { sourcePageUrl: CDC_HOME }),
  entry(9, "English", "en", "English Grade 9", { sourcePageUrl: CDC_HOME }),
  entry(9, "Mathematics", "en", "Mathematics Grade 9", { sourcePageUrl: CDC_HOME }),
  entry(9, "Science", "en", "Science and Technology Grade 9", { sourcePageUrl: CDC_HOME }),
  entry(9, "Social Studies", "en", "Social Studies Grade 9", { sourcePageUrl: CDC_HOME }),
  entry(9, "Computer Science", "en", "Computer Science Grade 9 (Optional)", { sourcePageUrl: CDC_HOME }),
  entry(9, "Accountancy", "en", "Accountancy Grade 9 (Optional)", { sourcePageUrl: CDC_HOME }),

  entry(10, "Nepali", "ne", "नेपाली कक्षा १०", { sourcePageUrl: CDC_HOME }),
  entry(10, "English", "en", "English Grade 10", { sourcePageUrl: CDC_HOME }),
  entry(10, "Mathematics", "en", "Mathematics Grade 10", { sourcePageUrl: CDC_HOME }),
  entry(10, "Science", "en", "Science and Technology Grade 10", { sourcePageUrl: CDC_HOME }),
  entry(10, "Social Studies", "en", "Social Studies Grade 10", { sourcePageUrl: CDC_HOME }),
  entry(10, "Optional Math", "en", "Elective Mathematics Grade 10", {
    sourcePageUrl: "https://moecdc.gov.np/content/656/elective-mathematics-class-10--corrected-copy-/",
  }),
  entry(10, "Economics", "en", "Economics Grade 10 (Optional)", { sourcePageUrl: CDC_HOME }),
  entry(10, "History", "en", "History Grade 10 (Optional)", { sourcePageUrl: CDC_HOME }),

  // Lower grades (sample)
  entry(1, "Nepali", "ne", "मेरो नेपाली कक्षा १", { sourcePageUrl: CDC_HOME }),
  entry(1, "English", "en", "My English Grade 1", { sourcePageUrl: CDC_HOME }),
  entry(1, "Mathematics", "en", "My Mathematics Grade 1", { sourcePageUrl: CDC_HOME }),
  entry(2, "English", "en", "My English Grade 2", {
    sourcePageUrl: "http://lib.moecdc.gov.np/catalog/opac_css/index.php?id=12030&lvl=notice_display",
  }),
  entry(3, "Science", "en", "Science Grade 3", { sourcePageUrl: CDC_HOME }),
  entry(4, "Social Studies", "en", "Social Studies Grade 4", { sourcePageUrl: CDC_HOME }),
  entry(5, "Mathematics", "en", "Mathematics Grade 5", { sourcePageUrl: CDC_HOME }),
];

export function listCdcGrades(): number[] {
  return [...new Set(CDC_CATALOG.map((e) => e.grade))].sort((a, b) => a - b);
}

export function listCdcSubjects(grade: number, medium: CdcMedium): string[] {
  return [...new Set(CDC_CATALOG.filter((e) => e.grade === grade && e.medium === medium).map((e) => e.subject))].sort();
}

export function findCdcEntry(grade: number, subject: string, medium: CdcMedium): CdcCatalogEntry | undefined {
  return CDC_CATALOG.find((e) => e.grade === grade && e.subject === subject && e.medium === medium);
}

export const CDC_PORTAL = CDC_HOME;
