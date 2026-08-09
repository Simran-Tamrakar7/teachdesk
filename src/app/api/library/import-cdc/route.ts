import { NextRequest, NextResponse } from "next/server";
import { findManifestEntry, type CdcMedium } from "@/lib/cdc-manifest";
import { extractPdfTextServer } from "@/lib/pdf-text";
import { splitTextbookIntoChapters } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_HOSTS = ["moecdc.gov.np", "giwmscdnone.gov.np", "gov.np"];

type Body = {
  grade?: number;
  subject?: string;
  medium?: CdcMedium;
};

function hostAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, reason: "Invalid JSON body." }, { status: 400 });
  }

  const grade = Number(body.grade);
  const subject = (body.subject || "").trim();
  const medium = (body.medium === "ne" ? "ne" : "en") as CdcMedium;

  if (!grade || !subject) {
    return NextResponse.json(
      { success: false, reason: "Missing grade or subject." },
      { status: 400 }
    );
  }

  const entry = findManifestEntry(grade, subject, medium);
  if (!entry) {
    return NextResponse.json(
      {
        success: false,
        reason: `No verified CDC manifest entry for Class ${grade} — ${subject} (${medium}). Only listed combinations can be imported.`,
        portal: "https://moecdc.gov.np/category/textbook/",
      },
      { status: 404 }
    );
  }

  if (!hostAllowed(entry.url)) {
    return NextResponse.json(
      { success: false, reason: "Manifest URL host is not allowed." },
      { status: 403 }
    );
  }

  let res: Response;
  try {
    res = await fetch(entry.url, {
      redirect: "follow",
      headers: {
        Accept: "application/pdf,*/*",
        "User-Agent": "TeachDeskCDCImport/2.0",
        Referer: entry.sourcePageUrl || "https://moecdc.gov.np/",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        reason: `Network error fetching PDF: ${e instanceof Error ? e.message : "unknown"}`,
        sourceUrl: entry.url,
        portal: entry.sourcePageUrl,
      },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        success: false,
        reason: `CDC PDF fetch failed (HTTP ${res.status}). The manifest URL may be stale — open the CDC page and download manually, then Upload textbook.`,
        sourceUrl: entry.url,
        portal: entry.sourcePageUrl || "https://moecdc.gov.np/category/textbook/",
        verifiedDate: entry.verifiedDate,
      },
      { status: 502 }
    );
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());

  if (buf.length < 100) {
    return NextResponse.json(
      {
        success: false,
        reason: "Downloaded file is empty or too small to be a PDF.",
        sourceUrl: entry.url,
        portal: entry.sourcePageUrl,
      },
      { status: 502 }
    );
  }

  const isPdfMagic = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  if (!isPdfMagic && !contentType.includes("pdf")) {
    return NextResponse.json(
      {
        success: false,
        reason: `URL did not return a PDF (content-type: ${contentType || "unknown"}). CDC may have rotated the file.`,
        sourceUrl: entry.url,
        portal: entry.sourcePageUrl || "https://moecdc.gov.np/category/textbook/",
      },
      { status: 502 }
    );
  }

  // Cap storage of dataUrl for client localStorage — large textbooks stay link-only
  const maxStoreBytes = 3_500_000;
  let dataUrl: string | undefined;
  if (buf.length <= maxStoreBytes) {
    dataUrl = `data:application/pdf;base64,${buf.toString("base64")}`;
  }

  const { text, engine } = await extractPdfTextServer(buf, { maxPages: 120, maxChars: 220_000 });

  const subjectId = /science|technology|विज्ञान/i.test(entry.subject)
    ? "science"
    : /math|गणित/i.test(entry.subject)
      ? "math"
      : /social|सामाजिक/i.test(entry.subject)
        ? "social"
        : "general";

  // Reuse the same chapter-detection pipeline as manual uploads
  const chapters = await splitTextbookIntoChapters(
    `${entry.title}.pdf`,
    text,
    {
      classId: "pending",
      subjectId,
      lang: entry.medium,
      sourceBook: entry.title,
    }
  );

  const chaptersDetected = chapters.length > 0;

  return NextResponse.json({
    success: true,
    entry: {
      id: entry.id,
      grade: entry.grade,
      subject: entry.subject,
      medium: entry.medium,
      title: entry.title,
      url: entry.url,
      sourcePageUrl: entry.sourcePageUrl,
      verifiedDate: entry.verifiedDate,
    },
    bytes: buf.length,
    dataUrl,
    mime: "application/pdf",
    extractedText: text.slice(0, 200_000),
    extractEngine: engine,
    chaptersDetected,
    chapters: chapters.map((c, i) => ({
      title: c.title,
      unitNumber: c.unitNumber ?? i + 1,
      summary: c.summary,
      body: c.body,
      keyTerms: c.keyTerms,
      objectives: c.objectives,
      discussionQuestions: c.discussionQuestions,
      wordCount: c.wordCount,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
      subjectId: c.subjectId,
      lang: c.lang,
    })),
    hint:
      !chaptersDetected || text.trim().length < 80
        ? "PDF fetched, but chapter text was sparse. Unit cards may be TOC-based — paste unit text or re-extract after upload."
        : undefined,
  });
}
