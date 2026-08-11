# TeachDesk — Teacher's Digital Office

AI-assisted classroom OS for Nepali school weeks (Sun–Fri): library, presentations, exams, attendance, notes, and a smart dashboard.

**Full feature list:** see [docs/TeachDesk-Overview.md](docs/TeachDesk-Overview.md)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Role | Username | Password |
|------|----------|----------|
| Teacher | `rigosha.basnet` | `rigosha` |

Use **Sign up** for more accounts. Data lives in browser `localStorage` (`teachdesk-v7`).

**Live:** https://teach-desk-app.vercel.app

## PWA (installable app)

Install from the browser (“Add to Home Screen” / Install app). After each production deploy, installed clients get an **Update now** prompt (service worker versioned by commit SHA). Data stays in `localStorage` offline for already-opened shell pages; API/PDF imports still need network.

Local dev skips the service worker unless you set `localStorage.teachdesk-pwa-dev = "1"`.

## Modules (short)

- **Library** — Class + subject books/chapters, bookmarks, PDF viewer, Understand/Create tools  
- **Presentations** — Theme → generate → edit → present / export PPTX·PDF  
- **Exams & Assessments** — Papers, marks, history, reuse, in-app PDF  
- **Students / Attendance / Class pulse** — Roster, sections, registers, trends  
- **Lessons · Notes · Research · Dashboard · Settings** — Planning, reminders, backup, trash  

## Stack

Next.js · TypeScript · Tailwind · Zustand · Recharts · jsPDF · PptxGenJS
