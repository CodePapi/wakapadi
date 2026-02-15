import { ReadableStream } from 'web-streams-polyfill';
import { webcrypto } from 'crypto';

if (typeof globalThis.ReadableStream === 'undefined') {
  (globalThis as any).ReadableStream = ReadableStream;
}


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL!,
      'https://www.wakapadi.io',
      'https://wakapadi.vercel.app',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  });
  // Prevent proxies/CDNs or browsers from serving cached 304 responses
  // for authenticated/dynamic API endpoints. This ensures clients with
  // Authorization headers always get fresh JSON bodies instead of a
  // 304 Not Modified that may be returned by an intermediate cache.
  app.use((req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Surrogate-Control', 'no-store');
      // Ensure caches vary on Authorization so responses are not reused across users
      const prevVary = res.getHeader('Vary') as string | string[] | undefined
      if (!prevVary) res.setHeader('Vary', 'Authorization')
      else if (Array.isArray(prevVary)) {
        if (!prevVary.includes('Authorization')) res.setHeader('Vary', [...prevVary, 'Authorization'])
      } else if (typeof prevVary === 'string' && !prevVary.includes('Authorization')) {
        res.setHeader('Vary', prevVary + ', Authorization')
      }
    } catch (e) {
      // ignore header errors
    }
    next()
  })
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
