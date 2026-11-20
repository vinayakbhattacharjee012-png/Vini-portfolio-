import type { Envelope, NewsItem, NewsTag, Sport } from '../src/lib/types.ts';
import { getJson } from './http.ts';

/** Public ESPN news feeds (no key). Football and cricket, as listed in the brief. */
const FEEDS: { sport: Sport; league: string; url: string }[] = [
  { sport: 'football', league: 'Premier League', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news' },
  { sport: 'football', league: 'Champions League', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/news' },
  { sport: 'cricket', league: 'Cricket', url: 'https://site.api.espn.com/apis/site/v2/sports/cricket/8676/news' },
  { sport: 'cricket', league: 'IPL', url: 'https://site.api.espn.com/apis/site/v2/sports/cricket/8048/news' },
];

// Checked in priority order: an injury story that mentions a transfer is still an injury story.
const RULES: [NewsTag, RegExp][] = [
  ['Injury', /\b(injur\w*|ruled out|sidelined|hamstring|knee|ankle|ACL|fitness|scan|out for \d+|setback|muscle|concussion)\b/i],
  ['Transfer', /\b(transfer\w*|signs?|signed|signing|loan\w*|bid|fee|contract|release clause|agrees? (a )?deal|joins?|move to|swap|sale|buy|bids?)\b/i],
  ['Squad', /\b(squad|call-?up|selected|selection|dropped|retain\w*|auction|captain\w*|head coach|manager|appoint\w*|sacked|roster|picked|omitted|named)\b/i],
];

/** Tag a story from its headline and description. Falls back to Match News. */
export function classifyNews(text: string): NewsTag {
  for (const [tag, re] of RULES) if (re.test(text)) return tag;
  return 'Match News';
}

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();

async function feed(f: (typeof FEEDS)[number]): Promise<NewsItem[]> {
  const json: any = await getJson(f.url, 8000);
  return (json?.articles ?? []).map((a: any): NewsItem => {
    const headline = clean(a.headline);
    const summary = clean(a.description);
    return {
      headline,
      summary,
      tag: classifyNews(`${headline} ${summary}`),
      league: f.league,
      url: a.links?.web?.href ?? a.links?.api?.news?.href,
      image: a.images?.[0]?.url,
      published: a.published,
    };
  });
}

/** Fetch every feed for a sport, merge, de-duplicate and sort newest first. Throws if all fail. */
export async function espnNews(sport: Sport): Promise<Envelope<NewsItem[]>> {
  const results = await Promise.allSettled(FEEDS.filter((f) => f.sport === sport).map(feed));
  const ok = results.filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled');
  if (!ok.length) throw new Error('ESPN news blocked or unavailable');
  const seen = new Set<string>();
  const items = ok
    .flatMap((r) => r.value)
    .filter((n) => n.headline && !seen.has(n.headline.toLowerCase()) && seen.add(n.headline.toLowerCase()))
    .sort((a, b) => Date.parse(b.published ?? '0') - Date.parse(a.published ?? '0'))
    .slice(0, 40);
  const failed = results.length - ok.length;
  return {
    data: items,
    source: 'espn',
    fetchedAt: new Date().toISOString(),
    note: failed ? `${failed} feed(s) unavailable` : undefined,
  };
}
