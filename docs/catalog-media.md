# Catalogue images from S3

Existing venue images, card/hero WebP variants, story images, oven images and the factory photograph are uploaded under `media/catalog/`, preserving the public-directory structure. App icons, fonts and navigation branding remain local. Existing external URLs and newly uploaded Studio media URLs are preserved unchanged.

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

The URL resolver maps `/shops-webp/cards/example.webp` to `${NEXT_PUBLIC_MEDIA_BASE_URL}/media/catalog/shops-webp/cards/example.webp`. If the build variable is absent, bundled local images are used. It must be present during `next build` and mobile builds because client code embeds it at build time. `scripts/prepare-amplify-env.mjs` allowlists it for Amplify. Keep local files until the deployed site is verified.

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
