"use client";

import { useState } from "react";
import type { SavedPalette } from "@/types/palette";
import { getColorInfo, getMoodTag, MOOD_STYLES } from "@/lib/colorUtils";

interface Props {
  palette: SavedPalette;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SavedPaletteCard({ palette, onDelete }: Props) {
  const mood      = getMoodTag(palette.colors);
  const moodStyle = MOOD_STYLES[mood];
  const [copied, setCopied] = useState(false);

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(palette.colors.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    // No overflow-hidden — tooltip must escape the swatch strip boundary
    <div className="bg-white border border-ink-100 flex flex-col rounded-2xl">

      {/* ── Swatch strip with per-swatch tooltips ── */}
      <div className="relative flex h-24 rounded-t-2xl overflow-hidden">
        {palette.colors.map((hex, i) => (
          <SwatchCell
            key={i}
            hex={hex}
            index={i}
            total={palette.colors.length}
          />
        ))}
      </div>

      {/* ── Info area ── */}
      <div className="px-5 pt-3 pb-4 border-t border-ink-100 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {/* Mood tag — eyebrow label */}
          <span
            className="inline-block font-sans text-[9px] tracking-widest uppercase px-2 py-0.5 leading-none rounded-full"
            style={{ backgroundColor: moodStyle.bg, color: moodStyle.text }}
          >
            {mood}
          </span>

          {/* Topic */}
          <h3 className="font-serif text-base text-ink-900 leading-snug truncate">
            {palette.topic}
          </h3>

          {/* Date */}
          <p className="font-sans text-xs text-ink-300 tracking-wide">
            {formatDate(palette.savedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0 pt-0.5">
          <button
            onClick={copyHex}
            aria-label="Copy all hex codes"
            className={`
              flex items-center gap-1.5 font-sans text-xs tracking-wide
              transition-colors duration-200
              ${copied ? "text-ink-400 cursor-default" : "text-ink-300 hover:text-ink-700"}
            `}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? "Copied" : "Copy hex"}</span>
          </button>

          <button
            onClick={() => onDelete(palette.id)}
            aria-label={`Delete ${palette.topic} palette`}
            className="text-ink-200 hover:text-ink-700 transition-colors duration-200"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Individual swatch cell with hover tooltip
// ─────────────────────────────────────────────────────────────

function SwatchCell({
  hex,
  index,
  total,
}: {
  hex: string;
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const info = getColorInfo(hex);
  const [r, g, b] = info.rgb;

  // Align the tooltip so edge swatches don't overflow the viewport
  const align =
    index === 0
      ? "left-0"
      : index === total - 1
      ? "right-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <div
      className="flex-1 relative focus:outline-none"
      style={{ backgroundColor: hex }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      role="img"
      aria-label={`${info.name} ${hex}`}
    >
      {open && (
        <div
          className={`
            absolute top-full mt-1.5 ${align}
            w-52 bg-white border border-ink-100 shadow-md z-50 rounded-xl
            pointer-events-none
          `}
        >
          {/* Color preview bar */}
          <div className="h-1.5" style={{ backgroundColor: hex }} />

          <div className="p-3 space-y-2.5">
            {/* Name */}
            <p className="font-serif text-sm text-ink-900 leading-tight">
              {info.name}
            </p>

            {/* Hex + RGB */}
            <div className="space-y-0.5">
              <p className="font-mono text-[10px] text-ink-700 leading-tight">
                {hex.toUpperCase()}
              </p>
              <p className="font-mono text-[10px] text-ink-400 leading-tight">
                rgb({r}, {g}, {b})
              </p>
            </div>

            {/* Mixing note */}
            <p className="font-sans text-[10px] text-ink-500 leading-relaxed border-t border-parchment-300 pt-2 italic">
              {info.mixing}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="3.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M2.5 8H2C1.45 8 1 7.55 1 7V2C1 1.45 1.45 1 2 1H7C7.55 1 8 1.45 8 2V2.5"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6.5L4.5 9L10 3"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 3.5H12.5M5 3.5V2.5C5 2 5.45 1.5 6 1.5H8C8.55 1.5 9 2 9 2.5V3.5M5.5 6V10.5M8.5 6V10.5M2.5 3.5L3 11C3 11.55 3.45 12 4 12H10C10.55 12 11 11.55 11 11L11.5 3.5"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
