import { put } from '@vercel/blob';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

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

	try {
		const ext = file.type.split('/')[1];
		const blob = await put(`communities/${crypto.randomUUID()}.${ext}`, file, {
			access: 'public',
			contentType: file.type,
			token: env.BLOB_READ_WRITE_TOKEN
		});
		return json({ url: blob.url });
	} catch (err) {
		console.error('Blob upload failed:', err);
		return error(500, 'Image upload failed');
	}
}
