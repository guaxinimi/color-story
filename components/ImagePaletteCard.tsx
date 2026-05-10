"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { Color } from "colorthief";
import type { SavedPalette } from "@/types/palette";
import { PALETTE_STORAGE_KEY } from "@/types/palette";

interface Props {
  url: string;
  alt: string;
  caption?: string;
  index: number;
  topic: string;
}

type Phase = "loading" | "extracting" | "done" | "error";

export default function ImagePaletteCard({ url, alt, caption, index, topic }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [palette, setPalette] = useState<Color[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [saved, setSaved] = useState(false);

  const extract = useCallback(async () => {
    const img = imgRef.current;
    if (!img) return;
    setPhase("extracting");
    try {
      const { getPaletteSync } = await import("colorthief");
      const colors = getPaletteSync(img, { colorCount: 6 });
      if (!colors || colors.length === 0) { setPhase("error"); return; }
      setPalette(colors);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, []);

  // Check saved state once extraction completes
  useEffect(() => {
    if (phase !== "done") return;
    try {
      const existing: SavedPalette[] = JSON.parse(
        localStorage.getItem(PALETTE_STORAGE_KEY) ?? "[]"
      );
      setSaved(existing.some(p => p.topic === topic && p.imageUrl === url));
    } catch {}
  }, [phase, topic, url]);

  const handleSave = useCallback(() => {
    if (saved || palette.length === 0) return;
    const entry: SavedPalette = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      topic,
      imageUrl: url,
      colors: palette.map(c => c.hex().toUpperCase()),
      savedAt: new Date().toISOString(),
    };
    try {
      const existing: SavedPalette[] = JSON.parse(
        localStorage.getItem(PALETTE_STORAGE_KEY) ?? "[]"
      );
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify([entry, ...existing]));
      setSaved(true);
    } catch {}
  }, [saved, palette, topic, url]);

  const ready = phase === "done" && palette.length > 0;

  return (
    <article className="border border-ink-100 bg-white overflow-hidden">
      {/* Row header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-4 border-b border-ink-100">
        <span className="font-serif text-2xl text-ink-100 leading-none tabular-nums select-none shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        {(caption || alt) && (
          <p className="font-sans text-xs text-ink-500 font-light truncate flex-1 leading-relaxed">
            {caption || alt}
          </p>
        )}
        {ready && (
          <button
            onClick={handleSave}
            disabled={saved}
            aria-label={saved ? "Palette saved" : "Save this palette"}
            className={`
              shrink-0 flex items-center gap-1.5 font-sans text-xs tracking-wide
              transition-colors duration-200
              ${saved ? "text-ink-300 cursor-default" : "text-ink-500 hover:text-ink-900"}
            `}
          >
            {saved ? <CheckIcon /> : <SaveIcon />}
            {saved ? "Saved" : "Save palette"}
          </button>
        )}
      </div>

      {/* Two-column layout: image | swatches */}
      <div className="flex flex-col sm:flex-row">
        {/* ── Image panel ── */}
        <div className="sm:w-[58%] relative bg-parchment-200 flex items-center justify-center min-h-[200px] sm:min-h-[300px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt={alt}
            crossOrigin="anonymous"
            onLoad={extract}
            onError={() => setPhase("error")}
            className="max-h-[200px] sm:max-h-[280px] max-w-full w-auto h-auto object-contain p-3"
          />
          {phase === "loading" && (
            <div className="absolute inset-0 bg-parchment-200 animate-pulse" />
          )}
        </div>

        {/* ── Palette panel ── */}
        <div className="sm:w-[42%] flex flex-col min-h-[100px] sm:min-h-[300px]">
          {ready ? (
            <SwatchStrip colors={palette} />
          ) : phase === "error" ? (
            <ErrorPanel />
          ) : (
            <SkeletonStrip />
          )}
        </div>
      </div>
    </article>
  );
}

function SwatchStrip({ colors }: { colors: Color[] }) {
  return (
    <div className="flex flex-1 h-full">
      {colors.map((color, i) => {
        const hex = color.hex().toUpperCase();
        const textCss = color.textColor;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col group"
            style={{ backgroundColor: hex }}
            title={hex}
          >
            <div className="flex-1" />
            <div className="py-2 px-0.5 shrink-0">
              <span
                className="font-mono text-[8px] sm:text-[9px] leading-none block text-center tracking-wide opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ color: textCss }}
              >
                {hex}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonStrip() {
  return (
    <div className="flex flex-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-parchment-300 animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

function ErrorPanel() {
  return (
    <div className="flex-1 flex items-center justify-center bg-parchment-100 px-6">
      <p className="label-uppercase text-center text-ink-300">Palette unavailable</p>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M9.5 10.5H2.5C1.95 10.5 1.5 10.05 1.5 9.5V2.5C1.5 1.95 1.95 1.5 2.5 1.5H8L10.5 4V9.5C10.5 10.05 10.05 10.5 9.5 10.5Z"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M4 1.5V4.5H8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M3.5 10.5V7H8.5V10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
