"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { average, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
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
  const messages = useAppStore((s) => s.messages);
  const classes = useAppStore((s) => s.classes);

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todaysClasses = timetable.filter((t) => t.day === todayName);
  const pendingGrading = assignments.filter((a) =>
    a.submissions.some((s) => s.status === "submitted")
  );
  const upcoming = [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const unread = messages.filter((m) => !m.read && m.to === user?.email);

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

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.name.split(" ")[0]}`}
        subtitle="Here’s what needs your attention today — classes, grading, and upcoming deadlines."
      />

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
            label: "Unread messages",
            value: String(unread.length),
            hint: "Parent / school inbox",
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
                    <Link href="/students" className="btn btn-secondary">
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
