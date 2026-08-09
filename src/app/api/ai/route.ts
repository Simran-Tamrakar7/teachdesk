import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  kind?: string;
  prompt?: string;
  system?: string;
};

const SYSTEM_DEFAULT =
  "You are a helpful teaching assistant for Nepali school teachers (grades 1–10). Be clear, practical, and classroom-ready. Prefer plain language. When listing points, use short bullets.";

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server.", configured: false },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "Missing prompt." }, { status: 400 });

  const system = (body.system || SYSTEM_DEFAULT).slice(0, 4000);
  const userContent = prompt.slice(0, 120_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || `Anthropic error ${res.status}`, configured: true },
        { status: 502 }
      );
    }

    const text = (data.content || [])
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n")
      .trim();

    if (!text) return NextResponse.json({ error: "Empty model response." }, { status: 502 });
    return NextResponse.json({ text, kind: body.kind || "other" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Network error calling Anthropic." },
      { status: 502 }
    );
  }
}
