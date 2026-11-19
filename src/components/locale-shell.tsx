'use client';
import { useEffect } from 'react';
import { Providers, useSaved } from './providers';
import { Header, Footer, MobileTabBar } from './shell';
import { ListingRequestButton } from './listing-request';
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
export function LocaleShell({
  locale,
  children,
}: {
  locale: 'it' | 'en';
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <Providers locale={locale}>
      <Header />
      <StorageNotice />
      {children}
      <Footer />
      <ListingRequestButton variant="floating" />
      <MobileTabBar />
    </Providers>
  );
}
