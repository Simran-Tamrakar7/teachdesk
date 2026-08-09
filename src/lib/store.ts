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
  NOTES,
  REMINDERS,
  RESEARCH,
  STUDENTS,
  SUBJECTS,
  TIMETABLE,
} from "./seed";
import { calcAttendancePct, initials } from "./rbac";
import type {
  AiLogEntry,
  Announcement,
  Assessment,
  Assignment,
  AttendanceRecord,
  AuditEntry,
  Chapter,
  ChatMessage,
  FavoriteItem,
  LibraryBookmark,
  GradeEntry,
  Holiday,
  LessonPlan,
  Material,
  Presentation,
  RecentItem,
  Reminder,
  ReminderRecurrence,
  ResearchItem,
  Role,
  SavedTemplate,
  SchoolClass,
  SlideThemeId,
  Student,
  Subject,
  TeacherNote,
  TimetableSlot,
  TrashItem,
  User,
} from "./types";
import { uid } from "./utils";

const TRASH_RETENTION_DAYS = 14;
const BACKUP_VERSION = 4;

const WELCOME_ASSISTANT: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I can generate quizzes, lesson plans, slide decks, parent emails, rubrics, Nepali/Hindi translations, and book pointers. Ask away — or try “what else can you help with?”",
};

const DEFAULT_SETTINGS = {
  schoolName: "Greenfield Secondary School",
  academicYear: "2083 BS / 2026–27",
  fontScale: 1,
  highContrast: false,
  ttsEnabled: false,
  language: "en" as const,
  colorMode: "light" as const,
  attendanceThreshold: 85,
  defaultSlideTheme: "forest" as SlideThemeId,
  notifyAttendance: true,
  notifyGrades: true,
  notifyReminders: true,
  notifyCalendar: true,
  backupNudgeDays: 14,
  lastBackupAt: undefined as string | undefined,
  onboardingDone: false,
  breakReminders: true,
};

export const DEFAULT_TEMPLATES = [
  {
    id: "tpl-lesson",
    kind: "lesson" as const,
    title: "45-min inquiry lesson",
    body: "Hook (5) → Explore (15) → Explain (15) → Exit ticket (10)\nHomework: 2 practice questions linked to objectives.",
  },
  {
    id: "tpl-comment-strong",
    kind: "comment" as const,
    title: "Report comment — strong progress",
    body: "Shows consistent effort and a clear understanding of key ideas. Continues to participate thoughtfully in class discussion.",
  },
  {
    id: "tpl-comment-support",
    kind: "comment" as const,
    title: "Report comment — needs support",
    body: "Is developing core concepts and benefits from guided practice. Encouraging short daily revision of vocabulary at home will help.",
  },
  {
    id: "tpl-worksheet",
    kind: "worksheet" as const,
    title: "Standard worksheet shell",
    body: "A. Warm-up (2 Qs)\nB. Label / define\nC. Apply to a scenario\nD. Reflection: one thing still unclear",
  },
];

const initialData = {
  users: DEMO_USERS,
  subjects: SUBJECTS,
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
  notes: NOTES,
  reminders: REMINDERS,
  presentations: [] as Presentation[],
  research: RESEARCH,
  timetable: TIMETABLE,
  holidays: HOLIDAYS,
  trash: [] as TrashItem[],
  auditLog: [] as AuditEntry[],
  aiLog: [] as AiLogEntry[],
  recentItems: [] as RecentItem[],
  favorites: [] as FavoriteItem[],
  libraryBookmarks: [] as LibraryBookmark[],
  templates: DEFAULT_TEMPLATES,
  lastLoginAt: undefined as string | undefined,
  previousLoginAt: undefined as string | undefined,
  missedAttendanceDismissedFor: undefined as string | undefined,
  ...DEFAULT_SETTINGS,
};

function nowIso() {
  return new Date().toISOString();
}

function trashExpiresAt(from = Date.now()) {
  return new Date(from + TRASH_RETENTION_DAYS * 86_400_000).toISOString();
}

function snoozeUntil(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((x) => [x.id, x]));
  for (const item of incoming) {
    map.set(item.id, { ...map.get(item.id), ...item } as T);
  }
  return Array.from(map.values());
}

type ImportStudentsResult = { imported: number; duplicates: number; skipped: number };

type AppState = {
  user: User | null;
  users: User[];
  hydrated: boolean;
  subjects: Subject[];
  classes: SchoolClass[];
  chapters: Chapter[];
  materials: Material[];
  lessonPlans: LessonPlan[];
  students: Student[];
  attendance: AttendanceRecord[];
  assessments: Assessment[];
  grades: GradeEntry[];
  assignments: Assignment[];
  announcements: Announcement[];
  notes: TeacherNote[];
  reminders: Reminder[];
  presentations: Presentation[];
  research: ResearchItem[];
  timetable: TimetableSlot[];
  holidays: Holiday[];
  trash: TrashItem[];
  auditLog: AuditEntry[];
  aiLog: AiLogEntry[];
  schoolName: string;
  academicYear: string;
  fontScale: number;
  highContrast: boolean;
  ttsEnabled: boolean;
  language: "en" | "ne" | "hi";
  colorMode: "light" | "dark" | "auto";
  attendanceThreshold: number;
  defaultSlideTheme: SlideThemeId;
  notifyAttendance: boolean;
  notifyGrades: boolean;
  notifyReminders: boolean;
  notifyCalendar: boolean;
  backupNudgeDays: number;
  lastBackupAt?: string;
  onboardingDone: boolean;
  breakReminders: boolean;
  recentItems: RecentItem[];
  favorites: FavoriteItem[];
  libraryBookmarks: LibraryBookmark[];
  templates: SavedTemplate[];
  lastLoginAt?: string;
  previousLoginAt?: string;
  missedAttendanceDismissedFor?: string;
  assistantOpen: boolean;
  presentationDirty: boolean;
  assistantMessages: ChatMessage[];
  setHydrated: () => void;
  ensureSeedUsers: () => void;
  setPresentationDirty: (v: boolean) => void;
  login: (usernameOrEmail: string, password: string) => string | null;
  signup: (input: {
    name: string;
    email: string;
    username: string;
    password: string;
    role: Role;
    subject?: string;
  }) => string | null;
  resetPassword: (usernameOrEmail: string, nextPassword: string) => string | null;
  logout: () => void;
  updateProfile: (patch: { name?: string; email?: string; subject?: string }) => void;
  changePassword: (current: string, next: string) => string | null;
  setAssistantOpen: (v: boolean) => void;
  pushAssistant: (m: ChatMessage) => void;
  clearAssistant: () => void;
  pushAiLog: (entry: Omit<AiLogEntry, "id" | "at">) => void;
  pushAudit: (action: string, detail: string) => void;
  softDeleteStudent: (id: string) => void;
  softDeleteClass: (id: string) => void;
  softDeleteNote: (id: string) => void;
  softDeleteReminder: (id: string) => void;
  restoreTrash: (trashId: string) => void;
  emptyTrash: () => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  addStudent: (s: Omit<Student, "id" | "attendancePct"> & { attendancePct?: number }) => void;
  /** @deprecated use softDeleteStudent */
  removeStudent: (id: string) => void;
  importStudentsCsv: (
    classId: string,
    rows: { name: string; rollNumber: string; parentEmail?: string }[]
  ) => ImportStudentsResult;
  promoteClassToNextGrade: (classId: string) => void;
  bulkAssignSubject: (classId: string, subject: string) => void;
  bulkSoftDeleteStudents: (ids: string[]) => void;
  addClass: (input: { grade: string; section: string; subject: string; schedule?: string }) => SchoolClass;
  updateClass: (id: string, patch: Partial<SchoolClass>) => void;
  /** @deprecated use softDeleteClass */
  removeClass: (id: string) => void;
  addSubject: (name: string, code?: string) => Subject;
  setAttendance: (
    studentId: string,
    classId: string,
    date: string,
    status: AttendanceRecord["status"],
    period?: number
  ) => void;
  recomputeStudentAttendancePct: (studentId: string) => void;
  addHoliday: (h: Omit<Holiday, "id">) => void;
  updateHoliday: (id: string, patch: Partial<Holiday>) => void;
  removeHoliday: (id: string) => void;
  addNote: (n: Omit<TeacherNote, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, patch: Partial<TeacherNote>) => void;
  removeNote: (id: string) => void;
  snoozeNote: (id: string, days: number) => void;
  addReminder: (r: Omit<Reminder, "id" | "createdAt" | "recurrence"> & { recurrence?: ReminderRecurrence }) => void;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  toggleReminder: (id: string) => void;
  snoozeReminder: (id: string, days: number) => void;
  removeReminder: (id: string) => void;
  upsertPresentation: (p: Presentation) => void;
  removePresentation: (id: string) => void;
  addMaterial: (m: Material) => void;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
  addChapters: (chs: Chapter[]) => void;
  replaceChaptersForMaterial: (materialId: string, chs: Chapter[]) => void;
  updateChapter: (id: string, patch: Partial<Chapter>) => void;
  removeChapter: (id: string) => void;
  clearClassLibrary: (classId: string) => void;
  addLessonPlan: (lp: LessonPlan) => void;
  addAssessment: (a: Assessment) => void;
  updateAssessment: (id: string, patch: Partial<Assessment>) => void;
  upsertGrade: (g: GradeEntry) => void;
  importGradesCsv: (assessmentId: string, rows: { rollNumber: string; marks: number }[]) => number;
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt" | "authorId">) => void;
  addResearch: (r: ResearchItem) => void;
  updateResearchSummary: (id: string, summary: string) => void;
  addAssignment: (a: Assignment) => void;
  promoteStudent: (studentId: string, newClassId: string, newSection: string) => void;
  setSchoolName: (v: string) => void;
  setAcademicYear: (v: string) => void;
  setFontScale: (n: number) => void;
  setHighContrast: (v: boolean) => void;
  setTtsEnabled: (v: boolean) => void;
  setLanguage: (l: "en" | "ne" | "hi") => void;
  setColorMode: (m: "light" | "dark" | "auto") => void;
  setAttendanceThreshold: (n: number) => void;
  setDefaultSlideTheme: (t: SlideThemeId) => void;
  setNotifyAttendance: (v: boolean) => void;
  setNotifyGrades: (v: boolean) => void;
  setNotifyReminders: (v: boolean) => void;
  setNotifyCalendar: (v: boolean) => void;
  setOnboardingDone: (v: boolean) => void;
  setBreakReminders: (v: boolean) => void;
  pushRecent: (item: Omit<RecentItem, "at">) => void;
  toggleFavorite: (item: FavoriteItem) => void;
  addLibraryBookmark: (b: Omit<LibraryBookmark, "id" | "createdAt">) => void;
  updateLibraryBookmark: (id: string, patch: Partial<LibraryBookmark>) => void;
  removeLibraryBookmark: (id: string) => void;
  dismissMissedAttendance: (dateKey: string) => void;
  addTemplate: (t: Omit<SavedTemplate, "id">) => void;
  removeTemplate: (id: string) => void;
  duplicateAssessment: (assessmentId: string) => Assessment | null;
  markBackupDone: () => void;
  importBackup: (json: unknown) => string | null;
  getBackupPayload: () => Record<string, unknown>;
  resetDemo: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const pushTrash = (item: Omit<TrashItem, "id" | "deletedAt" | "expiresAt">) => {
        const deletedAt = nowIso();
        const entry: TrashItem = {
          id: uid("tr"),
          deletedAt,
          expiresAt: trashExpiresAt(),
          ...item,
        };
        set({ trash: [entry, ...get().trash] });
      };

      const audit = (action: string, detail: string) => {
        get().pushAudit(action, detail);
      };

      const softDeleteStudentInternal = (id: string, logAudit = true) => {
        const student = get().students.find((s) => s.id === id);
        if (!student || student.deletedAt) return;
        const deletedAt = nowIso();
        const copy = { ...student, deletedAt };
        set({
          students: get().students.map((s) => (s.id === id ? copy : s)),
        });
        pushTrash({
          kind: "student",
          label: `${student.name} (${student.rollNumber})`,
          payload: copy,
        });
        if (logAudit) audit("soft_delete", `Student “${student.name}” moved to trash`);
      };

      return {
        user: null,
        hydrated: false,
        assistantOpen: false,
        presentationDirty: false,
        assistantMessages: [WELCOME_ASSISTANT],
        ...initialData,

        setHydrated: () => set({ hydrated: true }),
        setPresentationDirty: (v) => set({ presentationDirty: v }),

        pushAudit: (action, detail) => {
          const user = get().user;
          const entry: AuditEntry = {
            id: uid("aud"),
            at: nowIso(),
            userId: user?.id ?? "system",
            userName: user?.name ?? "System",
            action,
            detail,
          };
          set({ auditLog: [entry, ...get().auditLog].slice(0, 500) });
        },

        pushAiLog: (entry) => {
          const row: AiLogEntry = { ...entry, id: uid("ai"), at: nowIso() };
          set({ aiLog: [row, ...get().aiLog].slice(0, 200) });
        },

        ensureSeedUsers: () => {
          const legacy = new Set(["priya", "principal", "anita", "sita"]);
          let users = (get().users ?? []).filter((u) => u && !legacy.has(String(u.username || "").toLowerCase()));
          for (const seed of DEMO_USERS) {
            const idx = users.findIndex((u) => u.username.toLowerCase() === seed.username.toLowerCase());
            if (idx >= 0) {
              users[idx] = {
                ...users[idx],
                password: seed.password,
                email: seed.email,
                name: seed.name,
                role: seed.role,
                subject: seed.subject,
                classIds: seed.classIds,
                avatarInitials: seed.avatarInitials,
              };
            } else {
              users = [{ ...seed }, ...users];
            }
          }
          if (!users.length) users = DEMO_USERS.map((u) => ({ ...u }));
          set({ users });
        },

        login: (usernameOrEmail, password) => {
          get().ensureSeedUsers();
          const key = usernameOrEmail.trim().toLowerCase();
          const pass = password.trim();
          if (!key || !pass) return "Enter username and password.";
          const found = get().users.find(
            (u) =>
              (u.username.toLowerCase() === key || u.email.toLowerCase() === key) &&
              u.password === pass
          );
          if (!found) {
            return "No account found with those details. Sign up first, or use forgot password.";
          }
          const previousLoginAt = get().lastLoginAt;
          set({
            user: found,
            hydrated: true,
            previousLoginAt,
            lastLoginAt: nowIso(),
          });
          audit("login", `${found.name} signed in`);
          return null;
        },

        signup: (input) => {
          get().ensureSeedUsers();
          const username = input.username.trim().toLowerCase();
          const email = input.email.trim().toLowerCase();
          const password = input.password.trim();
          if (!input.name.trim() || !username || !email || !password) {
            return "Fill in all required fields.";
          }
          if (password.length < 4) return "Password must be at least 4 characters.";
          const users = get().users;
          if (users.some((u) => u.username.toLowerCase() === username)) return "Username already taken.";
          if (users.some((u) => u.email.toLowerCase() === email)) return "Email already registered.";
          const user: User = {
            id: uid("u"),
            name: input.name.trim(),
            email,
            username,
            password,
            role: input.role,
            subject: input.subject,
            avatarInitials: initials(input.name.trim()) || "TD",
          };
          set({ users: [...users, user], user, hydrated: true });
          audit("signup", `${user.name} created account (${user.role})`);
          return null;
        },

        resetPassword: (usernameOrEmail, nextPassword) => {
          get().ensureSeedUsers();
          const key = usernameOrEmail.trim().toLowerCase();
          const next = nextPassword.trim();
          if (!key) return "Enter your username or email.";
          if (next.length < 4) return "New password must be at least 4 characters.";
          const found = get().users.find(
            (u) => u.username.toLowerCase() === key || u.email.toLowerCase() === key
          );
          if (!found) return "No account found with that username or email. Sign up first.";
          const updated = { ...found, password: next };
          set({
            users: get().users.map((u) => (u.id === found.id ? updated : u)),
          });
          audit("password_reset", `${found.name} reset password from login`);
          return null;
        },

        logout: () => set({ user: null, presentationDirty: false }),

        updateProfile: (patch) => {
          const user = get().user;
          if (!user) return;
          const name = patch.name?.trim() ?? user.name;
          const email = patch.email?.trim().toLowerCase() ?? user.email;
          const subject = patch.subject !== undefined ? patch.subject : user.subject;
          const updated: User = {
            ...user,
            name,
            email,
            subject,
            avatarInitials: initials(name) || user.avatarInitials,
          };
          set({
            user: updated,
            users: get().users.map((u) => (u.id === user.id ? updated : u)),
          });
        },

        changePassword: (current, next) => {
          const user = get().user;
          if (!user) return "Not signed in.";
          if (user.password !== current) return "Current password is incorrect.";
          if (next.length < 4) return "New password must be at least 4 characters.";
          const updated = { ...user, password: next };
          set({
            user: updated,
            users: get().users.map((u) => (u.id === user.id ? updated : u)),
          });
          audit("password_change", `${user.name} changed password`);
          return null;
        },

        setAssistantOpen: (v) => set({ assistantOpen: v }),
        pushAssistant: (m) => set({ assistantMessages: [...get().assistantMessages, m] }),
        clearAssistant: () =>
          set({
            assistantMessages: [
              {
                id: uid("msg"),
                role: "assistant",
                content: "Chat cleared. What should we work on next?",
              },
            ],
          }),

        softDeleteStudent: (id) => softDeleteStudentInternal(id),

        softDeleteClass: (id) => {
          const cls = get().classes.find((c) => c.id === id);
          if (!cls || cls.deletedAt) return;
          const deletedAt = nowIso();
          const copy = { ...cls, deletedAt };
          set({
            classes: get().classes.map((c) => (c.id === id ? copy : c)),
          });
          pushTrash({ kind: "class", label: cls.name, payload: copy });
          audit("soft_delete", `Class “${cls.name}” moved to trash`);
        },

        softDeleteNote: (id) => {
          const note = get().notes.find((n) => n.id === id);
          if (!note || note.deletedAt) return;
          const deletedAt = nowIso();
          const copy = { ...note, deletedAt };
          set({
            notes: get().notes.map((n) => (n.id === id ? copy : n)),
          });
          pushTrash({ kind: "note", label: note.title, payload: copy });
          audit("soft_delete", `Note “${note.title}” moved to trash`);
        },

        softDeleteReminder: (id) => {
          const reminder = get().reminders.find((r) => r.id === id);
          if (!reminder || reminder.deletedAt) return;
          const deletedAt = nowIso();
          const copy = { ...reminder, deletedAt };
          set({
            reminders: get().reminders.map((r) => (r.id === id ? copy : r)),
          });
          pushTrash({ kind: "reminder", label: reminder.title, payload: copy });
          audit("soft_delete", `Reminder “${reminder.title}” moved to trash`);
        },

        restoreTrash: (trashId) => {
          const item = get().trash.find((t) => t.id === trashId);
          if (!item) return;
          const payload = item.payload as Record<string, unknown>;
          const entityId = String(payload.id ?? "");

          switch (item.kind) {
            case "student":
              set({
                students: get().students.map((s) =>
                  s.id === entityId ? { ...s, deletedAt: null } : s
                ),
              });
              break;
            case "class":
              set({
                classes: get().classes.map((c) =>
                  c.id === entityId ? { ...c, deletedAt: null } : c
                ),
              });
              break;
            case "note":
              set({
                notes: get().notes.map((n) =>
                  n.id === entityId ? { ...n, deletedAt: null } : n
                ),
              });
              break;
            case "reminder":
              set({
                reminders: get().reminders.map((r) =>
                  r.id === entityId ? { ...r, deletedAt: null } : r
                ),
              });
              break;
            case "chapter":
              set({
                chapters: get().chapters.map((c) =>
                  c.id === entityId ? { ...c, deletedAt: null } : c
                ),
              });
              break;
            case "material":
              set({
                materials: get().materials.map((m) =>
                  m.id === entityId ? { ...m, deletedAt: null } : m
                ),
              });
              break;
          }

          set({ trash: get().trash.filter((t) => t.id !== trashId) });
          audit("restore", `Restored ${item.kind} “${item.label}” from trash`);
        },

        emptyTrash: () => {
          const count = get().trash.length;
          set({ trash: [] });
          if (count) audit("empty_trash", `Permanently cleared ${count} trash item(s)`);
        },

        updateStudent: (id, patch) =>
          set({
            students: get().students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          }),

        addStudent: (s) =>
          set({
            students: [
              ...get().students,
              { ...s, id: uid("s"), attendancePct: s.attendancePct ?? 100 },
            ],
          }),

        importStudentsCsv: (classId, rows) => {
          const cls = get().classes.find((c) => c.id === classId);
          const result: ImportStudentsResult = { imported: 0, duplicates: 0, skipped: 0 };
          if (!cls) return result;

          for (const row of rows) {
            if (!row.name?.trim() || !row.rollNumber?.trim()) {
              result.skipped++;
              continue;
            }
            const roll = row.rollNumber.trim();
            if (get().students.some((s) => s.rollNumber === roll && !s.deletedAt)) {
              result.duplicates++;
              continue;
            }
            get().addStudent({
              name: row.name.trim(),
              rollNumber: roll,
              classId,
              section: cls.section,
              parentEmail: row.parentEmail?.trim(),
            });
            result.imported++;
          }

          if (result.imported) {
            audit(
              "import_students",
              `Imported ${result.imported} student(s) into ${cls.name} (${result.duplicates} duplicates, ${result.skipped} skipped)`
            );
          }
          return result;
        },

        promoteClassToNextGrade: (classId) => {
          const cls = get().classes.find((c) => c.id === classId);
          if (!cls) return;
          const nextGrade = String(Number.parseInt(cls.grade, 10) + 1 || cls.grade);
          const updated: SchoolClass = {
            ...cls,
            grade: nextGrade,
            name: `Grade ${nextGrade}${cls.section} — ${cls.subject}`,
          };
          set({
            classes: get().classes.map((c) => (c.id === classId ? updated : c)),
            students: get().students.map((s) =>
              s.classId === classId ? { ...s, section: cls.section } : s
            ),
          });
          audit("promote_class", `${cls.name} promoted to grade ${nextGrade}`);
        },

        bulkAssignSubject: (classId, subject) => {
          const cls = get().classes.find((c) => c.id === classId);
          if (!cls) return;
          get().updateClass(classId, { subject });
          audit("bulk_assign_subject", `Assigned “${subject}” to ${cls.name}`);
        },

        bulkSoftDeleteStudents: (ids) => {
          let count = 0;
          for (const id of ids) {
            const before = get().students.find((s) => s.id === id)?.deletedAt;
            softDeleteStudentInternal(id, false);
            const after = get().students.find((s) => s.id === id)?.deletedAt;
            if (!before && after) count++;
          }
          if (count) audit("bulk_soft_delete", `${count} student(s) moved to trash`);
        },

        addSubject: (name, code) => {
          const subject: Subject = { id: uid("sub"), name: name.trim(), code: code?.trim() };
          set({ subjects: [...get().subjects, subject] });
          return subject;
        },

        addClass: ({ grade, section, subject, schedule }) => {
          const user = get().user;
          const cls: SchoolClass = {
            id: uid("c"),
            name: `Grade ${grade}${section} — ${subject}`,
            grade,
            section,
            subject,
            teacherId: user?.id ?? "u1",
            schedule: schedule?.trim() || "Sun–Fri (set in timetable)",
          };
          set({ classes: [...get().classes, cls] });
          return cls;
        },

        updateClass: (id, patch) =>
          set({
            classes: get().classes.map((c) =>
              c.id === id
                ? {
                    ...c,
                    ...patch,
                    name:
                      patch.grade || patch.section || patch.subject
                        ? `Grade ${patch.grade ?? c.grade}${patch.section ?? c.section} — ${patch.subject ?? c.subject}`
                        : (patch.name ?? c.name),
                  }
                : c
            ),
          }),

        recomputeStudentAttendancePct: (studentId) => {
          const pct = calcAttendancePct(studentId, get().attendance);
          set({
            students: get().students.map((s) =>
              s.id === studentId ? { ...s, attendancePct: pct } : s
            ),
          });
        },

        setAttendance: (studentId, classId, date, status, period = 1) => {
          const existing = get().attendance.find(
            (a) =>
              a.studentId === studentId &&
              a.classId === classId &&
              a.date === date &&
              a.period === period
          );
          if (existing) {
            set({
              attendance: get().attendance.map((a) =>
                a.id === existing.id ? { ...a, status } : a
              ),
            });
          } else {
            set({
              attendance: [
                ...get().attendance,
                { id: uid("att"), studentId, classId, date, period, status },
              ],
            });
          }
          get().recomputeStudentAttendancePct(studentId);
        },

        addHoliday: (h) => set({ holidays: [...get().holidays, { ...h, id: uid("h") }] }),
        updateHoliday: (id, patch) =>
          set({ holidays: get().holidays.map((h) => (h.id === id ? { ...h, ...patch } : h)) }),
        removeHoliday: (id) => set({ holidays: get().holidays.filter((h) => h.id !== id) }),

        addNote: (n) => {
          const ts = nowIso();
          set({
            notes: [{ ...n, id: uid("n"), createdAt: ts, updatedAt: ts }, ...get().notes],
          });
        },

        updateNote: (id, patch) =>
          set({
            notes: get().notes.map((n) =>
              n.id === id ? { ...n, ...patch, updatedAt: nowIso() } : n
            ),
          }),

        removeNote: (id) => get().softDeleteNote(id),

        snoozeNote: (id, days) =>
          set({
            notes: get().notes.map((n) =>
              n.id === id ? { ...n, snoozedUntil: snoozeUntil(days), updatedAt: nowIso() } : n
            ),
          }),

        addReminder: (r) =>
          set({
            reminders: [
              {
                ...r,
                recurrence: r.recurrence ?? "none",
                id: uid("rm"),
                createdAt: nowIso(),
              },
              ...get().reminders,
            ],
          }),

        updateReminder: (id, patch) =>
          set({
            reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          }),

        toggleReminder: (id) =>
          set({
            reminders: get().reminders.map((r) => (r.id === id ? { ...r, done: !r.done } : r)),
          }),

        snoozeReminder: (id, days) =>
          set({
            reminders: get().reminders.map((r) =>
              r.id === id ? { ...r, snoozedUntil: snoozeUntil(days) } : r
            ),
          }),

        removeReminder: (id) => get().softDeleteReminder(id),

        removeClass: (id) => get().softDeleteClass(id),
        removeStudent: (id) => get().softDeleteStudent(id),

        upsertPresentation: (p) => {
          const exists = get().presentations.some((x) => x.id === p.id);
          set({
            presentations: exists
              ? get().presentations.map((x) => (x.id === p.id ? p : x))
              : [p, ...get().presentations],
          });
        },

        removePresentation: (id) =>
          set({ presentations: get().presentations.filter((p) => p.id !== id) }),

        addMaterial: (m) => set({ materials: [m, ...get().materials] }),
        updateMaterial: (id, patch) =>
          set({
            materials: get().materials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          }),
        removeMaterial: (id) => {
          const m = get().materials.find((x) => x.id === id);
          if (!m) return;
          set({
            materials: get().materials.filter((x) => x.id !== id),
            // Keep chapter cards in sync when a book is deleted
            chapters: get().chapters.filter((c) => c.materialId !== id),
          });
          audit("remove_material", m.title);
        },
        addChapters: (chs) => set({ chapters: [...get().chapters, ...chs] }),
        replaceChaptersForMaterial: (materialId, chs) =>
          set({
            chapters: [...get().chapters.filter((c) => c.materialId !== materialId), ...chs],
          }),
        updateChapter: (id, patch) =>
          set({ chapters: get().chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
        removeChapter: (id) => {
          const ch = get().chapters.find((c) => c.id === id);
          if (!ch) return;
          set({ chapters: get().chapters.filter((c) => c.id !== id) });
          audit("remove_chapter", ch.title);
        },
        clearClassLibrary: (classId) => {
          set({
            chapters: get().chapters.filter((c) => c.classId !== classId),
            materials: get().materials.filter((m) => m.classId !== classId),
          });
          audit("clear_class_library", `Cleared library for class ${classId}`);
        },
        addLessonPlan: (lp) => set({ lessonPlans: [lp, ...get().lessonPlans] }),
        addAssessment: (a) => set({ assessments: [a, ...get().assessments] }),
        updateAssessment: (id, patch) =>
          set({
            assessments: get().assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
          }),

        upsertGrade: (g) => {
          const existing = get().grades.find(
            (x) => x.assessmentId === g.assessmentId && x.studentId === g.studentId
          );
          if (existing) {
            set({
              grades: get().grades.map((x) =>
                x.id === existing.id ? { ...existing, ...g, id: existing.id } : x
              ),
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
          if (count) audit("import_grades", `Imported ${count} grade row(s) for assessment ${assessmentId}`);
          return count;
        },

        addAnnouncement: (a) => {
          const user = get().user;
          set({
            announcements: [
              {
                ...a,
                id: uid("an"),
                createdAt: nowIso(),
                authorId: user?.id ?? "u1",
              },
              ...get().announcements,
            ],
          });
        },

        addResearch: (r) => set({ research: [r, ...get().research] }),
        updateResearchSummary: (id, summary) =>
          set({
            research: get().research.map((r) => (r.id === id ? { ...r, summary } : r)),
          }),

        addAssignment: (a) => set({ assignments: [a, ...get().assignments] }),

        promoteStudent: (studentId, newClassId, newSection) =>
          set({
            students: get().students.map((s) =>
              s.id === studentId ? { ...s, classId: newClassId, section: newSection } : s
            ),
          }),

        setSchoolName: (v) => set({ schoolName: v }),
        setAcademicYear: (v) => set({ academicYear: v }),
        setFontScale: (n) => set({ fontScale: n }),
        setHighContrast: (v) => set({ highContrast: v }),
        setTtsEnabled: (v) => set({ ttsEnabled: v }),
        setLanguage: (l) => set({ language: l }),
        setColorMode: (m) => set({ colorMode: m }),
        setAttendanceThreshold: (n) => set({ attendanceThreshold: n }),
        setDefaultSlideTheme: (t) => set({ defaultSlideTheme: t }),
        setNotifyAttendance: (v) => set({ notifyAttendance: v }),
        setNotifyGrades: (v) => set({ notifyGrades: v }),
        setNotifyReminders: (v) => set({ notifyReminders: v }),
        setNotifyCalendar: (v) => set({ notifyCalendar: v }),
        setOnboardingDone: (v) => set({ onboardingDone: v }),
        setBreakReminders: (v) => set({ breakReminders: v }),
        pushRecent: (item) => {
          const next = [{ ...item, at: nowIso() }, ...get().recentItems.filter((r) => r.href !== item.href)].slice(0, 5);
          set({ recentItems: next });
        },
        toggleFavorite: (item) => {
          const exists = get().favorites.some((f) => f.id === item.id && f.kind === item.kind);
          set({
            favorites: exists
              ? get().favorites.filter((f) => !(f.id === item.id && f.kind === item.kind))
              : [item, ...get().favorites].slice(0, 20),
          });
        },
        addLibraryBookmark: (b) =>
          set({
            libraryBookmarks: [{ ...b, id: uid("lb"), createdAt: nowIso() }, ...get().libraryBookmarks],
          }),
        updateLibraryBookmark: (id, patch) =>
          set({
            libraryBookmarks: get().libraryBookmarks.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }),
        removeLibraryBookmark: (id) =>
          set({ libraryBookmarks: get().libraryBookmarks.filter((x) => x.id !== id) }),
        dismissMissedAttendance: (dateKey) => set({ missedAttendanceDismissedFor: dateKey }),
        addTemplate: (t) => set({ templates: [{ ...t, id: uid("tpl") }, ...get().templates] }),
        removeTemplate: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),
        duplicateAssessment: (assessmentId) => {
          const src = get().assessments.find((a) => a.id === assessmentId);
          if (!src) return null;
          const copy: Assessment = {
            ...src,
            id: uid("a"),
            title: `${src.title} (reuse)`,
            date: new Date().toISOString().slice(0, 10),
            reusedFromId: src.id,
            questions: src.questions.map((q) => ({ ...q, id: uid("q") })),
            paper: src.paper ? { ...src.paper } : undefined,
            answerKey: src.answerKey ? { ...src.answerKey } : undefined,
            aiRubric: undefined,
          };
          set({ assessments: [copy, ...get().assessments] });
          audit("duplicate_assessment", copy.title);
          return copy;
        },
        markBackupDone: () => set({ lastBackupAt: nowIso() }),

        getBackupPayload: () => {
          const s = get();
          return {
            version: BACKUP_VERSION,
            exportedAt: nowIso(),
            user: s.user,
            users: s.users,
            subjects: s.subjects,
            classes: s.classes,
            chapters: s.chapters,
            materials: s.materials,
            lessonPlans: s.lessonPlans,
            students: s.students,
            attendance: s.attendance,
            assessments: s.assessments,
            grades: s.grades,
            assignments: s.assignments,
            announcements: s.announcements,
            notes: s.notes,
            reminders: s.reminders,
            presentations: s.presentations,
            research: s.research,
            timetable: s.timetable,
            holidays: s.holidays,
            trash: s.trash,
            auditLog: s.auditLog,
            aiLog: s.aiLog,
            schoolName: s.schoolName,
            academicYear: s.academicYear,
            fontScale: s.fontScale,
            highContrast: s.highContrast,
            ttsEnabled: s.ttsEnabled,
            language: s.language,
            colorMode: s.colorMode,
            attendanceThreshold: s.attendanceThreshold,
            defaultSlideTheme: s.defaultSlideTheme,
            notifyAttendance: s.notifyAttendance,
            notifyGrades: s.notifyGrades,
            notifyReminders: s.notifyReminders,
            notifyCalendar: s.notifyCalendar,
            backupNudgeDays: s.backupNudgeDays,
            lastBackupAt: s.lastBackupAt,
            onboardingDone: s.onboardingDone,
            breakReminders: s.breakReminders,
            recentItems: s.recentItems,
            favorites: s.favorites,
            libraryBookmarks: s.libraryBookmarks,
            templates: s.templates,
            lastLoginAt: s.lastLoginAt,
            previousLoginAt: s.previousLoginAt,
            missedAttendanceDismissedFor: s.missedAttendanceDismissedFor,
          };
        },

        importBackup: (json) => {
          if (!json || typeof json !== "object") return "Invalid backup file.";
          const data = json as Record<string, unknown>;

          const arrayKeys = [
            "users",
            "subjects",
            "classes",
            "chapters",
            "materials",
            "lessonPlans",
            "students",
            "attendance",
            "assessments",
            "grades",
            "assignments",
            "announcements",
            "notes",
            "reminders",
            "presentations",
            "research",
            "timetable",
            "holidays",
            "trash",
            "auditLog",
            "aiLog",
          ] as const;

          const patch: Record<string, unknown> = {};

          for (const key of arrayKeys) {
            const incoming = data[key];
            if (Array.isArray(incoming)) {
              patch[key] = mergeById(
                (get()[key as keyof AppState] as { id: string }[]) ?? [],
                incoming as { id: string }[]
              );
            }
          }

          const settingsKeys = [
            "schoolName",
            "academicYear",
            "fontScale",
            "highContrast",
            "ttsEnabled",
            "language",
            "colorMode",
            "attendanceThreshold",
            "defaultSlideTheme",
            "notifyAttendance",
            "notifyGrades",
            "notifyReminders",
            "notifyCalendar",
            "backupNudgeDays",
            "lastBackupAt",
            "onboardingDone",
          ] as const;

          for (const key of settingsKeys) {
            if (data[key] !== undefined) patch[key] = data[key];
          }

          if (data.user && typeof data.user === "object") {
            patch.user = data.user;
          }

          set(patch as Partial<AppState>);
          audit("import_backup", "Restored data from backup file");
          return null;
        },

        resetDemo: () =>
          set({
            ...initialData,
            user: get().user,
            assistantMessages: [
              {
                id: uid("msg"),
                role: "assistant",
                content: "Demo data restored. Ready when you are.",
              },
            ],
          }),
      };
    },
    {
      name: "teachdesk-v7",
      partialize: (s) => ({
        user: s.user,
        users: s.users,
        subjects: s.subjects,
        classes: s.classes,
        chapters: s.chapters,
        materials: s.materials,
        lessonPlans: s.lessonPlans,
        students: s.students,
        attendance: s.attendance,
        assessments: s.assessments,
        grades: s.grades,
        assignments: s.assignments,
        announcements: s.announcements,
        notes: s.notes,
        reminders: s.reminders,
        presentations: s.presentations,
        research: s.research,
        timetable: s.timetable,
        holidays: s.holidays,
        trash: s.trash,
        auditLog: s.auditLog,
        aiLog: s.aiLog,
        schoolName: s.schoolName,
        academicYear: s.academicYear,
        fontScale: s.fontScale,
        highContrast: s.highContrast,
        ttsEnabled: s.ttsEnabled,
        language: s.language,
        colorMode: s.colorMode,
        attendanceThreshold: s.attendanceThreshold,
        defaultSlideTheme: s.defaultSlideTheme,
        notifyAttendance: s.notifyAttendance,
        notifyGrades: s.notifyGrades,
        notifyReminders: s.notifyReminders,
        notifyCalendar: s.notifyCalendar,
        backupNudgeDays: s.backupNudgeDays,
        lastBackupAt: s.lastBackupAt,
        onboardingDone: s.onboardingDone,
        breakReminders: s.breakReminders,
        recentItems: s.recentItems,
        favorites: s.favorites,
        libraryBookmarks: s.libraryBookmarks,
        templates: s.templates,
        lastLoginAt: s.lastLoginAt,
        previousLoginAt: s.previousLoginAt,
        missedAttendanceDismissedFor: s.missedAttendanceDismissedFor,
        assistantMessages: s.assistantMessages,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<typeof current>;
        const legacy = new Set(["priya", "principal", "anita", "sita"]);
        let users = Array.isArray(p.users) ? [...p.users] : [...current.users];
        users = users.filter((u) => u && !legacy.has(String(u.username || "").toLowerCase()));
        for (const seed of DEMO_USERS) {
          const idx = users.findIndex((u) => u.username?.toLowerCase() === seed.username.toLowerCase());
          if (idx >= 0) {
            users[idx] = { ...users[idx], ...seed, id: users[idx].id || seed.id, password: seed.password };
          } else {
            users.unshift({ ...seed });
          }
        }
        if (!users.length) users = DEMO_USERS.map((u) => ({ ...u }));
        return {
          ...current,
          ...p,
          users,
          classes: Array.isArray(p.classes) && p.classes.length ? p.classes : current.classes,
          chapters: Array.isArray(p.chapters) && p.chapters.length ? p.chapters : current.chapters,
          libraryBookmarks: Array.isArray(p.libraryBookmarks)
            ? p.libraryBookmarks.filter((b: { classId?: string; label?: string; link?: string }) => b?.classId && b?.label && b?.link)
            : current.libraryBookmarks,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.ensureSeedUsers();
          for (const cls of CLASSES) {
            if (!state.classes.some((c) => c.id === cls.id)) state.classes = [...state.classes, cls];
          }
          for (const ch of CHAPTERS) {
            if (!state.chapters.some((c) => c.id === ch.id)) state.chapters = [...state.chapters, ch];
          }
          if (state.user) {
            const match =
              state.users.find((u) => u.id === state.user!.id) ??
              state.users.find((u) => u.username.toLowerCase() === state.user!.username.toLowerCase());
            state.user = match ?? null;
          }
          if (state.assessments) {
            state.assessments = state.assessments.map((a) =>
              a.subject
                ? a
                : {
                    ...a,
                    subject: state.classes.find((c) => c.id === a.classId)?.subject ?? "General",
                    chapterIds: a.chapterIds ?? (a.chapterId ? [a.chapterId] : []),
                  }
            );
          }
        }
        state?.setHydrated();
      },
    }
  )
);
