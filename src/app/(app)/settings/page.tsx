"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { downloadText } from "@/lib/utils";
import { DatabaseBackup, Languages, School, Shield, Type, Volume2 } from "lucide-react";
import { useState } from "react";
import { isAdminLike } from "@/lib/rbac";

function ComfortBreakToggle() {
  const breakReminders = useAppStore((s) => s.breakReminders);
  const setBreakReminders = useAppStore((s) => s.setBreakReminders);
  return (
    <label className="mt-3 flex items-center gap-2 text-sm">
      <input type="checkbox" checked={breakReminders} onChange={(e) => setBreakReminders(e.target.checked)} />
      Gentle break reminder after ~50 minutes
    </label>
  );
}

function TemplatesPanel() {
  const templates = useAppStore((s) => s.templates);
  const addTemplate = useAppStore((s) => s.addTemplate);
  const removeTemplate = useAppStore((s) => s.removeTemplate);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"lesson" | "comment" | "worksheet">("comment");
  return (
    <section className="surface p-5 lg:col-span-2">
      <h3 className="font-semibold">Reusable templates</h3>
      <p className="mt-1 text-sm text-ink-muted">Lesson shells, report-card comments, worksheet formats — save once, reuse often.</p>
      <ul className="mt-3 space-y-2 text-sm">
        {templates.map((t) => (
          <li key={t.id} className="rounded-xl bg-bg-elevated p-3">
            <div className="flex justify-between gap-2">
              <div>
                <span className="badge mr-2 capitalize">{t.kind}</span>
                <span className="font-semibold">{t.title}</span>
              </div>
              <button className="btn btn-ghost text-danger" onClick={() => removeTemplate(t.id)}>
                Remove
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-ink-muted">{t.body}</pre>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-2 md:grid-cols-[140px_1fr]">
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="lesson">Lesson</option>
          <option value="comment">Comment</option>
          <option value="worksheet">Worksheet</option>
        </select>
        <input className="input" placeholder="Template title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <textarea className="textarea mt-2" rows={3} placeholder="Template body" value={body} onChange={(e) => setBody(e.target.value)} />
      <button
        className="btn btn-secondary mt-2"
        onClick={() => {
          if (!title.trim() || !body.trim()) return;
          addTemplate({ kind, title: title.trim(), body: body.trim() });
          setTitle("");
          setBody("");
        }}
      >
        Save template
      </button>
    </section>
  );
}

export default function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const fontScale = useAppStore((s) => s.fontScale);
  const highContrast = useAppStore((s) => s.highContrast);
  const ttsEnabled = useAppStore((s) => s.ttsEnabled);
  const language = useAppStore((s) => s.language);
  const schoolName = useAppStore((s) => s.schoolName);
  const academicYear = useAppStore((s) => s.academicYear);
  const setFontScale = useAppStore((s) => s.setFontScale);
  const setHighContrast = useAppStore((s) => s.setHighContrast);
  const setTtsEnabled = useAppStore((s) => s.setTtsEnabled);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setSchoolName = useAppStore((s) => s.setSchoolName);
  const setAcademicYear = useAppStore((s) => s.setAcademicYear);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const materials = useAppStore((s) => s.materials);
  const students = useAppStore((s) => s.students);
  const grades = useAppStore((s) => s.grades);
  const chapters = useAppStore((s) => s.chapters);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const presentations = useAppStore((s) => s.presentations);
  const notes = useAppStore((s) => s.notes);
  const reminders = useAppStore((s) => s.reminders);
  const holidays = useAppStore((s) => s.holidays);
  const timetable = useAppStore((s) => s.timetable);
  const classes = useAppStore((s) => s.classes);
  const subjects = useAppStore((s) => s.subjects);
  const colorMode = useAppStore((s) => s.colorMode);
  const attendanceThreshold = useAppStore((s) => s.attendanceThreshold);
  const defaultSlideTheme = useAppStore((s) => s.defaultSlideTheme);
  const trash = useAppStore((s) => s.trash);
  const auditLog = useAppStore((s) => s.auditLog);
  const aiLog = useAppStore((s) => s.aiLog);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const changePassword = useAppStore((s) => s.changePassword);
  const setColorMode = useAppStore((s) => s.setColorMode);
  const setAttendanceThreshold = useAppStore((s) => s.setAttendanceThreshold);
  const setDefaultSlideTheme = useAppStore((s) => s.setDefaultSlideTheme);
  const getBackupPayload = useAppStore((s) => s.getBackupPayload);
  const markBackupDone = useAppStore((s) => s.markBackupDone);
  const importBackup = useAppStore((s) => s.importBackup);
  const restoreTrash = useAppStore((s) => s.restoreTrash);
  const emptyTrash = useAppStore((s) => s.emptyTrash);
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [message, setMessage] = useState("");

  function exportBackup() {
    downloadText("teachdesk-backup.json", JSON.stringify(getBackupPayload(), null, 2), "application/json");
    markBackupDone();
  }

  function speakSample() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(
      "Photosynthesis is how plants make food using sunlight, water, and carbon dioxide."
    );
    window.speechSynthesis.speak(u);
  }

  const isAdmin = isAdminLike(user?.role);

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="School profile, accessibility, language, backup, timetable, and account overview."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <School size={16} /> School profile
          </div>
          <label className="block text-sm font-semibold">
            School name
            <input className="input mt-1" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Academic year
            <input className="input mt-1" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          </label>
          <p className="mt-3 text-sm text-ink-muted">Week: Sunday–Friday · Weekend: Saturday</p>
        </section>
        <section className="surface p-5">
          <h3 className="font-semibold">Profile & password</h3>
          <input className="input mt-3" defaultValue={user?.name} aria-label="Your name" onBlur={(e) => updateProfile({ name: e.target.value })} />
          <input className="input mt-2" defaultValue={user?.email} aria-label="Your email" onBlur={(e) => updateProfile({ email: e.target.value })} />
          <input className="input mt-2" type="password" placeholder="Current password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
          <input className="input mt-2" type="password" placeholder="New password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
          <button className="btn btn-secondary mt-2" onClick={() => setMessage(changePassword(passwords.current, passwords.next) ?? "Password changed.")}>Change password</button>
          {message && <p className="mt-2 text-sm text-brand">{message}</p>}
        </section>

        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Type size={16} /> Accessibility
          </div>
          <label className="block text-sm">
            Font size ({Math.round(fontScale * 100)}%)
            <input
              className="mt-2 w-full"
              type="range"
              min={0.9}
              max={1.3}
              step={0.05}
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
            />
          </label>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
            High contrast
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />
            Text-to-speech helpers
          </label>
          {ttsEnabled && (
            <button className="btn btn-secondary mt-3" onClick={speakSample}>
              <Volume2 size={16} /> Try sample
            </button>
          )}
        </section>

        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Languages size={16} /> Language
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["en", "English"],
                ["ne", "नेपाली"],
                ["hi", "हिन्दी"],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                className={`btn ${language === code ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setLanguage(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
        <section className="surface p-5">
          <h3 className="font-semibold">Teaching defaults</h3>
          <label className="mt-3 block text-sm">Color mode
            <select className="select mt-1" value={colorMode} onChange={(e) => setColorMode(e.target.value as "light" | "dark" | "auto")}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto by time (evening dark)</option>
            </select>
          </label>
          <label className="mt-3 block text-sm">Attendance alert threshold: {attendanceThreshold}%<input className="mt-1 w-full" type="range" min="50" max="100" value={attendanceThreshold} onChange={(e) => setAttendanceThreshold(Number(e.target.value))} /></label>
          <label className="mt-3 block text-sm">Default slide theme<select className="select mt-1" value={defaultSlideTheme} onChange={(e) => setDefaultSlideTheme(e.target.value as typeof defaultSlideTheme)}>{["forest", "slate", "chalkboard", "ocean", "sand"].map((t) => <option key={t}>{t}</option>)}</select></label>
          <ComfortBreakToggle />
        </section>

        <TemplatesPanel />

        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <DatabaseBackup size={16} /> Backup
          </div>
          <p className="text-sm text-ink-muted">Export classes, students, marks, notes, presentations, and holidays as JSON.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={exportBackup}>
              Export all data
            </button>
            <button className="btn btn-secondary" onClick={resetDemo}>
              Reset demo data
            </button>
            <label className="btn btn-secondary cursor-pointer">Restore backup<input className="hidden" type="file" accept=".json,application/json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setMessage(importBackup(JSON.parse(await file.text())) ?? "Backup restored."); } catch { setMessage("Invalid backup file."); } }} /></label>
          </div>
        </section>
        <section id="trash" className="surface p-5 lg:col-span-2"><h3 className="font-semibold">Trash</h3><ul className="mt-3 space-y-2 text-sm">{trash.map((item) => <li key={item.id} className="flex justify-between rounded-lg bg-bg-elevated p-2"><span>{item.label}</span><button className="btn btn-secondary" onClick={() => restoreTrash(item.id)}>Restore</button></li>)}{!trash.length && <li className="text-ink-muted">Trash is empty.</li>}</ul>{trash.length > 0 && <button className="btn btn-ghost mt-3 text-danger" onClick={emptyTrash}>Empty trash permanently</button>}</section>
        <section className="surface p-5"><h3 className="font-semibold">Audit log</h3><ul className="mt-2 space-y-1 text-xs text-ink-muted">{auditLog.slice(0, 10).map((x) => <li key={x.id}>{x.action}: {x.detail}</li>)}</ul></section>
        <section className="surface p-5"><h3 className="font-semibold">AI usage</h3><ul className="mt-2 space-y-1 text-xs text-ink-muted">{aiLog.slice(0, 10).map((x) => <li key={x.id}>{x.kind}: {x.title}</li>)}</ul></section>

        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Shield size={16} /> Your account
          </div>
          <p className="text-sm">
            <strong>{user?.name}</strong> · @{user?.username} · {user?.role}
          </p>
          <p className="mt-2 text-sm text-ink-muted">{user?.email}</p>
          <p className="mt-3 text-sm text-ink-muted">{users.length} users on this device. Add more via Sign up.</p>
        </section>

        <section className="surface p-5">
          <h3 className="font-semibold">What else you can use</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <li>Presentation maker with themes + HTML download</li>
            <li>Student CSV import & class/subject setup</li>
            <li>Separate attendance page</li>
            <li>Notes, reminders, notice board</li>
            <li>Nepali holidays & field trips on the planner</li>
            <li>AI helper for quizzes, emails, rubrics, translations</li>
          </ul>
        </section>

        <section className="surface p-5 lg:col-span-2">
          <h3 className="font-semibold">Timetable</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-ink-muted">
                <tr>
                  <th className="pb-2">Day</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Class</th>
                  <th className="pb-2">Room</th>
                </tr>
              </thead>
              <tbody>
                {timetable.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="py-2">{t.day}</td>
                    <td className="py-2">{t.time}</td>
                    <td className="py-2">{classes.find((c) => c.id === t.classId)?.name}</td>
                    <td className="py-2">{t.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isAdmin && (
          <section className="surface p-5 lg:col-span-2">
            <h3 className="font-display text-xl">Admin overview</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[
                ["Classes", classes.length],
                ["Students", students.length],
                ["Materials", materials.length],
                ["Presentations", presentations.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-bg-elevated p-4">
                  <div className="text-sm text-ink-muted">{label}</div>
                  <div className="font-display text-3xl">{value}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
