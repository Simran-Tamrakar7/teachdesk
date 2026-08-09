"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Presentation,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Trash2,
  Users,
  X,
  Activity,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AiPanel } from "./AiPanel";
import { QuickAddFab } from "./QuickAddFab";
import { ComfortOverlays } from "./ComfortOverlays";
import { visibleClasses } from "@/lib/rbac";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/library", label: "Library", icon: Library },
  { href: "/presentations", label: "Presentations", icon: Presentation },
  { href: "/lessons", label: "Lesson Plans", icon: CalendarDays },
  { href: "/exams", label: "Exams & Assessments", icon: ClipboardList },
  { href: "/students", label: "Students", icon: Users },
  { href: "/classes", label: "Class pulse", icon: Activity },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/research", label: "Research", icon: BookOpen },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);
  const logout = useAppStore((s) => s.logout);
  const presentationDirty = useAppStore((s) => s.presentationDirty);
  const assistantOpen = useAppStore((s) => s.assistantOpen);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);
  const fontScale = useAppStore((s) => s.fontScale);
  const highContrast = useAppStore((s) => s.highContrast);
  const colorMode = useAppStore((s) => s.colorMode);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const setOnboardingDone = useAppStore((s) => s.setOnboardingDone);
  const trash = useAppStore((s) => s.trash);
  const materials = useAppStore((s) => s.materials);
  const students = useAppStore((s) => s.students);
  const chapters = useAppStore((s) => s.chapters);
  const notes = useAppStore((s) => s.notes);
  const reminders = useAppStore((s) => s.reminders);
  const classes = useAppStore((s) => s.classes);
  const timetable = useAppStore((s) => s.timetable);
  const [mobileNav, setMobileNav] = useState(false);
  const [q, setQ] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [hydrated, user, router]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function doLogout() {
    if (presentationDirty) {
      const ok = window.confirm("You have unsaved changes, log out anyway?");
      if (!ok) return;
    }
    logout(); // session only — persisted classroom data stays
    setProfileOpen(false);
    router.replace("/login");
  }

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * fontScale}px`;
    document.documentElement.classList.toggle("high-contrast", highContrast);
    if (colorMode === "auto") {
      const hour = new Date().getHours();
      document.documentElement.classList.toggle("dark", hour >= 18 || hour < 6);
    } else {
      document.documentElement.classList.toggle("dark", colorMode === "dark");
    }
  }, [fontScale, highContrast, colorMode]);

  const startMyDayHref = useMemo(() => {
    const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
    const allowed = visibleClasses(user, classes);
    const first = timetable.find((t) => t.day === todayName && allowed.some((c) => c.id === t.classId));
    const classId = first?.classId ?? allowed[0]?.id ?? "";
    const date = new Date().toISOString().slice(0, 10);
    return `/attendance?start=1&classId=${classId}&date=${date}`;
  }, [user, classes, timetable]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchHits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    const hits: { type: string; title: string; href: string }[] = [];
    for (const m of materials) {
      if (
        m.title.toLowerCase().includes(query) ||
        m.tags.some((t) => t.includes(query)) ||
        m.contentPreview.toLowerCase().includes(query)
      ) {
        hits.push({ type: "Material", title: m.title, href: "/library" });
      }
    }
    for (const c of chapters) {
      if (c.title.toLowerCase().includes(query) || c.summary.toLowerCase().includes(query)) {
        hits.push({ type: "Chapter", title: c.title, href: `/library/chapters/${c.id}` });
      }
    }
    for (const s of students) {
      if (s.name.toLowerCase().includes(query) || s.rollNumber.toLowerCase().includes(query)) {
        hits.push({ type: "Student", title: `${s.name} (${s.rollNumber})`, href: `/students/${s.id}` });
      }
    }
    for (const n of notes.filter((n) => !n.deletedAt)) {
      if (`${n.title} ${n.body}`.toLowerCase().includes(query)) hits.push({ type: "Note", title: n.title, href: "/notes" });
    }
    for (const r of reminders.filter((r) => !r.deletedAt)) {
      if (r.title.toLowerCase().includes(query)) hits.push({ type: "Reminder", title: r.title, href: "/notes" });
    }
    return hits.slice(0, 8);
  }, [q, materials, chapters, students, notes, reminders]);

  // Show shell as soon as we have a user — don't block on persist hydration
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        <span className="loading-dot">{hydrated ? "Redirecting to sign in…" : "Loading your office…"}</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-ink transition-transform duration-200 lg:static lg:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white shadow-md transition group-hover:scale-105">
              <GraduationCap size={22} />
            </span>
            <div>
              <div className="font-display text-lg leading-tight tracking-tight">TeachDesk</div>
              <div className="text-xs text-sidebar-muted">Teacher&apos;s digital office</div>
            </div>
          </Link>
          <button className="btn btn-ghost text-sidebar-ink lg:hidden" onClick={() => setMobileNav(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-4">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNav(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-white/12 text-white"
                    : "text-sidebar-muted hover:bg-white/8 hover:text-sidebar-ink"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          {trash.length > 0 && (
            <Link href="/settings#trash" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-white/8 hover:text-sidebar-ink">
              <span className="flex items-center gap-3"><Trash2 size={18} /> Trash</span>
              <span className="rounded-full bg-danger px-2 py-0.5 text-xs text-white">{trash.length}</span>
            </Link>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-1 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-deep">
              {user.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs capitalize text-sidebar-muted">{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-bg-elevated/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary lg:hidden" onClick={() => setMobileNav(true)}>
              <Menu size={18} />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={16} />
              <input
                className="input pl-9"
                id="global-search"
                placeholder="Search materials, students, notes… (/)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {searchHits.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
                  {searchHits.map((h, i) => (
                    <Link
                      key={`${h.title}-${i}`}
                      href={h.href}
                      className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-brand-soft/50"
                      onClick={() => setQ("")}
                    >
                      <span>{h.title}</span>
                      <span className="badge">{h.type}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link className="btn btn-secondary hidden sm:inline-flex" href={startMyDayHref}>
              Start my day
            </Link>
            <button className="btn btn-primary" onClick={() => setAssistantOpen(true)}>
              <Sparkles size={16} /> AI Helper
            </button>
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="btn btn-secondary gap-2 pl-2 pr-2.5"
                onClick={() => setProfileOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                  {user.avatarInitials}
                </span>
                <span className="hidden max-w-[8rem] truncate sm:inline">{user.name.split(" ")[0]}</span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[200px] overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
                >
                  <div className="border-b border-line px-3 py-2">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-xs capitalize text-ink-muted">@{user.username} · {user.role}</div>
                  </div>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-brand-soft/50"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings size={16} /> Settings
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-danger hover:bg-danger-soft"
                    onClick={doLogout}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-enter flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>

      <AiPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <QuickAddFab />
      <ComfortOverlays />
      {!onboardingDone && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <section className="surface max-w-md p-6">
            <h2 className="font-display text-2xl">Welcome to TeachDesk</h2>
            <p className="mt-2 text-sm text-ink-muted">Start with Students to set up your roster, then use Attendance and Exams & Assessments to keep the daily work current.</p>
            <button className="btn btn-primary mt-5" onClick={() => setOnboardingDone(true)}>Open my desk</button>
          </section>
        </div>
      )}
    </div>
  );
}
