"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { exportAttendancePdf, monthAttendanceMatrix } from "@/lib/exports";
import { calcAttendancePct, visibleClasses, visibleStudents } from "@/lib/rbac";
import { format } from "date-fns";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function AttendanceInner() {
  const search = useSearchParams();
  const students = useAppStore((s) => s.students);
  const classes = useAppStore((s) => s.classes);
  const attendance = useAppStore((s) => s.attendance);
  const setAttendance = useAppStore((s) => s.setAttendance);
  const user = useAppStore((s) => s.user);
  const schoolName = useAppStore((s) => s.schoolName);
  const threshold = useAppStore((s) => s.attendanceThreshold);
  const timetable = useAppStore((s) => s.timetable);

  const allowedClasses = visibleClasses(user, classes);
  const [classId, setClassId] = useState(allowedClasses[0]?.id ?? "c1");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState(1);
  const [tab, setTab] = useState<"daily" | "monthly" | "flags">("daily");
  const [banner, setBanner] = useState("");
  const readOnly = user?.role === "parent" || user?.role === "student";

  useEffect(() => {
    const qClass = search.get("classId");
    const qDate = search.get("date");
    const start = search.get("start");
    if (qDate) setDate(qDate);
    if (qClass && allowedClasses.some((c) => c.id === qClass)) setClassId(qClass);
    if (start === "1") {
      const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
      const first = timetable.find((t) => t.day === todayName && allowedClasses.some((c) => c.id === t.classId));
      if (first) {
        setClassId(first.classId);
        setPeriod(first.period || 1);
      }
      setDate(new Date().toISOString().slice(0, 10));
      setTab("daily");
      setBanner("Start my day — marking today’s first class.");
    }
  }, [search, allowedClasses, timetable]);

  const roster = useMemo(
    () =>
      visibleStudents(user, students, classes)
        .filter((s) => s.classId === classId)
        .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
    [students, classId, user, classes]
  );

  function markAll(status: "present" | "absent") {
    for (const s of roster) setAttendance(s.id, classId, date, status, period);
  }

  const presentCount = roster.filter((s) => {
    const rec = attendance.find((a) => a.studentId === s.id && a.classId === classId && a.date === date && a.period === period);
    const status = rec?.status ?? "present";
    return status === "present" || status === "late";
  }).length;

  const flagged = roster.filter((s) => calcAttendancePct(s.id, attendance) < threshold);

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Daily & period marking, monthly patterns, and threshold flags. Big taps for phone use between classes."
      />
      {banner && <p className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-deep">{banner}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["daily", "Daily"],
            ["monthly", "Monthly"],
            ["flags", "Flags"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`btn ${tab === id ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {allowedClasses.map((c) => (
          <button key={c.id} className={`btn ${classId === c.id ? "btn-primary" : "btn-secondary"}`} onClick={() => setClassId(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <section className="surface p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-semibold">{format(new Date(date + "T12:00:00"), "EEEE, MMM d")}</div>
              <p className="text-sm text-ink-muted">
                {presentCount}/{roster.length} present · Period {period}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input className="input w-auto" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={readOnly} />
              <select className="select w-auto" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
                {[1, 2, 3, 4].map((p) => (
                  <option key={p} value={p}>
                    Period {p}
                  </option>
                ))}
              </select>
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
              <button
                className="btn btn-secondary"
                onClick={() =>
                  exportAttendancePdf({
                    schoolName,
                    className: allowedClasses.find((c) => c.id === classId)?.name ?? "Class",
                    date,
                    period,
                    rows: roster.map((s) => ({
                      roll: s.rollNumber,
                      name: s.name,
                      status:
                        attendance.find((a) => a.studentId === s.id && a.classId === classId && a.date === date && a.period === period)
                          ?.status ?? "present",
                    })),
                  })
                }
              >
                Export PDF
              </button>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {roster.map((s) => {
              const rec = attendance.find((a) => a.studentId === s.id && a.classId === classId && a.date === date && a.period === period);
              const status = rec?.status ?? "present";
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-ink-muted">
                      {s.rollNumber} · {calcAttendancePct(s.id, attendance)}%
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(["present", "late", "absent", "excused"] as const).map((st) => (
                      <button
                        key={st}
                        disabled={readOnly}
                        className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold capitalize ${
                          status === st
                            ? st === "absent"
                              ? "bg-danger text-white"
                              : st === "late"
                                ? "bg-accent text-white"
                                : "bg-brand text-white"
                            : "bg-bg-elevated text-ink-muted"
                        }`}
                        onClick={() => setAttendance(s.id, classId, date, st, period)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          {!roster.length && <p className="py-8 text-center text-ink-muted">No students in this class.</p>}
        </section>
      )}

      {tab === "monthly" && (
        <section className="surface overflow-x-auto p-4">
          <h2 className="font-semibold">Monthly register</h2>
          <table className="mt-3 min-w-max text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface p-2 text-left">Student</th>
                {Array.from({ length: new Date(2026, 8, 0).getDate() }, (_, i) => (
                  <th className="p-1" key={i}>
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthAttendanceMatrix(roster, attendance, classId, 2026, 7).map(({ student, cells }) => (
                <tr key={student.id} className="border-t border-line">
                  <td className="sticky left-0 bg-surface p-2">{student.name}</td>
                  {cells.map((c) => (
                    <td className="p-1 text-center" key={c.date}>
                      {c.status === "present" ? "P" : c.status === "absent" ? "A" : c.status === "late" ? "L" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "flags" && (
        <section className="surface p-4">
          <h2 className="font-semibold">Below {threshold}%</h2>
          <ul className="mt-3 space-y-2">
            {flagged.map((s) => (
              <li key={s.id} className="flex justify-between border-t border-line py-2 text-sm">
                <span className="font-semibold">{s.name}</span>
                <span className="badge badge-warn">{calcAttendancePct(s.id, attendance)}%</span>
              </li>
            ))}
            {!flagged.length && <li className="text-ink-muted">No students below threshold.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink-muted">Loading attendance…</p>}>
      <AttendanceInner />
    </Suspense>
  );
}
