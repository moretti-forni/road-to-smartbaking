import { useEffect, useState } from 'react';
import type { LatLngTuple } from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { mapTiles } from '../../services/map-tiles';
import styles from '../../routes/admin.module.css';
import 'leaflet/dist/leaflet.css';

export type StudioPin = {
  id: string;
  name: string;
  location: string;
  position: LatLngTuple;
  visible: boolean;
};

function FramePins({ pins, detail }: { pins: StudioPin[]; detail: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 1) map.setView(pins[0].position, detail ? 15 : 8);
    else if (pins.length)
      map.fitBounds(
        pins.map(({ position }) => position),
        { padding: [28, 28], maxZoom: 9 },
      );
  }, [map, pins, detail]);
  return null;
}

export default function StudioMap({
  pins,
  detail = false,
  onOpen,
}: {
  pins: StudioPin[];
  detail?: boolean;
  onOpen?: (slug: string) => void;
}) {
  const [tileError, setTileError] = useState(false);
  const { url, attribution } = mapTiles();

  return (
    <div
      className={styles.mapFrame}
      role="region"
      aria-label={detail ? 'Shop coordinate preview' : 'Shop network map'}
    >
      <MapContainer
        className={detail ? styles.shopMap : styles.networkMap}
        center={pins[0]?.position ?? [41.9, 12.5]}
        zoom={detail ? 15 : 4}
        scrollWheelZoom={false}
      >
        <TileLayer
          url={url}
          attribution={attribution}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <FramePins pins={pins} detail={detail} />
        {pins.map((pin) => (
          <CircleMarker
            key={pin.id}
            center={pin.position}
            radius={detail ? 9 : 7}
            pathOptions={{
              color: '#fffefb',
              weight: 2,
              fillColor: pin.visible || detail ? '#d62839' : '#5f5d59',
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>{pin.name}</strong>
              <br />
              {pin.location}
              {onOpen && (
                <>
                  <br />
                  <button className={styles.textButton} onClick={() => onOpen(pin.id)}>
                    Open shop
                  </button>
                </>
              )}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {tileError && (
        <p className={styles.mapNotice} role="status">
          The basemap is unavailable. Pins still show their coordinates.
        </p>
      )}
    </div>
  );
}
