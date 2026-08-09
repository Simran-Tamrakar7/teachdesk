"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AiPanel } from "./AiPanel";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/library", label: "Library", icon: Library },
  { href: "/lessons", label: "Lesson Plans", icon: CalendarDays },
  { href: "/grades", label: "Grades", icon: ClipboardList },
  { href: "/students", label: "Students", icon: Users },
  { href: "/research", label: "Research", icon: BookOpen },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);
  const logout = useAppStore((s) => s.logout);
  const assistantOpen = useAppStore((s) => s.assistantOpen);
  const setAssistantOpen = useAppStore((s) => s.setAssistantOpen);
  const fontScale = useAppStore((s) => s.fontScale);
  const highContrast = useAppStore((s) => s.highContrast);
  const materials = useAppStore((s) => s.materials);
  const students = useAppStore((s) => s.students);
  const chapters = useAppStore((s) => s.chapters);
  const [mobileNav, setMobileNav] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [hydrated, user, router]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * fontScale}px`;
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [fontScale, highContrast]);

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
        hits.push({ type: "Chapter", title: c.title, href: "/library" });
      }
    }
    for (const s of students) {
      if (s.name.toLowerCase().includes(query) || s.rollNumber.toLowerCase().includes(query)) {
        hits.push({ type: "Student", title: `${s.name} (${s.rollNumber})`, href: "/students" });
      }
    }
    return hits.slice(0, 8);
  }, [q, materials, chapters, students]);

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
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-deep">
              {user.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs capitalize text-sidebar-muted">{user.role}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost w-full justify-start text-sidebar-muted hover:text-white"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
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
                placeholder="Search materials, chapters, students…"
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
            <button className="btn btn-primary" onClick={() => setAssistantOpen(true)}>
              <Sparkles size={16} /> AI Helper
            </button>
          </div>
        </header>

        <main className="page-enter flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>

      <AiPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
