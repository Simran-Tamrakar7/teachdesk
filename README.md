# TeachDesk — Teacher's Digital Office

A full-featured web app for teachers to manage curriculum, lesson plans, grades, students, research, and AI teaching tools in one place.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a demo account (no password):

| Role | Email |
|------|-------|
| Teacher | `priya@greenfield.edu` |
| Admin/Principal | `principal@greenfield.edu` |
| Head of Department | `anita@greenfield.edu` |
| Parent (read-only attendance) | `sita.parent@email.com` |

## What's included

- **Library** — Class → chapter organization, uploads, versioning, tags, AI chapter split / summary / quiz generation
- **Lesson plans** — Weekly calendar, AI lesson generator, templates, substitute-ready packet note
- **Grades** — Mark entry, rank/average, CSV import, report/mark sheet export, AI grade approve flow
- **Students** — Roster, quick attendance, profiles, promote/move between classes
- **Research** — References, AI summarize, ask-this-document chat with citations
- **Messages** — Announcements, parent notes, homework + submission tracking
- **Dashboard** — Today’s classes, pending work, attendance chart, weak topics
- **Settings** — Accessibility, language, full data backup/export, timetable, admin overview
- **AI Assistant** — Global chat for quizzes, rubrics, parent emails, rewrites, translations

Data persists in the browser via `localStorage` (Zustand). AI features are deterministic demos you can later wire to OpenAI/Anthropic + real PDF parsing.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Zustand · Recharts · Lucide
