import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.svx', '.md']
		})
	],
	kit: {
		version: {
			pollInterval: 60000
		},
		adapter: adapter({
			runtime: 'nodejs24.x',
			regions: ['cle1'],
			images: {
				domains: [
					// Steam CDN — covers cdn.*, shared.*, avatars.*, etc.
					'cdn.akamai.steamstatic.com',
					'cdn.cloudflare.steamstatic.com',
					'shared.akamai.steamstatic.com',
					'shared.cloudflare.steamstatic.com',
					'media.steampowered.com',
					'store.steampowered.com',
					'avatars.steamstatic.com',
					'cdn.discordapp.com',
					'images.unsplash.com',
					'pUUJW44V3BsjkSxl.public.blob.vercel-storage.com'
				],
				sizes: [320, 640, 800, 1080, 1920],
				minimumCacheTTL: 3600
			}
		}),

		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				// 'self' covers same-origin JS bundles and /_vercel/* (Analytics, Speed Insights).
				// SvelteKit automatically appends the per-request nonce to script-src when mode:'auto'.
				// va.vercel-scripts.com is required for Vercel Analytics and Speed Insights.
				// The hash covers the small inline bootstrap script injected by @vercel/analytics and
				// @vercel/speed-insights (injectAnalytics / injectSpeedInsights) which cannot receive
				// a nonce because it is added via DOM manipulation after the initial HTML render.
				'script-src': [
					'self',
					'https://va.vercel-scripts.com',
					"'sha256-oOU4MxtCWQ62F7icj69SaREaDhbdyXILlAZ+wog1m9M='"
				],
				// unsafe-inline is required because Svelte's style: directive and some UI
				// primitives (bits-ui, Tailwind) emit inline style="" attributes at runtime.
				'style-src': ['self', 'unsafe-inline'],
				'img-src': [
					'self',
					'data:',
					// Steam game artwork & user avatars — wildcard covers all CDN subdomain variants
					'*.steamstatic.com',
					'*.steampowered.com',
					// Discord user avatars
					'cdn.discordapp.com',
					// Unsplash (listed in Vercel image domains)
					'images.unsplash.com',
					// Vercel Blob storage (community cover images)
					'pUUJW44V3BsjkSxl.public.blob.vercel-storage.com'
				],
				'connect-src': [
					'self',
					// Sentry error / replay ingestion (from DSN in hooks.client.ts)
					'https://o4511413908930560.ingest.us.sentry.io',
					'wss://o4511413908930560.ingest.us.sentry.io'
				],
				// Sentry Replay spawns its processing worker from a blob: URL.
				// 'self' is required for the service worker at /sw.js.
				'worker-src': ['blob:', 'self'],
				'font-src': ['self'],
				// Prevent this app from being embedded in any iframe
				'frame-ancestors': ['none'],
				// Block Flash / legacy plugin embeds
				'object-src': ['none'],
				// Prevent <base href="..."> injection attacks
				'base-uri': ['self'],
				// Restrict where forms can POST to
				'form-action': ['self']
			}
		},

		experimental: {
			tracing: {
				server: true
			},

			instrumentation: {
				server: true
			}
		}
	},
	extensions: ['.svelte', '.svx', '.md']
};

export default config;
