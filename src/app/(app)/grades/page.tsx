"use client";

import { PageHeader } from "@/components/PageHeader";
import { letterGrade } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { average, downloadText, uid } from "@/lib/utils";
import { Download, FileSpreadsheet, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function GradesPage() {
  const assessments = useAppStore((s) => s.assessments);
  const grades = useAppStore((s) => s.grades);
  const students = useAppStore((s) => s.students);
  const classes = useAppStore((s) => s.classes);
  const upsertGrade = useAppStore((s) => s.upsertGrade);
  const importGradesCsv = useAppStore((s) => s.importGradesCsv);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);

  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? "a1");
  const [csvText, setCsvText] = useState("rollNumber,marks\n8A01,18\n8A05,11");
  const [importMsg, setImportMsg] = useState("");

  const assessment = assessments.find((a) => a.id === assessmentId);
  const classStudents = students.filter((s) => s.classId === assessment?.classId);

  const rows = useMemo(() => {
    return classStudents
      .map((s) => {
        const g = grades.find((x) => x.assessmentId === assessmentId && x.studentId === s.id);
        const marks = g?.marks ?? null;
        const pct = marks != null && assessment ? (marks / assessment.maxMarks) * 100 : null;
        return { student: s, grade: g, marks, pct };
      })
      .sort((a, b) => (b.marks ?? -1) - (a.marks ?? -1));
  }, [classStudents, grades, assessmentId, assessment]);

  const avg = average(rows.filter((r) => r.pct != null).map((r) => r.pct as number));

  const progress = [
    { label: "Quiz 1", pct: Math.round(avg) || 72 },
    { label: "Worksheet", pct: 78 },
    { label: "Lab", pct: 81 },
    { label: "Mid-term", pct: 0 },
  ];

  function onImport() {
    const lines = csvText.trim().split(/\r?\n/).slice(1);
    const parsed = lines
      .map((line) => {
        const [rollNumber, marks] = line.split(",").map((x) => x.trim());
        return { rollNumber, marks: Number(marks) };
      })
      .filter((r) => r.rollNumber && !Number.isNaN(r.marks));
    const n = importGradesCsv(assessmentId, parsed);
    setImportMsg(`Imported ${n} mark(s).`);
  }

  function exportMarksheet() {
    if (!assessment) return;
    const lines = [
      `Mark sheet — ${assessment.title}`,
      `Class: ${classes.find((c) => c.id === assessment.classId)?.name ?? ""}`,
      `Max: ${assessment.maxMarks}`,
      "",
      "Rank,Roll,Name,Marks,%,Grade",
      ...rows.map((r, i) => {
        const pct = r.pct ?? 0;
        return `${i + 1},${r.student.rollNumber},${r.student.name},${r.marks ?? ""},${pct.toFixed(0)},${r.marks != null ? letterGrade(pct) : ""}`;
      }),
      "",
      `Class average: ${avg.toFixed(1)}%`,
    ];
    downloadText(`${assessment.title.replace(/\s+/g, "-")}-marks.txt`, lines.join("\n"));
  }

  function exportReportCard(studentId: string) {
    const s = students.find((x) => x.id === studentId);
    if (!s || !assessment) return;
    const g = grades.find((x) => x.assessmentId === assessmentId && x.studentId === studentId);
    const pct = g ? (g.marks / assessment.maxMarks) * 100 : 0;
    const body = [
      "GREENFIELD SCHOOL — REPORT EXTRACT",
      `Student: ${s.name} (${s.rollNumber})`,
      `Class: ${classes.find((c) => c.id === s.classId)?.name}`,
      `Assessment: ${assessment.title}`,
      `Marks: ${g?.marks ?? "—"} / ${assessment.maxMarks} (${pct.toFixed(0)}% · ${letterGrade(pct)})`,
      `Attendance: ${s.attendancePct}%`,
      "",
      "Teacher comment: Continues to show steady progress. Encourage regular revision of key terms.",
    ].join("\n");
    downloadText(`report-${s.rollNumber}.txt`, body);
  }

  return (
    <div>
      <PageHeader
        title="Assessments & Grades"
        subtitle="Create or AI-generate quizzes, enter marks, import CSV, and export mark sheets."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setAssistantOpen(true)}>
              <Sparkles size={16} /> Auto-grade help
            </button>
            <button className="btn btn-primary" onClick={exportMarksheet}>
              <Download size={16} /> Export mark sheet
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {assessments.map((a) => (
          <button
            key={a.id}
            className={`btn ${assessmentId === a.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setAssessmentId(a.id)}
          >
            {a.title}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <div className="text-sm text-ink-muted">Class average</div>
          <div className="font-display text-3xl">{avg ? `${avg.toFixed(0)}%` : "—"}</div>
        </div>
        <div className="surface p-4">
          <div className="text-sm text-ink-muted">Max marks</div>
          <div className="font-display text-3xl">{assessment?.maxMarks ?? "—"}</div>
        </div>
        <div className="surface p-4">
          <div className="text-sm text-ink-muted">Graded</div>
          <div className="font-display text-3xl">
            {rows.filter((r) => r.marks != null).length}/{rows.length}
          </div>
        </div>
      </div>

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
                <th className="pb-2 font-semibold">AI suggestion</th>
                <th className="pb-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
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
                      max={assessment?.maxMarks}
                      value={r.marks ?? ""}
                      onChange={(e) => {
                        const marks = Number(e.target.value);
                        if (Number.isNaN(marks) || !assessment) return;
                        upsertGrade({
                          id: r.grade?.id ?? uid("g"),
                          assessmentId,
                          studentId: r.student.id,
                          marks,
                          aiSuggested: r.grade?.aiSuggested,
                          feedback: r.grade?.feedback,
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
                        title="Click to approve AI suggestion"
                        onClick={() =>
                          upsertGrade({
                            id: r.grade!.id,
                            assessmentId,
                            studentId: r.student.id,
                            marks: r.grade!.aiSuggested!,
                            feedback: r.grade?.feedback,
                          })
                        }
                      >
                        Suggest {r.grade.aiSuggested} — approve
                      </button>
                    ) : (
                      <span className="text-ink-muted">—</span>
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

          {assessment && assessment.questions.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="font-semibold">Question paper preview</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
                {assessment.questions.map((q) => (
                  <li key={q.id}>
                    <span className="badge mr-2 uppercase">{q.type}</span>
                    {q.prompt} <span className="text-ink-muted">({q.marks} marks)</span>
                    {q.options && (
                      <ul className="mt-1 list-disc pl-5 text-ink-muted">
                        {q.options.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="surface p-4">
            <h3 className="font-semibold">Progress over time</h3>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5dde6" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pct" stroke="#1f6f63" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="surface p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <FileSpreadsheet size={16} /> Bulk import (CSV)
            </div>
            <textarea className="textarea font-mono text-xs" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
            <button className="btn btn-secondary mt-2 w-full" onClick={onImport}>
              Import marks
            </button>
            {importMsg && <p className="mt-2 text-sm text-brand">{importMsg}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
