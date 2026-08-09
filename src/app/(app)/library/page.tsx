"use client";

import { PageHeader } from "@/components/PageHeader";
import { PdfViewer } from "@/components/PdfViewer";
import {
  parseChaptersFromText,
  splitTextbookIntoChapters,
  translateChapterLocale,
  viewChapter,
} from "@/lib/ai";
import { CDC_PORTAL, findCdcEntry, listCdcGrades, listCdcSubjects, type CdcMedium } from "@/lib/cdc-catalog";
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
  Bookmark,
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
  const libraryBookmarks = useAppStore((s) => s.libraryBookmarks);
  const addMaterial = useAppStore((s) => s.addMaterial);
  const updateMaterial = useAppStore((s) => s.updateMaterial);
  const removeMaterial = useAppStore((s) => s.removeMaterial);
  const addChapters = useAppStore((s) => s.addChapters);
  const replaceChaptersForMaterial = useAppStore((s) => s.replaceChaptersForMaterial);
  const updateChapter = useAppStore((s) => s.updateChapter);
  const removeChapter = useAppStore((s) => s.removeChapter);
  const clearClassLibrary = useAppStore((s) => s.clearClassLibrary);
  const addLibraryBookmark = useAppStore((s) => s.addLibraryBookmark);
  const updateLibraryBookmark = useAppStore((s) => s.updateLibraryBookmark);
  const removeLibraryBookmark = useAppStore((s) => s.removeLibraryBookmark);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);

  const activeClasses = useMemo(() => classes.filter((c) => !c.deletedAt), [classes]);

  /** Library is Class (grade) + Subject only — not school section A/B */
  const libraryGroups = useMemo(() => {
    const map = new Map<string, { key: string; grade: string; subject: string; classIds: string[]; primaryId: string }>();
    for (const c of activeClasses) {
      const key = `${c.grade}::${c.subject}`;
      const cur = map.get(key);
      if (cur) {
        cur.classIds.push(c.id);
      } else {
        map.set(key, { key, grade: c.grade, subject: c.subject, classIds: [c.id], primaryId: c.id });
      }
    }
    return [...map.values()].sort((a, b) => Number(a.grade) - Number(b.grade) || a.subject.localeCompare(b.subject));
  }, [activeClasses]);

  const defaultKey =
    libraryGroups.find((g) => g.grade === "8" && /science/i.test(g.subject))?.key ?? libraryGroups[0]?.key ?? "";
  const [groupKey, setGroupKey] = useState(defaultKey);
  const group = libraryGroups.find((g) => g.key === groupKey) ?? libraryGroups[0];
  const scopeClassIds = group?.classIds ?? [];
  const classId = group?.primaryId ?? "";

  const [libTab, setLibTab] = useState<"content" | "bookmarks">("content");
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
  const [bmLabel, setBmLabel] = useState("");
  const [bmLink, setBmLink] = useState("");
  const [bmNote, setBmNote] = useState("");
  const [editingBm, setEditingBm] = useState<string | null>(null);
  const [showCdc, setShowCdc] = useState(false);
  const [cdcGrade, setCdcGrade] = useState(8);
  const [cdcMedium, setCdcMedium] = useState<CdcMedium>("en");
  const [cdcSubject, setCdcSubject] = useState("Science");
  const [cdcMsg, setCdcMsg] = useState("");

  const cdcSubjects = useMemo(() => listCdcSubjects(cdcGrade, cdcMedium), [cdcGrade, cdcMedium]);

  const classChapters = useMemo(
    () =>
      chapters
        .filter((c) => scopeClassIds.includes(c.classId) && !c.deletedAt)
        .sort((a, b) => a.unitNumber - b.unitNumber || a.title.localeCompare(b.title)),
    [chapters, scopeClassIds]
  );

  const filteredMaterials = materials.filter((m) => {
    if (m.deletedAt) return false;
    if (!scopeClassIds.includes(m.classId)) return false;
    if (selectedChapter && m.chapterId && m.chapterId !== selectedChapter) return false;
    if (tagFilter && !m.tags.some((t) => t.includes(tagFilter.toLowerCase()))) return false;
    return true;
  });

  const classBookmarks = libraryBookmarks.filter((b) => scopeClassIds.includes(b.classId));

  const chapter = chapters.find((c) => c.id === selectedChapter && !c.deletedAt);
  const viewed = chapter ? viewChapter(chapter, lang) : null;
  const cls = classes.find((c) => c.id === classId);
  const libraryLabel = group ? `Class ${group.grade} — ${group.subject}` : "Class";

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
      const fromName = /science|technology|विज्ञान/i.test(`${title} ${fileName}`);
      const subjectId = fromName
        ? "science"
        : (cls?.subject ?? "social").toLowerCase().includes("social")
          ? "social"
          : "science";
      const detected = await splitTextbookIntoChapters(fileName, extracted, {
        classId,
        subjectId,
        materialId,
        lang: uploadLang,
        sourceBook: title,
      });
      setProgress({ pct: 88, label: "Writing chapter cards…" });
      const withIds = detected.map((c) => ({
        ...c,
        id: uid("ch"),
        sourceBook: title,
        materialId,
      })) as Chapter[];
      // Replace any prior extract for this book — never stack duplicates
      replaceChaptersForMaterial(materialId, withIds);
      if (withIds[0]) setSelectedChapter(withIds[0].id);
      setLang(uploadLang);
      setAiNote(
        extracted.trim().length > 40
          ? `Saved “${title}”. Split into ${withIds.length} units from text/TOC.`
          : `Saved “${title}”. PDF text wasn’t readable, so built ${withIds.length} unit cards from the book TOC (page ranges). Paste unit text later or re-extract after pasting the contents list.`
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
    const fileName = m.versions.at(-1)?.fileName ?? m.title;
    const fromName = /science|technology|विज्ञान/i.test(`${m.title} ${fileName}`);
    const subjectId = fromName
      ? "science"
      : (cls?.subject ?? "social").toLowerCase().includes("social")
        ? "social"
        : "science";
    const detected = await splitTextbookIntoChapters(fileName, text, {
      classId,
      subjectId,
      materialId: m.id,
      lang: m.lang ?? lang,
      sourceBook: m.title,
    });
    setProgress({ pct: 80, label: "Saving chapter cards…" });
    replaceChaptersForMaterial(
      m.id,
      detected.map((c) => ({
        ...c,
        id: uid("ch"),
        sourceBook: m.title,
        materialId: m.id,
      })) as Chapter[]
    );
    setAiNote(`Re-extracted ${detected.length} unit card(s) from “${m.title}” (replaced previous split for this book).`);
    setBusy(null);
    setProgress(null);
  }

  async function extractAllBooks() {
    const books = materials.filter((m) => !m.deletedAt && scopeClassIds.includes(m.classId));
    if (!books.length) {
      setAiNote("No books in this class yet — upload a textbook first.");
      return;
    }
    setBusy("split");
    let total = 0;
    for (let i = 0; i < books.length; i++) {
      const m = books[i];
      setProgress({
        pct: Math.round(((i + 0.5) / books.length) * 100),
        label: `Extracting “${m.title}” (${i + 1}/${books.length})…`,
      });
      const text = m.extractedText || m.contentPreview || "";
      const fileName = m.versions.at(-1)?.fileName ?? m.title;
      const fromName = /science|technology|विज्ञान/i.test(`${m.title} ${fileName}`);
      const subjectId = fromName || /science/i.test(cls?.subject ?? "") ? "science" : "social";
      const detected = await splitTextbookIntoChapters(fileName, text, {
        classId: m.classId,
        subjectId,
        materialId: m.id,
        lang: m.lang ?? lang,
        sourceBook: m.title,
      });
      replaceChaptersForMaterial(
        m.id,
        detected.map((c) => ({
          ...c,
          id: uid("ch"),
          sourceBook: m.title,
          materialId: m.id,
          classId: m.classId,
        })) as Chapter[]
      );
      total += detected.length;
    }
    setProgress({ pct: 100, label: "Done" });
    setAiNote(`Extracted ${total} unit card(s) across ${books.length} book(s) for ${libraryLabel}.`);
    setBusy(null);
    setTimeout(() => setProgress(null), 700);
  }

  async function importFromCdc() {
    const entry = findCdcEntry(cdcGrade, cdcSubject, cdcMedium);
    if (!entry) {
      setCdcMsg("No catalog entry for that grade/subject/medium. Try another combination or open CDC manually.");
      return;
    }
    if (!classId) {
      setCdcMsg("Select a class library first.");
      return;
    }
    setBusy("cdc");
    setCdcMsg("");
    setProgress({ pct: 15, label: "Contacting CDC source…" });

    let dataUrl: string | undefined;
    let extracted = "";
    let fetchError = "";

    if (entry.pdfUrl) {
      try {
        const res = await fetch(`/api/cdc/fetch?url=${encodeURIComponent(entry.pdfUrl)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          dataUrl?: string;
          textHint?: string;
          error?: string;
          tooLarge?: boolean;
        };
        if (res.ok && data.dataUrl) {
          dataUrl = data.dataUrl;
          extracted = data.textHint || "";
        } else {
          fetchError = data.error || `Could not download PDF (${res.status}).`;
        }
      } catch (e) {
        fetchError = e instanceof Error ? e.message : "Network error";
      }
    } else {
      fetchError = "No direct PDF URL on file for this title (CDC links change by year).";
    }

    setProgress({ pct: 55, label: "Building chapter cards…" });

    const materialId = uid("m");
    let chaptersOut: Chapter[] = [];

    if (extracted.trim().length > 80) {
      const detected = await splitTextbookIntoChapters(entry.title, extracted, {
        classId,
        subjectId: /science/i.test(entry.subject) ? "science" : "general",
        materialId,
        lang: entry.medium,
        sourceBook: entry.title,
      });
      chaptersOut = detected.map((c) => ({ ...c, id: uid("ch"), sourceBook: entry.title, materialId, classId })) as Chapter[];
    } else if (entry.unitTitles?.length) {
      chaptersOut = entry.unitTitles.map((title, i) => ({
        id: uid("ch"),
        subjectId: /science/i.test(entry.subject) ? "science" : "general",
        classId,
        materialId,
        title,
        unitNumber: i + 1,
        lang: entry.medium,
        summary: `Official CDC unit — ${title}. Open the source link to read the full textbook; paste unit text here when ready.`,
        keyTerms: [],
        objectives: ["Read the official unit", "Note key vocabulary", "Prepare discussion questions"],
        discussionQuestions: [`What is the main idea of “${title}”?`],
        body: `Unit ${i + 1}: ${title}\n\nImported from CDC catalog. Full PDF may be large — open the Official source link, or paste chapter text into this unit.`,
        wordCount: 40,
        pageStart: i * 20 + 1,
        pageEnd: (i + 1) * 20,
        sourceBook: entry.title,
      }));
    } else {
      chaptersOut = [
        {
          id: uid("ch"),
          subjectId: "general",
          classId,
          materialId,
          title: entry.title,
          unitNumber: 1,
          lang: entry.medium,
          summary: "Official CDC listing imported. Download the PDF from the source page and paste text to split chapters.",
          keyTerms: [],
          objectives: ["Open official CDC textbook"],
          discussionQuestions: ["Which units will you teach first?"],
          body: `${entry.title}\n\nSource: ${entry.sourcePageUrl}`,
          wordCount: 20,
          pageStart: 1,
          pageEnd: 10,
          sourceBook: entry.title,
        },
      ];
    }

    const material: Material = {
      id: materialId,
      title: entry.title,
      type: "pdf",
      classId,
      subject: entry.subject,
      tags: ["cdc", "official", entry.medium, `grade-${entry.grade}`],
      uploadedAt: new Date().toISOString(),
      sizeLabel: dataUrl ? formatBytes(Math.round((dataUrl.length * 3) / 4)) : "CDC catalog",
      contentPreview: (extracted || entry.title).slice(0, 500),
      extractedText: extracted || undefined,
      dataUrl,
      mime: "application/pdf",
      lang: entry.medium,
      sourceKind: "cdc",
      sourceUrl: entry.sourcePageUrl,
      official: true,
      versions: [
        {
          id: uid("mv"),
          version: 1,
          uploadedAt: new Date().toISOString(),
          note: "Official — CDC import",
          fileName: `${entry.id}.pdf`,
        },
      ],
    };

    addMaterial(material);
    replaceChaptersForMaterial(materialId, chaptersOut);
    setProgress({ pct: 100, label: "Done" });
    setBusy(null);
    setTimeout(() => setProgress(null), 600);
    setShowCdc(false);
    setAiNote(
      fetchError
        ? `Imported “${entry.title}” with ${chaptersOut.length} unit card(s). PDF fetch note: ${fetchError} Open ${entry.sourcePageUrl}`
        : `Imported Official CDC “${entry.title}” · ${chaptersOut.length} unit(s).`
    );
    if (fetchError) setCdcMsg(`${fetchError} Verify at ${CDC_PORTAL}`);
  }

  function saveBookmark(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !bmLabel.trim() || !bmLink.trim()) {
      setAiNote("Bookmark needs a label and a link (chapter path or https://…).");
      return;
    }
    if (editingBm) {
      updateLibraryBookmark(editingBm, { label: bmLabel.trim(), link: bmLink.trim(), note: bmNote.trim() || undefined });
      setEditingBm(null);
      setAiNote("Bookmark updated.");
    } else {
      addLibraryBookmark({ classId, label: bmLabel.trim(), link: bmLink.trim(), note: bmNote.trim() || undefined });
      setAiNote("Bookmark saved for this class.");
    }
    setBmLabel("");
    setBmLink("");
    setBmNote("");
  }

  function startEditBookmark(id: string) {
    const b = libraryBookmarks.find((x) => x.id === id);
    if (!b) return;
    setEditingBm(id);
    setBmLabel(b.label);
    setBmLink(b.link);
    setBmNote(b.note ?? "");
    setLibTab("bookmarks");
  }

  function openBookmarkLink(link: string) {
    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.open(link, "_blank", "noreferrer");
      return;
    }
    window.location.href = link.startsWith("/") ? link : `/${link}`;
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
    if (!confirm(`Re-split “${ch.title}” into smaller units (best-guess)?`)) return;
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
    setAiNote(`Re-split into ${parts.length} units. Rename or merge as needed.`);
  }

  return (
    <div>
      <PageHeader
        title="Content Library"
        subtitle="Class + subject → books → chapters. Bookmarks stay with the class library."
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
            <button type="button" className="btn btn-secondary" onClick={() => setShowCdc(true)}>
              Import from CDC
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {libraryGroups.map((g) => (
          <button
            key={g.key}
            type="button"
            className={`btn ${group?.key === g.key ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setGroupKey(g.key);
              setSelectedChapter(null);
            }}
          >
            Class {g.grade} — {g.subject}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={`btn ${libTab === "content" ? "btn-primary" : "btn-secondary"}`} onClick={() => setLibTab("content")}>
          Books & chapters
        </button>
        <button type="button" className={`btn ${libTab === "bookmarks" ? "btn-primary" : "btn-secondary"}`} onClick={() => setLibTab("bookmarks")}>
          <Bookmark size={16} /> Bookmarks
        </button>
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
        <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={extractAllBooks}>
          <FolderTree size={16} /> Extract all books
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (!confirm(`Clear library for ${libraryLabel}?`)) return;
            for (const id of scopeClassIds) clearClassLibrary(id);
            setSelectedChapter(null);
            setAiNote(`Cleared library for ${libraryLabel}.`);
          }}
        >
          <Eraser size={16} /> Clear class library
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className={`space-y-3 ${libTab === "bookmarks" ? "hidden xl:block" : ""}`}>
          <div className="mb-1 text-sm font-semibold">Books · {libraryLabel}</div>
          <input className="input mb-2 max-w-xs" placeholder="Filter by tag…" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
          {filteredMaterials.length === 0 ? (
            <div className="surface p-6 text-sm text-ink-muted">No books here yet. Upload a textbook for this class.</div>
          ) : (
            filteredMaterials.map((m) => {
              return (
                <article key={m.id} className="surface mb-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText size={16} className="text-brand" />
                        <h3 className="font-semibold">{m.title}</h3>
                        <span className="badge uppercase">{m.type}</span>
                        {m.official || m.sourceKind === "cdc" ? <span className="badge">Official — CDC</span> : null}
                        
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {m.sizeLabel} · {formatDate(m.uploadedAt)}
                        {m.sourceUrl ? (
                          <>
                            {" · "}
                            <a className="text-brand underline" href={m.sourceUrl} target="_blank" rel="noreferrer">
                              Official source
                            </a>
                          </>
                        ) : null}
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
              );
            })
          )}

          <div className="flex items-center gap-2 pt-4 text-sm font-semibold">
            <FolderTree size={16} /> Chapter / unit cards ({lang === "ne" ? "नेपाली" : "EN"})
          </div>
          {classChapters.length === 0 ? (
            <div className="surface p-8 text-center text-ink-muted">
              No chapters yet. Upload a book or use <strong>Extract all books</strong>.
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
        </section>

        <aside className="space-y-4">
          <div className={`surface h-fit p-4 ${libTab !== "bookmarks" ? "hidden xl:block" : ""}`}>
            <h3 className="flex items-center gap-2 font-display text-xl">
              <Bookmark size={18} /> Bookmarks
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Label + link for {libraryLabel} — chapter path (e.g. /library/chapters/…) or any https URL.
            </p>
            <form className="mt-3 space-y-2" onSubmit={saveBookmark}>
              <input className="input" placeholder="Label (e.g. Left off at Ch 5)" value={bmLabel} onChange={(e) => setBmLabel(e.target.value)} required />
              <input className="input" placeholder="Link (/library/chapters/id or https://…)" value={bmLink} onChange={(e) => setBmLink(e.target.value)} required />
              <textarea className="textarea min-h-16" placeholder="Optional note" value={bmNote} onChange={(e) => setBmNote(e.target.value)} />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingBm ? "Update bookmark" : "Save bookmark"}
                </button>
                {editingBm && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingBm(null);
                      setBmLabel("");
                      setBmLink("");
                      setBmNote("");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <ul className="mt-4 space-y-2">
              {classBookmarks.map((b) => (
                <li key={b.id} className="rounded-xl border border-line bg-bg-elevated p-3 text-sm">
                  <button type="button" className="text-left font-semibold text-brand hover:underline" onClick={() => openBookmarkLink(b.link)}>
                    {b.label}
                  </button>
                  {b.note && <p className="mt-1 whitespace-pre-wrap text-ink-muted">{b.note}</p>}
                  <p className="mt-1 truncate text-xs text-ink-muted">{b.link}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => startEditBookmark(b.id)}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button type="button" className="btn btn-ghost text-xs text-danger" onClick={() => removeLibraryBookmark(b.id)}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </li>
              ))}
              {!classBookmarks.length && <li className="text-sm text-ink-muted">No bookmarks for this class yet.</li>}
            </ul>
          </div>

          <div className="surface h-fit p-4">
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
              <p className="mt-2 text-sm text-ink-muted">Select a chapter card, or open one to use Understand tools.</p>
            )}
            {aiNote && <div className="mt-4 whitespace-pre-wrap rounded-xl bg-brand-soft/50 p-3 text-sm">{aiNote}</div>}
          </div>
        </aside>
      </div>

      {showCdc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form
            className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void importFromCdc();
            }}
          >
            <h3 className="font-display text-2xl">Import from CDC</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Official Curriculum Development Centre (Nepal) textbooks — Grade 1–10, Nepali or English medium. On-demand per subject (not a bulk dump).
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Grade
              <select
                className="select mt-1"
                value={cdcGrade}
                onChange={(e) => {
                  const g = Number(e.target.value);
                  setCdcGrade(g);
                  const subs = listCdcSubjects(g, cdcMedium);
                  if (subs[0]) setCdcSubject(subs[0]);
                }}
              >
                {listCdcGrades().map((g) => (
                  <option key={g} value={g}>
                    Class {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Medium
              <select
                className="select mt-1"
                value={cdcMedium}
                onChange={(e) => {
                  const m = e.target.value as CdcMedium;
                  setCdcMedium(m);
                  const subs = listCdcSubjects(cdcGrade, m);
                  if (subs[0]) setCdcSubject(subs[0]);
                }}
              >
                <option value="en">English</option>
                <option value="ne">Nepali</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Subject
              <select className="select mt-1" value={cdcSubject} onChange={(e) => setCdcSubject(e.target.value)}>
                {cdcSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-xs text-ink-muted">
              Imports into <strong>{libraryLabel}</strong>. If the PDF URL fails (CDC rotates files), we still create Official unit cards and link you to{" "}
              <a className="text-brand underline" href={CDC_PORTAL} target="_blank" rel="noreferrer">
                moecdc.gov.np
              </a>
              .
            </p>
            {cdcMsg && <p className="mt-2 text-sm text-danger">{cdcMsg}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCdc(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!!busy || !cdcSubjects.length}>
                {busy === "cdc" ? "Importing…" : "Import"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onSubmit={handleUpload}>
            <h3 className="font-display text-2xl">Upload textbook</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Uploads go into {libraryLabel}. Paste TOC text if the PDF has no extractable text.
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
                placeholder={"Paste TOC (Unit Topic Page), e.g.\n1 Scientific Learning 1\n2 Information and Communication Technology 18\n…\nor full chapter text"}
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
