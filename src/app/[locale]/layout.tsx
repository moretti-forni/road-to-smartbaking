import { notFound } from 'next/navigation';
import { LocaleShell } from '../../components/locale-shell';
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'it' && locale !== 'en') notFound();
  return <LocaleShell locale={locale}>{children}</LocaleShell>;
}
