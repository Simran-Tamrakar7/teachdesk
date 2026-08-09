import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fileToExamFile(file: File): Promise<{
  fileName: string;
  mime: string;
  sizeLabel: string;
  dataUrl?: string;
}> {
  const sizeLabel = formatBytes(file.size);
  if (file.size > 1_500_000) {
    return { fileName: file.name, mime: file.type || "application/octet-stream", sizeLabel };
  }
  const dataUrl = await fileToDataUrl(file);
  return { fileName: file.name, mime: file.type || "application/octet-stream", sizeLabel, dataUrl };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

import { extractTextbookTextFromBuffer } from "./pdf-text";

/** Best-effort text pull from uploaded books (txt works; PDF uses shared binary peek on client). */
export async function extractTextbookText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || file.type.startsWith("text/")) {
    return (await file.text()).slice(0, 200_000);
  }
  try {
    const buf = new Uint8Array(await file.slice(0, Math.min(file.size, 2_000_000)).arrayBuffer());
    return extractTextbookTextFromBuffer(buf);
  } catch {
    return "";
  }
}

export function openDataUrl(dataUrl: string, fileName?: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.target = "_blank";
  a.rel = "noreferrer";
  if (fileName) a.download = fileName;
  a.click();
}

/** Parse CSV with header row. Supports simple quoted fields. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function extToMaterialType(name: string): "pdf" | "docx" | "pptx" | "image" | "video" | "audio" | "other" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "docx";
  if (ext === "ppt" || ext === "pptx") return "pptx";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
  return "other";
}
