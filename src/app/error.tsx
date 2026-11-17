'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Questa pagina non è disponibile. / This page is not available.</h1>
      <button className="button primary" onClick={reset}>
        Riprova / Try again
      </button>
    </main>
  );
}
