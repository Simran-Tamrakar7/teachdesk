import type {
  Announcement,
  Assessment,
  Assignment,
  AttendanceRecord,
  Chapter,
  GradeEntry,
  Holiday,
  LessonPlan,
  Material,
  Message,
  ResearchItem,
  SchoolClass,
  Student,
  TimetableSlot,
  User,
} from "./types";

export const DEMO_USERS: User[] = [
  {
    id: "u1",
    name: "Priya Sharma",
    email: "priya@greenfield.edu",
    role: "teacher",
    subject: "Science",
    avatarInitials: "PS",
  },
  {
    id: "u2",
    name: "Rajesh Thapa",
    email: "principal@greenfield.edu",
    role: "admin",
    avatarInitials: "RT",
  },
  {
    id: "u3",
    name: "Anita Gurung",
    email: "anita@greenfield.edu",
    role: "hod",
    subject: "Science",
    avatarInitials: "AG",
  },
  {
    id: "u4",
    name: "Sita Devi",
    email: "sita.parent@email.com",
    role: "parent",
    avatarInitials: "SD",
  },
];

export const CLASSES: SchoolClass[] = [
  {
    id: "c1",
    name: "Grade 8A — Science",
    grade: "8",
    section: "A",
    subject: "Science",
    teacherId: "u1",
    schedule: "Mon/Wed/Fri 9:00–9:45",
  },
  {
    id: "c2",
    name: "Grade 8B — Science",
    grade: "8",
    section: "B",
    subject: "Science",
    teacherId: "u1",
    schedule: "Tue/Thu 10:00–10:45",
  },
  {
    id: "c3",
    name: "Grade 9A — Science",
    grade: "9",
    section: "A",
    subject: "Science",
    teacherId: "u1",
    schedule: "Mon/Wed 11:00–11:45",
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: "ch1",
    subjectId: "science",
    classId: "c1",
    title: "Photosynthesis",
    unitNumber: 1,
    summary:
      "Explains how plants convert light energy into chemical energy using chlorophyll, producing glucose and oxygen.",
    keyTerms: ["Chlorophyll", "Stomata", "Glucose", "Light reaction", "Calvin cycle"],
    objectives: [
      "Explain the process of photosynthesis",
      "Identify inputs and outputs of photosynthesis",
      "Describe the role of chlorophyll and stomata",
    ],
    discussionQuestions: [
      "Why do leaves appear green?",
      "What would happen to life on Earth without photosynthesis?",
      "How does light intensity affect the rate of photosynthesis?",
    ],
    pageStart: 12,
    pageEnd: 34,
  },
  {
    id: "ch2",
    subjectId: "science",
    classId: "c1",
    title: "Respiration in Organisms",
    unitNumber: 2,
    summary:
      "Covers aerobic and anaerobic respiration, breathing in humans and animals, and energy release from food.",
    keyTerms: ["Aerobic", "Anaerobic", "Breathing", "ATP", "Lactic acid"],
    objectives: [
      "Distinguish breathing from respiration",
      "Compare aerobic and anaerobic respiration",
      "Describe human respiratory organs",
    ],
    discussionQuestions: [
      "Why do we pant after running?",
      "How do fish breathe underwater?",
    ],
    pageStart: 35,
    pageEnd: 58,
  },
  {
    id: "ch3",
    subjectId: "science",
    classId: "c1",
    title: "Transportation in Plants & Animals",
    unitNumber: 3,
    summary:
      "Circulatory systems in animals and transport of water/nutrients in plants via xylem and phloem.",
    keyTerms: ["Xylem", "Phloem", "Heart", "Blood vessels", "Transpiration"],
    objectives: [
      "Describe blood circulation in humans",
      "Explain transport of water in plants",
      "Relate structure of vessels to function",
    ],
    discussionQuestions: [
      "Why does a cut stem drip water?",
      "What happens if blood vessels are blocked?",
    ],
    pageStart: 59,
    pageEnd: 88,
  },
];

export const MATERIALS: Material[] = [
  {
    id: "m1",
    title: "Grade 8 Science Textbook — Unit 1–3",
    type: "pdf",
    classId: "c1",
    subject: "Science",
    chapterId: "ch1",
    tags: ["textbook", "photosynthesis", "core"],
    uploadedAt: "2026-07-15T10:00:00Z",
    sizeLabel: "18.4 MB",
    contentPreview:
      "Chapter 1 Photosynthesis\nGreen plants prepare their own food...\nChapter 2 Respiration...",
    versions: [
      {
        id: "mv1",
        version: 1,
        uploadedAt: "2026-06-01T09:00:00Z",
        note: "Initial upload",
        fileName: "g8-science-v1.pdf",
      },
      {
        id: "mv2",
        version: 2,
        uploadedAt: "2026-07-15T10:00:00Z",
        note: "Updated diagrams for stomata",
        fileName: "g8-science-v2.pdf",
      },
    ],
  },
  {
    id: "m2",
    title: "Photosynthesis Lab Worksheet",
    type: "docx",
    classId: "c1",
    subject: "Science",
    chapterId: "ch1",
    tags: ["worksheet", "lab", "hands-on"],
    uploadedAt: "2026-08-01T14:20:00Z",
    sizeLabel: "420 KB",
    contentPreview: "Lab: Observing starch in leaves after sunlight exposure...",
    versions: [
      {
        id: "mv3",
        version: 1,
        uploadedAt: "2026-08-01T14:20:00Z",
        note: "First draft",
        fileName: "photo-lab.docx",
      },
    ],
  },
  {
    id: "m3",
    title: "Respiration Slide Deck",
    type: "pptx",
    classId: "c1",
    subject: "Science",
    chapterId: "ch2",
    tags: ["slides", "lecture"],
    uploadedAt: "2026-08-03T08:00:00Z",
    sizeLabel: "3.1 MB",
    contentPreview: "Slides covering aerobic vs anaerobic respiration...",
    versions: [
      {
        id: "mv4",
        version: 1,
        uploadedAt: "2026-08-03T08:00:00Z",
        note: "Ready for class",
        fileName: "respiration.pptx",
      },
    ],
  },
  {
    id: "m4",
    title: "Leaf Cross-Section Diagram",
    type: "image",
    classId: "c1",
    subject: "Science",
    chapterId: "ch1",
    tags: ["diagram", "visual"],
    uploadedAt: "2026-07-20T11:00:00Z",
    sizeLabel: "890 KB",
    contentPreview: "Labeled diagram of leaf anatomy",
    versions: [
      {
        id: "mv5",
        version: 1,
        uploadedAt: "2026-07-20T11:00:00Z",
        note: "Original",
        fileName: "leaf-diagram.png",
      },
    ],
  },
];

export const LESSON_PLANS: LessonPlan[] = [
  {
    id: "lp1",
    title: "Introducing Photosynthesis",
    classId: "c1",
    chapterId: "ch1",
    date: "2026-08-10",
    durationMins: 45,
    objectives: [
      "Define photosynthesis in student-friendly language",
      "List raw materials and products",
    ],
    activities: [
      { time: "0–5 min", title: "Warm-up", detail: "Quick sketch: what do plants need to grow?" },
      { time: "5–20 min", title: "Mini-lesson", detail: "Explain equation and chlorophyll role with diagram" },
      { time: "20–35 min", title: "Group activity", detail: "Sort cards: inputs vs outputs" },
      { time: "35–45 min", title: "Exit ticket", detail: "Write one new fact learned today" },
    ],
    homework: "Read textbook pp. 12–18 and answer Q1–3",
  },
  {
    id: "lp2",
    title: "Lab Day — Starch Test",
    classId: "c1",
    chapterId: "ch1",
    date: "2026-08-12",
    durationMins: 45,
    objectives: ["Demonstrate starch presence in leaves", "Follow lab safety steps"],
    activities: [
      { time: "0–10 min", title: "Setup & safety", detail: "Distribute materials, review SOP" },
      { time: "10–35 min", title: "Experiment", detail: "Boil, alcohol bath, iodine test" },
      { time: "35–45 min", title: "Debrief", detail: "Compare results across groups" },
    ],
    homework: "Complete lab report section A",
  },
  {
    id: "lp-template",
    title: "Standard 45-min Inquiry Lesson",
    classId: "c1",
    chapterId: "ch1",
    date: "2026-01-01",
    durationMins: 45,
    template: true,
    objectives: ["Engage", "Explore", "Explain", "Evaluate"],
    activities: [
      { time: "0–8 min", title: "Hook", detail: "Phenomenon or question" },
      { time: "8–25 min", title: "Explore", detail: "Hands-on or discussion" },
      { time: "25–38 min", title: "Explain", detail: "Direct instruction + notes" },
      { time: "38–45 min", title: "Check", detail: "Exit ticket / quiz" },
    ],
    homework: "Practice problems aligned to objectives",
  },
];

export const STUDENTS: Student[] = [
  { id: "s1", name: "Aarav KC", rollNumber: "8A01", classId: "c1", section: "A", parentEmail: "sita.parent@email.com", attendancePct: 96 },
  { id: "s2", name: "Bina Rai", rollNumber: "8A02", classId: "c1", section: "A", attendancePct: 92 },
  { id: "s3", name: "Chirag Shrestha", rollNumber: "8A03", classId: "c1", section: "A", attendancePct: 88 },
  { id: "s4", name: "Diya Maharjan", rollNumber: "8A04", classId: "c1", section: "A", attendancePct: 98 },
  { id: "s5", name: "Eshan Tamang", rollNumber: "8A05", classId: "c1", section: "A", attendancePct: 85 },
  { id: "s6", name: "Farah Khan", rollNumber: "8A06", classId: "c1", section: "A", attendancePct: 94 },
  { id: "s7", name: "Gaurav Adhikari", rollNumber: "8A07", classId: "c1", section: "A", attendancePct: 90 },
  { id: "s8", name: "Hima Poudel", rollNumber: "8A08", classId: "c1", section: "A", attendancePct: 97 },
  { id: "s9", name: "Ishan Magar", rollNumber: "8B01", classId: "c2", section: "B", attendancePct: 91 },
  { id: "s10", name: "Jiya Lama", rollNumber: "8B02", classId: "c2", section: "B", attendancePct: 93 },
  { id: "s11", name: "Kiran Basnet", rollNumber: "8B03", classId: "c2", section: "B", attendancePct: 87 },
  { id: "s12", name: "Lila Rana", rollNumber: "9A01", classId: "c3", section: "A", attendancePct: 95 },
];

export const ASSESSMENTS: Assessment[] = [
  {
    id: "a1",
    title: "Photosynthesis Quiz",
    classId: "c1",
    chapterId: "ch1",
    type: "quiz",
    maxMarks: 20,
    date: "2026-08-05",
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt: "Which pigment absorbs light for photosynthesis?",
        options: ["Hemoglobin", "Chlorophyll", "Melanin", "Carotene"],
        answer: "Chlorophyll",
        marks: 2,
      },
      {
        id: "q2",
        type: "mcq",
        prompt: "A product of photosynthesis is:",
        options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Water only"],
        answer: "Oxygen",
        marks: 2,
      },
      {
        id: "q3",
        type: "short",
        prompt: "Name the tiny openings on leaves that allow gas exchange.",
        answer: "Stomata",
        marks: 4,
      },
      {
        id: "q4",
        type: "long",
        prompt: "Explain the light-dependent and light-independent reactions briefly.",
        marks: 12,
      },
    ],
  },
  {
    id: "a2",
    title: "Unit 1 Mid-term Test",
    classId: "c1",
    chapterId: "ch1",
    type: "test",
    maxMarks: 50,
    date: "2026-08-20",
    questions: [],
  },
];

export const GRADES: GradeEntry[] = [
  { id: "g1", assessmentId: "a1", studentId: "s1", marks: 18 },
  { id: "g2", assessmentId: "a1", studentId: "s2", marks: 16 },
  { id: "g3", assessmentId: "a1", studentId: "s3", marks: 12, aiSuggested: 13, feedback: "Missed stomata definition" },
  { id: "g4", assessmentId: "a1", studentId: "s4", marks: 19 },
  { id: "g5", assessmentId: "a1", studentId: "s5", marks: 10 },
  { id: "g6", assessmentId: "a1", studentId: "s6", marks: 17 },
  { id: "g7", assessmentId: "a1", studentId: "s7", marks: 14 },
  { id: "g8", assessmentId: "a1", studentId: "s8", marks: 20 },
];

function attendanceSeed(): AttendanceRecord[] {
  const dates = ["2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"];
  const records: AttendanceRecord[] = [];
  let i = 0;
  for (const date of dates) {
    for (const s of STUDENTS.filter((x) => x.classId === "c1")) {
      const roll = parseInt(s.rollNumber.slice(-1), 10);
      const status =
        date === "2026-08-06" && roll % 5 === 0
          ? "absent"
          : roll % 7 === 0 && date === "2026-08-07"
            ? "late"
            : "present";
      records.push({
        id: `att-${i++}`,
        studentId: s.id,
        classId: "c1",
        date,
        period: 1,
        status,
      });
    }
  }
  return records;
}

export const ATTENDANCE = attendanceSeed();

export const ASSIGNMENTS: Assignment[] = [
  {
    id: "as1",
    title: "Photosynthesis worksheet pp. 1–2",
    classId: "c1",
    dueDate: "2026-08-11",
    description: "Complete short answers and diagram labeling.",
    submissions: STUDENTS.filter((s) => s.classId === "c1").map((s, idx) => ({
      studentId: s.id,
      status: idx < 5 ? "submitted" : "pending",
      submittedAt: idx < 5 ? "2026-08-09T18:00:00Z" : undefined,
    })),
  },
  {
    id: "as2",
    title: "Lab report — starch test",
    classId: "c1",
    dueDate: "2026-08-14",
    description: "Write aim, method, observation, conclusion.",
    submissions: STUDENTS.filter((s) => s.classId === "c1").map((s) => ({
      studentId: s.id,
      status: "pending" as const,
    })),
  },
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "an1",
    title: "Science fair registration open",
    body: "Students interested in the September science fair should register by Aug 20. Mentorship slots available after school on Wednesdays.",
    audience: "school",
    createdAt: "2026-08-07T09:00:00Z",
    authorId: "u2",
  },
  {
    id: "an2",
    title: "Lab coats required Friday",
    body: "Grade 8A will do the starch test on Friday. Please bring lab coats and closed shoes.",
    audience: "class",
    classId: "c1",
    createdAt: "2026-08-08T12:00:00Z",
    authorId: "u1",
  },
];

export const MESSAGES: Message[] = [
  {
    id: "msg1",
    to: "sita.parent@email.com",
    from: "priya@greenfield.edu",
    subject: "Aarav — excellent quiz result",
    body: "Dear Sita, Aarav scored 18/20 on the Photosynthesis quiz. He participated thoughtfully in discussion. Keep encouraging his curiosity!",
    createdAt: "2026-08-06T16:00:00Z",
    read: true,
  },
  {
    id: "msg2",
    to: "priya@greenfield.edu",
    from: "sita.parent@email.com",
    subject: "Re: Homework clarification",
    body: "Thank you for the note. Could you confirm if the lab report is due Thursday or Friday?",
    createdAt: "2026-08-08T19:30:00Z",
    read: false,
  },
];

export const RESEARCH: ResearchItem[] = [
  {
    id: "r1",
    title: "Teaching photosynthesis with outdoor inquiry",
    source: "Journal of Science Education",
    subject: "Science",
    url: "https://example.com/photo-inquiry",
    summary:
      "Outdoor leaf investigations improve conceptual retention by 23% compared to lecture-only lessons in middle school.",
    uploadedAt: "2026-07-10T10:00:00Z",
    contentPreview:
      "This study followed 120 Grade 8 students across four classrooms. Inquiry groups conducted weekly outdoor observations...",
  },
  {
    id: "r2",
    title: "Scaffolding scientific vocabulary for ELL learners",
    source: "TESOL Quarterly (excerpt)",
    subject: "Science",
    summary:
      "Word walls paired with gesture and visual anchors help multilingual learners master domain vocabulary faster.",
    uploadedAt: "2026-07-22T10:00:00Z",
    contentPreview: "Academic language remains a barrier... Explicit vocabulary routines...",
  },
];

export const TIMETABLE: TimetableSlot[] = [
  { id: "t1", day: "Monday", period: 1, time: "9:00–9:45", classId: "c1", subject: "Science", room: "Lab 2" },
  { id: "t2", day: "Monday", period: 3, time: "11:00–11:45", classId: "c3", subject: "Science", room: "Room 14" },
  { id: "t3", day: "Wednesday", period: 1, time: "9:00–9:45", classId: "c1", subject: "Science", room: "Lab 2" },
  { id: "t4", day: "Wednesday", period: 3, time: "11:00–11:45", classId: "c3", subject: "Science", room: "Room 14" },
  { id: "t5", day: "Friday", period: 1, time: "9:00–9:45", classId: "c1", subject: "Science", room: "Lab 2" },
  { id: "t6", day: "Tuesday", period: 2, time: "10:00–10:45", classId: "c2", subject: "Science", room: "Lab 2" },
  { id: "t7", day: "Thursday", period: 2, time: "10:00–10:45", classId: "c2", subject: "Science", room: "Lab 2" },
];

export const HOLIDAYS: Holiday[] = [
  { id: "h1", title: "Independence Day", date: "2026-08-15", type: "holiday" },
  { id: "h2", title: "Mid-term exam window", date: "2026-08-18", type: "exam" },
  { id: "h3", title: "Term 1 ends", date: "2026-09-30", type: "term" },
];
