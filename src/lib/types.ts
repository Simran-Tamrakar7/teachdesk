export type Role = "teacher" | "admin" | "hod" | "parent" | "student";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  subject?: string;
  avatarInitials: string;
};

export type SchoolClass = {
  id: string;
  name: string;
  grade: string;
  section: string;
  subject: string;
  teacherId: string;
  schedule: string;
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
  pageStart?: number;
  pageEnd?: number;
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
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  period: number;
  status: "present" | "absent" | "late" | "excused";
};

export type Assessment = {
  id: string;
  title: string;
  classId: string;
  chapterId?: string;
  type: "quiz" | "test" | "worksheet";
  maxMarks: number;
  date: string;
  questions: Question[];
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

export type Message = {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
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
  type: "holiday" | "exam" | "term";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
};
