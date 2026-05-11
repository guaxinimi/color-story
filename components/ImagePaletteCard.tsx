"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import type { Color } from "colorthief";
import type { SavedPalette } from "@/types/palette";
import { PALETTE_STORAGE_KEY } from "@/types/palette";
import { hexToRgb, rgbToHsl } from "@/lib/colorUtils";

interface Props {
  url: string;
  alt: string;
  caption?: string;
  index: number;
  topic: string;
  paletteSize: number;
  excludeGrayscale: boolean;
  excludeBackground: boolean;
  onFiltered?: () => void;
}

type Phase = "loading" | "extracting" | "done" | "error";
type RGB = [number, number, number];

// ─── Image helpers ────────────────────────────────────────────────────────────

function sampleCorners(img: HTMLImageElement): RGB | null {
  try {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return null;
    const sz = Math.min(10, w, h);
    const canvas = document.createElement("canvas");
    canvas.width = sz * 2; canvas.height = sz * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img,     0,     0, sz, sz,  0,  0, sz, sz);
    ctx.drawImage(img, w-sz,      0, sz, sz, sz,  0, sz, sz);
    ctx.drawImage(img,     0,  h-sz, sz, sz,  0, sz, sz, sz);
    ctx.drawImage(img, w-sz,   h-sz, sz, sz, sz, sz, sz, sz);
    const { data } = ctx.getImageData(0, 0, sz*2, sz*2);
    let r=0, g=0, b=0, n=0;
    for (let i=0; i<data.length; i+=4) { r+=data[i]; g+=data[i+1]; b+=data[i+2]; n++; }
    return [Math.round(r/n), Math.round(g/n), Math.round(b/n)];
  } catch { return null; }
}

function colorDist(a: RGB, b: RGB): number {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

// ─── Palette quality checks ───────────────────────────────────────────────────

function avgSaturation(palette: Color[]): number {
  if (!palette.length) return 0;
  return palette.reduce((s, c) => {
    const [r, g, b] = hexToRgb(c.hex());
    const [, sat] = rgbToHsl(r, g, b);
    return s + sat;
  }, 0) / palette.length;
}

function distinctColorCount(palette: Color[], threshold = 40): number {
  const reps: RGB[] = [];
  for (const c of palette) {
    const rgb = hexToRgb(c.hex());
    if (reps.every(r => colorDist(rgb, r) >= threshold)) reps.push(rgb);
  }
  return reps.length;
}

// ─── Diversity selection ──────────────────────────────────────────────────────
// Extract many candidates from Color Thief, then greedily pick `count` colors
// that are maximally spread in RGB space. Seed with the most saturated color so
// vivid minority colors (e.g. cherry-blossom pink) are always represented.
// A saturation bonus means a vivid color can beat a slightly-more-distant dull one.

function selectDiverse(palette: Color[], count: number): Color[] {
  if (palette.length <= count) return palette;

  const data = palette.map((c, idx) => {
    const [r, g, b] = hexToRgb(c.hex());
    const [, s] = rgbToHsl(r, g, b);
    return { idx, s, rgb: [r, g, b] as RGB };
  });

  // Seed: most saturated color
  data.sort((a, b) => b.s - a.s);
  const selected: number[] = [data[0].idx];
  const remaining = new Set(palette.map((_, i) => i));
  remaining.delete(data[0].idx);
  const byIdx = new Map(data.map(d => [d.idx, d]));

  while (selected.length < count && remaining.size > 0) {
    let bestIdx = -1, bestScore = -Infinity;
    for (const i of Array.from(remaining)) {
      const d = byIdx.get(i)!;
      const minDist = Math.min(...selected.map(si => colorDist(d.rgb, byIdx.get(si)!.rgb)));
      // Saturation bonus biases toward vivid colors even if slightly closer to others
      const score = minDist * (1 + 0.6 * d.s);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    selected.push(bestIdx);
    remaining.delete(bestIdx);
  }

  return selected.map(i => palette[i]);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ImagePaletteCard({
  url, alt, caption, index, topic,
  paletteSize, excludeGrayscale, excludeBackground, onFiltered,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [rawPalette, setRawPalette] = useState<Color[]>([]);
  const [bgColor, setBgColor]       = useState<RGB | null>(null);
  const [phase, setPhase]           = useState<Phase>("loading");
  const [saved, setSaved]           = useState(false);

  const extract = useCallback(async () => {
    const img = imgRef.current;
    if (!img) return;
    setPhase("extracting");
    try {
      setBgColor(sampleCorners(img));
      const { getPaletteSync } = await import("colorthief");

      // Over-extract candidates so diversity selection has room to work
      const candidateCount = Math.max(paletteSize * 5, 40);
      const candidates = getPaletteSync(img, { colorCount: candidateCount });
      if (!candidates || candidates.length === 0) { setPhase("error"); return; }

      // Quality gates — silently replace via onFiltered if image is too flat/gray
      const sat    = avgSaturation(candidates);
      const dists  = distinctColorCount(candidates);
      const grayThreshold = excludeGrayscale ? 0.30 : 0.15;
      if (sat < grayThreshold || dists <= 2) { onFiltered?.(); return; }

      // Select a maximally diverse subset, seeded by the most vivid color
      const diverse = selectDiverse(candidates, paletteSize);
      setRawPalette(diverse);
      setPhase("done");
    } catch { setPhase("error"); }
  }, [paletteSize, excludeGrayscale, onFiltered]);

  useEffect(() => {
    if (phase !== "done") return;
    try {
      const existing: SavedPalette[] = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY) ?? "[]");
      setSaved(existing.some(p => p.topic === topic && p.imageUrl === url));
    } catch {}
  }, [phase, topic, url]);

  // Remove colors too close to the detected background
  const displayPalette = useMemo(() => {
    if (!excludeBackground || !bgColor || !rawPalette.length) return rawPalette;
    const filtered = rawPalette.filter(c => colorDist(hexToRgb(c.hex()), bgColor) > 40);
    return filtered.length > 0 ? filtered : rawPalette;
  }, [rawPalette, bgColor, excludeBackground]);

  const handleSave = useCallback(() => {
    if (saved || !displayPalette.length) return;
    const entry: SavedPalette = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      topic, imageUrl: url,
      colors: displayPalette.map(c => c.hex().toUpperCase()),
      savedAt: new Date().toISOString(),
    };
    try {
      const existing: SavedPalette[] = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY) ?? "[]");
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify([entry, ...existing]));
      setSaved(true);
    } catch {}
  }, [saved, displayPalette, topic, url]);

  const ready = phase === "done" && displayPalette.length > 0;

  return (
    <article className="border border-ink-100 bg-white overflow-hidden">
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
            className={`shrink-0 flex items-center gap-1.5 font-sans text-xs tracking-wide transition-colors duration-200 ${saved ? "text-ink-300 cursor-default" : "text-ink-500 hover:text-ink-900"}`}
          >
            {saved ? <CheckIcon /> : <SaveIcon />}
            {saved ? "Saved" : "Save palette"}
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row">
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
          {phase === "loading" && <div className="absolute inset-0 bg-parchment-200 animate-pulse" />}
        </div>

        <div className="sm:w-[42%] flex flex-col min-h-[100px] sm:min-h-[300px]">
          {ready       ? <SwatchStrip colors={displayPalette} />
          : phase === "error" ? <ErrorPanel />
          : <SkeletonStrip />}
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
        return (
          <div key={i} className="flex-1 flex flex-col group" style={{ backgroundColor: hex }} title={hex}>
            <div className="flex-1" />
            <div className="py-2 px-0.5 shrink-0">
              <span className="font-mono text-[8px] sm:text-[9px] leading-none block text-center tracking-wide opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: color.textColor }}>
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
        <div key={i} className="flex-1 bg-parchment-300 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
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
      <path d="M9.5 10.5H2.5C1.95 10.5 1.5 10.05 1.5 9.5V2.5C1.5 1.95 1.95 1.5 2.5 1.5H8L10.5 4V9.5C10.5 10.05 10.05 10.5 9.5 10.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
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
