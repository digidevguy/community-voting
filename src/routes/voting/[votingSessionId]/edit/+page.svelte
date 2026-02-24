<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { CircleChevronLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import VotingSessionForm from '$lib/components/custom/VotingSessionForm.svelte';

	let { data, form }: PageProps = $props();

	const session = $derived(data.sessionDetails.session);
	const options = $derived(data.sessionDetails.options);

	const initialData = $derived({
		title: session.title,
		description: session.description ?? undefined,
		votingSessionType: session.voting_session_type as 'video_game' | 'board_game' | 'mixed',
		startDate: session.startDate,
		gameDayDate: session.gameDayDate,
		selectedGameIds: options.map((o) => o.gameId)
	});
</script>

<h1 class="mb-4 text-xl font-semibold">Update a Voting Session</h1>
<Button href="/voting/{session.id}" variant="outline">
	<CircleChevronLeft />Back
</Button>

<Separator class="my-4" />

<VotingSessionForm {initialData} collection={data.collection} action="?/edit" {form} />
