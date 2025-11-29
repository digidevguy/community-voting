import z from 'zod';

export const gameDetailsInputSchema = z.object({
	image: z.string(),
	description: z.string(),
	developer: z.string(),
	publisher: z.string(),
	releaseDate: z.coerce.date(),
	categories: z.array(z.string()),
	genres: z.array(z.string())
});

export type GameDetailsInput = z.infer<typeof gameDetailsInputSchema>;
