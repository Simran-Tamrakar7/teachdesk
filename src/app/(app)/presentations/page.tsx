"use client";

import { PageHeader } from "@/components/PageHeader";
import {
  buildPresentationHtml,
  buildRichSlidesFromChapter,
  generateSlideImageDataUrl,
  SLIDE_THEMES,
  type SlideDensity,
} from "@/lib/presentations";
import { exportPresentationPdf, exportPresentationPptx } from "@/lib/exports";
import { useAppStore } from "@/lib/store";
import type { Presentation, PresentationSlide, SlideThemeId } from "@/lib/types";
import { downloadText, uid } from "@/lib/utils";
import { Copy, Download, Play, Plus, Presentation as PresentationIcon, Trash2, X } from "lucide-react";
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
  const pushRecent = useAppStore((s) => s.pushRecent);

  const qChapter = search.get("chapter") || "";
  const qStep = (search.get("step") as Step | null) || null;
  const qClass = search.get("classId") || "";

  const [deckId, setDeckId] = useState<string | null>(presentations[0]?.id ?? null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [chapterId, setChapterId] = useState(qChapter || chapters[0]?.id || "");
  const [theme, setTheme] = useState<SlideThemeId>(defaultSlideTheme);
  const [step, setStep] = useState<Step>(qStep || "edit");
  const [slideCount, setSlideCount] = useState<5 | 10 | 15>(10);
  const [density, setDensity] = useState<SlideDensity>("detailed");
  const [deckQuery, setDeckQuery] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [presenterNotes, setPresenterNotes] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (qChapter) {
      setChapterId(qChapter);
      setStep(qStep || "theme");
    }
  }, [qChapter, qStep]);

  useEffect(() => {
    if (qClass && !deckId) {
      const hit = presentations.find((p) => p.classId === qClass);
      if (hit) setDeckId(hit.id);
    }
  }, [qClass, presentations, deckId]);

  const deck = presentations.find((p) => p.id === deckId) ?? null;
  const themeStyle = SLIDE_THEMES[deck?.theme ?? theme];

  const filteredDecks = useMemo(() => {
    const q = deckQuery.trim().toLowerCase();
    if (!q) return presentations;
    return presentations.filter((p) => {
      const cls = classes.find((c) => c.id === p.classId)?.name ?? "";
      const ch = chapters.find((c) => c.id === p.chapterId)?.title ?? "";
      return (
        p.title.toLowerCase().includes(q) ||
        cls.toLowerCase().includes(q) ||
        ch.toLowerCase().includes(q) ||
        (p.lessonDate ?? "").includes(q)
      );
    });
  }, [presentations, deckQuery, classes, chapters]);

  const currentSlide: PresentationSlide | null = useMemo(() => {
    if (!deck?.slides.length) return null;
    return deck.slides[Math.min(slideIndex, deck.slides.length - 1)] ?? null;
  }, [deck, slideIndex]);

  useEffect(() => {
    if (!presenting) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPresenting(false);
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setSlideIndex((i) => Math.min((deck?.slides.length ?? 1) - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSlideIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "n" || e.key === "N") setPresenterNotes((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, deck?.slides.length]);

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
    const slides = buildRichSlidesFromChapter(chapter, { count: slideCount, density });
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
    pushAiLog({
      kind: "presentation",
      title: deckNew.title,
      preview: `Generated ${slides.length} ${density} slides from ${chapter.title}`,
    });
    pushRecent({
      id: deckNew.id,
      kind: "presentation",
      label: deckNew.title,
      href: `/presentations`,
    });
    setBusy(false);
  }

  function createBlank() {
    const id = uid("ppt");
    const chapter = chapters.find((c) => c.id === chapterId);
    saveDeck(
      {
        id,
        title: "New presentation",
        theme,
        classId: chapter?.classId,
        chapterId: chapter?.id,
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

  function duplicateDeck(src: Presentation) {
    const copy: Presentation = {
      ...src,
      id: uid("ppt"),
      title: `${src.title} (copy)`,
      slides: src.slides.map((s) => ({ ...s, id: uid("s"), bullets: [...s.bullets] })),
      updatedAt: new Date().toISOString(),
    };
    saveDeck(copy, false);
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

  function duplicateSlide() {
    if (!deck || !currentSlide) return;
    const copy: PresentationSlide = {
      ...currentSlide,
      id: uid("s"),
      title: `${currentSlide.title} (copy)`,
      bullets: [...currentSlide.bullets],
    };
    const slides = [...deck.slides];
    slides.splice(slideIndex + 1, 0, copy);
    saveDeck({ ...deck, slides });
    setSlideIndex(slideIndex + 1);
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

  async function aiGenerateImage() {
    if (!deck || !currentSlide) return;
    setAiBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    const prompt = aiPrompt.trim() || currentSlide.imageHint || currentSlide.title;
    const dataUrl = generateSlideImageDataUrl(prompt, deck.theme);
    patchSlide({ imageDataUrl: dataUrl, imageHint: prompt });
    setAiBusy(false);
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
        subtitle="Theme → generate → edit → present or export. Thumbnails, AI images, and deck search included."
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
        {deck && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPresenting(true);
              setStep("edit");
            }}
          >
            <Play size={16} /> Present
          </button>
        )}
      </div>

      {step === "theme" && (
        <section className="surface mb-4 p-4">
          <h3 className="font-semibold">Step 1 — Theme & length</h3>
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
          <div className="mt-4 flex flex-wrap items-end gap-3">
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
            <label className="text-sm font-semibold text-ink">
              Slide count
              <select
                className="select mt-1"
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value) as 5 | 10 | 15)}
              >
                <option value={5}>5 slides</option>
                <option value={10}>10 slides</option>
                <option value={15}>15 slides</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-ink">
              Content density
              <select className="select mt-1" value={density} onChange={(e) => setDensity(e.target.value as SlideDensity)}>
                <option value="detailed">Detailed — fuller bullets</option>
                <option value="minimal">Minimal — short headlines</option>
              </select>
            </label>
            <button type="button" className="btn btn-primary" disabled={!chapterId || busy} onClick={createFromChapter}>
              Continue — generate slides
            </button>
          </div>
        </section>
      )}

      {step === "generate" && (
        <div className="surface mb-4 p-8 text-center text-ink-muted">
          {busy ? `Building ${slideCount} ${density} slides…` : "Ready — pick Theme first, then generate."}
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
              <button className="btn btn-secondary" disabled={!deck} onClick={() => setPresenting(true)}>
                <Play size={16} /> Present now
              </button>
            </div>
          )}

          <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
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
            <label className="text-sm font-semibold">
              Lesson / exam date
              <input
                className="input mt-1"
                type="date"
                value={deck?.lessonDate ?? ""}
                disabled={!deck}
                onChange={(e) => deck && saveDeck({ ...deck, lessonDate: e.target.value || undefined }, false)}
              />
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

          <div className="grid gap-4 xl:grid-cols-[260px_1fr_300px]">
            <aside className="surface p-3">
              <div className="mb-2 text-sm font-semibold">Your decks</div>
              <input
                className="input mb-2"
                placeholder="Search class / chapter…"
                value={deckQuery}
                onChange={(e) => setDeckQuery(e.target.value)}
              />
              <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
                {filteredDecks.map((p) => {
                  const cls = classes.find((c) => c.id === p.classId);
                  return (
                    <li key={p.id} className="rounded-lg border border-transparent hover:border-line">
                      <button
                        className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                          deckId === p.id ? "bg-brand-soft" : "hover:bg-bg-elevated"
                        }`}
                        onClick={() => {
                          setDeckId(p.id);
                          setSlideIndex(0);
                          setStep("edit");
                        }}
                      >
                        <span className="block truncate font-medium">{p.title}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {cls?.name ?? "No class"}
                          {p.lessonDate ? ` · ${p.lessonDate}` : ""}
                        </span>
                      </button>
                      <div className="flex gap-1 px-1 pb-1">
                        <button type="button" className="btn btn-ghost text-xs" onClick={() => duplicateDeck(p)} title="Duplicate deck">
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </li>
                  );
                })}
                {!filteredDecks.length && <li className="px-2 py-4 text-sm text-ink-muted">No decks match.</li>}
              </ul>
              {deck && (
                <button
                  className="btn btn-ghost mt-3 w-full text-danger"
                  onClick={() => {
                    if (!confirm(`Delete deck “${deck.title}”? This cannot be undone.`)) return;
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
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {deck.slides.map((s, i) => {
                      const th = SLIDE_THEMES[deck.theme];
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={`min-w-[7.5rem] shrink-0 rounded-lg border p-2 text-left ${
                            i === slideIndex ? "border-brand ring-2 ring-brand/30" : "border-line"
                          }`}
                          style={{ background: th.bg, color: th.fg, fontFamily: th.font }}
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
                          <div className="text-[10px] opacity-70" style={{ color: th.accent }}>
                            {i + 1}/{deck.slides.length}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs font-semibold leading-snug">{s.title || "Untitled"}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-secondary" onClick={addSlide}>
                      + Slide
                    </button>
                    <button className="btn btn-secondary" onClick={duplicateSlide}>
                      <Copy size={14} /> Duplicate slide
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
                    <button className="btn btn-primary" onClick={() => setPresenting(true)}>
                      <Play size={14} /> Present
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted">Drag thumbnails to reorder · edits autosave</p>

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
                    {currentSlide.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentSlide.imageDataUrl}
                        alt={currentSlide.imageHint || "Slide visual"}
                        className="mt-6 max-h-40 rounded-xl object-cover"
                      />
                    ) : currentSlide.imageHint ? (
                      <div className="mt-6 rounded-xl border border-dashed border-white/40 p-4 text-sm opacity-80">
                        [Image placeholder: {currentSlide.imageHint}]
                      </div>
                    ) : null}
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
                    Class tag
                    <select
                      className="select mt-1"
                      value={deck.classId ?? ""}
                      onChange={(e) => saveDeck({ ...deck, classId: e.target.value || undefined }, false)}
                    >
                      <option value="">—</option>
                      {classes.filter((c) => !c.deletedAt).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
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
                    Replace image (upload)
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
                  <div className="mt-3 rounded-xl border border-line bg-bg-elevated p-3">
                    <div className="text-sm font-semibold">AI-generate image</div>
                    <input
                      className="input mt-2"
                      placeholder={currentSlide.imageHint || "Describe the visual…"}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary mt-2 w-full" disabled={aiBusy} onClick={aiGenerateImage}>
                      {aiBusy ? "Generating…" : "Generate image"}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">
                    Class: {classes.find((c) => c.id === deck.classId)?.name ?? "—"}
                    {deck.lessonDate ? ` · ${deck.lessonDate}` : ""}
                  </p>
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

      {presenting && deck && currentSlide && (
        <div className="fixed inset-0 z-[70] flex bg-black">
          <div
            className={`flex flex-1 flex-col justify-center p-8 md:p-16 ${presenterNotes ? "md:w-[68%]" : "w-full"}`}
            style={{
              background: `radial-gradient(900px 500px at 100% 0%, ${themeStyle.accent}33, transparent 55%), ${themeStyle.bg}`,
              color: themeStyle.fg,
              fontFamily: themeStyle.font,
            }}
            onClick={() => setSlideIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
          >
            <div className="mb-3 text-sm opacity-80" style={{ color: themeStyle.accent }}>
              {deck.title} · {slideIndex + 1}/{deck.slides.length}
            </div>
            <h2 className="mb-6 text-4xl font-semibold leading-tight md:text-5xl">{currentSlide.title}</h2>
            <ul className="list-disc space-y-3 pl-6 text-xl md:text-2xl">
              {currentSlide.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {currentSlide.imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentSlide.imageDataUrl} alt="" className="mt-8 max-h-48 rounded-xl object-cover" />
            )}
          </div>
          {presenterNotes && (
            <aside className="hidden w-[32%] flex-col border-l border-white/10 bg-zinc-950 p-5 text-zinc-100 md:flex">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Presenter notes</h3>
                <button type="button" className="btn btn-ghost text-zinc-300" onClick={() => setPresenting(false)}>
                  <X size={16} /> Exit
                </button>
              </div>
              <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {currentSlide.notes || "No speaker notes on this slide."}
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}>
                  ← Prev
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSlideIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
                >
                  Next →
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">← → arrows · Esc exit · N toggle notes</p>
            </aside>
          )}
          {!presenterNotes && (
            <button
              type="button"
              className="absolute right-4 top-4 btn btn-secondary"
              onClick={() => setPresenting(false)}
            >
              <X size={16} /> Exit
            </button>
          )}
        </div>
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
