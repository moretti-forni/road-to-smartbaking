import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inventoryPath = path.join(root, 'docs', 'shops-roadto-inventory.csv');
const coordinatesPath = path.join(root, 'app', 'data', 'shop-coordinates.json');
const outputPath = path.join(root, 'app', 'data', 'restaurants.ts');
const sourceImagesDirectory = path.join(root, 'Shops_Roadto');
const publicImagesDirectory = path.join(root, 'public', 'shops');

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];
    if (quoted) {
      if (character === '"' && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function toRecords(rows) {
  const [headers, ...dataRows] = rows;
  return dataRows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])),
  );
}

function idFromName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ovenLabel(productLines) {
  return (
    productLines
      .replaceAll('|##|', '·')
      .replace(/\s*\|\s*/g, ' · ')
      .replace(/\s+/g, ' ')
      .trim() || 'Moretti Forni'
  );
}

const coordinates = JSON.parse(fs.readFileSync(coordinatesPath, 'utf8'));
const shops = toRecords(parseCsv(fs.readFileSync(inventoryPath, 'utf8')));
const ids = new Set();
const restaurants = shops.map((shop) => {
  const coordinate = coordinates[shop.shop_name];
  if (!coordinate || !Number.isFinite(coordinate.lat) || !Number.isFinite(coordinate.lng)) {
    throw new Error(`Missing usable coordinates for ${shop.shop_name}`);
  }
  const id = idFromName(shop.shop_name);
  if (ids.has(id)) throw new Error(`Duplicate restaurant id ${id}`);
  ids.add(id);

  const isBakery = /bakery|pastry/i.test(`${shop.sectors} ${shop.shop_name}`);
  const imageName = path.basename(shop.source_image);
  const sourceImagePath = path.join(sourceImagesDirectory, imageName);
  if (!fs.existsSync(sourceImagePath)) throw new Error(`Missing poster image ${sourceImagePath}`);

  return {
    id,
    name: shop.shop_name,
    city: shop.place,
    address: shop.address || `Location lookup: ${shop.place}`,
    kind: isBakery ? 'bakery' : 'pizza',
    image: `/shops/${imageName}`,
    lat: coordinate.lat,
    lng: coordinate.lng,
    oven: ovenLabel(shop.product_lines),
    mapsUrl: shop.google_maps_url,
    locationStatus: shop.web_location_status,
    locationNote: shop.web_location_note,
    coordinatePrecision: coordinate.precision,
    description: {
      it: `${shop.shop_name} è una tappa RoadToSmartBaking a ${shop.place}.`,
      en: `${shop.shop_name} is a RoadToSmartBaking stop in ${shop.place}.`,
    },
  };
});

fs.mkdirSync(publicImagesDirectory, { recursive: true });
for (const restaurant of restaurants) {
  const imageName = path.basename(restaurant.image);
  fs.copyFileSync(
    path.join(sourceImagesDirectory, imageName),
    path.join(publicImagesDirectory, imageName),
  );
}

const source = `import { z } from 'zod';

export const restaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  kind: z.enum(['pizza', 'bakery']),
  image: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  oven: z.string(),
  mapsUrl: z.string().url(),
  locationStatus: z.string(),
  locationNote: z.string(),
  coordinatePrecision: z.enum(['address', 'place', 'place-fallback']),
  description: z.object({ it: z.string(), en: z.string() }),
});

export type Restaurant = z.infer<typeof restaurantSchema>;

export const restaurants: Restaurant[] = ${JSON.stringify(restaurants, null, 2)};
`;

fs.writeFileSync(outputPath, source, 'utf8');
console.log(
  `Generated ${restaurants.length} restaurants and copied ${restaurants.length} poster images.`,
);
