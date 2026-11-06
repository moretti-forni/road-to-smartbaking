import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
export function clientLoader() {
  throw new Response('Not found', { status: 404 });
}
export default function NotFound() {
  const { t } = useTranslation();
  const { locale } = useParams();
  return (
    <main id="main" className="empty-state">
      <h1>{t('unavailable')}</h1>
      <p>{t('unavailableText')}</p>
      <Link to={`/${locale}`} className="button primary">
        {t('browse')}
      </Link>
    </main>
  );
}
