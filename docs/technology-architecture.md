# Current architecture

Updated November 16, 2026 for the Next.js migration branch. This supersedes the earlier React Router static-web decision.

The website, Marketing Studio, and `/api/v1` HTTP API run in one Next.js App Router project. Public locale layouts validate Italian/English; interactive UI uses client components. Story and shop detail pages read the shared server workflows directly and render on demand. Browser and native API clients retain the existing versioned JSON contracts.

`src/server/http` handles bounded JSON input, origin rules, and safe error mapping. `src/server/auth` contains the current development staff-token check. `src/server/services` preserves review, draft, and publication behavior. `src/server/repositories` owns parameterized PostgreSQL queries and transactions. `src/server/db` owns the reusable pool and migrations. `src/features/catalog` contains reusable validation and record conversion.

Local PostgreSQL uses a separate Compose project/volume and port 5434. Runtime access requires an explicit server-side `DATABASE_URL`; it does not silently use the existing database. Production should use a dedicated database service if compute/failure isolation is required. Database initialization/import and backups are separate operational steps.

Capacitor uses a separate generated static SPA from the same repository. React Router remains a mobile build dependency; it no longer serves the website. `mobile-source` contains the native routing/loader adapters. Public configuration uses `NEXT_PUBLIC_*`; database credentials and staff secrets must never use that prefix.

The legacy staff token is development-only. Company-domain email OTP sessions, Secrets Manager runtime loading and S3 image-upload workflows are implemented. Individual role management, cloud provisioning, database backup setup and public-submission rate limiting remain release work. This migration creates no cloud resources and writes no production data.

See the root README for setup, checks, environment variables, and deployment boundaries.

November 17 update: the app now targets Next.js 15.5.29 for Amplify managed SSR, with middleware locale handling and a patched PostCSS override. OTP staff sessions, tracked migrations and server-side Secrets Manager loading are prepared. Studio images use a signed S3 temporary-upload flow followed by server-side validation/WebP conversion and private-bucket CloudFront delivery. See docs/amplify-setup.md. AWS resources have not been provisioned.
