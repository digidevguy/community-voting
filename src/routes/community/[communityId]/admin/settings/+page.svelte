<script lang="ts">
	import CommunityForm from '$lib/components/custom/CommunityForm.svelte';
	import * as Checkbox from '$lib/components/ui/checkbox';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { PageServerData, ActionData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let allowMembersCreateSessions = $state(data.community.allowMembersCreateSessions);
	let allowMembersAddCollection = $state(data.community.allowMembersAddCollection);
</script>

<div class="mb-4 flex items-baseline justify-between">
	<h2 class="text-lg font-semibold">Community Settings</h2>
</div>
<p class="mb-6 text-sm text-muted-foreground">
	Manage your community's name, description, and banner image. Changes take effect immediately.
</p>

<CommunityForm
	action="?/update"
	communityId={data.community.id}
	initialData={{
		title: data.community.title,
		description: data.community.description ?? undefined,
		headerImage: data.community.header_image ?? undefined
	}}
	submitLabel="Save Changes"
	{form}
></CommunityForm>

<Card.Root class="mt-8">
	<Card.Header>
		<Card.Title>Member Permissions</Card.Title>
		<Card.Description>
			Control what regular members can do. Moderators and admins are always unrestricted.
			Temporary members are always restricted regardless of these settings.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form
			method="POST"
			action="?/updatePermissions"
			use:enhance={() => {
				return ({ result }) => {
					if (result.type === 'success') {
						toast.success('Permissions updated');
					} else {
						toast.error('Failed to update permissions');
					}
				};
			}}
		>
			<input type="hidden" name="allowMembersCreateSessions" value={allowMembersCreateSessions} />
			<input type="hidden" name="allowMembersAddCollection" value={allowMembersAddCollection} />

			<div class="flex flex-col gap-4">
				<div class="flex items-center gap-3">
					<Checkbox.Root
						id="allowMembersCreateSessions"
						bind:checked={allowMembersCreateSessions}
					/>
					<Label for="allowMembersCreateSessions">Allow members to create voting sessions</Label>
				</div>
				<div class="flex items-center gap-3">
					<Checkbox.Root
						id="allowMembersAddCollection"
						bind:checked={allowMembersAddCollection}
					/>
					<Label for="allowMembersAddCollection">Allow members to add games to the collection</Label>
				</div>
			</div>

			<Button type="submit" class="mt-6">Save Permissions</Button>
		</form>
	</Card.Content>
</Card.Root>
