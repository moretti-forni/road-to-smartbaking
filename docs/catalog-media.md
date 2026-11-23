# Catalogue images from S3

Existing venue images, card/hero WebP variants, story images, oven images and the factory photograph are uploaded under `media/catalog/`, preserving the original directory structure. Catalogue source files now live in `assets/catalog/`, outside the web public directory. App icons, fonts and navigation branding remain local. Existing external URLs and newly uploaded Studio media URLs are preserved unchanged.

AWS deployment:

- Region: `eu-west-1`
- Stack: `roadtosmartbaking-media-prod`
- Bucket: `roadtosmartbaking-media-prod-mediabucket-e7py6kqnfbrv`
- CloudFront distribution: `E3BF24DEL1I26P`
- Delivery base URL: `https://d3qfdqu26x4ym8.cloudfront.net`

Set the following non-secret values for the application build:

```text
NEXT_PUBLIC_MEDIA_BASE_URL=https://d3qfdqu26x4ym8.cloudfront.net
```

The URL resolver maps `/shops-webp/cards/example.webp` to `${NEXT_PUBLIC_MEDIA_BASE_URL}/media/catalog/shops-webp/cards/example.webp`. Production builds require the CDN variable and fail if it is absent. For local development without it, `predev` generates ignored local public copies from the source archive. It must be present during `next build` and mobile builds because client code embeds it at build time. `scripts/prepare-amplify-env.mjs` allowlists it for Amplify. The source archive stays available for verification/re-upload but is excluded from deployed public assets and the Docker build context.

For new Studio uploads, also configure the server-side values:

```text
S3_MEDIA_BUCKET=roadtosmartbaking-media-prod-mediabucket-e7py6kqnfbrv
MEDIA_PUBLIC_BASE_URL=https://d3qfdqu26x4ym8.cloudfront.net
RTSM_AWS_REGION=eu-west-1
```

These do not grant upload access by themselves. The server compute role requires the scoped S3 permissions described in `docs/amplify-setup.md`. No role policy is changed by the catalogue upload script.

The bucket has public access blocked. CloudFront Origin Access Control reads `media/*`; `incoming/*` is private. Browser POST-upload CORS currently permits only `https://roadtosmartbaking.com`. Add staging/alternate origins deliberately if required; public image display does not require POST CORS access.

## Uploading bundled images

```sh
npm run media:upload
AWS_PROFILE=Moretti S3_MEDIA_BUCKET=roadtosmartbaking-media-prod-mediabucket-e7py6kqnfbrv npm run media:upload -- --apply
```

Without `--apply`, the script only reports the file count and total size. Applied uploads use conditional writes and verify stored size and SHA-256 metadata. Identical existing objects are skipped; different objects at the same key cause a failure instead of an overwrite. No objects are deleted. For replacements, use a new filename or an explicit reviewed invalidation/versioning procedure. Existing catalogue responses have one-day cache headers.

## Release

1. Verify S3 objects and CDN image responses.
2. Configure the build variable in Amplify for the intended branch.
3. Commit/push the code separately and deploy with the full application runtime configuration.
4. Verify venue cards/details, story covers/body images, map popups and oven images.

Cloud resource creation does not publish these local code changes to the website. Public S3 URLs remain forbidden; CloudFront URLs are the intended delivery route.

## Upload guarantees and current limits

Completion uses a deterministic processed key derived from the temporary upload ID. Retries return the same verified object; conditional writes avoid duplicate object versions from concurrent completions. S3 SHA-256 checksums and stored length are checked before success is returned. Files are processed in memory and are never written to web-server disk. Essential app icons/fonts remain bundled.

The `postbuild` check rejects catalogue media in public or standalone deployment output. CI uses the real non-secret CDN origin for production builds. `Dockerfile` requires the same build argument; Compose passes it from `NEXT_PUBLIC_MEDIA_BASE_URL`.

A real signed POST/processing/CDN/retry test passed on November 19, 2026, with the generated test object and all its S3 versions removed afterward. The Amplify role `rtsm-amplify-ssr-main` now has scoped Put/Get permissions for this bucket's incoming/media prefixes and Delete only for incoming objects. No public bucket access was enabled.

The currently deployed private-data mode explicitly blocks Studio authentication/admin endpoints. The infrastructure and upload pipeline are verified; staff-browser uploads remain unavailable until that authentication integration is completed and the new code is deployed. This change does not bypass those restrictions. Unreferenced processed images from abandoned drafts are retained; automatic deletion needs reference-aware cleanup and is not performed here.

## Browser upload origins

The media stack's `AllowedOrigin` parameter accepts a comma-separated list. The shared bucket permits POST uploads from `https://roadtosmartbaking.com`, `https://www.roadtosmartbaking.com`, and `https://dev.d39rjisb2mzg1i.amplifyapp.com`. Keep these exact origins aligned with each Amplify branch's `RTSM_APP_ORIGIN`. CORS permits browser access; staff session authorization and signed S3 upload policies are still required.

## Registration privacy PDFs

Source documents are archived under `assets/t&s/`, outside `public`. `src/features/catalog/legal-documents.mjs` maps Italian and English to immutable, content-hashed keys under `media/legal/`. Registration links open the matching privacy notice through CloudFront in a new tab; submission notes record that document URL alongside the declarations.

Run `AWS_PROFILE=Moretti node --env-file=.env.local scripts/upload-legal-documents.mjs` to review the plan, then add `--apply` to upload and verify SHA-256 checksums. The script refuses source files that differ from the manifest. A revised document needs a new manifest hash/key; do not overwrite a published version. PDFs are served inline as `application/pdf` and remain excluded from the webapp's public assets. These two PDFs are privacy notices, rather than separate membership terms.
