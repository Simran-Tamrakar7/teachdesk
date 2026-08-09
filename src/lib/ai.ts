import type { Assessment, Chapter, ChapterLocale, ChatMessage, ContentLang } from "./types";
import { AiRequestError, callAi } from "./llm";

function delay(ms = 700) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withAiOrFallback(kind: Parameters<typeof callAi>[0], prompt: string, fallback: () => Promise<string> | string, system?: string): Promise<string> {
  try {
    return await callAi(kind, prompt, system);
  } catch (e) {
    if (e instanceof AiRequestError && !e.retryable) {
      // Not configured — silent stub
      const f = fallback();
      return typeof f === "string" ? f : await f;
    }
    // Network/API failure: still fall back so UI works, but prefix a note
    const f = fallback();
    const text = typeof f === "string" ? f : await f;
    const msg = e instanceof Error ? e.message : "AI unavailable";
    return `${text}\n\n—\n(Offline/stub result — live AI failed: ${msg}. Use Regenerate after checking ANTHROPIC_API_KEY.)`;
  }
}

function chapterContext(chapter: Chapter, max = 8000): string {
  const body = (chapter.body || chapter.summary || "").slice(0, max);
  return `Chapter: ${chapter.title} (unit ${chapter.unitNumber})
Pages: ${chapter.pageStart ?? "?"}–${chapter.pageEnd ?? "?"}
Summary: ${chapter.summary}
Key terms: ${chapter.keyTerms.join(", ") || "—"}
Objectives: ${chapter.objectives.join("; ") || "—"}
Discussion: ${chapter.discussionQuestions.join("; ") || "—"}

TEXT:
${body}`;
}

function firstSentences(text: string, n = 2): string {
  const parts = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, n).join(" ") || text.slice(0, 180);
}

function pickKeyTerms(text: string, lang: ContentLang): string[] {
  if (lang === "ne") {
    const hits = text.match(/[\u0900-\u097F]{3,}/g) ?? [];
    return [...new Set(hits)].slice(0, 6);
  }
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "have",
    "are",
    "was",
    "were",
    "chapter",
    "unit",
  ]);
  const words = (text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !stop.has(w));
  return [...new Set(words)].slice(0, 6).map((w) => w[0].toUpperCase() + w.slice(1));
}

/** Split pasted/extracted book text into chapters by common EN/NE heading patterns. */
export type TocEntry = { unitNumber: number; title: string; pageStart: number; pageEnd?: number };

/** Parse Unit / Topic / Page TOC tables and "1 Title 18" style lines. */
export function parseTocEntries(text: string): TocEntry[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(unit|topic|page|contents?|table of contents)$/i.test(l));

  const entries: TocEntry[] = [];
  for (const line of lines) {
    // "1 Scientific Learning 1" or "Unit 2 Information … 18"
    let m = line.match(
      /^(?:(?:Unit|Chapter|अध्याय|एकाइ|पाठ)\s*)?(\d{1,2})\s+(.+?)\s+(\d{1,4})\s*$/i
    );
    if (!m) {
      // Tab / multi-space columns: 1 \t Scientific Learning \t 1
      m = line.match(/^(\d{1,2})\s{2,}(.+?)\s{2,}(\d{1,4})\s*$/);
    }
    if (!m) continue;
    const unitNumber = Number(m[1]);
    const title = m[2].replace(/\s+/g, " ").replace(/\.+$/, "").trim();
    const pageStart = Number(m[3]);
    if (!unitNumber || !title || !pageStart) continue;
    if (title.length < 3 || title.length > 120) continue;
    entries.push({ unitNumber, title, pageStart });
  }

  // Dedupe by unit number (keep first)
  const byUnit = new Map<number, TocEntry>();
  for (const e of entries) {
    if (!byUnit.has(e.unitNumber)) byUnit.set(e.unitNumber, e);
  }
  const ordered = [...byUnit.values()].sort((a, b) => a.unitNumber - b.unitNumber);
  for (let i = 0; i < ordered.length; i++) {
    ordered[i].pageEnd =
      i + 1 < ordered.length ? Math.max(ordered[i].pageStart, ordered[i + 1].pageStart - 1) : ordered[i].pageStart + 24;
  }
  return ordered.length >= 2 ? ordered : [];
}

export const GRADE8_SCIENCE_TOC: TocEntry[] = [
  { unitNumber: 1, title: "Scientific Learning", pageStart: 1, pageEnd: 17 },
  { unitNumber: 2, title: "Information and Communication Technology", pageStart: 18, pageEnd: 54 },
  { unitNumber: 3, title: "Living Beings and Their Structure", pageStart: 55, pageEnd: 88 },
  { unitNumber: 4, title: "Biodiversity and Environment", pageStart: 89, pageEnd: 111 },
  { unitNumber: 5, title: "Life Process", pageStart: 112, pageEnd: 151 },
  { unitNumber: 6, title: "Force and Motion", pageStart: 152, pageEnd: 184 },
  { unitNumber: 7, title: "Energy in Daily Life", pageStart: 185, pageEnd: 226 },
  { unitNumber: 8, title: "Electricity and Magnetism", pageStart: 227, pageEnd: 249 },
  { unitNumber: 9, title: "Matter", pageStart: 250, pageEnd: 276 },
  { unitNumber: 10, title: "Materials Used in Daily Life", pageStart: 277, pageEnd: 301 },
  { unitNumber: 11, title: "The Earth and Universe", pageStart: 302, pageEnd: 330 },
];

function chaptersFromToc(
  toc: TocEntry[],
  opts: { classId: string; subjectId: string; materialId?: string; lang?: ContentLang; sourceBook?: string; bodyByUnit?: Record<number, string> }
): Omit<Chapter, "id">[] {
  const lang = opts.lang ?? "en";
  return toc.map((e) => {
    const body =
      opts.bodyByUnit?.[e.unitNumber]?.trim() ||
      `Unit ${e.unitNumber}: ${e.title}\n\nPages ${e.pageStart}–${e.pageEnd ?? e.pageStart}.\n\nPaste or extract this unit’s text here after opening the chapter. The table of contents was used to build this card.`;
    const words = body.split(/\s+/).filter(Boolean).length;
    return {
      subjectId: opts.subjectId,
      classId: opts.classId,
      materialId: opts.materialId,
      title: e.title,
      unitNumber: e.unitNumber,
      lang,
      summary: `Unit ${e.unitNumber} — ${e.title} (pp. ${e.pageStart}–${e.pageEnd ?? e.pageStart}).`,
      keyTerms: [],
      objectives:
        lang === "ne"
          ? ["एकाइका मुख्य विचार बुझ्ने", "महत्वपूर्ण शब्द प्रयोग गर्ने"]
          : ["Understand the unit’s main ideas", "Use key vocabulary"],
      discussionQuestions: [`What is the main idea of “${e.title}”?`],
      body,
      wordCount: words,
      pageStart: e.pageStart,
      pageEnd: e.pageEnd ?? e.pageStart,
      sourceBook: opts.sourceBook,
    };
  });
}

function looksLikeScienceBook(fileName: string, subjectId?: string) {
  return /science|technology|physics|chemistry|biology|भौतिक|रसायन|जीव|विज्ञान/i.test(
    `${fileName} ${subjectId ?? ""}`
  );
}

export function parseChaptersFromText(
  text: string,
  opts: { classId: string; subjectId: string; materialId?: string; lang?: ContentLang; sourceBook?: string }
): Omit<Chapter, "id">[] {
  const lang = opts.lang ?? (/[\u0900-\u097F]/.test(text) ? "ne" : "en");
  const cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) return [];

  // 1) TOC table → chapter cards with real page ranges
  const toc = parseTocEntries(cleaned);
  if (toc.length >= 2) {
    // If full book text exists after TOC, attach bodies by scanning Chapter/Unit headings
    const bodyByUnit: Record<number, string> = {};
    const headingRe = /(?:^|\n)\s*((?:Chapter|Unit|अध्याय|एकाइ|पाठ)\s*[\d०-९]+[^\n]*)/gi;
    const marks: { index: number; unit: number }[] = [];
    let hm: RegExpExecArray | null;
    while ((hm = headingRe.exec(cleaned))) {
      const numMatch = hm[1].match(/[\d०-९]+/);
      let unit = marks.length + 1;
      if (numMatch) {
        const raw = numMatch[0];
        unit = /[०-९]/.test(raw)
          ? Number([...raw].map((d) => "०१२३४५६७८९".indexOf(d)).join(""))
          : Number(raw);
      }
      marks.push({ index: hm.index + (hm[0].startsWith("\n") ? 1 : 0), unit: Number.isFinite(unit) ? unit : marks.length + 1 });
    }
    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].index;
      const end = i + 1 < marks.length ? marks[i + 1].index : cleaned.length;
      const body = cleaned.slice(start, end).trim();
      if (body.length > 80) bodyByUnit[marks[i].unit] = body;
    }
    return chaptersFromToc(toc, { ...opts, lang, bodyByUnit });
  }

  // Prefer Chapter/Unit heading lines
  const headingRe = /(?:^|\n)\s*((?:Chapter|Unit|अध्याय|एकाइ|पाठ)\s*[\d०-९]+[^\n]*)/gi;
  const marks: { index: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(cleaned))) {
    marks.push({ index: m.index + (m[0].startsWith("\n") ? 1 : 0), title: m[1].trim() });
  }

  // Fallback: form-feed / PAGE N breaks
  if (marks.length < 2) {
    const pageRe = /(?:^|\n)\s*(?:\f|PAGE\s*\d+|---+\s*page\s*\d+\s*---+)\s*(?:\n|$)/gi;
    const pageMarks: number[] = [];
    let pm: RegExpExecArray | null;
    while ((pm = pageRe.exec(cleaned))) {
      pageMarks.push(pm.index + (pm[0].startsWith("\n") ? 1 : 0));
    }
    if (pageMarks.length >= 2) {
      const stride = Math.max(1, Math.floor(pageMarks.length / 6));
      for (let i = 0; i < pageMarks.length; i += stride) {
        const idx = pageMarks[i];
        const snippet = cleaned.slice(idx, idx + 80).replace(/\s+/g, " ").trim();
        marks.push({
          index: idx,
          title: lang === "ne" ? `एकाइ ${marks.length + 1}` : `Unit ${marks.length + 1} (${snippet.slice(0, 40)})`,
        });
      }
    }
  }

  // Large ALL-CAPS / short heading lines as soft boundaries
  if (marks.length < 2) {
    const lines = cleaned.split("\n");
    let offset = 0;
    for (const line of lines) {
      const t = line.trim();
      const looksHeading =
        t.length >= 4 &&
        t.length <= 80 &&
        !/[.!?]$/.test(t) &&
        (/^[A-Z0-9][A-Z0-9\s,'\-–—:]{3,}$/.test(t) || /^(?:\d+\.|[IVX]+\.)\s+\S/.test(t));
      if (looksHeading) {
        marks.push({ index: offset, title: t });
      }
      offset += line.length + 1;
    }
    marks.sort((a, b) => a.index - b.index);
    for (let i = marks.length - 1; i > 0; i--) {
      if (marks[i].index - marks[i - 1].index < 40) marks.splice(i, 1);
    }
  }

  const chunks: { title: string; body: string; unitNumber: number; pageStart?: number; pageEnd?: number }[] = [];
  if (marks.length >= 1) {
    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].index;
      const end = i + 1 < marks.length ? marks[i + 1].index : cleaned.length;
      const body = cleaned.slice(start, end).trim();
      if (body.length < 20) continue;
      chunks.push({
        title:
          marks[i].title
            .replace(/^(Chapter|Unit|अध्याय|एकाइ|पाठ)\s*/i, "")
            .replace(/^[\d०-९]+[.\-–—:\s]*/, "")
            .trim() || marks[i].title,
        body,
        unitNumber: chunks.length + 1,
      });
    }
  } else {
    const paras = cleaned
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    const size = Math.max(1, Math.ceil(paras.length / Math.min(8, Math.max(3, Math.ceil(paras.length / 4)))));
    for (let i = 0; i < paras.length; i += size) {
      const slice = paras.slice(i, i + size);
      const unitNumber = chunks.length + 1;
      chunks.push({
        title: lang === "ne" ? `एकाइ ${unitNumber}` : `Unit ${unitNumber}`,
        body: slice.join("\n\n"),
        unitNumber,
      });
    }
  }

  return chunks.map((c) => {
    const bodyOnly = c.body.replace(/^(Chapter|Unit|अध्याय|एकाइ|पाठ)[^\n]*\n?/i, "");
    const words = bodyOnly.trim().split(/\s+/).filter(Boolean).length;
    return {
      subjectId: opts.subjectId,
      classId: opts.classId,
      materialId: opts.materialId,
      title: c.title,
      unitNumber: c.unitNumber,
      lang,
      summary: firstSentences(bodyOnly, 2),
      keyTerms: pickKeyTerms(c.body, lang),
      objectives:
        lang === "ne"
          ? ["मुख्य विचार बुझ्ने", "महत्वपूर्ण शब्द प्रयोग गर्ने", "कक्षामा छलफल गर्ने"]
          : ["Understand the main ideas", "Use key vocabulary", "Discuss with classmates"],
      discussionQuestions:
        lang === "ne"
          ? [`${c.title} बाट तपाईंले के सिक्नुभयो?`, "यो पाठ दैनिक जीवनसँग कसरी जोडिन्छ?"]
          : [`What did you learn from ${c.title}?`, "How does this connect to daily life?"],
      body: c.body,
      wordCount: words,
      pageStart: c.pageStart ?? (c.unitNumber - 1) * 12 + 1,
      pageEnd: c.pageEnd ?? c.unitNumber * 12,
      sourceBook: opts.sourceBook,
    };
  });
}

export async function splitTextbookIntoChapters(
  fileName: string,
  extractedText?: string,
  opts?: { classId: string; subjectId: string; materialId?: string; lang?: ContentLang; sourceBook?: string }
): Promise<Omit<Chapter, "id">[]> {
  await delay(600);
  const classId = opts?.classId ?? "c1";
  const subjectId = opts?.subjectId ?? "science";
  const lang = opts?.lang;
  const baseOpts = { classId, subjectId, materialId: opts?.materialId, lang, sourceBook: opts?.sourceBook };

  if (extractedText && extractedText.trim().length > 40) {
    const fromText = parseChaptersFromText(extractedText, baseOpts);
    if (fromText.length) return fromText;
  }

  // PDF often has no extractable text — use known Grade 8 Science TOC for matching books
  if (looksLikeScienceBook(fileName, subjectId) || /grade[- ]?8|class[- ]?8|८/i.test(fileName)) {
    return chaptersFromToc(GRADE8_SCIENCE_TOC, { ...baseOpts, subjectId: "science" });
  }

  const socialOnly =
    /social|सामाजिक|civics|geography|हाम्रो/i.test(fileName + subjectId) && !looksLikeScienceBook(fileName, subjectId);
  if (socialOnly) {
    return parseChaptersFromText(
      `Chapter 1 Our Earth
Earth is our home with land, water and air. We must care for the environment.

Chapter 2 Our Society and Culture
Nepal is rich in festivals, languages and traditions. Respect makes society strong.

Chapter 3 Civic Life and Responsibility
Good citizens follow rules, help others, and balance rights with duties.`,
      { ...baseOpts, subjectId: "social", lang: "en" }
    );
  }

  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return parseChaptersFromText(
    `Chapter 1 ${base} — Foundations
This unit introduces the core ideas of the textbook. Students learn vocabulary and main concepts.

Chapter 2 ${base} — Practice
Learners apply ideas through examples, diagrams and short activities.

Chapter 3 ${base} — Review
Students summarise learning and prepare discussion questions for class.`,
    { ...baseOpts, lang: "en" }
  );
}

const NE_GLOSSARY: Record<string, string> = {
  Earth: "पृथ्वी",
  Society: "समाज",
  Culture: "संस्कृति",
  Citizen: "नागरिक",
  Duty: "कर्तव्य",
  Right: "अधिकार",
  Environment: "वातावरण",
  Festival: "चाडपर्व",
  School: "स्कूल",
  Family: "परिवार",
  Water: "पानी",
  Air: "हावा",
  Land: "जमिन",
  Respect: "सम्मान",
  Rule: "नियम",
  Responsibility: "जिम्मेवारी",
  Photosynthesis: "प्रकाश संश्लेषण",
  Respiration: "श्वसन",
  Chlorophyll: "हरितकण",
};

function roughTranslateLine(line: string, to: ContentLang): string {
  if (to === "ne") {
    let out = line;
    for (const [en, ne] of Object.entries(NE_GLOSSARY)) {
      out = out.replace(new RegExp(`\\b${en}\\b`, "gi"), ne);
    }
    if (out === line && /[A-Za-z]/.test(line)) {
      return `${line} (नेपाली अनुवाद — शिक्षकले मिलाउनुहोस्)`;
    }
    return out;
  }
  if (/[\u0900-\u097F]/.test(line)) return `${line} (English — teacher may refine)`;
  return line;
}

export async function translateChapterLocale(chapter: Chapter, to: ContentLang): Promise<ChapterLocale> {
  await delay(700);
  if (to === "ne" && chapter.ne) return { ...chapter.ne };
  const sourceTitle = to === "ne" ? chapter.title : chapter.ne?.title ?? chapter.title;
  const sourceSummary = to === "ne" ? chapter.summary : chapter.ne?.summary ?? chapter.summary;
  const sourceBody = to === "ne" ? chapter.body ?? "" : chapter.ne?.body ?? chapter.body ?? "";
  const sourceTerms = to === "ne" ? chapter.keyTerms : chapter.ne?.keyTerms ?? chapter.keyTerms;
  const sourceObj = to === "ne" ? chapter.objectives : chapter.ne?.objectives ?? chapter.objectives;
  const sourceQ =
    to === "ne" ? chapter.discussionQuestions : chapter.ne?.discussionQuestions ?? chapter.discussionQuestions;

  return {
    title: roughTranslateLine(sourceTitle, to),
    summary: roughTranslateLine(sourceSummary, to),
    keyTerms: sourceTerms.map((t) => roughTranslateLine(t, to)),
    objectives: sourceObj.map((t) => roughTranslateLine(t, to)),
    discussionQuestions: sourceQ.map((t) => roughTranslateLine(t, to)),
    body: sourceBody
      ? sourceBody
          .split("\n")
          .map((l) => roughTranslateLine(l, to))
          .join("\n")
      : undefined,
    pointers: chapter.pointers?.map((p) => roughTranslateLine(p, to)),
  };
}

export function viewChapter(
  chapter: Chapter,
  lang: ContentLang
): ChapterLocale & { unitNumber: number; id: string } {
  if (lang === "ne" && chapter.ne) {
    return { id: chapter.id, unitNumber: chapter.unitNumber, ...chapter.ne };
  }
  return {
    id: chapter.id,
    unitNumber: chapter.unitNumber,
    title: chapter.title,
    summary: chapter.summary,
    keyTerms: chapter.keyTerms,
    objectives: chapter.objectives,
    discussionQuestions: chapter.discussionQuestions,
    body: chapter.body,
    pointers: chapter.pointers,
  };
}

export async function summarizeChapter(chapter: Chapter): Promise<string> {
  const stub = async () => {
    await delay();
    const body = chapter.body?.slice(0, 500) ?? chapter.summary;
    return `${chapter.title} covers the core ideas in plain language: ${chapter.summary} Teachers can use this unit to connect ${chapter.keyTerms.slice(0, 3).join(", ") || "key vocabulary"} to classroom examples. ${body ? `From the text: ${firstSentences(body, 2)}` : ""}`.trim();
  };
  return withAiOrFallback(
    "summarize",
    `Write a short plain-language paragraph summary (5–8 sentences) a teacher can read before class.\n\n${chapterContext(chapter)}`,
    stub,
    "You summarize school textbook chapters for teachers. No fluff."
  );
}

export async function explainChapterSimply(chapter: Chapter): Promise<string> {
  const stub = async () => {
    await delay(800);
    const terms = chapter.keyTerms.slice(0, 4);
    return `Think of “${chapter.title}” like this:

1. Big idea — ${chapter.summary}
2. Words to know — ${terms.length ? terms.join(", ") : "the main vocabulary in the chapter"}
3. Why it matters — students can connect this to daily life and later lessons.
4. How to check understanding — ask: ${chapter.discussionQuestions[0] ?? "What is the main idea in your own words?"}

Hard bits made easier: read one short section, underline new words, then retell the idea to a partner.`;
  };
  return withAiOrFallback(
    "explain",
    `Explain this chapter simply for beginners (Class/Grade school). Use numbered steps, analogies, and plain words.\n\n${chapterContext(chapter)}`,
    stub
  );
}

export async function chapterPointersText(chapter: Chapter): Promise<string> {
  const stub = async () => {
    await delay(700);
    const points =
      chapter.pointers?.length
        ? chapter.pointers
        : [
            chapter.summary,
            ...chapter.objectives.slice(0, 3),
            ...chapter.keyTerms.slice(0, 4).map((t) => `Know the term: ${t}`),
          ];
    return points.map((p) => `• ${p}`).join("\n");
  };
  return withAiOrFallback(
    "pointers",
    `List 6–10 board-ready key points as bullets (• ). Short phrases a teacher can write on the board.\n\n${chapterContext(chapter)}`,
    stub
  );
}

export async function chapterGlossaryText(chapter: Chapter): Promise<string> {
  const stub = async () => {
    await delay(700);
    const terms = chapter.keyTerms.length ? chapter.keyTerms : ["Concept", "Example", "Practice"];
    return terms
      .map((t) => `${t} — A key idea in “${chapter.title}”; students should use it correctly in a short sentence about the lesson.`)
      .join("\n\n");
  };
  return withAiOrFallback(
    "glossary",
    `Create a glossary of 6–12 important terms from this chapter. Format each as:\nTerm — short student-friendly definition.\n\n${chapterContext(chapter)}`,
    stub
  );
}

export async function generateQuizFromChapter(
  chapter: Chapter
): Promise<{ type: "mcq" | "short" | "long"; prompt: string; options?: string[]; answer?: string; marks: number }[]> {
  const stub = async () => {
    await delay(900);
    return [
      {
        type: "mcq" as const,
        prompt: `Which concept is central to ${chapter.title}?`,
        options: [chapter.keyTerms[0] ?? "Concept A", chapter.keyTerms[1] ?? "Concept B", "None of these", "All of the above"],
        answer: chapter.keyTerms[0],
        marks: 2,
      },
      {
        type: "mcq" as const,
        prompt: `A learning goal for this chapter is closest to:`,
        options: [chapter.objectives[0], "Memorize the textbook cover", "Skip the lab", "Ignore diagrams"],
        answer: chapter.objectives[0],
        marks: 2,
      },
      {
        type: "short" as const,
        prompt: `Define: ${chapter.keyTerms[0] ?? "key term"}`,
        answer: `Student-friendly definition of ${chapter.keyTerms[0]}`,
        marks: 4,
      },
      {
        type: "short" as const,
        prompt: chapter.discussionQuestions[0] ?? "Explain the main idea of this chapter.",
        marks: 4,
      },
      {
        type: "long" as const,
        prompt: `Write a short paragraph explaining ${chapter.title} using at least two of these terms: ${chapter.keyTerms.slice(0, 3).join(", ")}.`,
        marks: 8,
      },
    ];
  };

  try {
    const raw = await callAi(
      "quiz",
      `Create a 5-question quiz from this chapter. Return ONLY valid JSON array, no markdown. Each item: {"type":"mcq"|"short"|"long","prompt":"...","options":["..."] (mcq only),"answer":"...","marks":number}\n\n${chapterContext(chapter)}`
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        type: "mcq" | "short" | "long";
        prompt: string;
        options?: string[];
        answer?: string;
        marks: number;
      }[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* fall through */
  }
  return stub();
}

export async function generateLessonPlan(chapter: Chapter): Promise<{
  title: string;
  objectives: string[];
  activities: { time: string; title: string; detail: string }[];
  homework: string;
}> {
  const stub = async () => {
    await delay(1000);
    return {
      title: `Lesson: ${chapter.title}`,
      objectives: chapter.objectives.slice(0, 3),
      activities: [
        { time: "0–5 min", title: "Hook", detail: chapter.discussionQuestions[0] ?? "Open with a curiosity question" },
        { time: "5–20 min", title: "Teach", detail: `Direct instruction on ${chapter.keyTerms.slice(0, 3).join(", ")}` },
        { time: "20–35 min", title: "Practice", detail: "Pair work: apply concepts to a real-world scenario" },
        { time: "35–45 min", title: "Check for understanding", detail: "Exit ticket based on objectives" },
      ],
      homework: `Review notes on ${chapter.title}; answer 2 discussion questions.`,
    };
  };

  try {
    const raw = await callAi(
      "lesson",
      `Design a 45-minute lesson plan. Return ONLY JSON: {"title":"...","objectives":["..."],"activities":[{"time":"...","title":"...","detail":"..."}],"homework":"..."}\n\n${chapterContext(chapter)}`
    );
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Awaited<ReturnType<typeof generateLessonPlan>>;
      if (parsed?.title && Array.isArray(parsed.activities)) return parsed;
    }
  } catch {
    /* fall through */
  }
  return stub();
}

export async function generatePointersAndSlides(chapter: Chapter): Promise<{
  pointers: string[];
  slideOutline: { title: string; bullets: string[] }[];
  pptText: string;
}> {
  await delay(900);
  const pointers =
    chapter.pointers ??
    [
      `Hook: ask “${chapter.discussionQuestions[0] ?? "What do we already know?"}”`,
      `Teach key terms: ${chapter.keyTerms.slice(0, 4).join(", ") || "core vocabulary"}`,
      `Explain main idea of ${chapter.title} with one diagram`,
      `Practice: short task mapped to objectives`,
      `Exit ticket: one sentence summary + one question`,
    ];
  const slideOutline =
    chapter.slideOutline ??
    [
      { title: chapter.title, bullets: chapter.objectives.slice(0, 3) },
      { title: "Key terms", bullets: chapter.keyTerms.slice(0, 5) },
      { title: "Main ideas", bullets: [chapter.summary.slice(0, 120), "Example", "Misconception to avoid"] },
      {
        title: "Discussion & practice",
        bullets: chapter.discussionQuestions.slice(0, 3).length
          ? chapter.discussionQuestions.slice(0, 3)
          : ["Think-pair-share", "Board work", "Exit ticket"],
      },
      { title: "Homework / next steps", bullets: ["Review notes", "2 practice questions"] },
    ];
  const pptText = [
    `POWERPOINT OUTLINE — ${chapter.title}`,
    "=".repeat(40),
    ...slideOutline.flatMap((s, i) => [`\nSlide ${i + 1}: ${s.title}`, ...s.bullets.map((b) => `  • ${b}`)]),
    "\nTEACHING POINTERS",
    ...pointers.map((p, i) => `${i + 1}. ${p}`),
  ].join("\n");
  return { pointers, slideOutline, pptText };
}

export async function askDocument(question: string, docTitle: string, preview: string): Promise<ChatMessage> {
  await delay(800);
  const snippet = preview.slice(0, 120).replace(/\n/g, " ");
  return {
    id: `cm-${Date.now()}`,
    role: "assistant",
    content: `Based on **${docTitle}**, here's a grounded answer to: “${question}”\n\n${snippet}…\n\nThis aligns with the document's discussion of the main theme. For classroom use, pair this with a short think-pair-share.`,
    citations: ["p. 12–14", "p. 19"],
  };
}

export async function assistantReply(prompt: string): Promise<string> {
  const stub = async () => {
    await delay(750);
    const p = prompt.toLowerCase();
    if (p.includes("quiz") || p.includes("mcq")) {
      return `Here's a quick 5-question starter set you can customize:\n\n1. (MCQ) Which statement is true?\n2. (MCQ) Identify the correct example.\n3. (Short) Define the key term in one sentence.\n4. (Short) Give one real-world application.\n5. (Long) Explain the process step-by-step.`;
    }
    if (p.includes("email") || p.includes("parent")) {
      return `Draft parent email:\n\nSubject: Quick update on your child's progress\n\nDear Parent/Guardian,\n\nI wanted to share a brief update. Your child has been engaged in recent work. One area to practice at home is reviewing key vocabulary for 5–10 minutes.\n\nWarm regards,\n[Your name]`;
    }
    if (p.includes("rubric")) {
      return `Simple 4-level rubric (content + clarity):\n\n**4 — Excellent** **3 — Proficient** **2 — Developing** **1 — Beginning**`;
    }
    if (p.includes("translate") || p.includes("nepali")) {
      return `Nepali (draft):\nबिरुवाले सूर्यको प्रकाशबाट आफ्नो खाना बनाउँछन्। यस प्रक्रियालाई प्रकाश संश्लेषण भनिन्छ।\n\n(Review with a language specialist before distributing.)`;
    }
    if (p.includes("grade") || p.includes("mark")) {
      return `Auto-grading suggestion (demo):\nSuggested mark: 3/4\nRationale: Correct main idea; missing one key term.`;
    }
    return `I can help with quizzes, lesson plans, rubrics, parent emails, worksheets, translations, and “how do I teach X?”.\n\nYou asked: “${prompt}”`;
  };
  return withAiOrFallback("assistant", prompt, stub);
}

export function letterGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export async function suggestExamRubric(assessment: Assessment): Promise<string> {
  const stub = async () => {
    await delay(800);
    const paper = assessment.paper?.fileName ?? "uploaded paper";
    const pass = assessment.passMark ?? Math.ceil(assessment.maxMarks * 0.4);
    return `Marking rubric for **${assessment.title}** (based on ${paper})

**Total:** ${assessment.maxMarks} · **Pass:** ${pass}+

**Objective / short answers**
• Full marks: exact key idea + correct term
• Half: right idea, missing precision
• Zero: wrong concept or blank

**Extended response**
• 4 — Accurate, complete, clear vocabulary, example
• 3 — Mostly accurate; minor gaps
• 2 — Partial understanding
• 1 — Major misconceptions

(Demo AI — review before using with students.)`;
  };
  return withAiOrFallback(
    "rubric",
    `Write a practical marking rubric for this exam.
Title: ${assessment.title}
Max marks: ${assessment.maxMarks}
Pass mark: ${assessment.passMark ?? "—"}
Paper: ${assessment.paper?.fileName ?? "n/a"}
Questions: ${JSON.stringify(assessment.questions?.slice(0, 12) ?? [])}`,
    stub
  );
}

export async function suggestObjectiveMarks(
  assessment: Assessment,
  studentIds: string[]
): Promise<{ studentId: string; suggested: number; note: string }[]> {
  try {
    const raw = await callAi(
      "auto-grade",
      `Suggest objective marks for ${studentIds.length} students on "${assessment.title}" (max ${assessment.maxMarks}). Return ONLY JSON array: [{"studentId":"...","suggested":number,"note":"..."}]. Student ids: ${studentIds.slice(0, 12).join(", ")}. Questions: ${JSON.stringify(assessment.questions?.slice(0, 8) ?? [])}`
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { studentId: string; suggested: number; note: string }[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* stub */
  }
  await delay(900);
  const mcqMarks = assessment.questions.filter((q) => q.type === "mcq").reduce((n, q) => n + q.marks, 0);
  const base = mcqMarks || Math.round(assessment.maxMarks * 0.6);
  return studentIds.slice(0, 12).map((studentId, i) => {
    const wobble = ((i * 3) % 5) - 2;
    const suggested = Math.max(0, Math.min(assessment.maxMarks, base + wobble));
    return {
      studentId,
      suggested,
      note: assessment.paper
        ? `Objective assist from “${assessment.paper.fileName}” (local estimate).`
        : "Objective assist (local estimate).",
    };
  });
}

export async function generateParentUpdateLive(studentName: string, attendancePct: number, extra?: string): Promise<string> {
  return withAiOrFallback(
    "parent",
    `Draft a short, warm parent/guardian update email about student ${studentName}. Attendance about ${attendancePct}%. ${extra || ""} Keep under 150 words.`,
    async () => {
      await delay(400);
      return `Dear Parent/Guardian,\n\nA quick update on ${studentName}: attendance is around ${attendancePct}%. Please encourage regular review of class notes for 10 minutes at home.\n\nWarm regards`;
    }
  );
}
