import fs from 'node:fs';
import path from 'node:path';

const inventoryPath = path.join(process.cwd(), 'docs', 'shops-roadto-inventory.csv');
const researchDate = '2026-11-04';

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
  return {
    headers,
    records: dataRows.map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])),
    ),
  };
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function googleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const locations = {
  FICO: {
    address: '1300 East Coast Parkway, Singapore 468964',
    query: 'FICO 1300 East Coast Parkway Singapore 468964',
    status: 'Exact web address',
    note: '',
  },
  Sorellina: {
    address: '699 N Broad St, Philadelphia, PA 19123, United States',
    query: 'Sorellina 699 N Broad St Philadelphia PA 19123',
    status: 'Exact web address',
    note: '',
  },
  Vinarte: {
    address: 'Lungomare San Marco 96, 84043 Agropoli SA, Italy',
    query: 'Vinarte Lungomare San Marco 96 Agropoli',
    status: 'Exact web address',
    note: '',
  },
  '90 Seconds': {
    address:
      'Shop L1-086–088, Coco Park Phase 1, 268 Fuhua 3rd Road, Futian District, Shenzhen, China',
    query: '90 Seconds Coco Park 268 Fuhua 3rd Road Shenzhen',
    status: 'Exact web address',
    note: '',
  },
  "'A Puteca": {
    address: 'Via Vincenzo Gioberti 170/172r, 50121 Firenze FI, Italy',
    query: 'A Puteca Via Vincenzo Gioberti 170 Firenze',
    status: 'Exact web address',
    note: '',
  },
  Brunda: {
    address: 'Piazza Dante 8, 72100 Brindisi BR, Italy',
    query: 'Brunda Pizzeria Piazza Dante 8 Brindisi',
    status: 'Exact web address',
    note: '',
  },
  CapVin: {
    address: '',
    query: 'CapVin Amsterdam',
    status: 'Location not confirmed',
    note: 'No reliable current Amsterdam street address found during web research.',
  },
  'Carlo Fiamma': {
    address: 'Largo della Zecca 3, 84011 Amalfi SA, Italy',
    query: 'Carlo Fiamma Pizza e Cantina Largo della Zecca 3 Amalfi',
    status: 'Exact web address',
    note: '',
  },
  'Pizzeria Cavalese': {
    address:
      'Sunter branch: Ruko Green Lake Sunter, Jl. Danau Sunter Selatan No. 15, North Jakarta, Indonesia',
    query: 'Pizzeria Cavalese Jakarta',
    status: 'Multiple locations',
    note: 'The brand has multiple Jakarta-area branches; this is the Sunter branch.',
  },
  Desdott: {
    address:
      'Candidate listings: Corso di Porta Ticinese 1, 20123 Milano MI, Italy | Piazza Argentina 3, 20124 Milano MI, Italy',
    query: 'Desdott Milano',
    status: 'Needs verification',
    note: 'Candidate directory listings; confirm the active branded location before publishing.',
  },
  Elysium: {
    address: 'Via del Monte della Farina 23, 00186 Roma RM, Italy',
    query: 'Elysium Roma Pizza Cocktails Via del Monte della Farina 23 Rome',
    status: 'Exact web address',
    note: '',
  },
  'Mamma Pizza': {
    address: 'Calle Ferreras 2, 35008 Las Palmas de Gran Canaria, Spain',
    query: 'Mamma Pizza Calle Ferreras 2 Las Palmas',
    status: 'Exact web address',
    note: '',
  },
  'Pizza dei Signori': {
    address: 'Contrà delle Morette 5a, Vicenza VI, Italy',
    query: 'Pizza dei Signori Contra delle Morette 5a Vicenza',
    status: 'Exact web address',
    note: '',
  },
  'nNea Pizza': {
    address: 'Bilderdijkstraat 92H, 1053 KX Amsterdam, Netherlands',
    query: 'nNea Pizza Bilderdijkstraat 92H Amsterdam',
    status: 'Exact web address',
    note: '',
  },
  Paglià: {
    address: 'Via Celso Ulpiani 12, 63078 Pagliare del Tronto AP, Italy',
    query: 'Paglia Pizza e Fichi Via Celso Ulpiani 12 Pagliare del Tronto',
    status: 'Exact web address',
    note: '',
  },
  Sileo: {
    address: 'Via Nazionale 54, 12070 Nucetto CN, Italy',
    query: 'Pizzeria Sileo Via Nazionale 54 Nucetto',
    status: 'Exact web address',
    note: '',
  },
  'The Italian Cousins': {
    address: 'Odengatan 78, 113 22 Stockholm, Sweden',
    query: 'The Italian Cousins Odengatan 78 Stockholm',
    status: 'Multiple locations',
    note: 'The brand has multiple Stockholm locations; this is the Odengatan location.',
  },
  Triticum: {
    address: 'Viale Stefano Franscini 27, 6900 Lugano, Switzerland',
    query: 'Triticum Viale Stefano Franscini 27 Lugano',
    status: 'Exact web address',
    note: '',
  },
  'Valerio Barralis Patisserie': {
    address: 'Corso Europa 78/80, 20013 Magenta MI, Italy',
    query: 'Valerio Barralis Pastry Academy Corso Europa 78 Magenta',
    status: 'Exact web address',
    note: '',
  },
  'Café Grensen': {
    address: 'Grensen 8, 0159 Oslo, Norway',
    query: 'Cafe Grensen Grensen 8 Oslo',
    status: 'Exact web address',
    note: '',
  },
  Campana: {
    address: 'Via Nazionale 80/82, 87064 Corigliano Calabro CS, Italy',
    query: 'Campana Pizza in Teglia Via Nazionale Corigliano Calabro',
    status: 'Conflicting listings',
    note: 'Web sources conflict between street number 80 and 82.',
  },
  'Casa Tobago': {
    address: 'Viale Umbria 120, 20135 Milano MI, Italy',
    query: 'Casa Tobago Viale Umbria 120 Milano',
    status: 'Exact web address',
    note: '',
  },
  Cheesefarm: {
    address: '7 Liberty Square, Tbilisi, Georgia',
    query: 'Cheesefarm 7 Liberty Square Tbilisi',
    status: 'Exact web address',
    note: '',
  },
  Impasto: {
    address: '373 Waverly Ave, Brooklyn, NY 11238, United States',
    query: 'Impasto 373 Waverly Avenue Brooklyn NY',
    status: 'Exact web address',
    note: '',
  },
  'Maiori Pizzeria': {
    address: 'Unit 32/9 Koel Circuit, Peregian Springs QLD 4573, Australia',
    query: 'Maiori Pizzeria 9 Koel Circuit Peregian Springs',
    status: 'Exact web address',
    note: '',
  },
  'Ultra Milano': {
    address: 'Via Pier Lombardo 1, 20135 Milano MI, Italy',
    query: 'Ultra Milano Via Pier Lombardo 1',
    status: 'Exact web address',
    note: '',
  },
  Zia: {
    address: 'Via Goffredo Mameli 45, 00153 Roma RM, Italy',
    query: 'Zia Restaurant Via Goffredo Mameli 45 Rome',
    status: 'Exact web address',
    note: '',
  },
  '22K Pizza': {
    address: 'Peter-Behrens-Platz 3, 4020 Linz, Austria',
    query: '22K Pizza Peter-Behrens-Platz 3 Linz',
    status: 'Exact web address',
    note: '',
  },
  Bedin: {
    address: 'Piazza Dante, Genova GE, Italy',
    query: 'Bedin dal 1862 Piazza Dante Genova',
    status: 'Needs verification',
    note: 'A reliable street number was not found during web research.',
  },
  Azzurra: {
    address: 'Yağhane Sokak, Eski Datça, Muğla, Türkiye',
    query: 'Azzurra Yaghane Sokak Eski Datca',
    status: 'Conflicting listings',
    note: 'Web sources disagree between street number 3 and 5.',
  },
  'Bella Napoli Pizzeria': {
    address: 'Tērbatas iela 14, Riga, Latvia',
    query: 'Bella Napoli Terbatas 14 Riga',
    status: 'Exact web address',
    note: '',
  },
  'Bianca Sicilian Trattoria': {
    address: '1200 E 5th St, Los Angeles, CA 90013, United States',
    query: 'Bianca Sicilian Trattoria 1200 E 5th St Los Angeles',
    status: 'Exact web address',
    note: '',
  },
  'Casa Cinquanta': {
    address: 'Via Velletri 22, 00198 Roma RM, Italy',
    query: 'Casa Cinquanta Via Velletri 22 Roma',
    status: 'Exact web address',
    note: 'Rome location shown on the 2026 poster.',
  },
  DeRoma: {
    address:
      'Via Poli 27 | Largo del Nazareno 13 | Via del Lavatore 41/43 | Via del Tritone 97, Roma RM, Italy',
    query: 'DeRoma Roma',
    status: 'Multiple locations',
    note: 'Multiple official Rome locations.',
  },
  'Glory Pop': {
    address:
      'Via Correggio 14 | Piazzale Antonio Cantore 3 | Via Fratelli Bronzetti 9, Milano MI, Italy',
    query: 'Glory Pop Milano',
    status: 'Multiple locations',
    note: 'Multiple official Milan locations.',
  },
  Imperfetto: {
    address: '14 Boulevard Richard Wallace, 92800 Puteaux, France',
    query: 'Imperfetto Pizzeria Napoletana 14 Boulevard Richard Wallace Puteaux',
    status: 'Exact web address',
    note: 'The poster city is Paris; the restaurant is in Puteaux.',
  },
  "L'Industrie Pizzeria": {
    address: '254 S 2nd St, Brooklyn, NY 11211, United States',
    query: "L'Industrie Pizzeria 254 S 2nd St Brooklyn",
    status: 'Multiple locations',
    note: 'Original Brooklyn location; the brand also has Manhattan locations.',
  },
  'Panificio San Giuseppe': {
    address: 'Via Armando Diaz 44, 95123 Catania CT, Italy',
    query: 'Panificio San Giuseppe Via Armando Diaz 44 Catania',
    status: 'Exact web address',
    note: '',
  },
  Romanaccia: {
    address: '1550 N Cahuenga Blvd, Hollywood, CA 90028, United States',
    query: 'Romanaccia 1550 N Cahuenga Blvd Hollywood',
    status: 'Exact web address',
    note: '',
  },
  Saccharum: {
    address: 'Via Marina della Bruca 1, 90010 Altavilla Milicia PA, Italy',
    query: 'Saccharum Via Marina della Bruca 1 Altavilla Milicia',
    status: 'Exact web address',
    note: '',
  },
  Salentu: {
    address: 'Altkönigstraße 32, 65779 Kelkheim (Taunus), Germany',
    query: 'Salentu Altkonigstrasse 32 Kelkheim',
    status: 'Exact web address',
    note: '',
  },
  'Trizza Pizza': {
    address: 'Narodnog Fronta 21B, Novi Sad, Serbia',
    query: 'Trizza Pizza Narodnog Fronta 21B Novi Sad',
    status: 'Exact web address',
    note: '',
  },
  'Zio Rigo': {
    address: 'Šatrijos g. 1, LT-09300 Vilnius, Lithuania',
    query: 'Zio Rigo Satrijos 1 Vilnius',
    status: 'Exact web address',
    note: '',
  },
};

const { headers, records } = toRecords(parseCsv(fs.readFileSync(inventoryPath, 'utf8')));
const appendedHeaders = [
  'google_maps_url',
  'web_location_status',
  'web_location_note',
  'web_researched_on',
];
const outputHeaders = [
  ...headers.filter((header) => !appendedHeaders.includes(header)),
  ...appendedHeaders,
];

const enriched = records.map((record) => {
  const location = locations[record.shop_name];
  if (!location) throw new Error(`No web-location record for ${record.shop_name}`);

  const previousAddressSource =
    record.address_source && record.address_source !== 'Not provided in workbook'
      ? record.address_source
      : '';
  return {
    ...record,
    address: location.address,
    address_source: location.address
      ? [previousAddressSource, `Web lookup (${researchDate})`].filter(Boolean).join(' | ')
      : previousAddressSource,
    google_maps_url: googleMapsUrl(location.query),
    web_location_status: location.status,
    web_location_note: location.note,
    web_researched_on: researchDate,
  };
});

fs.writeFileSync(
  inventoryPath,
  `${outputHeaders.join(',')}\n${enriched.map((record) => outputHeaders.map((header) => escapeCsv(record[header])).join(',')).join('\n')}\n`,
  'utf8',
);

const statusCounts = enriched.reduce((counts, record) => {
  counts[record.web_location_status] = (counts[record.web_location_status] ?? 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({ rows: enriched.length, statusCounts }, null, 2));
