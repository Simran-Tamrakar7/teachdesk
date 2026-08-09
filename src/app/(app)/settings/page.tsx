"use client";

import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { downloadText } from "@/lib/utils";
import { DatabaseBackup, Languages, Shield, Type, Volume2 } from "lucide-react";

export default function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const fontScale = useAppStore((s) => s.fontScale);
  const highContrast = useAppStore((s) => s.highContrast);
  const ttsEnabled = useAppStore((s) => s.ttsEnabled);
  const language = useAppStore((s) => s.language);
  const setFontScale = useAppStore((s) => s.setFontScale);
  const setHighContrast = useAppStore((s) => s.setHighContrast);
  const setTtsEnabled = useAppStore((s) => s.setTtsEnabled);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const materials = useAppStore((s) => s.materials);
  const students = useAppStore((s) => s.students);
  const grades = useAppStore((s) => s.grades);
  const chapters = useAppStore((s) => s.chapters);
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const timetable = useAppStore((s) => s.timetable);
  const classes = useAppStore((s) => s.classes);

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      materials,
      students,
      grades,
      chapters,
      lessonPlans,
    };
    downloadText("teachdesk-backup.json", JSON.stringify(payload, null, 2), "application/json");
  }

  function speakSample() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(
      "Photosynthesis is how plants make food using sunlight, water, and carbon dioxide."
    );
    window.speechSynthesis.speak(u);
  }

  const isAdmin = user?.role === "admin" || user?.role === "hod";

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Accessibility, language, backup, timetable overview, and role-aware school tools."
      />

      <div className="grid gap-4 lg:grid-cols-2">
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
            High contrast mode
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />
            Enable text-to-speech helpers
          </label>
          {ttsEnabled && (
            <button className="btn btn-secondary mt-3" onClick={speakSample}>
              <Volume2 size={16} /> Try sample reading
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
          <p className="mt-3 text-sm text-ink-muted">
            UI chrome stays English in this demo; AI assistant can translate materials on request.
          </p>
        </section>

        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <DatabaseBackup size={16} /> Backup & offline
          </div>
          <p className="text-sm text-ink-muted">
            Export materials metadata, marks, and student records as JSON. Download PDFs from Library for low-bandwidth days.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={exportBackup}>
              Export all data
            </button>
            <button className="btn btn-secondary" onClick={resetDemo}>
              Reset demo data
            </button>
          </div>
        </section>

        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Shield size={16} /> Role & sharing
          </div>
          <p className="text-sm">
            Signed in as <strong>{user?.name}</strong> ({user?.role}).
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <li>Teacher: full access to own classes and AI tools</li>
            <li>HoD: department library sharing across Science teachers</li>
            <li>Admin/Principal: school-wide analytics & user overview</li>
            <li>Parent: read-only grades, attendance, homework</li>
          </ul>
        </section>

        <section className="surface p-5 lg:col-span-2">
          <h3 className="font-semibold">Timetable overview</h3>
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
            <h3 className="font-display text-xl">Admin / Principal overview</h3>
            <p className="mt-1 text-sm text-ink-muted">School-wide snapshot across teachers and classes.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-bg-elevated p-4">
                <div className="text-sm text-ink-muted">Classes</div>
                <div className="font-display text-3xl">{classes.length}</div>
              </div>
              <div className="rounded-xl bg-bg-elevated p-4">
                <div className="text-sm text-ink-muted">Students</div>
                <div className="font-display text-3xl">{students.length}</div>
              </div>
              <div className="rounded-xl bg-bg-elevated p-4">
                <div className="text-sm text-ink-muted">Materials</div>
                <div className="font-display text-3xl">{materials.length}</div>
              </div>
              <div className="rounded-xl bg-bg-elevated p-4">
                <div className="text-sm text-ink-muted">Grade entries</div>
                <div className="font-display text-3xl">{grades.length}</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
