"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ANNOUNCEMENTS,
  ASSESSMENTS,
  ASSIGNMENTS,
  ATTENDANCE,
  CHAPTERS,
  CLASSES,
  DEMO_USERS,
  GRADES,
  HOLIDAYS,
  LESSON_PLANS,
  MATERIALS,
  MESSAGES,
  RESEARCH,
  STUDENTS,
  TIMETABLE,
} from "./seed";
import type {
  Announcement,
  Assessment,
  Assignment,
  AttendanceRecord,
  Chapter,
  ChatMessage,
  GradeEntry,
  LessonPlan,
  Material,
  Message,
  ResearchItem,
  Student,
  User,
} from "./types";
import { uid } from "./utils";

type AppState = {
  user: User | null;
  hydrated: boolean;
  classes: typeof CLASSES;
  chapters: Chapter[];
  materials: Material[];
  lessonPlans: LessonPlan[];
  students: Student[];
  attendance: AttendanceRecord[];
  assessments: Assessment[];
  grades: GradeEntry[];
  assignments: Assignment[];
  announcements: Announcement[];
  messages: Message[];
  research: ResearchItem[];
  timetable: typeof TIMETABLE;
  holidays: typeof HOLIDAYS;
  assistantOpen: boolean;
  assistantMessages: ChatMessage[];
  fontScale: number;
  highContrast: boolean;
  ttsEnabled: boolean;
  language: "en" | "ne" | "hi";
  login: (email: string) => boolean;
  logout: () => void;
  setHydrated: () => void;
  setAssistantOpen: (v: boolean) => void;
  pushAssistant: (m: ChatMessage) => void;
  clearAssistant: () => void;
  addMaterial: (m: Material) => void;
  addChapters: (chs: Chapter[]) => void;
  addLessonPlan: (lp: LessonPlan) => void;
  addAssessment: (a: Assessment) => void;
  upsertGrade: (g: GradeEntry) => void;
  importGradesCsv: (assessmentId: string, rows: { rollNumber: string; marks: number }[]) => number;
  setAttendance: (studentId: string, classId: string, date: string, status: AttendanceRecord["status"]) => void;
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt" | "authorId">) => void;
  addMessage: (m: Omit<Message, "id" | "createdAt" | "read">) => void;
  addResearch: (r: ResearchItem) => void;
  updateResearchSummary: (id: string, summary: string) => void;
  promoteStudent: (studentId: string, newClassId: string, newSection: string) => void;
  addAssignment: (a: Assignment) => void;
  setFontScale: (n: number) => void;
  setHighContrast: (v: boolean) => void;
  setTtsEnabled: (v: boolean) => void;
  setLanguage: (l: "en" | "ne" | "hi") => void;
  resetDemo: () => void;
};

const initialData = {
  classes: CLASSES,
  chapters: CHAPTERS,
  materials: MATERIALS,
  lessonPlans: LESSON_PLANS,
  students: STUDENTS,
  attendance: ATTENDANCE,
  assessments: ASSESSMENTS,
  grades: GRADES,
  assignments: ASSIGNMENTS,
  announcements: ANNOUNCEMENTS,
  messages: MESSAGES,
  research: RESEARCH,
  timetable: TIMETABLE,
  holidays: HOLIDAYS,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      ...initialData,
      assistantOpen: false,
      assistantMessages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hi! I’m your teaching assistant. Ask me to generate a quiz, rewrite text for a reading level, draft a parent email, or explain how to teach a concept.",
        },
      ],
      fontScale: 1,
      highContrast: false,
      ttsEnabled: false,
      language: "en",
      setHydrated: () => set({ hydrated: true }),
      login: (email) => {
        const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return false;
        set({ user, hydrated: true });
        return true;
      },
      logout: () => set({ user: null }),
      setAssistantOpen: (v) => set({ assistantOpen: v }),
      pushAssistant: (m) => set({ assistantMessages: [...get().assistantMessages, m] }),
      clearAssistant: () =>
        set({
          assistantMessages: [
            {
              id: "welcome",
              role: "assistant",
              content: "Chat cleared. What should we work on next?",
            },
          ],
        }),
      addMaterial: (m) => set({ materials: [m, ...get().materials] }),
      addChapters: (chs) => set({ chapters: [...get().chapters, ...chs] }),
      addLessonPlan: (lp) => set({ lessonPlans: [lp, ...get().lessonPlans] }),
      addAssessment: (a) => set({ assessments: [a, ...get().assessments] }),
      upsertGrade: (g) => {
        const existing = get().grades.find(
          (x) => x.assessmentId === g.assessmentId && x.studentId === g.studentId
        );
        if (existing) {
          set({
            grades: get().grades.map((x) => (x.id === existing.id ? { ...existing, ...g, id: existing.id } : x)),
          });
        } else {
          set({ grades: [...get().grades, { ...g, id: g.id || uid("g") }] });
        }
      },
      importGradesCsv: (assessmentId, rows) => {
        let count = 0;
        for (const row of rows) {
          const student = get().students.find((s) => s.rollNumber === row.rollNumber);
          if (!student) continue;
          get().upsertGrade({
            id: uid("g"),
            assessmentId,
            studentId: student.id,
            marks: row.marks,
          });
          count++;
        }
        return count;
      },
      setAttendance: (studentId, classId, date, status) => {
        const existing = get().attendance.find(
          (a) => a.studentId === studentId && a.classId === classId && a.date === date && a.period === 1
        );
        if (existing) {
          set({
            attendance: get().attendance.map((a) => (a.id === existing.id ? { ...a, status } : a)),
          });
        } else {
          set({
            attendance: [
              ...get().attendance,
              { id: uid("att"), studentId, classId, date, period: 1, status },
            ],
          });
        }
      },
      addAnnouncement: (a) => {
        const user = get().user;
        set({
          announcements: [
            {
              ...a,
              id: uid("an"),
              createdAt: new Date().toISOString(),
              authorId: user?.id ?? "u1",
            },
            ...get().announcements,
          ],
        });
      },
      addMessage: (m) =>
        set({
          messages: [
            {
              ...m,
              id: uid("msg"),
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...get().messages,
          ],
        }),
      addResearch: (r) => set({ research: [r, ...get().research] }),
      updateResearchSummary: (id, summary) =>
        set({
          research: get().research.map((r) => (r.id === id ? { ...r, summary } : r)),
        }),
      promoteStudent: (studentId, newClassId, newSection) =>
        set({
          students: get().students.map((s) =>
            s.id === studentId ? { ...s, classId: newClassId, section: newSection } : s
          ),
        }),
      addAssignment: (a) => set({ assignments: [a, ...get().assignments] }),
      setFontScale: (n) => set({ fontScale: n }),
      setHighContrast: (v) => set({ highContrast: v }),
      setTtsEnabled: (v) => set({ ttsEnabled: v }),
      setLanguage: (l) => set({ language: l }),
      resetDemo: () =>
        set({
          ...initialData,
          assistantMessages: [
            {
              id: "welcome",
              role: "assistant",
              content: "Demo data restored. Ready when you are.",
            },
          ],
        }),
    }),
    {
      name: "teachdesk-v1",
      partialize: (s) => ({
        user: s.user,
        materials: s.materials,
        chapters: s.chapters,
        lessonPlans: s.lessonPlans,
        students: s.students,
        attendance: s.attendance,
        assessments: s.assessments,
        grades: s.grades,
        assignments: s.assignments,
        announcements: s.announcements,
        messages: s.messages,
        research: s.research,
        fontScale: s.fontScale,
        highContrast: s.highContrast,
        ttsEnabled: s.ttsEnabled,
        language: s.language,
        assistantMessages: s.assistantMessages,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
