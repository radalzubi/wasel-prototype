import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, Zap, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { NEWS_ARTICLES, NewsArticle } from '../data/mockData';

const glassCard: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
};

const categoryAr: Record<string, string> = {
  Technology: 'تكنولوجيا',
  Business: 'أعمال',
  City: 'المدينة',
  Sports: 'رياضة',
  Politics: 'سياسة',
  Lifestyle: 'أسلوب حياة',
};

const CATEGORY_LABEL: Record<string, string> = {
  Technology: 'Tech',
  Business: 'Biz',
  City: 'City',
  Sports: 'Sport',
  Politics: 'Gov',
  Lifestyle: 'Life',
};

function openSource(url: string | undefined) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function ArticleImage({
  src,
  category,
  className,
}: {
  src?: string;
  category?: string;
  className: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src || '');

  useEffect(() => {
    setCurrentSrc(src || '');
  }, [src]);

  if (!currentSrc) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(212,168,67,0.18), rgba(11,21,38,0.96))',
          color: 'rgba(255,255,255,0.9)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {CATEGORY_LABEL[category || 'Lifestyle'] || 'News'}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt=""
      className={className}
      onError={() => setCurrentSrc('')}
    />
  );
}

function AdBanner({ lang, isRTL, fontFamily }: { lang: string; isRTL: boolean; fontFamily: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden relative mb-3"
      style={{ background: 'var(--bg-card)', padding: '14px 16px', border: '1px solid var(--border)', borderLeft: '2px solid var(--accent-subtle)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className="rounded px-2 py-0.5 inline-block mb-1"
            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', fontSize: 9, fontFamily, fontWeight: 700, color: 'var(--accent)' }}
          >
            {lang === 'ar' ? 'محتوى مموّل' : 'SPONSORED'}
          </div>
          <div style={{ fontFamily, fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 2 }}>
            {lang === 'ar' ? 'مطعم البتراء — وسط البلد' : 'Al-Petra Restaurant — Downtown'}
          </div>
          <div style={{ fontFamily, fontSize: 12, color: 'var(--text-secondary)' }}>
            {lang === 'ar' ? 'احجز طاولة · خصم 20% عبر واصل' : 'Reserve a table · 20% off via Wasel'}
          </div>
        </div>
        <div
          className="rounded-xl flex items-center justify-center"
          style={{ width: 48, height: 48, background: 'var(--accent-subtle)', flexShrink: 0 }}
        >
          <span style={{ fontFamily, fontSize: 12, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.08em' }}>AD</span>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({
  article, lang, isRTL, fontFamily, featured = false, index = 0,
}: {
  article: NewsArticle; lang: string; isRTL: boolean; fontFamily: string; featured?: boolean; index?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const formatTimeAgo = (min: number) => {
    if (min < 60) return lang === 'ar' ? `منذ ${min} دقيقة` : `${min}m ago`;
    const h = Math.floor(min / 60);
    return lang === 'ar' ? `منذ ${h} ساعة` : `${h}h ago`;
  };

  if (featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="rounded-2xl overflow-hidden mb-3"
        style={{ border: '1px solid var(--border)', cursor: article.url ? 'pointer' : 'default' }}
        onClick={() => openSource(article.url)}
      >
        <div className="relative" style={{ height: 160 }}>
          <ArticleImage
            src={article.image}
            category={article.category}
            className="w-full h-full object-cover"
          />
          {/* Keep the image overlay gradient as-is — it's on top of a photo */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,13,26,0.97) 0%, rgba(6,13,26,0.15) 60%)' }} />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div
              className="rounded-full px-2 py-0.5 inline-block mb-1.5"
              style={{ background: 'var(--accent)', fontSize: 9.5, fontFamily, fontWeight: 700, color: '#0B1526' }}
            >
              {lang === 'ar' ? article.categoryAr : article.category}
            </div>
            <div style={{ fontFamily, fontWeight: 700, fontSize: 14.5, color: 'rgba(255,255,255,0.95)', lineHeight: 1.3 }}>
              {lang === 'ar' ? article.titleAr : article.titleEn}
            </div>
          </div>
        </div>
        <div className="p-3.5" style={{ background: 'var(--bg-card)' }}>
          <p style={{ fontFamily, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 10 }}>
            {lang === 'ar' ? article.summaryAr : article.summaryEn}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1" style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
                <Clock size={10} />{formatTimeAgo(article.timeAgo)}
              </span>
              <span className="flex items-center gap-1" style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
                <Zap size={10} />{article.readMinutes} {lang === 'ar' ? 'دقيقة قراءة' : 'min read'}
              </span>
            </div>
            {article.url && (
              <button
                onClick={(e) => { e.stopPropagation(); openSource(article.url); }}
                className="flex items-center gap-1 rounded-full px-2.5 py-1"
                style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', fontFamily, fontSize: 10.5, color: 'var(--accent)', fontWeight: 600 }}
              >
                {lang === 'ar' ? 'اقرأ المزيد' : 'Read more'} <ExternalLink size={9} />
              </button>
            )}
          </div>
          {article.source && (
            <div style={{ fontFamily, fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
              {lang === 'ar' ? 'المصدر:' : 'Source:'} {article.source}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden mb-2"
      style={glassCard}
    >
      <button
        onClick={() => article.url ? openSource(article.url) : setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3"
        style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
      >
        <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ width: 70, height: 70, background: 'var(--bg-input)' }}>
          <ArticleImage
            src={article.image}
            category={article.category}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <div
            className="rounded-full px-2 py-0.5 inline-block mb-1"
            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', fontSize: 9, fontFamily, fontWeight: 700, color: 'var(--accent)' }}
          >
            {lang === 'ar' ? article.categoryAr : article.category}
          </div>
          <div style={{ fontFamily, fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 5 }}>
            {lang === 'ar' ? article.titleAr : article.titleEn}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{formatTimeAgo(article.timeAgo)}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>{article.readMinutes} {lang === 'ar' ? 'د' : 'min'}</span>
            {article.source && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ fontFamily, fontSize: 10.5, color: 'var(--text-tertiary)' }}>{article.source}</span>
              </>
            )}
          </div>
        </div>
        {article.url && <ExternalLink size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />}
      </button>

      <AnimatePresence>
        {expanded && !article.url && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3.5 pb-3.5" style={{ borderTop: '1px solid var(--border)' }}>
              <p style={{ fontFamily, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, paddingTop: 10 }}>
                {lang === 'ar' ? article.summaryAr : article.summaryEn}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SkeletonCard({ featured = false }: { featured?: boolean }) {
  if (featured) {
    return (
      <div className="rounded-2xl overflow-hidden mb-3" style={{ border: '1px solid var(--border)' }}>
        <div style={{ height: 160, background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div className="p-3.5" style={{ background: 'var(--bg-card)' }}>
          <div style={{ height: 12, width: '80%', background: 'var(--bg-input)', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 12, width: '60%', background: 'var(--bg-input)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden mb-2 flex items-center gap-3 p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ width: 70, height: 70, background: 'var(--bg-input)', borderRadius: 12, flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div className="flex-1">
        <div style={{ height: 10, width: '40%', background: 'var(--bg-input)', borderRadius: 5, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 12, width: '90%', background: 'var(--bg-input)', borderRadius: 5, marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 10, width: '50%', background: 'var(--bg-input)', borderRadius: 5, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

export function NewsScreen() {
  const { lang, isRTL, t } = useLanguage();
  const fontFamily = isRTL ? 'Cairo, sans-serif' : 'Sora, sans-serif';
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const categories = [
    { id: 'all', en: 'All', ar: 'الكل' },
    { id: 'Technology', en: 'Tech', ar: 'تكنولوجيا' },
    { id: 'Business', en: 'Business', ar: 'أعمال' },
    { id: 'City', en: 'City', ar: 'المدينة' },
    { id: 'Sports', en: 'Sports', ar: 'رياضة' },
    { id: 'Politics', en: 'Politics', ar: 'سياسة' },
    { id: 'Lifestyle', en: 'Lifestyle', ar: 'أسلوب حياة' },
  ];

  const fetchNews = async (category = 'all') => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const apiBase = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');
      const res = await fetch(`${apiBase}/api/news?lang=${lang}&category=${category}&limit=20`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.articles && data.articles.length > 0) {
        const mapped: NewsArticle[] = data.articles.map((a: any, idx: number) => {
          const image = (a.image && a.hasRealImage !== false) ? a.image : '';
          return {
            id: a.id || String(idx),
            titleEn: a.titleEn || a.title || '',
            titleAr: a.titleAr || a.titleEn || '',
            summaryEn: a.summaryEn || a.summary || '',
            summaryAr: a.summaryAr || a.summaryEn || '',
            image,
            category: a.category || 'City',
            categoryAr: categoryAr[a.category] || a.category,
            featured: idx === 0,
            timeAgo: a.timeAgoMins ?? 30,
            readMinutes: Math.max(1, Math.round((a.summaryEn?.length || 200) / 200)),
            url: a.url,
            source: a.source || 'Jordan News',
          };
        });
        setArticles(mapped);
      }
    } catch (err) {
      console.error('News fetch failed, using mock data:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load news');
      // Fallback to mock data if backend is unavailable
      if (articles.length === 0) {
        setArticles(NEWS_ARTICLES);
      }
    } finally {
      setLastUpdated(new Date());
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(activeCategory);
    const interval = setInterval(() => fetchNews(activeCategory), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeCategory, lang]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
  };

  const refresh = () => {
    fetchNews(activeCategory);
  };

  const filtered = activeCategory === 'all'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  const featured = filtered.find(a => a.featured);
  const rest = filtered.filter(a => !a.featured);

  const formatUpdated = () => {
    const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (diff < 10) return lang === 'ar' ? 'الآن' : 'just now';
    if (diff < 60) return lang === 'ar' ? `منذ ${diff} ثانية` : `${diff}s ago`;
    return lang === 'ar' ? `منذ ${Math.floor(diff / 60)} دقيقة` : `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'var(--bg-primary)', direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 wasel-safe-top pb-3"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 style={{ fontFamily, fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>{t('newsFeed')}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
            <span style={{ fontFamily, fontSize: 11, color: 'var(--text-tertiary)' }}>
              {t('lastUpdated')} {formatUpdated()} · {t('autoRefresh')}
            </span>
          </div>
        </div>
        <button
          onClick={refresh}
          className="rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <RefreshCw size={15} color="var(--text-secondary)" className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Category filter */}
      <div
        className="flex gap-2 px-4 py-2.5 overflow-x-auto"
        style={{ background: 'var(--bg-surface)', paddingBottom: 10, scrollbarWidth: 'none', borderBottom: '1px solid var(--border)' }}
      >
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className="rounded-full px-3 py-1.5 flex-shrink-0"
            style={{
              background: activeCategory === cat.id ? 'var(--chip-active-bg)' : 'var(--chip-bg)',
              color: activeCategory === cat.id ? 'var(--chip-active-text)' : 'var(--text-secondary)',
              fontFamily,
              fontSize: 12,
              fontWeight: activeCategory === cat.id ? 700 : 400,
              border: activeCategory === cat.id ? 'none' : '1px solid var(--border)',
              transition: 'all 0.15s',
            }}
          >
            {lang === 'ar' ? cat.ar : cat.en}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 wasel-scroll-pad" style={{ scrollbarWidth: 'none' }}>
        <AdBanner lang={lang} isRTL={isRTL} fontFamily={fontFamily} />

        {isLoading ? (
          <>
            <SkeletonCard featured />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {featured && (
              <ArticleCard article={featured} lang={lang} isRTL={isRTL} fontFamily={fontFamily} featured index={0} />
            )}

            <div className="flex items-center justify-between mb-2.5 mt-1">
              <span style={{ fontFamily, fontWeight: 700, fontSize: 12.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('topStories')}
              </span>
              <span style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {filtered.length} {lang === 'ar' ? 'قصة' : 'stories'}
              </span>
            </div>

            {rest.map((article, i) => (
              <ArticleCard key={article.id} article={article} lang={lang} isRTL={isRTL} fontFamily={fontFamily} index={i} />
            ))}
            {!featured && rest.length === 0 && (
              <div
                className="rounded-2xl p-4 text-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div style={{ fontFamily, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {lang === 'ar' ? 'لا توجد أخبار حالياً' : 'No stories right now'}
                </div>
                <div style={{ fontFamily, fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                  {lang === 'ar' ? 'اسحب للتحديث أو حاول لاحقاً.' : 'Pull to refresh or try again shortly.'}
                </div>
                <button
                  onClick={refresh}
                  className="rounded-xl px-3 py-2"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily, fontSize: 12.5 }}
                >
                  {lang === 'ar' ? 'تحديث' : 'Refresh'}
                </button>
              </div>
            )}
          </>
        )}

        {fetchError && (
          <div
            className="rounded-xl p-3 mt-3"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#F87171', fontFamily, fontSize: 12 }}
          >
            {lang === 'ar' ? 'تعذر جلب الأخبار الحية.' : 'Live news fetch failed.'} {fetchError}
          </div>
        )}

        {/* Second ad */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3 mt-2"
          style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}
        >
          <span style={{ fontSize: 26 }}>🏪</span>
          <div>
            <div style={{ fontFamily, fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700 }}>
              {lang === 'ar' ? 'محتوى مموّل' : 'SPONSORED'}
            </div>
            <div style={{ fontFamily, fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
              {lang === 'ar' ? 'متجر الأميرة — تجربة تسوق فاخرة' : 'Princess Mall — Luxury Shopping'}
            </div>
            <div style={{ fontFamily, fontSize: 12, color: 'var(--text-secondary)' }}>
              {lang === 'ar' ? 'اطلب توصيل واصل مجاناً للطلبات فوق 50 دينار' : 'Free Wasel delivery on orders over 50 JD'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
