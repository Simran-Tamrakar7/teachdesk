import type { Assessment, Chapter, ChapterLocale, ChatMessage, ContentLang } from "./types";

function delay(ms = 700) {
  return new Promise((r) => setTimeout(r, ms));
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
export function parseChaptersFromText(
  text: string,
  opts: { classId: string; subjectId: string; materialId?: string; lang?: ContentLang; sourceBook?: string }
): Omit<Chapter, "id">[] {
  const lang = opts.lang ?? (/[\u0900-\u097F]/.test(text) ? "ne" : "en");
  let cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) return [];

  // Prefer Chapter/Unit heading lines (also covers TOC-style entries)
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
    // Deduplicate near-duplicate marks
    marks.sort((a, b) => a.index - b.index);
    for (let i = marks.length - 1; i > 0; i--) {
      if (marks[i].index - marks[i - 1].index < 40) marks.splice(i, 1);
    }
  }

  const chunks: { title: string; body: string; unitNumber: number }[] = [];
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
    // Best-guess: split into ~equal paragraph groups
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
      pageStart: (c.unitNumber - 1) * 12 + 1,
      pageEnd: c.unitNumber * 12,
      sourceBook: opts.sourceBook,
    };
  });
}

export async function splitTextbookIntoChapters(
  fileName: string,
  extractedText?: string,
  opts?: { classId: string; subjectId: string; materialId?: string; lang?: ContentLang }
): Promise<Omit<Chapter, "id">[]> {
  await delay(900);
  if (extractedText && extractedText.trim().length > 80) {
    return parseChaptersFromText(extractedText, {
      classId: opts?.classId ?? "c1",
      subjectId: opts?.subjectId ?? "science",
      materialId: opts?.materialId,
      lang: opts?.lang,
    });
  }

  const social = /social|सामाजिक|civics|geography|हाम्रो/i.test(fileName + (opts?.subjectId ?? ""));
  if (social || opts?.subjectId === "social") {
    return parseChaptersFromText(
      `Chapter 1 Our Earth
Earth is our home with land, water and air. We must care for the environment.

Chapter 2 Our Society and Culture
Nepal is rich in festivals, languages and traditions. Respect makes society strong.

Chapter 3 Civic Life and Responsibility
Good citizens follow rules, help others, and balance rights with duties.`,
      {
        classId: opts?.classId ?? "c6",
        subjectId: "social",
        materialId: opts?.materialId,
        lang: "en",
      }
    );
  }

  const base = fileName.replace(/\.[^.]+$/, "");
  return parseChaptersFromText(
    `Chapter 1 ${base} — Foundations
This unit introduces the core ideas of the textbook. Students learn vocabulary and main concepts.

Chapter 2 ${base} — Practice
Learners apply ideas through examples, diagrams and short activities.

Chapter 3 ${base} — Review
Students summarise learning and prepare discussion questions for class.`,
    {
      classId: opts?.classId ?? "c1",
      subjectId: opts?.subjectId ?? "science",
      materialId: opts?.materialId,
      lang: "en",
    }
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
  await delay();
  const body = chapter.body?.slice(0, 500) ?? chapter.summary;
  return `${chapter.title} covers the core ideas in plain language: ${chapter.summary} Teachers can use this unit to connect ${chapter.keyTerms.slice(0, 3).join(", ") || "key vocabulary"} to classroom examples. ${body ? `From the text: ${firstSentences(body, 2)}` : ""}`.trim();
}

export async function explainChapterSimply(chapter: Chapter): Promise<string> {
  await delay(800);
  const terms = chapter.keyTerms.slice(0, 4);
  return `Think of “${chapter.title}” like this:

1. Big idea — ${chapter.summary}
2. Words to know — ${terms.length ? terms.join(", ") : "the main vocabulary in the chapter"}
3. Why it matters — students can connect this to daily life and later lessons.
4. How to check understanding — ask: ${chapter.discussionQuestions[0] ?? "What is the main idea in your own words?"}

Hard bits made easier: read one short section, underline new words, then retell the idea to a partner.`;
}

export async function chapterPointersText(chapter: Chapter): Promise<string> {
  await delay(700);
  const points =
    chapter.pointers?.length
      ? chapter.pointers
      : [
          chapter.summary,
          ...chapter.objectives.slice(0, 3),
          ...(chapter.keyTerms.slice(0, 4).map((t) => `Know the term: ${t}`)),
        ];
  return points.map((p, i) => `• ${p}`).join("\n");
}

export async function chapterGlossaryText(chapter: Chapter): Promise<string> {
  await delay(700);
  const terms = chapter.keyTerms.length ? chapter.keyTerms : ["Concept", "Example", "Practice"];
  return terms
    .map((t) => `${t} — A key idea in “${chapter.title}”; students should use it correctly in a short sentence about the lesson.`)
    .join("\n\n");
}

export async function generateQuizFromChapter(
  chapter: Chapter
): Promise<{ type: "mcq" | "short" | "long"; prompt: string; options?: string[]; answer?: string; marks: number }[]> {
  await delay(900);
  return [
    {
      type: "mcq",
      prompt: `Which concept is central to ${chapter.title}?`,
      options: [chapter.keyTerms[0] ?? "Concept A", chapter.keyTerms[1] ?? "Concept B", "None of these", "All of the above"],
      answer: chapter.keyTerms[0],
      marks: 2,
    },
    {
      type: "mcq",
      prompt: `A learning goal for this chapter is closest to:`,
      options: [chapter.objectives[0], "Memorize the textbook cover", "Skip the lab", "Ignore diagrams"],
      answer: chapter.objectives[0],
      marks: 2,
    },
    {
      type: "short",
      prompt: `Define: ${chapter.keyTerms[0] ?? "key term"}`,
      answer: `Student-friendly definition of ${chapter.keyTerms[0]}`,
      marks: 4,
    },
    {
      type: "short",
      prompt: chapter.discussionQuestions[0] ?? "Explain the main idea of this chapter.",
      marks: 4,
    },
    {
      type: "long",
      prompt: `Write a short paragraph explaining ${chapter.title} using at least two of these terms: ${chapter.keyTerms.slice(0, 3).join(", ")}.`,
      marks: 8,
    },
  ];
}

export async function generateLessonPlan(chapter: Chapter): Promise<{
  title: string;
  objectives: string[];
  activities: { time: string; title: string; detail: string }[];
  homework: string;
}> {
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
}

export async function suggestObjectiveMarks(
  assessment: Assessment,
  studentIds: string[]
): Promise<{ studentId: string; suggested: number; note: string }[]> {
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
        ? `Objective assist from “${assessment.paper.fileName}” (demo).`
        : "Objective assist (demo).",
    };
  });
}
