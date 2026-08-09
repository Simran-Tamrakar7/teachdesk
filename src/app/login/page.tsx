"use client";

import { useAppStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Mode = "login" | "signup" | "forgot";

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  autoComplete: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <div className="relative mt-1.5">
        <input
          className="input w-full pr-11"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:bg-bg-elevated hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

export default function LoginPage() {
  const login = useAppStore((s) => s.login);
  const signup = useAppStore((s) => s.signup);
  const resetPassword = useAppStore((s) => s.resetPassword);
  const ensureSeedUsers = useAppStore((s) => s.ensureSeedUsers);
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [subject, setSubject] = useState("Science");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (hydrated) ensureSeedUsers();
  }, [hydrated, ensureSeedUsers]);

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!hydrated) {
      setError("Still loading — try again in a moment.");
      return;
    }
    const err = login(username, password);
    if (err) {
      setError(err);
      setInfo("");
      return;
    }
    setError("");
    router.replace("/dashboard");
  }

  function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!hydrated) {
      setError("Still loading — try again in a moment.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const err = signup({
      name,
      email,
      username,
      password,
      role,
      subject: role === "teacher" || role === "hod" ? subject : undefined,
    });
    if (err) {
      setError(err);
      return;
    }
    setError("");
    router.replace("/dashboard");
  }

  function onForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!hydrated) {
      setError("Still loading — try again in a moment.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const err = resetPassword(username, password);
    if (err) {
      setError(err);
      setInfo("");
      return;
    }
    setError("");
    setInfo("Password updated. You can log in now.");
    setMode("login");
    setConfirm("");
    setShowPassword(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface shadow-xl md:grid-cols-[1.05fr_0.95fr]">
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
                Sign in with your username and password. School week runs Sunday–Friday.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-sidebar-muted">
              <li>• Import students & add classes/subjects</li>
              <li>• Book → pointers + PowerPoint outline</li>
              <li>• Nepali holidays & field trips on the planner</li>
            </ul>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <div className="mb-6 md:hidden">
            <div className="font-display text-2xl text-brand">TeachDesk</div>
            <p className="text-sm text-ink-muted">Teacher&apos;s digital office</p>
          </div>

          {mode !== "forgot" && (
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                className={`btn flex-1 ${mode === "login" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setMode("login");
                  setError("");
                  setInfo("");
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className={`btn flex-1 ${mode === "signup" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setInfo("");
                  setUsername("");
                  setPassword("");
                  setConfirm("");
                }}
              >
                Sign up
              </button>
            </div>
          )}

          {mode === "login" && (
            <>
              <h2 className="font-display text-3xl tracking-tight">Welcome back</h2>
              <p className="mt-1 text-ink-muted">Username or email + password.</p>
              <form className="mt-6 space-y-4" onSubmit={onLogin}>
                <label className="block text-sm font-semibold">
                  Username or email
                  <input
                    className="input mt-1.5"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </label>
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  setShow={setShowPassword}
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand hover:underline"
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                      setInfo("");
                      setPassword("");
                      setConfirm("");
                      setShowPassword(false);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                {info && <p className="text-sm text-brand">{info}</p>}
                <button className="btn btn-primary w-full py-3" type="submit" disabled={!hydrated}>
                  {hydrated ? "Enter office" : "Loading…"}
                </button>
                <p className="text-center text-xs text-ink-muted">
                  Default account: <span className="font-semibold">rigosha.basnet</span> /{" "}
                  <span className="font-semibold">rigosha</span>
                </p>
              </form>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 className="font-display text-3xl tracking-tight">Reset password</h2>
              <p className="mt-1 text-ink-muted">Enter your username or email and choose a new password.</p>
              <form className="mt-6 space-y-4" onSubmit={onForgot}>
                <label className="block text-sm font-semibold">
                  Username or email
                  <input
                    className="input mt-1.5"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </label>
                <PasswordField
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  setShow={setShowPassword}
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirm new password"
                  value={confirm}
                  onChange={setConfirm}
                  show={showConfirm}
                  setShow={setShowConfirm}
                  autoComplete="new-password"
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <button className="btn btn-primary w-full py-3" type="submit" disabled={!hydrated}>
                  Update password
                </button>
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setConfirm("");
                  }}
                >
                  Back to log in
                </button>
              </form>
            </>
          )}

          {mode === "signup" && (
            <>
              <h2 className="font-display text-3xl tracking-tight">Create account</h2>
              <p className="mt-1 text-ink-muted">Add a new teacher, admin, or parent user.</p>
              <form className="mt-6 space-y-3" onSubmit={onSignup}>
                <label className="block text-sm font-semibold">
                  Full name
                  <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="block text-sm font-semibold">
                  Email
                  <input
                    className="input mt-1"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Username
                  <input
                    className="input mt-1"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </label>
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  setShow={setShowPassword}
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirm password"
                  value={confirm}
                  onChange={setConfirm}
                  show={showConfirm}
                  setShow={setShowConfirm}
                  autoComplete="new-password"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Role
                    <select className="select mt-1" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                      <option value="teacher">Teacher</option>
                      <option value="hod">Head of Department</option>
                      <option value="admin">Admin / Principal</option>
                      <option value="parent">Parent</option>
                      <option value="student">Student</option>
                    </select>
                  </label>
                  {(role === "teacher" || role === "hod") && (
                    <label className="block text-sm font-semibold">
                      Subject
                      <input className="input mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </label>
                  )}
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <button className="btn btn-primary w-full py-3" type="submit" disabled={!hydrated}>
                  Create & enter
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
