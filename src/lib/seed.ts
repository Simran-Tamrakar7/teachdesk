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
  ResearchItem,
  SchoolClass,
  Student,
  TimetableSlot,
  User,
} from "./types";

export const DEMO_USERS: User[] = [
  {
    id: "u1",
    name: "Rigosha Basnet",
    email: "rigosha.basnet@teachdesk.app",
    username: "rigosha.basnet",
    password: "rigosha",
    role: "teacher",
    subject: "Science",
    avatarInitials: "RB",
    classIds: ["c1", "c2", "c3", "c6"],
    defaultSlideTheme: "forest",
  },
];

export const SUBJECTS = [
  { id: "sub-science", name: "Science", code: "SCI" },
  { id: "sub-math", name: "Mathematics", code: "MATH" },
  { id: "sub-english", name: "English", code: "ENG" },
  { id: "sub-nepali", name: "Nepali", code: "NEP" },
  { id: "sub-social", name: "Social Studies", code: "SOC" },
];

export const CLASSES: SchoolClass[] = [
  {
    id: "c1",
    name: "Grade 8A — Science",
    grade: "8",
    section: "A",
    subject: "Science",
    teacherId: "u1",
    schedule: "Sun/Wed/Fri 9:00–9:45",
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
    schedule: "Sun/Fri 11:00–11:45",
  },
  {
    id: "c6",
    name: "Class 6 — Social Studies",
    grade: "6",
    section: "A",
    subject: "Social Studies",
    teacherId: "u1",
    schedule: "Sun/Tue/Thu 9:00–9:45",
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
  {
    id: "ch6-1",
    subjectId: "social",
    classId: "c6",
    title: "Our Earth",
    unitNumber: 1,
    lang: "en",
    summary:
      "Introduces Earth as our home: land, water, air, day and night, and why we care for the environment.",
    keyTerms: ["Earth", "Continent", "Ocean", "Atmosphere", "Environment"],
    objectives: [
      "Describe Earth as a living place for people, plants and animals",
      "Name major land and water forms",
      "Explain simple ways to protect the environment",
    ],
    discussionQuestions: [
      "What do we get from the Earth every day?",
      "How can Class 6 students help keep their area clean?",
    ],
    body: `Chapter 1 — Our Earth

Earth is the planet where we live. It has land, water and air. Continents are large land masses. Oceans and seas cover most of the Earth’s surface. The atmosphere is the layer of air around Earth.

We depend on soil for farming, water for drinking, and clean air for breathing. When we cut too many trees or throw waste carelessly, the environment becomes unhealthy.

Caring for Earth means planting trees, saving water, and keeping our school and home clean.`,
    ne: {
      title: "हाम्रो पृथ्वी",
      summary: "हाम्रो घर पृथ्वी: जमिन, पानी, हावा, दिन-रात र वातावरण संरक्षणको परिचय।",
      keyTerms: ["पृथ्वी", "महाद्वीप", "महासागर", "वायुमण्डल", "वातावरण"],
      objectives: [
        "पृथ्वीलाई मानिस, वनस्पति र जनावरको बासस्थान भनेर वर्णन गर्ने",
        "प्रमुख भू-आकृति र जल-आकृति नाम बताउने",
        "वातावरण जोगाउने सरल उपाय बताउने",
      ],
      discussionQuestions: [
        "हामीले पृथ्वीबाट दैनिक के-के पाउँछौं?",
        "कक्षा ६ का विद्यार्थीले आफ्नो क्षेत्र सफा राख्न के गर्न सक्छन्?",
      ],
      body: `अध्याय १ — हाम्रो पृथ्वी

पृथ्वी हामी बस्ने ग्रह हो। यसमा जमिन, पानी र हावा छ। महाद्वीप ठूला स्थलभाग हुन्। महासागर र समुद्रले पृथ्वीको धेरै भाग ढाकेका छन्। वायुमण्डल पृथ्वी वरिपरिको हावाको तह हो।

हामी खेतीका लागि माटो, पिउनका लागि पानी र सास फेर्न सफा हावामा निर्भर छौं। धेरै रुख काट्दा वा फोहोर जथाभावी फाल्दा वातावरण बिग्रन्छ।

पृथ्वीको हेरचाह भनेको रुख रोप्नु, पानी बचत गर्नु र घर-स्कूल सफा राख्नु हो।`,
    },
    pageStart: 1,
    pageEnd: 18,
  },
  {
    id: "ch6-2",
    subjectId: "social",
    classId: "c6",
    title: "Our Society and Culture",
    unitNumber: 2,
    lang: "en",
    summary: "Family, community, festivals, languages and living together with respect in Nepal.",
    keyTerms: ["Society", "Culture", "Festival", "Tradition", "Respect"],
    objectives: [
      "Explain what a society is",
      "Give examples of Nepali cultural practices",
      "Show respect for different languages and religions",
    ],
    discussionQuestions: [
      "Which festival does your family celebrate?",
      "Why should we respect friends from other communities?",
    ],
    body: `Chapter 2 — Our Society and Culture

A society is a group of people who live together and help one another. In Nepal, families, neighbours, schools and villages form our society.

Culture includes language, food, dress, music, dance and festivals. Dashain, Tihar, Holi, Eid, Christmas and many local festivals show our diversity.

When we respect each other’s traditions, society becomes peaceful and strong.`,
    ne: {
      title: "हाम्रो समाज र संस्कृति",
      summary: "परिवार, समुदाय, चाडपर्व, भाषा र नेपालमा सद्भावपूर्ण सहअस्तित्व।",
      keyTerms: ["समाज", "संस्कृति", "चाडपर्व", "परम्परा", "सम्मान"],
      objectives: [
        "समाज के हो भनेर व्याख्या गर्ने",
        "नेपाली सांस्कृतिक अभ्यासका उदाहरण दिने",
        "फरक भाषा र धर्मप्रति सम्मान देखाउने",
      ],
      discussionQuestions: [
        "तपाईंको परिवार कुन चाड मनाउँछ?",
        "अर्को समुदायका साथीलाई किन सम्मान गर्नुपर्छ?",
      ],
      body: `अध्याय २ — हाम्रो समाज र संस्कृति

समाज भनेको सँगै बसेर एकअर्कालाई सहयोग गर्ने मानिसहरूको समूह हो। नेपालमा परिवार, छरछिमेक, स्कूल र गाउँ हाम्रो समाज हुन्।

संस्कृतिमा भाषा, खाना, पोशाक, संगीत, नृत्य र चाडपर्व पर्छन्। दशैं, तिहार, होली, ईद, क्रिसमस लगायतका चाडले हाम्रो विविधता देखाउँछन्।

एकअर्काको परम्परालाई सम्मान गर्दा समाज शान्तिपूर्ण र बलियो हुन्छ।`,
    },
    pageStart: 19,
    pageEnd: 36,
  },
  {
    id: "ch6-3",
    subjectId: "social",
    classId: "c6",
    title: "Civic Life and Responsibility",
    unitNumber: 3,
    lang: "en",
    summary: "Rules, rights, duties, helping neighbours, and being a good citizen at school and home.",
    keyTerms: ["Citizen", "Duty", "Right", "Rule", "Responsibility"],
    objectives: [
      "List basic duties of a student citizen",
      "Differentiate rights and responsibilities",
      "Practice following classroom and community rules",
    ],
    discussionQuestions: [
      "What rule helps your classroom the most?",
      "How do you help at home without being asked?",
    ],
    body: `Chapter 3 — Civic Life and Responsibility

A good citizen follows rules, tells the truth, and helps others. Students have the right to learn in a safe school. They also have the duty to study, respect teachers, and keep the school clean.

Rights and duties go together. If we only demand rights and ignore duties, community life becomes difficult.

Small actions — waiting your turn, sharing, and reporting problems politely — build civic sense.`,
    ne: {
      title: "नागरिक जीवन र जिम्मेवारी",
      summary: "नियम, अधिकार, कर्तव्य, छरछिमेकलाई सहयोग र असल नागरिक बन्ने अभ्यास।",
      keyTerms: ["नागरिक", "कर्तव्य", "अधिकार", "नियम", "जिम्मेवारी"],
      objectives: [
        "विद्यार्थी नागरिकका आधारभूत कर्तव्य सूचीबद्ध गर्ने",
        "अधिकार र जिम्मेवारी छुट्याउने",
        "कक्षा र समुदायका नियम पालना गर्ने अभ्यास गर्ने",
      ],
      discussionQuestions: [
        "तपाईंको कक्षामा कुन नियम सबैभन्दा उपयोगी छ?",
        "नभने पनि घरमा कसरी सहयोग गर्नुहुन्छ?",
      ],
      body: `अध्याय ३ — नागरिक जीवन र जिम्मेवारी

असल नागरिक नियम मान्छ, सत्य बोल्छ र अरूलाई सहयोग गर्छ। विद्यार्थीलाई सुरक्षित स्कूलमा पढ्ने अधिकार छ। उनीहरूको कर्तव्य पढ्नु, शिक्षकलाई सम्मान गर्नु र स्कूल सफा राख्नु हो।

अधिकार र कर्तव्य सँगै जान्छन्। अधिकार मात्र माग्ने र कर्तव्य बिर्सने हो भने सामुदायिक जीवन गाह्रो हुन्छ।

पालो पर्खनु, बाँड्नु र समस्या शिष्ट तरिकाले भन्नु जस्ता साना कामले नागरिक चेतना बढाउँछ।`,
    },
    pageStart: 37,
    pageEnd: 52,
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
    title: "Unit Test 1 — Photosynthesis",
    classId: "c1",
    subject: "Science",
    chapterId: "ch1",
    chapterIds: ["ch1"],
    type: "exam",
    maxMarks: 20,
    passMark: 8,
    date: "2026-08-05",
    term: "Term 1",
    paper: {
      fileName: "unit-test-1-photosynthesis.pdf",
      mime: "application/pdf",
      sizeLabel: "240 KB",
    },
    answerKey: {
      fileName: "unit-test-1-answer-key.pdf",
      mime: "application/pdf",
      sizeLabel: "90 KB",
    },
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
    subject: "Science",
    chapterId: "ch1",
    chapterIds: ["ch1", "ch2"],
    type: "exam",
    maxMarks: 50,
    passMark: 20,
    date: "2026-08-20",
    term: "Term 1",
    paper: {
      fileName: "midterm-unit1.pdf",
      mime: "application/pdf",
      sizeLabel: "410 KB",
    },
    questions: [],
  },
  {
    id: "a3",
    title: "Respiration short quiz",
    classId: "c1",
    subject: "Science",
    chapterId: "ch2",
    chapterIds: ["ch2"],
    type: "quiz",
    maxMarks: 10,
    passMark: 4,
    date: "2026-07-22",
    term: "Term 1",
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
  { id: "g9", assessmentId: "a3", studentId: "s1", marks: 9 },
  { id: "g10", assessmentId: "a3", studentId: "s2", marks: 7 },
  { id: "g11", assessmentId: "a3", studentId: "s3", marks: 5 },
  { id: "g12", assessmentId: "a3", studentId: "s5", marks: 4 },
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
  { id: "t1", day: "Sunday", period: 1, time: "9:00–9:45", classId: "c1", subject: "Science", room: "Lab 2" },
  { id: "t2", day: "Sunday", period: 3, time: "11:00–11:45", classId: "c3", subject: "Science", room: "Room 14" },
  { id: "t3", day: "Monday", period: 1, time: "9:00–9:45", classId: "c1", subject: "Science", room: "Lab 2" },
  { id: "t4", day: "Tuesday", period: 2, time: "10:00–10:45", classId: "c2", subject: "Science", room: "Lab 2" },
  { id: "t5", day: "Wednesday", period: 1, time: "9:00–9:45", classId: "c1", subject: "Science", room: "Lab 2" },
  { id: "t6", day: "Thursday", period: 2, time: "10:00–10:45", classId: "c2", subject: "Science", room: "Lab 2" },
  { id: "t7", day: "Friday", period: 1, time: "9:00–9:45", classId: "c1", subject: "Science", room: "Lab 2" },
  { id: "t8", day: "Friday", period: 3, time: "11:00–11:45", classId: "c3", subject: "Science", room: "Room 14" },
];

export const HOLIDAYS: Holiday[] = [
  { id: "h1", title: "Independence Day (Nepal)", date: "2026-08-15", type: "holiday", notes: "Public holiday" },
  { id: "h2", title: "Teej (Haritalika)", date: "2026-09-09", type: "holiday", notes: "School closed" },
  { id: "h3", title: "Dashain vacation starts", date: "2026-10-10", type: "holiday", notes: "Long break — confirm with school calendar" },
  { id: "h4", title: "Tihar / Deepawali period", date: "2026-11-05", type: "holiday", notes: "Festival holidays" },
  { id: "h5", title: "Constitution Day", date: "2026-09-19", type: "holiday" },
  { id: "h6", title: "Maghe Sankranti", date: "2027-01-15", type: "holiday" },
  { id: "h7", title: "Holi", date: "2027-03-03", type: "holiday" },
  { id: "h8", title: "Buddha Jayanti", date: "2027-05-12", type: "holiday" },
  { id: "h9", title: "Mid-term exam window", date: "2026-08-18", type: "exam", notes: "Edit dates as needed" },
  { id: "h10", title: "Term 1 ends", date: "2026-09-30", type: "term" },
  { id: "h11", title: "Science museum field trip (8A)", date: "2026-08-28", type: "field_trip", notes: "Permission slips due Aug 25" },
];

export const NOTES = [
  {
    id: "n1",
    title: "Lab safety reminder",
    body: "Remind 8A to bring lab coats on Friday. Check iodine stock before period 1.",
    classId: "c1",
    pinned: true,
    createdAt: "2026-08-08T09:00:00Z",
    updatedAt: "2026-08-08T09:00:00Z",
  },
  {
    id: "n2",
    title: "Parent meeting notes",
    body: "Discuss Aarav’s strong quiz score and encourage home vocabulary practice.",
    studentId: "s1",
    pinned: false,
    createdAt: "2026-08-07T16:00:00Z",
    updatedAt: "2026-08-07T16:00:00Z",
  },
];

export const REMINDERS = [
  {
    id: "rm1",
    title: "Collect permission slips — museum trip",
    dueAt: "2026-08-25",
    done: false,
    classId: "c1",
    recurrence: "none" as const,
    createdAt: "2026-08-08T10:00:00Z",
  },
  {
    id: "rm2",
    title: "Submit mid-term marks",
    dueAt: "2026-08-22",
    done: false,
    recurrence: "friday" as const,
    createdAt: "2026-08-08T10:05:00Z",
  },
  {
    id: "rm3",
    title: "Print photosynthesis worksheets",
    dueAt: "2026-08-11",
    done: true,
    classId: "c1",
    recurrence: "none" as const,
    createdAt: "2026-08-06T08:00:00Z",
  },
];

/** Nepal school week: Sunday–Friday (Saturday off) */
export const SCHOOL_WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
