
ALTER TABLE rtsm_shop
  ADD COLUMN draft_payload jsonb,
  ADD COLUMN draft_revision uuid,
  ADD COLUMN draft_saved_at timestamptz,
  ADD CONSTRAINT rtsm_shop_draft_consistent CHECK (
    (draft_payload IS NULL AND draft_revision IS NULL AND draft_saved_at IS NULL) OR
    (draft_payload IS NOT NULL AND jsonb_typeof(draft_payload) = 'object'
      AND draft_revision IS NOT NULL AND draft_saved_at IS NOT NULL));

ALTER TABLE rtsm_story
  ADD COLUMN draft_payload jsonb,
  ADD COLUMN draft_revision uuid,
  ADD COLUMN draft_saved_at timestamptz,
  ADD CONSTRAINT rtsm_story_draft_consistent CHECK (
    (draft_payload IS NULL AND draft_revision IS NULL AND draft_saved_at IS NULL) OR
    (draft_payload IS NOT NULL AND jsonb_typeof(draft_payload) = 'object'
      AND draft_revision IS NOT NULL AND draft_saved_at IS NOT NULL));

INSERT INTO rtsm_shop (slug, name, category, address, city, country, latitude, longitude,
 description_it, description_en, oven_model, website_url, image_url, image_alt_it, image_alt_en,
 verified_at, approved_at)
SELECT slug, payload->>'name', payload->>'category', payload->>'address', payload->>'city',
 payload->>'country', (payload->>'latitude')::double precision, (payload->>'longitude')::double precision,
 payload->>'descriptionIt', payload->>'descriptionEn', payload->>'oven', payload->>'website',
 payload->>'imageUrl', payload->>'imageAltIt', payload->>'imageAltEn', now(), now()
FROM rtsm_content_draft WHERE kind = 'shop' ON CONFLICT (slug) DO NOTHING;
INSERT INTO rtsm_story (slug, language, title, summary, category, blocks, cover_image_url, cover_image_alt, source_url)
SELECT slug, language, payload->>'title', payload->>'summary', payload->>'category', payload->'blocks',
 payload->>'coverImageUrl', payload->>'coverImageAlt', payload->>'sourceUrl'
FROM rtsm_content_draft WHERE kind = 'story' ON CONFLICT (slug, language) DO NOTHING;
UPDATE rtsm_shop s SET draft_payload = d.payload, draft_revision = d.revision, draft_saved_at = d.saved_at
FROM rtsm_content_draft d WHERE d.kind = 'shop' AND d.slug = s.slug;
UPDATE rtsm_story s SET draft_payload = d.payload, draft_revision = d.revision, draft_saved_at = d.saved_at
FROM rtsm_content_draft d WHERE d.kind = 'story' AND d.slug = s.slug AND d.language = s.language;
DROP TABLE rtsm_content_draft;
