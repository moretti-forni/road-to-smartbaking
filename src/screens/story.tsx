'use client';

import { useStories } from '../services/catalog';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Clock3, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Story } from '../data/content';
import { imageUrl, formatDate, storyCategory } from '../data/story-index';
import { StoryCard } from '../components/cards';
import { ShareButton } from '../components/share';

export default function StoryDetail({ story }: { story: Story }) {
  return <Detail story={story} />;
}

function Detail({ story }: { story: Story }) {
  const { locale = 'it' } = useParams<{ locale: string; slug: string }>();
  const { t } = useTranslation();
  const { data: stories = [] } = useStories(locale);
  const related = stories.filter((item) => item.slug !== story.slug).slice(0, 3);
  const date = formatDate(story.publishedAt, locale ?? 'it');
  return (
    <main id="main">
      <article>
        <header className="container article-header">
          <Link className="back-link" href={`/${locale}/stories`}>
            <ArrowLeft size={14} />
            {t('backStories')}
          </Link>
          <div className="article-category">
            <span className="small-line" />
            {t(storyCategory(story))}
          </div>
          <h1 lang={story.language}>{story.title}</h1>
          <p className="article-deck" lang={story.language}>
            {story.summary}
          </p>
          <div className="article-metadata">
            <span className="editor-avatar">
              <BookOpen size={16} />
            </span>
            <span>
              Moretti Forni<span className="metadata-sub">{t('editorial')}</span>
            </span>
            {date && <span className="date">{date}</span>}
            {story.readMinutes > 0 && (
              <span className="read-time">
                <Clock3 size={14} />
                {story.readMinutes} {t('read')}
              </span>
            )}
            <ShareButton title={story.title} />
          </div>
          {locale === 'en' && story.language === 'it' && (
            <p className="editorial-language">IT · {t('originalItalian')}</p>
          )}
        </header>
        {story.cover.image && (
          <figure className="container article-hero">
            <img
              src={imageUrl(story.cover.image)}
              alt={story.cover.alt}
              width="1170"
              height="650"
              fetchPriority="high"
            />
            <figcaption>© Moretti Forni · #RoadToSmartBaking</figcaption>
          </figure>
        )}
        <div className="container article-layout">
          <aside className="article-aside">
            <span className="eyebrow brand-tag">#RoadToSmartBaking</span>
            <span className="aside-line" />
            <p>{t('footerSmall')}</p>
            {story.sourceUrl && (
              <a className="text-link" href={story.sourceUrl} target="_blank" rel="noreferrer">
                {t('source')}
                <ArrowUpRight size={15} />
              </a>
            )}
          </aside>
          <div className="article-body" lang={story.language}>
            {story.blocks.map((block, index) =>
              block.type === 'heading' ? (
                <h2 key={index}>{block.text}</h2>
              ) : block.type === 'paragraph' ? (
                <p key={index}>{block.text}</p>
              ) : (
                <figure key={index}>
                  <img src={imageUrl(block.image)} alt={block.alt} loading="lazy" />
                  <figcaption>{block.alt}</figcaption>
                </figure>
              ),
            )}
            <div className="article-end">
              <span className="brand-dot">●</span>
              <span>#RoadToSmartBaking</span>
              <ShareButton title={story.title} />
            </div>
          </div>
        </div>
      </article>
      <section className="journal-strip">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('editorial')}</span>
              <h2>{t('related')}</h2>
              <p>{t('relatedIntro')}</p>
            </div>
            <Link className="text-link" href={`/${locale}/stories`}>
              {t('allStories')}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="card-grid">
            {related.map((item) => (
              <StoryCard key={item.slug} story={item} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
