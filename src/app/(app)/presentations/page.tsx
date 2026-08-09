"use client";

import { PageHeader } from "@/components/PageHeader";
import { buildPresentationHtml, buildRichSlidesFromChapter, SLIDE_THEMES } from "@/lib/presentations";
import { exportPresentationPdf, exportPresentationPptx } from "@/lib/exports";
import { useAppStore } from "@/lib/store";
import type { Presentation, PresentationSlide, SlideThemeId } from "@/lib/types";
import { downloadText, uid } from "@/lib/utils";
import { Download, Plus, Presentation as PresentationIcon, Trash2 } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Step = "theme" | "generate" | "edit" | "export";

function PresentationsInner() {
  const search = useSearchParams();
  const chapters = useAppStore((s) => s.chapters);
  const classes = useAppStore((s) => s.classes);
  const presentations = useAppStore((s) => s.presentations);
  const upsertPresentation = useAppStore((s) => s.upsertPresentation);
  const removePresentation = useAppStore((s) => s.removePresentation);
  const defaultSlideTheme = useAppStore((s) => s.defaultSlideTheme);
  const setDefaultSlideTheme = useAppStore((s) => s.setDefaultSlideTheme);
  const setPresentationDirty = useAppStore((s) => s.setPresentationDirty);
  const pushAiLog = useAppStore((s) => s.pushAiLog);

  const qChapter = search.get("chapter") || "";
  const qStep = (search.get("step") as Step | null) || null;

  const [deckId, setDeckId] = useState<string | null>(presentations[0]?.id ?? null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [chapterId, setChapterId] = useState(qChapter || chapters[0]?.id || "");
  const [theme, setTheme] = useState<SlideThemeId>(defaultSlideTheme);
  const [step, setStep] = useState<Step>(qStep || "edit");

  useEffect(() => {
    if (qChapter) {
      setChapterId(qChapter);
      setStep(qStep || "theme");
    }
  }, [qChapter, qStep]);

  const deck = presentations.find((p) => p.id === deckId) ?? null;
  const themeStyle = SLIDE_THEMES[deck?.theme ?? theme];

  const currentSlide: PresentationSlide | null = useMemo(() => {
    if (!deck?.slides.length) return null;
    return deck.slides[Math.min(slideIndex, deck.slides.length - 1)] ?? null;
  }, [deck, slideIndex]);

  function saveDeck(next: Presentation, markDirty = true) {
    upsertPresentation({ ...next, updatedAt: new Date().toISOString() });
    setDeckId(next.id);
    if (markDirty) setPresentationDirty(true);
  }

  async function createFromChapter() {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    setBusy(true);
    setStep("generate");
    const id = uid("ppt");
    const slides = buildRichSlidesFromChapter(chapter);
    const deckNew: Presentation = {
      id,
      title: `${chapter.title} — slides`,
      chapterId: chapter.id,
      classId: chapter.classId,
      theme,
      slides,
      updatedAt: new Date().toISOString(),
    };
    saveDeck(deckNew, false);
    setDefaultSlideTheme(theme);
    setSlideIndex(0);
    setStep("edit");
    pushAiLog({ kind: "presentation", title: deckNew.title, preview: `Generated ${slides.length} slides from ${chapter.title}` });
    setBusy(false);
  }

  function createBlank() {
    const id = uid("ppt");
    saveDeck(
      {
        id,
        title: "New presentation",
        theme,
        slides: [
          { id: uid("s"), title: "Welcome", bullets: ["Learning objectives", "Today’s focus", "Success criteria"] },
          { id: uid("s"), title: "Key ideas", bullets: ["Point 1", "Point 2", "Point 3"] },
          { id: uid("s"), title: "Practice", bullets: ["Try this together", "Independent work", "Share out"] },
        ],
        updatedAt: new Date().toISOString(),
      },
      false
    );
    setDefaultSlideTheme(theme);
    setSlideIndex(0);
    setStep("edit");
  }

  function patchSlide(patch: Partial<PresentationSlide>) {
    if (!deck || !currentSlide) return;
    const slides = deck.slides.map((s) => (s.id === currentSlide.id ? { ...s, ...patch } : s));
    saveDeck({ ...deck, slides });
  }

  function addSlide() {
    if (!deck) return;
    const slide: PresentationSlide = { id: uid("s"), title: "New slide", bullets: ["Bullet point"] };
    saveDeck({ ...deck, slides: [...deck.slides, slide] });
    setSlideIndex(deck.slides.length);
  }

  function removeSlide() {
    if (!deck || deck.slides.length <= 1 || !currentSlide) return;
    const slides = deck.slides.filter((s) => s.id !== currentSlide.id);
    saveDeck({ ...deck, slides });
    setSlideIndex(Math.max(0, slideIndex - 1));
  }

  function moveSlide(direction: -1 | 1) {
    if (!deck || !currentSlide) return;
    const nextIndex = slideIndex + direction;
    if (nextIndex < 0 || nextIndex >= deck.slides.length) return;
    const slides = [...deck.slides];
    [slides[slideIndex], slides[nextIndex]] = [slides[nextIndex], slides[slideIndex]];
    saveDeck({ ...deck, slides });
    setSlideIndex(nextIndex);
  }

  function downloadHtml() {
    if (!deck) return;
    downloadText(`${deck.title.replace(/\s+/g, "-").toLowerCase()}.html`, buildPresentationHtml(deck), "text/html");
    setPresentationDirty(false);
  }

  async function downloadPptx() {
    if (!deck) return;
    await exportPresentationPptx(deck);
    setPresentationDirty(false);
  }

  function downloadPdf() {
    if (!deck) return;
    exportPresentationPdf(deck);
    setPresentationDirty(false);
  }

  const steps: Step[] = ["theme", "generate", "edit", "export"];

  return (
    <div>
      <PageHeader
        title="Presentation Maker"
        subtitle="Theme → generate slides → edit → export PPTX/PDF. Last theme is remembered."
        actions={
          <>
            <button className="btn btn-secondary" onClick={createBlank}>
              <Plus size={16} /> Blank deck
            </button>
            <button className="btn btn-primary" disabled={busy || !chapterId} onClick={createFromChapter}>
              <PresentationIcon size={16} /> {busy ? "Building…" : "From chapter"}
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn capitalize ${step === s ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setStep(s)}
          >
            {s === "generate" ? "Generate" : s}
          </button>
        ))}
      </div>

      {step === "theme" && (
        <section className="surface mb-4 p-4">
          <h3 className="font-semibold">Step 1 — Choose a theme</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(SLIDE_THEMES) as SlideThemeId[]).map((id) => {
              const t = SLIDE_THEMES[id];
              return (
                <button
                  key={id}
                  type="button"
                  className={`rounded-xl border p-4 text-left ${theme === id ? "border-brand ring-2 ring-brand/30" : "border-line"}`}
                  style={{ background: t.bg, color: t.fg, fontFamily: t.font }}
                  onClick={() => {
                    setTheme(id);
                    setDefaultSlideTheme(id);
                    if (deck) saveDeck({ ...deck, theme: id }, false);
                  }}
                >
                  <div className="text-sm opacity-80" style={{ color: t.accent }}>
                    {t.label}
                  </div>
                  <div className="mt-2 text-xl font-semibold">Sample title</div>
                  <ul className="mt-2 list-disc pl-4 text-sm">
                    <li>Bullet one</li>
                    <li>Bullet two</li>
                  </ul>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="text-sm font-semibold text-ink">
              Chapter source
              <select className="select mt-1 min-w-[220px]" value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-primary self-end" disabled={!chapterId || busy} onClick={createFromChapter}>
              Continue — generate slides
            </button>
          </div>
        </section>
      )}

      {step === "generate" && (
        <div className="surface mb-4 p-8 text-center text-ink-muted">
          {busy ? "Building slide-by-slide content…" : "Ready — use From chapter or pick Theme first."}
        </div>
      )}

      {(step === "edit" || step === "export") && (
        <>
          {step === "export" && (
            <div className="surface mb-4 flex flex-wrap gap-2 p-4">
              <button className="btn btn-primary" disabled={!deck} onClick={downloadPptx}>
                <Download size={16} /> Download .pptx
              </button>
              <button className="btn btn-secondary" disabled={!deck} onClick={downloadPdf}>
                <Download size={16} /> Download PDF
              </button>
              <button className="btn btn-secondary" disabled={!deck} onClick={downloadHtml}>
                <Download size={16} /> HTML slideshow
              </button>
            </div>
          )}

          <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-semibold">
              Chapter source
              <select className="select mt-1" value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Design theme
              <select
                className="select mt-1"
                value={deck?.theme ?? theme}
                onChange={(e) => {
                  const t = e.target.value as SlideThemeId;
                  setTheme(t);
                  setDefaultSlideTheme(t);
                  if (deck) saveDeck({ ...deck, theme: t }, false);
                }}
              >
                {(Object.keys(SLIDE_THEMES) as SlideThemeId[]).map((id) => (
                  <option key={id} value={id}>
                    {SLIDE_THEMES[id].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button className="btn btn-secondary" disabled={!deck} onClick={downloadPptx}>
                PPTX
              </button>
              <button className="btn btn-secondary" disabled={!deck} onClick={downloadPdf}>
                PDF
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[240px_1fr_300px]">
            <aside className="surface p-3">
              <div className="mb-2 text-sm font-semibold">Your decks</div>
              <ul className="space-y-1">
                {presentations.map((p) => (
                  <li key={p.id}>
                    <button
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${
                        deckId === p.id ? "bg-brand-soft" : "hover:bg-bg-elevated"
                      }`}
                      onClick={() => {
                        setDeckId(p.id);
                        setSlideIndex(0);
                        setStep("edit");
                      }}
                    >
                      <span className="truncate">{p.title}</span>
                    </button>
                  </li>
                ))}
                {!presentations.length && <li className="px-2 py-4 text-sm text-ink-muted">No decks yet.</li>}
              </ul>
              {deck && (
                <button
                  className="btn btn-ghost mt-3 w-full text-danger"
                  onClick={() => {
                    removePresentation(deck.id);
                    setDeckId(presentations.find((p) => p.id !== deck.id)?.id ?? null);
                    setPresentationDirty(false);
                  }}
                >
                  <Trash2 size={14} /> Delete deck
                </button>
              )}
            </aside>

            <section className="space-y-3">
              {deck && currentSlide ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {deck.slides.map((s, i) => (
                      <button
                        key={s.id}
                        className={`btn ${i === slideIndex ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setSlideIndex(i)}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = Number(e.dataTransfer.getData("text/plain"));
                          if (Number.isNaN(from) || from === i || !deck) return;
                          const slides = [...deck.slides];
                          const [moved] = slides.splice(from, 1);
                          slides.splice(i, 0, moved);
                          saveDeck({ ...deck, slides });
                          setSlideIndex(i);
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button className="btn btn-secondary" onClick={addSlide}>
                      + Slide
                    </button>
                    <button className="btn btn-ghost text-danger" onClick={removeSlide}>
                      Remove
                    </button>
                    <button className="btn btn-secondary" onClick={() => moveSlide(-1)} disabled={slideIndex === 0}>
                      Up
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => moveSlide(1)}
                      disabled={slideIndex >= deck.slides.length - 1}
                    >
                      Down
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted">Drag slide numbers to reorder · edits autosave</p>

                  <div
                    className="flex min-h-[320px] flex-col justify-center rounded-2xl p-8 shadow-lg md:min-h-[420px] md:p-12"
                    style={{
                      background: `radial-gradient(900px 500px at 100% 0%, ${themeStyle.accent}33, transparent 55%), ${themeStyle.bg}`,
                      color: themeStyle.fg,
                      fontFamily: themeStyle.font,
                    }}
                  >
                    <div className="mb-2 text-sm opacity-80" style={{ color: themeStyle.accent }}>
                      {deck.title} · Slide {slideIndex + 1}/{deck.slides.length}
                    </div>
                    <h2 className="mb-4 text-3xl font-semibold leading-tight md:text-4xl">{currentSlide.title}</h2>
                    <ul className="list-disc space-y-2 pl-5 text-lg md:text-xl">
                      {currentSlide.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    {currentSlide.imageHint && (
                      <div className="mt-6 rounded-xl border border-dashed border-white/40 p-4 text-sm opacity-80">
                        [Image placeholder: {currentSlide.imageHint}]
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="surface flex min-h-[320px] items-center justify-center p-8 text-ink-muted">
                  Pick a theme and generate from a chapter, or start a blank deck.
                </div>
              )}
            </section>

            <aside className="surface p-4">
              {deck && currentSlide ? (
                <>
                  <h3 className="font-semibold">Edit slide</h3>
                  <label className="mt-3 block text-sm font-semibold">
                    Deck title
                    <input className="input mt-1" value={deck.title} onChange={(e) => saveDeck({ ...deck, title: e.target.value })} />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Slide title
                    <input className="input mt-1" value={currentSlide.title} onChange={(e) => patchSlide({ title: e.target.value })} />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Bullets (one per line)
                    <textarea
                      className="textarea mt-1"
                      rows={6}
                      value={currentSlide.bullets.join("\n")}
                      onChange={(e) =>
                        patchSlide({
                          bullets: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Speaker notes
                    <textarea className="textarea mt-1" value={currentSlide.notes ?? ""} onChange={(e) => patchSlide({ notes: e.target.value })} />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Image placeholder / hint
                    <input className="input mt-1" value={currentSlide.imageHint ?? ""} onChange={(e) => patchSlide({ imageHint: e.target.value })} />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">
                    Replace image (stored as data URL)
                    <input
                      className="input mt-1"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => patchSlide({ imageDataUrl: String(reader.result), imageHint: f.name });
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                  <p className="mt-3 text-xs text-ink-muted">Class: {classes.find((c) => c.id === deck.classId)?.name ?? "—"}</p>
                  <button type="button" className="btn btn-primary mt-3 w-full" onClick={() => setStep("export")}>
                    Go to export
                  </button>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Select or create a presentation to edit.</p>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

export default function PresentationsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink-muted">Loading presentation maker…</p>}>
      <PresentationsInner />
    </Suspense>
  );
}
