/** Grade enable/order helpers for Settings → Manage Classes */

export const ALL_GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
export type GradeId = (typeof ALL_GRADES)[number];

export function deriveEnabledGradesFromClasses(classes: { grade: string; deletedAt?: string | null }[]): string[] {
  const grades = [
    ...new Set(classes.filter((c) => !c.deletedAt).map((c) => String(c.grade)).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));
  return grades.length ? grades : ["8"];
}

export function isGradeEnabled(grade: string | number, enabledGrades: string[]): boolean {
  // Empty list = treat as all enabled (safe fallback)
  if (!enabledGrades?.length) return true;
  return enabledGrades.includes(String(grade));
}

export function sortByGradeOrder<T extends { grade: string }>(items: T[], gradeOrder: string[]): T[] {
  if (!gradeOrder?.length) {
    return [...items].sort((a, b) => Number(a.grade) - Number(b.grade));
  }
  const order = new Map(gradeOrder.map((g, i) => [String(g), i]));
  return [...items].sort((a, b) => {
    const ao = order.get(String(a.grade));
    const bo = order.get(String(b.grade));
    if (ao == null && bo == null) return Number(a.grade) - Number(b.grade);
    if (ao == null) return 1;
    if (bo == null) return -1;
    return ao - bo || Number(a.grade) - Number(b.grade);
  });
}

export function moveGradeInOrder(order: string[], grade: string, dir: -1 | 1): string[] {
  const next = [...order];
  const i = next.indexOf(grade);
  if (i < 0) return next;
  const j = i + dir;
  if (j < 0 || j >= next.length) return next;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
