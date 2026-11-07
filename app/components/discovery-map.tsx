import { useEffect, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { shopImage, type Restaurant } from '../data/restaurants';
import { resolveOvens } from '../data/ovens';
import type { Bounds } from '../services/discovery';
import { publicPath } from '../utils/public-path';
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
  const { locale } = useParams();
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const [isScrollZoomEnabled, setIsScrollZoomEnabled] = useState(false);
  const customTileUrl = import.meta.env.VITE_MAP_TILE_URL;
  const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY;
  const usesCartoBasemap = !customTileUrl && Boolean(cartoKey);
  const tileUrl =
    customTileUrl ||
    (cartoKey
      ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  const attribution =
    import.meta.env.VITE_MAP_ATTRIBUTION ||
    (usesCartoBasemap
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  return (
    <div className="map-inner" onClick={() => setIsScrollZoomEnabled(true)}>
      <MapContainer
        className="discovery-map"
        center={[42.5, 12.5]}
        zoom={5}
        scrollWheelZoom={false}
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
        <ScrollWheelZoom enabled={isScrollZoomEnabled} />
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
        {props.records.map((restaurant) => {
          const ovenModels = resolveOvens(restaurant.oven).filter((model) => model.logo);
          const color =
            restaurant.coordinatePrecision === 'place-fallback'
              ? '#c98512'
              : restaurant.coordinatePrecision === 'place'
                ? '#68755a'
                : '#D62839';
          return (
            <CircleMarker
              key={restaurant.id}
              center={[restaurant.lat, restaurant.lng]}
              radius={props.selected === restaurant.id ? 13 : 9}
              pathOptions={{ color: '#FFFEFB', weight: 3, fillColor: color, fillOpacity: 1 }}
              eventHandlers={{ click: () => props.onSelect(restaurant.id) }}
            >
              <Tooltip direction="top">{restaurant.name}</Tooltip>
              <Popup className="map-place-popup" closeButton={false} autoPan={false}>
                <article className="map-place-card">
                  <img src={shopImage(restaurant.image, 'cards')} alt="" width="320" height="180" />
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
                        href={publicPath(`/${locale}/restaurants/${restaurant.id}`)}
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
      </MapContainer>
      {!isScrollZoomEnabled && <p className="map-zoom-hint">{t('mapZoomInstruction')}</p>}
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
