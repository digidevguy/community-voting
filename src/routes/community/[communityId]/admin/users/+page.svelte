<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';

	let { data }: { data: PageServerData } = $props();
	const members = $derived(data.members);
	const isActorOwner = $derived(data.community.createdBy === data.currentUserId);
	const actorRole = $derived(data.userRole);
	let selectedActions: Record<string, string> = $state({});

	function formatJoinDate(dateStr: Date) {
		return format(new Date(dateStr), 'MMMM do, yyyy');
	}

	function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
		if (role === 'admin') return 'default';
		if (role === 'moderator') return 'secondary';
		return 'outline';
	}

	function getActionOptions(memberRole: string, memberUserId: string) {
		if (memberUserId === data.currentUserId) return [];

		const options: { value: string; label: string }[] = [];

		// Kick: mods can kick members; admins can kick members+mods; owners can kick all
		const canKick =
			isActorOwner ||
			actorRole === 'admin' ||
			(actorRole === 'moderator' && memberRole === 'member');
		if (canKick) options.push({ value: 'kick', label: 'Kick from community' });

		// Role changes: admin and owner only
		if (isActorOwner || actorRole === 'admin') {
			if (memberRole !== 'moderator')
				options.push({ value: 'set_moderator', label: 'Set to Moderator' });
			if (memberRole !== 'member') options.push({ value: 'set_member', label: 'Set to Member' });
		}

		// Admin grant: owner only
		if (isActorOwner && memberRole !== 'admin') {
			options.push({ value: 'set_admin', label: 'Set to Admin' });
		}

		return options;
	}
</script>

<div class="mb-4 flex items-baseline justify-between">
	<h2 class="text-lg font-semibold">Users</h2>
	<span class="text-sm text-muted-foreground"
		>{members.length} member{members.length === 1 ? '' : 's'}</span
	>
</div>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>Username</Table.Head>
			<Table.Head>Role</Table.Head>
			<Table.Head>Joined</Table.Head>
			<Table.Head class="hidden lg:table-cell">Session participation count</Table.Head>
			<Table.Head>Actions</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each members as member (member.userId)}
			{@const options = getActionOptions(member.role, member.userId)}
			<Table.Row>
				<Table.Cell class="font-medium">{member.name}</Table.Cell>
				<Table.Cell>
					<Badge variant={roleBadgeVariant(member.role)}>
						{member.role[0].toUpperCase() + member.role.slice(1)}
					</Badge>
				</Table.Cell>
				<Table.Cell>{formatJoinDate(member.joinedAt)}</Table.Cell>
				<Table.Cell class="hidden lg:table-cell">{member.sessionCount}</Table.Cell>
				<Table.Cell>
					{#if options.length > 0}
						<form
							method="POST"
							action="?/manageUser"
							class="flex items-center gap-2"
							use:enhance={({ formData }) => {
								const action = formData.get('action');
								const label = options.find((o) => o.value === action)?.label ?? action;
								return async ({ result, update }) => {
									if (result.type === 'failure') {
										toast.error((result.data?.message as string) ?? 'Action failed');
									} else if (result.type === 'success') {
										toast.success(`${label} applied to ${member.name}`);
										await update();
									}
								};
							}}
						>
							<input type="hidden" name="userId" value={member.userId} />
							<div class="min-w-[185px]">
								<Select.Root
									bind:value={selectedActions[member.userId]}
									name="action"
									type="single"
								>
									<Select.Trigger class="w-full">
										{options.find((o) => o.value === selectedActions[member.userId])?.label ??
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
								disabled={!selectedActions[member.userId]}>Confirm</Button
							>
						</form>
					{:else if member.userId === data.currentUserId}
						<Badge variant="outline">You</Badge>
					{/if}
				</Table.Cell>
			</Table.Row>
		{:else}
			<Table.Row>
				<Table.Cell colspan={5} class="text-center text-muted-foreground"
					>No other members</Table.Cell
				>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
