import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';

let handler: any = null;
const expressApp = express();

async function init() {
  if (handler) return;

  // Try to load compiled backend first (backend/dist), otherwise fall back to TS source
  let AppModule: any;
  try {
    // compiled JS after running `npm --prefix backend run build`
    // path relative to this file
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AppModule = require('../backend/dist/app.module').AppModule;
  } catch (e) {
    try {
      // runtime TS import (Vercel will compile TS files in functions)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      AppModule = require('../backend/src/app.module').AppModule;
    } catch (err) {
      console.error('Failed to load AppModule from backend (dist or src).', e, err);
      throw err;
    }
  }

  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  nestApp.enableCors();
  await nestApp.init();

  handler = serverless(expressApp);
}

export default async function handlerFn(req: any, res: any) {
  await init();
  return handler(req, res);
}
