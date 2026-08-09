# TeachDesk — Teacher's Digital Office

AI-assisted classroom OS for Nepali school weeks (Sun–Fri): classes, attendance, grades, notes, presentations, and a smart dashboard.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Role | Username | Password |
|------|----------|----------|
| Teacher | `rigosha.basnet` | `rigosha` |

Use **Sign up** to create more accounts. Data lives in browser `localStorage` (`teachdesk-v6`).

## Modules

- **Students** — classes/subjects, roster edit, soft-delete/trash, CSV preview+import, bulk promote/assign/delete
- **Attendance** — daily + period marking, monthly matrix, threshold flags, PDF register
- **Notes** — notes/reminders with links, recurrence, snooze, overdue flags (Messages removed)
- **Presentations** — theme picker → rich slides → editor → export `.pptx` / PDF / HTML
- **Exams & Assessments** — question papers + answer keys, marks (CSV), class/student history, reuse paper, AI rubric
- **Student profile** — `/students/[id]` attendance, exam trend, notes, forecasts
- **Dashboard** — AI briefing, smart alerts, one-click lesson/quiz/parent draft, digests
- **Settings** — profile/password, light/dark, RBAC scope, backup import/export, trash, audit & AI logs

## Stack

Next.js · TypeScript · Tailwind · Zustand · Recharts · jsPDF · PptxGenJS
