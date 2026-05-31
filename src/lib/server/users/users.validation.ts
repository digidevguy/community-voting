import { z } from 'zod';

export const toggleAppUpdatesSchema = z.object({
	notifyAppUpdates: z.enum(['true', 'false']).transform((v) => v === 'true')
});

export type ToggleAppUpdatesInput = z.infer<typeof toggleAppUpdatesSchema>;
