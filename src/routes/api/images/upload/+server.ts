import { put } from '@vercel/blob';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST({ request, locals }) {
	if (!locals.user) {
		return error(401);
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'No file provided');
	if (!ALLOWED_TYPES.includes(file.type)) error(400, 'Unsupported file type');
	if (file.size > MAX_BYTES) error(400, 'File too large');

	Sentry.metrics.distribution('image.upload.size', file.size, {
		unit: 'byte',
		attributes: { fileType: file.type }
	});

	try {
		const ext = file.type.split('/')[1];
		const blob = await put(`communities/${crypto.randomUUID()}.${ext}`, file, {
			access: 'public',
			contentType: file.type,
			token: env.BLOB_READ_WRITE_TOKEN
		});
		return json({ url: blob.url });
	} catch (err) {
		Sentry.captureException(err, {
			tags: { userId: locals.user.id },
			extra: { fileType: file.type, fileSize: file.size }
		});
		return error(500, 'Image upload failed');
	}
}
