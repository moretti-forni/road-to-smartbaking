import { timingSafeEqual } from 'node:crypto';
import * as drafts from './drafts.mjs';
import * as data from './data.mjs';
import * as schema from './validation.mjs';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function found(result, message = 'Record not found') {
  if (!result) throw new ApiError(404, message);
  return result;
}

function isStaff(authorization, token) {
  if (!token || !authorization?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function handleApi(db, { method, url, authorization, readBody }, staffToken) {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const parts = pathname.split('/').slice(1);
  const route = parts.map((part, index) => (index < 4 ? part : ':value')).join('/');
  const query = Object.fromEntries(searchParams);

  if (pathname.startsWith('/api/v1/admin/') && !isStaff(authorization, staffToken)) {
    throw new ApiError(401, 'Staff authorization required');
  }

  switch (`${method} ${route}`) {
    case 'GET api/v1/health':
      await db.query('SELECT 1');
      return { body: { status: 'ok' } };
    case 'GET api/v1/shops':
      return { body: { items: await data.listShops(db, schema.shopQuery.parse(query)) } };
    case 'GET api/v1/stories':
      return { body: { items: await data.listStories(db, schema.storyQuery.parse(query)) } };
    case 'POST api/v1/requests':
      return {
        status: 201,
        body: await data.submitRequest(db, schema.requestInput.parse(await readBody())),
      };
    case 'GET api/v1/admin/drafts':
      return { body: { items: await drafts.listDrafts(db, schema.pageInput.parse(query)) } };
    case 'GET api/v1/admin/story-drafts/:value': {
      const slug = schema.shopKey.parse(parts[4]);
      const versions = await drafts.storyEditorVersions(db, slug);
      return { body: found(versions.length ? { versions } : undefined) };
    }
    case 'PUT api/v1/admin/story-drafts/:value': {
      const slug = schema.shopKey.parse(parts[4]);
      const input = schema.storyDraftBatch.parse(await readBody());
      const entries = ['it', 'en'].flatMap((language) => {
        const draft = input[language];
        return draft
          ? [{ ...draft, kind: 'story', slug, language, newRecord: input.newRecord }]
          : [];
      });
      const saved = await drafts.saveStoryDrafts(db, entries);
      if (!saved)
        throw new ApiError(
          409,
          'The slug is already in use or a draft changed. Reload the story before saving.',
        );
      return { body: saved };
    }
    case 'GET api/v1/admin/drafts/:value/:value/:value':
    case 'PUT api/v1/admin/drafts/:value/:value/:value':
    case 'POST api/v1/admin/drafts/:value/:value/:value': {
      const key = schema.draftKey.parse({ kind: parts[4], slug: parts[5], language: parts[6] });
      if (method === 'GET') return { body: found(await drafts.readDraft(db, key)) };
      if (method === 'POST') {
        const revision = schema.requestKey.parse((await readBody())?.revision);
        const published = await drafts.publishDraft(db, key, revision);
        if (!published)
          throw new ApiError(409, 'The saved draft changed. Reload it before publishing.');
        return { body: published };
      }
      const input = schema.draftInput.parse(await readBody());
      const payload =
        key.kind === 'shop'
          ? schema.shopInput.parse({ ...input.payload, slug: key.slug })
          : schema.storyInput.parse(input.payload);
      const saved = await drafts.saveDraft(db, { ...key, ...input, payload });
      if (!saved)
        throw new ApiError(
          409,
          'The slug is already in use or the draft changed. Reload the record before saving.',
        );
      return { body: saved };
    }
    case 'GET api/v1/admin/requests':
      return { body: { items: await data.listRequests(db, schema.pageInput.parse(query)) } };
    case 'GET api/v1/admin/requests/:value':
      return { body: found(await data.getRequest(db, schema.requestKey.parse(parts[4]))) };
    case 'PATCH api/v1/admin/requests/:value': {
      const id = schema.requestKey.parse(parts[4]);
      const updated = await data.reviewRequest(db, id, schema.reviewInput.parse(await readBody()));
      if (!updated && (await data.getRequest(db, id))) {
        throw new ApiError(409, 'Approved requests cannot be moved back into review');
      }
      return { body: found(updated) };
    }
    case 'POST api/v1/admin/requests/:value/:value':
      if (parts[5] !== 'approve') break;
      return {
        body: found(
          await data.approveRequest(
            db,
            schema.requestKey.parse(parts[4]),
            schema.approvalInput.parse(await readBody()),
          ),
        ),
      };
    case 'GET api/v1/admin/shops':
      return { body: { items: await data.listStaffShops(db, schema.pageInput.parse(query)) } };
    case 'POST api/v1/admin/shops':
      return {
        status: 201,
        body: await data.createShop(db, schema.shopInput.parse(await readBody())),
      };
    case 'PUT api/v1/admin/shops/:value': {
      const slug = schema.shopKey.parse(parts[4]);
      const shop = schema.shopInput
        .required({ visible: true })
        .parse({ ...(await readBody()), slug });
      return { body: found(await data.updateShop(db, shop)) };
    }
    case 'POST api/v1/admin/shops/:value/:value': {
      const slug = schema.shopKey.parse(parts[4]);
      if (parts[5] === 'publish') return { body: found(await data.publishShop(db, slug)) };
      if (parts[5] === 'suspend')
        return { body: found(await data.suspendShop(db, slug), 'Published shop not found') };
      break;
    }
    case 'GET api/v1/admin/story-groups/:value':
      return { body: found(await data.getStaffStoryGroup(db, schema.shopKey.parse(parts[4]))) };
    case 'POST api/v1/admin/story-groups': {
      const group = schema.storyGroupInput.parse(await readBody());
      const saved = await data.saveStoryGroup(db, group, true);
      if (!saved) throw new ApiError(409, 'A story with that slug already exists');
      return { status: 201, body: saved };
    }
    case 'PUT api/v1/admin/story-groups/:value': {
      const group = schema.storyGroupInput.parse({ ...(await readBody()), slug: parts[4] });
      return { body: found(await data.saveStoryGroup(db, group, false)) };
    }
    case 'GET api/v1/admin/stories':
      return { body: { items: await data.listStaffStories(db, schema.storyQuery.parse(query)) } };
    case 'POST api/v1/admin/stories': {
      const story = schema.newStoryInput.parse(await readBody());
      return { status: 201, body: await data.saveStory(db, story, story, true) };
    }
    case 'GET api/v1/admin/stories/:value/:value':
      return {
        body: found(
          await data.getStaffStory(
            db,
            schema.storyKey.parse({ language: parts[4], slug: parts[5] }),
          ),
        ),
      };
    case 'PUT api/v1/admin/stories/:value/:value': {
      const key = schema.storyKey.parse({ language: parts[4], slug: parts[5] });
      const saved = await data.saveStory(db, key, schema.storyInput.parse(await readBody()));
      if (!saved)
        throw new ApiError(
          409,
          'This story is published. Explicitly publish the replacement or withdraw it first.',
        );
      return { body: saved };
    }
    case 'POST api/v1/admin/stories/:value/:value/:value':
      if (parts[6] !== 'withdraw') break;
      return {
        body: found(
          await data.withdrawStory(
            db,
            schema.storyKey.parse({ language: parts[4], slug: parts[5] }),
          ),
        ),
      };
  }

  if (method === 'GET' && parts[0] === 'api' && parts[1] === 'v1') {
    if (parts[2] === 'shops' && parts.length === 4) {
      return { body: found(await data.getShop(db, schema.shopKey.parse(parts[3]))) };
    }
    if (parts[2] === 'stories' && parts.length === 5) {
      return {
        body: found(
          await data.getStory(db, schema.storyKey.parse({ language: parts[3], slug: parts[4] })),
        ),
      };
    }
  }

  throw new ApiError(404, 'Endpoint not found');
}
