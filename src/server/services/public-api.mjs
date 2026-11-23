import { ApiError } from './errors.mjs';
import * as data from '../repositories/catalog.mjs';
import * as schema from '../../features/catalog/validation.mjs';
export function isPublicDataRoute(method, url) {
  const path = new URL(url, 'http://localhost').pathname;
  if (method === 'GET')
    return (
      /^\/api\/v1\/(health|shops|stories)$/.test(path) ||
      /^\/api\/v1\/shops\/[a-z0-9-]+$/.test(path) ||
      /^\/api\/v1\/stories\/(it|en)\/[a-z0-9-]+$/.test(path)
    );
  return method === 'POST' && /^\/api\/v1\/(requests|reports)$/.test(path);
}
const found = (record, message = 'Record not found') => {
  if (!record) throw new ApiError(404, message);
  return record;
};
export async function handlePublicApi(db, { method, url, readBody }) {
  if (!isPublicDataRoute(method, url)) return undefined;
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const parts = pathname.split('/');
  const query = Object.fromEntries(searchParams);
  switch (`${method} ${pathname}`) {
    case 'GET /api/v1/health':
      await db.query('SELECT 1');
      return { body: { status: 'ok' } };
    case 'GET /api/v1/shops':
      return { body: { items: await data.listShops(db, schema.shopQuery.parse(query)) } };
    case 'GET /api/v1/stories':
      return { body: { items: await data.listStories(db, schema.storyQuery.parse(query)) } };
    case 'POST /api/v1/requests':
      return {
        status: 201,
        body: await data.submitRequest(db, schema.requestSubmissionInput.parse(await readBody())),
      };
    case 'POST /api/v1/reports': {
      const input = schema.reportInput.parse(await readBody());
      const result = await db.query(
        `INSERT INTO rtsm_reports(shop_id,reason,details)
        SELECT id,$2,$3 FROM rtsm_shop WHERE slug=$1 AND published_at<=now() AND suspended_at IS NULL RETURNING id`,
        [input.shop, input.reason, input.details],
      );
      return { status: 201, body: found(result.rows[0], 'Published shop not found') };
    }
  }
  if (parts[3] === 'shops')
    return { body: found(await data.getShop(db, schema.shopKey.parse(parts[4]))) };
  return {
    body: found(
      await data.getStory(db, schema.storyKey.parse({ language: parts[4], slug: parts[5] })),
    ),
  };
}
