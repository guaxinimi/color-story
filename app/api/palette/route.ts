import { NextRequest, NextResponse } from 'next/server';

// Filenames containing these strings are almost certainly icons / diagrams / flags
const BLOCKED = [
  'logo', 'icon', 'flag', 'seal', 'coa', 'emblem', 'signature',
  'coat_of_arms', 'pictogram', 'symbol', 'map', 'graph', 'chart',
  'diagram', 'stamp', 'button', 'commons-logo', 'wikidata', 'portal',
  'question_mark', 'edit-clear', 'ambox', 'arrow', 'wikisource',
];

interface SrcsetItem {
  src: string;
  scale: string;
}

interface MediaItem {
  title: string;
  type: string;
  showInGallery?: boolean;
  srcset?: SrcsetItem[];
  original?: { source: string; width: number; height: number };
  caption?: { text?: string };
}

function isUsable(item: MediaItem): boolean {
  if (item.type !== 'image') return false;

  const t = (item.title ?? '').toLowerCase();
  if (t.endsWith('.svg') || t.endsWith('.gif')) return false;
  if (BLOCKED.some(kw => t.includes(kw))) return false;

  // Prefer images that are known to be >= 300px wide
  const origW = item.original?.width;
  if (origW !== undefined) return origW >= 300;

  // Fall back to parsing the width from a srcset thumb URL (e.g. /640px-Filename.jpg)
  const maxParsed = Math.max(
    ...(item.srcset ?? []).map(s => {
      const m = s.src.match(/\/(\d+)px-/);
      return m ? Number(m[1]) : 0;
    }),
    0,
  );
  // If we couldn't determine size, allow it through (original might still be large)
  return maxParsed === 0 || maxParsed >= 300;
}

function bestUrl(item: MediaItem): string | null {
  const srcset = item.srcset ?? [];
  if (srcset.length) {
    // Last entry is typically the highest-resolution srcset variant
    const src = srcset[srcset.length - 1].src;
    return src.startsWith('//') ? `https:${src}` : src;
  }
  return item.original?.source ?? null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const slug = encodeURIComponent(q.replace(/ /g, '_'));
  const ua = 'ColorStory/1.0 (educational project; https://github.com/example/colorstory)';

  try {
    const [mediaRes, summaryRes] = await Promise.all([
      fetch(`https://en.wikipedia.org/api/rest_v1/page/media-list/${slug}`, {
        headers: { 'User-Agent': ua },
        next: { revalidate: 3600 },
      }),
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
        headers: { 'User-Agent': ua },
        next: { revalidate: 3600 },
      }),
    ]);

    if (mediaRes.status === 404) {
      return NextResponse.json(
        { error: `No Wikipedia article found for "${q}". Try a different spelling or a more specific term.` },
        { status: 404 },
      );
    }

    if (!mediaRes.ok) {
      return NextResponse.json(
        { error: `Wikipedia returned an error (${mediaRes.status}). Please try again.` },
        { status: 502 },
      );
    }

    const [media, summary] = await Promise.all([
      mediaRes.json() as Promise<{ items?: MediaItem[] }>,
      summaryRes.ok ? (summaryRes.json() as Promise<Record<string, unknown>>) : Promise.resolve(null),
    ]);

    const images = (media.items ?? [])
      .filter(isUsable)
      // Gallery images first, then the rest
      .sort((a, b) => (b.showInGallery ? 1 : 0) - (a.showInGallery ? 1 : 0))
      .slice(0, 5)
      .flatMap(item => {
        const url = bestUrl(item);
        if (!url) return [];
        return [{
          url,
          alt: (item.title ?? '')
            .replace(/^File:/, '')
            .replace(/_/g, ' ')
            .replace(/\.[^.]+$/, ''),
          caption: item.caption?.text ?? '',
        }];
      });

    return NextResponse.json({
      title: (summary?.title as string) ?? q,
      description: ((summary?.extract as string) ?? '').slice(0, 300),
      wikiUrl:
        ((summary as Record<string, Record<string, Record<string, string>>>)
          ?.content_urls?.desktop?.page) ??
        `https://en.wikipedia.org/wiki/${slug}`,
      images,
    });
  } catch (err) {
    console.error('[/api/palette]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
