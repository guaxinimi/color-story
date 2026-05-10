"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import ImagePaletteCard from "@/components/ImagePaletteCard";

interface PaletteImage {
  url: string;
  alt: string;
  caption: string;
}

interface PaletteData {
  title: string;
  description: string;
  wikiUrl: string;
  images: PaletteImage[];
}

function ResultsContent() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const [data, setData] = useState<PaletteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/palette?q=${encodeURIComponent(query)}`)
      .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Something went wrong");
        return json as PaletteData;
      })
      .then(setData)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* ── Article header ── */}
      <section className="border-b border-ink-100 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/"
            className="label-uppercase inline-flex items-center gap-2 mb-7 hover:text-ink-700 transition-colors"
          >
            <BackArrow />
            New search
          </Link>

          {loading ? (
            <HeaderSkeleton />
          ) : error ? (
            <div className="space-y-2">
              <h1 className="font-serif text-3xl text-ink-900">{query}</h1>
              <p className="font-sans text-sm text-red-400">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-8 flex-wrap">
                <h1 className="font-serif text-4xl sm:text-5xl text-ink-900 leading-tight">
                  {data.title}
                </h1>
                {data.wikiUrl && (
                  <a
                    href={data.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-uppercase shrink-0 hover:text-ink-700 transition-colors mt-2 flex items-center gap-1.5"
                  >
                    Wikipedia
                    <ExternalIcon />
                  </a>
                )}
              </div>
              {data.description && (
                <p className="font-sans text-sm text-ink-500 font-light leading-relaxed max-w-2xl">
                  {data.description}
                  {data.description.length >= 299 ? "…" : ""}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Mood board ── */}
      <section className="py-10 px-6 flex-1">
        <div className="max-w-5xl mx-auto">

          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <EmptyState
              heading="Nothing found."
              body="Try a different search — an artist name, a movement, or a material."
            />
          )}

          {!loading && data && data.images.length === 0 && (
            <EmptyState
              heading="No paintable images found."
              body="Try a different topic — an artist, movement, or place."
            />
          )}

          {!loading && data && data.images.length > 0 && (
            <div className="space-y-6">
              <p className="label-uppercase">
                {data.images.length} image{data.images.length !== 1 ? "s" : ""}
                &nbsp;&middot;&nbsp;6-color palette each
              </p>
              <div className="space-y-4">
                {data.images.map((img, i) => (
                  <div
                    key={img.url}
                    className="animate-fade-up"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <ImagePaletteCard
                      url={img.url}
                      alt={img.alt}
                      caption={img.caption}
                      index={i}
                      topic={data.title}
                    />
                  </div>
                ))}
              </div>

              {/* Save prompt */}
              <div className="border-t border-ink-100 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="font-sans text-sm text-ink-500 font-light">
                  Like what you see? Save these palettes to your gallery.
                </p>
                <Link
                  href="/gallery"
                  className="label-uppercase hover:text-ink-700 transition-colors inline-flex items-center gap-1.5"
                >
                  View gallery
                  <ExternalIcon />
                </Link>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}

/* ── Helper components ── */

function HeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 bg-ink-100 animate-pulse rounded-none w-72" />
      <div className="space-y-2">
        <div className="h-3 bg-ink-100 animate-pulse rounded-none w-full max-w-xl" />
        <div className="h-3 bg-ink-100 animate-pulse rounded-none w-2/3 max-w-lg" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-3 bg-ink-100 animate-pulse rounded-none w-40 mb-6" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border border-ink-100 overflow-hidden"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="px-5 py-4 border-b border-ink-100 bg-white">
            <div className="h-3 bg-ink-100 animate-pulse w-48 rounded-none" />
          </div>
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-[58%] h-[200px] sm:h-[260px] bg-parchment-200 animate-pulse" />
            <div className="sm:w-[42%] h-[100px] sm:h-[260px] flex">
              {Array.from({ length: 6 }).map((_, j) => (
                <div
                  key={j}
                  className="flex-1 bg-parchment-300 animate-pulse"
                  style={{ animationDelay: `${j * 50}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="py-20 text-center space-y-4">
      <p className="font-serif text-2xl text-ink-700">{heading}</p>
      <p className="font-sans text-sm text-ink-500 font-light max-w-xs mx-auto leading-relaxed">
        {body}
      </p>
      <Link
        href="/"
        className="label-uppercase inline-flex items-center gap-2 mt-6 hover:text-ink-700 transition-colors"
      >
        <BackArrow />
        Back to search
      </Link>
    </div>
  );
}

function BackArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M11 6H1M5 1L1 6L5 11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M1 9L9 1M9 1H4M9 1V6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
