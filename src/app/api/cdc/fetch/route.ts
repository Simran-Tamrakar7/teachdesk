import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Proxy CDC / government PDF fetch (CORS + size cap for TeachDesk demo). */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Missing or invalid url." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Bad URL." }, { status: 400 });
  }

  const host = parsed.hostname.toLowerCase();
  // Official / listed sources only (CDC, CEHRD, OLE/e-Pustakalaya, DLC)
  const allowed =
    host.endsWith("moecdc.gov.np") ||
    host.endsWith("gov.np") ||
    host.endsWith("cehrd.gov.np") ||
    host.endsWith("olenepal.org") ||
    host.endsWith("dwit.edu.np") ||
    host.includes("giwmscdnone") ||
    host.includes("cdc") ||
    host.includes("epustakalaya") ||
    host.includes("sikai");
  if (!allowed) {
    return NextResponse.json({ error: "URL host not allowed for content import." }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/pdf,*/*", "User-Agent": "TeachDeskCDCImport/1.0" },
      redirect: "follow",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed (${res.status}). Check the CDC page — textbook URLs change by year.`, status: res.status },
        { status: 502 }
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const max = 4_000_000;
    if (buf.length > max) {
      return NextResponse.json(
        {
          error: `PDF is ${Math.round(buf.length / 1e6)}MB — too large to store in-browser. Open the CDC link and upload a chapter extract or TXT instead.`,
          tooLarge: true,
          bytes: buf.length,
        },
        { status: 413 }
      );
    }
    const contentType = res.headers.get("content-type") || "application/pdf";
    const b64 = buf.toString("base64");
    return NextResponse.json({
      ok: true,
      mime: contentType,
      size: buf.length,
      dataUrl: `data:${contentType};base64,${b64}`,
      // crude text peek for chapter split
      textHint: buf.toString("utf8", 0, Math.min(buf.length, 80_000)).replace(/[^\x09\x0A\x0D\x20-\x7E\u0900-\u097F]/g, " "),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Network error",
        hint: "Open https://moecdc.gov.np and download the textbook manually, then upload in Library.",
      },
      { status: 502 }
    );
  }
}
