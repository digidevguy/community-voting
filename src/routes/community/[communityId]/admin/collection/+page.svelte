<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { formatDate } from '$lib/utils';
	import type { PageServerData } from './$types';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { applyAction, enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Trash2 } from '@lucide/svelte';

	let { data }: { data: PageServerData } = $props();
	const collection = $derived(data.collection);

	const activeCollection = $derived(data.collection.filter((i) => i.isActive));
	const inactiveCollection = $derived(data.collection.filter((i) => !i.isActive));

	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state<string | null>(null);

	function openDeleteDialog(id: string) {
		deleteTargetId = id;
		deleteDialogOpen = true;
	}
</script>

<div class="mb-4 flex items-baseline justify-between">
	<h2 class="text-lg font-semibold">Collection</h2>
	<span class="text-sm text-muted-foreground">
		{collection.length} item{collection.length === 1 ? '' : 's'}
	</span>
</div>

{#snippet actionDropdown(item: PageServerData['collection'][0])}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline">Actions</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content>
			<form
				method="post"
				action="?/reactivate"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'failure') {
							toast.error((result.data?.message as string) ?? 'An error occured');
						} else if (result.type === 'redirect') {
							toast.warning('Please log in');
						} else {
							toast.success('Game was reactivated!');
							await update();
						}
					};
				}}
			>
				<input type="hidden" name="gameId" value={item.game.id} />
				<DropdownMenu.Item onclick={(e) => e.currentTarget.closest('form')?.requestSubmit()}>
					Reactivate
				</DropdownMenu.Item>
			</form>
			<DropdownMenu.Separator />
			<DropdownMenu.Item variant="destructive" onclick={() => openDeleteDialog(item.game.id)}>
				Delete
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

{#snippet table(items: PageServerData['collection'])}
	<div class="overflow-x-auto rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Title</Table.Head>
					<Table.Head>Used in session</Table.Head>
					<Table.Head>Winning option</Table.Head>
					{#if items[0]?.isActive}
						<Table.Head>Added by</Table.Head>
					{:else}
						<Table.Head>Removed by</Table.Head>
					{/if}
					<Table.Head>Action</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each items as item (item.id)}
					<Table.Row>
						<Table.Cell>{item.game.title}</Table.Cell>
						<Table.Cell>
							{item.timesUsed} time{item.timesUsed > 1 || item.timesUsed === 0 ? 's' : ''}
						</Table.Cell>
						<Table.Cell>
							{item.timesWon} time{item.timesWon > 1 || item.timesWon === 0 ? 's' : ''}
						</Table.Cell>
						{#if item.isActive}
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Badge>{item.addedBy?.name}</Badge>
									<span class="text-muted-foreground"
										>{item.addedAt && formatDate(item.addedAt)}</span
									>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Button variant="destructive" onclick={() => openDeleteDialog(item.game.id)}>
									<Trash2></Trash2>
								</Button>
							</Table.Cell>
						{:else}
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Badge variant="secondary">{item.removedBy?.name}</Badge>
									<span class="text-muted-foreground"
										>{item.removedAt && formatDate(item.removedAt)}</span
									>
								</div>
							</Table.Cell>
							<Table.Cell>
								{@render actionDropdown(item)}
							</Table.Cell>
						{/if}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/snippet}

<Tabs.Root value="active">
	<Tabs.List>
		<Tabs.Trigger value="active">Active</Tabs.Trigger>
		<Tabs.Trigger value="inactive">Inactive</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="active">
		{#if activeCollection.length > 0}
			{@render table(activeCollection)}
		{:else}
			<p class="py-4 text-sm text-muted-foreground">No active items in the collection.</p>
		{/if}
	</Tabs.Content>
	<Tabs.Content value="inactive">
		{#if inactiveCollection.length > 0}
			{@render table(inactiveCollection)}
		{:else}
			<p class="py-4 text-sm text-muted-foreground">No removed items in the collection.</p>
		{/if}
	</Tabs.Content>
</Tabs.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete game</Dialog.Title>
			<Dialog.Description>
				This will permanently remove the item from the collection. This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<form
				method="post"
				action="?/remove"
				use:enhance={() => {
					return async ({ update, result }) => {
						deleteDialogOpen = false;
						deleteTargetId = null;

						if (result.type === 'redirect') {
							await applyAction(result);
						} else if (result.type === 'failure') {
							toast.error((result.data?.message as string) ?? 'Action failed');
						} else if (result.type === 'success') {
							toast.success('Game remove successfully!');
							await update();
						}
					};
				}}
			>
				<input type="hidden" name="gameId" value={deleteTargetId} />
				<Button type="submit" variant="destructive"><Trash2></Trash2>Delete</Button>
			</form>
			<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>Cancel</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
