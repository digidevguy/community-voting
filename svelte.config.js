import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx', '.md'] })],
	kit: {
		adapter: adapter({
			runtime: 'nodejs24.x',
			regions: ['cle1'],
			images: {
				domains: [
					'cdn.akamai.steamstatic.com',
					'cdn.cloudflare.steamstatic.com',
					'media.steampowered.com',
					'avatars.steamstatic.com',
					'cdn.discordapp.com',
					'images.unsplash.com',
					'pUUJW44V3BsjkSxl.public.blob.vercel-storage.com'
				],
				sizes: [320, 640, 800, 1080, 1920],
				minimumCacheTTL: 3600
			}
		})
	},
	extensions: ['.svelte', '.svx', '.md']
};

export default config;
