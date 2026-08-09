import type { Assessment, AttendanceRecord, GradeEntry, Holiday, LessonPlan, Reminder, Student, TimetableSlot } from "./types";
import { calcAttendancePct } from "./rbac";
import { average } from "./utils";

export type SmartAlert = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href?: string;
};

export type AiTodo = {
  id: string;
  label: string;
  urgency: number;
  href: string;
};

export function buildDailyBriefing(input: {
  teacherName: string;
  todayName: string;
  todaysClasses: TimetableSlot[];
  classNames: Record<string, string>;
  openReminders: Reminder[];
  lowAttendance: { name: string; pct: number }[];
  pendingSubmissions: number;
  holidaysSoon: Holiday[];
}) {
  const parts: string[] = [];
  parts.push(`Good morning, ${input.teacherName.split(" ")[0]}.`);
  if (input.todaysClasses.length) {
    parts.push(
      `You have ${input.todaysClasses.length} class${input.todaysClasses.length > 1 ? "es" : ""} today (${input.todaysClasses
        .map((c) => `${input.classNames[c.classId] ?? c.subject} at ${c.time}`)
        .join("; ")}).`
    );
  } else if (input.todayName === "Saturday") {
    parts.push("Saturday — school weekend. Good time to catch up on grading or plan next week.");
  } else {
    parts.push("No periods on the timetable for today.");
  }
  if (input.openReminders.length) {
    parts.push(`${input.openReminders.length} open reminder${input.openReminders.length > 1 ? "s" : ""} need attention.`);
  }
  if (input.lowAttendance.length) {
    parts.push(
      `Attendance watch: ${input.lowAttendance
        .slice(0, 3)
        .map((s) => `${s.name} (${s.pct}%)`)
        .join(", ")}.`
    );
  }
  if (input.pendingSubmissions) {
    parts.push(`${input.pendingSubmissions} homework submission${input.pendingSubmissions > 1 ? "s" : ""} waiting to be graded.`);
  }
  if (input.holidaysSoon.length) {
    parts.push(`Coming up: ${input.holidaysSoon.map((h) => `${h.title} (${h.date})`).join(", ")}.`);
  }
  return parts.join(" ");
}

export function buildSmartAlerts(input: {
  students: Student[];
  attendance: AttendanceRecord[];
  threshold: number;
  grades: GradeEntry[];
  assessments: Assessment[];
  holidays: Holiday[];
  pendingSubmissions: number;
  classNames: Record<string, string>;
}): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  for (const s of input.students) {
    const pct = calcAttendancePct(s.id, input.attendance);
    if (pct < input.threshold) {
      alerts.push({
        id: `att-${s.id}`,
        severity: pct < input.threshold - 10 ? "high" : "medium",
        title: `${s.name} attendance at ${pct}%`,
        detail: `Below your ${input.threshold}% threshold.`,
        href: `/students/${s.id}`,
      });
    }
  }

  const byAssessment = new Map<string, number[]>();
  for (const g of input.grades) {
    const list = byAssessment.get(g.assessmentId) ?? [];
    list.push(g.marks);
    byAssessment.set(g.assessmentId, list);
  }
  const assessmentsSorted = [...input.assessments].sort((a, b) => a.date.localeCompare(b.date));
  if (assessmentsSorted.length >= 2) {
    const last = assessmentsSorted[assessmentsSorted.length - 1];
    const prev = assessmentsSorted[assessmentsSorted.length - 2];
    const lastMarks = byAssessment.get(last.id) ?? [];
    const prevMarks = byAssessment.get(prev.id) ?? [];
    if (lastMarks.length && prevMarks.length) {
      const lastAvg = average(lastMarks.map((m) => (m / last.maxMarks) * 100));
      const prevAvg = average(prevMarks.map((m) => (m / prev.maxMarks) * 100));
      if (lastAvg < prevAvg - 5) {
        alerts.push({
          id: `avg-${last.id}`,
          severity: "high",
          title: `Class average dropped after ${last.title}`,
          detail: `${prevAvg.toFixed(0)}% → ${lastAvg.toFixed(0)}%. Revisit weak topics before the next test.`,
          href: "/exams",
        });
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const h of input.holidays) {
    const days = (new Date(h.date).getTime() - new Date(today).getTime()) / 86400000;
    if (days >= 0 && days <= 7) {
      const clash = input.holidays.find((x) => x.date === h.date && x.id !== h.id && x.type !== h.type);
      alerts.push({
        id: `cal-${h.id}`,
        severity: clash ? "high" : "low",
        title: `${h.title} on ${h.date}`,
        detail: clash ? `Conflict with ${clash.title} same day.` : `${h.type.replace("_", " ")} within a week.`,
        href: "/lessons",
      });
    }
  }

  if (input.pendingSubmissions > 0) {
    alerts.push({
      id: "grade-nudge",
      severity: input.pendingSubmissions > 8 ? "medium" : "low",
      title: "Ungraded work waiting",
      detail: `${input.pendingSubmissions} submissions still pending review.`,
      href: "/exams",
    });
  }

  return alerts.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]));
}

export function buildAiTodos(input: {
  openReminders: Reminder[];
  alerts: SmartAlert[];
  todaysClasses: TimetableSlot[];
  pendingSubmissions: number;
}): AiTodo[] {
  const todos: AiTodo[] = [];
  for (const a of input.alerts.slice(0, 4)) {
    todos.push({
      id: a.id,
      label: a.title,
      urgency: a.severity === "high" ? 100 : a.severity === "medium" ? 70 : 40,
      href: a.href ?? "/dashboard",
    });
  }
  for (const r of input.openReminders.filter((x) => !x.done && !x.deletedAt).slice(0, 3)) {
    const dueSoon = r.dueAt <= new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    todos.push({
      id: r.id,
      label: r.title,
      urgency: dueSoon ? 90 : 50,
      href: "/notes",
    });
  }
  if (input.todaysClasses.length) {
    todos.push({
      id: "prep-today",
      label: "Prep materials for today’s classes",
      urgency: 60,
      href: "/library",
    });
  }
  if (input.pendingSubmissions) {
    todos.push({ id: "grade", label: "Clear pending grading", urgency: 75, href: "/exams" });
  }
  return todos.sort((a, b) => b.urgency - a.urgency).slice(0, 8);
}

export function weeklyDigest(input: {
  classCount: number;
  studentCount: number;
  avgAttendance: number;
  avgQuiz: number;
  lowAttendanceCount: number;
}) {
  return `Weekly digest: You manage ${input.classCount} classes and ${input.studentCount} students. Average attendance sits around ${input.avgAttendance}%. Latest quiz average is ${input.avgQuiz}%. ${input.lowAttendanceCount} student(s) are below your attendance threshold — plan a quick check-in.`;
}

export function factOfTheDay(chapterTitle?: string) {
  const facts = [
    "Leaves look green because chlorophyll reflects green light.",
    "Stomata open wider in light — a perfect lab talking point.",
    "Oxygen from photosynthesis keeps animal life possible.",
    "Exit tickets work best when tied to one clear objective.",
  ];
  if (chapterTitle?.toLowerCase().includes("photo")) {
    return `Fact of the day (${chapterTitle}): Plants convert light energy into chemical energy stored in glucose.`;
  }
  const i = new Date().getDate() % facts.length;
  return `Fact of the day: ${facts[i]}`;
}

export function activityOfTheDay(subject?: string) {
  if (subject?.toLowerCase().includes("math")) return "Activity: 5-minute number talk — one problem, three strategies.";
  if (subject?.toLowerCase().includes("english")) return "Activity: 3-sentence summary race using today’s vocabulary.";
  return "Activity: Think-pair-share — one misconception, one correct explanation.";
}

export function forecastGrade(pcts: number[]) {
  if (!pcts.length) return null;
  const recent = pcts.slice(-3);
  const trend = recent.length >= 2 ? recent[recent.length - 1] - recent[0] : 0;
  const forecast = Math.max(0, Math.min(100, average(recent) + trend * 0.5));
  return { forecast: Math.round(forecast), atRisk: forecast < 50 };
}

export function generateParentUpdate(studentName: string, attendancePct: number, latestPct?: number) {
  return `Dear Parent/Guardian,\n\nA quick update on ${studentName}. Current attendance is ${attendancePct}%.${
    latestPct != null ? ` Recent assessment performance is around ${latestPct}%.` : ""
  } Please encourage short daily revision of key terms. Happy to discuss further.\n\nWarm regards`;
}
