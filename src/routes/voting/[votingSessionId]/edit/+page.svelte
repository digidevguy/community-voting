<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { CircleChevronLeft } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import VotingSessionForm from '$lib/components/custom/VotingSessionForm.svelte';

	let { data, form }: PageProps = $props();

	const session = $derived(data.sessionDetails.session);
	const options = $derived(data.sessionDetails.options);

	const initialData = $derived({
		id: session.id,
		title: session.title,
		description: session.description ?? undefined,
		votingSessionType: session.voting_session_type as 'video_game' | 'board_game' | 'mixed',
		startDate: session.startDate,
		gameDayDate: session.gameDayDate,
		selectedGameIds: options.map((o) => o.gameId),
		status: session.status
	});

	let confirmingDelete = $state(false);
	let isDeleting = $state(false);
</script>

<h1 class="mb-4 text-xl font-semibold">Update a Voting Session</h1>
<Button href="/voting/{session.id}" variant="outline">
	<CircleChevronLeft />Back
</Button>

<Separator class="my-4" />

<VotingSessionForm
	{initialData}
	collection={data.collection}
	userCollection={data.userCollection}
	action="?/edit"
	{form}
/>

<Separator class="my-4" />

<div class="space-y-3">
	<div>
		<h2 class="text-xl font-semibold text-destructive">Danger Zone</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Deleting this session is permanent and cannot be undone.
		</p>
	</div>

	{#if !confirmingDelete}
		<Button variant="destructive" onclick={() => (confirmingDelete = true)}>Delete Session</Button>
	{:else}
		<p class="text-sm font-medium">Are you sure you want to delete "{session.title}"?</p>
		<div class="flex gap-2">
			<form
				action="?/delete"
				method="POST"
				use:enhance={() => {
					isDeleting = true;
					return async ({ result, update }) => {
						if (result.type === 'redirect') {
							toast.success('Voting session deleted.');
							await update();
						} else {
							isDeleting = false;
							await update();
							toast.error(
								(result.type === 'failure' && (result.data?.message as string)) ||
									'Failed to delete session.'
							);
							confirmingDelete = false;
						}
					};
				}}
			>
				<input type="hidden" name="votingSessionId" value={session.id} />
				<Button type="submit" variant="destructive" disabled={isDeleting}>
					{isDeleting ? 'Deleting…' : 'Yes, delete'}
				</Button>
			</form>
			<Button variant="outline" onclick={() => (confirmingDelete = false)} disabled={isDeleting}>
				Cancel
			</Button>
		</div>
	{/if}
</div>
