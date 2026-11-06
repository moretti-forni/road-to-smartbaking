import fs from 'node:fs';
import path from 'node:path';

const inventoryPath = path.join(process.cwd(), 'docs', 'shops-roadto-inventory.csv');
const outputPath = path.join(process.cwd(), 'app', 'data', 'shop-coordinates.json');
const endpoint = 'https://nominatim.openstreetmap.org/search';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

function primaryAddress(address) {
  return address
    .replace(/^Candidate listings:\s*/i, '')
    .replace(/^Sunter branch:\s*/i, '')
    .split('|')[0]
    .trim();
}

async function geocode(query) {
  const url = new URL(endpoint);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RoadToSmartBakingWeb/0.1 (local project geocoding)',
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Geocoding request failed (${response.status}) for ${query}`);
  const [result] = await response.json();
  return result
    ? {
        lat: Number(result.lat),
        lng: Number(result.lon),
        displayName: result.display_name,
      }
    : null;
}

const shops = toRecords(parseCsv(fs.readFileSync(inventoryPath, 'utf8')));
const coordinates = {};

for (const [index, shop] of shops.entries()) {
  const addressQuery = primaryAddress(shop.address);
  const queries = [addressQuery, `${shop.shop_name}, ${shop.place}`].filter(Boolean);
  let result = null;
  let query = '';

  for (const candidate of queries) {
    console.log(`[${index + 1}/${shops.length}] ${shop.shop_name}: ${candidate}`);
    result = await geocode(candidate);
    query = candidate;
    if (result) break;
    await delay(1100);
  }

  coordinates[shop.shop_name] = result
    ? {
        ...result,
        query,
        precision: query === addressQuery && addressQuery ? 'address' : 'place',
      }
    : {
        lat: null,
        lng: null,
        displayName: '',
        query,
        precision: 'unresolved',
      };
  await delay(1100);
}

fs.writeFileSync(outputPath, `${JSON.stringify(coordinates, null, 2)}\n`, 'utf8');
const unresolved = Object.entries(coordinates)
  .filter(([, coordinate]) => coordinate.precision === 'unresolved')
  .map(([name]) => name);
console.log(
  `Wrote ${Object.keys(coordinates).length} coordinates to ${path.relative(process.cwd(), outputPath)}.`,
);
if (unresolved.length) console.log(`Unresolved: ${unresolved.join(', ')}`);
