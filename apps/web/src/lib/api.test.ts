import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/setup';
import { api, ApiError, describeError, NetworkError } from './api';

describe('api', () => {
  it('prefixes the path with /api and returns the JSON body', async () => {
    server.use(http.get('/api/things', () => HttpResponse.json({ id: 1 })));

    await expect(api<{ id: number }>('/things')).resolves.toEqual({ id: 1 });
  });

  it('returns null for an empty body', async () => {
    server.use(http.delete('/api/things/1', () => new HttpResponse(null, { status: 204 })));

    await expect(api('/things/1', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('throws ApiError with status, body and request id for a 4xx', async () => {
    server.use(
      http.get('/api/things/2', () =>
        HttpResponse.json(
          { message: 'Not Found' },
          { status: 404, headers: { 'X-Request-Id': 'req-404' } },
        ),
      ),
    );

    const error = await api('/things/2').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      body: { message: 'Not Found' },
      requestId: 'req-404',
    });
  });

  it('keeps a non-JSON error body as text', async () => {
    server.use(http.get('/api/things', () => HttpResponse.text('Bad Gateway', { status: 502 })));

    await expect(api('/things')).rejects.toMatchObject({
      status: 502,
      body: 'Bad Gateway',
      requestId: null,
    });
  });

  it('parses a problem+json body', async () => {
    server.use(
      http.get('/api/things', () =>
        HttpResponse.json(
          { title: 'Conflict' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    await expect(api('/things')).rejects.toMatchObject({
      status: 409,
      body: { title: 'Conflict' },
    });
  });

  it('keeps status and request id when a JSON error body is broken', async () => {
    server.use(
      http.get(
        '/api/things',
        () =>
          new HttpResponse('{"message": "Inter', {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'req-500' },
          }),
      ),
    );

    await expect(api('/things')).rejects.toMatchObject({
      status: 500,
      body: '{"message": "Inter',
      requestId: 'req-500',
    });
  });

  it('throws NetworkError when there is no response', async () => {
    server.use(http.get('/api/things', () => HttpResponse.error()));

    await expect(api('/things')).rejects.toBeInstanceOf(NetworkError);
  });

  it('lets an abort through as is', async () => {
    server.use(http.get('/api/things', () => new Promise(() => undefined)));
    const controller = new AbortController();

    const request = api('/things', { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('describeError', () => {
  it('describes a 5xx with its request id', () => {
    expect(describeError(new ApiError(500, null, 'req-1'))).toEqual({
      message: 'The server answered with an error (500). Try again in a moment.',
      requestId: 'req-1',
    });
  });

  it('describes a 4xx as rejected', () => {
    expect(describeError(new ApiError(409, null, null)).message).toBe(
      'The request was rejected (409).',
    );
  });

  it('describes a network error as a connection problem', () => {
    expect(describeError(new NetworkError())).toEqual({
      message: 'Can’t reach the server. Check your connection and try again.',
      requestId: null,
    });
  });

  it('describes any other error as generic, not as a connection problem', () => {
    expect(describeError(new TypeError('x is undefined')).message).toBe(
      'Something went wrong. Try again in a moment.',
    );
  });
});
