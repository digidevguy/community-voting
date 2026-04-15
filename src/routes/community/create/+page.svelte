<script lang="ts">
	import CommunityForm from '$lib/components/custom/CommunityForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import { CircleChevronLeft } from '@lucide/svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Create Community — Community Voting</title>
	<meta
		name="description"
		content="Create a new community and start voting on games with your friends."
	/>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex w-full max-w-lg flex-col gap-6">
	<div>
		<Button variant="ghost" href="/community" class="-ml-2 text-muted-foreground">
			<CircleChevronLeft />Back to Communities
		</Button>
	</div>

	<div>
		<div class="mb-4 flex items-baseline justify-between">
			<h2 class="text-lg font-semibold">Create a Community</h2>
		</div>
		<p class="mb-6 text-sm text-muted-foreground">
			Set up your new community with a name, description, and banner image.
		</p>

		<CommunityForm
			initialData={{
				title: '',
				description: '',
				headerImage: ''
			}}
			action="?/createCommunity"
			submitLabel="Create"
			{form}
		></CommunityForm>
	</div>
</div>
