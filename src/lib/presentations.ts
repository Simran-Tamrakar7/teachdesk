import type { Chapter, Presentation, PresentationSlide, SlideThemeId } from "./types";
import { uid } from "./utils";

export const SLIDE_THEMES: Record<
  SlideThemeId,
  { label: string; bg: string; fg: string; accent: string; muted: string; font: string; layout: string }
> = {
  forest: {
    label: "Forest Teal",
    bg: "#0f3d36",
    fg: "#f3faf7",
    accent: "#7dceb8",
    muted: "#b7d7cf",
    font: "Georgia, serif",
    layout: "serif · calm classroom",
  },
  slate: {
    label: "Slate Clean",
    bg: "#1e293b",
    fg: "#f8fafc",
    accent: "#38bdf8",
    muted: "#94a3b8",
    font: "system-ui, sans-serif",
    layout: "modern · high contrast",
  },
  chalkboard: {
    label: "Chalkboard",
    bg: "#1a2e1a",
    fg: "#f4f7e8",
    accent: "#d4e8a8",
    muted: "#a8c090",
    font: "'Comic Sans MS', 'Segoe UI', sans-serif",
    layout: "playful · primary feel",
  },
  ocean: {
    label: "Ocean",
    bg: "#0c4a6e",
    fg: "#ecfeff",
    accent: "#67e8f9",
    muted: "#a5f3fc",
    font: "system-ui, sans-serif",
    layout: "cool · science labs",
  },
  sand: {
    label: "Sand Light",
    bg: "#f7f3ea",
    fg: "#1c1917",
    accent: "#0f766e",
    muted: "#57534e",
    font: "Georgia, serif",
    layout: "light · print-friendly",
  },
};

export type SlideDensity = "detailed" | "minimal";

function shorten(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function bulletize(text: string, density: SlideDensity, maxItems: number) {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const items = (parts.length ? parts : [text]).slice(0, maxItems);
  return items.map((s) => (density === "minimal" ? shorten(s.replace(/\.$/, ""), 42) : shorten(s, 120)));
}

/** Build N slides from a chapter; density controls bullet length. */
export function buildRichSlidesFromChapter(
  chapter: Chapter,
  opts?: { count?: number; density?: SlideDensity }
): PresentationSlide[] {
  const count = Math.min(15, Math.max(3, opts?.count ?? 6));
  const density = opts?.density ?? "detailed";
  const bodyBits = (chapter.body || chapter.summary || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  const pool: Omit<PresentationSlide, "id">[] = [
    {
      title: chapter.title,
      bullets:
        density === "minimal"
          ? (chapter.objectives.slice(0, 3).length ? chapter.objectives.slice(0, 3).map((o) => shorten(o, 36)) : ["Big idea", "Key words", "Try it"])
          : chapter.objectives.slice(0, 4).length
            ? chapter.objectives.slice(0, 4)
            : ["Understand the big idea", "Use key vocabulary", "Apply in an example"],
      notes: `Open with a hook. Objectives for ${chapter.title}.`,
      imageHint: "Cover diagram / chapter opener visual",
    },
    {
      title: density === "minimal" ? "Words" : "Key vocabulary",
      bullets: chapter.keyTerms.slice(0, density === "minimal" ? 4 : 6).map((t) =>
        density === "minimal" ? t : `${t} — student-friendly meaning`
      ),
      notes: "Use gesture + example for each term.",
      imageHint: "Word wall style icons",
    },
    {
      title: density === "minimal" ? "Explain" : "Core explanation",
      bullets: bulletize(
        chapter.summary || `Focus pages ${chapter.pageStart ?? "—"}–${chapter.pageEnd ?? "—"}.`,
        density,
        density === "minimal" ? 3 : 4
      ),
      notes: "Model one example think-aloud.",
      imageHint: "Process diagram placeholder",
    },
    {
      title: "Discussion",
      bullets: chapter.discussionQuestions.slice(0, density === "minimal" ? 3 : 4).length
        ? chapter.discussionQuestions.slice(0, density === "minimal" ? 3 : 4).map((q) =>
            density === "minimal" ? shorten(q, 40) : q
          )
        : density === "minimal"
          ? ["Surprise?", "Real life?"]
          : ["What surprised you?", "Where do we see this in life?"],
      notes: "Think-pair-share, 4 minutes.",
      imageHint: "Discussion prompt card",
    },
    {
      title: density === "minimal" ? "Practice" : "Practice & check",
      bullets:
        density === "minimal"
          ? ["Pairs", "Solo check", "Exit ticket"]
          : ["Guided practice (pairs)", "Independent check question", "Exit ticket: one sentence summary"],
      notes: chapter.pointers?.slice(0, 3).join(" · ") || "Circulate and spot misconceptions.",
      imageHint: "Worksheet / board task",
    },
    {
      title: density === "minimal" ? "Wrap" : "Wrap-up & homework",
      bullets:
        density === "minimal"
          ? ["3 takeaways", "Homework", "Next lesson"]
          : ["Recap 3 takeaways", "Homework linked to objectives", "Preview next lesson"],
      notes: "Collect exit tickets before dismissal.",
      imageHint: "Homework checklist",
    },
  ];

  // Extra content slides from body paragraphs when asking for more slides
  for (let i = 0; i < bodyBits.length && pool.length < 15; i++) {
    pool.push({
      title: density === "minimal" ? `Idea ${i + 1}` : `Deep dive ${i + 1}`,
      bullets: bulletize(bodyBits[i], density, density === "minimal" ? 3 : 4),
      notes: `Stay on this section ~3–4 minutes.`,
      imageHint: `Illustration for: ${shorten(bodyBits[i], 48)}`,
    });
  }

  while (pool.length < count) {
    pool.push({
      title: density === "minimal" ? `Check ${pool.length}` : `Check for understanding ${pool.length}`,
      bullets:
        density === "minimal"
          ? ["Show me", "Explain to partner", "One question"]
          : ["Cold-call a quick check", "Students explain to a partner", "Collect one lingering question"],
      notes: "Keep pace brisk.",
      imageHint: "Quick quiz visual",
    });
  }

  return pool.slice(0, count).map((s) => ({ ...s, id: uid("s") }));
}

/** Prefer live image API (Pollinations); fall back to themed SVG poster. */
export async function generateSlideImageDataUrl(prompt: string, themeId: SlideThemeId): Promise<string> {
  const lines = prompt.trim() || "Classroom visual";
  try {
    const q = encodeURIComponent(`educational classroom illustration, clean textbook style: ${lines}`.slice(0, 200));
    const url = `https://image.pollinations.ai/prompt/${q}?width=960&height=540&nologo=true`;
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 1000 && blob.type.startsWith("image/")) {
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        return `data:${blob.type};base64,${b64}`;
      }
    }
  } catch {
    /* SVG fallback */
  }
  return generateSlideImageSvg(prompt, themeId);
}

export function generateSlideImageSvg(prompt: string, themeId: SlideThemeId): string {
  const t = SLIDE_THEMES[themeId];
  const lines = prompt.trim() || "Classroom visual";
  const safe = lines
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 120);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg}"/>
      <stop offset="100%" stop-color="${t.accent}"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#g)"/>
  <circle cx="780" cy="120" r="90" fill="${t.accent}" opacity="0.35"/>
  <circle cx="120" cy="420" r="140" fill="${t.fg}" opacity="0.08"/>
  <text x="48" y="64" fill="${t.accent}" font-family="system-ui,sans-serif" font-size="22" font-weight="600">AI image</text>
  <foreignObject x="48" y="200" width="864" height="200">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:${t.fg};font:600 36px/1.25 Georgia,serif;word-wrap:break-word">${safe}</div>
  </foreignObject>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildPresentationHtml(deck: Presentation): string {
  const theme = SLIDE_THEMES[deck.theme];
  const slidesJson = JSON.stringify(deck.slides);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${deck.title.replace(/</g, "")}</title>
<style>
:root{--bg:${theme.bg};--fg:${theme.fg};--accent:${theme.accent};--muted:${theme.muted}}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font-family:${theme.font}}
.slide{display:none;height:100%;padding:6vh 8vw;flex-direction:column;justify-content:center;background:radial-gradient(900px 500px at 100% 0%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 55%),var(--bg)}
.slide.active{display:flex}h1{font-size:clamp(2rem,5vw,3.2rem);margin:0 0 1rem}
ul{font-size:clamp(1.1rem,2.2vw,1.7rem);line-height:1.45}.hint{margin-top:1.5rem;opacity:.75;font-size:.95rem}
.bar{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-between;padding:.75rem 1.25rem;background:color-mix(in srgb,var(--bg) 88%,#000);border-top:1px solid color-mix(in srgb,var(--fg) 18%,transparent);color:var(--muted)}
button{background:transparent;border:1px solid var(--accent);color:var(--fg);border-radius:999px;padding:.35rem .9rem;cursor:pointer}
</style></head><body><div id="root"></div><div class="bar"><strong style="color:var(--accent)">${deck.title.replace(/</g, "")}</strong><span id="c"></span><span><button id="p">Prev</button> <button id="n">Next</button></span></div>
<script>
const slides=${slidesJson};let i=0;const root=document.getElementById('root');const c=document.getElementById('c');
function esc(t){return String(t).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
function render(){root.innerHTML=slides.map((s,idx)=>'<section class="slide '+(idx===i?'active':'')+'"><h1>'+esc(s.title)+'</h1><ul>'+(s.bullets||[]).map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>'+(s.imageHint?'<div class="hint">[Image] '+esc(s.imageHint)+'</div>':'')+'</section>').join('');c.textContent=(i+1)+' / '+slides.length}
function go(d){i=(i+d+slides.length)%slides.length;render()}
document.getElementById('p').onclick=()=>go(-1);document.getElementById('n').onclick=()=>go(1);
window.onkeydown=e=>{if(e.key==='ArrowRight'||e.key===' ')go(1);if(e.key==='ArrowLeft')go(-1)};render();
</script></body></html>`;
}
