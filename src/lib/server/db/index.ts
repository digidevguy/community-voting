import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const isProduction = env.NODE_ENV === 'production';
const databaseUrl = isProduction ? env.PRODUCTION_DATABASE_URL : env.DEV_DATABASE_URL;

if (!databaseUrl) {
	throw new Error(
		isProduction ? 'PRODUCTION_DATABASE_URL is not set' : 'DEV_DATABASE_URL is not set'
	);
}

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema });

export type Database = typeof db;
export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
