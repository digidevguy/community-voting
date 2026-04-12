<script lang="ts">
	import CommunityForm from '$lib/components/custom/CommunityForm.svelte';
	import type { PageServerData, ActionData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<div class="mb-4 flex items-baseline justify-between">
	<h2 class="text-lg font-semibold">Community Settings</h2>
</div>
<p class="mb-6 text-sm text-muted-foreground">
	Manage your community's name, description, and banner image. Changes take effect immediately.
</p>

<CommunityForm
	action="?/update"
	initialData={{
		title: data.community.title,
		description: data.community.description ?? undefined,
		headerImage: data.community.header_image ?? undefined
	}}
	submitLabel="Save Changes"
	{form}
></CommunityForm>
