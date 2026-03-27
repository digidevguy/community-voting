export function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

export function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 8 && password.length <= 255;
}

export function validateEmail(email: unknown): email is string {
	return (
		typeof email === 'string' &&
		email.length > 0 &&
		email.length <= 255 &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	);
}

export function validateDisplayName(displayName: unknown): displayName is string {
	return (
		typeof displayName === 'string' &&
		displayName.trim().length >= 2 &&
		displayName.trim().length <= 50
	);
}
