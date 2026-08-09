/** Client helper for /api/ai — falls back to null so callers can use stubs. */

export type AiKind =
  | "summarize"
  | "explain"
  | "pointers"
  | "glossary"
  | "quiz"
  | "lesson"
  | "rubric"
  | "auto-grade"
  | "parent"
  | "briefing"
  | "assistant"
  | "image-prompt";

export class AiRequestError extends Error {
  constructor(
    message: string,
    public retryable = true
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

export async function callAi(kind: AiKind, prompt: string, system?: string): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, prompt, system }),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string; configured?: boolean };
  if (res.status === 503 && data.configured === false) {
    throw new AiRequestError("AI not configured — add ANTHROPIC_API_KEY on the server.", false);
  }
  if (!res.ok || !data.text) {
    throw new AiRequestError(data.error || `AI request failed (${res.status})`, true);
  }
  return data.text;
}

export function isAiConfiguredClient(): boolean {
  // Client cannot read server env; UI shows based on failed call / settings note.
  return true;
}
