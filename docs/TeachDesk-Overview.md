# TeachDesk — Product Documentation

**Live app:** https://teach-desk-app.vercel.app  
**Stack:** Next.js · TypeScript · Tailwind · Zustand (`localStorage`) · Recharts · jsPDF · PptxGenJS  
**Storage key:** `teachdesk-v7` (browser-only; no server database)

---

## Login

| | |
|---|---|
| Seed teacher | Username `rigosha.basnet` · Password `rigosha` |
| Also | Sign up, show/hide password, forgot / reset password |
| Session | Profile menu (top-right) → **Log out** clears session only — **does not** wipe classes, library, exams, etc. |
| Unsaved guard | If a presentation is mid-edit, logout asks to confirm |

---

## Navigation (sidebar)

| Module | Route | Purpose |
|--------|--------|---------|
| Dashboard | `/dashboard` | Day overview, AI briefing, alerts, shortcuts |
| Library | `/library` | Textbooks, chapters, bookmarks |
| Presentations | `/presentations` | Slide decks from chapters |
| Lesson Plans | `/lessons` | Lesson plans |
| Exams & Assessments | `/exams` | Papers, marks, history (`/grades` redirects here) |
| Students | `/students` | Roster + profile `/students/[id]` |
| Class pulse | `/classes` | Per-class health + tagged presentations |
| Attendance | `/attendance` | Daily / period marking |
| Research | `/research` | Research notes / summaries |
| Notes | `/notes` | Notes + reminders |
| Settings | `/settings` | Profile, theme, backup, trash, logs |

**Also:** global search (`/`), AI assistant panel, Start My Day, comfort overlays, quick-add FAB.

---

## 1. Library

**Browse by:** Class (grade) + Subject only — e.g. `Class 8 — Science`.  
**Not in Library:** school section A/B (those stay in exams, lessons, attendance, students).

### Books
- Upload PDF/TXT (or paste text/TOC)
- In-app **PDF viewer** (zoom + explicit Download)
- Progress while extracting chapters
- **Extract chapters** / **Extract all books**
- Clear class library

### Chapters
- Cards: unit #, title, page range, short summary, word count
- Open chapter page, rename/edit, merge next, re-split, delete
- EN / नेपाली toggle + translate helpers

### Chapter page (`/library/chapters/[id]`)
1. Title, pages, source book + readable body  
2. **Understand this chapter** (separate tools, cached, Regenerate, Copy / .txt / PDF):
   - Summarize  
   - Explain Simply  
   - Pointers / Key Points  
   - Key Terms / Glossary  
3. **Create from this chapter:**
   - Generate Quiz  
   - Generate Lesson Plan  
   - Generate Presentation → Presentation Maker  

### Bookmarks (class-scoped)
- Label + link + optional note  
- Link = chapter path or external `https://…`  
- Add / edit / delete; click to open  
- Separate **Bookmarks** tab so it doesn’t clutter books  

### Chapter detection
- TOC lines (`1 Scientific Learning 1`), Chapter/Unit headings, page breaks, best-guess split  
- Grade 8 Science TOC fallback when PDF text can’t be read  
- Re-extract **replaces** that book’s chapters (no duplicate stacks)

---

## 2. Presentation Maker

**Flow:** Theme → Generate → Edit → Export (or Present)

| Feature | Detail |
|---------|--------|
| Themes | Forest, Slate, Chalkboard, Ocean, Sand (last used remembered) |
| Before generate | Slide count 5 / 10 / 15 · Detailed vs Minimal density |
| From chapter / Blank / Duplicate deck | Starting points |
| Editor | Thumbnail strip, drag reorder, Up/Down, Duplicate slide, Remove |
| Per slide | Title, bullets, speaker notes, image upload, **AI-generate image** |
| Autosave | While editing |
| Present | Fullscreen slideshow ←/→, Esc; presenter notes panel (N toggles) |
| Export | `.pptx`, PDF, HTML slideshow |
| Organization | Search decks by class/chapter; class tag; lesson/exam date |
| Safety | Confirm before Delete deck |
| Class pulse | Decks tagged to a class appear under that class |

---

## 3. Exams & Assessments

- Create exams (class, subject, date, term, max/pass marks, chapters)  
- Optional **question paper** + **answer key** (in-app PDF viewer + Download)  
- Grade entry, CSV import  
- Class history / student history + filters  
- Reuse paper, AI rubric / objective-mark helpers  
- Mark sheets / report card PDF exports  

**Sections** apply here via class selection (e.g. Grade 8A).

---

## 4. Students & attendance

### Students
- Roster by class/section  
- CSV import, promote / assign / soft-delete → trash  
- Profile: attendance, exam trend, notes, forecasts  

### Attendance
- Daily + period marking  
- Monthly matrix, threshold flags  
- PDF register export  
- Section-aware via class roster  

---

## 5. Lessons, notes, research, class pulse

| Module | What you have |
|--------|----------------|
| Lesson Plans | Plans (incl. generated from chapters) |
| Notes | Notes + reminders (links, recurrence, snooze, overdue) |
| Research | Items + AI summary helpers |
| Class pulse | Attendance %, at-risk flags, grade trend, **presentations for this class** |

---

## 6. Dashboard & settings

### Dashboard
- AI briefing / smart alerts  
- Shortcuts (lesson, quiz, parent draft, digests)  
- Pinned favorites / recent items  

### Settings
- Profile & password  
- Font scale, high contrast, light/dark/auto  
- Notification toggles  
- Backup export / import  
- Trash recovery  
- Audit log + AI log  

---

## 7. Cross-cutting

| Capability | Notes |
|------------|--------|
| Auth / roles | Teacher (seed); signup; RBAC scopes classes/students |
| Soft-delete | Trash with retention for students, notes, etc. |
| AI (demo/local) | Summaries, quizzes, lesson plans, rubrics, parent drafts — stubbed, not a live LLM API |
| PDF in-app | Library books, exam papers/keys — view without forced download |
| Data | All in browser `localStorage`; backup via Settings |

---

## What “section” means where

| Place | Section used? |
|-------|----------------|
| Library | **No** — Class + Subject only |
| Students / Attendance / Exams / Lessons / Class pulse | **Yes** — school section A/B via class roster |

---

## Quick mental map

```
TeachDesk
├── Teach (Library → Chapters → Understand / Create)
├── Present (Presentation Maker → Present / Export)
├── Assess (Exams & Grades)
├── Care for class (Students, Attendance, Class pulse)
├── Plan (Lessons, Notes, Research)
└── Office (Dashboard, Settings, Backup)
```
