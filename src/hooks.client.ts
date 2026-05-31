import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';
import { dev } from '$app/environment';

Sentry.init({
	dsn: 'https://109e57454e4f94f01cc9586c8d2f6b64@o4511413908930560.ingest.us.sentry.io/4511413911814144',

	tracesSampleRate: dev ? 1.0 : 0.2,

	// Enable logs to be sent to Sentry
	enableLogs: true,
	environment: dev ? 'development' : 'production',

	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: 0.1,

	// If the entire session is not sampled, use the below sample rate to sample
	// sessions when an error occurs.
	replaysOnErrorSampleRate: 1.0,

	// If you don't want to use Session Replay, just remove the line below:
	integrations: [replayIntegration()],

	// Enable sending user PII (Personally Identifiable Information)
	// https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
	sendDefaultPii: true
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
const _sentryHandleError = handleErrorWithSentry() as HandleClientError;

// SvelteKit's client router throws its internal data envelope object
// ({ type: 'error', status, error }) when a server load returns an error during
// client-side navigation in versions where the envelope isn't unwrapped before
// reaching handleError. This is an expected/handled error — not an unhandled
// exception — so we skip Sentry capture to prevent false-positive noise.
export const handleError: HandleClientError = async (input) => {
	const { error } = input;
	if (
		error !== null &&
		typeof error === 'object' &&
		!Array.isArray(error) &&
		'type' in error &&
		'status' in error &&
		'error' in error
	) {
		return { message: input.message };
	}
	return _sentryHandleError(input);
};
