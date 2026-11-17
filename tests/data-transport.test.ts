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
    send
      .mockResolvedValueOnce(reply(404, { error: 'Not found' }))
      .mockResolvedValueOnce(
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
