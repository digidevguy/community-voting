<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { ActionData, PageServerData } from './$types';
	import Label from '$lib/components/ui/label/label.svelte';
	import { toast } from 'svelte-sonner';
	import { LoaderCircle } from '@lucide/svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
	let submitting = $state(false);

	let username = $state<string | null>(null);
	let displayName = $derived(username);
</script>

<div class="flex min-h-screen flex-col items-center justify-center">
	<Card.Root>
		<Card.Header>
			<Card.Title>Welcome to the {data.community.title} Community!</Card.Title>
			{#if data.isAuthenticated}
				<Card.Description>Let's make an account!</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content>
			{#if data.isAuthenticated}
				<form
					method="POST"
					action="?/joinExisting"
					use:enhance={() => {
						submitting = true;
						return async ({ result, update }) => {
							if (result.type === 'success') {
								toast.success('Account linked to community!');
								await applyAction({
									type: 'redirect',
									status: 303,
									location: `/community/${data.community.id}`
								});
								return;
							}
							await update();
							submitting = false;
						};
					}}
				>
					<Button type="submit">Join</Button>
				</form>
			{:else}
				<form
					action="?/join"
					method="post"
					use:enhance={() => {
						submitting = true;
						return async ({ result, update }) => {
							if (result.type === 'success') {
								toast.success('Account created successfully!');
								await applyAction({
									type: 'redirect',
									status: 303,
									location: `/community/${result.data?.communityId}`
								});
								return;
							}
							await update();
							submitting = false;
						};
					}}
					class="space-y-2"
				>
					<div class="space-y-2">
						<Label for="username">Username</Label>
						<Input id="username" name="username" bind:value={username} />
					</div>
					<input type="hidden" id="displayName" name="displayName" bind:value={displayName} />
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input id="email" name="email" />
					</div>
					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input id="password" name="password" type="password" />
					</div>
					<div class="space-y-2">
						<Label for="confirmPassword">Confirm Password</Label>
						<Input id="confirmPassword" name="confirmPassword" type="password" />
					</div>
					<Button type="submit" class="mt-2 w-full">
						{#if submitting}
							<LoaderCircle class="animate-spin" />
						{:else}
							Create
						{/if}
					</Button>
					{#if form?.message}
						<p class="text-red-600">{form?.message}</p>
					{/if}
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
