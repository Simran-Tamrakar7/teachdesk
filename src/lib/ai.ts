import type { Chapter, ChatMessage } from "./types";

function delay(ms = 700) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function summarizeChapter(chapter: Chapter): Promise<string> {
  await delay();
  return `**${chapter.title}** — ${chapter.summary}\n\n**Key terms:** ${chapter.keyTerms.join(", ")}\n\n**Objectives:**\n${chapter.objectives.map((o) => `• ${o}`).join("\n")}`;
}

export async function generateQuizFromChapter(chapter: Chapter): Promise<
  { type: "mcq" | "short" | "long"; prompt: string; options?: string[]; answer?: string; marks: number }[]
> {
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

export async function splitTextbookIntoChapters(fileName: string): Promise<Chapter[]> {
  await delay(1400);
  const base = fileName.replace(/\.[^.]+$/, "");
  return [
    {
      id: `gen-ch-1`,
      subjectId: "science",
      classId: "c1",
      title: `${base} — Chapter 1 (detected)`,
      unitNumber: 1,
      summary: "AI detected this chapter from the table of contents / heading hierarchy.",
      keyTerms: ["Term A", "Term B", "Term C"],
      objectives: ["Understand core ideas", "Apply concepts", "Use key vocabulary"],
      discussionQuestions: ["What surprised you in this chapter?", "How would you teach this to a peer?"],
      pageStart: 1,
      pageEnd: 24,
    },
    {
      id: `gen-ch-2`,
      subjectId: "science",
      classId: "c1",
      title: `${base} — Chapter 2 (detected)`,
      unitNumber: 2,
      summary: "Second unit auto-split using heading markers and page breaks.",
      keyTerms: ["Term D", "Term E"],
      objectives: ["Connect to prior knowledge", "Practice problem-solving"],
      discussionQuestions: ["Where does this appear in daily life?"],
      pageStart: 25,
      pageEnd: 48,
    },
  ];
}

export async function askDocument(
  question: string,
  docTitle: string,
  preview: string
): Promise<ChatMessage> {
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
    return `Here's a quick 5-question starter set you can customize:\n\n1. (MCQ) Which statement is true?\n2. (MCQ) Identify the correct example.\n3. (Short) Define the key term in one sentence.\n4. (Short) Give one real-world application.\n5. (Long) Explain the process step-by-step.\n\nTip: Align each question to a learning objective before printing.`;
  }
  if (p.includes("email") || p.includes("parent")) {
    return `Draft parent email:\n\nSubject: Quick update on your child's progress\n\nDear Parent/Guardian,\n\nI wanted to share a brief update from Science class. Your child has been engaged in our current unit and completed recent work thoughtfully. One area to practice at home is reviewing key vocabulary for 5–10 minutes.\n\nPlease feel free to reply with any questions.\n\nWarm regards,\n[Your name]`;
  }
  if (p.includes("rubric")) {
    return `Simple 4-level rubric (content + clarity):\n\n**4 — Excellent:** Accurate, complete, clear vocabulary, strong examples.\n**3 — Proficient:** Mostly accurate; minor gaps; understandable.\n**2 — Developing:** Partial understanding; limited detail.\n**1 — Beginning:** Major misconceptions; incomplete.\n\nUse for short answers; add a “evidence” column for labs.`;
  }
  if (p.includes("rewrite") || p.includes("reading level") || p.includes("simplify")) {
    return `Simplified version (approx. Grade 6 reading level):\n\nPlants make their own food using sunlight. They take in water and carbon dioxide. Inside the leaf, a green part called chlorophyll helps turn these into sugar and oxygen. Animals need that oxygen to breathe.\n\nWant a Grade 9 version or a bilingual version next?`;
  }
  if (p.includes("translate") || p.includes("nepali") || p.includes("हिन्दी") || p.includes("hindi")) {
    return `Nepali (draft):\nबिरुवाले सूर्यको प्रकाशबाट आफ्नो खाना बनाउँछन्। यस प्रक्रियालाई प्रकाश संश्लेषण भनिन्छ।\n\nHindi (draft):\nपौधे सूर्य के प्रकाश से अपना भोजन बनाते हैं। इस प्रक्रिया को प्रकाश संश्लेषण कहते हैं।\n\n(Review with a language specialist before distributing.)`;
  }
  if (p.includes("teach") || p.includes("how do i")) {
    return `How to teach this concept (15–45 min):\n\n1. **Hook** with a phenomenon students can see.\n2. **Elicit prior knowledge** — 2 sticky notes per pair.\n3. **Model** with a diagram + think-aloud.\n4. **Guided practice** in pairs.\n5. **Check** with an exit ticket linked to one objective.\n\nCommon misconception to watch for: confusing related everyday words with scientific meanings.`;
  }
  if (p.includes("worksheet")) {
    return `Worksheet outline:\n\nA. Warm-up (2 recall questions)\nB. Label the diagram\nC. Fill-in equation / key terms\nD. Short application scenario\nE. Reflection: “One thing I’m still unsure about…”\n\nI can expand any section into full questions if you name the chapter.`;
  }
  if (p.includes("plagiarism") || p.includes("originality")) {
    return `Originality check (demo):\n• Similarity estimate: ~18% (mostly common definitions)\n• Flagged: one paragraph closely matches a textbook glossary phrasing\n• Suggestion: ask student to rewrite in their own words with a personal example\n\nTeacher approval required before any academic consequence.`;
  }
  if (p.includes("grade") || p.includes("mark")) {
    return `Auto-grading suggestion (demo):\nSuggested mark: 3/4\nRationale: Correct main idea; missing one key term; clear sentence structure.\n\nApprove, edit, or reject before saving to the gradebook.`;
  }

  return `I can help with quizzes, lesson plans, rubrics, parent emails, worksheets, translations, reading-level rewrites, and “how do I teach X?” questions.\n\nYou asked: “${prompt}”\n\nTry being specific — e.g. “Generate a Grade 8 quiz on photosynthesis with 3 MCQs and 2 short answers.”`;
}

export function letterGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}
