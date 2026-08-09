"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { formatDate, uid } from "@/lib/utils";
import { Bell, Send } from "lucide-react";
import { useMemo, useState } from "react";

export default function MessagesPage() {
  const announcements = useAppStore((s) => s.announcements);
  const messages = useAppStore((s) => s.messages);
  const assignments = useAppStore((s) => s.assignments);
  const classes = useAppStore((s) => s.classes);
  const students = useAppStore((s) => s.students);
  const user = useAppStore((s) => s.user);
  const addAnnouncement = useAppStore((s) => s.addAnnouncement);
  const addMessage = useAppStore((s) => s.addMessage);
  const addAssignment = useAppStore((s) => s.addAssignment);

  const [tab, setTab] = useState<"announcements" | "messages" | "homework">("announcements");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"class" | "school">("class");
  const [classId, setClassId] = useState("c1");
  const [to, setTo] = useState("sita.parent@email.com");
  const [subject, setSubject] = useState("");
  const [hwTitle, setHwTitle] = useState("");
  const [hwDue, setHwDue] = useState("2026-08-16");
  const [hwBody, setHwBody] = useState("");

  const inbox = useMemo(
    () =>
      messages
        .filter((m) => m.to === user?.email || m.from === user?.email)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [messages, user]
  );

  return (
    <div>
      <PageHeader
        title="Messages & Notices"
        subtitle="Announcements, parent notes, and homework with submission tracking."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["announcements", "Announcements"],
            ["messages", "Direct messages"],
            ["homework", "Homework"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`btn ${tab === id ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "announcements" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            {announcements.map((a) => (
              <article key={a.id} className="surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-accent" />
                      <h3 className="font-semibold">{a.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{a.body}</p>
                    <div className="mt-2 text-xs text-ink-muted">{formatDate(a.createdAt)}</div>
                  </div>
                  <span className="badge capitalize">{a.audience}</span>
                </div>
              </article>
            ))}
          </section>
          <form
            className="surface h-fit p-4"
            onSubmit={(e) => {
              e.preventDefault();
              addAnnouncement({
                title: title.trim(),
                body: body.trim(),
                audience,
                classId: audience === "class" ? classId : undefined,
              });
              setTitle("");
              setBody("");
            }}
          >
            <h3 className="font-semibold">Post announcement</h3>
            <label className="mt-3 block text-sm font-semibold">
              Title
              <input className="input mt-1" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Message
              <textarea className="textarea mt-1" required value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Audience
              <select className="select mt-1" value={audience} onChange={(e) => setAudience(e.target.value as "class" | "school")}>
                <option value="class">Class</option>
                <option value="school">School-wide</option>
              </select>
            </label>
            {audience === "class" && (
              <label className="mt-3 block text-sm font-semibold">
                Class
                <select className="select mt-1" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn btn-primary mt-4 w-full">Publish</button>
          </form>
        </div>
      )}

      {tab === "messages" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            {inbox.map((m) => (
              <article key={m.id} className="surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{m.subject}</h3>
                  {!m.read && m.to === user?.email && <span className="badge badge-warn">Unread</span>}
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {m.from} → {m.to} · {formatDate(m.createdAt)}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{m.body}</p>
              </article>
            ))}
          </section>
          <form
            className="surface h-fit p-4"
            onSubmit={(e) => {
              e.preventDefault();
              addMessage({
                to,
                from: user?.email ?? "priya@greenfield.edu",
                subject: subject.trim(),
                body: body.trim(),
              });
              setSubject("");
              setBody("");
            }}
          >
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <Send size={16} /> New note
            </h3>
            <label className="block text-sm font-semibold">
              To
              <input className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Subject
              <input className="input mt-1" required value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Body
              <textarea className="textarea mt-1" required value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <button className="btn btn-primary mt-4 w-full">Send</button>
          </form>
        </div>
      )}

      {tab === "homework" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="space-y-3">
            {assignments.map((a) => {
              const submitted = a.submissions.filter((s) => s.status === "submitted").length;
              return (
                <article key={a.id} className="surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="mt-1 text-sm text-ink-muted">{a.description}</p>
                      <div className="mt-2 text-xs text-ink-muted">
                        Due {a.dueDate} · {classes.find((c) => c.id === a.classId)?.name}
                      </div>
                    </div>
                    <span className="badge">
                      {submitted}/{a.submissions.length} submitted
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${a.submissions.length ? (submitted / a.submissions.length) * 100 : 0}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </section>
          <form
            className="surface h-fit p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const roster = students.filter((s) => s.classId === classId);
              addAssignment({
                id: uid("as"),
                title: hwTitle.trim(),
                classId,
                dueDate: hwDue,
                description: hwBody.trim(),
                submissions: roster.map((s) => ({ studentId: s.id, status: "pending" as const })),
              });
              setHwTitle("");
              setHwBody("");
            }}
          >
            <h3 className="font-semibold">Post homework</h3>
            <label className="mt-3 block text-sm font-semibold">
              Title
              <input className="input mt-1" required value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Class
              <select className="select mt-1" value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Due date
              <input className="input mt-1" type="date" value={hwDue} onChange={(e) => setHwDue(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Instructions
              <textarea className="textarea mt-1" required value={hwBody} onChange={(e) => setHwBody(e.target.value)} />
            </label>
            <button className="btn btn-primary mt-4 w-full">Post assignment</button>
          </form>
        </div>
      )}
    </div>
  );
}
