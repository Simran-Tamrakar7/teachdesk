"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import { UserRound, Users } from "lucide-react";
import { useMemo, useState } from "react";

export default function StudentsPage() {
  const students = useAppStore((s) => s.students);
  const classes = useAppStore((s) => s.classes);
  const attendance = useAppStore((s) => s.attendance);
  const grades = useAppStore((s) => s.grades);
  const assessments = useAppStore((s) => s.assessments);
  const setAttendance = useAppStore((s) => s.setAttendance);
  const promoteStudent = useAppStore((s) => s.promoteStudent);
  const user = useAppStore((s) => s.user);

  const [classId, setClassId] = useState("c1");
  const [date, setDate] = useState("2026-08-09");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [promoteTo, setPromoteTo] = useState("c2");

  const roster = useMemo(
    () => students.filter((s) => s.classId === classId).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
    [students, classId]
  );

  const selected = students.find((s) => s.id === selectedId) ?? roster[0];

  const history = selected
    ? attendance
        .filter((a) => a.studentId === selected.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8)
    : [];

  const performance = selected
    ? grades
        .filter((g) => g.studentId === selected.id)
        .map((g) => {
          const a = assessments.find((x) => x.id === g.assessmentId);
          return {
            title: a?.title ?? "Assessment",
            pct: a ? Math.round((g.marks / a.maxMarks) * 100) : 0,
          };
        })
    : [];

  const readOnly = user?.role === "parent" || user?.role === "student";

  function markAll(status: "present" | "absent") {
    for (const s of roster) setAttendance(s.id, classId, date, status);
  }

  return (
    <div>
      <PageHeader
        title="Students & Attendance"
        subtitle="Roster, quick present/absent marking, profiles, and promote between sections."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {classes.map((c) => (
          <button
            key={c.id}
            className={`btn ${classId === c.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setClassId(c.id);
              setSelectedId(null);
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="surface p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <Users size={16} /> Attendance — {format(new Date(date), "EEE, MMM d")}
              </div>
              <p className="text-sm text-ink-muted">Period 1 · tap a status to toggle</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="input w-auto"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={readOnly}
              />
              {!readOnly && (
                <>
                  <button className="btn btn-secondary" onClick={() => markAll("present")}>
                    All present
                  </button>
                  <button className="btn btn-secondary" onClick={() => markAll("absent")}>
                    All absent
                  </button>
                </>
              )}
            </div>
          </div>

          <ul className="divide-y divide-line">
            {roster.map((s) => {
              const rec = attendance.find(
                (a) => a.studentId === s.id && a.classId === classId && a.date === date && a.period === 1
              );
              const status = rec?.status ?? "present";
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <button className="text-left" onClick={() => setSelectedId(s.id)}>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-ink-muted">
                      {s.rollNumber} · Attendance {s.attendancePct}%
                    </div>
                  </button>
                  <div className="flex gap-1">
                    {(["present", "late", "absent", "excused"] as const).map((st) => (
                      <button
                        key={st}
                        disabled={readOnly}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                          status === st
                            ? st === "absent"
                              ? "bg-danger text-white"
                              : st === "late"
                                ? "bg-accent text-white"
                                : "bg-brand text-white"
                            : "bg-bg-elevated text-ink-muted"
                        }`}
                        onClick={() => setAttendance(s.id, classId, date, st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="surface p-4">
          {selected ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand-deep">
                  <UserRound size={22} />
                </div>
                <div>
                  <div className="font-display text-xl">{selected.name}</div>
                  <div className="text-sm text-ink-muted">
                    {selected.rollNumber} · Sec {selected.section}
                  </div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-bg-elevated p-3">
                  <div className="text-ink-muted">Attendance</div>
                  <div className="text-lg font-bold">{selected.attendancePct}%</div>
                </div>
                <div className="rounded-xl bg-bg-elevated p-3">
                  <div className="text-ink-muted">Assessments</div>
                  <div className="text-lg font-bold">{performance.length}</div>
                </div>
              </div>

              <h4 className="text-sm font-semibold">Performance history</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {performance.length === 0 && <li className="text-ink-muted">No grades yet.</li>}
                {performance.map((p) => (
                  <li key={p.title} className="flex justify-between">
                    <span>{p.title}</span>
                    <span className="font-semibold">{p.pct}%</span>
                  </li>
                ))}
              </ul>

              <h4 className="mt-4 text-sm font-semibold">Recent attendance</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex justify-between capitalize">
                    <span>{h.date}</span>
                    <span className="badge">{h.status}</span>
                  </li>
                ))}
              </ul>

              {!readOnly && (
                <div className="mt-4 border-t border-line pt-4">
                  <h4 className="text-sm font-semibold">Promote / move</h4>
                  <select className="select mt-2" value={promoteTo} onChange={(e) => setPromoteTo(e.target.value)}>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary mt-2 w-full"
                    onClick={() => {
                      const target = classes.find((c) => c.id === promoteTo);
                      if (!target) return;
                      promoteStudent(selected.id, target.id, target.section);
                      setClassId(target.id);
                    }}
                  >
                    Move student
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-ink-muted">Select a student.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
