export function mapTiles() {
  const customTileUrl = import.meta.env.VITE_MAP_TILE_URL;
  const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY;
  const usesCartoBasemap = !customTileUrl && Boolean(cartoKey);
  const url =
    customTileUrl ||
    (cartoKey
      ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  const attribution =
    import.meta.env.VITE_MAP_ATTRIBUTION ||
    (usesCartoBasemap
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  return { url, attribution };
}
