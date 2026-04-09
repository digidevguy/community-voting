<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { enhance, applyAction } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { format, differenceInDays, differenceInHours } from 'date-fns';

	let { data }: { data: PageServerData } = $props();
	const sessions = $derived(data.sessions);
	let selectedActions: Record<string, string> = $state({});

	function formatDate(dateStr: Date) {
		return format(new Date(dateStr), 'MMMM do, yyyy');
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

<div class="overflow-x-auto rounded-md border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Title</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head>Created by</Table.Head>
				<Table.Head>Created</Table.Head>
				<Table.Head>Remaining time</Table.Head>
				<Table.Head class="sticky right-0 bg-background">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each sessions as session (session.id)}
				{@const options = getSessionOptions(session.status)}
				<Table.Row>
					<Table.Cell class="font-medium">{session.title}</Table.Cell>
					<Table.Cell>
						<Badge variant={statusBadgeVariant(session.status)}>
							{formatStatus(session.status)}
						</Badge>
					</Table.Cell>
					<Table.Cell>{session.creator ?? '—'}</Table.Cell>
					<Table.Cell>{formatDate(session.createdAt)}</Table.Cell>
					<Table.Cell>{formatRemainingTime(session.status, session.endDate)}</Table.Cell>
					<Table.Cell class="sticky right-0 bg-background">
						<form
							method="POST"
							action="?/manageSession"
							class="flex items-center gap-2 whitespace-nowrap"
							use:enhance={({ formData }) => {
								const action = formData.get('action');
								const label = options.find((o) => o.value === action)?.label ?? action;
								return async ({ result, update }) => {
									if (result.type === 'redirect') {
										await applyAction(result);
									} else if (result.type === 'failure') {
										toast.error((result.data?.message as string) ?? 'Action failed');
									} else if (result.type === 'success') {
										toast.success(`${label} applied to "${session.title}"`);
										selectedActions[session.id] = '';
										await update();
									}
								};
							}}
						>
							<input type="hidden" name="sessionId" value={session.id} />
							<div class="min-w-[160px]">
								<Select.Root bind:value={selectedActions[session.id]} name="action" type="single">
									<Select.Trigger class="w-full">
										{options.find((o) => o.value === selectedActions[session.id])?.label ??
											'Select an action...'}
									</Select.Trigger>
									<Select.Content>
										{#each options as option (option.value)}
											<Select.Item value={option.value}>{option.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<Button
								type="submit"
								size="sm"
								variant="outline"
								disabled={!selectedActions[session.id]}>Confirm</Button
							>
						</form>
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
