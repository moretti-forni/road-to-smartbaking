'use client';
import { useCallback } from 'react';
import { usePathname, useSearchParams as useNextSearchParams } from 'next/navigation';
export function useLocation() {
  const pathname = usePathname();
  const params = useNextSearchParams();
  return { pathname, search: params.size ? `?${params}` : '' };
}
type Input = URLSearchParams | Record<string, string>;
export function useSearchParams() {
  const params = useNextSearchParams();
  const pathname = usePathname();
  const set = useCallback(
    (
      input: Input | ((current: URLSearchParams) => Input),
      options?: { replace?: boolean; preventScrollReset?: boolean },
    ) => {
      const current = new URLSearchParams(window.location.search);
      const next = new URLSearchParams(typeof input === 'function' ? input(current) : input);
      const url = pathname + (next.size ? `?${next}` : '');
      window.history[options?.replace ? 'replaceState' : 'pushState'](null, '', url);
      if (!options?.preventScrollReset) window.scrollTo({ top: 0 });
    },
    [pathname],
  );
  return [new URLSearchParams(params.toString()), set] as const;
}
