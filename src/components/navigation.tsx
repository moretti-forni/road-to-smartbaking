'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
export function NavLink({
  href,
  end,
  className,
  ...props
}: ComponentProps<typeof Link> & { end?: boolean }) {
  const path = usePathname();
  const target = String(href);
  const active = path === target || (!end && path.startsWith(`${target}/`));
  return (
    <Link
      {...props}
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[className, active && 'active'].filter(Boolean).join(' ')}
    />
  );
}
