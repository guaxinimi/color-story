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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const slug = q.replace(/ /g, "_");

  // Phase 1: resolve the canonical Wikipedia title (handles redirects + disambiguation)
  const wikiRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
  );

  let title = q;
  let description = "";
  let wikiUrl = "";
  let canonicalSlug = slug;
  if (wikiRes.ok) {
    try {
      const wiki = await wikiRes.json();
      title = wiki.title ?? q;
      description = (wiki.extract ?? "").slice(0, 300);
      wikiUrl = wiki.content_urls?.desktop?.page ?? "";
      canonicalSlug = title.replace(/ /g, "_");
    } catch {}
  }

  // Phase 2: fetch only images that appear in the Wikipedia article itself
  const articleImgParams = new URLSearchParams({
    action: "query",
    titles: canonicalSlug,
    generator: "images",
    gimlimit: "50",
    prop: "imageinfo",
    iiprop: "url|mime|thumburl",
    iiurlwidth: "900",
    format: "json",
    origin: "*",
  });

  const articleImgRes = await fetch(
    `https://en.wikipedia.org/w/api.php?${articleImgParams}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
  );

  let images: PaletteImage[] = [];
  if (articleImgRes.ok) {
    try {
      const data = await articleImgRes.json();
      const pages: Record<string, unknown>[] = Object.values(data.query?.pages ?? {});
      images = filterAndMap(pages).slice(0, 20);
    } catch {}
  }

  return NextResponse.json({ title, description, wikiUrl, images });
}
