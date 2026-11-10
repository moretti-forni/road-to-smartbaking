import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useSearchParams } from 'react-router';
import { ArrowDown, LocateFixed, MapPin, Navigation, Search, Store, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RestaurantCard } from '../components/cards';
import {
  filterRestaurants,
  distanceKm,
  getDiscoverySuggestions,
  parseQuery,
  type Bounds,
  type DiscoverySuggestion,
} from '../services/discovery';

import { useShops } from '../services/catalog';

const DiscoveryMap = lazy(() => import('../components/discovery-map'));
const venueKinds = ['all', 'pizza', 'bakery', 'hotel', 'other'] as const;
export function meta() {
  return [
    { title: 'Esplora · RoadToSmartBaking' },
    {
      name: 'description',
      content:
        'Professionisti, luoghi e prodotti lievitati. Scopri la cottura perfetta con Moretti Forni.',
    },
  ];
}
export default function Explore() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const query = parseQuery(params);
  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [draftBounds, setDraftBounds] = useState<Bounds>();
  const [locationStatus, setLocationStatus] = useState('');
  const [locating, setLocating] = useState(false);
  const [searchValue, setSearchValue] = useState(query.search || query.city || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [mapFocus, setMapFocus] = useState<{
    lat: number;
    lng: number;
    key: number;
    zoom?: number;
  }>();
  const hasTriedInitialLocation = useRef(false);
  const result = useShops();
  const records = result.data ? filterRestaurants(result.data, query) : [];
  const suggestions = useMemo(
    () => getDiscoverySuggestions(searchValue, 8, result.data ?? []),
    [searchValue, result.data],
  );
  useEffect(() => setHydrated(true), []);
  useEffect(() => setSearchValue(query.search || query.city || ''), [query.city, query.search]);
  useEffect(() => {
    if (
      hasTriedInitialLocation.current ||
      query.lat !== undefined ||
      query.lng !== undefined ||
      !navigator.geolocation
    )
      return;

    hasTriedInitialLocation.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapFocus({ lat, lng, key: Date.now(), zoom: 5 });
        setParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.set('lat', lat.toFixed(5));
            next.set('lng', lng.toFixed(5));
            next.set('sort', 'distance');
            next.delete('bounds');
            return next;
          },
          { preventScrollReset: true },
        );
      },
      () => undefined,
      { timeout: 10000, maximumAge: 60000 },
    );
  }, [query.lat, query.lng, setParams]);
  function update(changes: Record<string, string | null>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null) next.delete(key);
          else next.set(key, value);
        });
        return next;
      },
      { preventScrollReset: true },
    );
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
      selectSuggestion(suggestions[activeSuggestion]);
      return;
    }
    setShowSuggestions(false);
    update({ q: searchValue, city: null, bounds: null });
  }
  function selectSuggestion(suggestion: DiscoverySuggestion) {
    setSearchValue(suggestion.query);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    setSelected(suggestion.type === 'restaurant' ? suggestion.id : undefined);
    setMapFocus({ lat: suggestion.lat, lng: suggestion.lng, key: Date.now() });
    update({
      q: suggestion.type === 'place' ? null : suggestion.query,
      city: suggestion.type === 'place' ? suggestion.query : null,
      bounds: null,
    });
  }
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setShowSuggestions(true);
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    }
    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  }
  function locate() {
    setLocationStatus('');
    if (!navigator.geolocation) {
      setLocationStatus(t('locationDenied'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapFocus({ lat, lng, key: Date.now() });
        update({
          lat: lat.toFixed(5),
          lng: lng.toFixed(5),
          sort: 'distance',
          bounds: null,
        });
        setLocating(false);
      },
      () => {
        setLocationStatus(t('locationDenied'));
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  function searchArea() {
    if (draftBounds)
      update({
        bounds: [draftBounds.south, draftBounds.west, draftBounds.north, draftBounds.east]
          .map((value) => value.toFixed(5))
          .join(','),
      });
  }
  function selectVenue(id: string) {
    setSelected(id);
  }
  return (
    <main id="main">
      <section className="container discover-intro">
        <div>
          <span className="eyebrow">
            <span className="small-line" />
            {t('eyebrow')}
          </span>
          <h1>
            {t('discover')}
            <br />
            <em>{t('discoveryTitle')}</em>
          </h1>
        </div>
        <div className="intro-side">
          <p>{t('discoveryIntro')}</p>
          <a className="text-link" href="#places">
            {t('results')}
            <ArrowDown size={16} />
          </a>
        </div>
      </section>
      <section className="container discovery-workspace" aria-label={t('explore')}>
        <div className="search-toolbar">
          <form className="place-search" onSubmit={search} role="search">
            <MapPin size={19} />
            <input
              aria-label={t('search')}
              placeholder={t('search')}
              name="q"
              autoComplete="off"
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setShowSuggestions(true);
                setActiveSuggestion(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleSearchKeyDown}
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="place-suggestions"
            />
            <button className="search-submit" aria-label={t('searchButton')}>
              <Search size={18} />
            </button>
            {showSuggestions && suggestions.length > 0 && (
              <div className="place-suggestions" id="place-suggestions" role="listbox">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    role="option"
                    aria-selected={activeSuggestion === index}
                    className={activeSuggestion === index ? 'is-active' : ''}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion.type === 'place' ? <Navigation size={16} /> : <Store size={16} />}
                    <span>
                      <strong>{suggestion.label}</strong>
                      <small>{suggestion.detail}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>
          <button className="button location-button" onClick={locate} disabled={locating}>
            <LocateFixed size={16} />
            {t(locating ? 'locationLoading' : 'useLocation')}
          </button>
          <div className="search-divider" />
          <div className="filter-pills">
            {venueKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                className={`pill ${query.kind === kind ? 'active' : ''}`}
                aria-pressed={query.kind === kind}
                onClick={() => update({ kind: kind === 'all' ? null : kind, bounds: null })}
              >
                {t(kind)}
              </button>
            ))}
          </div>
        </div>
        {locationStatus && (
          <p className="notice" role="status">
            {locationStatus}
          </p>
        )}
        <div className="map-frame">
          <div className="map-label">
            <span className="live-dot" />
            {t('map')}
            <span>{t('mapCoverage', { count: records.length })}</span>
          </div>
          {hydrated ? (
            <Suspense fallback={<div className="map-placeholder">{t('loadingMap')}</div>}>
              <DiscoveryMap
                records={records}
                selected={selected}
                onSelect={selectVenue}
                onBounds={setDraftBounds}
                fitKey={`${query.search}:${query.city}:${query.kind}`}
                focus={mapFocus}
                userLocation={
                  query.lat !== undefined && query.lng !== undefined
                    ? { lat: query.lat, lng: query.lng }
                    : undefined
                }
              />
            </Suspense>
          ) : (
            <div className="map-placeholder">{t('loadingMap')}</div>
          )}
          <button className="button map-search" disabled={!draftBounds} onClick={searchArea}>
            <Search size={14} />
            {t('searchArea')}
          </button>
        </div>
        <p className="map-card-instruction">
          <MapPin size={15} aria-hidden="true" />
          {t('mapCardInstruction')}
        </p>
      </section>
      <section className="locations-section" id="places">
        <div className="container locations-content">
          <div className="section-heading">
            <div>
              <span className="eyebrow brand-tag">#RoadToSmartBaking</span>
              <h2>
                {t('locations')}
                <span className="result-count" aria-live="polite">
                  {result.data ? records.length : '—'}
                </span>
              </h2>
              <p>{t('locationsIntro')}</p>
            </div>
          </div>
          <div className="location-filters filter-pills" aria-label={t('locations')}>
            {venueKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                className={`pill ${query.kind === kind ? 'active' : ''}`}
                aria-pressed={query.kind === kind}
                onClick={() => update({ kind: kind === 'all' ? null : kind, bounds: null })}
              >
                {t(kind)}
              </button>
            ))}
          </div>
          {(query.search || query.city || query.bounds || query.kind !== 'all') && (
            <div className="applied-filters">
              {query.search && (
                <span>
                  {query.search}
                  <button aria-label={t('reset')} onClick={() => update({ q: null })}>
                    <X size={13} />
                  </button>
                </span>
              )}
              {query.city && (
                <span>
                  {query.city}
                  <button aria-label={t('reset')} onClick={() => update({ city: null })}>
                    <X size={13} />
                  </button>
                </span>
              )}
              {query.bounds && (
                <button className="text-link" onClick={() => update({ bounds: null })}>
                  {t('clearMap')}
                  <X size={13} />
                </button>
              )}
              <button className="text-link" onClick={() => setParams({})}>
                {t('reset')}
              </button>
            </div>
          )}
          {result.isPending ? (
            <div className="card-grid" aria-busy="true">
              {[0, 1, 2].map((key) => (
                <div className="skeleton-card" key={key} />
              ))}
            </div>
          ) : result.isError ? (
            <div className="empty-state">
              <h3>{t('loadError')}</h3>
              <button className="button primary" onClick={() => result.refetch()}>
                {t('retry')}
              </button>
            </div>
          ) : records.length ? (
            <div className="card-grid" aria-label={t('locations')}>
              {records.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  selected={selected === restaurant.id}
                  onSelect={() => setSelected(restaurant.id)}
                  distance={
                    query.lat !== undefined && query.lng !== undefined
                      ? distanceKm(query.lat, query.lng, restaurant)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={30} />
              <h3>{t('empty')}</h3>
              <p>{t('emptyText')}</p>
              <button className="button primary" onClick={() => setParams({})}>
                {t('reset')}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
