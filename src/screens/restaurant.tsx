'use client';

import { useShops } from '../services/catalog';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, MapPin, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '../data/restaurants';
import { shopImage } from '../data/restaurants';
import { resolveOvens } from '../data/ovens';
import { RestaurantCard, SaveButton } from '../components/cards';
import { ShareButton } from '../components/share';

export default function RestaurantDetail({ restaurant }: { restaurant: Restaurant }) {
  return <Detail restaurant={restaurant} />;
}

function Detail({ restaurant }: { restaurant: Restaurant }) {
  const locale = useParams<{ locale: string; slug: string }>().locale === 'en' ? 'en' : 'it';
  const descriptionLanguage = locale === 'en' && !restaurant.description.en ? 'it' : locale;
  const description = restaurant.description[descriptionLanguage];
  const { t } = useTranslation();
  const { data: related = [] } = useShops();
  const ovenModels = resolveOvens(restaurant.oven);
  const ovenUrl = ovenModels.find((model) => model.productUrl)?.productUrl;
  return (
    <main id="main">
      <section className="container venue-header">
        <Link className="back-link" href={`/${locale}`}>
          <ArrowLeft size={14} />
          {t('backExplore')}
        </Link>
        <div className="venue-title">
          <div>
            <span className="eyebrow">
              {t(restaurant.kind)} · {restaurant.city}
            </span>
            <h1>
              {restaurant.name}
              <span className="brand-dot">.</span>
            </h1>
            <p>
              <MapPin size={15} />
              {restaurant.city}
            </p>
          </div>
          <div className="venue-actions">
            <ShareButton title={restaurant.name} />
            <SaveButton id={restaurant.id} label={restaurant.name} />
          </div>
        </div>
      </section>
      {restaurant.image && (
        <figure className="container venue-hero">
          <img
            src={shopImage(restaurant.image, 'heroes')}
            alt={restaurant.imageAlt?.[locale] ?? `${restaurant.name} · #RoadToSmartBaking`}
            width="1170"
            height="650"
            fetchPriority="high"
          />
        </figure>
      )}
      <div className="container">
        <aside className="visit-panel">
          <div className="visit-intro">
            <span className="eyebrow brand-tag">#RoadToSmartBaking</span>
            <h2>{t('visitShop')}</h2>
          </div>
          <div className="visit-details">
            <div className="visit-location">
              <MapPin size={20} />
              <div>
                <strong>{restaurant.city}</strong>
                <p>{restaurant.address}</p>
              </div>
            </div>
            <div className="visit-actions">
              <a
                className="button primary"
                href={restaurant.mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={16} />
                {t('directions')}
              </a>
              {restaurant.website && (
                <a className="text-link" href={restaurant.website} target="_blank" rel="noreferrer">
                  {t('website')} <ArrowUpRight size={16} />
                </a>
              )}
              {restaurant.locationNote && <p className="small-note">{restaurant.locationNote}</p>}
              {restaurant.coordinatePrecision === 'place-fallback' && (
                <p className="small-note">{t('approximatePin')}</p>
              )}
            </div>
          </div>
          <p className="small-note visit-research">{t('locationResearchNote')}</p>
        </aside>
      </div>
      <div className="container venue-content">
        <div className="venue-story">
          <span className="eyebrow">{t('original')}</span>
          <h2>{t('restaurantAbout')}</h2>
          <p lang={description ? descriptionLanguage : locale}>
            {description ||
              t('restaurantJourney', { name: restaurant.name, city: restaurant.city })}
          </p>
          {description && descriptionLanguage !== locale && (
            <p className="small-note">IT · {t('originalItalian')}</p>
          )}
          {restaurant.oven && (
            <div className="oven-panel">
              <div className="oven-panel-copy">
                <img
                  className="oven-brand"
                  src="/moretti-symbol.svg"
                  alt="Moretti Forni"
                  width="40"
                  height="40"
                />
                <span className="eyebrow">{t('oven')}</span>
                <h3>{restaurant.oven}</h3>
                <p>{t('ovenText')}</p>
                {ovenUrl && (
                  <a className="text-link" href={ovenUrl} target="_blank" rel="noreferrer">
                    {t('exploreOven')}
                    <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
              <div className="oven-visuals" aria-label={restaurant.oven}>
                {ovenModels.map((model, index) =>
                  model.image ? (
                    <span className="oven-visual" key={`${model.name}-${index}`}>
                      <img src={model.image} alt={`${model.name} · Moretti Forni`} />
                    </span>
                  ) : (
                    <span className="oven-visual-fallback" key={`${model.name}-${index}`}>
                      {model.name}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <section className="journal-strip">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('explore')}</span>
              <h2>{t('related')}</h2>
              <p>{t('resultsIntro')}</p>
            </div>
            <Link className="text-link" href={`/${locale}`}>
              {t('browse')}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="card-grid">
            {related
              .filter((item) => item.id !== restaurant.id)
              .slice(0, 3)
              .map((item) => (
                <RestaurantCard key={item.id} restaurant={item} />
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}
