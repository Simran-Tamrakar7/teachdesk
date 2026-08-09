"use client";

import { PageHeader } from "@/components/PageHeader";
import {
  chapterGlossaryText,
  chapterPointersText,
  explainChapterSimply,
  generateLessonPlan,
  generateQuizFromChapter,
  summarizeChapter,
} from "@/lib/ai";
import { exportTextPdf } from "@/lib/exports";
import { useAppStore } from "@/lib/store";
import { downloadText, uid } from "@/lib/utils";
import { ArrowLeft, Copy, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ToolKey = "summarize" | "explain" | "pointers" | "glossary";

export default function ChapterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const chapters = useAppStore((s) => s.chapters);
  const materials = useAppStore((s) => s.materials);
  const classes = useAppStore((s) => s.classes);
  const updateChapter = useAppStore((s) => s.updateChapter);
  const addAssessment = useAppStore((s) => s.addAssessment);
  const addLessonPlan = useAppStore((s) => s.addLessonPlan);
  const chapter = chapters.find((c) => c.id === id && !c.deletedAt);
  const [busy, setBusy] = useState<ToolKey | "quiz" | "lesson" | null>(null);
  const [msg, setMsg] = useState("");

  const book = useMemo(() => {
    if (!chapter) return null;
    return materials.find((m) => m.id === chapter.materialId) ?? materials.find((m) => m.classId === chapter.classId);
  }, [chapter, materials]);

  if (!chapter) {
    return (
      <div className="surface p-6">
        Chapter not found.{" "}
        <Link className="text-brand" href="/library">
          Back to library
        </Link>
      </div>
    );
  }

  const words = chapter.wordCount ?? chapter.body?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const pages =
    chapter.pageStart && chapter.pageEnd ? `pp. ${chapter.pageStart}–${chapter.pageEnd}` : "Pages —";

  async function runTool(key: ToolKey, regenerate = false) {
    const cached = chapter!.aiCache?.[key];
    if (cached && !regenerate) return;
    setBusy(key);
    let text = "";
    if (key === "summarize") text = await summarizeChapter(chapter!);
    if (key === "explain") text = await explainChapterSimply(chapter!);
    if (key === "pointers") text = await chapterPointersText(chapter!);
    if (key === "glossary") text = await chapterGlossaryText(chapter!);
    updateChapter(chapter!.id, { aiCache: { ...chapter!.aiCache, [key]: text } });
    setBusy(null);
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setMsg("Copied to clipboard.");
  }

  async function makeQuiz() {
    setBusy("quiz");
    const questions = await generateQuizFromChapter(chapter!);
    addAssessment({
      id: uid("a"),
      title: `${chapter!.title} — Quiz`,
      classId: chapter!.classId,
      subject: classes.find((c) => c.id === chapter!.classId)?.subject ?? "General",
      chapterId: chapter!.id,
      chapterIds: [chapter!.id],
      type: "quiz",
      maxMarks: questions.reduce((n, q) => n + q.marks, 0),
      date: new Date().toISOString().slice(0, 10),
      term: "Term 1",
      questions: questions.map((q) => ({ ...q, id: uid("q") })),
    });
    setMsg("Quiz created — open Exams & Assessments.");
    setBusy(null);
  }

  async function makeLesson() {
    setBusy("lesson");
    const plan = await generateLessonPlan(chapter!);
    addLessonPlan({
      id: uid("lp"),
      classId: chapter!.classId,
      chapterId: chapter!.id,
      date: new Date().toISOString().slice(0, 10),
      durationMins: 45,
      ...plan,
    });
    setMsg("Lesson plan saved — open Lesson Plans.");
    setBusy(null);
  }

  const tools: { key: ToolKey; title: string; hint: string }[] = [
    { key: "summarize", title: "Summarize", hint: "Short plain-language paragraph" },
    { key: "explain", title: "Explain Simply", hint: "Beginner-friendly breakdown" },
    { key: "pointers", title: "Pointers / Key Points", hint: "Bullets for the board" },
    { key: "glossary", title: "Key Terms / Glossary", hint: "Vocabulary with short definitions" },
  ];

  return (
    <div>
      <PageHeader
        title={chapter.title}
        subtitle={`Chapter ${chapter.unitNumber} · ${pages} · ${book?.title || chapter.sourceBook || "Source book"}`}
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/library")}>
            <ArrowLeft size={16} /> Library
          </button>
        }
      />

      {msg && <p className="mb-4 text-sm text-brand">{msg}</p>}

      <section className="surface mb-4 p-5">
        <div className="flex flex-wrap gap-3 text-sm text-ink-muted">
          <span>Unit {chapter.unitNumber}</span>
          <span>·</span>
          <span>{pages}</span>
          <span>·</span>
          <span>{words} words</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{chapter.summary}</p>
        <div className="prose-chapter mt-5 max-h-[28rem] overflow-y-auto rounded-xl bg-bg-elevated p-4 text-[15px] leading-7">
          {(chapter.body || chapter.summary)
            .split(/\n{2,}/)
            .map((para, i) => (
              <p key={i} className="mb-3 whitespace-pre-wrap last:mb-0">
                {para}
              </p>
            ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-display text-2xl">Understand this chapter</h2>
        <p className="mt-1 text-sm text-ink-muted">Each tool has its own output. Results are saved on this chapter.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {tools.map((t) => {
            const out = chapter.aiCache?.[t.key];
            return (
              <article key={t.key} className="surface flex flex-col p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{t.title}</h3>
                    <p className="text-xs text-ink-muted">{t.hint}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy === t.key}
                      onClick={() => runTool(t.key, Boolean(out))}
                    >
                      {busy === t.key ? "Working…" : out ? "Regenerate" : "Generate"}
                    </button>
                    {out && (
                      <button type="button" className="btn btn-ghost" title="Regenerate" onClick={() => runTool(t.key, true)}>
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 min-h-[8rem] flex-1 whitespace-pre-wrap rounded-xl bg-bg-elevated p-3 text-sm leading-relaxed">
                  {out || <span className="text-ink-muted">No output yet — press Generate.</span>}
                </div>
                {out && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => copyText(out)}>
                      <Copy size={14} /> Copy
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => downloadText(`${chapter.title}-${t.key}.txt`, out)}>
                      <Download size={14} /> .txt
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => exportTextPdf(`${chapter.title} — ${t.title}`, out)}>
                      <Download size={14} /> PDF
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="font-display text-2xl">Create from this chapter</h2>
        <p className="mt-1 text-sm text-ink-muted">Separate classroom outputs — not mixed with the tools above.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={!!busy} onClick={makeQuiz}>
            {busy === "quiz" ? "Creating…" : "Generate Quiz"}
          </button>
          <button type="button" className="btn btn-primary" disabled={!!busy} onClick={makeLesson}>
            {busy === "lesson" ? "Creating…" : "Generate Lesson Plan"}
          </button>
          <Link className="btn btn-primary" href={`/presentations?chapter=${chapter.id}&step=theme`}>
            Generate Presentation
          </Link>
        </div>
      </section>
    </div>
  );
}
