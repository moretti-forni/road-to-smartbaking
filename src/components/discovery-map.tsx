'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CircleMarker,
  Marker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon } from 'leaflet';
import { categoryColors } from './category-icon';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { shopImage, type Restaurant } from '../data/restaurants';
import { resolveOvens } from '../data/ovens';
import type { Bounds } from '../services/discovery';
import { publicPath } from '../utils/public-path';
import { mapTiles } from '../services/map-tiles';
import 'leaflet/dist/leaflet.css';

interface Props {
  records: Restaurant[];
  selected?: string;
  onSelect: (id: string) => void;
  onBounds: (bounds: Bounds) => void;
  fitKey: string;
  focus?: { lat: number; lng: number; key: number; zoom?: number };
  userLocation?: { lat: number; lng: number };
}

function MapSize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function ScrollWheelZoom({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (enabled) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
  }, [enabled, map]);

  return null;
}

function MapEvents({ onBounds, focus, userLocation }: Props) {
  const map = useMap();
  const lastBounds = useRef<Bounds | undefined>(undefined);
  useEffect(() => {
    if (focus)
      map.flyTo([focus.lat, focus.lng], focus.zoom ?? 11, { animate: true, duration: 0.7 });
  }, [focus, map]);
  useEffect(() => {
    if (!focus && userLocation)
      map.setView([userLocation.lat, userLocation.lng], 5, { animate: false });
  }, [focus, map, userLocation]);
  useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      const nextBounds = {
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      };
      const previousBounds = lastBounds.current;
      const hasChanged =
        !previousBounds ||
        Object.keys(nextBounds).some(
          (key) =>
            Math.abs(nextBounds[key as keyof Bounds] - previousBounds[key as keyof Bounds]) >
            0.0001,
        );

      if (hasChanged) {
        lastBounds.current = nextBounds;
        onBounds(nextBounds);
      }
    },
  });
  return null;
}
export default function DiscoveryMap(props: Props) {
  const { t } = useTranslation();
  const { locale } = useParams<{ locale: string; slug: string }>();
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const [isScrollZoomEnabled, setIsScrollZoomEnabled] = useState(false);
  const { url: tileUrl, attribution } = mapTiles();
  return (
    <div className="map-inner" onClick={() => setIsScrollZoomEnabled(true)}>
      <MapContainer
        className="discovery-map"
        center={[43.75, 13.1]}
        zoom={5}
        scrollWheelZoom={false}
        zoomControl={false}
        aria-label={t('map')}
      >
        <TileLayer
          key={tileAttempt}
          url={tileUrl}
          attribution={attribution}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <ZoomControl position="topright" />
        <ScrollWheelZoom enabled={isScrollZoomEnabled} />
        <MapSize />
        <MapEvents {...props} />
        {props.userLocation && (
          <CircleMarker
            center={[props.userLocation.lat, props.userLocation.lng]}
            radius={8}
            pathOptions={{ color: '#FFFEFB', weight: 3, fillColor: '#1769aa', fillOpacity: 1 }}
          >
            <Tooltip direction="top" permanent>
              {t('yourLocation')}
            </Tooltip>
          </CircleMarker>
        )}
        <VenueMarkers {...props} locale={locale} />
      </MapContainer>
      {!isScrollZoomEnabled && !tileError && (
        <p className="map-zoom-hint">{t('mapZoomInstruction')}</p>
      )}
      {tileError && (
        <div className="map-error" role="status">
          <span>{t('mapUnavailable')}</span>
          <button
            className="text-link"
            onClick={() => {
              setTileAttempt((attempt) => attempt + 1);
              setTileError(false);
            }}
          >
            {t('retry')}
          </button>
        </div>
      )}
    </div>
  );
}

function VenueMarkers(props: Props & { locale: string }) {
  const map = useMap();
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const groups = new Map<string, Restaurant[]>();
  props.records.forEach((record) => {
    const point = map.project([record.lat, record.lng], zoom);
    const key =
      zoom >= 18 || record.id === props.selected
        ? record.id
        : `${Math.floor(point.x / 52)}:${Math.floor(point.y / 52)}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });
  return (
    <>
      <Marker
        position={[43.75, 13.1]}
        icon={divIcon({
          className: 'moretti-map-marker',
          html: `<img src="${publicPath('/moretti-symbol.svg')}" alt="Moretti Forni" width="38" height="32" />`,
          iconSize: [44, 38],
          iconAnchor: [22, 19],
        })}
      >
        <Tooltip>Moretti Forni · Mondolfo</Tooltip>
        <Popup
          className="map-place-popup"
          closeButton
          autoPan
          keepInView
          autoPanPaddingTopLeft={[12, 12]}
          autoPanPaddingBottomRight={[12, 24]}
        >
          <article className="map-place-card">
            <img
              src={publicPath('/mf_factory.jpg')}
              alt="Moretti Forni · Mondolfo"
              width="320"
              height="180"
            />
            <div className="map-place-card-body">
              <span className="map-place-card-type">
                {props.locale === 'en' ? 'Headquarters' : 'Sede centrale'}
              </span>
              <div className="map-place-card-heading">
                <h3>Moretti Forni</h3>
              </div>
              <p className="map-place-card-location">
                <MapPin size={14} aria-hidden="true" />
                <span>
                  Mondolfo<small>Via A. Meucci, 4</small>
                </span>
              </p>
              <p className="map-place-card-location">
                {props.locale === 'en'
                  ? 'Approximate location · Mondolfo area'
                  : 'Posizione indicativa · zona di Mondolfo'}
              </p>
              <div className="map-place-card-actions">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Moretti+Forni+Via+Meucci+4+Mondolfo"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('directions')}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
                <a href="https://morettiforni.com" target="_blank" rel="noreferrer">
                  {t('website')}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>
        </Popup>
      </Marker>
      {[...groups.entries()].map(([key, group]) => {
        if (group.length > 1) {
          const lat = group.reduce((sum, record) => sum + record.lat, 0) / group.length;
          const lng = group.reduce((sum, record) => sum + record.lng, 0) / group.length;
          return (
            <Marker
              key={key}
              position={[lat, lng]}
              icon={divIcon({
                className: 'venue-cluster',
                html: `<span>${group.length}</span>`,
                iconSize: [40, 40],
              })}
              eventHandlers={{
                click: () =>
                  map.setView([lat, lng], Math.min(map.getZoom() + 2, 18), { animate: false }),
              }}
            >
              <Tooltip>{t('mapCoverage', { count: group.length })}</Tooltip>
            </Marker>
          );
        }
        const restaurant = group[0];
        const ovenModels = resolveOvens(restaurant.oven).filter((model) => model.logo);
        const color = categoryColors[restaurant.kind] ?? '#a8a39a';
        return (
          <CircleMarker
            key={restaurant.id}
            center={[restaurant.lat, restaurant.lng]}
            radius={props.selected === restaurant.id ? 13 : 9}
            pathOptions={{ color: '#FFFEFB', weight: 3, fillColor: color, fillOpacity: 1 }}
            eventHandlers={{ click: () => props.onSelect(restaurant.id) }}
          >
            <Tooltip direction="top">{restaurant.name}</Tooltip>
            <Popup
              className="map-place-popup"
              closeButton
              autoPan
              keepInView
              autoPanPaddingTopLeft={[12, 12]}
              autoPanPaddingBottomRight={[12, 24]}
            >
              <article className="map-place-card">
                {restaurant.image && (
                  <img src={shopImage(restaurant.image, 'cards')} alt="" width="320" height="180" />
                )}
                <div className="map-place-card-body">
                  <span className="map-place-card-type">{t(restaurant.kind)}</span>
                  <div className="map-place-card-heading">
                    <h3>{restaurant.name}</h3>
                    {ovenModels.length > 0 && (
                      <span className="map-place-card-ovens" aria-label={restaurant.oven}>
                        {ovenModels.map((model) => (
                          <img key={model.name} src={model.logo} alt="" aria-hidden="true" />
                        ))}
                      </span>
                    )}
                  </div>
                  <p className="map-place-card-location">
                    <MapPin size={14} aria-hidden="true" />
                    <span>
                      {restaurant.city}
                      <small>{restaurant.address}</small>
                    </span>
                  </p>
                  <div className="map-place-card-actions">
                    <a href={restaurant.mapsUrl} target="_blank" rel="noreferrer">
                      {t('directions')}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                    <a
                      href={publicPath(`/${props.locale}/restaurants/${restaurant.id}`)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t('view')}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
