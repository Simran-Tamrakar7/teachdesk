"use client";

import { useAppStore } from "@/lib/store";
import { visibleClasses, visibleStudents } from "@/lib/rbac";
import { Mic, Plus, StickyNote, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function parseVoiceReminder(text: string) {
  const lower = text.toLowerCase();
  let dueAt = new Date().toISOString().slice(0, 10);
  if (lower.includes("monday")) {
    const d = new Date();
    const day = d.getDay();
    const add = (1 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    dueAt = d.toISOString().slice(0, 10);
  } else if (lower.includes("tomorrow")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dueAt = d.toISOString().slice(0, 10);
  } else if (lower.includes("friday")) {
    const d = new Date();
    const day = d.getDay();
    const add = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    dueAt = d.toISOString().slice(0, 10);
  }
  return { title: text.trim(), dueAt };
}

export function QuickAddFab() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const classes = useAppStore((s) => s.classes);
  const students = useAppStore((s) => s.students);
  const addNote = useAppStore((s) => s.addNote);
  const addReminder = useAppStore((s) => s.addReminder);
  const setAttendance = useAppStore((s) => s.setAttendance);
  const enabledGrades = useAppStore((s) => s.enabledGrades);
  const gradeOrder = useAppStore((s) => s.gradeOrder);
  const classScope = useMemo(() => ({ enabledGrades, gradeOrder }), [enabledGrades, gradeOrder]);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "note" | "reminder" | "absent" | "voice">("menu");
  const [text, setText] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");

  const allowedClasses = useMemo(() => visibleClasses(user, classes, classScope), [user, classes, classScope]);
  const roster = useMemo(
    () => visibleStudents(user, students, classes, classScope).filter((s) => !classId || s.classId === classId),
    [user, students, classes, classId, classScope]
  );

  useEffect(() => {
    if (!classId && allowedClasses[0]) setClassId(allowedClasses[0].id);
  }, [allowedClasses, classId]);

  function startVoice() {
    const SR =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition })
            .SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
        : undefined;
    if (!SR) {
      setStatus("Voice not supported in this browser — type instead.");
      setMode("reminder");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    setListening(true);
    setStatus("Listening…");
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      setListening(false);
      const parsed = parseVoiceReminder(said);
      addReminder({ title: parsed.title, dueAt: parsed.dueAt, done: false, recurrence: "none" });
      setStatus(`Saved reminder: “${parsed.title}” (due ${parsed.dueAt})`);
      setMode("menu");
      setOpen(false);
    };
    rec.onerror = () => {
      setListening(false);
      setStatus("Couldn’t catch that — try again or type it.");
    };
    rec.onend = () => setListening(false);
    rec.start();
  }

  if (!user || user.role === "parent" || user.role === "student") return null;

  return (
    <>
      <button
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg transition hover:scale-105 md:bottom-8 md:right-8"
        aria-label="Quick add"
        onClick={() => {
          setOpen(true);
          setMode("menu");
          setStatus("");
          setText("");
        }}
      >
        <Plus size={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="surface w-full max-w-md p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl">Quick add</h3>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {mode === "menu" && (
              <div className="grid gap-2">
                <button className="btn btn-secondary justify-start" onClick={() => setMode("note")}>
                  <StickyNote size={16} /> Quick note
                </button>
                <button className="btn btn-secondary justify-start" onClick={() => setMode("reminder")}>
                  Reminder
                </button>
                <button className="btn btn-secondary justify-start" onClick={() => setMode("absent")}>
                  <UserX size={16} /> Mark absent
                </button>
                <button className="btn btn-primary justify-start" onClick={() => { setMode("voice"); startVoice(); }}>
                  <Mic size={16} /> {listening ? "Listening…" : "Voice to reminder"}
                </button>
                <button
                  className="btn btn-ghost justify-start"
                  onClick={() => {
                    setOpen(false);
                    router.push("/attendance?start=1");
                  }}
                >
                  Start my day → attendance
                </button>
              </div>
            )}

            {mode === "note" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  addNote({ title: text.trim().slice(0, 60), body: text.trim(), pinned: false, classId: classId || undefined });
                  setOpen(false);
                }}
              >
                <textarea className="textarea" rows={4} placeholder="Jot a note…" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
                <button className="btn btn-primary mt-3 w-full">Save note</button>
              </form>
            )}

            {mode === "reminder" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  const monday = new Date();
                  const add = (1 - monday.getDay() + 7) % 7 || 7;
                  monday.setDate(monday.getDate() + add);
                  addReminder({
                    title: text.trim(),
                    dueAt: monday.toISOString().slice(0, 10),
                    done: false,
                    recurrence: "none",
                    classId: classId || undefined,
                  });
                  setOpen(false);
                }}
              >
                <input className="input" placeholder="Remind me to…" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
                <p className="mt-2 text-xs text-ink-muted">Defaults due next Monday — edit later in Notes.</p>
                <button className="btn btn-primary mt-3 w-full">Save reminder</button>
              </form>
            )}

            {mode === "absent" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!studentId || !classId) return;
                  const today = new Date().toISOString().slice(0, 10);
                  setAttendance(studentId, classId, today, "absent", 1);
                  setStatus("Marked absent for today.");
                  setTimeout(() => setOpen(false), 600);
                }}
              >
                <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {allowedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select className="select mt-2" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                  <option value="">Select student</option>
                  {roster.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.rollNumber} — {s.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary mt-3 w-full">Mark absent today</button>
              </form>
            )}

            {mode === "voice" && <p className="text-sm text-ink-muted">{listening ? "Speak now…" : status || "Starting mic…"}</p>}
            {status && mode !== "voice" && <p className="mt-2 text-sm text-brand">{status}</p>}
          </div>
        </div>
      )}
    </>
  );
}

// Minimal SpeechRecognition typings for browsers that support it
type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
type SpeechRecognitionEvent = { results: { [index: number]: { [index: number]: { transcript: string } } } };
