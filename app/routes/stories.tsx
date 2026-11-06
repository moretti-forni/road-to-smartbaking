import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock3, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { imageUrl, storyIndex as stories, storyCategory } from '../data/story-index';
import { StoryCard } from '../components/cards';

export function meta() {
  return [
    { title: 'Storie · RoadToSmartBaking' },
    {
      name: 'description',
      content:
        'Professionisti, prodotti lievitati e cottura perfetta. Le storie dal mondo Moretti Forni.',
    },
  ];
}
export default function Stories() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? 'all';
  const search = params.get('q') ?? '';
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(9);
  const scroller = useRef<HTMLDivElement>(null);
  const featured = stories.slice(0, 3);
  const filtered = stories.filter(
    (story) =>
      (category === 'all' || storyCategory(story) === category) &&
      `${story.title} ${story.summary}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  function slide(index: number) {
    const target = (index + featured.length) % featured.length;
    const element = scroller.current;
    if (element)
      element.scrollTo({
        left: element.clientWidth * target,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    setActive(target);
  }
  return (
    <main id="main">
      <section className="container stories-intro">
        <span className="eyebrow">
          <span className="small-line" />
          {t('storyEyebrow')}
        </span>
        <div className="stories-title-row">
          <h1>
            {t('storyTitle')}
            <br />
            <em>{t('storyTitleAccent')}</em>
          </h1>
          <p>{t('storyIntro')}</p>
        </div>
      </section>
      <section className="container" aria-roledescription="carousel" aria-label={t('stories')}>
        <div
          className="featured-stories"
          ref={scroller}
          onScroll={(event) => {
            const element = event.currentTarget;
            if (element.clientWidth)
              setActive(Math.round(element.scrollLeft / element.clientWidth));
          }}
        >
          {featured.map((story, index) => (
            <article
              className="featured-slide"
              key={story.slug}
              aria-label={`${index + 1} / ${featured.length}`}
              inert={index !== active}
            >
              <img
                src={imageUrl(story.cover.image)}
                alt={story.cover.alt}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                loading={index === 0 ? 'eager' : 'lazy'}
                width="1170"
                height="650"
              />
              <div className="feature-overlay" />
              <div className="feature-copy">
                <span className="feature-category">{t(storyCategory(story))}</span>
                <h2 lang="it">
                  <Link to={`/${locale}/stories/${story.slug}`}>{story.title}</Link>
                </h2>
                <p lang="it">{story.summary}</p>
                <Link className="feature-link" to={`/${locale}/stories/${story.slug}`}>
                  {t('readStory')}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
              <span className="feature-index">
                0{index + 1}
                <span> / 0{featured.length}</span>
              </span>
            </article>
          ))}
        </div>
        <div className="carousel-bottom">
          <span className="eyebrow">{t('original')}</span>
          <div className="carousel-dots">
            {featured.map((story, index) => (
              <button
                key={story.slug}
                aria-label={`${t('stories')} ${index + 1}`}
                aria-current={active === index ? 'true' : undefined}
                className={active === index ? 'active' : ''}
                onClick={() => slide(index)}
              />
            ))}
          </div>
          <div className="carousel-arrows">
            <button
              className="icon-button"
              aria-label={t('previous')}
              onClick={() => slide(active - 1)}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label={t('next')}
              onClick={() => slide(active + 1)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
      <section className="container section-space">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('editorial')}</span>
            <h2>{t('latest')}</h2>
            <p>{t('latestIntro')}</p>
          </div>
          <span className="story-total">
            {filtered.length} {t('countStories')}
          </span>
        </div>
        <div className="stories-filter">
          <div className="filter-pills">
            {['all', 'pizza', 'bakery', 'people'].map((kind) => (
              <button
                key={kind}
                className={`pill ${category === kind ? 'active' : ''}`}
                onClick={() => {
                  setParams(
                    (current) => {
                      const next = new URLSearchParams(current);
                      if (kind === 'all') next.delete('category');
                      else next.set('category', kind);
                      return next;
                    },
                    { preventScrollReset: true },
                  );
                  setLimit(9);
                }}
              >
                {t(kind === 'all' ? 'allStories' : kind)}
              </button>
            ))}
          </div>
          <label className="story-search">
            <Search size={16} />
            <input
              aria-label={t('articleSearch')}
              placeholder={t('articleSearch')}
              value={search}
              onChange={(event) => {
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current);
                    if (event.target.value) next.set('q', event.target.value);
                    else next.delete('q');
                    return next;
                  },
                  { replace: true, preventScrollReset: true },
                );
                setLimit(9);
              }}
            />
          </label>
        </div>
        {locale === 'en' && <p className="editorial-language">IT · {t('originalItalian')}</p>}
        <div className="card-grid stories-grid">
          {filtered.slice(0, limit).map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <h3>{t('empty')}</h3>
            <button className="button subtle" onClick={() => setParams({})}>
              {t('reset')}
            </button>
          </div>
        )}
        {limit < filtered.length && (
          <div className="load-more">
            <button className="button outlined" onClick={() => setLimit(limit + 9)}>
              {t('more')}
              <ArrowRight size={16} />
            </button>
            <span>
              <Clock3 size={13} />
              {Math.min(limit, filtered.length)} / {filtered.length}
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
