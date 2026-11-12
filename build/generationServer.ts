/** Serve the generation API in Vite development with credentials kept on the server. */
import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { loadEnv, type Plugin } from 'vite';
import { generationConfig } from '../server/config';
import { handleGeneration } from '../server/generationHandler';

function webRequest(incoming: IncomingMessage, signal: AbortSignal): Request {
  const headers = new Headers();

  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  const method = incoming.method ?? 'GET';
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : Readable.toWeb(incoming) as ReadableStream<Uint8Array>;

  return new Request(`http://${incoming.headers.host}${incoming.url}`, {
    method,
    headers,
    body,
    signal,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

export function generationServer(): Plugin {
  return {
    name: 'local-generation-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, '');

      server.middlewares.use((incoming, outgoing, next) => {
        if (incoming.url?.split('?')[0] !== '/api/generate-quiz') return next();

        const controller = new AbortController();
        const abort = () => controller.abort();
        outgoing.once('close', abort);

        void (async () => {
          const request = webRequest(incoming, controller.signal);
          const response = await handleGeneration(request, { config: () => generationConfig(env) });

          outgoing.writeHead(response.status, Object.fromEntries(response.headers));
          outgoing.end(Buffer.from(await response.arrayBuffer()));
        })().catch(next).finally(() => outgoing.off('close', abort));
      });
    },
  };
}
