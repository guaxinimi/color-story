import { NextRequest, NextResponse } from "next/server";

const UA = "ColorStory/1.0 (https://github.com/guaxinimi/color-story)";
const BLOCKED_MIME = new Set(["image/svg+xml", "image/gif", "image/tiff", "image/x-xcf"]);
const BLOCKED_KW = [
  "logo", "icon", "flag", "seal", "coa", "emblem", "coat_of_arms",
  "pictogram", "map", "graph", "chart", "diagram", "stamp",
  "commons-logo", "wikidata", "question_mark", "ambox", "wikisource",
  "symbol", "button", "arrow", "banner", "badge",
];

interface PaletteImage { url: string; alt: string; caption: string }

function filterAndMap(pages: Record<string, unknown>[]): PaletteImage[] {
  return pages
    .filter(p => {
      const info = (p.imageinfo as { url?: string; mime?: string }[])?.[0];
      if (!info?.url || BLOCKED_MIME.has(info.mime ?? "")) return false;
      const t = ((p.title as string) ?? "").toLowerCase();
      return !BLOCKED_KW.some(kw => t.includes(kw));
    })
    .map(p => {
      const info = (p.imageinfo as { url: string; thumburl?: string }[])[0];
      const fileTitle = ((p.title as string) ?? "").replace(/^File:/, "");
      return {
        url: info.thumburl ?? info.url,
        alt: fileTitle,
        caption: fileTitle.replace(/\.[^.]+$/, "").replace(/_/g, " "),
      };
    });
}

function imgParams(titles: string): URLSearchParams {
  return new URLSearchParams({
    action: "query",
    titles,
    generator: "images",
    gimlimit: "50",
    prop: "imageinfo",
    iiprop: "url|mime|thumburl",
    iiurlwidth: "900",
    format: "json",
    origin: "*",
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const slug = q.replace(/ /g, "_");

  // Phase 1: resolve canonical title (follows redirects + disambiguation)
  const wikiRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
  );

  let title = q, description = "", wikiUrl = "", canonicalSlug = slug;
  if (wikiRes.ok) {
    try {
      const wiki = await wikiRes.json();
      title        = wiki.title ?? q;
      description  = (wiki.extract ?? "").slice(0, 300);
      wikiUrl      = wiki.content_urls?.desktop?.page ?? "";
      canonicalSlug = title.replace(/ /g, "_");
    } catch {}
  }

  // Phase 2 (parallel): images in the article + articles linked from it
  const linksParams = new URLSearchParams({
    action: "query",
    titles: canonicalSlug,
    prop: "links",
    pllimit: "10",
    plnamespace: "0",
    format: "json",
    origin: "*",
  });

  const [articleImgRes, linksRes] = await Promise.all([
    fetch(`https://en.wikipedia.org/w/api.php?${imgParams(canonicalSlug)}`,
      { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }),
    fetch(`https://en.wikipedia.org/w/api.php?${linksParams}`,
      { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }),
  ]);

  let images: PaletteImage[] = [];
  if (articleImgRes.ok) {
    try {
      const data = await articleImgRes.json();
      images = filterAndMap(Object.values(data.query?.pages ?? {}));
    } catch {}
  }

  // Phase 3: images from linked articles (cast, director, related topics, etc.)
  let linkedTitles: string[] = [];
  if (linksRes.ok) {
    try {
      const data  = await linksRes.json();
      const page  = Object.values(data.query?.pages ?? {})[0] as Record<string, unknown>;
      linkedTitles = ((page?.links ?? []) as { title: string }[])
        .map(l => l.title)
        .slice(0, 8);
    } catch {}
  }

  if (linkedTitles.length > 0) {
    const linkedImgRes = await fetch(
      `https://en.wikipedia.org/w/api.php?${imgParams(linkedTitles.join("|"))}`,
      { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
    );
    if (linkedImgRes.ok) {
      try {
        const data = await linkedImgRes.json();
        const linkedImages = filterAndMap(Object.values(data.query?.pages ?? {}));
        const seen = new Set(images.map(i => i.url));
        images = [...images, ...linkedImages.filter(i => !seen.has(i.url))];
      } catch {}
    }
  }

  return NextResponse.json({ title, description, wikiUrl, images: images.slice(0, 20) });
}
