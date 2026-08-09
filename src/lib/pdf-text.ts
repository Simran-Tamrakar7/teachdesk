/**
 * Shared PDF → text extraction.
 * Server: pdf-parse (real text). Client/fallback: binary peek used by manual uploads.
 */

/** Same crude binary peek historically used for client uploads when PDF text engines aren't available. */
export function extractTextbookTextFromBuffer(buf: Uint8Array | Buffer, maxChars = 120_000): string {
  const slice = buf.slice(0, Math.min(buf.length, 2_000_000));
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  const cleaned = raw
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F\u0980-\u09FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length > 400 && /chapter|अध्याय|unit|एकाइ|scientific|grade/i.test(cleaned)) {
    return cleaned.slice(0, maxChars);
  }
  return cleaned.length > 800 ? cleaned.slice(0, maxChars) : "";
}

/** Server-side: prefer pdf-parse, fall back to crude peek. */
export async function extractPdfTextServer(
  buf: Buffer,
  opts?: { maxPages?: number; maxChars?: number }
): Promise<{ text: string; engine: "pdf-parse" | "binary-peek"; pageHint?: number }> {
  const maxChars = opts?.maxChars ?? 200_000;
  const maxPages = opts?.maxPages ?? 100;

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const result = await parser.getText({ first: maxPages });
    const text = (result.text || "").replace(/\u0000/g, "").trim();
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
    if (text.length > 80) {
      return { text: text.slice(0, maxChars), engine: "pdf-parse", pageHint: maxPages };
    }
  } catch {
    /* fall through */
  }

  const peek = extractTextbookTextFromBuffer(buf, maxChars);
  return { text: peek, engine: "binary-peek" };
}
