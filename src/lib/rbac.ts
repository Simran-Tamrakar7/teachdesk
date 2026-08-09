import type { AttendanceRecord, Role, SchoolClass, Student, User } from "./types";
import { isGradeEnabled, sortByGradeOrder } from "./grade-settings";

export function isAdminLike(role?: Role) {
  return role === "admin" || role === "hod";
}

export function visibleClasses(
  user: User | null,
  classes: SchoolClass[],
  opts?: { enabledGrades?: string[]; gradeOrder?: string[] }
) {
  let active = classes.filter((c) => !c.deletedAt);
  if (opts?.enabledGrades?.length) {
    active = active.filter((c) => isGradeEnabled(c.grade, opts.enabledGrades!));
  }
  if (!user) return [];
  if (isAdminLike(user.role)) {
    return opts?.gradeOrder?.length ? sortByGradeOrder(active, opts.gradeOrder) : active;
  }
  if (user.role === "teacher") {
    active = active.filter((c) => c.teacherId === user.id || user.classIds?.includes(c.id));
    return opts?.gradeOrder?.length ? sortByGradeOrder(active, opts.gradeOrder) : active;
  }
  return [];
}

export function visibleStudents(
  user: User | null,
  students: Student[],
  classes: SchoolClass[],
  opts?: { enabledGrades?: string[]; gradeOrder?: string[] }
) {
  const classIds = new Set(visibleClasses(user, classes, opts).map((c) => c.id));
  return students.filter((s) => !s.deletedAt && classIds.has(s.classId));
}

export function calcAttendancePct(studentId: string, records: AttendanceRecord[]) {
  const mine = records.filter((r) => r.studentId === studentId);
  if (!mine.length) return 100;
  const good = mine.filter((r) => r.status === "present" || r.status === "late" || r.status === "excused").length;
  return Math.round((good / mine.length) * 100);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
