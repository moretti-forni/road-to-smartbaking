import { Link, useParams } from 'react-router';
import { Heart, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSaved } from '../components/providers';
import { RestaurantCard, StoryCard } from '../components/cards';
import { publishedRestaurants as restaurants } from '../data/restaurants';
import { storyIndex as stories } from '../data/story-index';
export function meta() {
  return [{ title: 'Salvati · RoadToSmartBaking' }];
}
export default function Saved() {
  const { ids, ready, clear } = useSaved();
  const { t } = useTranslation();
  const { locale } = useParams();
  const records = restaurants.filter((restaurant) => ids.includes(restaurant.id));
  const savedStories = stories.filter((story) => ids.includes(`story:${story.slug}`));
  const savedCount = records.length + savedStories.length;
  return (
    <main id="main" className="container saved-page">
      <section className="saved-intro">
        <span className="eyebrow">
          <Heart size={13} />
          {t('saved')}
        </span>
        <h1>
          {t('savedTitle')}
          <br />
          <em>{t('savedAccent')}</em>
        </h1>
        <p>{t('savedIntro')}</p>
      </section>
      {!ready ? (
        <div className="skeleton-card" aria-busy="true" />
      ) : (
        <>
          {savedCount < ids.length && <p className="notice">{t('unavailableSaved')}</p>}
          {savedCount ? (
            <>
              <div className="saved-toolbar">
                <span>
                  {savedCount} {t('saved').toLowerCase()}
                </span>
                <button className="text-link" onClick={clear}>
                  {t('clearSaved')}
                </button>
              </div>
              <div className="card-grid">
                {records.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
                {savedStories.map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Heart size={35} strokeWidth={1} />
              <h2>{t('savedEmpty')}</h2>
              <p>{t('savedEmptyText')}</p>
              <Link className="button primary" to={`/${locale}`}>
                {t('browse')}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
