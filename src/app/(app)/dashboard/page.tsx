"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { average, formatDate } from "@/lib/utils";
import { buildAiTodos, buildDailyBriefing, buildSmartAlerts, factOfTheDay, activityOfTheDay, forecastGrade, weeklyDigest } from "@/lib/dashboard-ai";
import { calcAttendancePct, visibleClasses, visibleStudents } from "@/lib/rbac";
import { generateLessonPlan, generateParentUpdateLive, generateQuizFromChapter } from "@/lib/ai";
import {
  AlertCircle,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function DashboardPage() {
  const user = useAppStore((s) => s.user);
  const timetable = useAppStore((s) => s.timetable);
  const assignments = useAppStore((s) => s.assignments);
  const materials = useAppStore((s) => s.materials);
  const grades = useAppStore((s) => s.grades);
  const assessments = useAppStore((s) => s.assessments);
  const attendance = useAppStore((s) => s.attendance);
  const holidays = useAppStore((s) => s.holidays);
  const reminders = useAppStore((s) => s.reminders);
  const classes = useAppStore((s) => s.classes);
  const students = useAppStore((s) => s.students);
  const chapters = useAppStore((s) => s.chapters);
  const addLessonPlan = useAppStore((s) => s.addLessonPlan);
  const addAssessment = useAppStore((s) => s.addAssessment);
  const addNote = useAppStore((s) => s.addNote);
  const aiLog = useAppStore((s) => s.aiLog);
  const pushAiLog = useAppStore((s) => s.pushAiLog);
  const attendanceThreshold = useAppStore((s) => s.attendanceThreshold);
  const recentItems = useAppStore((s) => s.recentItems);
  const favorites = useAppStore((s) => s.favorites);
  const previousLoginAt = useAppStore((s) => s.previousLoginAt);
  const auditLog = useAppStore((s) => s.auditLog);
  const enabledGrades = useAppStore((s) => s.enabledGrades);
  const gradeOrder = useAppStore((s) => s.gradeOrder);
  const classScope = useMemo(() => ({ enabledGrades, gradeOrder }), [enabledGrades, gradeOrder]);
  const visible = visibleStudents(user, students, classes, classScope);

  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date().getDay()
  ];
  const todaysClasses = timetable.filter((t) => t.day === todayName);
  const pendingGrading = assignments.filter((a) =>
    a.submissions.some((s) => s.status === "submitted")
  );
  const upcoming = [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const openReminders = reminders.filter((r) => !r.done);
  const flagged = visible.filter((s) => calcAttendancePct(s.id, attendance) < attendanceThreshold);
  const alerts = buildSmartAlerts({ students: visible, attendance, threshold: attendanceThreshold, grades, assessments, holidays, pendingSubmissions: pendingGrading.length, classNames: Object.fromEntries(classes.map((c) => [c.id, c.name])) });
  const briefing = buildDailyBriefing({ teacherName: user?.name ?? "Teacher", todayName, todaysClasses, classNames: Object.fromEntries(classes.map((c) => [c.id, c.name])), openReminders, lowAttendance: flagged.map((s) => ({ name: s.name, pct: calcAttendancePct(s.id, attendance) })), pendingSubmissions: pendingGrading.length, holidaysSoon: holidays.slice(0, 2) });
  const todos = buildAiTodos({ openReminders, alerts, todaysClasses, pendingSubmissions: pendingGrading.length });
  async function tomorrowLesson() { const chapter = chapters[0]; if (!chapter) return; const plan = await generateLessonPlan(chapter); addLessonPlan({ id: `lp-${Date.now()}`, classId: chapter.classId, chapterId: chapter.id, date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), durationMins: 45, ...plan }); pushAiLog({ kind: "lesson", title: plan.title, preview: "Generated from dashboard" }); }
  async function quickQuiz() { const chapter = chapters[0]; if (!chapter) return; const questions = await generateQuizFromChapter(chapter); addAssessment({ id: `a-${Date.now()}`, title: `Quick quiz: ${chapter.title}`, classId: chapter.classId, subject: classes.find((c) => c.id === chapter.classId)?.subject ?? "Science", chapterId: chapter.id, chapterIds: [chapter.id], type: "quiz", maxMarks: questions.reduce((n, q) => n + q.marks, 0), date: new Date().toISOString().slice(0, 10), term: "Term 1", questions: questions.map((q, i) => ({ ...q, id: `q-${i}` })) }); pushAiLog({ kind: "quiz", title: chapter.title, preview: "Generated quick quiz" }); }
  async function parentDraft() {
    const student = flagged[0];
    if (!student) return;
    const body = await generateParentUpdateLive(student.name, calcAttendancePct(student.id, attendance));
    addNote({ title: `Parent update: ${student.name}`, body, studentId: student.id, classId: student.classId, pinned: false });
    pushAiLog({ kind: "parent", title: student.name, preview: "Saved parent update draft" });
  }

  const quiz = assessments.find((a) => a.id === "a1");
  const quizGrades = grades.filter((g) => g.assessmentId === "a1");
  const classAvg = quiz ? average(quizGrades.map((g) => (g.marks / quiz.maxMarks) * 100)) : 0;

  const attendanceTrend = ["2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"].map(
    (date) => {
      const day = attendance.filter((a) => a.date === date && a.classId === "c1");
      const present = day.filter((a) => a.status === "present" || a.status === "late").length;
      return {
        date: date.slice(5),
        pct: day.length ? Math.round((present / day.length) * 100) : 0,
      };
    }
  );

  const weakTopics = [
    { topic: "Stomata / gas exchange", missRate: 38 },
    { topic: "Light vs dark reactions", missRate: 29 },
    { topic: "Equation balancing", missRate: 22 },
  ];

  const isFriday = todayName === "Friday";
  const sinceLogin = previousLoginAt
    ? auditLog.filter((a) => a.at > previousLoginAt).slice(0, 5)
    : [];
  const quote = factOfTheDay(chapters[0]?.title);

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.name.split(" ")[0]}`}
        subtitle={`${quote} · ${activityOfTheDay(user?.subject)}`}
        actions={
          <Link className="btn btn-primary" href="/attendance?start=1">
            Start my day
          </Link>
        }
      />

      {sinceLogin.length > 0 && (
        <section className="surface mb-4 p-4">
          <h2 className="font-semibold">Since you last logged in</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-muted">
            {sinceLogin.map((a) => (
              <li key={a.id}>
                {a.action}: {a.detail}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(recentItems.length > 0 || favorites.length > 0) && (
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <section className="surface p-4">
            <h2 className="font-semibold">Jump back in</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {recentItems.map((r) => (
                <li key={r.href}>
                  <Link className="text-brand hover:underline" href={r.href}>
                    {r.label}
                  </Link>
                  <span className="ml-2 text-xs text-ink-muted">{r.kind}</span>
                </li>
              ))}
              {!recentItems.length && <li className="text-ink-muted">Open a student, chapter, or class to build this list.</li>}
            </ul>
          </section>
          <section className="surface p-4">
            <h2 className="font-semibold">Pinned this week</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {favorites.map((f) => (
                <li key={`${f.kind}-${f.id}`}>
                  <Link className="text-brand hover:underline" href={f.href}>
                    {f.label}
                  </Link>
                </li>
              ))}
              {!favorites.length && (
                <li className="text-ink-muted">
                  Pin a class from <Link href="/classes" className="text-brand">Class pulse</Link>.
                </li>
              )}
            </ul>
          </section>
        </div>
      )}

      {isFriday && (
        <section className="surface mb-4 border border-brand/20 bg-brand-soft/40 p-4">
          <h2 className="font-display text-xl">End-of-week recap</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {weeklyDigest({
              classCount: visibleClasses(user, classes, classScope).length,
              studentCount: visible.length,
              avgAttendance: Math.round(average(visible.map((s) => calcAttendancePct(s.id, attendance))) || 100),
              avgQuiz: Math.round(classAvg) || 0,
              lowAttendanceCount: flagged.length,
            })}
          </p>
          <p className="mt-2 text-sm">
            Pending grading items: {pendingGrading.length}. Open reminders: {openReminders.filter((r) => !r.done).length}.
          </p>
        </section>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Today’s classes",
            value: String(todaysClasses.length || "—"),
            hint: todaysClasses.length ? todaysClasses.map((c) => c.time).join(", ") : "No classes scheduled",
            icon: CalendarClock,
          },
          {
            label: "Pending grading",
            value: String(pendingGrading.reduce((n, a) => n + a.submissions.filter((s) => s.status === "submitted").length, 0)),
            hint: "Submitted homework waiting",
            icon: ClipboardCheck,
          },
          {
            label: "Open reminders",
            value: String(openReminders.length),
            hint: "Due tasks on Notes",
            icon: AlertCircle,
          },
          {
            label: "Class quiz average",
            value: `${Math.round(classAvg)}%`,
            hint: quiz?.title ?? "Latest assessment",
            icon: CheckCircle2,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="surface p-4">
              <div className="flex items-start justify-between">
                <div className="text-sm text-ink-muted">{card.label}</div>
                <Icon size={18} className="text-brand" />
              </div>
              <div className="mt-2 font-display text-3xl">{card.value}</div>
              <div className="mt-1 text-xs text-ink-muted">{card.hint}</div>
            </div>
          );
        })}
      </div>
      <section className="surface mb-4 p-5"><h2 className="font-display text-xl">AI briefing</h2><p className="mt-2 text-sm text-ink-muted">{briefing}</p><div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary" onClick={tomorrowLesson}>Generate tomorrow&apos;s lesson</button><button className="btn btn-secondary" onClick={quickQuiz}>Quick quiz</button><button className="btn btn-secondary" disabled={!flagged.length} onClick={parentDraft}>Draft parent update</button></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div><h3 className="font-semibold">Smart alerts</h3>{alerts.slice(0, 4).map((a) => <p key={a.id} className="mt-1 text-sm">{a.title}</p>)}</div><div><h3 className="font-semibold">AI to-dos</h3>{todos.slice(0, 4).map((t) => <p key={t.id} className="mt-1 text-sm">{t.label}</p>)}</div></div></section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">Today’s schedule</h2>
            <Link href="/lessons" className="text-sm font-semibold text-brand">
              Open planner
            </Link>
          </div>
          {todaysClasses.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No periods listed for {todayName}. Check the timetable in Settings or Lesson Plans.
            </p>
          ) : (
            <ul className="space-y-3">
              {todaysClasses.map((slot) => {
                const cls = classes.find((c) => c.id === slot.classId);
                return (
                  <li key={slot.id} className="flex items-center justify-between rounded-xl bg-bg-elevated px-3 py-3">
                    <div>
                      <div className="font-semibold">{cls?.name ?? slot.subject}</div>
                      <div className="text-sm text-ink-muted">
                        {slot.time} · {slot.room}
                      </div>
                    </div>
                    <Link href="/attendance" className="btn btn-secondary">
                      Attendance
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6">
            <h3 className="mb-3 font-semibold">Attendance trend (8A)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5dde6" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="pct" fill="#1f6f63" radius={[6, 6, 0, 0]} name="Present %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface p-5">
            <h2 className="mb-3 font-display text-xl">Upcoming deadlines</h2>
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="rounded-xl border border-line px-3 py-3">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm text-ink-muted">Due {formatDate(a.dueDate)}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <BookMarked size={18} className="text-accent" />
              <h2 className="font-display text-xl">Weak topics</h2>
            </div>
            <p className="mb-3 text-sm text-ink-muted">Detected from recent quiz misses.</p>
            <ul className="space-y-2">
              {weakTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between text-sm">
                  <span>{t.topic}</span>
                  <span className="badge badge-warn">{t.missRate}% miss</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl">Recent uploads</h2>
              <Link href="/library" className="text-sm font-semibold text-brand">
                Library
              </Link>
            </div>
            <ul className="space-y-2">
              {materials.slice(0, 3).map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <Upload size={14} className="text-brand" />
                  <span className="truncate">{m.title}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface p-5">
            <h2 className="mb-2 font-display text-xl">Academic calendar</h2>
            <ul className="space-y-2 text-sm">
              {holidays.map((h) => (
                <li key={h.id} className="flex justify-between gap-2">
                  <span>{h.title}</span>
                  <span className="badge capitalize">{h.type}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
