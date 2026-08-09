"use client";

import { PageHeader } from "@/components/PageHeader";
import { askDocument } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { formatDate, uid } from "@/lib/utils";
import { BookOpen, Link2, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";

export default function ResearchPage() {
  const research = useAppStore((s) => s.research);
  const addResearch = useAppStore((s) => s.addResearch);
  const updateResearchSummary = useAppStore((s) => s.updateResearchSummary);

  const [selectedId, setSelectedId] = useState(research[0]?.id ?? "");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");

  const selected = research.find((r) => r.id === selectedId) ?? research[0];

  async function summarize() {
    if (!selected) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    const summary = `AI summary of “${selected.title}”: ${selected.contentPreview.slice(0, 160)}… Practical takeaway: use one concrete classroom routine from this paper this week.`;
    updateResearchSummary(selected.id, summary);
    setBusy(false);
  }

  async function ask() {
    if (!selected || !question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setChat((c) => [...c, { id: uid("u"), role: "user", content: q }]);
    setBusy(true);
    const reply = await askDocument(q, selected.title, selected.contentPreview);
    setChat((c) => [...c, reply]);
    setBusy(false);
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const id = uid("r");
    addResearch({
      id,
      title: title.trim(),
      source: source.trim() || "Personal upload",
      subject: "Science",
      url: url || undefined,
      uploadedAt: new Date().toISOString(),
      contentPreview: preview.trim() || "Reference notes…",
    });
    setSelectedId(id);
    setShowAdd(false);
    setTitle("");
    setSource("");
    setUrl("");
    setPreview("");
  }

  return (
    <div>
      <PageHeader
        title="Research & Reference Hub"
        subtitle="Save papers and articles, AI-summarize them, and ask questions with page citations."
        actions={
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Link2 size={16} /> Add reference
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr_340px]">
        <aside className="surface p-3">
          <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold">
            <BookOpen size={16} /> Library
          </div>
          <ul className="space-y-1">
            {research.map((r) => (
              <li key={r.id}>
                <button
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm ${selected?.id === r.id ? "bg-brand-soft" : "hover:bg-bg-elevated"}`}
                  onClick={() => {
                    setSelectedId(r.id);
                    setChat([]);
                  }}
                >
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-ink-muted">{r.source}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="surface p-5">
          {selected ? (
            <>
              <h2 className="font-display text-2xl">{selected.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {selected.source} · Added {formatDate(selected.uploadedAt)}
                {selected.url ? (
                  <>
                    {" "}
                    ·{" "}
                    <a className="text-brand" href={selected.url} target="_blank" rel="noreferrer">
                      Open link
                    </a>
                  </>
                ) : null}
              </p>
              <div className="mt-4 rounded-xl bg-bg-elevated p-4 text-sm leading-relaxed">{selected.contentPreview}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-secondary" disabled={busy} onClick={summarize}>
                  <Sparkles size={16} /> {busy ? "Summarizing…" : "AI summarize"}
                </button>
              </div>
              {selected.summary && (
                <div className="mt-4 whitespace-pre-wrap rounded-xl border border-brand/20 bg-brand-soft/40 p-4 text-sm">
                  {selected.summary}
                </div>
              )}
            </>
          ) : (
            <p className="text-ink-muted">No research items yet.</p>
          )}
        </section>

        <aside className="surface flex max-h-[70vh] flex-col p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <MessageCircle size={16} /> Ask this document
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {chat.length === 0 && (
              <p className="text-sm text-ink-muted">Ask about methods, findings, or classroom applications.</p>
            )}
            {chat.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "ml-4 bg-brand text-white" : "mr-2 bg-bg-elevated"
                }`}
              >
                {m.content}
                {m.citations && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.citations.map((c) => (
                      <span key={c} className="badge">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form
            className="mt-3 border-t border-line pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <textarea
              className="textarea"
              rows={3}
              placeholder="e.g. What classroom routine does this paper recommend?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="btn btn-primary mt-2 w-full" disabled={busy}>
              Ask
            </button>
          </form>
        </aside>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form className="surface w-full max-w-lg p-5" onSubmit={addItem}>
            <h3 className="font-display text-2xl">Add reference</h3>
            <label className="mt-3 block text-sm font-semibold">
              Title
              <input className="input mt-1" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Source
              <input className="input mt-1" value={source} onChange={(e) => setSource(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              URL (optional)
              <input className="input mt-1" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Notes / excerpt
              <textarea className="textarea mt-1" value={preview} onChange={(e) => setPreview(e.target.value)} />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
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
