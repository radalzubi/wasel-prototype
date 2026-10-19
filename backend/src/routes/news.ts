import { Router } from 'express';
import Parser from 'rss-parser';

const router = Router();

// Browser-like UA to avoid blocks
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['enclosure', 'enclosure', { keepArray: false }],
    ],
  },
  timeout: 10000,
});

interface NewsArticle {
  id: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  url: string;
  image: string;
  sourceLogo: string;
  source: string;
  sourceUrl: string;
  category: string;
  publishedAt: string;
  timeAgoMins: number;
  isJordanSpecific: boolean;
  hasRealImage: boolean;
}

// 5-minute cache
let cache: { data: NewsArticle[]; expiresAt: number } | null = null;

// Category fallback images (high-quality, relevant stock images)
const FALLBACK_IMAGES: Record<string, string> = {
  Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  Business:   'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  City:       'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=800&q=80',
  Sports:     'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
  Politics:   'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
  Lifestyle:  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
};

// Source logos — shown when the RSS doesn't include an article image
// These are the actual agency logos hosted on their own CDN / favicon endpoints
const SOURCE_LOGOS: Record<string, string> = {
  'BBC Middle East':   'https://news.bbcimg.co.uk/nol/shared/img/bbc_news_120x60.gif',
  'Al Jazeera':        'https://www.aljazeera.com/images/logo_new.png',
  'Middle East Eye':   'https://www.middleeasteye.net/sites/default/files/2019-10/MEE_Logo_White_0.png',
  'Google News Jordan':'https://news.google.com/images/icons/product/gnews-128.png',
};

// RSS feeds that are confirmed accessible from server-side requests
const FEEDS: { url: string; name: string; siteUrl: string; lang: 'en' | 'ar' }[] = [
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC Middle East', siteUrl: 'https://www.bbc.com/news/world/middle_east', lang: 'en' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', siteUrl: 'https://www.aljazeera.com', lang: 'en' },
  { url: 'https://www.middleeasteye.net/rss', name: 'Middle East Eye', siteUrl: 'https://www.middleeasteye.net', lang: 'en' },
  { url: 'https://news.google.com/rss/search?q=jordan+amman&hl=en-JO&gl=JO&ceid=JO:en', name: 'Google News Jordan', siteUrl: 'https://news.google.com', lang: 'en' },
];

// Jordan/Amman relevance keywords
const JORDAN_KW = /jordan|amman|hashemite|petra|aqaba|zarqa|irbid|الأردن|عمان|البتراء/i;

function categorize(text: string): string {
  const t = text.toLowerCase();
  if (t.match(/tech|digital|ai|app|startup|cyber|software|internet/)) return 'Technology';
  if (t.match(/economy|business|market|bank|investment|trade|finance/)) return 'Business';
  if (t.match(/amman|city|municipality|street|traffic|urban/)) return 'City';
  if (t.match(/sport|football|soccer|olympic|athlete|team|match|tournament/)) return 'Sports';
  if (t.match(/minister|parliament|election|policy|government|official|king|royal/)) return 'Politics';
  return 'Lifestyle';
}

function extractImage(item: any, category: string): { image: string; hasRealImage: boolean } {
  const mc  = (item as any).mediaContent;
  const mt  = (item as any).mediaThumbnail;
  const enc = (item as any).enclosure;

  if (mc?.$.url)  return { image: mc.$.url,  hasRealImage: true };
  if (mt?.$.url)  return { image: mt.$.url,  hasRealImage: true };
  if (enc?.url && enc?.type?.startsWith('image')) return { image: enc.url, hasRealImage: true };

  const content = item.content || item['content:encoded'] || item.contentSnippet || '';
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch?.[1]) return { image: imgMatch[1], hasRealImage: true };

  // Google News items sometimes encode an image inside their redirect URL
  const link = item.link || '';
  if (link.includes('news.google.com')) {
    // The Google News RSS wraps the article link — use the category fallback
    return { image: FALLBACK_IMAGES[category] ?? FALLBACK_IMAGES.Lifestyle, hasRealImage: false };
  }

  return { image: FALLBACK_IMAGES[category] ?? FALLBACK_IMAGES.Lifestyle, hasRealImage: false };
}

async function fetchFeed(
  url: string,
  sourceName: string,
  sourceUrl: string,
  lang: 'en' | 'ar'
): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(url);
    const now = Date.now();
    const articles: NewsArticle[] = [];

    for (const item of feed.items.slice(0, 15)) {
      const title = (item.title || '').replace(/\s*[-|]\s*(?:BBC|Al Jazeera|Middle East Eye)[^-|]*$/i, '').trim();
      const link = item.link || item.guid || sourceUrl;
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const timeAgoMins = Math.max(0, Math.floor((now - pubDate.getTime()) / 60_000));
      const category = categorize(title + ' ' + (item.contentSnippet || ''));
      const { image, hasRealImage } = extractImage(item, category);

      const rawSummary = item.contentSnippet || item.summary || '';
      const summary = rawSummary.replace(/\[.*?\]/g, '').replace(/<[^>]+>/g, '').trim().slice(0, 220);

      const isJordanSpecific = JORDAN_KW.test(title + ' ' + summary);

      // Use last 20 chars of URL as unique id (avoids shared prefix collision)
      const uniquePart = link.slice(-40) + title.slice(0, 10);
      const id = Buffer.from(uniquePart).toString('base64').slice(0, 20);

      articles.push({
        id,
        titleEn: lang === 'en' ? title : '',
        titleAr: lang === 'ar' ? title : title,
        summaryEn: lang === 'en' ? summary : '',
        summaryAr: lang === 'ar' ? summary : summary,
        url: link,
        image,
        hasRealImage,
        sourceLogo: SOURCE_LOGOS[sourceName] ?? '',
        source: sourceName,
        sourceUrl,
        category,
        publishedAt: pubDate.toISOString(),
        timeAgoMins,
        isJordanSpecific,
      });
    }
    return articles;
  } catch (err) {
    console.warn(`[news] ${sourceName}: ${(err as Error).message.slice(0, 80)}`);
    return [];
  }
}

async function fetchAllNews(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    FEEDS.map(f => fetchFeed(f.url, f.name, f.siteUrl, f.lang))
  );

  const all: NewsArticle[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = all.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Sort: Jordan-specific first, then by recency
  return unique.sort((a, b) => {
    if (a.isJordanSpecific !== b.isJordanSpecific) return a.isJordanSpecific ? -1 : 1;
    return a.timeAgoMins - b.timeAgoMins;
  });
}

router.get('/', async (req, res) => {
  const { category = 'all', limit = '20' } = req.query as Record<string, string>;

  if (cache && Date.now() < cache.expiresAt) {
    let articles = cache.data;
    if (category !== 'all') articles = articles.filter(a => a.category === category);
    return res.json({ articles: articles.slice(0, Number(limit)), fromCache: true, total: cache.data.length });
  }

  const articles = await fetchAllNews();
  cache = { data: articles, expiresAt: Date.now() + 5 * 60_000 };

  let filtered = articles;
  if (category !== 'all') filtered = filtered.filter(a => a.category === category);

  res.json({ articles: filtered.slice(0, Number(limit)), fromCache: false, total: articles.length });
});

export { router as newsRoutes };
