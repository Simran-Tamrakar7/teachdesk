"use client";

import { useAppStore } from "@/lib/store";
import { dismissBackupNudge, shouldShowBackupNudge } from "@/lib/autobackup";
import { visibleClasses } from "@/lib/rbac";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function previousSchoolDay(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

export function ComfortOverlays() {
  const user = useAppStore((s) => s.user);
  const classes = useAppStore((s) => s.classes);
  const attendance = useAppStore((s) => s.attendance);
  const timetable = useAppStore((s) => s.timetable);
  const breakReminders = useAppStore((s) => s.breakReminders);
  const colorMode = useAppStore((s) => s.colorMode);
  const missedAttendanceDismissedFor = useAppStore((s) => s.missedAttendanceDismissedFor);
  const dismissMissedAttendance = useAppStore((s) => s.dismissMissedAttendance);
  const lastBackupAt = useAppStore((s) => s.lastBackupAt);
  const backupNudgeDays = useAppStore((s) => s.backupNudgeDays);

  const [breakOpen, setBreakOpen] = useState(false);
  const [backupNudge, setBackupNudge] = useState(false);
  const [sessionStart] = useState(() => Date.now());

  const allowed = useMemo(() => visibleClasses(user, classes), [user, classes]);

  const missed = useMemo(() => {
    if (!user || user.role === "parent" || user.role === "student") return null;
    const prev = previousSchoolDay();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][prev.getDay()];
    if (prev.getDay() === 6) return null;
    const date = prev.toISOString().slice(0, 10);
    if (missedAttendanceDismissedFor === date) return null;
    const hadClass = timetable.some((t) => t.day === dayName && allowed.some((c) => c.id === t.classId));
    if (!hadClass) return null;
    const marked = attendance.some((a) => a.date === date && allowed.some((c) => c.id === a.classId));
    if (marked) return null;
    const first = timetable.find((t) => t.day === dayName && allowed.some((c) => c.id === t.classId));
    return { date, dayName, classId: first?.classId };
  }, [user, timetable, attendance, allowed, missedAttendanceDismissedFor]);

  useEffect(() => {
    if (colorMode !== "auto") return;
    const apply = () => {
      const hour = new Date().getHours();
      const dark = hour >= 18 || hour < 6;
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, [colorMode]);

  useEffect(() => {
    if (!breakReminders || !user) return;
    const id = window.setInterval(() => {
      if (Date.now() - sessionStart > 50 * 60_000) setBreakOpen(true);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [breakReminders, user, sessionStart]);

  useEffect(() => {
    if (!user) return;
    setBackupNudge(shouldShowBackupNudge(lastBackupAt, backupNudgeDays));
  }, [user, lastBackupAt, backupNudgeDays]);

  return (
    <>
      {backupNudge && (
        <div className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-lg rounded-2xl border border-line bg-surface p-4 shadow-lg md:left-auto md:right-24">
          <div className="font-semibold">Backup reminder</div>
          <p className="mt-1 text-sm text-ink-muted">
            It&apos;s been a while since your last manual download. Auto-backups stay in this browser only — export a copy in Settings if you switch devices.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/settings">
              Open Settings → Backup
            </Link>
            <button
              className="btn btn-secondary"
              onClick={() => {
                dismissBackupNudge();
                setBackupNudge(false);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {missed && !backupNudge && (
        <div className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-lg rounded-2xl border border-accent/40 bg-accent-soft p-4 shadow-lg md:left-auto md:right-24">
          <div className="font-semibold">Attendance gap</div>
          <p className="mt-1 text-sm text-ink-muted">
            You didn&apos;t mark attendance for {missed.dayName} ({missed.date}). Do it now?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn btn-primary" href={`/attendance?date=${missed.date}&classId=${missed.classId ?? ""}`}>
              Mark now
            </Link>
            <button className="btn btn-secondary" onClick={() => dismissMissedAttendance(missed.date)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {breakOpen && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-lg md:right-8 md:left-auto">
          <div className="font-semibold">You&apos;ve been at this a while</div>
          <p className="mt-1 text-sm text-ink-muted">A short stretch or water break helps before the next stack of papers.</p>
          <button className="btn btn-secondary mt-3 w-full" onClick={() => setBreakOpen(false)}>
            Thanks — dismiss
          </button>
        </div>
      )}
    </>
  );
}
