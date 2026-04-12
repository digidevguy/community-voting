<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { enhance, applyAction } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { formatDate } from '$lib/utils';
	import { differenceInDays, differenceInHours } from 'date-fns';
	import { Trash2 } from '@lucide/svelte';

	let { data }: { data: PageServerData } = $props();
	const sessions = $derived(data.sessions);

	const ALL_STATUSES = [
		'draft',
		'active',
		'voting_ended',
		'completed',
		'archived',
		'cancelled'
	] as const;

	const sessionsByStatus = $derived(
		Object.fromEntries(ALL_STATUSES.map((s) => [s, sessions.filter((sess) => sess.status === s)]))
	);

	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state<string | null>(null);
	let deleteTargetTitle = $state<string | null>(null);

	function openDeleteDialog(id: string, title: string) {
		deleteTargetId = id;
		deleteTargetTitle = title;
		deleteDialogOpen = true;
	}

	function formatRemainingTime(status: string, endDate: Date | null): string {
		if (status !== 'active' && status !== 'voting_ended') return '—';
		if (!endDate) return 'No deadline';
		const now = new Date();
		const end = new Date(endDate);
		if (end <= now) return 'Ended';
		const days = differenceInDays(end, now);
		const hours = differenceInHours(end, now) % 24;
		return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
	}

	function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'active':
				return 'default';
			case 'voting_ended':
			case 'completed':
				return 'secondary';
			case 'cancelled':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	function formatStatus(status: string): string {
		return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function getSessionOptions(status: string) {
		const options: { value: string; label: string }[] = [];
		if (status === 'draft' || status === 'active')
			options.push({ value: 'edit', label: 'Edit session' });
		if (status === 'active') options.push({ value: 'end_voting', label: 'End voting' });
		options.push({ value: 'delete', label: 'Delete session' });
		return options;
	}
</script>

<div class="mb-4 flex items-baseline justify-between">
	<h2 class="text-lg font-semibold">Sessions</h2>
	<span class="text-sm text-muted-foreground">
		{sessions.length} session{sessions.length === 1 ? '' : 's'}
	</span>
</div>

{#snippet sessionTable(rows: PageServerData['sessions'])}
	<div class="overflow-x-auto rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Title</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="hidden sm:table-cell">Created by</Table.Head>
					<Table.Head class="hidden sm:table-cell">Created</Table.Head>
					<Table.Head>Remaining time</Table.Head>
					<Table.Head class="sticky right-0 bg-background">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows as session (session.id)}
					{@const options = getSessionOptions(session.status)}
					<Table.Row>
						<Table.Cell class="font-medium">{session.title}</Table.Cell>
						<Table.Cell>
							<Badge variant={statusBadgeVariant(session.status)}>
								{formatStatus(session.status)}
							</Badge>
						</Table.Cell>
						<Table.Cell class="hidden sm:table-cell">{session.creator ?? '—'}</Table.Cell>
						<Table.Cell class="hidden sm:table-cell">{formatDate(session.createdAt)}</Table.Cell>
						<Table.Cell>{formatRemainingTime(session.status, session.endDate)}</Table.Cell>
						<Table.Cell class="sticky right-0 bg-background">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="outline" size="sm">Actions</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									{#each options as option, i (option.value)}
								{#if i === options.length - 1 && options.length > 1}
									<DropdownMenu.Separator />
								{/if}
								{#if option.value === 'delete'}
									<DropdownMenu.Item
										variant="destructive"
										onclick={() => openDeleteDialog(session.id, session.title)}
									>
										{option.label}
									</DropdownMenu.Item>
								{:else}
									<form
										method="POST"
										action="?/manageSession"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'redirect') {
													await applyAction(result);
												} else if (result.type === 'failure') {
													toast.error((result.data?.message as string) ?? 'Action failed');
												} else if (result.type === 'success') {
													toast.success(`${option.label} applied to "${session.title}"`);
													await update();
												}
											};
										}}
									>
										<input type="hidden" name="sessionId" value={session.id} />
										<input type="hidden" name="action" value={option.value} />
										<DropdownMenu.Item
											onclick={(e) => e.currentTarget.closest('form')?.requestSubmit()}
										>
											{option.label}
										</DropdownMenu.Item>
									</form>
								{/if}
							{/each}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="text-center text-muted-foreground">
							No sessions found
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/snippet}

<Tabs.Root value="all">
	<Tabs.List class="mb-4 flex flex-wrap gap-1">
		<Tabs.Trigger value="all">All ({sessions.length})</Tabs.Trigger>
		{#each ALL_STATUSES as status (status)}
			{@const count = sessionsByStatus[status].length}
			{#if count > 0}
				<Tabs.Trigger value={status}>{formatStatus(status)} ({count})</Tabs.Trigger>
			{/if}
		{/each}
	</Tabs.List>
	<Tabs.Content value="all">
		{@render sessionTable(sessions)}
	</Tabs.Content>
	{#each ALL_STATUSES as status (status)}
		<Tabs.Content value={status}>
			{@render sessionTable(sessionsByStatus[status])}
		</Tabs.Content>
	{/each}
</Tabs.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete session</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete <strong>{deleteTargetTitle}</strong>? This action cannot be
				undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<form
				method="POST"
				action="?/manageSession"
				use:enhance={() => {
					return async ({ update, result }) => {
						deleteDialogOpen = false;
						deleteTargetId = null;
						deleteTargetTitle = null;

						if (result.type === 'redirect') {
							await applyAction(result);
						} else if (result.type === 'failure') {
							toast.error((result.data?.message as string) ?? 'Action failed');
						} else if (result.type === 'success') {
							toast.success('Session deleted successfully');
							await update();
						}
					};
				}}
			>
				<input type="hidden" name="sessionId" value={deleteTargetId} />
				<input type="hidden" name="action" value="delete" />
				<Button type="submit" variant="destructive"><Trash2 />Delete</Button>
			</form>
			<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>Cancel</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
