<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { Check, CircleChevronLeft, CirclePlus, Copy } from '@lucide/svelte';
	import type { ActionData, PageServerData } from './$types';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { useClipboard } from '$lib/hooks/use-clipboard.svelte';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	const clipboard = useClipboard();
	const defaultWeekExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 16);

	const inviteLink = $derived(
		form?.success && form.id
			? `${page.url.origin}/community/${data.communityId}/join/${form.id}`
			: ''
	);
</script>

<h1 class="mb-4 text-xl font-semibold">Invites Dashboard</h1>
<div class="flex justify-between">
	<Button href="/community/{data.communityId}" variant="outline">
		<CircleChevronLeft></CircleChevronLeft>Back
	</Button>
	<!-- Form for creating deault invite link -->
	<form
		action="?/create"
		method="post"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'failure') {
					toast.error(String(result.data?.message ?? 'Failed to create invite'));
				}
				if (result.type === 'success') {
					toast.success('Created new invite link!');
				}
				await update();
			};
		}}
	>
		<input type="hidden" name="expiresAt" value={defaultWeekExpiration} />
		<input type="hidden" name="maxUses" value="1" />
		<Button variant="outline" type="submit"><CirclePlus></CirclePlus>Create invite</Button>
	</form>
</div>

<Separator class="my-4" />
<!-- Todo: Add edit link (dialog trigger) -->
{#if form?.success}
	<div transition:fade={{ duration: 100 }}>
		<InputGroup.Root>
			<InputGroup.Input value={inviteLink} readonly class="truncate" />
			<InputGroup.Addon align="inline-end">
				<InputGroup.Button
					aria-label="copy"
					size="icon-xs"
					onclick={() => clipboard.copy(inviteLink)}
				>
					{#if clipboard.copied}
						<Check />
					{:else}
						<Copy />
					{/if}
				</InputGroup.Button>
			</InputGroup.Addon>
		</InputGroup.Root>
	</div>
{/if}
<!-- Table for listing available invites -->
