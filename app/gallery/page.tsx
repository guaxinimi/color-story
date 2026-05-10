"use client";

import Nav from "@/components/Nav";
import Link from "next/link";
import { useSavedPalettes } from "@/hooks/useSavedPalettes";
import SavedPaletteCard from "@/components/SavedPaletteCard";

export default function GalleryPage() {
  const { palettes, deletePalette, ready } = useSavedPalettes();

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* Page header */}
      <section className="border-b border-ink-100 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="label-uppercase mb-3">Collection</p>
          <div className="flex items-end justify-between gap-6">
            <h1 className="font-serif text-4xl sm:text-5xl text-ink-900 leading-tight">
              Your Gallery
            </h1>
            {ready && palettes.length > 0 && (
              <p className="font-sans text-sm text-ink-300 font-light pb-1">
                {palettes.length} palette{palettes.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto">

          {/* Loading state — prevents empty-state flash on hydration */}
          {!ready && <GallerySkeleton />}

          {/* Empty state */}
          {ready && palettes.length === 0 && <EmptyState />}

          {/* Palette grid */}
          {ready && palettes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {palettes.map((p, i) => (
                <div
                  key={p.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <SavedPaletteCard
                    palette={p}
                    onDelete={deletePalette}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      <footer className="border-t border-ink-100 py-8 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans text-xs text-ink-300 tracking-wide">
            Color Story &mdash; built for painters &amp; illustrators
          </p>
          <p className="font-sans text-xs text-ink-300 tracking-wide">
            Palette data sourced via Wikipedia
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center space-y-8 max-w-sm mx-auto">
      {/* Decorative swatch columns */}
      <div className="flex justify-center items-end gap-2.5">
        {[
          { h: 56, hex: "#DDD5C5" },
          { h: 72, hex: "#C4846A" },
          { h: 88, hex: "#A89E93" },
          { h: 72, hex: "#EDE7DB" },
          { h: 56, hex: "#6B6358" },
        ].map((s, i) => (
          <div
            key={i}
            className="w-10 opacity-40"
            style={{ height: s.h, backgroundColor: s.hex }}
          />
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="font-serif text-2xl text-ink-700">Nothing here yet.</h2>
        <p className="font-sans text-sm text-ink-500 font-light leading-relaxed">
          Your saved palettes will live here. Search for a topic and hit{" "}
          <em>Save palette</em> to begin your collection.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-ink-900 text-parchment-50 font-sans text-sm tracking-wide hover:bg-ink-700 transition-colors duration-200"
      >
        Start exploring
        <ArrowRight />
      </Link>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white border border-ink-100 overflow-hidden">
          <div className="h-24 bg-parchment-300 animate-pulse" />
          <div className="px-5 py-4 space-y-2 border-t border-ink-100">
            <div className="h-3.5 bg-ink-100 animate-pulse w-32 rounded-none" />
            <div className="h-2.5 bg-ink-100 animate-pulse w-20 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1 7H13M8 2L13 7L8 12"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
