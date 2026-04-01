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
