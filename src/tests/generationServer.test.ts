/** Exercise the local API over HTTP so Vite cannot silently serve source instead of JSON. */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { generationServer } from '../../build/generationServer';
import { generateQuestions } from '../../server/providers';

vi.mock('../../server/providers', () => ({ generateQuestions: vi.fn() }));

const questions = [{ id: 1, question: 'Q?', options: ['A', 'B'], answer: 1 }];
const input = { title: 'Title', description: 'Description', questionCount: 1, documents: [] };
let directory: string;
let server: ViteDevServer;
let endpoint: string;

async function startServer(configuration: string) {
  await writeFile(join(directory, '.env'), configuration);
  server = await createServer({
    configFile: false,
    root: directory,
    plugins: [generationServer()],
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'silent',
  });
  await server.listen();
  const address = server.httpServer!.address();

  if (!address || typeof address === 'string') throw new Error('Expected an HTTP port');

  endpoint = `http://127.0.0.1:${address.port}/api/generate-quiz`;
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'quizzer-generation-'));
  vi.mocked(generateQuestions).mockResolvedValue(questions);
});

afterEach(async () => {
  await server?.close();
  await rm(directory, { recursive: true, force: true });
  vi.clearAllMocks();
});

const configuration = 'LLM_PROVIDER=gemini\nLLM_MODEL=gemini-3.5-flash-lite\nGEMINI_API_KEY=private-test-key';

describe('Vite generation API', () => {
  it('loads server configuration and returns JSON availability without revealing keys', async () => {
    await startServer(configuration);
    const response = await fetch(`${endpoint}?availability`);

    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ available: true, passwordRequired: false });
    expect(generateQuestions).not.toHaveBeenCalled();
  });

  it('passes a streamed JSON request and the configured Gemini model to generation', async () => {
    await startServer(configuration);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ questions });
    expect(generateQuestions).toHaveBeenCalledWith(
      { provider: 'gemini', model: 'gemini-3.5-flash-lite', apiKey: 'private-test-key', password: undefined },
      input,
      expect.any(AbortSignal),
    );
  });

  it('keeps generation unavailable when the server has no model configuration', async () => {
    await startServer('');
    const response = await fetch(endpoint);

    expect(await response.json()).toEqual({ available: false, passwordRequired: false });
    expect(generateQuestions).not.toHaveBeenCalled();
  });

  it('preserves password enforcement and safe HTTP errors', async () => {
    await startServer(`${configuration}\nQUIZ_GENERATION_PASSWORD=secret`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, password: 'incorrect' }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'unauthorized', field: 'password' });
    expect(generateQuestions).not.toHaveBeenCalled();
  });

  it('preserves origin checks before invoking the provider', async () => {
    await startServer(configuration);
    const response = await fetch(endpoint, { headers: { Origin: 'https://other.example' } });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: 'unauthorized' });
    expect(generateQuestions).not.toHaveBeenCalled();
  });
});
