export const legalDocuments = {
  it: {
    file: 'assets/t&s/informativa_roadtosmartbaking_IT.pdf',
    key: 'media/legal/2026-11-23/informativa-roadtosmartbaking-it-7e39cffc99b4.pdf',
    sha256: '7e39cffc99b4301554c22d4bfcfa8f36a763b7553f3630b32f260c4fc93d2b8f',
  },
  en: {
    file: 'assets/t&s/informativa_roadtosmartbaking_EN.pdf',
    key: 'media/legal/2026-11-23/informativa-roadtosmartbaking-en-cbdc14beb46d.pdf',
    sha256: 'cbdc14beb46df6597fd6c7d1087a03017c97fbfa08f54e8fa3260dfa6b5284af',
  },
};
export function privacyNoticeUrl(language) {
  const base =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '') ||
    'https://d3qfdqu26x4ym8.cloudfront.net';
  return `${base}/${legalDocuments[language === 'en' ? 'en' : 'it'].key}`;
}
