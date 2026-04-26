<script lang="ts">
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { CircleChevronLeft } from '@lucide/svelte';
	import type { ActionData, PageServerData } from './$types';
	import VotingSessionForm from '$lib/components/custom/VotingSessionForm.svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<h1 class="mb-4 text-xl font-semibold">Create a voting session</h1>
<Button href="/community/{data.communityId}" variant="outline">
	<CircleChevronLeft />Back
</Button>
<Separator class="my-4" />

<VotingSessionForm
	collection={data.collection}
	userCollection={data.userCollection}
	action="?/create"
	{form}
/>
