import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLocation,
  useRouteError,
} from 'react-router';
import type { ReactNode } from 'react';
import './styles/global.css';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const locale = location.pathname.split('/')[1] === 'en' ? 'en' : 'it';
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#20201E" />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="icon" href="/moretti-symbol.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
export default function App() {
  return <Outlet />;
}
export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) || error instanceof Response ? error.status : 500;
  return (
    <main className="error-page">
      <span className="eyebrow brand-tag">#RoadToSmartBaking · {status}</span>
      <h1>
        Ripartiamo da una
        <br />
        <em>nuova scoperta.</em>
      </h1>
      <p>Questa pagina non è disponibile. / This page is not available.</p>
      <a className="button primary" href="/it">
        Esplora / Explore →
      </a>
    </main>
  );
}
