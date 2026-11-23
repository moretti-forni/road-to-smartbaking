// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { send, database } = vi.hoisted(() => ({ send: vi.fn(), database: vi.fn() }));
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class {
    send = send;
  },
  InvokeCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock('../src/server/db/pool', () => ({ getDb: database }));
import { serveApi } from '../src/server/http/api';
import { invokeDataApi } from '../src/server/data/client.mjs';
import { getStory } from '../src/server/services/public-catalog';
const reply = (status: number, body: unknown) => ({
  Payload: Buffer.from(JSON.stringify({ status, body })),
});
beforeEach(() => {
  send.mockReset();
  database.mockReset();
  vi.stubEnv('RTSM_DATA_FUNCTION_ARN', 'arn:aws:lambda:eu-west-1:123:function:test');
  vi.stubEnv('RTSM_APP_ORIGIN', 'https://app.test');
  vi.stubEnv('NEXT_PUBLIC_CATALOG_SOURCE', 'api');
});
afterEach(() => vi.unstubAllEnvs());
describe('Amplify IAM data transport', () => {
  it('forwards public requests and preserves status without opening PostgreSQL', async () => {
    send.mockResolvedValue(reply(201, { id: 'receipt' }));
    const response = await serveApi(
      new Request('https://app.test/api/v1/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessName: 'Test' }),
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'receipt' });
    expect(database).not.toHaveBeenCalled();
    const input = send.mock.calls[0][0].input;
    expect(input.FunctionName).toContain('function:test');
    expect(JSON.parse(Buffer.from(input.Payload).toString())).toEqual({
      method: 'POST',
      url: '/api/v1/requests',
      body: { businessName: 'Test' },
    });
  });
  it('enforces origin, JSON and staff boundaries before invoking Lambda', async () => {
    expect(
      (
        await serveApi(
          new Request('https://app.test/api/v1/shops', {
            headers: { origin: 'https://other.test' },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await serveApi(
          new Request('https://app.test/api/v1/requests', { method: 'POST', body: '{}' }),
        )
      ).status,
    ).toBe(415);
    expect((await serveApi(new Request('https://app.test/api/v1/admin/shops'))).status).toBe(401);
    expect((await serveApi(new Request('https://app.test/api/v1/auth/session'))).status).toBe(401);
    expect(send).not.toHaveBeenCalled();
    expect(database).not.toHaveBeenCalled();
  });
  it('uses the private data function for server-rendered story fallback', async () => {
    send.mockResolvedValueOnce(reply(404, { error: 'Not found' })).mockResolvedValueOnce(
      reply(200, {
        slug: 'test',
        language: 'it',
        title: 'Italian original',
        summary: 'Summary',
        category: 'pizza',
        publishedAt: null,
        sourcePublishedAt: null,
        sourceUrl: null,
        readMinutes: 1,
        coverImageUrl: null,
        coverImageAlt: null,
        blocks: [{ type: 'paragraph', text: 'Body' }],
      }),
    );
    const story = await getStory('test', 'en');
    expect(story.language).toBe('it');
    expect(send).toHaveBeenCalledTimes(2);
    expect(database).not.toHaveBeenCalled();
  });
  it('turns Lambda execution or response errors into safe 503s', async () => {
    send.mockResolvedValue({ FunctionError: 'Unhandled', Payload: Buffer.from('private stack') });
    await expect(
      invokeDataApi({ method: 'GET', url: '/api/v1/health', body: undefined }),
    ).rejects.toMatchObject({ status: 503, message: 'Data service unavailable' });
  });
});
it('exchanges the private login token for an HttpOnly cookie without exposing it in JSON', async () => {
  vi.stubEnv('RTSM_STAFF_FUNCTION_ARN', 'arn:aws:lambda:eu-west-1:123:function:staff');
  send.mockResolvedValue(reply(200, { token: 'a'.repeat(64), email: 'staff@morettiforni.com' }));
  const response = await serveApi(
    new Request('https://app.test/api/v1/auth/login', {
      method: 'POST',
      headers: { origin: 'https://app.test', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'staff@morettiforni.com', code: '123456', challenge: 'test' }),
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ email: 'staff@morettiforni.com' });
  expect(response.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Strict');
  expect(send.mock.calls[0][0].input.FunctionName).toContain('function:staff');
  expect(database).not.toHaveBeenCalled();
});
it('passes the session cookie to the staff function and refuses unsigned media uploads', async () => {
  vi.stubEnv('RTSM_STAFF_FUNCTION_ARN', 'arn:aws:lambda:eu-west-1:123:function:staff');
  send.mockResolvedValue(reply(401, { error: 'Sign in required' }));
  const response = await serveApi(
    new Request('https://app.test/api/v1/admin/media/uploads', {
      method: 'POST',
      headers: {
        origin: 'https://app.test',
        cookie: `rtsm_staff_session=${'b'.repeat(64)}`,
        'content-type': 'application/json',
      },
      body: '{}',
    }),
  );
  expect(response.status).toBe(401);
  expect(JSON.parse(Buffer.from(send.mock.calls[0][0].input.Payload).toString()).token).toBe(
    'b'.repeat(64),
  );
  expect(database).not.toHaveBeenCalled();
});

it('accepts localhost versus loopback only for unconfigured local development origins', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('RTSM_APP_ORIGIN', '');
  vi.stubEnv('RTSM_STAFF_FUNCTION_ARN', 'arn:aws:lambda:eu-west-1:123:function:staff');
  send.mockResolvedValue(reply(200, { token: 'c'.repeat(64), email: 'app@morettiforni.com' }));
  const response = await serveApi(
    new Request('http://127.0.0.1:5173/api/v1/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: '{}',
    }),
  );
  expect(response.status).toBe(200);
  vi.stubEnv('NODE_ENV', 'production');
  const denied = await serveApi(
    new Request('http://127.0.0.1:5173/api/v1/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: '{}',
    }),
  );
  expect(denied.status).toBe(403);
});
