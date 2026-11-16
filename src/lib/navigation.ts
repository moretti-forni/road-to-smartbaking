'use client';
import { useCallback } from 'react';
import { usePathname, useSearchParams as useNextSearchParams, useRouter } from 'next/navigation';
export function useLocation() {
  const pathname = usePathname();
  const params = useNextSearchParams();
  return { pathname, search: params.size ? `?${params}` : '' };
}
type Input = URLSearchParams | Record<string, string>;
export function useSearchParams() {
  const params = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = useCallback(
    (
      input: Input | ((current: URLSearchParams) => Input),
      options?: { replace?: boolean; preventScrollReset?: boolean },
    ) => {
      const current = new URLSearchParams(window.location.search);
      const next = new URLSearchParams(typeof input === 'function' ? input(current) : input);
      const url = pathname + (next.size ? `?${next}` : '');
      router[options?.replace ? 'replace' : 'push'](url, { scroll: !options?.preventScrollReset });
    },
    [pathname, router],
  );
  return [new URLSearchParams(params.toString()), set] as const;
}
