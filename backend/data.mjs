const publicShop = `slug, name, category, address, city, country, latitude, longitude,
  description_it AS "descriptionIt", description_en AS "descriptionEn", oven_model AS oven,
  website_url AS website, image_url AS "imageUrl", image_alt_it AS "imageAltIt",
  image_alt_en AS "imageAltEn", frontend_source->>'mapsUrl' AS "mapsUrl",
  frontend_source->>'locationNote' AS "locationNote",
  frontend_source->>'coordinatePrecision' AS "coordinatePrecision"`;
const shopColumns = `id, ${publicShop}, verified_at AS "verifiedAt", approved_at AS "approvedAt",
  published_at AS "publishedAt", suspended_at AS "suspendedAt"`;
const shopVisible = 'published_at <= now() AND suspended_at IS NULL';
const storySummary = `slug, language, title, summary, category, cover_image_url AS "coverImageUrl",
  cover_image_alt AS "coverImageAlt", source_url AS "sourceUrl", published_at AS "publishedAt",
  source_published_at AS "sourcePublishedAt", frontend_source->'readMinutes' AS "readMinutes"`;
const storyVisible = 'published_at <= now() AND (expires_at IS NULL OR expires_at > now())';
const requestColumns = `id, business_name AS "businessName", category, address, city, country,
  oven_model AS oven, website_url AS website, contact_name AS "contactName", contact_email AS email,
  notes, review_note AS "reviewNote", status, shop_id AS "shopId", created_at AS "createdAt"`;

async function one(db, sql, params) {
  return (await db.query(sql, params)).rows[0];
}

export async function listShops(db, { q, category, limit, offset }) {
  const { rows } = await db.query(
    `SELECT ${publicShop} FROM rtsm_shop WHERE ${shopVisible}
      AND ($1::text IS NULL OR strpos(lower(concat_ws(' ', name, city, address)), lower($1)) > 0)
      AND ($2::text IS NULL OR category = $2)
      ORDER BY name, slug LIMIT $3 OFFSET $4`,
    [q, category, limit, offset],
  );
  return rows;
}

export function getShop(db, slug) {
  return one(db, `SELECT ${publicShop} FROM rtsm_shop WHERE slug = $1 AND ${shopVisible}`, [slug]);
}

export async function listStories(db, { language, limit, offset }) {
  const { rows } = await db.query(
    `SELECT ${storySummary} FROM rtsm_story WHERE language = $1 AND ${storyVisible}
      ORDER BY COALESCE(source_published_at, published_at) DESC, slug LIMIT $2 OFFSET $3`,
    [language, limit, offset],
  );
  return rows;
}

export function getStory(db, { language, slug }) {
  return one(
    db,
    `SELECT ${storySummary}, blocks FROM rtsm_story
    WHERE language = $1 AND slug = $2 AND ${storyVisible}`,
    [language, slug],
  );
}

export function submitRequest(db, request) {
  return one(
    db,
    `INSERT INTO rtsm_requests
    (business_name, category, address, city, country, oven_model, website_url,
      contact_name, contact_email, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, status`,
    [
      request.businessName,
      request.category,
      request.address,
      request.city,
      request.country,
      request.oven,
      request.website,
      request.contactName,
      request.email,
      request.notes,
    ],
  );
}

export async function listRequests(db, { limit, offset }) {
  const { rows } = await db.query(
    `SELECT ${requestColumns} FROM rtsm_requests ORDER BY created_at DESC, id LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows;
}

export function getRequest(db, id) {
  return one(db, `SELECT ${requestColumns} FROM rtsm_requests WHERE id = $1`, [id]);
}

export function reviewRequest(db, id, { status, note }) {
  return one(
    db,
    `UPDATE rtsm_requests SET status = $2, review_note = $3, updated_at = now()
    WHERE id = $1 AND status <> 'approved' RETURNING ${requestColumns}`,
    [id, status, note],
  );
}

export async function listStaffShops(db, { limit, offset }) {
  const { rows } = await db.query(
    `SELECT ${shopColumns} FROM rtsm_shop ORDER BY created_at DESC, id LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows;
}

export function createShop(db, shop) {
  return one(
    db,
    `INSERT INTO rtsm_shop
    (slug, name, category, address, city, country, latitude, longitude, description_it,
      description_en, oven_model, website_url, image_url, image_alt_it, image_alt_en,
      verified_at, approved_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),now())
    RETURNING ${shopColumns}`,
    [
      shop.slug,
      shop.name,
      shop.category,
      shop.address,
      shop.city,
      shop.country,
      shop.latitude,
      shop.longitude,
      shop.descriptionIt,
      shop.descriptionEn,
      shop.oven,
      shop.website,
      shop.imageUrl,
      shop.imageAltIt,
      shop.imageAltEn,
    ],
  );
}

export async function approveRequest(db, id, shop) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const request = await one(
      client,
      'SELECT shop_id FROM rtsm_requests WHERE id = $1 FOR UPDATE',
      [id],
    );
    let approvedShop;
    if (request?.shop_id) {
      approvedShop = await one(client, `SELECT ${shopColumns} FROM rtsm_shop WHERE id = $1`, [
        request.shop_id,
      ]);
    } else if (request) {
      approvedShop = await createShop(client, shop);
      await client.query(
        `UPDATE rtsm_requests SET status = 'approved', shop_id = $2,
        updated_at = now() WHERE id = $1`,
        [id, approvedShop.id],
      );
    }
    await client.query('COMMIT');
    return approvedShop;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function publishShop(db, slug) {
  return one(
    db,
    `UPDATE rtsm_shop SET published_at = CASE WHEN suspended_at IS NULL
    THEN COALESCE(published_at, now()) ELSE now() END, suspended_at = NULL, updated_at = now()
    WHERE slug = $1 RETURNING ${shopColumns}`,
    [slug],
  );
}

export function suspendShop(db, slug) {
  return one(
    db,
    `UPDATE rtsm_shop SET suspended_at = COALESCE(suspended_at, now()), updated_at = now()
    WHERE slug = $1 AND published_at <= now() RETURNING ${shopColumns}`,
    [slug],
  );
}

export async function listStaffStories(db, { language, limit, offset }) {
  const { rows } = await db.query(
    `SELECT ${storySummary}, approved_at AS "approvedAt", expires_at AS "expiresAt"
      FROM rtsm_story WHERE language = $1 ORDER BY updated_at DESC, slug LIMIT $2 OFFSET $3`,
    [language, limit, offset],
  );
  return rows;
}

export function getStaffStory(db, { language, slug }) {
  return one(
    db,
    `SELECT ${storySummary}, blocks, approved_at AS "approvedAt",
    expires_at AS "expiresAt" FROM rtsm_story WHERE language = $1 AND slug = $2`,
    [language, slug],
  );
}

export function saveStory(db, { language, slug }, story) {
  return one(
    db,
    `INSERT INTO rtsm_story
    (language, slug, title, summary, category, blocks, cover_image_url, cover_image_alt,
      source_url, approved_at, published_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $10 THEN now() END,CASE WHEN $10 THEN now() END)
    ON CONFLICT (slug, language) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
      category = EXCLUDED.category, blocks = EXCLUDED.blocks, cover_image_url = EXCLUDED.cover_image_url,
      cover_image_alt = EXCLUDED.cover_image_alt, source_url = EXCLUDED.source_url,
      approved_at = EXCLUDED.approved_at, published_at = EXCLUDED.published_at,
      expires_at = NULL, updated_at = now()
    WHERE $10 OR rtsm_story.published_at IS NULL
    RETURNING ${storySummary}, blocks`,
    [
      language,
      slug,
      story.title,
      story.summary,
      story.category,
      JSON.stringify(story.blocks),
      story.coverImageUrl,
      story.coverImageAlt,
      story.sourceUrl,
      story.publish,
    ],
  );
}

export function withdrawStory(db, { language, slug }) {
  return one(
    db,
    `UPDATE rtsm_story SET approved_at = NULL, published_at = NULL, expires_at = NULL,
    updated_at = now() WHERE language = $1 AND slug = $2 RETURNING ${storySummary}`,
    [language, slug],
  );
}
