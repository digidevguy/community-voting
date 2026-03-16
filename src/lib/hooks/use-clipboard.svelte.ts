export function useClipboard() {
	const copiedDuration = 2000;

	let copied = $state(false);
	let error = $state<Error | null>(null);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	async function copy(text: string): Promise<void> {
		if (!navigator.clipboard) {
			error = new Error('Clipboard API not available');
			return;
		}

		try {
			await navigator.clipboard.writeText(text);
			error = null;
			copied = true;

			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				copied = false;
				timeoutId = null;
			}, copiedDuration);
		} catch (e) {
			error = e instanceof Error ? e : new Error('Failed to copy to clipboard');
			copied = false;
		}
	}

	return {
		get copied() {
			return copied;
		},
		get error() {
			return error;
		},
		copy
	};
}
