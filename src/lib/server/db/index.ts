import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Serverless environments (Vercel) create a new module instance per invocation.
// Limiting to 1 connection prevents exhausting the DB pool on concurrent cold starts,
// and idle_timeout releases it quickly between invocations.
const client = postgres(env.DATABASE_URL, {
	max: 1,
	idle_timeout: 20,
	connect_timeout: 10
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
