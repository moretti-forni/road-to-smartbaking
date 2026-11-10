CREATE TABLE IF NOT EXISTS rtsm_content_draft (
    kind text NOT NULL CHECK (kind IN ('shop', 'story')),
    slug text NOT NULL,
    language text NOT NULL,
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    revision uuid NOT NULL DEFAULT gen_random_uuid(),
    saved_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, slug, language),
    CHECK ((kind = 'shop' AND language = '') OR (kind = 'story' AND language IN ('it', 'en')))
);
