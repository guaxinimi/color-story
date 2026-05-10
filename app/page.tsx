"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

const FEATURED = ["Frida Kahlo", "Autumn in Japan", "Art Deco"];

const MORE_TOPICS = [
  "Claude Monet",
  "Cherry blossoms",
  "Venetian carnival",
  "Turner seascapes",
  "Japanese lacquerware",
];

export default function Home() {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const router = useRouter();

  const navigate = (q: string) => {
    setShowDropdown(false);
    router.push(`/results?q=${encodeURIComponent(q.trim())}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      navigate(suggestions[activeIdx]);
    } else if (query.trim()) {
      navigate(query.trim());
    }
  };

  // Debounced Wikipedia opensearch for autocomplete
  useEffect(() => {
    const q = query.trim();
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
      } catch { /* ignore network errors */ }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="max-w-2xl w-full mx-auto space-y-10">
            {/* Eyebrow */}
            <p className="label-uppercase">
              A tool for painters &amp; illustrators
            </p>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl text-ink-900 leading-tight tracking-tight">
                Every subject
                <br />
                <em className="text-sienna not-italic">has a palette.</em>
              </h1>
              <p className="font-sans text-base sm:text-lg text-ink-500 font-light leading-relaxed max-w-md mx-auto">
                Type any topic and we&rsquo;ll extract its defining colors
                from Wikipedia article images.
              </p>
            </div>

            {/* Search form */}
            <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
              <div className="relative group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
                  onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  onKeyDown={(e) => {
                    if (!showDropdown || suggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveIdx(i => Math.max(i - 1, -1));
                    } else if (e.key === "Escape") {
                      setShowDropdown(false);
                      setActiveIdx(-1);
                    }
                  }}
                  placeholder="Try 'Frida Kahlo' or 'Autumn in Japan'…"
                  className="
                    w-full px-6 py-4 pr-14
                    bg-white border border-ink-100
                    font-sans text-base text-ink-900 placeholder-ink-300
                    rounded-none shadow-sm outline-none
                    focus:border-ink-700
                    transition-colors duration-200
                  "
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="
                    absolute right-0 top-0 bottom-0 px-4
                    flex items-center justify-center
                    text-ink-300 hover:text-ink-900
                    transition-colors duration-200
                    border-l border-ink-100
                  "
                >
                  <SearchIcon />
                </button>

                {/* Autocomplete dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <ul
                    role="listbox"
                    className="absolute top-full left-0 right-0 z-50 bg-white border border-t-0 border-ink-100 shadow-lg"
                  >
                    {suggestions.map((s, i) => (
                      <li key={s} role="option" aria-selected={i === activeIdx}>
                        <button
                          type="button"
                          className={`
                            w-full text-left px-6 py-2.5
                            font-sans text-sm transition-colors duration-100
                            ${i === activeIdx
                              ? "bg-parchment-100 text-ink-900"
                              : "text-ink-700 hover:bg-parchment-50 hover:text-ink-900"
                            }
                          `}
                          onMouseDown={(e) => { e.preventDefault(); navigate(s); }}
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>

            {/* Featured chips — navigate directly */}
            <div className="space-y-3">
              <p className="label-uppercase">Start here</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {FEATURED.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => router.push(`/results?q=${encodeURIComponent(topic)}`)}
                    className="
                      inline-flex items-center gap-2
                      px-5 py-2.5
                      bg-ink-900 text-parchment-50
                      font-sans text-sm tracking-wide
                      hover:bg-ink-700
                      transition-colors duration-200
                    "
                  >
                    {topic}
                    <ArrowRight />
                  </button>
                ))}
              </div>
            </div>

            {/* More topics — fill input */}
            <div className="space-y-2">
              <p className="label-uppercase">Or explore</p>
              <div className="flex flex-wrap justify-center gap-2">
                {MORE_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setQuery(topic)}
                    className="
                      px-4 py-1.5
                      border border-ink-100
                      font-sans text-sm text-ink-500
                      hover:border-ink-700 hover:text-ink-900
                      transition-colors duration-200
                      bg-white
                    "
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Color strip decoration */}
        <ColorStrip />

        {/* How it works */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="divider mb-12" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-8">
              {[
                {
                  number: "01",
                  heading: "Search any topic",
                  body: "Enter a subject — an artist, a movement, a place, or a material.",
                },
                {
                  number: "02",
                  heading: "We pull the images",
                  body: "Color Story fetches representative images from the Wikipedia article.",
                },
                {
                  number: "03",
                  heading: "Receive your palette",
                  body: "Five to eight dominant colors, extracted and displayed as elegant swatches.",
                },
              ].map((step) => (
                <div key={step.number} className="space-y-3">
                  <span className="font-serif text-4xl text-ink-100 leading-none">
                    {step.number}
                  </span>
                  <h3 className="font-serif text-lg text-ink-900">
                    {step.heading}
                  </h3>
                  <p className="font-sans text-sm text-ink-500 font-light leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ColorStrip() {
  const colors = [
    "#C4846A",
    "#A5694F",
    "#DDD5C5",
    "#6B6358",
    "#3D3830",
    "#E0B09A",
    "#1A1714",
    "#A89E93",
    "#EDE7DB",
    "#C4956A",
    "#8B7355",
    "#D4A090",
  ];

  return (
    <div className="flex w-full h-2">
      {colors.map((color, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-100 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-sans text-xs text-ink-300 tracking-wide">
          Color Story &mdash; built for painters &amp; illustrators
        </p>
        <p className="font-sans text-xs text-ink-300 tracking-wide">
          Palette data sourced via Wikipedia
        </p>
      </div>
    </footer>
  );
}

function ArrowRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 6H11M7 2L11 6L7 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
