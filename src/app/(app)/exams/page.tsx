"use client";

import { PageHeader } from "@/components/PageHeader";
import { PdfViewer } from "@/components/PdfViewer";
import { letterGrade, suggestExamRubric, suggestObjectiveMarks } from "@/lib/ai";
import { exportMarksheetPdf, exportReportCardPdf } from "@/lib/exports";
import { visibleClasses, visibleStudents } from "@/lib/rbac";
import { useAppStore } from "@/lib/store";
import type { Assessment, ExamFile } from "@/lib/types";
import { average, fileToExamFile, parseCsv, uid } from "@/lib/utils";
import {
  Copy,
  Download,
  FileText,
  Filter,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Tab = "exams" | "grade" | "class" | "student";

function examSubject(a: Assessment, classSubject?: string) {
  return a.subject || classSubject || "—";
}

export default function ExamsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink-muted">Loading exams…</p>}>
      <ExamsInner />
    </Suspense>
  );
}

function ExamsInner() {
  const search = useSearchParams();
  const user = useAppStore((s) => s.user);
  const assessments = useAppStore((s) => s.assessments);
  const grades = useAppStore((s) => s.grades);
  const students = useAppStore((s) => s.students);
  const classes = useAppStore((s) => s.classes);
  const chapters = useAppStore((s) => s.chapters);
  const addAssessment = useAppStore((s) => s.addAssessment);
  const updateAssessment = useAppStore((s) => s.updateAssessment);
  const upsertGrade = useAppStore((s) => s.upsertGrade);
  const importGradesCsv = useAppStore((s) => s.importGradesCsv);
  const duplicateAssessment = useAppStore((s) => s.duplicateAssessment);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);
  const pushAiLog = useAppStore((s) => s.pushAiLog);

  const allowedClasses = useMemo(() => visibleClasses(user, classes), [user, classes]);
  const allowedStudents = useMemo(
    () => visibleStudents(user, students, classes),
    [user, students, classes]
  );

  const [tab, setTab] = useState<Tab>("exams");
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? "");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTerm, setFilterTerm] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [q, setQ] = useState("");
  const [historyClassId, setHistoryClassId] = useState(allowedClasses[0]?.id ?? "");
  const [historyStudentId, setHistoryStudentId] = useState(allowedStudents[0]?.id ?? "");
  const [csvText, setCsvText] = useState("rollNumber,marks\n8A01,18\n8A05,11");
  const [importMsg, setImportMsg] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [viewer, setViewer] = useState<{ title: string; file: ExamFile } | null>(null);

  function viewExamFile(file: ExamFile | undefined, title: string) {
    if (!file) return;
    if (!file.dataUrl) {
      alert(`“${file.fileName}” is stored as a reference (${file.sizeLabel}). Re-upload to enable in-app viewing.`);
      return;
    }
    setViewer({ title, file });
  }

  useEffect(() => {
    const t = search.get("tab") as Tab | null;
    if (t && ["exams", "grade", "class", "student"].includes(t)) setTab(t);
    const sid = search.get("student");
    if (sid) {
      setHistoryStudentId(sid);
      setTab("student");
    }
    const cid = search.get("class");
    if (cid) {
      setHistoryClassId(cid);
      setTab("class");
    }
    const aid = search.get("exam");
    if (aid) {
      setAssessmentId(aid);
      setTab("grade");
    }
  }, [search]);

  const [form, setForm] = useState({
    title: "",
    classId: allowedClasses[0]?.id ?? "",
    subject: allowedClasses[0]?.subject ?? "Science",
    date: new Date().toISOString().slice(0, 10),
    term: "Term 1",
    type: "exam" as Assessment["type"],
    maxMarks: 20,
    passMark: 8,
    chapterIds: [] as string[],
  });
  const [paper, setPaper] = useState<ExamFile | undefined>();
  const [answerKey, setAnswerKey] = useState<ExamFile | undefined>();

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const c of allowedClasses) if (c.subject) set.add(c.subject);
    for (const a of assessments) if (a.subject) set.add(a.subject);
    return [...set].sort();
  }, [allowedClasses, assessments]);

  const terms = useMemo(() => {
    const set = new Set<string>();
    for (const a of assessments) if (a.term) set.add(a.term);
    return [...set].sort();
  }, [assessments]);

  const filtered = useMemo(() => {
    return assessments
      .filter((a) => allowedClasses.some((c) => c.id === a.classId))
      .filter((a) => !filterClass || a.classId === filterClass)
      .filter((a) => !filterSubject || examSubject(a) === filterSubject)
      .filter((a) => !filterTerm || a.term === filterTerm)
      .filter((a) => !filterFrom || a.date >= filterFrom)
      .filter((a) => !filterTo || a.date <= filterTo)
      .filter((a) => {
        if (!q.trim()) return true;
        const hay = `${a.title} ${a.subject ?? ""} ${a.term ?? ""}`.toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [assessments, allowedClasses, filterClass, filterSubject, filterTerm, filterFrom, filterTo, q]);

  const assessment = assessments.find((a) => a.id === assessmentId) ?? filtered[0];
  const activeId = assessment?.id ?? "";

  const classStudents = useMemo(
    () => allowedStudents.filter((s) => s.classId === assessment?.classId),
    [allowedStudents, assessment?.classId]
  );

  const gradeRows = useMemo(() => {
    if (!assessment) return [];
    return classStudents
      .map((s) => {
        const g = grades.find((x) => x.assessmentId === assessment.id && x.studentId === s.id);
        const marks = g?.marks ?? null;
        const pct = marks != null ? (marks / assessment.maxMarks) * 100 : null;
        return { student: s, grade: g, marks, pct };
      })
      .sort((a, b) => (b.marks ?? -1) - (a.marks ?? -1));
  }, [classStudents, grades, assessment]);

  const stats = useMemo(() => {
    if (!assessment) return null;
    const scored = gradeRows.filter((r) => r.marks != null);
    if (!scored.length) return { avg: 0, high: 0, low: 0, pass: 0, fail: 0, n: 0 };
    const marks = scored.map((r) => r.marks as number);
    const pcts = scored.map((r) => r.pct as number);
    const passMark = assessment.passMark ?? Math.ceil(assessment.maxMarks * 0.4);
    return {
      avg: average(pcts),
      high: Math.max(...marks),
      low: Math.min(...marks),
      pass: marks.filter((m) => m >= passMark).length,
      fail: marks.filter((m) => m < passMark).length,
      n: scored.length,
    };
  }, [gradeRows, assessment]);

  const classHistory = useMemo(() => {
    const list = assessments
      .filter((a) => a.classId === historyClassId)
      .sort((a, b) => a.date.localeCompare(b.date));
    return list.map((a, i) => {
      const pcts = grades
        .filter((g) => g.assessmentId === a.id)
        .map((g) => (g.marks / a.maxMarks) * 100);
      const avgPct = pcts.length ? average(pcts) : null;
      const prev = i > 0 ? list[i - 1] : null;
      const prevPcts = prev
        ? grades.filter((g) => g.assessmentId === prev.id).map((g) => (g.marks / prev.maxMarks) * 100)
        : [];
      const prevAvg = prevPcts.length ? average(prevPcts) : null;
      let trend: "up" | "down" | "flat" | "na" = "na";
      if (avgPct != null && prevAvg != null) {
        if (avgPct - prevAvg >= 3) trend = "up";
        else if (prevAvg - avgPct >= 3) trend = "down";
        else trend = "flat";
      }
      return { assessment: a, avgPct, trend };
    });
  }, [assessments, grades, historyClassId]);

  const studentHistory = useMemo(() => {
    const sid = historyStudentId;
    const entries = grades
      .filter((g) => g.studentId === sid)
      .map((g) => {
        const a = assessments.find((x) => x.id === g.assessmentId);
        if (!a) return null;
        const pct = (g.marks / a.maxMarks) * 100;
        const classMarks = grades
          .filter((x) => x.assessmentId === a.id)
          .map((x) => x.marks)
          .sort((x, y) => y - x);
        const rank = classMarks.indexOf(g.marks) + 1 || null;
        return { grade: g, assessment: a, pct, rank, classSize: classMarks.length };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.assessment.date.localeCompare(b.assessment.date));

    const personalAvg = entries.length ? average(entries.map((e) => e.pct)) : 0;
    return entries.map((e) => ({
      ...e,
      dropFlag: e.pct <= personalAvg - 15,
      personalAvg,
    }));
  }, [grades, assessments, historyStudentId]);

  const chapterOptions = chapters.filter((c) => !c.deletedAt && c.classId === form.classId);

  async function onPaper(file: File | null, kind: "paper" | "key") {
    if (!file) return;
    const examFile = await fileToExamFile(file);
    if (kind === "paper") setPaper(examFile);
    else setAnswerKey(examFile);
  }

  function createExam() {
    if (!form.title.trim() || !form.classId) {
      setFormMsg("Name and class are required.");
      return;
    }
    const id = uid("a");
    addAssessment({
      id,
      title: form.title.trim(),
      classId: form.classId,
      subject: form.subject,
      chapterId: form.chapterIds[0],
      chapterIds: form.chapterIds,
      type: form.type,
      maxMarks: form.maxMarks,
      passMark: form.passMark,
      date: form.date,
      term: form.term,
      questions: [],
      paper,
      answerKey,
    });
    setAssessmentId(id);
    setFormMsg(`Created “${form.title.trim()}”.`);
    setForm((f) => ({ ...f, title: "" }));
    setPaper(undefined);
    setAnswerKey(undefined);
    setTab("grade");
  }

  async function attachToActive(kind: "paper" | "key", file: File | null) {
    if (!file || !activeId) return;
    const examFile = await fileToExamFile(file);
    updateAssessment(activeId, kind === "paper" ? { paper: examFile } : { answerKey: examFile });
  }

  function reuseExam(id: string) {
    const copy = duplicateAssessment(id);
    if (!copy) return;
    setAssessmentId(copy.id);
    setTab("exams");
    setFormMsg(`Reused question paper as “${copy.title}”. Update date/details, then grade.`);
  }

  async function runRubric() {
    if (!assessment) return;
    setAiBusy(true);
    const text = await suggestExamRubric(assessment);
    updateAssessment(assessment.id, { aiRubric: text });
    pushAiLog({ kind: "rubric", title: assessment.title, preview: text.slice(0, 120) });
    setAiBusy(false);
  }

  async function runObjectiveAssist() {
    if (!assessment) return;
    setAiBusy(true);
    const suggestions = await suggestObjectiveMarks(assessment, classStudents.map((s) => s.id));
    for (const s of suggestions) {
      upsertGrade({
        id: uid("g"),
        assessmentId: assessment.id,
        studentId: s.studentId,
        marks: grades.find((g) => g.assessmentId === assessment.id && g.studentId === s.studentId)?.marks ?? 0,
        aiSuggested: s.suggested,
        feedback: s.note,
      });
    }
    pushAiLog({
      kind: "auto-grade",
      title: assessment.title,
      preview: `Suggested marks for ${suggestions.length} student(s) from objective items`,
    });
    setAiBusy(false);
  }

  function importCsv(text: string) {
    if (!activeId) return;
    const rows = parseCsv(text)
      .map((r) => ({
        rollNumber: r.rollnumber || r.roll || r.roll_no || "",
        marks: Number(r.marks || r.score || r.mark),
      }))
      .filter((r) => r.rollNumber && !Number.isNaN(r.marks));
    if (!rows.length) {
      const lines = text.trim().split(/\r?\n/).slice(1);
      const parsed = lines
        .map((line) => {
          const [rollNumber, marks] = line.split(",").map((x) => x.trim());
          return { rollNumber, marks: Number(marks) };
        })
        .filter((r) => r.rollNumber && !Number.isNaN(r.marks));
      setImportMsg(`Imported ${importGradesCsv(activeId, parsed)} mark(s).`);
      return;
    }
    setImportMsg(`Imported ${importGradesCsv(activeId, rows)} mark(s).`);
  }

  function exportMarksheet() {
    if (!assessment || !stats) return;
    exportMarksheetPdf({
      schoolName: "TeachDesk",
      title: assessment.title,
      className: classes.find((c) => c.id === assessment.classId)?.name ?? "",
      maxMarks: assessment.maxMarks,
      average: `${stats.avg.toFixed(1)}%`,
      rows: gradeRows.map((r, i) => ({
        rank: i + 1,
        roll: r.student.rollNumber,
        name: r.student.name,
        marks: String(r.marks ?? ""),
        pct: `${(r.pct ?? 0).toFixed(0)}%`,
        grade: r.marks == null ? "" : letterGrade(r.pct ?? 0),
      })),
    });
  }

  function exportReportCard(studentId: string) {
    const s = students.find((x) => x.id === studentId);
    if (!s || !assessment) return;
    const g = grades.find((x) => x.assessmentId === assessment.id && x.studentId === studentId);
    const pct = g ? (g.marks / assessment.maxMarks) * 100 : 0;
    exportReportCardPdf({
      schoolName: "TeachDesk",
      studentName: s.name,
      roll: s.rollNumber,
      className: classes.find((c) => c.id === s.classId)?.name ?? "",
      attendancePct: s.attendancePct,
      lines: [
        {
          title: assessment.title,
          marks: `${g?.marks ?? "—"} / ${assessment.maxMarks}`,
          grade: letterGrade(pct),
        },
      ],
      comment: "Encourage revision of weaker topics before the next assessment.",
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "exams", label: "Exams" },
    { id: "grade", label: "Grade" },
    { id: "class", label: "Class history" },
    { id: "student", label: "Student history" },
  ];

  const patternNote = useMemo(() => {
    const titled = classHistory.filter((h) => h.avgPct != null);
    const grammarish = titled.filter((h) => /grammar|language|english/i.test(h.assessment.title + (h.assessment.subject ?? "")));
    if (grammarish.length >= 2) {
      const avgG = average(grammarish.map((h) => h.avgPct as number));
      const avgO = average(titled.filter((h) => !grammarish.includes(h)).map((h) => h.avgPct as number));
      if (avgO && avgG < avgO - 5) {
        return `Pattern: this class averages ${avgG.toFixed(0)}% on language/grammar-style papers vs ${avgO.toFixed(0)}% elsewhere.`;
      }
    }
    const dips = titled.filter((h) => h.trend === "down");
    if (dips.length >= 2) return `Pattern: ${dips.length} recent exams show a declining class average — worth a review week.`;
    return null;
  }, [classHistory]);

  return (
    <div>
      <PageHeader
        title="Exams & Assessments"
        subtitle="Question papers, marking, and academic history — by exam, class, and student."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setAssistantOpen(true)}>
              <Sparkles size={16} /> AI assist
            </button>
            {assessment && (
              <button className="btn btn-primary" onClick={exportMarksheet}>
                <Download size={16} /> Export mark sheet
              </button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`btn ${tab === t.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "exams" && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="surface p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <Filter size={14} /> Search & filter
            </div>
            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input className="input" placeholder="Search exams…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                <option value="">All classes</option>
                {allowedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select className="input" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select className="input" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
                <option value="">All terms</option>
                {terms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input className="input" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
              <input className="input" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>

            <ul className="space-y-2">
              {filtered.map((a) => {
                const cls = classes.find((c) => c.id === a.classId);
                const pcts = grades.filter((g) => g.assessmentId === a.id).map((g) => (g.marks / a.maxMarks) * 100);
                const avgPct = pcts.length ? average(pcts) : null;
                return (
                  <li
                    key={a.id}
                    className={`rounded-xl border p-3 ${activeId === a.id ? "border-brand bg-brand/5" : "border-line"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button className="text-left" onClick={() => { setAssessmentId(a.id); setTab("grade"); }}>
                        <div className="font-semibold">{a.title}</div>
                        <div className="mt-1 text-xs text-ink-muted">
                          {cls?.name} · {examSubject(a, cls?.subject)} · {a.term ?? "—"} · {a.date}
                          {avgPct != null ? ` · avg ${avgPct.toFixed(0)}%` : ""}
                          {a.reusedFromId ? " · reused paper" : ""}
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-1">
                        {a.paper && (
                          <button className="btn btn-ghost text-xs" onClick={() => viewExamFile(a.paper, `${a.title} — question paper`)}>
                            <FileText size={14} /> Paper
                          </button>
                        )}
                        <button className="btn btn-ghost text-xs" onClick={() => reuseExam(a.id)} title="Reuse this question paper">
                          <Copy size={14} /> Reuse
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {!filtered.length && <li className="text-sm text-ink-muted">No exams match these filters.</li>}
            </ul>
          </section>

          <section className="surface p-4">
            <h3 className="font-semibold">Create exam</h3>
            <p className="mt-1 text-sm text-ink-muted">Name, class, subject, date, term — plus optional paper & answer key.</p>
            <div className="mt-3 grid gap-2">
              <input
                className="input"
                placeholder='e.g. Unit Test 2 — Science'
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <select
                className="input"
                value={form.classId}
                onChange={(e) => {
                  const c = classes.find((x) => x.id === e.target.value);
                  setForm({ ...form, classId: e.target.value, subject: c?.subject ?? form.subject, chapterIds: [] });
                }}
              >
                {allowedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <input className="input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="Term" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Assessment["type"] })}>
                  <option value="exam">Exam</option>
                  <option value="test">Test</option>
                  <option value="quiz">Quiz</option>
                  <option value="worksheet">Worksheet</option>
                </select>
                <input className="input" type="number" min={1} value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })} placeholder="Max" />
                <input className="input" type="number" min={0} value={form.passMark} onChange={(e) => setForm({ ...form, passMark: Number(e.target.value) })} placeholder="Pass" />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-ink-muted">Chapters (Library)</div>
                <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                  {chapterOptions.map((ch) => {
                    const on = form.chapterIds.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        className={`badge ${on ? "badge-ok" : ""}`}
                        onClick={() =>
                          setForm({
                            ...form,
                            chapterIds: on ? form.chapterIds.filter((id) => id !== ch.id) : [...form.chapterIds, ch.id],
                          })
                        }
                      >
                        {ch.title}
                      </button>
                    );
                  })}
                  {!chapterOptions.length && <span className="text-xs text-ink-muted">No chapters for this class yet.</span>}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-sm hover:border-brand">
                <Upload size={16} /> Question paper {paper ? `— ${paper.fileName}` : "(PDF/image)"}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => onPaper(e.target.files?.[0] ?? null, "paper")} />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-sm hover:border-brand">
                <Upload size={16} /> Answer key {answerKey ? `— ${answerKey.fileName}` : "(optional)"}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => onPaper(e.target.files?.[0] ?? null, "key")} />
              </label>
              <button className="btn btn-primary" onClick={createExam}>
                Create exam
              </button>
              {formMsg && <p className="text-sm text-brand">{formMsg}</p>}
            </div>
          </section>
        </div>
      )}

      {tab === "grade" && assessment && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {filtered.slice(0, 12).map((a) => (
              <button
                key={a.id}
                className={`btn ${activeId === a.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setAssessmentId(a.id)}
              >
                {a.title}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">Class average</div>
              <div className="font-display text-3xl">{stats?.n ? `${stats.avg.toFixed(0)}%` : "—"}</div>
            </div>
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">Highest</div>
              <div className="font-display text-3xl">{stats?.n ? stats.high : "—"}</div>
            </div>
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">Lowest</div>
              <div className="font-display text-3xl">{stats?.n ? stats.low : "—"}</div>
            </div>
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">Pass / Fail</div>
              <div className="font-display text-3xl">
                {stats?.n ? `${stats.pass}/${stats.fail}` : "—"}
              </div>
            </div>
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">Graded</div>
              <div className="font-display text-3xl">
                {gradeRows.filter((r) => r.marks != null).length}/{gradeRows.length}
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {assessment.paper ? (
              <button className="btn btn-secondary" onClick={() => viewExamFile(assessment.paper, `${assessment.title} — question paper`)}>
                <FileText size={16} /> View paper ({assessment.paper.fileName})
              </button>
            ) : (
              <label className="btn btn-secondary cursor-pointer">
                <Upload size={16} /> Attach paper
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => attachToActive("paper", e.target.files?.[0] ?? null)} />
              </label>
            )}
            {assessment.answerKey ? (
              <button className="btn btn-secondary" onClick={() => viewExamFile(assessment.answerKey, `${assessment.title} — answer key`)}>
                Answer key
              </button>
            ) : (
              <label className="btn btn-secondary cursor-pointer">
                Attach answer key
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => attachToActive("key", e.target.files?.[0] ?? null)} />
              </label>
            )}
            <button className="btn btn-secondary" disabled={aiBusy} onClick={runRubric}>
              <Sparkles size={16} /> {aiBusy ? "Thinking…" : "Suggest rubric"}
            </button>
            <button className="btn btn-secondary" disabled={aiBusy} onClick={runObjectiveAssist}>
              Auto-grade objective
            </button>
            <button className="btn btn-secondary" onClick={() => reuseExam(assessment.id)}>
              <Copy size={16} /> Reuse this paper
            </button>
          </div>

          {assessment.aiRubric && (
            <div className="surface mb-4 whitespace-pre-wrap p-4 text-sm">{assessment.aiRubric}</div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <section className="surface overflow-x-auto p-4">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-ink-muted">
                  <tr>
                    <th className="pb-2 font-semibold">Rank</th>
                    <th className="pb-2 font-semibold">Student</th>
                    <th className="pb-2 font-semibold">Marks</th>
                    <th className="pb-2 font-semibold">%</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">AI</th>
                    <th className="pb-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {gradeRows.map((r, idx) => (
                    <tr key={r.student.id} className="border-t border-line">
                      <td className="py-2">{r.marks != null ? idx + 1 : "—"}</td>
                      <td className="py-2">
                        <div className="font-semibold">{r.student.name}</div>
                        <div className="text-xs text-ink-muted">{r.student.rollNumber}</div>
                      </td>
                      <td className="py-2">
                        <input
                          className="input w-20"
                          type="number"
                          min={0}
                          max={assessment.maxMarks}
                          value={r.marks ?? ""}
                          onChange={(e) => {
                            const marks = Number(e.target.value);
                            if (Number.isNaN(marks)) return;
                            upsertGrade({
                              id: r.grade?.id ?? uid("g"),
                              assessmentId: assessment.id,
                              studentId: r.student.id,
                              marks,
                              aiSuggested: r.grade?.aiSuggested,
                              feedback: r.grade?.feedback,
                              markedScript: r.grade?.markedScript,
                            });
                          }}
                        />
                      </td>
                      <td className="py-2">{r.pct != null ? `${r.pct.toFixed(0)}%` : "—"}</td>
                      <td className="py-2">{r.pct != null ? letterGrade(r.pct) : "—"}</td>
                      <td className="py-2">
                        {r.grade?.aiSuggested != null ? (
                          <button
                            className="badge badge-warn"
                            onClick={() =>
                              upsertGrade({
                                id: r.grade!.id,
                                assessmentId: assessment.id,
                                studentId: r.student.id,
                                marks: r.grade!.aiSuggested!,
                                feedback: r.grade?.feedback,
                              })
                            }
                          >
                            Suggest {r.grade.aiSuggested}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2">
                        <button className="btn btn-ghost text-brand" onClick={() => exportReportCard(r.student.id)}>
                          Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {assessment.questions.length > 0 && (
                <div className="mt-6 border-t border-line pt-4">
                  <h3 className="font-semibold">Embedded questions</h3>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
                    {assessment.questions.map((q) => (
                      <li key={q.id}>
                        <span className="badge mr-2 uppercase">{q.type}</span>
                        {q.prompt} <span className="text-ink-muted">({q.marks} marks)</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>

            <section className="surface p-4">
              <h3 className="font-semibold">Bulk import (CSV)</h3>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-bg-elevated px-3 py-4 text-sm hover:border-brand">
                <Upload size={16} className="text-brand" /> Choose marks CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const text = await f.text();
                    setCsvText(text);
                    importCsv(text);
                  }}
                />
              </label>
              <textarea className="textarea mt-3 font-mono text-xs" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
              <button className="btn btn-secondary mt-2 w-full" onClick={() => importCsv(csvText)}>
                Import pasted marks
              </button>
              {importMsg && <p className="mt-2 text-sm text-brand">{importMsg}</p>}
            </section>
          </div>
        </div>
      )}

      {tab === "grade" && !assessment && (
        <div className="surface p-6 text-sm text-ink-muted">Create an exam first, then enter marks here.</div>
      )}

      {tab === "class" && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {allowedClasses.map((c) => (
              <button
                key={c.id}
                className={`btn ${historyClassId === c.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHistoryClassId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          {patternNote && (
            <div className="mb-4 rounded-xl border border-brand/30 bg-brand/5 p-3 text-sm">{patternNote}</div>
          )}
          <div className="mb-4 surface p-4">
            <h3 className="font-semibold">Class average over time</h3>
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={classHistory
                    .filter((h) => h.avgPct != null)
                    .map((h) => ({ label: h.assessment.date.slice(5), pct: Math.round(h.avgPct as number) }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5dde6" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pct" stroke="#1f6f63" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <ul className="space-y-2">
            {[...classHistory].reverse().map((h) => (
              <li key={h.assessment.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-semibold">{h.assessment.title}</div>
                  <div className="text-xs text-ink-muted">
                    {h.assessment.date} · {h.assessment.term ?? "—"} · avg{" "}
                    {h.avgPct != null ? `${h.avgPct.toFixed(0)}%` : "ungraded"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {h.trend === "up" && (
                    <span className="badge badge-ok inline-flex items-center gap-1">
                      <TrendingUp size={12} /> Improving
                    </span>
                  )}
                  {h.trend === "down" && (
                    <span className="badge badge-warn inline-flex items-center gap-1">
                      <TrendingDown size={12} /> Declining
                    </span>
                  )}
                  {h.assessment.paper && (
                    <button className="btn btn-ghost text-xs" onClick={() => viewExamFile(h.assessment.paper, `${h.assessment.title} — question paper`)}>
                      Paper
                    </button>
                  )}
                  <button
                    className="btn btn-secondary text-xs"
                    onClick={() => {
                      setAssessmentId(h.assessment.id);
                      setTab("grade");
                    }}
                  >
                    Open grades
                  </button>
                </div>
              </li>
            ))}
            {!classHistory.length && <li className="text-sm text-ink-muted">No exams for this class yet.</li>}
          </ul>
        </div>
      )}

      {tab === "student" && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              className="input max-w-md"
              value={historyStudentId}
              onChange={(e) => setHistoryStudentId(e.target.value)}
            >
              {allowedStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.rollNumber})
                </option>
              ))}
            </select>
            {historyStudentId && (
              <Link className="btn btn-secondary" href={`/students/${historyStudentId}`}>
                Profile
              </Link>
            )}
          </div>

          <div className="mb-4 surface p-4">
            <h3 className="font-semibold">Whole-history trend</h3>
            <div className="mt-3 h-48">
              {studentHistory.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={studentHistory.map((h) => ({
                      label: h.assessment.date.slice(5),
                      pct: Math.round(h.pct),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d5dde6" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="pct" stroke="#1f6f63" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-ink-muted">No exam scores yet.</p>
              )}
            </div>
            {studentHistory[0] && (
              <p className="mt-2 text-sm text-ink-muted">
                Personal average: {studentHistory[0].personalAvg.toFixed(0)}% ·{" "}
                {studentHistory.length >= 2
                  ? studentHistory[studentHistory.length - 1].pct >= studentHistory[0].pct
                    ? "Rising overall"
                    : "Falling overall"
                  : "Need more exams for a trend"}
              </p>
            )}
          </div>

          <ul className="space-y-2">
            {[...studentHistory].reverse().map((h) => (
              <li key={h.grade.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{h.assessment.title}</div>
                    <div className="mt-1 text-xs text-ink-muted">
                      {h.assessment.date} · {h.pct.toFixed(0)}% ({h.grade.marks}/{h.assessment.maxMarks}) · rank{" "}
                      {h.rank ?? "—"}/{h.classSize}
                    </div>
                    {h.dropFlag && (
                      <div className="badge badge-warn mt-2">
                        Significant drop vs own average ({h.personalAvg.toFixed(0)}%)
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {h.assessment.paper && (
                      <button className="btn btn-ghost text-xs" onClick={() => viewExamFile(h.assessment.paper, `${h.assessment.title} — question paper`)}>
                        Paper
                      </button>
                    )}
                    {h.grade.markedScript && (
                      <button className="btn btn-ghost text-xs" onClick={() => viewExamFile(h.grade.markedScript, `${h.assessment.title} — marked script`)}>
                        Marked script
                      </button>
                    )}
                    <button
                      className="btn btn-secondary text-xs"
                      onClick={() => {
                        setAssessmentId(h.assessment.id);
                        setTab("grade");
                      }}
                    >
                      Open exam
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PdfViewer
        open={!!viewer}
        onClose={() => setViewer(null)}
        title={viewer?.title ?? "Exam file"}
        dataUrl={viewer?.file.dataUrl}
        mime={viewer?.file.mime}
        fileName={viewer?.file.fileName}
      />
    </div>
  );
}
