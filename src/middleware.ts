import { NextResponse, type NextRequest } from 'next/server';
// Set document language before server rendering; never trust a caller-supplied locale header.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const segment = request.nextUrl.pathname.split('/')[1];
  headers.set('x-rtsm-locale', segment === 'en' || segment === 'admin' ? 'en' : 'it');
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/', '/it/:path*', '/en/:path*', '/admin/:path*'] };
