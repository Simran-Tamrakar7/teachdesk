"use client";

import { assistantReply } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

const SUGGESTIONS = [
  "What else can you help with?",
  "Generate a quiz on photosynthesis",
  "Make a PowerPoint outline for stomata",
  "Draft a parent email about homework",
  "How do I teach stomata?",
];

export function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const messages = useAppStore((s) => s.assistantMessages);
  const pushAssistant = useAppStore((s) => s.pushAssistant);
  const clearAssistant = useAppStore((s) => s.clearAssistant);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setInput("");
    pushAssistant({ id: uid("u"), role: "user", content: prompt });
    setBusy(true);
    const reply = await assistantReply(prompt);
    pushAssistant({ id: uid("a"), role: "assistant", content: reply });
    setBusy(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 p-3 md:p-4">
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-brand" size={18} />
            <div>
              <div className="font-semibold">AI Teaching Assistant</div>
              <div className="text-xs text-ink-muted">Quizzes • rewrites • rubrics • emails</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost text-sm" onClick={clearAssistant}>
              Clear
            </button>
            <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
          {SUGGESTIONS.slice(0, 3).map((s) => (
            <button key={s} className="badge hover:bg-brand hover:text-white" onClick={() => send(s)}>
              {s.slice(0, 36)}…
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-2xl rounded-br-md bg-brand px-3 py-2 text-sm text-white"
                  : "mr-6 whitespace-pre-wrap rounded-2xl rounded-bl-md bg-brand-soft/60 px-3 py-2 text-sm text-ink"
              }
            >
              {m.content}
            </div>
          ))}
          {busy && <div className="loading-dot text-sm text-ink-muted">Thinking…</div>}
        </div>

        <form
          className="border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            className="textarea mb-2"
            placeholder="Ask anything teaching-related…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
          />
          <button className="btn btn-primary w-full" disabled={busy}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
