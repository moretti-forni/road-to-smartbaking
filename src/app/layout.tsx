import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import '../styles/global.css';
export const metadata: Metadata = {
  title: 'RoadToSmartBaking',
  robots: { index: false, follow: false },
  icons: { icon: '/moretti-arch.svg', apple: '/moretti-arch-180.png' },
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = {
  themeColor: '#20201E',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = (await headers()).get('x-rtsm-locale') === 'en' ? 'en' : 'it';
  return (
    <html lang={language} data-scroll-behavior="smooth">
      <body>
        {process.env.RTSM_DEPLOY_ENV === 'dev' && <div className="environment-banner">DEV</div>}
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
