"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { forecastGrade } from "@/lib/dashboard-ai";
import { calcAttendancePct } from "@/lib/rbac";
import { useAppStore } from "@/lib/store";

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const students = useAppStore((s) => s.students);
  const classes = useAppStore((s) => s.classes);
  const attendance = useAppStore((s) => s.attendance);
  const grades = useAppStore((s) => s.grades);
  const assessments = useAppStore((s) => s.assessments);
  const notes = useAppStore((s) => s.notes);
  const reminders = useAppStore((s) => s.reminders);
  const assignments = useAppStore((s) => s.assignments);
  const attendanceThreshold = useAppStore((s) => s.attendanceThreshold);
  const student = students.find((s) => s.id === id && !s.deletedAt);
  if (!student) return <div className="surface p-6">Student not found. <Link className="text-brand" href="/students">Return to roster</Link></div>;
  const cls = classes.find((c) => c.id === student.classId);
  const pct = calcAttendancePct(student.id, attendance);
  const trend = grades.filter((g) => g.studentId === student.id).map((g) => {
    const assessment = assessments.find((a) => a.id === g.assessmentId);
    return { label: assessment?.title ?? "Assessment", pct: assessment ? Math.round((g.marks / assessment.maxMarks) * 100) : 0 };
  });
  const forecast = forecastGrade(trend.map((x) => x.pct));
  const linkedNotes = notes.filter((n) => !n.deletedAt && n.studentId === student.id);
  const linkedReminders = reminders.filter((r) => !r.deletedAt && r.studentId === student.id);
  const homework = assignments.filter((a) => a.classId === student.classId);
  return <div>
    <PageHeader title={student.name} subtitle={`${student.rollNumber} · ${cls?.name ?? "Class"}`} actions={<><Link className="btn btn-secondary" href={`/exams?student=${student.id}`}>Exam history</Link><Link className="btn btn-secondary" href="/students">Back to roster</Link></>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="surface p-4"><div className="text-sm text-ink-muted">Attendance</div><div className="font-display text-3xl">{pct}%</div></div>
      <div className="surface p-4"><div className="text-sm text-ink-muted">Grade forecast</div><div className="font-display text-3xl">{forecast ? `${forecast.forecast}%` : "—"}</div></div>
      <div className="surface p-4"><div className="text-sm text-ink-muted">Homework</div><div className="font-display text-3xl">{homework.length}</div></div>
    </div>
    {(pct < attendanceThreshold || forecast?.atRisk) && <div className="mt-4 rounded-xl border border-danger bg-danger-soft p-4 text-sm"><strong>AI concern:</strong> {pct < attendanceThreshold ? `Attendance is below the ${attendanceThreshold}% threshold. ` : ""}{forecast?.atRisk ? "Recent marks forecast an at-risk outcome." : ""}</div>}
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <section className="surface p-4"><h2 className="font-semibold">Grade trend</h2><div className="mt-3 h-56">{trend.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><XAxis dataKey="label" hide /><YAxis domain={[0, 100]} /><Tooltip /><Line dataKey="pct" stroke="#1f6f63" strokeWidth={3} /></LineChart></ResponsiveContainer> : <p className="text-sm text-ink-muted">No marks recorded yet.</p>}</div></section>
      <section className="surface p-4"><h2 className="font-semibold">Linked notes & reminders</h2><ul className="mt-3 space-y-2 text-sm">{[...linkedNotes.map((n) => `Note: ${n.title}`), ...linkedReminders.map((r) => `Reminder: ${r.title}`)].map((item) => <li key={item} className="rounded-lg bg-bg-elevated p-2">{item}</li>)}{!linkedNotes.length && !linkedReminders.length && <li className="text-ink-muted">Nothing linked yet.</li>}</ul></section>
    </div>
    <section className="surface mt-4 p-4"><h2 className="font-semibold">Class homework</h2><ul className="mt-2 space-y-2 text-sm">{homework.map((a) => <li key={a.id}>{a.title} <span className="text-ink-muted">due {a.dueDate}</span></li>)}{!homework.length && <li className="text-ink-muted">No homework assigned.</li>}</ul></section>
  </div>;
}
