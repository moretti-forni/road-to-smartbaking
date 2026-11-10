import { Link, useParams } from 'react-router';
import { ArrowUpRight, Clock3, Heart, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { imageUrl, storyCategory, type StorySummary } from '../data/story-index';
import { shopImage, type Restaurant } from '../data/restaurants';
import { resolveOvens } from '../data/ovens';
import { useSaved } from './providers';
import styles from './cards.module.css';

export function SaveButton({ id, label }: { id: string; label: string }) {
  const { ids, toggle, ready } = useSaved();
  const { t } = useTranslation();
  const saved = ids.includes(id);
  return (
    <button
      className={`icon-button save-button ${saved ? 'is-saved' : ''}`}
      disabled={!ready}
      aria-label={`${t(saved ? 'unsave' : 'save')}: ${label}`}
      aria-pressed={saved}
      onClick={() => toggle(id)}
    >
      <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
export function RestaurantCard({
  restaurant,
  selected,
  onSelect,
  distance,
}: {
  restaurant: Restaurant;
  selected?: boolean;
  onSelect?: () => void;
  distance?: number;
}) {
  const { locale } = useParams();
  const { t } = useTranslation();
  return (
    <article
      id={`venue-${restaurant.id}`}
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onMouseEnter={onSelect}
      onFocus={onSelect}
    >
      <Link
        className={styles.cardLink}
        to={`/${locale}/restaurants/${restaurant.id}`}
        aria-label={restaurant.name}
      />
      <div className={styles.imageWrap}>
        {restaurant.image && (
          <img
            src={shopImage(restaurant.image, 'cards')}
            alt={
              restaurant.imageAlt?.[locale === 'en' ? 'en' : 'it'] ??
              `${restaurant.name} · #RoadToSmartBaking`
            }
            loading="lazy"
            width="600"
            height="400"
          />
        )}
        <span className={styles.imageTag}>#RoadToSmartBaking</span>
        <SaveButton id={restaurant.id} label={restaurant.name} />
      </div>
      <div className={styles.body}>
        <div className={styles.metadata}>
          <span>{t(restaurant.kind)}</span>
        </div>
        <h3>{restaurant.name}</h3>
        {restaurant.oven && <OvenModels oven={restaurant.oven} />}
        <a
          className={styles.location}
          href={restaurant.mapsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`${t('directions')}: ${restaurant.name}`}
        >
          <span className={styles.locationDetails}>
            <span className={styles.locationText}>
              <MapPin size={14} />
              {restaurant.city}
            </span>
            {distance !== undefined && (
              <span className={styles.distance}>
                {distance.toFixed(1)} {t('km')}
              </span>
            )}
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
function OvenModels({ oven }: { oven: string }) {
  const models = resolveOvens(oven);
  return (
    <span className={styles.ovenModels} aria-label={oven}>
      {models.map((model, index) =>
        model.image || model.logo ? (
          <span className={styles.ovenModel} key={`${model.name}-${index}`} title={model.name}>
            {model.image && (
              <img className={styles.ovenDetail} src={model.image} alt="" aria-hidden="true" />
            )}
            {model.logo && (
              <img className={styles.ovenLogo} src={model.logo} alt="" aria-hidden="true" />
            )}
          </span>
        ) : (
          <span className={styles.ovenFallback} key={`${model.name}-${index}`} title={model.name}>
            {model.name}
          </span>
        ),
      )}
    </span>
  );
}
export function StoryCard({ story }: { story: StorySummary }) {
  const { locale } = useParams();
  const { t } = useTranslation();
  return (
    <article className={styles.story}>
      <Link
        className={styles.storyImage}
        to={`/${locale}/stories/${story.slug}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {story.cover.image && (
          <img src={imageUrl(story.cover.image)} alt="" loading="lazy" width="600" height="400" />
        )}
        <span className={styles.storyArrow}>
          <ArrowUpRight size={22} />
        </span>
      </Link>
      <SaveButton id={`story:${story.slug}`} label={story.title} />
      <div className={styles.storyBody}>
        <div className={styles.metadata}>
          <span>{t(storyCategory(story))}</span>
          {story.readMinutes > 0 && (
            <span>
              <Clock3 size={13} />
              {story.readMinutes} {t('read')}
            </span>
          )}
        </div>
        <h3 lang={story.language}>
          <Link to={`/${locale}/stories/${story.slug}`}>{story.title}</Link>
        </h3>
        <p lang={story.language}>{story.summary}</p>
      </div>
    </article>
  );
}
