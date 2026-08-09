"use client";

import { PageHeader } from "@/components/PageHeader";
import { generateLessonPlan } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { downloadText, uid } from "@/lib/utils";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, Copy, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function LessonsPage() {
  const lessonPlans = useAppStore((s) => s.lessonPlans);
  const chapters = useAppStore((s) => s.chapters);
  const classes = useAppStore((s) => s.classes);
  const timetable = useAppStore((s) => s.timetable);
  const holidays = useAppStore((s) => s.holidays);
  const addLessonPlan = useAppStore((s) => s.addLessonPlan);
  const addHoliday = useAppStore((s) => s.addHoliday);
  const updateHoliday = useAppStore((s) => s.updateHoliday);
  const removeHoliday = useAppStore((s) => s.removeHoliday);

  // Nepal school week: Sunday → Friday
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date("2026-08-09"), { weekStartsOn: 0 })
  );
  const [monthCursor, setMonthCursor] = useState(new Date("2026-08-01"));
  const [selectedId, setSelectedId] = useState(lessonPlans.find((l) => !l.template)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [genChapterId, setGenChapterId] = useState(chapters[0]?.id ?? "ch1");
  const [genClassId, setGenClassId] = useState(classes[0]?.id ?? "c1");
  const [genDate, setGenDate] = useState("2026-08-13");
  const [view, setView] = useState<"week" | "month" | "holidays">("week");
  const [editingHoliday, setEditingHoliday] = useState<string | null>(null);
  const [hTitle, setHTitle] = useState("");
  const [hDate, setHDate] = useState("2026-08-20");
  const [hType, setHType] = useState<"holiday" | "exam" | "term" | "field_trip" | "event">("holiday");
  const [hNotes, setHNotes] = useState("");

  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const selected = lessonPlans.find((l) => l.id === selectedId);
  const templates = lessonPlans.filter((l) => l.template);
  const plans = lessonPlans.filter((l) => !l.template);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 0 });
    const end = endOfMonth(monthCursor);
    // include through Friday of last week
    const endFri = addDays(startOfWeek(end, { weekStartsOn: 0 }), 5);
    return eachDayOfInterval({ start, end: endFri });
  }, [monthCursor]);

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

  function saveHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!hTitle.trim()) return;
    if (editingHoliday) {
      updateHoliday(editingHoliday, { title: hTitle.trim(), date: hDate, type: hType, notes: hNotes });
    } else {
      addHoliday({ title: hTitle.trim(), date: hDate, type: hType, notes: hNotes || undefined });
    }
    setEditingHoliday(null);
    setHTitle("");
    setHNotes("");
  }

  return (
    <div>
      <PageHeader
        title="Lesson Plans & Calendar"
        subtitle="Nepal school week Sunday–Friday. Plan lessons, mark holidays, exams, and field trips."
        actions={
          <button className="btn btn-primary" disabled={busy} onClick={createAiPlan}>
            <Sparkles size={16} /> {busy ? "Generating…" : "AI lesson plan"}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["week", "Week planner"],
            ["month", "Month calendar"],
            ["holidays", "Holidays & trips"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`btn ${view === id ? "btn-primary" : "btn-secondary"}`} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>

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
          {view === "week" ? (
            <>
              <button className="btn btn-secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                Prev week
              </button>
              <button className="btn btn-secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                Next
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setMonthCursor(addDays(startOfMonth(monthCursor), -1))}
              >
                Prev month
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setMonthCursor(addDays(endOfMonth(monthCursor), 1))}
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>

      {view === "week" && (
        <div className="mb-4 grid gap-2 md:grid-cols-6">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayName = format(day, "EEEE");
            const dayPlans = plans.filter((p) => p.date === key);
            const slots = timetable.filter((t) => t.day === dayName);
            const dayHolidays = holidays.filter((h) => h.date === key);
            return (
              <div key={key} className="surface min-h-44 p-3">
                <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                  <CalendarDays size={14} />
                  {format(day, "EEE d")}
                </div>
                <div className="space-y-1">
                  {dayHolidays.map((h) => (
                    <div key={h.id} className="rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-[#7a4a08]">
                      {h.type === "field_trip" ? "Trip: " : ""}
                      {h.title}
                    </div>
                  ))}
                  {slots.map((s) => (
                    <div key={s.id} className="rounded-lg bg-brand-soft/60 px-2 py-1 text-xs">
                      {s.time} · {s.subject}
                    </div>
                  ))}
                  {dayPlans.map((p) => (
                    <button
                      key={p.id}
                      className="w-full rounded-lg bg-brand px-2 py-1 text-left text-xs font-semibold text-white"
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
      )}

      {view === "month" && (
        <div className="mb-4 surface p-4">
          <h3 className="mb-3 font-display text-xl">{format(monthCursor, "MMMM yyyy")}</h3>
          <div className="mb-2 grid grid-cols-6 gap-1 text-center text-xs font-semibold text-ink-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {monthDays
              .filter((d) => d.getDay() !== 6)
              .map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayHolidays = holidays.filter((h) => h.date === key);
                const dayPlans = plans.filter((p) => p.date === key);
                const inMonth = isSameMonth(day, monthCursor);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`min-h-20 rounded-xl border p-2 text-left ${
                      inMonth ? "border-line bg-bg-elevated" : "border-transparent opacity-40"
                    } ${isSameDay(day, new Date("2026-08-09")) ? "ring-2 ring-brand" : ""}`}
                    onClick={() => {
                      setGenDate(key);
                      setView("week");
                      setWeekStart(startOfWeek(day, { weekStartsOn: 0 }));
                    }}
                  >
                    <div className="text-sm font-semibold">{format(day, "d")}</div>
                    {dayHolidays.slice(0, 1).map((h) => (
                      <div key={h.id} className="mt-1 truncate text-[10px] text-accent">
                        {h.title}
                      </div>
                    ))}
                    {dayPlans.slice(0, 1).map((p) => (
                      <div key={p.id} className="mt-0.5 truncate text-[10px] text-brand">
                        {p.title}
                      </div>
                    ))}
                  </button>
                );
              })}
          </div>
          <p className="mt-3 text-xs text-ink-muted">Saturday omitted — weekend in Nepal school calendar.</p>
        </div>
      )}

      {view === "holidays" && (
        <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="surface p-4">
            <h3 className="font-semibold">Nepali holidays, exams & field trips</h3>
            <ul className="mt-3 divide-y divide-line">
              {[...holidays]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((h) => (
                  <li key={h.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                    <div>
                      <div className="font-semibold">{h.title}</div>
                      <div className="text-sm text-ink-muted">
                        {h.date} · <span className="capitalize">{h.type.replace("_", " ")}</span>
                        {h.notes ? ` — ${h.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditingHoliday(h.id);
                          setHTitle(h.title);
                          setHDate(h.date);
                          setHType(h.type);
                          setHNotes(h.notes ?? "");
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost text-danger" onClick={() => removeHoliday(h.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
          <form className="surface h-fit p-4" onSubmit={saveHoliday}>
            <h3 className="font-semibold">{editingHoliday ? "Edit day" : "Add holiday / trip"}</h3>
            <label className="mt-3 block text-sm font-semibold">
              Title
              <input className="input mt-1" required value={hTitle} onChange={(e) => setHTitle(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Date
              <input className="input mt-1" type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Type
              <select
                className="select mt-1"
                value={hType}
                onChange={(e) => setHType(e.target.value as typeof hType)}
              >
                <option value="holiday">Holiday</option>
                <option value="field_trip">Field trip</option>
                <option value="exam">Exam</option>
                <option value="term">Term boundary</option>
                <option value="event">School event</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Notes
              <textarea className="textarea mt-1" value={hNotes} onChange={(e) => setHNotes(e.target.value)} />
            </label>
            <div className="mt-3 flex gap-2">
              <button className="btn btn-primary flex-1" type="submit">
                {editingHoliday ? "Save" : "Add"}
              </button>
              {editingHoliday && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingHoliday(null);
                    setHTitle("");
                    setHNotes("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

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
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    downloadText(
                      `${selected.title}.txt`,
                      [
                        selected.title,
                        selected.date,
                        "",
                        "Objectives:",
                        ...selected.objectives.map((o) => `- ${o}`),
                        "",
                        "Activities:",
                        ...selected.activities.map((a) => `${a.time} ${a.title}: ${a.detail}`),
                        "",
                        `Homework: ${selected.homework}`,
                      ].join("\n")
                    )
                  }
                >
                  Download packet
                </button>
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
            </>
          ) : (
            <p className="text-ink-muted">Select or generate a lesson plan.</p>
          )}
        </section>
      </div>
    </div>
  );
}
