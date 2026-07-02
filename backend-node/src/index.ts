import * as dotenv from 'dotenv';
dotenv.config();

import {ApplicationConfig, MoiManagerApplication} from './application';

export * from './application';
export * from './models';
export * from './repositories';
export * from './controllers';
export * from './datasources';

export async function main(options: ApplicationConfig = {}) {
  const app = new MoiManagerApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`🚀 Moi Manager API (Node.js / LoopBack 4) running at ${url}`);
  console.log(`📖 API Explorer: ${url}api-explorer`);

  return app;
}

const config: ApplicationConfig = {
  rest: {
    port: +(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '0.0.0.0',
    gracePeriodForClose: 5000,
    openApiSpec: {
      setServersFromRequest: true,
    },
    cors: {
      origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200')
        .split(',')
        .map(s => s.trim()),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization',
      credentials: true,
      maxAge: 86400,
    },
  },
};

main(config).catch(err => {
  console.error('Cannot start the application.', err);
  process.exit(1);
});
