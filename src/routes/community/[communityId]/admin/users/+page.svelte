<script lang="ts">
	import type { PageServerData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';

	let { data }: { data: PageServerData } = $props();
	const members = $derived(data.members);
	const isActorOwner = $derived(data.community.createdBy === data.currentUserId);
	const actorRole = $derived(data.userRole);

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

<div class="overflow-x-auto rounded-md border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Username</Table.Head>
				<Table.Head>Role</Table.Head>
				<Table.Head class="hidden sm:table-cell">Joined</Table.Head>
				<Table.Head class="hidden lg:table-cell">Sessions</Table.Head>
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
					<Table.Cell class="hidden sm:table-cell">{formatJoinDate(member.joinedAt)}</Table.Cell>
					<Table.Cell class="hidden lg:table-cell">{member.sessionCount}</Table.Cell>
					<Table.Cell>
						{#if member.userId === data.currentUserId}
							<Badge variant="outline">You</Badge>
						{:else if options.length > 0}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="outline" size="sm">Actions</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									{#each options as option, i (option.value)}
										{#if i > 0 && options[i - 1].value === 'kick'}
											<DropdownMenu.Separator />
										{/if}
										<form
											method="POST"
											action="?/manageUser"
											use:enhance={() => {
												return async ({ result, update }) => {
													if (result.type === 'failure') {
														toast.error((result.data?.message as string) ?? 'Action failed');
													} else if (result.type === 'success') {
														toast.success(`${option.label} applied to ${member.name}`);
														await update();
													}
												};
											}}
										>
											<input type="hidden" name="userId" value={member.userId} />
											<input type="hidden" name="action" value={option.value} />
											<DropdownMenu.Item
												variant={option.value === 'kick' ? 'destructive' : undefined}
												onclick={(e) => e.currentTarget.closest('form')?.requestSubmit()}
											>
												{option.label}
											</DropdownMenu.Item>
										</form>
									{/each}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{:else}
							<span class="text-sm text-muted-foreground">No actions available</span>
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
</div>
