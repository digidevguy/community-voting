<script lang="ts">
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Check, CircleChevronLeft, CirclePlus, Plus, Trash2 } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let newGame = $state<string | null>(null);
	let addDialogOpen = $state(false);
	let removeDialogOpen = $state<Record<string, boolean>>({});
</script>

<h1 class="mb-4 text-xl font-semibold">Community Collection</h1>
<div class="flex items-center justify-between">
	<Button href="/community/{data.community.id}" variant="outline"
		><CircleChevronLeft></CircleChevronLeft>Back</Button
	>
	<Dialog.Root bind:open={addDialogOpen}>
		<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
			><CirclePlus />Add new</Dialog.Trigger
		>
		<Dialog.Content class="max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Add new game</Dialog.Title>
			</Dialog.Header>
			<div>
				<form method="POST" action="?/search" use:enhance>
					<Label for="searchTerm" class="mb-2">Game name</Label>
					<Input id="searchTerm" name="searchTerm" />
					<div class="my-2 text-right"><Button type="submit">Search</Button></div>
				</form>
				<ul>
					{#if form?.games}
						{#each form.games as game (game.id)}
							<li class="flex items-center justify-between">
								{game.title}
								<Button
									size="icon"
									variant="ghost"
									onclick={() => (newGame = newGame === game.id ? null : game.id)}
								>
									{#if newGame === game.id}
										<Check class="text-green-500" />
									{:else}
										<Plus />
									{/if}
								</Button>
							</li>
						{/each}
					{/if}
				</ul>
			</div>
			<Dialog.Footer class="flex-row justify-end">
				<form
					method="POST"
					action="?/add"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								addDialogOpen = false;
								toast.success('Game added!');
							}

							await update();
						};
					}}
				>
					<input type="hidden" bind:value={newGame} name="gameId" />
					<Button type="submit" variant="default">Save</Button>
				</form>
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
<Separator class="my-4" />
<ul
	class="grid grid-cols-[repeat(auto-fit,minmax(theme(spacing.64),1fr))] place-items-center gap-2"
>
	{#each data.collection as item (item.game.id)}
		<li>
			<Card.Root class="max-w-sm gap-0 overflow-hidden py-0">
				<!-- <h2>{item.game.title}</h2> -->
				<img src={item.game.image} alt={item.game.title} />
				<Card.Footer class="my-2 flex justify-between">
					<Button href="/library/{item.game.id}" variant="link">View game details</Button>
					<Dialog.Root
						open={removeDialogOpen[item.game.id] ?? false}
						onOpenChange={(open) => {
							removeDialogOpen[item.game.id] = open;
						}}
					>
						<Dialog.Trigger><Trash2 class="text-red-500" /></Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Title>Delete collection item?</Dialog.Title>
							<Dialog.Description>Are you sure you want to do this?</Dialog.Description>
							<Dialog.Footer>
								<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
								<form
									method="POST"
									action="?/remove"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												removeDialogOpen[item.game.id] = false;
												toast.success('Game removed successfully!');
											}

											await update();
										};
									}}
								>
									<input type="hidden" value={item.game.id} name="gameId" />
									<Button aria-label="Remove" variant="destructive" type="submit">Delete</Button>
								</form></Dialog.Footer
							>
						</Dialog.Content>
					</Dialog.Root>
				</Card.Footer>
			</Card.Root>
		</li>
	{/each}
</ul>
