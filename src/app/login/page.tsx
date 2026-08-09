"use client";

import { DEMO_USERS } from "@/lib/seed";
import { useAppStore } from "@/lib/store";
import { GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const login = useAppStore((s) => s.login);
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);
  const router = useRouter();
  const [email, setEmail] = useState("priya@greenfield.edu");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  function enterAs(nextEmail: string) {
    const ok = login(nextEmail.trim());
    if (!ok) {
      setError("No demo account found for that email.");
      return;
    }
    setError("");
    router.replace("/dashboard");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    enterAs(email);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface shadow-xl md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-ink md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand">
                  <GraduationCap />
                </span>
                <span className="font-display text-2xl">TeachDesk</span>
              </div>
              <h1 className="font-display text-4xl leading-tight tracking-tight">
                Your classroom,
                <br />
                calmly organized.
              </h1>
              <p className="mt-4 max-w-md text-sidebar-muted">
                Curriculum, lesson plans, attendance, grades, and an AI teaching assistant — one warm digital office for teachers.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-sidebar-muted">
              <li>• Auto-split textbooks into chapters</li>
              <li>• Lesson plans mapped to your calendar</li>
              <li>• Marks, report cards, and class analytics</li>
            </ul>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <div className="mb-6 md:hidden">
            <div className="font-display text-2xl text-brand">TeachDesk</div>
            <p className="text-sm text-ink-muted">Teacher&apos;s digital office</p>
          </div>
          <h2 className="font-display text-3xl tracking-tight">Sign in</h2>
          <p className="mt-1 text-ink-muted">Use a demo account — no password needed.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-semibold">
              Email
              <input
                className="input mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button className="btn btn-primary w-full py-3" type="submit">
              Enter office
            </button>
          </form>

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Demo users</div>
            <div className="space-y-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-brand hover:bg-brand-soft/40"
                  onClick={() => {
                    setEmail(u.email);
                    enterAs(u.email);
                  }}
                >
                  <span>
                    <span className="font-semibold">{u.name}</span>
                    <span className="block text-xs text-ink-muted">{u.email}</span>
                  </span>
                  <span className="badge capitalize">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
