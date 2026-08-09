"use client";

import { PageHeader } from "@/components/PageHeader";
import { generateQuizFromChapter, splitTextbookIntoChapters, summarizeChapter } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import type { Material } from "@/lib/types";
import { formatDate, uid } from "@/lib/utils";
import { FileText, FolderTree, Sparkles, Tags, Upload } from "lucide-react";
import { useMemo, useState } from "react";

export default function LibraryPage() {
  const materials = useAppStore((s) => s.materials);
  const chapters = useAppStore((s) => s.chapters);
  const classes = useAppStore((s) => s.classes);
  const addMaterial = useAppStore((s) => s.addMaterial);
  const addChapters = useAppStore((s) => s.addChapters);
  const addAssessment = useAppStore((s) => s.addAssessment);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);

  const [classId, setClassId] = useState("c1");
  const [selectedChapter, setSelectedChapter] = useState<string | null>("ch1");
  const [tagFilter, setTagFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<Material["type"]>("pdf");
  const [uploadTags, setUploadTags] = useState("textbook, core");
  const [splitOnUpload, setSplitOnUpload] = useState(true);

  const classChapters = useMemo(
    () => chapters.filter((c) => c.classId === classId).sort((a, b) => a.unitNumber - b.unitNumber),
    [chapters, classId]
  );

  const filteredMaterials = materials.filter((m) => {
    if (m.classId !== classId) return false;
    if (selectedChapter && m.chapterId && m.chapterId !== selectedChapter) return false;
    if (tagFilter && !m.tags.some((t) => t.includes(tagFilter.toLowerCase()))) return false;
    return true;
  });

  const chapter = chapters.find((c) => c.id === selectedChapter);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadTitle.trim()) return;
    setBusy("upload");
    const fileName = `${uploadTitle.replace(/\s+/g, "-").toLowerCase()}.${uploadType === "other" ? "bin" : uploadType}`;
    const material: Material = {
      id: uid("m"),
      title: uploadTitle.trim(),
      type: uploadType,
      classId,
      subject: classes.find((c) => c.id === classId)?.subject ?? "Science",
      chapterId: selectedChapter ?? undefined,
      tags: uploadTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      uploadedAt: new Date().toISOString(),
      sizeLabel: "1.2 MB",
      contentPreview: `Uploaded material: ${uploadTitle}`,
      versions: [
        {
          id: uid("mv"),
          version: 1,
          uploadedAt: new Date().toISOString(),
          note: "Initial upload",
          fileName,
        },
      ],
    };
    addMaterial(material);

    if (splitOnUpload && uploadType === "pdf") {
      setBusy("split");
      const detected = await splitTextbookIntoChapters(fileName);
      addChapters(detected.map((c) => ({ ...c, id: uid("ch"), classId })));
      setAiNote(`Split “${uploadTitle}” into ${detected.length} chapters with summaries, key terms, and objectives.`);
    } else {
      setAiNote(`Uploaded “${uploadTitle}”.`);
    }

    setBusy(null);
    setShowUpload(false);
    setUploadTitle("");
  }

  async function runChapterSummary() {
    if (!chapter) return;
    setBusy("summary");
    const text = await summarizeChapter(chapter);
    setAiNote(text);
    setBusy(null);
  }

  async function runQuizGen() {
    if (!chapter) return;
    setBusy("quiz");
    const questions = await generateQuizFromChapter(chapter);
    addAssessment({
      id: uid("a"),
      title: `${chapter.title} — AI Quiz`,
      classId,
      chapterId: chapter.id,
      type: "quiz",
      maxMarks: questions.reduce((n, q) => n + q.marks, 0),
      date: new Date().toISOString().slice(0, 10),
      questions: questions.map((q) => ({ ...q, id: uid("q") })),
    });
    setAiNote(`Generated a ${questions.length}-question quiz for ${chapter.title}. Open Grades to review.`);
    setBusy(null);
  }

  return (
    <div>
      <PageHeader
        title="Content Library"
        subtitle="Organize by Class → Subject → Chapter. Upload textbooks for AI chapter split, summaries, and quiz generation."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setAssistantOpen(true)}>
              <Sparkles size={16} /> Ask AI
            </button>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={16} /> Upload
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {classes.map((c) => (
          <button
            key={c.id}
            className={`btn ${classId === c.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setClassId(c.id);
              const first = chapters.find((ch) => ch.classId === c.id);
              setSelectedChapter(first?.id ?? null);
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_320px]">
        <aside className="surface p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FolderTree size={16} /> Chapters
          </div>
          <button
            className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-sm ${!selectedChapter ? "bg-brand-soft text-brand-deep" : "hover:bg-bg-elevated"}`}
            onClick={() => setSelectedChapter(null)}
          >
            All materials
          </button>
          {classChapters.map((ch) => (
            <button
              key={ch.id}
              className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-sm ${selectedChapter === ch.id ? "bg-brand-soft text-brand-deep" : "hover:bg-bg-elevated"}`}
              onClick={() => setSelectedChapter(ch.id)}
            >
              Unit {ch.unitNumber}: {ch.title}
            </button>
          ))}
        </aside>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tags size={16} className="text-ink-muted" />
            <input
              className="input max-w-xs"
              placeholder="Filter by tag…"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            />
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="surface p-8 text-center text-ink-muted">No materials match this view.</div>
          ) : (
            filteredMaterials.map((m) => (
              <article key={m.id + m.versions.length} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-brand" />
                      <h3 className="font-semibold">{m.title}</h3>
                      <span className="badge uppercase">{m.type}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {m.sizeLabel} · Updated {formatDate(m.uploadedAt)} · v{m.versions.at(-1)?.version}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.tags.map((t) => (
                        <span key={t} className="badge">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const latest = m.versions.at(-1);
                      const nextVer = (latest?.version ?? 0) + 1;
                      useAppStore.setState({
                        materials: useAppStore.getState().materials.map((x) =>
                          x.id === m.id
                            ? {
                                ...x,
                                uploadedAt: new Date().toISOString(),
                                versions: [
                                  ...x.versions,
                                  {
                                    id: uid("mv"),
                                    version: nextVer,
                                    uploadedAt: new Date().toISOString(),
                                    note: `Teacher update v${nextVer}`,
                                    fileName: latest?.fileName ?? "file",
                                  },
                                ],
                              }
                            : x
                        ),
                      });
                      setAiNote(`Saved version ${nextVer} for “${m.title}”. Older versions kept.`);
                    }}
                  >
                    New version
                  </button>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-brand">Version history</summary>
                  <ul className="mt-2 space-y-1 text-ink-muted">
                    {[...m.versions].reverse().map((v) => (
                      <li key={v.id}>
                        v{v.version} — {v.note} ({formatDate(v.uploadedAt)})
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))
          )}
        </section>

        <aside className="surface p-4">
          <h3 className="font-display text-xl">{chapter ? chapter.title : "Chapter tools"}</h3>
          {chapter ? (
            <>
              <p className="mt-2 text-sm text-ink-muted">{chapter.summary}</p>
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase text-ink-muted">Key terms</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {chapter.keyTerms.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <button className="btn btn-secondary w-full" disabled={!!busy} onClick={runChapterSummary}>
                  {busy === "summary" ? "Working…" : "AI summary pack"}
                </button>
                <button className="btn btn-primary w-full" disabled={!!busy} onClick={runQuizGen}>
                  {busy === "quiz" ? "Generating…" : "Generate quiz"}
                </button>
              </div>
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase text-ink-muted">Objectives</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                  {chapter.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Select a chapter to generate summaries, worksheets, and quizzes.</p>
          )}
          {aiNote && (
            <div className="mt-4 whitespace-pre-wrap rounded-xl bg-brand-soft/50 p-3 text-sm">{aiNote}</div>
          )}
        </aside>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface w-full max-w-lg p-5" onSubmit={handleUpload}>
            <h3 className="font-display text-2xl">Upload material</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Demo mode stores metadata locally. PDF uploads can auto-split into chapters.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Title
              <input className="input mt-1" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              File type
              <select className="select mt-1" value={uploadType} onChange={(e) => setUploadType(e.target.value as Material["type"])}>
                {["pdf", "docx", "pptx", "image", "video", "audio", "other"].map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Tags (comma-separated)
              <input className="input mt-1" value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={splitOnUpload} onChange={(e) => setSplitOnUpload(e.target.checked)} />
              Auto-detect chapters (PDF)
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!!busy}>
                {busy ? "Processing…" : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
