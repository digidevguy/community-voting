<script lang="ts">
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as InputGroup from '$lib/components/ui/input-group/index';
	import * as Table from '$lib/components/ui/table/index';
	import * as Dialog from '$lib/components/ui/dialog/index';
	import { Check, CircleChevronLeft, CirclePlus, Copy, Recycle, Trash } from '@lucide/svelte';
	import type { ActionData, PageServerData } from './$types';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { useClipboard } from '$lib/hooks/use-clipboard.svelte';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let clearingInvites = $state(false);
	let revokeDialogOpen = $state(false);
	let revokeTargetId = $state<string | null>(null);
	let role = $derived(data.role);
	const invites = $derived(
		clearingInvites
			? data.invites.filter(
					({ status, expiresAt }) =>
						status !== 'revoked' &&
						status !== 'expired' &&
						!(expiresAt && expiresAt.getTime() <= Date.now())
				)
			: data.invites
	);

	const clipboard = useClipboard();
	const defaultWeekExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 16);

	const inviteLink = $derived(
		form?.success && form.id
			? `${page.url.origin}/community/${data.communityId}/join/${form.id}`
			: ''
	);

	function getExpiryInfo(
		status: string,
		expiresAt: Date | null
	): { label: string; inactive: boolean } {
		if (status === 'revoked') return { label: 'Revoked', inactive: true };
		if (status === 'expired') return { label: 'Expired', inactive: true };
		if (expiresAt && expiresAt.getTime() <= Date.now()) return { label: 'Expired', inactive: true };
		if (!expiresAt) return { label: 'Never', inactive: false };
		const days = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
		return { label: `${days} days`, inactive: false };
	}
</script>

<Dialog.Root bind:open={revokeDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>Confirm revoke</Dialog.Header>
		<Dialog.Description>Are you sure that you want to revoke this invite?</Dialog.Description>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>Cancel</Dialog.Close>
			<form
				method="POST"
				action="?/revoke"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') revokeDialogOpen = false;
						await update();
					};
				}}
			>
				<input type="hidden" name="inviteId" value={revokeTargetId} />
				<Button type="submit" variant="destructive"><Trash />Revoke</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<h1 class="mb-4 text-xl font-semibold">Invites Dashboard</h1>
<div class="flex justify-between">
	<Button href="/community/{data.communityId}" variant="outline">
		<CircleChevronLeft></CircleChevronLeft>Back
	</Button>
	<!-- Form for creating deault invite link -->
	<div class="flex gap-4">
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
			<Button variant="outline" type="submit"><CirclePlus></CirclePlus>Create</Button>
		</form>
		{#if role === 'admin' || role === 'moderator'}
			<form
				action="?/clear"
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'failure') {
							toast.error(String(result.data?.message ?? 'Failed to clear inactive invites'));
							await update();
							return;
						}
						if (result.type === 'success') {
							clearingInvites = true;
							await new Promise((r) => setTimeout(r, 200));
							toast.success('Cleared all inactive invites!');
						}
						await update();
						clearingInvites = false;
					};
				}}
			>
				<Button type="submit" variant="outline"><Recycle />Clear inactive</Button>
			</form>
		{/if}
	</div>
</div>

<Separator class="my-4" />
<!-- Todo: Add edit link (dialog trigger) -->
{#if form?.success && form.id}
	<div transition:fade>
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
{#if invites && invites.length > 0}
	<Table.Root class="mx-auto max-w-2xl">
		<Table.Header>
			<Table.Row>
				<Table.Head>Creator</Table.Head>
				<Table.Head class="w-full">Invite code</Table.Head>
				<Table.Head>Uses</Table.Head>
				<Table.Head>Expires</Table.Head>
				<Table.Head></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each invites as invite (invite.id)}
				{@const expiry = getExpiryInfo(invite.status, invite.expiresAt)}
				<tr
					transition:fade={{ duration: 200, easing: cubicInOut }}
					class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
				>
					<Table.Cell class="font-semibold">{invite.createdBy}</Table.Cell>
					<Table.Cell class="max-w-0 truncate">{invite.id}</Table.Cell>
					<Table.Cell>{invite.useCount} / {invite.maxUses}</Table.Cell>
					<Table.Cell>{expiry.label}</Table.Cell>
					<Table.Cell>
						<Button
							disabled={expiry.inactive}
							variant="destructive"
							onclick={() => {
								revokeTargetId = invite.id;
								revokeDialogOpen = true;
							}}
						>
							<Trash />
						</Button>
					</Table.Cell>
				</tr>
			{/each}
		</Table.Body>
	</Table.Root>
{:else}
	<p class="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
		There are no active invites for this community.
	</p>
{/if}
