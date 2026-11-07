import { Capacitor } from '@capacitor/core';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowUpRight, MapPin, Navigation, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Route } from './+types/restaurant';
import { publishedRestaurants as restaurants, shopImage } from '../data/restaurants';
import { resolveOvens } from '../data/ovens';
import { RestaurantCard, SaveButton } from '../components/cards';
import { ShareButton } from '../components/share';

function loadRestaurant(params: Route.LoaderArgs['params']) {
  const restaurant = restaurants.find((item) => item.id === params.slug);
  if (!restaurant) throw new Response('Not found', { status: 404 });
  return { restaurant, locale: params.locale === 'en' ? ('en' as const) : ('it' as const) };
}
export function loader({ params }: Route.LoaderArgs) {
  return loadRestaurant(params);
}
export function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  return Capacitor.isNativePlatform() ? loadRestaurant(params) : serverLoader();
}
export function meta({ data }: Route.MetaArgs) {
  const restaurant = data?.restaurant;
  const description = restaurant
    ? data.locale === 'en'
      ? `${restaurant.name} is part of the #RoadToSmartBaking world by Moretti Forni.`
      : `${restaurant.name} fa parte del mondo #RoadToSmartBaking di Moretti Forni.`
    : '';
  return [
    { title: `${restaurant?.name ?? 'Locale non trovato'} · RoadToSmartBaking` },
    { name: 'description', content: description },
  ];
}
export default function RestaurantDetail({ loaderData }: Route.ComponentProps) {
  const { restaurant } = loaderData;
  const locale = useParams().locale === 'en' ? 'en' : 'it';
  const { t } = useTranslation();
  const ovenModels = resolveOvens(restaurant.oven);
  const ovenUrl = ovenModels.find((model) => model.productUrl)?.productUrl;
  return (
    <main id="main">
      <section className="container venue-header">
        <Link className="back-link" to={`/${locale}`}>
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
      <figure className="container venue-hero">
        <img
          src={shopImage(restaurant.image, 'heroes')}
          alt={`${restaurant.name} · #RoadToSmartBaking`}
          width="1170"
          height="650"
          fetchPriority="high"
        />
      </figure>
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
          <p>{t('restaurantJourney', { name: restaurant.name, city: restaurant.city })}</p>
          <div className="oven-panel">
            <div className="oven-panel-copy">
              <Flame size={28} />
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
            <Link className="text-link" to={`/${locale}`}>
              {t('browse')}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="card-grid">
            {restaurants
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
