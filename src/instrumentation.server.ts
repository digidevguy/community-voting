import * as Sentry from '@sentry/sveltekit';
import { dev } from '$app/environment';

Sentry.init({
	dsn: 'https://109e57454e4f94f01cc9586c8d2f6b64@o4511413908930560.ingest.us.sentry.io/4511413911814144',

	tracesSampleRate: 1.0,

	// Enable logs to be sent to Sentry
	enableLogs: true,
	environment: dev ? 'development' : 'production',
	sendDefaultPii: true

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});
