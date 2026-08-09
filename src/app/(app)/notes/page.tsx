"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Bell, Pin, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";

export default function NotesPage() {
  const notes = useAppStore((s) => s.notes);
  const reminders = useAppStore((s) => s.reminders);
  const classes = useAppStore((s) => s.classes);
  const students = useAppStore((s) => s.students);
  const chapters = useAppStore((s) => s.chapters);
  const announcements = useAppStore((s) => s.announcements);
  const addNote = useAppStore((s) => s.addNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const removeNote = useAppStore((s) => s.removeNote);
  const addReminder = useAppStore((s) => s.addReminder);
  const toggleReminder = useAppStore((s) => s.toggleReminder);
  const removeReminder = useAppStore((s) => s.removeReminder);
  const snoozeNote = useAppStore((s) => s.snoozeNote);
  const snoozeReminder = useAppStore((s) => s.snoozeReminder);
  const addAnnouncement = useAppStore((s) => s.addAnnouncement);

  const [tab, setTab] = useState<"notes" | "reminders" | "board">("notes");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "friday">("none");
  const [dueAt, setDueAt] = useState("2026-08-15");
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");

  return (
    <div>
      <PageHeader
        title="Notes & Reminders"
        subtitle="Personal teaching notes, due reminders, and a simple class notice board — no chat clutter."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["notes", "Notes"],
            ["reminders", "Reminders"],
            ["board", "Notice board"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`btn ${tab === id ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "notes" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            {[...notes].filter((n) => !n.deletedAt)
              .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
              .map((n) => (
                <article key={n.id} className="surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <StickyNote size={16} className="text-brand" />
                        <h3 className="font-semibold">{n.title}</h3>
                        {n.pinned && <span className="badge">Pinned</span>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{n.body}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost" onClick={() => updateNote(n.id, { pinned: !n.pinned })}>
                        <Pin size={14} />
                      </button>
                      <button className="btn btn-ghost" onClick={() => snoozeNote(n.id, 1)}>Snooze</button>
                      <button className="btn btn-ghost text-danger" onClick={() => removeNote(n.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          </section>
          <form
            className="surface h-fit p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !body.trim()) return;
              addNote({ title: title.trim(), body: body.trim(), classId: classId || undefined, studentId: studentId || undefined, chapterId: chapterId || undefined, dueAt: dueAt || undefined, pinned: false });
              setTitle("");
              setBody("");
            }}
          >
            <h3 className="font-semibold">New note</h3>
            <input className="input mt-3" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className="textarea mt-3" placeholder="Note…" value={body} onChange={(e) => setBody(e.target.value)} required />
            <select className="select mt-3" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">No class link</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="select mt-3" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">No student link</option>{students.filter((s) => !s.deletedAt).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className="select mt-3" value={chapterId} onChange={(e) => setChapterId(e.target.value)}><option value="">No chapter link</option>{chapters.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            <button className="btn btn-primary mt-4 w-full">Save note</button>
          </form>
        </div>
      )}

      {tab === "reminders" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="surface p-4">
            <ul className="divide-y divide-line">
              {[...reminders].filter((r) => !r.deletedAt)
                .sort((a, b) => Number(a.done) - Number(b.done) || a.dueAt.localeCompare(b.dueAt))
                .map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={r.done} onChange={() => toggleReminder(r.id)} className="mt-1" />
                      <span>
                        <span className={`font-semibold ${r.done ? "text-ink-muted line-through" : ""}`}>{r.title}</span>
                        <span className={`mt-0.5 block text-xs ${!r.done && r.dueAt < new Date().toISOString().slice(0, 10) ? "text-danger" : "text-ink-muted"}`}>Due {r.dueAt} · {r.recurrence}</span>
                      </span>
                    </label>
                    <button className="btn btn-ghost text-danger" onClick={() => removeReminder(r.id)}>
                      <Trash2 size={14} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => snoozeReminder(r.id, 1)}>Snooze</button>
                  </li>
                ))}
            </ul>
          </section>
          <form
            className="surface h-fit p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addReminder({ title: title.trim(), dueAt, done: false, classId: classId || undefined, studentId: studentId || undefined, chapterId: chapterId || undefined, recurrence });
              setTitle("");
            }}
          >
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Bell size={16} /> New reminder
            </h3>
            <input className="input" placeholder="Reminder" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="input mt-3" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            <select className="select mt-3" value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}>{["none", "daily", "weekly", "friday"].map((x) => <option key={x}>{x}</option>)}</select>
            <button className="btn btn-primary mt-4 w-full">Add reminder</button>
          </form>
        </div>
      )}

      {tab === "board" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            {announcements.map((a) => (
              <article key={a.id} className="surface p-4">
                <div className="flex justify-between gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className="badge capitalize">{a.audience}</span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{a.body}</p>
              </article>
            ))}
          </section>
          <form
            className="surface h-fit p-4"
            onSubmit={(e) => {
              e.preventDefault();
              addAnnouncement({ title: annTitle.trim(), body: annBody.trim(), audience: "class", classId: classId || classes[0]?.id });
              setAnnTitle("");
              setAnnBody("");
            }}
          >
            <h3 className="font-semibold">Post notice</h3>
            <input className="input mt-3" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required placeholder="Title" />
            <textarea className="textarea mt-3" value={annBody} onChange={(e) => setAnnBody(e.target.value)} required />
            <button className="btn btn-primary mt-4 w-full">Publish</button>
          </form>
        </div>
      )}
    </div>
  );
}
