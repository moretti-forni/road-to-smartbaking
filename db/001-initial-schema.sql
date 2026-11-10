BEGIN;

-- This table contains approved shop records. Suspended records are retained.
CREATE TABLE rtsm_shop (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE CHECK (btrim(slug) <> ''),
    name text NOT NULL CHECK (btrim(name) <> ''),
    category text NOT NULL CHECK (category IN ('pizza', 'bakery', 'hotel', 'other')),
    address text NOT NULL CHECK (btrim(address) <> ''),
    city text NOT NULL CHECK (btrim(city) <> ''),
    country text NOT NULL CHECK (btrim(country) <> ''),
    latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    description_it text,
    description_en text,
    oven_model text,
    website_url text,
    image_url text,
    image_alt_it text,
    image_alt_en text,
    verified_at timestamptz NOT NULL,
    approved_at timestamptz NOT NULL CHECK (approved_at >= verified_at),
    published_at timestamptz CHECK (published_at >= approved_at),
    suspended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (suspended_at IS NULL OR (published_at IS NOT NULL AND suspended_at >= published_at))
);

CREATE TABLE rtsm_story (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL CHECK (btrim(slug) <> ''),
    language text NOT NULL CHECK (language IN ('it', 'en')),
    title text NOT NULL CHECK (btrim(title) <> ''),
    summary text NOT NULL CHECK (btrim(summary) <> ''),
    category text NOT NULL CHECK (btrim(category) <> ''),
    blocks jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(blocks) = 'array'),
    cover_image_url text,
    cover_image_alt text,
    source_url text,
    source_published_at timestamptz,
    approved_at timestamptz,
    published_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (slug, language),
    CHECK (published_at IS NULL OR (approved_at IS NOT NULL AND published_at >= approved_at)),
    CHECK (expires_at IS NULL OR (published_at IS NOT NULL AND expires_at > published_at))
);

-- Contact information and review notes are private staff data.
CREATE TABLE rtsm_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name text NOT NULL CHECK (btrim(business_name) <> ''),
    category text NOT NULL CHECK (category IN ('pizza', 'bakery', 'hotel', 'other')),
    address text NOT NULL CHECK (btrim(address) <> ''),
    city text NOT NULL CHECK (btrim(city) <> ''),
    country text NOT NULL CHECK (btrim(country) <> ''),
    oven_model text NOT NULL CHECK (btrim(oven_model) <> ''),
    website_url text,
    contact_name text NOT NULL CHECK (btrim(contact_name) <> ''),
    contact_email text NOT NULL CHECK (btrim(contact_email) <> ''),
    notes text,
    review_note text,
    status text NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'in_review', 'needs_info', 'approved', 'declined')),
    shop_id uuid REFERENCES rtsm_shop (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((status = 'approved') = (shop_id IS NOT NULL))
);

CREATE INDEX rtsm_requests_queue_idx ON rtsm_requests (status, created_at DESC);
CREATE INDEX rtsm_requests_shop_idx ON rtsm_requests (shop_id);

COMMIT;
