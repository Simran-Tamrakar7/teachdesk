import type { AttendanceRecord, Role, SchoolClass, Student, User } from "./types";

export function isAdminLike(role?: Role) {
  return role === "admin" || role === "hod";
}

export function visibleClasses(user: User | null, classes: SchoolClass[]) {
  const active = classes.filter((c) => !c.deletedAt);
  if (!user) return [];
  if (isAdminLike(user.role)) return active;
  if (user.role === "teacher") {
    return active.filter((c) => c.teacherId === user.id || user.classIds?.includes(c.id));
  }
  return active;
}

export function visibleStudents(user: User | null, students: Student[], classes: SchoolClass[]) {
  const classIds = new Set(visibleClasses(user, classes).map((c) => c.id));
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
