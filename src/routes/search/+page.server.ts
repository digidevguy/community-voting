import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { asc, ilike, sql } from 'drizzle-orm';

export const actions: Actions = {
	search: async ({ request }) => {
		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim().toLowerCase();

		if (!query) {
			return fail(400, { error: 'Missing search query' });
		}

		console.log(`Searching for games with query: ${query}`);

		/** TODO: Add pagination support when ready to scale up */
		const results = await db
			.select()
			.from(table.game)
			.where(ilike(sql`lower(${table.game.title})`, `%${query}%`))
			.orderBy(asc(table.game.title))
			.limit(10)
			.execute();

		if (results.length === 0) {
			return { results: [], message: 'No games found' };
		}

		console.log(`Found ${results.length} games matching query.`);

		return { results };
	}
} satisfies Actions;
