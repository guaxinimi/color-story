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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const slug = q.replace(/ /g, "_");
  const commonsParams = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: q,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|mime|thumburl",
    iiurlwidth: "900",
    format: "json",
    origin: "*",
  });

  const [wikiRes, commonsRes] = await Promise.all([
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    }),
    fetch(`https://commons.wikimedia.org/w/api.php?${commonsParams}`, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    }),
  ]);

  let title = q;
  let description = "";
  let wikiUrl = "";
  if (wikiRes.ok) {
    try {
      const wiki = await wikiRes.json();
      title = wiki.title ?? q;
      description = (wiki.extract ?? "").slice(0, 300);
      wikiUrl = wiki.content_urls?.desktop?.page ?? "";
    } catch {}
  }

  let images: PaletteImage[] = [];
  if (commonsRes.ok) {
    try {
      const data = await commonsRes.json();
      const pages: Record<string, unknown>[] = Object.values(data.query?.pages ?? {});
      images = pages
        .filter(p => {
          const info = (p.imageinfo as { url?: string; mime?: string }[])?.[0];
          if (!info?.url || BLOCKED_MIME.has(info.mime ?? "")) return false;
          const title = ((p.title as string) ?? "").toLowerCase();
          return !BLOCKED_KW.some(kw => title.includes(kw));
        })
        .map(p => {
          const info = (p.imageinfo as { url: string; mime: string; thumburl?: string }[])[0];
          const fileTitle = ((p.title as string) ?? "").replace(/^File:/, "");
          const caption = fileTitle.replace(/\.[^.]+$/, "").replace(/_/g, " ");
          return { url: info.thumburl ?? info.url, alt: fileTitle, caption };
        });
    } catch {}
  }

  return NextResponse.json({ title, description, wikiUrl, images });
}
