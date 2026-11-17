import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>Pagina non disponibile / Page not found</h1>
      <p>Questa pagina non è disponibile. / This page is not available.</p>
      <Link href="/it" className="button primary">
        Esplora / Explore
      </Link>
    </main>
  );
}
