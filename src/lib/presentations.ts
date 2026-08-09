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

export function buildRichSlidesFromChapter(chapter: Chapter): PresentationSlide[] {
  return [
    {
      id: uid("s"),
      title: chapter.title,
      bullets: chapter.objectives.slice(0, 4).length
        ? chapter.objectives.slice(0, 4)
        : ["Understand the big idea", "Use key vocabulary", "Apply in an example"],
      notes: `Open with a hook. Objectives for ${chapter.title}.`,
      imageHint: "Cover diagram / chapter opener visual",
    },
    {
      id: uid("s"),
      title: "Key vocabulary",
      bullets: chapter.keyTerms.slice(0, 6).map((t) => `${t} — student-friendly meaning`),
      notes: "Use gesture + example for each term.",
      imageHint: "Word wall style icons",
    },
    {
      id: uid("s"),
      title: "Core explanation",
      bullets: [
        chapter.summary.slice(0, 140) + (chapter.summary.length > 140 ? "…" : ""),
        `Focus pages: ${chapter.pageStart ?? "—"}–${chapter.pageEnd ?? "—"}`,
        "Watch for a common misconception",
      ],
      notes: "Model one example think-aloud.",
      imageHint: "Process diagram placeholder",
    },
    {
      id: uid("s"),
      title: "Discussion",
      bullets: chapter.discussionQuestions.slice(0, 4).length
        ? chapter.discussionQuestions.slice(0, 4)
        : ["What surprised you?", "Where do we see this in life?"],
      notes: "Think-pair-share, 4 minutes.",
      imageHint: "Discussion prompt card",
    },
    {
      id: uid("s"),
      title: "Practice & check",
      bullets: [
        "Guided practice (pairs)",
        "Independent check question",
        "Exit ticket: one sentence summary",
      ],
      notes: chapter.pointers?.slice(0, 3).join(" · ") || "Circulate and spot misconceptions.",
      imageHint: "Worksheet / board task",
    },
    {
      id: uid("s"),
      title: "Wrap-up & homework",
      bullets: [
        "Recap 3 takeaways",
        "Homework linked to objectives",
        "Preview next lesson",
      ],
      notes: "Collect exit tickets before dismissal.",
      imageHint: "Homework checklist",
    },
  ];
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
document.getElementById('p').onclick=()=>{i=Math.max(0,i-1);render()};document.getElementById('n').onclick=()=>{i=Math.min(slides.length-1,i+1);render()};
window.onkeydown=e=>{if(e.key==='ArrowRight'||e.key===' ') {e.preventDefault();i=Math.min(slides.length-1,i+1);render()} if(e.key==='ArrowLeft'){e.preventDefault();i=Math.max(0,i-1);render()}};render();
</script></body></html>`;
}
