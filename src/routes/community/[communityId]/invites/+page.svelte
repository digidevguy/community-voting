<script lang="ts">
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as InputGroup from '$lib/components/ui/input-group/index';
	import * as Table from '$lib/components/ui/table/index';
	import * as Dialog from '$lib/components/ui/dialog/index';
	import * as Select from '$lib/components/ui/select';
	import Label from '$lib/components/ui/label/label.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import {
		Check,
		CircleChevronLeft,
		CirclePlus,
		Clock,
		Copy,
		Pencil,
		Recycle,
		Trash
	} from '@lucide/svelte';
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
	let createDialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let editTarget = $state<(typeof data.invites)[number] | null>(null);

	// Create form state
	let createLabel = $state('');
	let createExpiry = $state('7d');
	let createMaxUses = $state('1');
	let createRole = $state('member');
	let createMembershipDays = $state('permanent');

	// Edit form state
	let editLabel = $state('');
	let editExpiry = $state('7d');
	let editMaxUses = $state('1');

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

	const inviteLink = $derived(
		form?.success && form.id
			? `${page.url.origin}/community/${data.communityId}/join/${form.id}`
			: ''
	);

	const EXPIRY_OPTIONS = [
		{ label: '30 minutes', value: '30m' },
		{ label: '1 hour', value: '1h' },
		{ label: '6 hours', value: '6h' },
		{ label: '12 hours', value: '12h' },
		{ label: '1 day', value: '1d' },
		{ label: '7 days', value: '7d' },
		{ label: 'Never', value: 'never' }
	];

	const MAX_USES_OPTIONS = [
		{ label: 'No limit', value: 'unlimited' },
		{ label: '1', value: '1' },
		{ label: '5', value: '5' },
		{ label: '10', value: '10' },
		{ label: '25', value: '25' },
		{ label: '50', value: '50' },
		{ label: '100', value: '100' }
	];

	const ROLE_OPTIONS = [
		{ label: 'Member', value: 'member' },
		{ label: 'Moderator', value: 'moderator' }
	];

	const MEMBERSHIP_OPTIONS = [
		{ label: 'Permanent', value: 'permanent' },
		{ label: '7 days', value: '7' },
		{ label: '14 days', value: '14' },
		{ label: '30 days', value: '30' },
		{ label: '90 days', value: '90' }
	];

	function resolveExpiry(key: string): string | undefined {
		if (key === 'never') return undefined;
		const ms: Record<string, number> = {
			'30m': 30 * 60 * 1000,
			'1h': 60 * 60 * 1000,
			'6h': 6 * 60 * 60 * 1000,
			'12h': 12 * 60 * 60 * 1000,
			'1d': 24 * 60 * 60 * 1000,
			'7d': 7 * 24 * 60 * 60 * 1000
		};
		return new Date(Date.now() + (ms[key] ?? 0)).toISOString().slice(0, 16);
	}

	function guessExpiryKey(expiresAt: Date | null): string {
		if (!expiresAt) return 'never';
		const remaining = expiresAt.getTime() - Date.now();
		if (remaining <= 45 * 60 * 1000) return '30m';
		if (remaining <= 1.5 * 60 * 60 * 1000) return '1h';
		if (remaining <= 9 * 60 * 60 * 1000) return '6h';
		if (remaining <= 18 * 60 * 60 * 1000) return '12h';
		if (remaining <= 1.5 * 24 * 60 * 60 * 1000) return '1d';
		return '7d';
	}

	function openEditDialog(invite: (typeof data.invites)[number]) {
		editTarget = invite;
		editLabel = invite.label ?? '';
		editExpiry = guessExpiryKey(invite.expiresAt);
		editMaxUses = invite.maxUses != null ? String(invite.maxUses) : 'unlimited';
		editDialogOpen = true;
	}

	function copyLink(link: string) {
		clipboard.copy(link);
		if (clipboard.error) {
			return toast.error(clipboard.error.message ?? 'Unable to copy to clipboard');
		}
		toast.success('Copied to clipboard!');
	}

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

	const createExpiryValue = $derived(resolveExpiry(createExpiry));
	const createMaxUsesValue = $derived(createMaxUses === 'unlimited' ? undefined : createMaxUses);
	const createMembershipValue = $derived(
		createMembershipDays === 'permanent' ? undefined : createMembershipDays
	);
	const showMembershipDuration = $derived(createRole === 'member');

	const editExpiryValue = $derived(resolveExpiry(editExpiry));
	const editMaxUsesValue = $derived(editMaxUses === 'unlimited' ? undefined : editMaxUses);
</script>

<svelte:head>
	<title>Invites — Community Voting</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Revoke dialog -->
<Dialog.Root bind:open={revokeDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>Confirm revoke</Dialog.Header>
		<Dialog.Description>Are you sure that you want to revoke this invite?</Dialog.Description>
		<Dialog.Footer class="flex-row gap-2">
			<Dialog.Close
				class={buttonVariants({ variant: 'secondary', className: 'flex-1 sm:flex-none' })}
				>Cancel</Dialog.Close
			>
			<form
				class="flex-1 sm:flex-none"
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
				<Button type="submit" variant="destructive" class="w-full sm:w-auto"><Trash />Revoke</Button
				>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Create invite dialog -->
<Dialog.Root bind:open={createDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>Create Invite Link</Dialog.Header>
		<Dialog.Description>Customize the invite link settings.</Dialog.Description>
		<form
			action="?/create"
			method="POST"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure') {
						toast.error(String(result.data?.message ?? 'Failed to create invite'));
					}
					if (result.type === 'success') {
						createDialogOpen = false;
						toast.success('Created new invite link!');
					}
					await update();
				};
			}}
		>
			{#if createExpiryValue}
				<input type="hidden" name="expiresAt" value={createExpiryValue} />
			{/if}
			{#if createMaxUsesValue}
				<input type="hidden" name="maxUses" value={createMaxUsesValue} />
			{/if}
			{#if createRole !== 'member'}
				<input type="hidden" name="grantedRole" value={createRole} />
			{/if}
			{#if createMembershipValue && showMembershipDuration}
				<input type="hidden" name="membershipDurationDays" value={createMembershipValue} />
			{/if}

			<div class="flex flex-col gap-4 py-4">
				<!-- Label — full width -->
				<div class="flex flex-col gap-2">
					<Label for="create-label"
						>Label <span class="text-muted-foreground">(optional)</span></Label
					>
					<Input
						id="create-label"
						name="label"
						placeholder="e.g. For the Discord group"
						maxlength={100}
						bind:value={createLabel}
					/>
				</div>

				<!-- Expire after + Max uses — 2 columns -->
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<Label>Expire after</Label>
						<Select.Root type="single" bind:value={createExpiry}>
							<Select.Trigger>
								{EXPIRY_OPTIONS.find((o) => o.value === createExpiry)?.label ?? 'Select'}
							</Select.Trigger>
							<Select.Content>
								{#each EXPIRY_OPTIONS as opt (opt.value)}
									<Select.Item value={opt.value}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-2">
						<Label>Max uses</Label>
						<Select.Root type="single" bind:value={createMaxUses}>
							<Select.Trigger>
								{MAX_USES_OPTIONS.find((o) => o.value === createMaxUses)?.label ?? 'Select'}
							</Select.Trigger>
							<Select.Content>
								{#each MAX_USES_OPTIONS as opt (opt.value)}
									<Select.Item value={opt.value}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<!-- Granted role + Membership duration — 2 columns -->
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<Label>Granted role</Label>
						<Select.Root type="single" bind:value={createRole}>
							<Select.Trigger>
								{ROLE_OPTIONS.find((o) => o.value === createRole)?.label ?? 'Select'}
							</Select.Trigger>
							<Select.Content>
								{#each ROLE_OPTIONS as opt (opt.value)}
									<Select.Item value={opt.value}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					{#if showMembershipDuration}
						<div class="flex flex-col gap-2">
							<Label>Membership duration</Label>
							<Select.Root type="single" bind:value={createMembershipDays}>
								<Select.Trigger>
									{MEMBERSHIP_OPTIONS.find((o) => o.value === createMembershipDays)?.label ??
										'Select'}
								</Select.Trigger>
								<Select.Content>
									{#each MEMBERSHIP_OPTIONS as opt (opt.value)}
										<Select.Item value={opt.value}>{opt.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/if}
				</div>

				{#if showMembershipDuration && createMembershipDays !== 'permanent'}
					<p class="text-xs text-muted-foreground">
						Members will be removed after {createMembershipDays} days unless assigned a permanent role.
					</p>
				{/if}
			</div>

			<Dialog.Footer class="flex-row gap-2">
				<Dialog.Close
					class={buttonVariants({ variant: 'secondary', className: 'flex-1 sm:flex-none' })}
					>Cancel</Dialog.Close
				>
				<Button type="submit" class="flex-1 sm:flex-none"><CirclePlus />Create</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit invite dialog -->
<Dialog.Root bind:open={editDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>Edit Invite</Dialog.Header>
		<Dialog.Description>Update the label, expiry, or use limit.</Dialog.Description>
		<form
			action="?/update"
			method="POST"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure') {
						toast.error(String(result.data?.message ?? 'Failed to update invite'));
					}
					if (result.type === 'success') {
						editDialogOpen = false;
						toast.success('Invite updated!');
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="inviteId" value={editTarget?.id} />
			{#if editExpiryValue}
				<input type="hidden" name="expiresAt" value={editExpiryValue} />
			{/if}
			{#if editMaxUsesValue}
				<input type="hidden" name="maxUses" value={editMaxUsesValue} />
			{/if}

			<div class="flex flex-col gap-4 py-4">
				<!-- Label — full width -->
				<div class="flex flex-col gap-2">
					<Label for="edit-label">Label <span class="text-muted-foreground">(optional)</span></Label
					>
					<Input
						id="edit-label"
						name="label"
						placeholder="e.g. For the Discord group"
						maxlength={100}
						bind:value={editLabel}
					/>
				</div>

				<!-- Expire after + Max uses — 2 columns -->
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<Label>Expire after</Label>
						<Select.Root type="single" bind:value={editExpiry}>
							<Select.Trigger>
								{EXPIRY_OPTIONS.find((o) => o.value === editExpiry)?.label ?? 'Select'}
							</Select.Trigger>
							<Select.Content>
								{#each EXPIRY_OPTIONS as opt (opt.value)}
									<Select.Item value={opt.value}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-2">
						<Label>Max uses</Label>
						<Select.Root type="single" bind:value={editMaxUses}>
							<Select.Trigger>
								{MAX_USES_OPTIONS.find((o) => o.value === editMaxUses)?.label ?? 'Select'}
							</Select.Trigger>
							<Select.Content>
								{#each MAX_USES_OPTIONS as opt (opt.value)}
									<Select.Item value={opt.value}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</div>

			<Dialog.Footer class="flex-row gap-2">
				<Dialog.Close
					class={buttonVariants({ variant: 'secondary', className: 'flex-1 sm:flex-none' })}
					>Cancel</Dialog.Close
				>
				<Button type="submit" class="flex-1 sm:flex-none"><Check />Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<h1 class="mb-4 text-xl font-semibold">Invites Dashboard</h1>
<div class="flex justify-between">
	<Button href="/community/{data.communityId}" variant="outline">
		<CircleChevronLeft></CircleChevronLeft>Back
	</Button>
	<div class="flex gap-4">
		<Button variant="outline" onclick={() => (createDialogOpen = true)}>
			<CirclePlus />Create
		</Button>
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
<div class="min-h-10">
	{#if form?.success && form.id}
		<div transition:fade>
			<InputGroup.Root>
				<InputGroup.Input value={inviteLink} readonly class="truncate" />
				<InputGroup.Addon align="inline-end">
					<InputGroup.Button aria-label="copy" size="icon-xs" onclick={() => copyLink(inviteLink)}>
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
</div>

<!-- Table for listing available invites -->
{#if invites && invites.length > 0}
	<Table.Root class="mx-auto max-w-4xl">
		<Table.Header>
			<Table.Row>
				<Table.Head>Creator</Table.Head>
				<Table.Head>Label</Table.Head>
				<Table.Head class="w-full">Invite code</Table.Head>
				<Table.Head>Role</Table.Head>
				<Table.Head>Uses</Table.Head>
				<Table.Head>Expires</Table.Head>
				<Table.Head></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each invites as invite (invite.id)}
				{@const expiry = getExpiryInfo(invite.status, invite.expiresAt)}
				{@const rowInviteLink = `${page.url.origin}/community/${data.communityId}/join/${invite.id}`}
				<tr
					transition:fade={{ duration: 200, easing: cubicInOut }}
					class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
				>
					<Table.Cell class="font-semibold">{invite.createdBy}</Table.Cell>
					<Table.Cell class="max-w-32 truncate text-sm text-muted-foreground">
						{#if invite.label}
							{invite.label}
						{:else}
							<span class="italic">—</span>
						{/if}
					</Table.Cell>
					<Table.Cell class="max-w-0 truncate">
						<Button
							variant="ghost"
							aria-label="copy"
							class="w-full max-w-full min-w-0 shrink justify-start overflow-hidden"
							disabled={expiry.inactive}
							onclick={() => copyLink(rowInviteLink)}
						>
							<span class="block w-full truncate text-left">{invite.id}</span>
						</Button>
					</Table.Cell>
					<Table.Cell>
						<div class="flex flex-col gap-1">
							<Badge variant={invite.grantedRole === 'moderator' ? 'default' : 'secondary'}>
								{invite.grantedRole ?? 'member'}
							</Badge>
							{#if invite.membershipDurationDays != null}
								<span class="flex items-center gap-1 text-xs text-muted-foreground">
									<Clock class="h-3 w-3" />{invite.membershipDurationDays}d
								</span>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell>{invite.useCount} / {invite.maxUses ?? '∞'}</Table.Cell>
					<Table.Cell>{expiry.label}</Table.Cell>
					<Table.Cell>
						<div class="flex gap-1">
							<Button
								disabled={expiry.inactive}
								variant="ghost"
								size="icon"
								aria-label="edit"
								onclick={() => openEditDialog(invite)}
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								disabled={expiry.inactive}
								variant="destructive"
								size="icon"
								aria-label="revoke"
								onclick={() => {
									revokeTargetId = invite.id;
									revokeDialogOpen = true;
								}}
							>
								<Trash class="h-4 w-4" />
							</Button>
						</div>
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
