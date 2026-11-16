'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
export function clientLoader() {
  throw new Response('Not found', { status: 404 });
}
export default function NotFound() {
  const { t } = useTranslation();
  const { locale } = useParams<{ locale: string; slug: string }>();
  return (
    <main id="main" className="empty-state">
      <h1>{t('unavailable')}</h1>
      <p>{t('unavailableText')}</p>
      <Link href={`/${locale}`} className="button primary">
        {t('browse')}
      </Link>
    </main>
  );
}
