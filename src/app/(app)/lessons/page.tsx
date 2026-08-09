"use client";

import { PageHeader } from "@/components/PageHeader";
import { generateLessonPlan } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import { addDays, format, startOfWeek } from "date-fns";
import { CalendarDays, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

export default function LessonsPage() {
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const chapters = useAppStore((s) => s.chapters);
  const classes = useAppStore((s) => s.classes);
  const timetable = useAppStore((s) => s.timetable);
  const addLessonPlan = useAppStore((s) => s.addLessonPlan);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date("2026-08-09"), { weekStartsOn: 1 }));
  const [selectedId, setSelectedId] = useState(lessonPlans.find((l) => !l.template)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [genChapterId, setGenChapterId] = useState("ch1");
  const [genClassId, setGenClassId] = useState("c1");
  const [genDate, setGenDate] = useState("2026-08-13");

  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const selected = lessonPlans.find((l) => l.id === selectedId);
  const templates = lessonPlans.filter((l) => l.template);
  const plans = lessonPlans.filter((l) => !l.template);

  async function createAiPlan() {
    const chapter = chapters.find((c) => c.id === genChapterId);
    if (!chapter) return;
    setBusy(true);
    const plan = await generateLessonPlan(chapter);
    const id = uid("lp");
    addLessonPlan({
      id,
      title: plan.title,
      classId: genClassId,
      chapterId: chapter.id,
      date: genDate,
      durationMins: 45,
      objectives: plan.objectives,
      activities: plan.activities,
      homework: plan.homework,
    });
    setSelectedId(id);
    setBusy(false);
  }

  function useTemplate(templateId: string) {
    const t = lessonPlans.find((l) => l.id === templateId);
    if (!t) return;
    const id = uid("lp");
    addLessonPlan({
      ...t,
      id,
      template: false,
      title: `${t.title} (copy)`,
      date: genDate,
      classId: genClassId,
      chapterId: genChapterId,
    });
    setSelectedId(id);
  }

  return (
    <div>
      <PageHeader
        title="Lesson Plans"
        subtitle="Calendar-based planning mapped to chapters, with AI generation and reusable templates."
        actions={
          <button className="btn btn-primary" disabled={busy} onClick={createAiPlan}>
            <Sparkles size={16} /> {busy ? "Generating…" : "AI lesson plan"}
          </button>
        }
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-4">
        <label className="text-sm font-semibold">
          Class
          <select className="select mt-1" value={genClassId} onChange={(e) => setGenClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Chapter
          <select className="select mt-1" value={genChapterId} onChange={(e) => setGenChapterId(e.target.value)}>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Date
          <input className="input mt-1" type="date" value={genDate} onChange={(e) => setGenDate(e.target.value)} />
        </label>
        <div className="flex items-end gap-2">
          <button className="btn btn-secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            Prev week
          </button>
          <button className="btn btn-secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-5">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayName = format(day, "EEEE");
          const dayPlans = plans.filter((p) => p.date === key);
          const slots = timetable.filter((t) => t.day === dayName);
          return (
            <div key={key} className="surface min-h-40 p-3">
              <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <CalendarDays size={14} />
                {format(day, "EEE d")}
              </div>
              <div className="space-y-1">
                {slots.map((s) => (
                  <div key={s.id} className="rounded-lg bg-brand-soft/60 px-2 py-1 text-xs">
                    {s.time} · {s.subject}
                  </div>
                ))}
                {dayPlans.map((p) => (
                  <button
                    key={p.id}
                    className="w-full rounded-lg bg-accent-soft px-2 py-1 text-left text-xs font-semibold text-[#7a4a08]"
                    onClick={() => setSelectedId(p.id)}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="surface p-4">
          <h3 className="font-semibold">Plans</h3>
          <ul className="mt-2 space-y-1">
            {plans.map((p) => (
              <li key={p.id}>
                <button
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm ${selectedId === p.id ? "bg-brand-soft" : "hover:bg-bg-elevated"}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-ink-muted">{p.date}</div>
                </button>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">Templates</h3>
          <ul className="mt-2 space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="rounded-xl border border-line p-2 text-sm">
                <div className="font-medium">{t.title}</div>
                <button className="btn btn-ghost mt-1 px-0 text-brand" onClick={() => useTemplate(t.id)}>
                  <Copy size={14} /> Use template
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="surface p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl">{selected.title}</h2>
                  <p className="text-sm text-ink-muted">
                    {selected.date} · {selected.durationMins} min ·{" "}
                    {classes.find((c) => c.id === selected.classId)?.name}
                  </p>
                </div>
                <span className="badge">
                  {chapters.find((c) => c.id === selected.chapterId)?.title ?? "Chapter"}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Objectives</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {selected.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Activities</h3>
                <ol className="mt-2 space-y-2">
                  {selected.activities.map((a) => (
                    <li key={a.time + a.title} className="rounded-xl bg-bg-elevated px-3 py-2">
                      <div className="text-xs font-semibold text-brand">{a.time}</div>
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-sm text-ink-muted">{a.detail}</div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-line p-3">
                <div className="text-sm font-semibold">Homework</div>
                <p className="text-sm text-ink-muted">{selected.homework}</p>
              </div>
              <div className="mt-4 rounded-xl bg-accent-soft/60 p-3 text-sm">
                <strong>Substitute-ready packet:</strong> Print this plan + chapter summary from Library + quiz from Grades for a
                ready-to-teach day folder.
              </div>
            </>
          ) : (
            <p className="text-ink-muted">Select or generate a lesson plan.</p>
          )}
        </section>
      </div>
    </div>
  );
}
