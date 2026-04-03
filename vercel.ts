import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
	crons: [
		{
			path: '/api/cron/finalize-sessions',
			schedule: '0 0 * * *'
		}
	]
};
