import { Outlet, useParams } from 'react-router';
import { Providers, useSaved } from '../components/providers';
import { Header, Footer, MobileTabBar } from '../components/shell';
import { useTranslation } from 'react-i18next';

function StorageNotice() {
  const { storageError } = useSaved();
  const { t } = useTranslation();
  return storageError ? (
    <p className="notice" role="status">
      {t('storageError')}
    </p>
  ) : null;
}
export default function LocaleLayout() {
  const { locale } = useParams();
  if (locale !== 'it' && locale !== 'en') throw new Response('Not found', { status: 404 });
  return (
    <Providers locale={locale === 'en' ? 'en' : 'it'}>
      <Header />
      <StorageNotice />
      <Outlet />
      <Footer />
      <MobileTabBar />
    </Providers>
  );
}
