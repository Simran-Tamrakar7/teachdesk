export type Role = "teacher" | "admin" | "hod" | "parent" | "student";

export type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  subject?: string;
  avatarInitials: string;
  classIds?: string[];
  defaultSlideTheme?: SlideThemeId;
};

export type Subject = {
  id: string;
  name: string;
  code?: string;
};

export type SchoolClass = {
  id: string;
  name: string;
  grade: string;
  section: string;
  subject: string;
  teacherId: string;
  schedule: string;
  deletedAt?: string | null;
};

export type ContentLang = "en" | "ne";

export type ChapterLocale = {
  title: string;
  summary: string;
  keyTerms: string[];
  objectives: string[];
  discussionQuestions: string[];
  body?: string;
  pointers?: string[];
};

export type Chapter = {
  id: string;
  subjectId: string;
  classId: string;
  title: string;
  unitNumber: number;
  summary: string;
  keyTerms: string[];
  objectives: string[];
  discussionQuestions: string[];
  /** Full chapter text extracted / pasted from the book */
  body?: string;
  /** Source language of the primary fields above */
  lang?: ContentLang;
  /** Nepali (or other) translation / alternate book edition */
  ne?: ChapterLocale;
  pointers?: string[];
  slideOutline?: { title: string; bullets: string[]; imageHint?: string }[];
  pageStart?: number;
  pageEnd?: number;
  deletedAt?: string | null;
  collection?: string;
  materialId?: string;
  sourceBook?: string;
  wordCount?: number;
  /** Cached “Understand this chapter” AI outputs */
  aiCache?: {
    summarize?: string;
    explain?: string;
    pointers?: string;
    glossary?: string;
  };
};

export type MaterialVersion = {
  id: string;
  version: number;
  uploadedAt: string;
  note: string;
  fileName: string;
};

export type Material = {
  id: string;
  title: string;
  type: "pdf" | "docx" | "pptx" | "image" | "video" | "audio" | "other";
  classId: string;
  subject: string;
  chapterId?: string;
  tags: string[];
  uploadedAt: string;
  sizeLabel: string;
  versions: MaterialVersion[];
  contentPreview: string;
  /** Full extracted / pasted text used for chapter split */
  extractedText?: string;
  /** Lets teachers open/download the uploaded file */
  dataUrl?: string;
  mime?: string;
  lang?: ContentLang;
  deletedAt?: string | null;
  collection?: string;
  /** Where the book came from */
  sourceKind?: "upload" | "cdc" | "cehrd" | "epustakalaya" | "dlc" | "ai" | "syllabus";
  sourceLabel?: string;
  sourceUrl?: string;
  official?: boolean;
  /** filename|size for duplicate detection */
  fileFingerprint?: string;
  fileSizeBytes?: number;
  /** Shown disclaimer for AI / draft material */
  disclaimer?: string;
};

export type LessonPlan = {
  id: string;
  title: string;
  classId: string;
  chapterId: string;
  date: string;
  durationMins: number;
  objectives: string[];
  activities: { time: string; title: string; detail: string }[];
  homework: string;
  template?: boolean;
};

export type Student = {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
  section: string;
  parentEmail?: string;
  attendancePct: number;
  deletedAt?: string | null;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  period: number;
  status: "present" | "absent" | "late" | "excused";
};

export type ExamFile = {
  fileName: string;
  mime: string;
  sizeLabel: string;
  dataUrl?: string;
};

export type Assessment = {
  id: string;
  title: string;
  classId: string;
  subject: string;
  chapterId?: string;
  chapterIds?: string[];
  type: "quiz" | "test" | "worksheet" | "exam";
  maxMarks: number;
  passMark?: number;
  date: string;
  term?: string;
  questions: Question[];
  paper?: ExamFile;
  answerKey?: ExamFile;
  reusedFromId?: string;
  aiRubric?: string;
};

export type Question = {
  id: string;
  type: "mcq" | "short" | "long";
  prompt: string;
  options?: string[];
  answer?: string;
  marks: number;
};

export type GradeEntry = {
  id: string;
  assessmentId: string;
  studentId: string;
  marks: number;
  feedback?: string;
  aiSuggested?: number;
  markedScript?: ExamFile;
};

export type Assignment = {
  id: string;
  title: string;
  classId: string;
  dueDate: string;
  description: string;
  submissions: { studentId: string; submittedAt?: string; status: "pending" | "submitted" | "late" }[];
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: "class" | "school";
  classId?: string;
  createdAt: string;
  authorId: string;
};

export type ResearchItem = {
  id: string;
  title: string;
  source: string;
  subject: string;
  url?: string;
  summary?: string;
  uploadedAt: string;
  contentPreview: string;
};

export type TimetableSlot = {
  id: string;
  day: string;
  period: number;
  time: string;
  classId: string;
  subject: string;
  room: string;
};

export type Holiday = {
  id: string;
  title: string;
  date: string;
  type: "holiday" | "exam" | "term" | "field_trip" | "event";
  notes?: string;
  recurring?: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
};

export type TeacherNote = {
  id: string;
  title: string;
  body: string;
  classId?: string;
  studentId?: string;
  chapterId?: string;
  dueAt?: string;
  pinned: boolean;
  done?: boolean;
  snoozedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type ReminderRecurrence = "none" | "daily" | "weekly" | "friday";

export type Reminder = {
  id: string;
  title: string;
  dueAt: string;
  done: boolean;
  classId?: string;
  studentId?: string;
  chapterId?: string;
  recurrence: ReminderRecurrence;
  snoozedUntil?: string | null;
  createdAt: string;
  deletedAt?: string | null;
};

export type SlideThemeId = "forest" | "slate" | "chalkboard" | "ocean" | "sand";

export type PresentationSlide = {
  id: string;
  title: string;
  bullets: string[];
  notes?: string;
  imageHint?: string;
  imageDataUrl?: string;
};

export type Presentation = {
  id: string;
  title: string;
  chapterId?: string;
  classId?: string;
  /** Optional lesson / exam date tag (YYYY-MM-DD) */
  lessonDate?: string;
  theme: SlideThemeId;
  slides: PresentationSlide[];
  updatedAt: string;
};

export type TrashItem = {
  id: string;
  kind: "student" | "class" | "note" | "reminder" | "chapter" | "material";
  label: string;
  payload: unknown;
  deletedAt: string;
  expiresAt: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  detail: string;
};

export type AiLogEntry = {
  id: string;
  at: string;
  kind: "quiz" | "lesson" | "summary" | "presentation" | "parent" | "briefing" | "rubric" | "auto-grade" | "other";
  title: string;
  preview: string;
};

export type RecentItem = {
  id: string;
  kind: "student" | "chapter" | "presentation" | "class" | "note" | "assessment";
  label: string;
  href: string;
  at: string;
};

export type FavoriteItem = {
  id: string;
  kind: "student" | "chapter" | "class" | "presentation";
  label: string;
  href: string;
};

/** Class-scoped bookmark: label + link + optional note */
export type LibraryBookmark = {
  id: string;
  classId: string;
  label: string;
  link: string;
  note?: string;
  createdAt: string;
};

export type SavedTemplate = {
  id: string;
  kind: "lesson" | "comment" | "worksheet";
  title: string;
  body: string;
};

export type AppSettings = {
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
};
