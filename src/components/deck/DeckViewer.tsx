"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { SlotDeck } from "@/lib/deck/types";
import { SlideRenderer } from "./SlideRenderer";
import { COLORS } from "@/lib/deck/design-tokens";
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, X } from "lucide-react";

interface Props {
  deck: SlotDeck;
  /** Show download button (needs /api/deck/[id]/pdf) */
  deckId?: string;
  /** Called when user wants to edit a slide */
  onEditSlide?: (index: number) => void;
}

/** Scale a 1280×720 slide to fit the available viewport width */
function useScaleFactor(containerRef: React.RefObject<HTMLDivElement | null>, targetW = 1280) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / targetW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, targetW]);
  return scale;
}

export function DeckViewer({ deck, deckId, onEditSlide }: Props) {
  const [presentMode, setPresentMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useScaleFactor(containerRef);

  const total = deck.slides.length;

  const goNext = useCallback(() => setCurrentSlide((i) => Math.min(i + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrentSlide((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!presentMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") setPresentMode(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentMode, goNext, goPrev]);

  // ── Presentation (fullscreen) mode ───────────────────────────────────────
  if (presentMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        {/* Controls overlay */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <span className="text-white/60 text-sm">{currentSlide + 1} / {total}</span>
          <button
            onClick={() => setPresentMode(false)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Slide */}
        <div
          className="relative"
          style={{
            width: "min(100vw, calc(100vh * 16/9))",
            aspectRatio: "16/9",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: 1280, height: 720,
              transform: `scale(${Math.min(window.innerWidth, window.innerHeight * 16 / 9) / 1280})`,
              transformOrigin: "top left",
            }}
          >
            <SlideRenderer slide={deck.slides[currentSlide]} />
          </div>
        </div>

        {/* Navigation */}
        <div className="absolute bottom-6 flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          {/* Dots */}
          <div className="flex gap-1.5">
            {deck.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === currentSlide ? 24 : 6,
                  height: 6,
                  backgroundColor: i === currentSlide ? COLORS.secondary : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={currentSlide === total - 1}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  }

  // ── Scroll preview mode ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#111" }}>
      {/* Toolbar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: "#1a1a1a", borderBottom: "1px solid #333" }}
      >
        <div className="flex flex-col">
          <span className="text-white font-semibold text-[15px]">{deck.meta.title}</span>
          <span className="text-white/40 text-[12px]">{total}장 슬라이드</span>
        </div>
        <div className="flex items-center gap-2">
          {deckId && (
            <a
              href={`/api/deck/${deckId}/pdf`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white/80 hover:text-white transition-colors"
              style={{ backgroundColor: "#2a2a2a" }}
            >
              <Download size={14} />
              PDF
            </a>
          )}
          <button
            onClick={() => { setCurrentSlide(0); setPresentMode(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white transition-colors"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Maximize2 size={14} />
            발표 모드
          </button>
        </div>
      </div>

      {/* Slide list */}
      <div className="flex-1 py-10 px-6 flex flex-col gap-8 items-center">
        {deck.slides.map((slide, i) => (
          <div
            key={i}
            className="group relative"
            ref={i === 0 ? containerRef : undefined}
          >
            {/* Slide number */}
            <div className="absolute -left-8 top-3 text-white/30 text-[12px] font-mono">
              {i + 1}
            </div>

            {/* Scaled slide */}
            <div
              className="relative overflow-hidden shadow-2xl rounded-lg cursor-pointer"
              style={{
                width: "min(calc(100vw - 80px), 1120px)",
                aspectRatio: "16/9",
              }}
              onClick={() => { setCurrentSlide(i); setPresentMode(true); }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0, left: 0,
                  width: 1280, height: 720,
                  transformOrigin: "top left",
                  transform: `scale(${scale})`,
                }}
              >
                <SlideRenderer slide={slide} />
              </div>
              {/* Hover overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
              >
                <span className="text-white text-[13px] font-medium bg-black/50 px-3 py-1.5 rounded-lg">
                  클릭하여 발표 모드
                </span>
              </div>
            </div>

            {onEditSlide && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditSlide(i); }}
                className="absolute -right-8 top-3 text-white/30 hover:text-white/70 text-[11px] transition-colors"
              >
                편집
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
