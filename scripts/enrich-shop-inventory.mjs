import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inventoryPath = path.join(root, 'docs', 'shops-roadto-inventory.csv');
const sourcePath = '/private/tmp/RoadToSmartBaking-source.csv';
const mappingPath = '/private/tmp/roadto-shop-image-mapping.json';

function parseCsv(input, delimiter = ',') {
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
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
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

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanNote(note) {
  return note.replace(/\s+/g, ' ').trim();
}

function firstUrl(note) {
  return note.match(/https?:\/\/[^\s"<>]+/)?.[0] ?? '';
}

const inventory = toRecords(parseCsv(fs.readFileSync(inventoryPath, 'utf8')));
const sourceRows = parseCsv(fs.readFileSync(sourcePath, 'utf8'), ';');
const sourceRecords = toRecords(sourceRows);
const mappings = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

const sourceByRecordNumber = new Map(
  sourceRecords.map((record, index) => [String(index + 2), record]),
);
const enrichedHeaders = [
  'campaign_year',
  'shop_name',
  'place',
  'source_image',
  'source_path',
  'extraction_status',
  'spreadsheet_match_status',
  'spreadsheet_source_record_numbers',
  'spreadsheet_shop_name',
  'product_lines',
  'sectors',
  'published_post',
  'address',
  'address_source',
  'source_note',
  'source_article_url',
  'source_workbook',
];

const addressByShop = new Map([
  ['DeRoma', 'Largo del Nazareno 13, Roma'],
  [
    'Glory Pop',
    'Via Correggio 14, Milano | Piazzale A. Cantore 3, Milano | Via F. Bronzetti 9, Milano',
  ],
]);

const enriched = inventory.map((shop) => {
  const mapping = mappings.find((candidate) => candidate.poster_image === shop.source_image);
  const recordNumbers = (mapping?.source_record_numbers ?? '').split(/\s*[,|/]\s*/).filter(Boolean);
  const records = recordNumbers.map((number) => sourceByRecordNumber.get(number)).filter(Boolean);
  const hasMatch = records.length > 0;
  const isReview = recordNumbers.length > 1 || mapping?.match_status === 'Review multiple';
  const address = addressByShop.get(shop.shop_name) ?? '';

  return {
    ...shop,
    spreadsheet_match_status: hasMatch
      ? isReview
        ? 'Review multiple records'
        : 'Matched'
      : 'No reliable match',
    spreadsheet_source_record_numbers: recordNumbers.join(' | '),
    spreadsheet_shop_name: unique(records.map((record) => record['Ragione Sociale'])).join(' | '),
    product_lines: unique(records.map((record) => record['Linea Prodotto'])).join(' | '),
    sectors: unique(records.map((record) => record.Settore)).join(' | '),
    published_post: unique(records.map((record) => record['Pubblicato POST'])).join(' | '),
    address,
    address_source: address ? 'Spreadsheet note' : hasMatch ? 'Not provided in workbook' : '',
    source_note: unique(records.map((record) => cleanNote(record.Note))).join(' | '),
    source_article_url: unique(records.map((record) => firstUrl(record.Note))).join(' | '),
    source_workbook: hasMatch ? 'RoadToSmartBaking.xls' : '',
  };
});

const output =
  [
    enrichedHeaders.join(','),
    ...enriched.map((record) =>
      enrichedHeaders.map((header) => escapeCsv(record[header])).join(','),
    ),
  ].join('\n') + '\n';

fs.writeFileSync(inventoryPath, output, 'utf8');

const summary = {
  shops: enriched.length,
  matched: enriched.filter((record) => record.spreadsheet_match_status === 'Matched').length,
  reviewMultiple: enriched.filter(
    (record) => record.spreadsheet_match_status === 'Review multiple records',
  ).length,
  noReliableMatch: enriched.filter(
    (record) => record.spreadsheet_match_status === 'No reliable match',
  ).length,
  addressesFromWorkbookNotes: enriched.filter((record) => record.address).length,
};

console.log(JSON.stringify(summary, null, 2));
