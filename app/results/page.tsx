"use client";

import { Suspense, useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import ImagePaletteCard from "@/components/ImagePaletteCard";
import { useSearchHistory } from "@/hooks/useSearchHistory";

interface PaletteImage { url: string; alt: string; caption: string }

interface PaletteData {
  title: string;
  description: string;
  wikiUrl: string;
  images: PaletteImage[];
}

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const query  = params.get("q") ?? "";

  const [data, setData]       = useState<PaletteData | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Controls — initialised from URL params set on the home page
  const [paletteSizeUI, setPaletteSizeUI] = useState(6);
  const [paletteSize, setPaletteSize]     = useState(6);
  const [excludeGrayscale, setExcludeGrayscale]   = useState(() => params.get("exgray") === "1");
  const [excludeBackground, setExcludeBackground] = useState(() => params.get("exbg")   === "1");

  // Search bar state
  const [searchActive, setSearchActive] = useState(false);
  const [inputQuery, setInputQuery]     = useState(query);
  const [suggestions, setSuggestions]   = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx]       = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when URL query changes
  useEffect(() => { setInputQuery(query); setSearchActive(false); }, [query]);

  const activateSearch = useCallback(() => {
    setSearchActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const deactivateSearch = useCallback(() => {
    setTimeout(() => {
      setShowDropdown(false);
      setSearchActive(false);
      setInputQuery(query);
      setActiveIdx(-1);
    }, 150);
  }, [query]);

  // Debounce palette size
  useEffect(() => {
    const t = setTimeout(() => setPaletteSize(paletteSizeUI), 350);
    return () => clearTimeout(t);
  }, [paletteSizeUI]);

  // Navigate to a new search, preserving current settings
  const navigateTo = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const p = new URLSearchParams({ q: trimmed });
    if (excludeGrayscale)  p.set("exgray", "1");
    if (excludeBackground) p.set("exbg",   "1");
    setShowDropdown(false);
    router.push(`/results?${p}`);
  }, [router, excludeGrayscale, excludeBackground]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) navigateTo(suggestions[activeIdx]);
    else if (inputQuery.trim()) navigateTo(inputQuery.trim());
  };

  // Wikipedia autocomplete
  useEffect(() => {
    const q = inputQuery.trim();
    if (q.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json&origin=*`
        );
        const data = await res.json();
        const titles: string[] = data[1] ?? [];
        setSuggestions(titles);
        setShowDropdown(titles.length > 0);
        setActiveIdx(-1);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [inputQuery]);

  // Fetch palette data
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

  // Active images + replacement queue
  const [activeImages, setActiveImages]     = useState<PaletteImage[]>([]);
  const [candidateQueue, setCandidateQueue] = useState<PaletteImage[]>([]);

  useEffect(() => {
    if (!data?.images?.length) { setActiveImages([]); setCandidateQueue([]); return; }
    const shuffled = [...data.images].sort(() => Math.random() - 0.5);
    setActiveImages(shuffled.slice(0, 5));
    setCandidateQueue(shuffled.slice(5));
  }, [data?.images]);

  const handleFiltered = useCallback((filteredUrl: string) => {
    setCandidateQueue(prev => {
      const [next, ...rest] = prev;
      if (!next) { setActiveImages(imgs => imgs.filter(i => i.url !== filteredUrl)); return []; }
      setActiveImages(imgs => imgs.map(i => i.url === filteredUrl ? next : i));
      return rest;
    });
  }, []);

  // Search history for breadcrumbs
  const searchHistory = useSearchHistory(query);

  const hasResults = !loading && !!data && data.images.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* ── Header ── */}
      <section className="border-b border-ink-100 py-8 px-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Search bar — compact when idle, expands on interaction */}
          {searchActive ? (
            <form onSubmit={handleSearch} className="w-full max-w-xl">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputQuery}
                  onChange={e => { setInputQuery(e.target.value); setActiveIdx(-1); }}
                  onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                  onBlur={deactivateSearch}
                  onKeyDown={e => {
                    if (e.key === "Escape") { deactivateSearch(); return; }
                    if (!showDropdown || !suggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i+1, suggestions.length-1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i-1, -1)); }
                  }}
                  placeholder="Search another topic…"
                  autoComplete="off"
                  className="
                    w-full pl-4 pr-12 py-2.5
                    bg-white border border-ink-700
                    font-sans text-sm text-ink-900 placeholder-ink-300
                    rounded-xl outline-none transition-colors duration-200
                  "
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center text-ink-300 hover:text-ink-900 transition-colors border-l border-ink-100 rounded-r-xl"
                >
                  <SearchIcon />
                </button>

                {showDropdown && suggestions.length > 0 && (
                  <ul role="listbox" className="absolute top-full left-0 right-0 z-50 bg-white border border-t-0 border-ink-100 shadow-lg rounded-b-xl overflow-hidden">
                    {suggestions.map((s, i) => (
                      <li key={s} role="option" aria-selected={i === activeIdx}>
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-2 font-sans text-sm transition-colors duration-100 ${
                            i === activeIdx ? "bg-parchment-100 text-ink-900" : "text-ink-700 hover:bg-parchment-50 hover:text-ink-900"
                          }`}
                          onMouseDown={e => { e.preventDefault(); navigateTo(s); }}
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>
          ) : (
            <button
              onClick={activateSearch}
              className="flex items-center gap-2 text-ink-300 hover:text-ink-700 transition-colors duration-150 group"
              aria-label="Search another topic"
            >
              <SearchIcon />
              <span className="font-sans text-sm text-ink-300 group-hover:text-ink-700 transition-colors duration-150">
                Search another topic…
              </span>
            </button>
          )}

          {/* Breadcrumb trail — show if 2+ searches in history */}
          {searchHistory.length > 1 && (
            <nav aria-label="Search history" className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {searchHistory.slice(0, 8).reverse().map((q, i, arr) => (
                <Fragment key={q}>
                  {i > 0 && (
                    <span className="text-ink-200 shrink-0 select-none">/</span>
                  )}
                  <button
                    onClick={() => q !== query && navigateTo(q)}
                    className={`
                      shrink-0 font-sans text-xs whitespace-nowrap px-1 py-0.5
                      transition-colors duration-150
                      ${q.toLowerCase() === query.toLowerCase()
                        ? "text-ink-900 tracking-wide label-uppercase"
                        : "text-ink-300 hover:text-ink-700 tracking-wide label-uppercase"
                      }
                    `}
                    aria-current={q.toLowerCase() === query.toLowerCase() ? "page" : undefined}
                  >
                    {q}
                  </button>
                </Fragment>
              ))}
            </nav>
          )}

          {/* Article title + description */}
          {loading ? (
            <HeaderSkeleton />
          ) : error ? (
            <div className="space-y-2">
              <h1 className="font-serif text-3xl text-ink-900">{query}</h1>
              <p className="font-sans text-sm text-red-400">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-3">
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
                  {data.description}{data.description.length >= 299 ? "…" : ""}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Mood board ── */}
      <section className="py-10 px-6 flex-1">
        <div className="max-w-5xl mx-auto">

          {/* Controls — visible as soon as data loads */}
          {!loading && data && data.images.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 py-4 border-b border-ink-100 mb-6">
              <div className="flex items-center gap-3">
                <span className="label-uppercase whitespace-nowrap">Palette size</span>
                <input
                  type="range" min={3} max={10} step={1}
                  value={paletteSizeUI}
                  onChange={e => setPaletteSizeUI(Number(e.target.value))}
                  className="w-28 accent-ink-900 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-ink-500 w-3 text-right tabular-nums">{paletteSizeUI}</span>
              </div>
              <Toggle checked={excludeGrayscale}  onChange={setExcludeGrayscale}  label="Exclude grayscale & sepia" />
              <Toggle checked={excludeBackground} onChange={setExcludeBackground} label="Exclude background colors" />
            </div>
          )}

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

          {hasResults && (
            <div className="space-y-6">
              <p className="label-uppercase">
                {activeImages.length} image{activeImages.length !== 1 ? "s" : ""}
                &nbsp;&middot;&nbsp;{paletteSizeUI}-color palette each
                &nbsp;&middot;&nbsp;drawn from {data.images.length} Wikimedia candidates
              </p>

              <div className="space-y-4">
                {activeImages.map((img, i) => (
                  <div key={img.url} className="animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                    <ImagePaletteCard
                      key={`${img.url}-${paletteSize}`}
                      url={img.url}
                      alt={img.alt}
                      caption={img.caption}
                      index={i}
                      topic={data.title}
                      paletteSize={paletteSize}
                      excludeGrayscale={excludeGrayscale}
                      excludeBackground={excludeBackground}
                      onFiltered={() => handleFiltered(img.url)}
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-ink-100 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="font-sans text-sm text-ink-500 font-light">
                  Like what you see? Save these palettes to your gallery.
                </p>
                <Link href="/gallery" className="label-uppercase hover:text-ink-700 transition-colors inline-flex items-center gap-1.5">
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

/* ── Toggle ── */

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-2.5 group">
      <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 shrink-0 ${checked ? "bg-ink-900" : "bg-ink-100"}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="label-uppercase group-hover:text-ink-700 transition-colors">{label}</span>
    </button>
  );
}

/* ── Skeleton / empty states ── */

function HeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-ink-100 animate-pulse rounded-lg w-64" />
      <div className="space-y-2">
        <div className="h-3 bg-ink-100 animate-pulse rounded-lg w-full max-w-xl" />
        <div className="h-3 bg-ink-100 animate-pulse rounded-lg w-2/3 max-w-lg" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-3 bg-ink-100 animate-pulse rounded-lg w-40 mb-6" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-ink-100 overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-ink-100 bg-white">
            <div className="h-3 bg-ink-100 animate-pulse w-48 rounded-lg" />
          </div>
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-[58%] h-[200px] sm:h-[260px] bg-parchment-200 animate-pulse" />
            <div className="sm:w-[42%] h-[100px] sm:h-[260px] flex">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="flex-1 bg-parchment-300 animate-pulse" style={{ animationDelay: `${j * 50}ms` }} />
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
      <p className="font-sans text-sm text-ink-500 font-light max-w-xs mx-auto leading-relaxed">{body}</p>
      <Link href="/" className="label-uppercase inline-flex items-center gap-2 mt-6 hover:text-ink-700 transition-colors">
        <BackArrow />
        Back to search
      </Link>
    </div>
  );
}

function BackArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M11 6H1M5 1L1 6L5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 9L9 1M9 1H4M9 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
