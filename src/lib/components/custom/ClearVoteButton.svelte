<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';

	interface Props {
		votingSessionId: string;
		onCleared?: () => void;
	}

	let { votingSessionId, onCleared }: Props = $props();

	let isSubmitting = $state(false);

	const handleSubmit: SubmitFunction = () => {
		isSubmitting = true;
		return async ({ result, update }) => {
			await update();
			isSubmitting = false;
			if (result.type === 'success') {
				onCleared?.();
			}
			if (result.type === 'failure') {
				toast.error((result.data?.message as string) || 'Failed to clear vote.');
			}
		};
	};
</script>

<form action="/voting/{votingSessionId}?/clearVote" method="POST" use:enhance={handleSubmit}>
	<input type="hidden" name="votingSessionId" value={votingSessionId} />
	<Button type="submit" variant="destructive" disabled={isSubmitting} class="min-w-24">
		{isSubmitting ? 'Clearing...' : 'Clear Vote'}
	</Button>
</form>
