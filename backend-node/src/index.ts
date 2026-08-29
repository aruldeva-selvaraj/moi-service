import * as dotenv from 'dotenv';
dotenv.config();

import {ApplicationConfig, MoiManagerApplication} from './application';
import {Pool} from 'pg';

export * from './application';
export * from './models';
export * from './repositories';
export * from './controllers';
export * from './datasources';

async function runStartupMigration(): Promise<void> {
  const pool = new Pool({
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     +(process.env.DB_PORT   ?? '5432'),
    user:     process.env.DB_USER     ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'password',
    database: process.env.DB_NAME     ?? 'moify_db',
    ssl: process.env.DB_SSL === 'true' ? {rejectUnauthorized: false} : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Ensure mobile_number column exists for older installs
    await pool.query(
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15)`,
    );
    // Try adding UNIQUE index separately (won't fail if already exists)
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_number_key ON public.users (mobile_number)
       WHERE mobile_number IS NOT NULL`,
    ).catch(() => { /* index may already exist */ });

    // Backfill default admin mobile if missing
    await pool.query(
      `UPDATE public.users SET mobile_number = '9789616611'
       WHERE username = 'admin' AND mobile_number IS NULL`,
    );
    // Add Tamil guest name column for bilingual PDF support
    await pool.query(
      `ALTER TABLE public.moi_entries ADD COLUMN IF NOT EXISTS guest_name_tamil TEXT`,
    );
    console.log('✅ Startup migration complete (mobile_number + guest_name_tamil columns ready)');
  } catch (err) {
    // Table may not exist on first boot — not fatal
    console.warn('⚠️  Startup migration skipped (users table not ready yet):', (err as Error).message);
  } finally {
    await pool.end();
  }
}

export async function main(options: ApplicationConfig = {}) {
  const app = new MoiManagerApplication(options);
  await app.boot();
  await app.start();

  await runStartupMigration();

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
