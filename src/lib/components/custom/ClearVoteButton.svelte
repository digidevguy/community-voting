<script lang="ts">
	import { enhance } from '$app/forms';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index';
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
				toast.success('Vote cleared!');
			}
			if (result.type === 'failure') {
				toast.error((result.data?.message as string) || 'Failed to clear vote.');
			}
		};
	};
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}>Clear vote</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Clear vote</Dialog.Title>
			<Dialog.Description>Are you sure that you wish to clear your vote?</Dialog.Description>
			<Dialog.Footer class="flex flex-row justify-center">
				<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>Cancel</Dialog.Close>
				<form
					action="/voting/{votingSessionId}?/clearVote"
					method="POST"
					use:enhance={handleSubmit}
				>
					<input type="hidden" name="votingSessionId" value={votingSessionId} />
					<Button type="submit" variant="destructive" disabled={isSubmitting} class="min-w-24">
						{isSubmitting ? 'Clearing...' : 'Clear Vote'}
					</Button>
				</form>
			</Dialog.Footer>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
