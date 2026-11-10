import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, EyeOff, Inbox, MapPin, Store } from 'lucide-react';
import type { ListingRequest, Shop } from '../../services/studio';
import type { StoryGroup } from './story-editor';
import type { StudioPin } from './studio-map';
import { statuses } from './fields';
import styles from '../../routes/admin.module.css';

const StudioMap = lazy(() => import('./studio-map'));
type Destination = 'shops' | 'stories' | 'requests';

export function Dashboard({
  shops,
  stories,
  requests,
  onOpen,
}: {
  shops: Shop[];
  stories: StoryGroup[];
  requests: ListingRequest[];
  onOpen: (section: Destination, key?: string, filter?: string) => void;
}) {
  const [country, setCountry] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const countries = [...new Set(shops.map((shop) => shop.country))].sort();
  const pins = useMemo(
    (): StudioPin[] =>
      shops
        .filter((shop) => (!country || shop.country === country) && (showHidden || shop.visible))
        .map((shop) => ({
          id: shop.slug,
          name: shop.name,
          location: shop.city,
          position: [shop.latitude, shop.longitude],
          visible: shop.visible,
        })),
    [shops, country, showHidden],
  );
  const visibleShops = shops.filter((shop) => shop.visible).length;
  const visibleStories = stories.filter((story) =>
    story.versions.some((version) => version.visible),
  ).length;
  const openRequests = requests.filter(({ status }) =>
    ['submitted', 'in_review', 'needs_info'].includes(status),
  ).length;
  const metrics = [
    {
      label: 'Visible shops',
      value: visibleShops,
      section: 'shops',
      filter: 'visible',
      icon: Store,
      color: 'red',
    },
    {
      label: 'Hidden shops',
      value: shops.length - visibleShops,
      section: 'shops',
      filter: 'hidden',
      icon: EyeOff,
      color: 'neutral',
    },
    {
      label: 'Published stories',
      value: visibleStories,
      section: 'stories',
      filter: 'visible',
      icon: BookOpen,
      color: 'green',
    },
    {
      label: 'Open requests',
      value: openRequests,
      section: 'requests',
      filter: 'open',
      icon: Inbox,
      color: 'amber',
    },
  ] as const;
  const publication = [
    { label: 'Shops visible', count: visibleShops, total: shops.length },
    { label: 'Stories visible', count: visibleStories, total: stories.length },
    {
      label: 'Stories with IT and EN',
      count: stories.filter((story) => story.versions.length === 2).length,
      total: stories.length,
    },
  ];
  return (
    <>
      <section className={styles.welcome}>
        <div>
          <span className={styles.kicker}>STUDIO OVERVIEW</span>
          <h2>Welcome, Marketing.</h2>
          <p>See what’s live across the Moretti network and what’s waiting for review.</p>
        </div>
        <div className={styles.heroImage}>
          <span>
            Road to Smart Baking
            <br />
            <small>Moretti Forni</small>
          </span>
        </div>
      </section>
      <section className={styles.metrics} aria-label="Catalog totals">
        {metrics.map(({ label, value, section, filter, icon: Icon, color }) => (
          <button
            type="button"
            className={styles.metric}
            key={label}
            onClick={() => onOpen(section, undefined, filter)}
          >
            <span className={styles.metricIcon} data-color={color}>
              <Icon size={19} />
            </span>
            <ArrowRight className={styles.metricArrow} size={16} />
            <strong>{value}</strong>
            <span>{label}</span>
          </button>
        ))}
      </section>
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}>
          <div className={styles.heading}>
            <div>
              <h2>Shop network</h2>
              <p className={styles.secondary}>
                {pins.length} {pins.length === 1 ? 'shop' : 'shops'} on the map
              </p>
            </div>
            <select
              aria-label="Filter map by country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="">All countries</option>
              {countries.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>
          {pins.length ? (
            <Suspense fallback={<div className={styles.mapPlaceholder}>Loading network map…</div>}>
              <StudioMap pins={pins} onOpen={(slug) => onOpen('shops', slug)} />
            </Suspense>
          ) : (
            <div className={styles.mapPlaceholder}>
              <MapPin size={22} />
              No shops match this map filter.
            </div>
          )}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(event) => setShowHidden(event.target.checked)}
            />{' '}
            Include hidden shops
          </label>
        </section>
        <div className={styles.dashboardSide}>
          <section className={styles.panel}>
            <h2>Publication snapshot</h2>
            {publication.map(({ label, count, total }) => (
              <div className={styles.progressRow} key={label}>
                <div>
                  <span>{label}</span>
                  <strong>
                    {count} / {total}
                  </strong>
                </div>
                <progress aria-label={label} value={count} max={total || 1} />
              </div>
            ))}
          </section>
          <section className={styles.panel}>
            <div className={styles.heading}>
              <h2>Recent listing requests</h2>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => onOpen('requests')}
              >
                View inbox <ArrowRight size={14} />
              </button>
            </div>
            {requests.length ? (
              <ul className={styles.recent}>
                {requests.slice(0, 5).map((request) => (
                  <li key={request.id}>
                    <button type="button" onClick={() => onOpen('requests', request.id)}>
                      <span>
                        <strong>{request.businessName}</strong>
                        <small>
                          {request.city} · {new Date(request.createdAt).toLocaleDateString()}
                        </small>
                      </span>
                      <span className={styles.badge}>{statuses[request.status]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.secondary}>No requests have been submitted yet.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
