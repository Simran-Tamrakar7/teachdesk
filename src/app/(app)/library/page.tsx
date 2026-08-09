"use client";

import { PageHeader } from "@/components/PageHeader";
import { PdfViewer } from "@/components/PdfViewer";
import {
  parseChaptersFromText,
  splitTextbookIntoChapters,
  translateChapterLocale,
  viewChapter,
} from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import type { Chapter, ContentLang, Material } from "@/lib/types";
import {
  extToMaterialType,
  extractTextbookText,
  fileToDataUrl,
  formatBytes,
  formatDate,
  uid,
} from "@/lib/utils";
import {
  BookOpen,
  Eraser,
  FileText,
  FolderTree,
  Languages,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function LibraryPage() {
  const materials = useAppStore((s) => s.materials);
  const chapters = useAppStore((s) => s.chapters);
  const classes = useAppStore((s) => s.classes);
  const addMaterial = useAppStore((s) => s.addMaterial);
  const updateMaterial = useAppStore((s) => s.updateMaterial);
  const removeMaterial = useAppStore((s) => s.removeMaterial);
  const addChapters = useAppStore((s) => s.addChapters);
  const updateChapter = useAppStore((s) => s.updateChapter);
  const removeChapter = useAppStore((s) => s.removeChapter);
  const clearClassLibrary = useAppStore((s) => s.clearClassLibrary);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);

  const [classId, setClassId] = useState(() => classes.find((c) => c.id === "c6")?.id ?? classes[0]?.id ?? "c1");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [lang, setLang] = useState<ContentLang>("en");
  const [tagFilter, setTagFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [aiNote, setAiNote] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTags, setUploadTags] = useState("textbook, core");
  const [uploadLang, setUploadLang] = useState<ContentLang>("en");
  const [splitOnUpload, setSplitOnUpload] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [viewer, setViewer] = useState<Material | null>(null);
  const [editing, setEditing] = useState<Chapter | null>(null);

  const classChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.classId === classId && !c.deletedAt)
        .sort((a, b) => a.unitNumber - b.unitNumber),
    [chapters, classId]
  );

  const filteredMaterials = materials.filter((m) => {
    if (m.deletedAt) return false;
    if (m.classId !== classId) return false;
    if (selectedChapter && m.chapterId && m.chapterId !== selectedChapter) return false;
    if (tagFilter && !m.tags.some((t) => t.includes(tagFilter.toLowerCase()))) return false;
    return true;
  });

  const chapter = chapters.find((c) => c.id === selectedChapter && !c.deletedAt);
  const viewed = chapter ? viewChapter(chapter, lang) : null;
  const cls = classes.find((c) => c.id === classId);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile && !uploadTitle.trim() && !pasteText.trim()) {
      setAiNote("Choose a file, enter a title, or paste book text.");
      return;
    }
    setBusy("upload");
    setProgress({ pct: 8, label: "Reading file…" });
    const fileName = uploadFile?.name ?? `${(uploadTitle || "textbook").replace(/\s+/g, "-").toLowerCase()}.txt`;
    const title = uploadTitle.trim() || fileName.replace(/\.[^.]+$/, "");
    const type = uploadFile ? extToMaterialType(fileName) : "other";

    let extracted = pasteText.trim();
    let dataUrl: string | undefined;
    if (uploadFile) {
      try {
        if (uploadFile.size <= 4_000_000) dataUrl = await fileToDataUrl(uploadFile);
      } catch {
        /* ignore */
      }
      setProgress({ pct: 28, label: "Extracting text…" });
      if (!extracted) extracted = await extractTextbookText(uploadFile);
    }

    setProgress({ pct: 45, label: "Saving book to library…" });
    const materialId = uid("m");
    const material: Material = {
      id: materialId,
      title,
      type,
      classId,
      subject: cls?.subject ?? "Social Studies",
      chapterId: selectedChapter ?? undefined,
      tags: uploadTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      uploadedAt: new Date().toISOString(),
      sizeLabel: uploadFile ? formatBytes(uploadFile.size) : formatBytes(extracted.length),
      contentPreview: (extracted || `Uploaded: ${title}`).slice(0, 500),
      extractedText: extracted || undefined,
      dataUrl,
      mime: uploadFile?.type || (type === "pdf" ? "application/pdf" : undefined),
      lang: uploadLang,
      versions: [
        {
          id: uid("mv"),
          version: 1,
          uploadedAt: new Date().toISOString(),
          note: uploadFile ? `Uploaded ${uploadFile.name}` : "Pasted / titled upload",
          fileName,
        },
      ],
    };
    addMaterial(material);

    if (splitOnUpload && (extracted || type === "pdf" || type === "other")) {
      setBusy("split");
      setProgress({ pct: 62, label: "Detecting chapter boundaries…" });
      const subjectId = (cls?.subject ?? "social").toLowerCase().includes("social") ? "social" : "science";
      const detected = await splitTextbookIntoChapters(fileName, extracted, {
        classId,
        subjectId,
        materialId,
        lang: uploadLang,
      });
      setProgress({ pct: 88, label: "Writing chapter cards…" });
      const withIds = detected.map((c) => ({
        ...c,
        id: uid("ch"),
        sourceBook: title,
        materialId,
      })) as Chapter[];
      addChapters(withIds);
      if (withIds[0]) setSelectedChapter(withIds[0].id);
      setLang(uploadLang);
      setAiNote(
        `Saved “${title}”. Split into ${withIds.length} chapters (best-guess). Open a chapter card to read, adjust, or use Understand tools.`
      );
    } else {
      setAiNote(`Saved “${title}”. Open the book or use Extract chapters.`);
    }

    setProgress({ pct: 100, label: "Done" });
    setBusy(null);
    setTimeout(() => setProgress(null), 600);
    setShowUpload(false);
    setUploadTitle("");
    setUploadFile(null);
    setPasteText("");
  }

  async function reExtract(m: Material) {
    setBusy("split");
    setProgress({ pct: 30, label: "Detecting chapters…" });
    const text = m.extractedText || m.contentPreview || "";
    const subjectId = (cls?.subject ?? "social").toLowerCase().includes("social") ? "social" : "science";
    const detected = await splitTextbookIntoChapters(m.versions.at(-1)?.fileName ?? m.title, text, {
      classId,
      subjectId,
      materialId: m.id,
      lang: m.lang ?? lang,
    });
    setProgress({ pct: 80, label: "Saving chapter cards…" });
    addChapters(
      detected.map((c) => ({
        ...c,
        id: uid("ch"),
        sourceBook: m.title,
        materialId: m.id,
      })) as Chapter[]
    );
    setAiNote(`Re-extracted ${detected.length} chapter card(s) from “${m.title}”.`);
    setBusy(null);
    setProgress(null);
  }

  async function runTranslate(to: ContentLang) {
    if (!chapter) return;
    setBusy("translate");
    const locale = await translateChapterLocale(chapter, to);
    if (to === "ne") updateChapter(chapter.id, { ne: locale });
    else {
      updateChapter(chapter.id, {
        title: locale.title,
        summary: locale.summary,
        keyTerms: locale.keyTerms,
        objectives: locale.objectives,
        discussionQuestions: locale.discussionQuestions,
        body: locale.body,
        lang: "en",
      });
    }
    setLang(to);
    setAiNote(to === "ne" ? "Nepali version saved. Toggle नेपाली to view." : "English fields updated.");
    setBusy(null);
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (lang === "ne") {
      updateChapter(editing.id, {
        ne: {
          title: editing.title,
          summary: editing.summary,
          keyTerms: editing.keyTerms,
          objectives: editing.objectives,
          discussionQuestions: editing.discussionQuestions,
          body: editing.body,
          pointers: editing.pointers,
        },
      });
    } else {
      updateChapter(editing.id, {
        title: editing.title,
        summary: editing.summary,
        keyTerms: editing.keyTerms,
        objectives: editing.objectives,
        discussionQuestions: editing.discussionQuestions,
        body: editing.body,
        unitNumber: editing.unitNumber,
      });
    }
    setEditing(null);
    setAiNote("Chapter saved.");
  }

  function mergeWithNext(ch: Chapter) {
    const siblings = classChapters.filter((c) => (ch.materialId ? c.materialId === ch.materialId : true));
    const idx = siblings.findIndex((c) => c.id === ch.id);
    const next = siblings[idx + 1];
    if (!next) {
      setAiNote("No next chapter to merge with.");
      return;
    }
    if (!confirm(`Merge “${ch.title}” with “${next.title}”?`)) return;
    const body = `${ch.body || ""}\n\n${next.body || ""}`.trim();
    const words = body.split(/\s+/).filter(Boolean).length;
    updateChapter(ch.id, {
      title: `${ch.title} / ${next.title}`,
      body,
      summary: body.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 280),
      wordCount: words,
      pageEnd: next.pageEnd ?? ch.pageEnd,
      aiCache: undefined,
    });
    removeChapter(next.id);
    setAiNote(`Merged into “${ch.title} / ${next.title}”.`);
  }

  function resplitChapter(ch: Chapter) {
    const text = ch.body || ch.summary || "";
    if (text.trim().length < 40) {
      setAiNote("Not enough text in this chapter to re-split.");
      return;
    }
    if (!confirm(`Re-split “${ch.title}” into smaller sections (best-guess)?`)) return;
    const subjectId = (cls?.subject ?? "social").toLowerCase().includes("social") ? "social" : "science";
    const parts = parseChaptersFromText(text, {
      classId: ch.classId,
      subjectId,
      materialId: ch.materialId,
      lang: ch.lang ?? lang,
      sourceBook: ch.sourceBook,
    });
    if (parts.length <= 1) {
      setAiNote("Could not find clearer boundaries — try editing the body or paste Chapter/Unit headings.");
      return;
    }
    removeChapter(ch.id);
    addChapters(
      parts.map((p, i) => ({
        ...p,
        id: uid("ch"),
        unitNumber: ch.unitNumber + i,
        sourceBook: ch.sourceBook,
        materialId: ch.materialId,
      })) as Chapter[]
    );
    setAiNote(`Re-split into ${parts.length} sections. Rename or merge as needed.`);
  }

  return (
    <div>
      <PageHeader
        title="Content Library"
        subtitle="Upload a textbook → open it → extract chapter-wise notes → edit, translate EN↔नेपाली, or delete."
        actions={
          <>
            <div className="flex rounded-xl border border-line p-1">
              <button type="button" className={`btn ${lang === "en" ? "btn-primary" : "btn-ghost"} px-3 py-1.5`} onClick={() => setLang("en")}>
                English
              </button>
              <button type="button" className={`btn ${lang === "ne" ? "btn-primary" : "btn-ghost"} px-3 py-1.5`} onClick={() => setLang("ne")}>
                नेपाली
              </button>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setAssistantOpen(true)}>
              <Sparkles size={16} /> Ask AI
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={16} /> Upload textbook
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {classes
          .filter((c) => !c.deletedAt)
          .map((c) => (
            <button
              key={c.id}
              type="button"
              className={`btn ${classId === c.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setClassId(c.id);
                const first = chapters.find((ch) => ch.classId === c.id && !ch.deletedAt);
                setSelectedChapter(first?.id ?? null);
              }}
            >
              {c.name}
            </button>
          ))}
      </div>

      {progress && (
        <div className="surface mb-4 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">{progress.label}</span>
            <span className="text-ink-muted">{progress.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (confirm(`Clear all materials and chapters for ${cls?.name ?? "this class"}?`)) {
              clearClassLibrary(classId);
              setSelectedChapter(null);
              setAiNote("Library cleared for this class.");
            }
          }}
        >
          <Eraser size={16} /> Clear class library
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderTree size={16} /> Chapter list ({lang === "ne" ? "नेपाली" : "EN"})
          </div>
          {classChapters.length === 0 ? (
            <div className="surface p-8 text-center text-ink-muted">
              No chapters yet. Upload a textbook — we&apos;ll detect Chapter/Unit headings and build cards you can open and edit.
            </div>
          ) : (
            classChapters.map((ch) => {
              const v = viewChapter(ch, lang);
              const words = ch.wordCount ?? ch.body?.trim().split(/\s+/).filter(Boolean).length ?? 0;
              const pages =
                ch.pageStart && ch.pageEnd ? `pp. ${ch.pageStart}–${ch.pageEnd}` : "Pages —";
              const selected = selectedChapter === ch.id;
              return (
                <article
                  key={ch.id}
                  className={`surface cursor-pointer p-4 ${selected ? "ring-2 ring-brand/40" : ""}`}
                  onClick={() => setSelectedChapter(ch.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">
                        Chapter {ch.unitNumber}: {v.title}
                      </h3>
                      <p className="mt-1 text-xs text-ink-muted">
                        {pages} · {words} words · {ch.sourceBook || "Library book"}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{v.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link className="btn btn-primary" href={`/library/chapters/${ch.id}`}>
                        Open chapter
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setEditing({
                            ...ch,
                            title: v.title,
                            summary: v.summary,
                            keyTerms: v.keyTerms,
                            objectives: v.objectives,
                            discussionQuestions: v.discussionQuestions,
                            body: v.body,
                          })
                        }
                      >
                        <Pencil size={14} /> Rename / edit
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => mergeWithNext(ch)}>
                        Merge next
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => resplitChapter(ch)}>
                        Re-split
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-danger"
                        onClick={() => {
                          if (confirm(`Delete “${v.title}”?`)) removeChapter(ch.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          <div className="pt-2">
            <div className="mb-2 text-sm font-semibold">Source books / materials</div>
            <input className="input mb-3 max-w-xs" placeholder="Filter by tag…" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
            {filteredMaterials.length === 0 ? (
              <div className="surface p-6 text-sm text-ink-muted">No materials for this class yet.</div>
            ) : (
              filteredMaterials.map((m) => (
                <article key={m.id} className="surface mb-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText size={16} className="text-brand" />
                        <h3 className="font-semibold">{m.title}</h3>
                        <span className="badge uppercase">{m.type}</span>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {m.sizeLabel} · {formatDate(m.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => setViewer(m)}>
                        <BookOpen size={16} /> View
                      </button>
                      <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => reExtract(m)}>
                        Extract chapters
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-danger"
                        onClick={() => {
                          if (confirm(`Delete material “${m.title}”?`)) removeMaterial(m.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {m.extractedText != null && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-medium text-brand">Extracted / pasted text</summary>
                      <textarea
                        className="textarea mt-2 min-h-28 font-mono text-xs"
                        value={m.extractedText}
                        onChange={(e) =>
                          updateMaterial(m.id, { extractedText: e.target.value, contentPreview: e.target.value.slice(0, 500) })
                        }
                      />
                    </details>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="surface h-fit p-4">
          <h3 className="font-display text-xl">{viewed ? viewed.title : "Chapter tools"}</h3>
          {viewed && chapter ? (
            <>
              <p className="mt-2 text-sm text-ink-muted">{viewed.summary}</p>
              <div className="mt-4 space-y-2">
                <Link className="btn btn-primary w-full" href={`/library/chapters/${chapter.id}`}>
                  Open full chapter page
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() =>
                    setEditing({
                      ...chapter,
                      title: viewed.title,
                      summary: viewed.summary,
                      keyTerms: viewed.keyTerms,
                      objectives: viewed.objectives,
                      discussionQuestions: viewed.discussionQuestions,
                      body: viewed.body,
                    })
                  }
                >
                  <Pencil size={16} /> Quick edit
                </button>
                <button type="button" className="btn btn-secondary w-full" disabled={!!busy} onClick={() => runTranslate(lang === "en" ? "ne" : "en")}>
                  <Languages size={16} />
                  {busy === "translate" ? "Translating…" : lang === "en" ? "Translate → नेपाली" : "Translate → English"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Select a chapter from the list, or open a chapter card to read and use Understand tools.</p>
          )}
          {aiNote && <div className="mt-4 whitespace-pre-wrap rounded-xl bg-brand-soft/50 p-3 text-sm">{aiNote}</div>}
        </aside>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onSubmit={handleUpload}>
            <h3 className="font-display text-2xl">Upload textbook</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Store the file to open later. Extract text when possible, or paste chapter text.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-bg-elevated px-4 py-6 text-center hover:border-brand">
              <Upload className="text-brand" />
              <span className="font-semibold">{uploadFile ? uploadFile.name : "Choose file"}</span>
              <span className="text-xs text-ink-muted">PDF/TXT — keep under ~4MB to open in-browser</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  if (f) setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Title
              <input className="input mt-1" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Book language
              <select className="select mt-1" value={uploadLang} onChange={(e) => setUploadLang(e.target.value as ContentLang)}>
                <option value="en">English</option>
                <option value="ne">नेपाली</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Or paste book / chapter text
              <textarea
                className="textarea mt-1 min-h-28 font-mono text-xs"
                placeholder={"Chapter 1 Our Earth\n...\n\nChapter 2 Our Society\n..."}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Tags
              <input className="input mt-1" value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={splitOnUpload} onChange={(e) => setSplitOnUpload(e.target.checked)} />
              Extract & paste chapter-wise info into library
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!!busy}>
                {busy ? "Processing…" : "Upload & extract"}
              </button>
            </div>
          </form>
        </div>
      )}

      <PdfViewer
        open={!!viewer}
        onClose={() => setViewer(null)}
        title={viewer?.title ?? "Book"}
        dataUrl={viewer?.dataUrl}
        mime={viewer?.mime}
        fileName={viewer?.versions.at(-1)?.fileName}
        textFallback={viewer?.extractedText || viewer?.contentPreview}
      />

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onSubmit={saveEdit}>
            <h3 className="font-display text-2xl">Edit chapter ({lang === "ne" ? "नेपाली" : "English"})</h3>
            <label className="mt-3 block text-sm font-semibold">
              Title
              <input className="input mt-1" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Unit #
              <input
                className="input mt-1"
                type="number"
                min={1}
                value={editing.unitNumber}
                onChange={(e) => setEditing({ ...editing, unitNumber: Number(e.target.value) || 1 })}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Summary
              <textarea className="textarea mt-1" value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Key terms (comma-separated)
              <input
                className="input mt-1"
                value={editing.keyTerms.join(", ")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    keyTerms: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Objectives (one per line)
              <textarea
                className="textarea mt-1"
                value={editing.objectives.join("\n")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    objectives: e.target.value
                      .split("\n")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Book content
              <textarea
                className="textarea mt-1 min-h-40 font-mono text-xs"
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
