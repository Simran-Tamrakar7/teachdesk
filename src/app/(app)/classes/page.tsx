"use client";

import { PageHeader } from "@/components/PageHeader";
import { forecastGrade } from "@/lib/dashboard-ai";
import { calcAttendancePct, visibleClasses, visibleStudents } from "@/lib/rbac";
import { useAppStore } from "@/lib/store";
import { average } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function ClassPulseInner() {
  const search = useSearchParams();
  const focus = search.get("focus");
  const user = useAppStore((s) => s.user);
  const classes = useAppStore((s) => s.classes);
  const students = useAppStore((s) => s.students);
  const attendance = useAppStore((s) => s.attendance);
  const grades = useAppStore((s) => s.grades);
  const assessments = useAppStore((s) => s.assessments);
  const presentations = useAppStore((s) => s.presentations);
  const chapters = useAppStore((s) => s.chapters);
  const threshold = useAppStore((s) => s.attendanceThreshold);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const pushRecent = useAppStore((s) => s.pushRecent);

  const allowed = useMemo(() => visibleClasses(user, classes), [user, classes]);
  const [classId, setClassId] = useState(focus || allowed[0]?.id || "");

  useEffect(() => {
    if (focus) setClassId(focus);
  }, [focus]);

  const roster = useMemo(
    () => visibleStudents(user, students, classes).filter((s) => s.classId === classId),
    [user, students, classes, classId]
  );

  const classAssessments = assessments.filter((a) => a.classId === classId).sort((a, b) => a.date.localeCompare(b.date));
  const trend = classAssessments.map((a) => {
    const marks = grades.filter((g) => g.assessmentId === a.id).map((g) => (g.marks / a.maxMarks) * 100);
    return { label: a.title.slice(0, 14), pct: marks.length ? Math.round(average(marks)) : 0 };
  });

  const avgAtt = roster.length ? Math.round(average(roster.map((s) => calcAttendancePct(s.id, attendance)))) : 100;
  const flagged = roster.filter((s) => calcAttendancePct(s.id, attendance) < threshold);
  const atRisk = roster.filter((s) => {
    const pcts = grades
      .filter((g) => g.studentId === s.id)
      .map((g) => {
        const a = assessments.find((x) => x.id === g.assessmentId);
        return a ? (g.marks / a.maxMarks) * 100 : null;
      })
      .filter((x): x is number => x != null);
    return forecastGrade(pcts)?.atRisk;
  });

  const classDecks = presentations
    .filter((p) => p.classId === classId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const cls = allowed.find((c) => c.id === classId);
  const pinned = favorites.some((f) => f.kind === "class" && f.id === classId);

  return (
    <div>
      <PageHeader
        title="How’s this class doing?"
        subtitle="Attendance, grade trend, and flagged students — one screen."
        actions={
          cls ? (
            <button
              className="btn btn-secondary"
              onClick={() => toggleFavorite({ id: classId, kind: "class", label: cls.name, href: `/classes?focus=${classId}` })}
            >
              {pinned ? "Unpin" : "Pin class"}
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {allowed.map((c) => (
          <button
            key={c.id}
            className={`btn ${classId === c.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setClassId(c.id);
              pushRecent({ id: c.id, kind: "class", label: c.name, href: `/classes?focus=${c.id}` });
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!cls ? (
        <div className="surface p-8 text-center text-ink-muted">Add a class first to see a pulse view.</div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">Avg attendance</div>
              <div className="font-display text-3xl">{avgAtt}%</div>
            </div>
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">Below threshold</div>
              <div className="font-display text-3xl">{flagged.length}</div>
            </div>
            <div className="surface p-4">
              <div className="text-sm text-ink-muted">At-risk forecast</div>
              <div className="font-display text-3xl">{atRisk.length}</div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Grade trend</h3>
                <Link className="text-sm text-brand" href={`/exams?class=${classId}`}>
                  Full exam history
                </Link>
              </div>
              <div className="mt-3 h-52">
                {trend.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5dde6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="pct" stroke="#1f6f63" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-10 text-center text-sm text-ink-muted">No assessments yet.</p>
                )}
              </div>
            </section>
            <section className="surface p-4">
              <h3 className="font-semibold">Needs attention</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {[...flagged, ...atRisk.filter((s) => !flagged.some((f) => f.id === s.id))].slice(0, 8).map((s) => (
                  <li key={s.id} className="flex justify-between border-t border-line py-2">
                    <Link className="font-semibold hover:text-brand" href={`/students/${s.id}`}>
                      {s.name}
                    </Link>
                    <span className="text-ink-muted">{calcAttendancePct(s.id, attendance)}%</span>
                  </li>
                ))}
                {!flagged.length && !atRisk.length && <li className="text-ink-muted">Looking steady.</li>}
              </ul>
            </section>
          </div>

          <section className="surface mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Presentations for this class</h3>
              <Link className="btn btn-secondary text-sm" href={`/presentations?classId=${classId}&step=theme`}>
                Open Presentation Maker
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {classDecks.map((p) => {
                const chTitle = chapters.find((c) => c.id === p.chapterId)?.title;
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 text-sm">
                    <div>
                      <Link className="font-semibold hover:text-brand" href={`/presentations?classId=${classId}`}>
                        {p.title}
                      </Link>
                      <div className="text-xs text-ink-muted">
                        {chTitle ? `${chTitle} · ` : ""}
                        {p.lessonDate ? `Lesson ${p.lessonDate}` : "No lesson date"}
                      </div>
                    </div>
                    <Link className="btn btn-ghost text-xs" href="/presentations">
                      Edit
                    </Link>
                  </li>
                );
              })}
              {!classDecks.length && (
                <li className="text-sm text-ink-muted">No decks tagged to this class yet — generate one from a chapter.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink-muted">Loading class pulse…</p>}>
      <ClassPulseInner />
    </Suspense>
  );
}
