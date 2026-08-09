"use client";

import { PageHeader } from "@/components/PageHeader";
import { PdfViewer } from "@/components/PdfViewer";
import {
  generateSyllabusContent,
  parseChaptersFromText,
  splitTextbookIntoChapters,
  translateChapterLocale,
  viewChapter,
} from "@/lib/ai";
import {
  findContentEntry,
  hasVerifiedUnits,
  listContentGrades,
  listContentSubjects,
  listSourceIds,
  SOURCE_META,
  type ContentMedium,
  type ContentSourceId,
} from "@/lib/content-sources";
import {
  duplicateMaterialIds,
  findDuplicateMaterial,
  formatBookTitle,
  materialFingerprint,
  parseSyllabusUnits,
  sourceBadgeFor,
  subjectAccent,
} from "@/lib/library-format";
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
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function Badge({ label, tone }: { label: string; tone: string }) {
  const cls =
    tone === "official"
      ? "bg-brand-soft text-brand-deep"
      : tone === "ai"
        ? "bg-accent-soft text-accent"
        : tone === "syllabus"
          ? "bg-bg-elevated text-ink"
          : tone === "video"
            ? "bg-danger-soft text-danger"
            : "bg-bg-elevated text-ink-muted";
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export default function LibraryPage() {
  const materials = useAppStore((s) => s.materials);
  const chapters = useAppStore((s) => s.chapters);
  const classes = useAppStore((s) => s.classes);
  const enabledGrades = useAppStore((s) => s.enabledGrades);
  const gradeOrder = useAppStore((s) => s.gradeOrder);
  const libraryBookmarks = useAppStore((s) => s.libraryBookmarks);
  const addMaterial = useAppStore((s) => s.addMaterial);
  const updateMaterial = useAppStore((s) => s.updateMaterial);
  const removeMaterial = useAppStore((s) => s.removeMaterial);
  const addChapters = useAppStore((s) => s.addChapters);
  const replaceChaptersForMaterial = useAppStore((s) => s.replaceChaptersForMaterial);
  const updateChapter = useAppStore((s) => s.updateChapter);
  const removeChapter = useAppStore((s) => s.removeChapter);
  const clearClassLibrary = useAppStore((s) => s.clearClassLibrary);
  const addClass = useAppStore((s) => s.addClass);
  const addLibraryBookmark = useAppStore((s) => s.addLibraryBookmark);
  const updateLibraryBookmark = useAppStore((s) => s.updateLibraryBookmark);
  const removeLibraryBookmark = useAppStore((s) => s.removeLibraryBookmark);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);

  const activeClasses = useMemo(
    () =>
      classes.filter((c) => !c.deletedAt && (enabledGrades.length === 0 || enabledGrades.includes(String(c.grade)))),
    [classes, enabledGrades]
  );

  const libraryGroups = useMemo(() => {
    const map = new Map<string, { key: string; grade: string; subject: string; classIds: string[]; primaryId: string }>();
    for (const c of activeClasses) {
      const key = `${c.grade}::${c.subject}`;
      const cur = map.get(key);
      if (cur) cur.classIds.push(c.id);
      else map.set(key, { key, grade: c.grade, subject: c.subject, classIds: [c.id], primaryId: c.id });
    }
    const order = new Map(gradeOrder.map((g, i) => [g, i]));
    return [...map.values()].sort(
      (a, b) =>
        (order.get(a.grade) ?? 99) - (order.get(b.grade) ?? 99) ||
        Number(a.grade) - Number(b.grade) ||
        a.subject.localeCompare(b.subject)
    );
  }, [activeClasses, gradeOrder]);

  const gradesInRail = useMemo(() => {
    const grades = [...new Set(libraryGroups.map((g) => g.grade))];
    const order = new Map(gradeOrder.map((g, i) => [g, i]));
    return grades.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || Number(a) - Number(b));
  }, [libraryGroups, gradeOrder]);

  const defaultKey =
    libraryGroups.find((g) => g.grade === "8" && /science/i.test(g.subject))?.key ?? libraryGroups[0]?.key ?? "";
  const [groupKey, setGroupKey] = useState(defaultKey);
  const group = libraryGroups.find((g) => g.key === groupKey) ?? libraryGroups[0];
  const scopeClassIds = group?.classIds ?? [];
  const classId = group?.primaryId ?? "";
  const libraryLabel = group ? `Class ${group.grade} — ${group.subject}` : "Class";
  const subjectName = group?.subject ?? "General";

  const [libTab, setLibTab] = useState<"content" | "bookmarks">("content");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [lang, setLang] = useState<ContentLang>("en");
  const [tagFilter, setTagFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [aiNote, setAiNote] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showSyllabusUpload, setShowSyllabusUpload] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAiGen, setShowAiGen] = useState(false);
  const [showReassign, setShowReassign] = useState<Material | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTags, setUploadTags] = useState("textbook, core");
  const [uploadLang, setUploadLang] = useState<ContentLang>("en");
  const [splitOnUpload, setSplitOnUpload] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [syllabusPaste, setSyllabusPaste] = useState("");
  const [viewer, setViewer] = useState<Material | null>(null);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [bmLabel, setBmLabel] = useState("");
  const [bmLink, setBmLink] = useState("");
  const [bmNote, setBmNote] = useState("");
  const [editingBm, setEditingBm] = useState<string | null>(null);

  const [impSource, setImpSource] = useState<ContentSourceId>("cdc");
  const [impGrade, setImpGrade] = useState(8);
  const [impMedium, setImpMedium] = useState<ContentMedium>("en");
  const [impSubject, setImpSubject] = useState("Science");
  const [impMsg, setImpMsg] = useState("");

  const [aiMode, setAiMode] = useState<"full" | "free">("full");
  const [aiFree, setAiFree] = useState("");
  const [aiMsg, setAiMsg] = useState("");

  const [reassignKey, setReassignKey] = useState("");

  const impSubjects = useMemo(
    () => listContentSubjects(impSource, impGrade, impMedium),
    [impSource, impGrade, impMedium]
  );

  useEffect(() => {
    if (impSubjects.length && !impSubjects.includes(impSubject)) {
      setImpSubject(impSubjects[0]);
    }
  }, [impSubjects, impSubject]);

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

  function ensureLibraryClass(grade: string, subject: string): string {
    const existing = activeClasses.find((c) => c.grade === grade && c.subject === subject);
    if (existing) return existing.id;
    const created = addClass({ grade, section: "A", subject, schedule: "TBD" });
    setGroupKey(`${grade}::${subject}`);
    return created.id;
  }

  function subjectIdFor(name: string, fileHint = ""): string {
    const blob = `${name} ${fileHint}`.toLowerCase();
    if (/science|technology|विज्ञान/.test(blob)) return "science";
    if (/social|सामाजिक/.test(blob)) return "social";
    if (/math|गणित/.test(blob)) return "math";
    return "general";
  }

  async function runChapterSplit(
    materialId: string,
    targetClassId: string,
    fileName: string,
    title: string,
    text: string,
    subjectHint: string,
    bookLang: ContentLang
  ): Promise<Chapter[]> {
    const subjectId = subjectIdFor(subjectHint, fileName);
    const detected = await splitTextbookIntoChapters(fileName, text, {
      classId: targetClassId,
      subjectId,
      materialId,
      lang: bookLang,
      sourceBook: title,
    });
    const withIds = detected.map((c) => ({
      ...c,
      id: uid("ch"),
      classId: targetClassId,
      sourceBook: title,
      materialId,
    })) as Chapter[];
    if (!withIds.length) {
      withIds.push({
        id: uid("ch"),
        subjectId,
        classId: targetClassId,
        materialId,
        title: formatBookTitle(title),
        unitNumber: 1,
        lang: bookLang,
        summary: "Couldn’t split this file into units automatically. Paste TOC or chapter text, then Extract again.",
        keyTerms: [],
        objectives: ["Paste unit text", "Re-extract chapters"],
        discussionQuestions: ["Which unit will you teach first?"],
        body: text.slice(0, 4000) || `Book: ${title}`,
        wordCount: 20,
        pageStart: 1,
        pageEnd: 10,
        sourceBook: title,
      });
    }
    replaceChaptersForMaterial(materialId, withIds);
    return withIds;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) {
      setAiNote("Select a Class + Subject in the left rail first.");
      return;
    }
    if (!uploadFile && !uploadTitle.trim() && !pasteText.trim()) {
      setAiNote("Choose a file, enter a title, or paste book text.");
      return;
    }

    const fileName = uploadFile?.name ?? `${(uploadTitle || "textbook").replace(/\s+/g, "-").toLowerCase()}.txt`;
    const sizeBytes = uploadFile?.size ?? pasteText.length;
    const fp = materialFingerprint(fileName, sizeBytes);
    const dup = findDuplicateMaterial(materials, scopeClassIds, fp);
    if (dup) {
      if (
        !confirm(
          `“${formatBookTitle(dup.title)}” looks like the same file already in ${libraryLabel}. Replace the existing entry? (Cancel keeps both.)`
        )
      ) {
        setAiNote("Upload cancelled — duplicate not added.");
        return;
      }
      removeMaterial(dup.id);
    }

    setBusy("upload");
    setProgress({ pct: 8, label: "Reading file…" });
    const title = formatBookTitle(uploadTitle.trim() || fileName.replace(/\.[^.]+$/, ""));
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

    setProgress({ pct: 45, label: `Saving to ${libraryLabel}…` });
    const materialId = uid("m");
    const material: Material = {
      id: materialId,
      title,
      type,
      classId,
      subject: subjectName,
      chapterId: selectedChapter ?? undefined,
      tags: uploadTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      uploadedAt: new Date().toISOString(),
      sizeLabel: uploadFile ? formatBytes(uploadFile.size) : formatBytes(extracted.length),
      contentPreview: (extracted || `Uploaded: ${title}`).slice(0, 500),
      extractedText: extracted || undefined,
      dataUrl,
      mime: uploadFile?.type || (type === "pdf" ? "application/pdf" : undefined),
      lang: uploadLang,
      sourceKind: "upload",
      sourceLabel: "Uploaded by you",
      fileFingerprint: fp,
      fileSizeBytes: sizeBytes,
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

    try {
      if (splitOnUpload && (extracted || type === "pdf" || type === "other")) {
        setBusy("split");
        setProgress({ pct: 62, label: "Detecting chapter boundaries…" });
        const withIds = await runChapterSplit(
          materialId,
          classId,
          fileName,
          title,
          extracted,
          subjectName,
          uploadLang
        );
        setProgress({ pct: 88, label: "Writing chapter cards…" });
        if (withIds[0]) setSelectedChapter(withIds[0].id);
        setLang(uploadLang);
        setAiNote(
          extracted.trim().length > 40
            ? `Saved “${title}” under ${libraryLabel}. Split into ${withIds.length} units.`
            : `Saved “${title}” under ${libraryLabel}. PDF text was sparse — built ${withIds.length} unit card(s). Paste TOC text and Extract again if needed.`
        );
      } else {
        setAiNote(`Saved “${title}” under ${libraryLabel}. Use Extract chapters to build unit cards.`);
      }
    } catch (err) {
      setAiNote(
        `Saved “${title}” but chapter extract failed: ${err instanceof Error ? err.message : "unknown error"}. Try Extract chapters again.`
      );
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
    setBusy(`split-${m.id}`);
    setProgress({ pct: 30, label: `Extracting “${formatBookTitle(m.title)}”…` });
    try {
      const text = m.extractedText || m.contentPreview || "";
      const fileName = m.versions.at(-1)?.fileName ?? m.title;
      const withIds = await runChapterSplit(
        m.id,
        m.classId,
        fileName,
        m.title,
        text,
        m.subject || subjectName,
        m.lang ?? lang
      );
      setProgress({ pct: 100, label: "Done" });
      if (withIds[0]) setSelectedChapter(withIds[0].id);
      setLibTab("content");
      setAiNote(`Created ${withIds.length} chapter card(s) from “${formatBookTitle(m.title)}”.`);
    } catch (err) {
      setAiNote(
        `Extract failed for “${formatBookTitle(m.title)}”: ${
          err instanceof Error ? err.message : "unknown"
        }. Couldn’t read text from this PDF — try pasting a TOC, re-uploading, or use Upload syllabus / Generate with AI.`
      );
    } finally {
      setBusy(null);
      setTimeout(() => setProgress(null), 500);
    }
  }

  async function extractAllBooks() {
    const books = materials.filter((m) => !m.deletedAt && scopeClassIds.includes(m.classId));
    if (!books.length) {
      setAiNote("No books in this class yet — upload or import first.");
      return;
    }
    setBusy("split");
    let total = 0;
    const errors: string[] = [];
    for (let i = 0; i < books.length; i++) {
      const m = books[i];
      setProgress({
        pct: Math.round(((i + 0.5) / books.length) * 100),
        label: `Extracting “${formatBookTitle(m.title)}” (${i + 1}/${books.length})…`,
      });
      try {
        const text = m.extractedText || m.contentPreview || "";
        const fileName = m.versions.at(-1)?.fileName ?? m.title;
        const withIds = await runChapterSplit(
          m.id,
          m.classId,
          fileName,
          m.title,
          text,
          m.subject || subjectName,
          m.lang ?? lang
        );
        total += withIds.length;
      } catch (err) {
        errors.push(`${m.title}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    setProgress({ pct: 100, label: "Done" });
    setAiNote(
      errors.length
        ? `Extracted ${total} unit(s). Issues: ${errors.join("; ")}`
        : `Extracted ${total} unit card(s) across ${books.length} book(s) for ${libraryLabel}.`
    );
    setBusy(null);
    setTimeout(() => setProgress(null), 700);
  }

  function removeDuplicates() {
    const ids = duplicateMaterialIds(materials, scopeClassIds);
    if (!ids.length) {
      setAiNote("No duplicates found in this class library.");
      return;
    }
    if (!confirm(`Remove ${ids.length} duplicate book(s) in ${libraryLabel}? Newest copy of each file is kept.`)) return;
    for (const id of ids) removeMaterial(id);
    setAiNote(`Removed ${ids.length} duplicate book(s).`);
  }

  function reassignMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!showReassign || !reassignKey) return;
    const target = libraryGroups.find((g) => g.key === reassignKey);
    if (!target) return;
    const m = showReassign;
    updateMaterial(m.id, { classId: target.primaryId, subject: target.subject });
    const linked = chapters.filter((c) => c.materialId === m.id);
    for (const ch of linked) updateChapter(ch.id, { classId: target.primaryId });
    setGroupKey(target.key);
    setShowReassign(null);
    setAiNote(`Moved “${formatBookTitle(m.title)}” → Class ${target.grade} — ${target.subject}.`);
  }

  async function importContent() {
    const entry = findContentEntry(impSource, impGrade, impSubject, impMedium);
    if (!entry) {
      setImpMsg("No catalog entry for that selection. Try another combination or open the source site.");
      return;
    }
    const targetClassId = ensureLibraryClass(String(impGrade), entry.subject);
    setBusy("import");
    setImpMsg("");
    setProgress({ pct: 15, label: `Contacting ${SOURCE_META[impSource].name}…` });

    let dataUrl: string | undefined;
    let extracted = "";
    let fetchError = "";

    if (entry.pdfUrl) {
      try {
        const res = await fetch(`/api/cdc/fetch?url=${encodeURIComponent(entry.pdfUrl)}`);
        const data = (await res.json()) as { ok?: boolean; dataUrl?: string; textHint?: string; error?: string };
        if (res.ok && data.dataUrl) {
          dataUrl = data.dataUrl;
          extracted = data.textHint || "";
        } else fetchError = data.error || `Could not download (${res.status}).`;
      } catch (err) {
        fetchError = err instanceof Error ? err.message : "Network error";
      }
    } else {
      fetchError = "No direct file URL on file (links change by year) — creating catalog unit cards + source link.";
    }

    setProgress({ pct: 55, label: "Building chapter cards…" });
    const materialId = uid("m");
    let chaptersOut: Chapter[] = [];

    if (extracted.trim().length > 80) {
      chaptersOut = await runChapterSplit(
        materialId,
        targetClassId,
        entry.title,
        entry.title,
        extracted,
        entry.subject,
        entry.medium === "ne" ? "ne" : "en"
      );
    } else if (entry.unitTitles?.length) {
      chaptersOut = entry.unitTitles.map((title, i) => ({
        id: uid("ch"),
        subjectId: subjectIdFor(entry.subject),
        classId: targetClassId,
        materialId,
        title,
        unitNumber: i + 1,
        lang: entry.medium === "ne" ? "ne" : "en",
        summary: `${entry.badge} unit — ${title}. Open the source link for full material.`,
        keyTerms: [],
        objectives: ["Open official / source material", "Note key vocabulary"],
        discussionQuestions: [`What is the main idea of “${title}”?`],
        body: `Unit ${i + 1}: ${title}\n\nImported from ${entry.badge}. Source: ${entry.sourcePageUrl}`,
        wordCount: 40,
        pageStart: i * 20 + 1,
        pageEnd: (i + 1) * 20,
        sourceBook: entry.title,
      }));
      replaceChaptersForMaterial(materialId, chaptersOut);
    } else {
      // No verified chapter list — don't invent units; one card + link to official PDF/syllabus
      chaptersOut = [
        {
          id: uid("ch"),
          subjectId: subjectIdFor(entry.subject),
          classId: targetClassId,
          materialId,
          title: `${entry.subject} — Class ${entry.grade} (outline pending)`,
          unitNumber: 1,
          lang: entry.medium === "ne" ? "ne" : "en",
          summary:
            "Subject listed under CDC structure. Chapter titles are not hardcoded — open the official source, or use Upload syllabus / paste a TOC to build unit cards accurately.",
          keyTerms: [],
          objectives: [
            "Open the official CDC / source page",
            "Upload syllabus or paste unit titles",
            "Avoid teaching from guessed chapter lists",
          ],
          discussionQuestions: ["Which official units will you teach first?"],
          body: `${entry.title}\n\n${entry.badge}\nSource: ${entry.sourcePageUrl}\n\nTeachDesk only auto-fills chapter cards when a verified unit list exists (currently: Class 8 Science EN). For other grades, import the subject shell here, then Upload syllabus or Extract from a textbook.`,
          wordCount: 40,
          pageStart: 1,
          pageEnd: 2,
          sourceBook: entry.title,
        },
      ];
      replaceChaptersForMaterial(materialId, chaptersOut);
    }

    addMaterial({
      id: materialId,
      title: entry.title,
      type: entry.source === "dlc" ? "video" : "pdf",
      classId: targetClassId,
      subject: entry.subject,
      tags: [entry.source, entry.medium, `grade-${entry.grade}`],
      uploadedAt: new Date().toISOString(),
      sizeLabel: dataUrl ? formatBytes(Math.round((dataUrl.length * 3) / 4)) : "Catalog import",
      contentPreview: (extracted || entry.title).slice(0, 500),
      extractedText: extracted || undefined,
      dataUrl,
      mime: entry.source === "dlc" ? "text/uri-list" : "application/pdf",
      lang: entry.medium === "ne" ? "ne" : "en",
      sourceKind: entry.source,
      sourceLabel: entry.badge,
      sourceUrl: entry.sourcePageUrl,
      official: entry.official,
      versions: [
        {
          id: uid("mv"),
          version: 1,
          uploadedAt: new Date().toISOString(),
          note: entry.badge,
          fileName: `${entry.id}.pdf`,
        },
      ],
    });

    setProgress({ pct: 100, label: "Done" });
    setBusy(null);
    setTimeout(() => setProgress(null), 600);
    setShowImport(false);
    setGroupKey(`${impGrade}::${entry.subject}`);
    setAiNote(
      fetchError
        ? `Imported “${entry.title}” (${chaptersOut.length} units). Note: ${fetchError} Verify: ${entry.sourcePageUrl}`
        : `Imported “${entry.title}” · ${chaptersOut.length} unit(s) · ${entry.badge}`
    );
    if (fetchError) setImpMsg(`${fetchError} — ${SOURCE_META[impSource].portal}`);
  }

  async function generateWithAi(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !group) {
      setAiMsg("Select a Class + Subject first.");
      return;
    }
    if (aiMode === "free" && !aiFree.trim()) {
      setAiMsg("Enter a free-text request, or switch to full syllabus.");
      return;
    }
    setBusy("ai");
    setAiMsg("");
    setProgress({ pct: 20, label: "Generating with AI…" });
    try {
      const result = await generateSyllabusContent({
        grade: group.grade,
        subject: group.subject,
        medium: lang,
        mode: aiMode,
        freeText: aiFree,
      });
      setProgress({ pct: 70, label: "Creating chapter cards…" });
      const materialId = uid("m");
      const chaptersOut: Chapter[] = result.units.map((u, i) => ({
        id: uid("ch"),
        subjectId: subjectIdFor(group.subject),
        classId,
        materialId,
        title: u.title,
        unitNumber: i + 1,
        lang,
        summary: u.topics.slice(0, 3).join(" · ") || u.title,
        keyTerms: u.topics.slice(0, 5),
        objectives: ["Review AI draft before teaching", "Adjust topics to match your class"],
        discussionQuestions: [`What should students take away from “${u.title}”?`],
        body: u.body,
        wordCount: u.body.split(/\s+/).length,
        pageStart: i * 10 + 1,
        pageEnd: (i + 1) * 10,
        sourceBook: result.title,
      }));
      addMaterial({
        id: materialId,
        title: result.title,
        type: "other",
        classId,
        subject: group.subject,
        tags: ["ai", "syllabus", `grade-${group.grade}`],
        uploadedAt: new Date().toISOString(),
        sizeLabel: `${chaptersOut.length} units`,
        contentPreview: chaptersOut.map((c) => c.title).join(" · ").slice(0, 500),
        extractedText: chaptersOut.map((c) => `Unit ${c.unitNumber}: ${c.title}\n${c.body}`).join("\n\n"),
        lang,
        sourceKind: "ai",
        sourceLabel: "AI-generated",
        disclaimer: "Review before teaching — AI-generated content, not an official CDC textbook.",
        versions: [
          {
            id: uid("mv"),
            version: 1,
            uploadedAt: new Date().toISOString(),
            note: "AI-generated syllabus",
            fileName: `${result.title}.txt`,
          },
        ],
      });
      replaceChaptersForMaterial(materialId, chaptersOut);
      if (chaptersOut[0]) setSelectedChapter(chaptersOut[0].id);
      setShowAiGen(false);
      setAiNote(`AI created “${result.title}” with ${chaptersOut.length} chapters under ${libraryLabel}. Review before teaching.`);
    } catch (err) {
      setAiMsg(err instanceof Error ? err.message : "AI generation failed. Retry?");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function handleSyllabusUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) {
      setAiNote("Select a Class + Subject first.");
      return;
    }
    setBusy("syllabus");
    setProgress({ pct: 20, label: "Reading syllabus…" });
    let text = syllabusPaste.trim();
    const fileName = syllabusFile?.name ?? "syllabus.txt";
    if (syllabusFile && !text) {
      text = await extractTextbookText(syllabusFile);
      if (!text && syllabusFile.name.match(/\.txt|\.md$/i)) text = await syllabusFile.text();
    }
    if (text.trim().length < 20) {
      setAiNote("Couldn’t read enough syllabus text — paste the outline or upload a TXT.");
      setBusy(null);
      setProgress(null);
      return;
    }
    const units = parseSyllabusUnits(text);
    const materialId = uid("m");
    const title = formatBookTitle(syllabusFile?.name.replace(/\.[^.]+$/, "") || `Syllabus — ${libraryLabel}`);
    const chaptersOut: Chapter[] = units.map((u, i) => ({
      id: uid("ch"),
      subjectId: subjectIdFor(subjectName),
      classId,
      materialId,
      title: u.title,
      unitNumber: i + 1,
      lang: uploadLang,
      summary: u.topics.slice(0, 4).join(" · ") || `Syllabus unit: ${u.title}`,
      keyTerms: u.topics.slice(0, 6),
      objectives: ["Attach textbook later or Generate with AI to expand", "Adjust titles to match your scheme"],
      discussionQuestions: [`Which topics in “${u.title}” need most class time?`],
      body: `Unit ${i + 1}: ${u.title}\n\nTopics from syllabus:\n${
        u.topics.map((t) => `• ${t}`).join("\n") || "• (Add topics)"
      }\n\nFrom syllabus — expand via textbook upload, Import Content, or Generate with AI per chapter.`,
      wordCount: 30 + u.topics.join(" ").split(/\s+/).length,
      pageStart: i + 1,
      pageEnd: i + 1,
      sourceBook: title,
    }));

    let dataUrl: string | undefined;
    try {
      if (syllabusFile && syllabusFile.size <= 4_000_000) dataUrl = await fileToDataUrl(syllabusFile);
    } catch {
      /* ignore */
    }

    addMaterial({
      id: materialId,
      title,
      type: syllabusFile ? extToMaterialType(fileName) : "other",
      classId,
      subject: subjectName,
      tags: ["syllabus", `grade-${group?.grade}`],
      uploadedAt: new Date().toISOString(),
      sizeLabel: syllabusFile ? formatBytes(syllabusFile.size) : formatBytes(text.length),
      contentPreview: text.slice(0, 500),
      extractedText: text,
      dataUrl,
      mime: syllabusFile?.type,
      lang: uploadLang,
      sourceKind: "syllabus",
      sourceLabel: "From syllabus",
      fileFingerprint: syllabusFile ? materialFingerprint(fileName, syllabusFile.size) : undefined,
      fileSizeBytes: syllabusFile?.size,
      versions: [
        {
          id: uid("mv"),
          version: 1,
          uploadedAt: new Date().toISOString(),
          note: "Syllabus upload",
          fileName,
        },
      ],
    });
    replaceChaptersForMaterial(materialId, chaptersOut);
    if (chaptersOut[0]) setSelectedChapter(chaptersOut[0].id);
    setShowSyllabusUpload(false);
    setSyllabusFile(null);
    setSyllabusPaste("");
    setBusy(null);
    setProgress(null);
    setAiNote(
      `Syllabus → ${chaptersOut.length} chapter card(s) under ${libraryLabel}. Expand units with textbook attach or Generate with AI.`
    );
  }

  function saveBookmark(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !bmLabel.trim() || !bmLink.trim()) {
      setAiNote("Bookmark needs a label and a link.");
      return;
    }
    if (editingBm) {
      updateLibraryBookmark(editingBm, { label: bmLabel.trim(), link: bmLink.trim(), note: bmNote.trim() || undefined });
      setEditingBm(null);
      setAiNote("Bookmark updated.");
    } else {
      addLibraryBookmark({ classId, label: bmLabel.trim(), link: bmLink.trim(), note: bmNote.trim() || undefined });
      setAiNote("Bookmark saved.");
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
    setAiNote(to === "ne" ? "Nepali version saved." : "English fields updated.");
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
    updateChapter(ch.id, {
      title: `${ch.title} / ${next.title}`,
      body,
      summary: body.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 280),
      wordCount: body.split(/\s+/).filter(Boolean).length,
      pageEnd: next.pageEnd ?? ch.pageEnd,
      aiCache: undefined,
    });
    removeChapter(next.id);
    setAiNote("Chapters merged.");
  }

  function resplitChapter(ch: Chapter) {
    const text = ch.body || ch.summary || "";
    if (text.trim().length < 40) {
      setAiNote("Not enough text to re-split.");
      return;
    }
    if (!confirm(`Re-split “${ch.title}”?`)) return;
    const parts = parseChaptersFromText(text, {
      classId: ch.classId,
      subjectId: subjectIdFor(subjectName),
      materialId: ch.materialId,
      lang: ch.lang ?? lang,
      sourceBook: ch.sourceBook,
    });
    if (parts.length <= 1) {
      setAiNote("Could not find clearer boundaries.");
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
    setAiNote(`Re-split into ${parts.length} units.`);
  }

  const materialSource = (m: Material) => {
    const mat = materials.find((x) => x.id === m.id);
    return mat ? sourceBadgeFor(mat) : sourceBadgeFor(m);
  };

  return (
    <div>
      <PageHeader
        title="Content Library"
        subtitle="Class + subject → books → chapters. Import, generate, or upload."
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
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Class / subject rail */}
        <nav className="surface h-fit max-h-[70vh] overflow-y-auto p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Classes</p>
          {gradesInRail.map((grade) => (
            <div key={grade} className="mb-3">
              <div className="mb-1 text-xs font-bold text-ink-muted">Grade {grade}</div>
              <div className="flex flex-col gap-1">
                {libraryGroups
                  .filter((g) => g.grade === grade)
                  .map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                        group?.key === g.key ? "bg-brand text-white" : "bg-bg-elevated hover:bg-brand-soft"
                      }`}
                      onClick={() => {
                        setGroupKey(g.key);
                        setSelectedChapter(null);
                      }}
                    >
                      {g.subject}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {!libraryGroups.length && <p className="text-sm text-ink-muted">No classes yet.</p>}
        </nav>

        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="font-display text-2xl">{libraryLabel}</h2>
              <p className="text-sm text-ink-muted">Books & chapters for this class · subject</p>
            </div>
            <div className="flex rounded-xl border border-line bg-bg-elevated p-1">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${libTab === "content" ? "bg-surface shadow-sm" : "text-ink-muted"}`}
                onClick={() => setLibTab("content")}
              >
                Books & chapters
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${libTab === "bookmarks" ? "bg-surface shadow-sm" : "text-ink-muted"}`}
                onClick={() => setLibTab("bookmarks")}
              >
                <span className="inline-flex items-center gap-1">
                  <Bookmark size={14} /> Bookmarks
                </span>
              </button>
            </div>
          </div>

          {libTab === "content" && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
                  <Upload size={16} /> Upload textbook
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowImport(true)}>
                  Import Content
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAiGen(true)}>
                  <Wand2 size={16} /> Generate with AI
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSyllabusUpload(true)}>
                  <FileText size={16} /> Upload syllabus
                </button>
              </div>
              <div className="mx-1 hidden h-8 w-px bg-line sm:block" />
              <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={extractAllBooks}>
                <FolderTree size={16} /> Extract all books
              </button>
              <button type="button" className="btn btn-secondary" onClick={removeDuplicates}>
                Remove duplicates
              </button>
              <button
                type="button"
                className="btn btn-ghost text-danger"
                onClick={() => {
                  if (!confirm(`Clear all books & chapters for ${libraryLabel}?`)) return;
                  for (const id of scopeClassIds) clearClassLibrary(id);
                  setSelectedChapter(null);
                  setAiNote(`Cleared library for ${libraryLabel}.`);
                }}
              >
                <Eraser size={16} /> Clear class library
              </button>
            </div>
          )}

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

          {aiNote && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-brand-soft/50 p-3 text-sm">
              <p className="whitespace-pre-wrap">{aiNote}</p>
              <button type="button" className="btn btn-ghost text-xs" onClick={() => setAiNote("")}>
                Dismiss
              </button>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <section className={`space-y-3 ${libTab === "bookmarks" ? "hidden xl:block" : ""}`}>
              <input
                className="input mb-1 max-w-xs"
                placeholder="Filter by tag…"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              />
              {filteredMaterials.length === 0 ? (
                <div className="surface p-6 text-sm text-ink-muted">
                  No books here yet. Upload, Import Content, Generate with AI, or Upload syllabus.
                </div>
              ) : (
                filteredMaterials.map((m) => {
                  const badge = materialSource(m);
                  const display = formatBookTitle(m.title);
                  return (
                    <article key={m.id} className="surface overflow-hidden">
                      <div className="flex gap-0">
                        <div className="flex w-14 shrink-0 items-center justify-center bg-bg-elevated">
                          <FileText size={22} style={{ color: subjectAccent(m.subject || subjectName) }} />
                        </div>
                        <div className="min-w-0 flex-1 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold leading-snug">{display}</h3>
                                <Badge label={badge.label} tone={badge.tone} />
                              </div>
                              <p className="mt-1 text-xs text-ink-muted">
                                {m.sizeLabel} · {formatDate(m.uploadedAt)} · {m.subject || subjectName}
                                {m.sourceUrl ? (
                                  <>
                                    {" · "}
                                    <a className="text-brand underline" href={m.sourceUrl} target="_blank" rel="noreferrer">
                                      Source
                                    </a>
                                  </>
                                ) : null}
                              </p>
                              {m.disclaimer && <p className="mt-2 text-xs text-accent">{m.disclaimer}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className="btn btn-secondary" onClick={() => setViewer(m)}>
                                <BookOpen size={14} /> View
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={!!busy}
                                onClick={() => reExtract(m)}
                              >
                                {busy === `split-${m.id}` ? "Extracting…" : "Extract"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                  setShowReassign(m);
                                  setReassignKey(groupKey);
                                }}
                              >
                                Move
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost text-danger"
                                onClick={() => {
                                  if (confirm(`Delete “${display}”?`)) removeMaterial(m.id);
                                }}
                              >
                                <Trash2 size={14} />
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
                                  updateMaterial(m.id, {
                                    extractedText: e.target.value,
                                    contentPreview: e.target.value.slice(0, 500),
                                  })
                                }
                              />
                            </details>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}

              <div className="flex items-center gap-2 pt-4 text-sm font-semibold">
                <FolderTree size={16} /> Chapter cards ({lang === "ne" ? "नेपाली" : "EN"}) · {classChapters.length}
              </div>
              {classChapters.length === 0 ? (
                <div className="surface p-8 text-center text-ink-muted">
                  No chapters yet. Use <strong>Extract</strong> on a book, or Upload syllabus / Generate with AI.
                  {filteredMaterials.length > 0 && (
                    <div className="mt-3">
                      <button type="button" className="btn btn-primary" disabled={!!busy} onClick={extractAllBooks}>
                        Extract all books now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                classChapters.map((ch) => {
                  const v = viewChapter(ch, lang);
                  const words = ch.wordCount ?? ch.body?.trim().split(/\s+/).filter(Boolean).length ?? 0;
                  const pages = ch.pageStart && ch.pageEnd ? `pp. ${ch.pageStart}–${ch.pageEnd}` : "Pages —";
                  const selected = selectedChapter === ch.id;
                  const srcMat = materials.find((m) => m.id === ch.materialId);
                  const badge = srcMat ? sourceBadgeFor(srcMat) : null;
                  const accent = subjectAccent(subjectName);
                  return (
                    <article
                      key={ch.id}
                      className={`surface cursor-pointer overflow-hidden ${selected ? "ring-2 ring-brand/40" : ""}`}
                      onClick={() => setSelectedChapter(ch.id)}
                    >
                      <div className="h-1.5 w-full" style={{ background: accent }} />
                      <div className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">
                                Chapter {ch.unitNumber}: {v.title}
                              </h3>
                              {badge && <Badge label={badge.label} tone={badge.tone} />}
                            </div>
                            <p className="mt-1 text-xs text-ink-muted">
                              {pages} · {words} words · {ch.sourceBook || "Library book"}
                            </p>
                            <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{v.summary}</p>
                          </div>
                          <div className="flex flex-wrap gap-2" onClick={(ev) => ev.stopPropagation()}>
                            <Link className="btn btn-primary" href={`/library/chapters/${ch.id}`}>
                              Open
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
                              <Pencil size={14} /> Edit
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => mergeWithNext(ch)}>
                              Merge
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
                <p className="mt-1 text-xs text-ink-muted">For {libraryLabel}</p>
                <form className="mt-3 space-y-2" onSubmit={saveBookmark}>
                  <input className="input" placeholder="Label" value={bmLabel} onChange={(e) => setBmLabel(e.target.value)} required />
                  <input className="input" placeholder="Link" value={bmLink} onChange={(e) => setBmLink(e.target.value)} required />
                  <textarea className="textarea min-h-16" placeholder="Note" value={bmNote} onChange={(e) => setBmNote(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary flex-1">
                      {editingBm ? "Update" : "Save"}
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
                      {b.note && <p className="mt-1 text-ink-muted">{b.note}</p>}
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="btn btn-ghost text-xs" onClick={() => startEditBookmark(b.id)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-ghost text-xs text-danger" onClick={() => removeLibraryBookmark(b.id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                  {!classBookmarks.length && <li className="text-sm text-ink-muted">No bookmarks yet.</li>}
                </ul>
              </div>

              <div className="surface h-fit p-4">
                <h3 className="font-display text-xl">{viewed ? viewed.title : "Chapter tools"}</h3>
                {viewed && chapter ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-ink-muted">{viewed.summary}</p>
                    <Link className="btn btn-primary w-full" href={`/library/chapters/${chapter.id}`}>
                      Open full chapter
                    </Link>
                    <button type="button" className="btn btn-secondary w-full" disabled={!!busy} onClick={() => runTranslate(lang === "en" ? "ne" : "en")}>
                      <Languages size={16} />
                      {busy === "translate" ? "Translating…" : lang === "en" ? "Translate → नेपाली" : "Translate → English"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">Select a chapter card to use tools.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Upload textbook */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onSubmit={handleUpload}>
            <h3 className="font-display text-2xl">Upload textbook</h3>
            <p className="mt-2 rounded-xl bg-brand-soft/60 px-3 py-2 text-sm font-semibold">
              Uploading to: {libraryLabel}
            </p>
            <p className="mt-1 text-xs text-ink-muted">Wrong destination? Cancel and pick the correct class in the left rail.</p>
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-bg-elevated px-4 py-6 text-center hover:border-brand">
              <Upload className="text-brand" />
              <span className="font-semibold">{uploadFile ? uploadFile.name : "Choose file"}</span>
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
            <p className="mt-1 text-xs text-ink-muted">Display: {formatBookTitle(uploadTitle || "Untitled")}</p>
            <label className="mt-3 block text-sm font-semibold">
              Book language
              <select className="select mt-1" value={uploadLang} onChange={(e) => setUploadLang(e.target.value as ContentLang)}>
                <option value="en">English</option>
                <option value="ne">नेपाली</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Or paste book / TOC text
              <textarea className="textarea mt-1 min-h-28 font-mono text-xs" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Tags
              <input className="input mt-1" value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={splitOnUpload} onChange={(e) => setSplitOnUpload(e.target.checked)} />
              Extract chapters on upload
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

      {/* Import Content */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form
            className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void importContent();
            }}
          >
            <h3 className="font-display text-2xl">Import Content</h3>
            <p className="mt-1 text-sm text-ink-muted">On-demand from official / listed sources only.</p>
            <label className="mt-4 block text-sm font-semibold">
              Source
              <select
                className="select mt-1"
                value={impSource}
                onChange={(e) => {
                  const s = e.target.value as ContentSourceId;
                  setImpSource(s);
                  const g = listContentGrades(s)[0] ?? 8;
                  setImpGrade(g);
                  const subs = listContentSubjects(s, g, impMedium);
                  if (subs[0]) setImpSubject(subs[0]);
                }}
              >
                {listSourceIds().map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_META[s].name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-ink-muted">{SOURCE_META[impSource].blurb}</p>
            <label className="mt-3 block text-sm font-semibold">
              Grade
              <select
                className="select mt-1"
                value={impGrade}
                onChange={(e) => {
                  const g = Number(e.target.value);
                  setImpGrade(g);
                  const subs = listContentSubjects(impSource, g, impMedium);
                  if (subs[0]) setImpSubject(subs[0]);
                }}
              >
                {listContentGrades(impSource)
                  .filter((g) => enabledGrades.length === 0 || enabledGrades.includes(String(g)))
                  .map((g) => (
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
                value={impMedium}
                onChange={(e) => {
                  const m = e.target.value as ContentMedium;
                  setImpMedium(m);
                  const subs = listContentSubjects(impSource, impGrade, m);
                  if (subs[0]) setImpSubject(subs[0]);
                }}
              >
                <option value="en">English</option>
                <option value="ne">Nepali</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Subject
              <select className="select mt-1" value={impSubject} onChange={(e) => setImpSubject(e.target.value)}>
                {impSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {impSource === "cdc" && (
              <p className="mt-2 rounded-xl bg-bg-elevated px-3 py-2 text-xs text-ink-muted">
                Class {impGrade} subjects (CDC structure): {impSubjects.join(" · ") || "—"}.
                {hasVerifiedUnits(impGrade, impSubject, impMedium)
                  ? " Verified chapter units available for this pick — will create unit cards."
                  : " No verified chapter list for this pick — imports a subject shell + CDC link; use Upload syllabus for accurate units."}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              Currently viewing <strong>{libraryLabel}</strong>. Import may open/create Class {impGrade} — {impSubject}. Portal:{" "}
              <a className="text-brand underline" href={SOURCE_META[impSource].portal} target="_blank" rel="noreferrer">
                {SOURCE_META[impSource].portal}
              </a>
            </p>
            {impMsg && <p className="mt-2 text-sm text-danger">{impMsg}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!!busy || !impSubjects.length}>
                {busy === "import" ? "Importing…" : "Import"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generate with AI */}
      {showAiGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onSubmit={generateWithAi}>
            <h3 className="font-display text-2xl">Generate with AI</h3>
            <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm">
              Creating for <strong>{libraryLabel}</strong>. Review before teaching — not an official CDC textbook.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" className={`btn flex-1 ${aiMode === "full" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAiMode("full")}>
                Full syllabus
              </button>
              <button type="button" className={`btn flex-1 ${aiMode === "free" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAiMode("free")}>
                Free-text request
              </button>
            </div>
            {aiMode === "free" && (
              <label className="mt-3 block text-sm font-semibold">
                Request
                <textarea
                  className="textarea mt-1 min-h-28"
                  placeholder='e.g. "Syllabus for Class 7 Science covering CDC" or "Chapter on the water cycle for Class 5"'
                  value={aiFree}
                  onChange={(e) => setAiFree(e.target.value)}
                />
              </label>
            )}
            {aiMsg && <p className="mt-2 text-sm text-danger">{aiMsg}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAiGen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!!busy}>
                {busy === "ai" ? "Generating…" : "Generate"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload syllabus */}
      {showSyllabusUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onSubmit={handleSyllabusUpload}>
            <h3 className="font-display text-2xl">Upload syllabus</h3>
            <p className="mt-2 rounded-xl bg-brand-soft/60 px-3 py-2 text-sm font-semibold">Into: {libraryLabel}</p>
            <p className="mt-1 text-sm text-ink-muted">
              Short outline (units/topics) → chapter cards marked From syllabus. Expand later with a textbook or AI.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-bg-elevated px-4 py-6 text-center">
              <FileText className="text-brand" />
              <span className="font-semibold">{syllabusFile ? syllabusFile.name : "PDF / DOCX / TXT"}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(e) => setSyllabusFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Or paste syllabus outline
              <textarea
                className="textarea mt-1 min-h-32 font-mono text-xs"
                placeholder={"Unit 1 Scientific Learning\n- Observation\n- Hypothesis\nUnit 2 Living Beings\n- Cells\n…"}
                value={syllabusPaste}
                onChange={(e) => setSyllabusPaste(e.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSyllabusUpload(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!!busy}>
                {busy === "syllabus" ? "Parsing…" : "Create chapters"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reassign */}
      {showReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface w-full max-w-md p-5" onSubmit={reassignMaterial}>
            <h3 className="font-display text-2xl">Move book</h3>
            <p className="mt-1 text-sm text-ink-muted">{formatBookTitle(showReassign.title)}</p>
            <label className="mt-4 block text-sm font-semibold">
              Class + Subject
              <select className="select mt-1" value={reassignKey} onChange={(e) => setReassignKey(e.target.value)}>
                {libraryGroups.map((g) => (
                  <option key={g.key} value={g.key}>
                    Class {g.grade} — {g.subject}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowReassign(null)}>
                Cancel
              </button>
              <button className="btn btn-primary">Move</button>
            </div>
          </form>
        </div>
      )}

      <PdfViewer
        open={!!viewer}
        onClose={() => setViewer(null)}
        title={viewer ? formatBookTitle(viewer.title) : "Book"}
        dataUrl={viewer?.dataUrl}
        mime={viewer?.mime}
        fileName={viewer?.versions.at(-1)?.fileName}
        textFallback={viewer?.extractedText || viewer?.contentPreview}
      />

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onSubmit={saveEdit}>
            <h3 className="font-display text-2xl">Edit chapter</h3>
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
