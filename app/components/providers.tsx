import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18n, type Locale } from '../i18n';

const storageKey = 'rtsb:saved:v1';
interface SavedState {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
  storageError: boolean;
  ready: boolean;
}
const SavedContext = createContext<SavedState | null>(null);
export function readSaved(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length < 150))]
      : [];
  } catch {
    return [];
  }
}
export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const instance = useMemo(() => createI18n(locale), [locale]);
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: 1 } } }),
  );
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      setIds(readSaved(localStorage.getItem(storageKey)));
    } catch {
      setStorageError(true);
    }
    setReady(true);
    function onStorage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) setIds(readSaved(event.newValue));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  function persist(next: string[]) {
    setIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  }
  return (
    <I18nextProvider i18n={instance}>
      <QueryClientProvider client={client}>
        <SavedContext.Provider
          value={{
            ids,
            ready,
            storageError,
            toggle: (id) =>
              persist(ids.includes(id) ? ids.filter((saved) => saved !== id) : [...ids, id]),
            clear: () => persist([]),
          }}
        >
          {children}
        </SavedContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
export function useSaved() {
  const state = useContext(SavedContext);
  if (!state) throw new Error('Saved provider missing');
  return state;
}
