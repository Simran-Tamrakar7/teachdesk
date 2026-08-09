"use client";

import { PageHeader } from "@/components/PageHeader";
import { visibleClasses, visibleStudents } from "@/lib/rbac";
import { useAppStore } from "@/lib/store";
import { parseCsv } from "@/lib/utils";
import { Pencil, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type PreviewRow = { name: string; rollNumber: string; parentEmail?: string; duplicate: boolean };

export default function StudentsPage() {
  const user = useAppStore((s) => s.user);
  const allStudents = useAppStore((s) => s.students);
  const allClasses = useAppStore((s) => s.classes);
  const subjects = useAppStore((s) => s.subjects);
  const addClass = useAppStore((s) => s.addClass);
  const softDeleteClass = useAppStore((s) => s.softDeleteClass);
  const addSubject = useAppStore((s) => s.addSubject);
  const addStudent = useAppStore((s) => s.addStudent);
  const updateStudent = useAppStore((s) => s.updateStudent);
  const softDeleteStudent = useAppStore((s) => s.softDeleteStudent);
  const importStudentsCsv = useAppStore((s) => s.importStudentsCsv);
  const promoteClassToNextGrade = useAppStore((s) => s.promoteClassToNextGrade);
  const bulkAssignSubject = useAppStore((s) => s.bulkAssignSubject);
  const bulkSoftDeleteStudents = useAppStore((s) => s.bulkSoftDeleteStudents);

  const classes = useMemo(() => visibleClasses(user, allClasses), [user, allClasses]);
  const students = useMemo(() => visibleStudents(user, allStudents, allClasses), [user, allStudents, allClasses]);

  const [tab, setTab] = useState<"roster" | "import" | "setup">("roster");
  const [classId, setClassId] = useState(classes[0]?.id ?? "c1");
  const [selected, setSelected] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoll, setEditRoll] = useState("");
  const [editParent, setEditParent] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewFile, setPreviewFile] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoll, setNewRoll] = useState("");
  const [newParent, setNewParent] = useState("");
  const [grade, setGrade] = useState("8");
  const [section, setSection] = useState("C");
  const [classSubject, setClassSubject] = useState(subjects[0]?.name ?? "Science");
  const [subjectName, setSubjectName] = useState("");
  const [bulkSubject, setBulkSubject] = useState(subjects[0]?.name ?? "Science");
  const [loading, setLoading] = useState(false);

  const roster = useMemo(
    () => students.filter((s) => s.classId === classId).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
    [students, classId]
  );
  const readOnly = user?.role === "parent" || user?.role === "student";

  async function loadCsv(file: File | null) {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text).map((r) => {
        const rollNumber = r.rollnumber || r.roll || r.roll_no || r["roll number"] || "";
        const name = r.name || r.student || r.fullname || "";
        const parentEmail = r.parentemail || r.parent || r.email || "";
        const duplicate = !!rollNumber && allStudents.some((s) => !s.deletedAt && s.rollNumber === rollNumber);
        return { name, rollNumber, parentEmail, duplicate };
      });
      setPreview(rows.filter((r) => r.name || r.rollNumber));
      setPreviewFile(file.name);
      setMsg("");
    } catch {
      setMsg("Failed to read CSV — retry.");
    } finally {
      setLoading(false);
    }
  }

  function commitImport() {
    const rows = preview.filter((r) => r.name && r.rollNumber && !r.duplicate);
    const result = importStudentsCsv(classId, rows);
    setMsg(`Imported ${result.imported}. Duplicates skipped: ${result.duplicates + preview.filter((r) => r.duplicate).length}. Empty rows: ${result.skipped}.`);
    setPreview([]);
    setPreviewFile("");
    setTab("roster");
  }

  function openEdit(id: string) {
    const s = students.find((x) => x.id === id);
    if (!s) return;
    setEditId(id);
    setEditName(s.name);
    setEditRoll(s.rollNumber);
    setEditParent(s.parentEmail ?? "");
  }

  return (
    <div>
      <PageHeader
        title="Students & Classes"
        subtitle="Manage classes and students only. Attendance lives in its own module."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["roster", "Roster"],
            ["import", "Import / add"],
            ["setup", "Classes & subjects"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`btn ${tab === id ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {classes.map((c) => (
          <button
            key={c.id}
            className={`btn ${classId === c.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setClassId(c.id);
              setSelected([]);
            }}
          >
            {c.name}
          </button>
        ))}
        {!classes.length && <p className="text-sm text-ink-muted">No classes yet — create one in Classes & subjects.</p>}
      </div>

      {msg && <p className="mb-3 text-sm text-brand">{msg}</p>}

      {tab === "roster" && (
        <section className="surface p-4">
          {!readOnly && (
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                className="btn btn-secondary"
                disabled={!selected.length}
                onClick={() => {
                  bulkSoftDeleteStudents(selected);
                  setSelected([]);
                  setMsg("Moved selected students to trash (recover in Settings).");
                }}
              >
                Soft-delete selected ({selected.length})
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  promoteClassToNextGrade(classId);
                  setMsg("Class promoted to next grade.");
                }}
              >
                Promote class → next grade
              </button>
              <select className="select w-auto" value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  bulkAssignSubject(classId, bulkSubject);
                  setMsg(`Assigned subject “${bulkSubject}” to this class.`);
                }}
              >
                Bulk-assign subject
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-ink-muted">
                <tr>
                  {!readOnly && <th className="pb-2"></th>}
                  <th className="pb-2">Roll</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Parent</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    {!readOnly && (
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selected.includes(s.id)}
                          onChange={(e) =>
                            setSelected((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id)))
                          }
                        />
                      </td>
                    )}
                    <td className="py-2 font-mono text-xs">{s.rollNumber}</td>
                    <td className="py-2">
                      <Link className="font-semibold hover:text-brand" href={`/students/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2 text-ink-muted">{s.parentEmail ?? "—"}</td>
                    <td className="py-2 text-right">
                      {!readOnly && (
                        <span className="inline-flex gap-1">
                          <button className="btn btn-ghost" onClick={() => openEdit(s.id)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-ghost text-danger"
                            onClick={() => {
                              softDeleteStudent(s.id);
                              setMsg("Student moved to trash.");
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!roster.length && (
            <p className="py-8 text-center text-ink-muted">No students in this class yet. Import a CSV or add one.</p>
          )}
        </section>
      )}

      {tab === "import" && !readOnly && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="surface p-4">
            <h3 className="font-semibold">CSV import (preview first)</h3>
            <p className="mt-1 text-sm text-ink-muted">Headers: name, rollNumber, optional parentEmail. Duplicates are flagged and not imported.</p>
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-bg-elevated px-4 py-8 hover:border-brand">
              <Upload className="text-brand" />
              <span className="font-semibold">{loading ? "Uploading…" : previewFile || "Choose .csv file"}</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => loadCsv(e.target.files?.[0] ?? null)} />
            </label>
            {preview.length > 0 && (
              <>
                <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg-elevated text-ink-muted">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Roll</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={`${r.rollNumber}-${i}`} className="border-t border-line">
                          <td className="p-2">{r.name || "—"}</td>
                          <td className="p-2 font-mono">{r.rollNumber || "—"}</td>
                          <td className="p-2">
                            {r.duplicate ? (
                              <span className="badge badge-warn">Duplicate</span>
                            ) : !r.name || !r.rollNumber ? (
                              <span className="badge badge-danger">Invalid</span>
                            ) : (
                              <span className="badge">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn btn-primary mt-3 w-full" onClick={commitImport}>
                  Commit import to {classes.find((c) => c.id === classId)?.name}
                </button>
              </>
            )}
          </section>
          <section className="surface p-4">
            <h3 className="font-semibold">Add one student</h3>
            <label className="mt-3 block text-sm font-semibold">
              Name
              <input className="input mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Roll number
              <input className="input mt-1" value={newRoll} onChange={(e) => setNewRoll(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Parent email
              <input className="input mt-1" value={newParent} onChange={(e) => setNewParent(e.target.value)} />
            </label>
            <button
              className="btn btn-primary mt-4 w-full"
              onClick={() => {
                const cls = classes.find((c) => c.id === classId);
                if (!cls || !newName.trim() || !newRoll.trim()) {
                  setMsg("Name and roll are required.");
                  return;
                }
                if (allStudents.some((s) => !s.deletedAt && s.rollNumber === newRoll.trim())) {
                  setMsg("Duplicate roll number — not added.");
                  return;
                }
                addStudent({
                  name: newName.trim(),
                  rollNumber: newRoll.trim(),
                  classId,
                  section: cls.section,
                  parentEmail: newParent.trim() || undefined,
                });
                setNewName("");
                setNewRoll("");
                setNewParent("");
                setMsg("Student added.");
                setTab("roster");
              }}
            >
              Add student
            </button>
          </section>
        </div>
      )}

      {tab === "setup" && !readOnly && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="surface p-4">
            <h3 className="font-semibold">Create class</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold">
                Grade
                <input className="input mt-1" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </label>
              <label className="text-sm font-semibold">
                Section
                <input className="input mt-1" value={section} onChange={(e) => setSection(e.target.value)} />
              </label>
              <label className="text-sm font-semibold">
                Subject
                <select className="select mt-1" value={classSubject} onChange={(e) => setClassSubject(e.target.value)}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="btn btn-primary mt-4"
              onClick={() => {
                const cls = addClass({ grade, section, subject: classSubject });
                setClassId(cls.id);
                setMsg(`Created ${cls.name}.`);
              }}
            >
              Create class
            </button>
            <ul className="mt-4 space-y-1 text-sm">
              {classes.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-t border-line py-2">
                  <span>{c.name}</span>
                  <button className="btn btn-ghost text-danger" onClick={() => softDeleteClass(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface p-4">
            <h3 className="font-semibold">Add subject</h3>
            <input className="input mt-3" placeholder="Subject name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
            <button
              className="btn btn-secondary mt-3"
              onClick={() => {
                if (!subjectName.trim()) return;
                addSubject(subjectName);
                setClassSubject(subjectName.trim());
                setBulkSubject(subjectName.trim());
                setSubjectName("");
              }}
            >
              Add subject
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span key={s.id} className="badge">
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form
            className="surface w-full max-w-md p-5"
            onSubmit={(e) => {
              e.preventDefault();
              updateStudent(editId, {
                name: editName.trim(),
                rollNumber: editRoll.trim(),
                parentEmail: editParent.trim() || undefined,
              });
              setEditId(null);
              setMsg("Student updated.");
            }}
          >
            <h3 className="font-display text-2xl">Edit student</h3>
            <input className="input mt-3" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            <input className="input mt-3" value={editRoll} onChange={(e) => setEditRoll(e.target.value)} required />
            <input className="input mt-3" value={editParent} onChange={(e) => setEditParent(e.target.value)} placeholder="Parent email" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>
                Cancel
              </button>
              <button className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
