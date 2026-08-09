"use client";

import { useAppStore } from "./store";
import { useMemo } from "react";

/** Enabled grades + order from Settings → Manage Classes */
export function useClassScope() {
  const enabledGrades = useAppStore((s) => s.enabledGrades);
  const gradeOrder = useAppStore((s) => s.gradeOrder);
  return useMemo(() => ({ enabledGrades, gradeOrder }), [enabledGrades, gradeOrder]);
}
