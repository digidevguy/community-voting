<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { ActionData, PageServerData } from './$types';
	import Label from '$lib/components/ui/label/label.svelte';
	import { toast } from 'svelte-sonner';
	import { LoaderCircle, Users } from '@lucide/svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
	let submitting = $state(false);

	let username = $state<string | null>(null);
	let displayName = $derived(username);
</script>

<div class="-mt-6 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
	<Card.Root class="w-full max-w-md shadow-lg">
		<Card.Header class="space-y-3 pb-4 text-center">
			<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
				<Users class="h-6 w-6 text-primary" />
			</div>
			<div>
				<Card.Title class="text-2xl font-bold">{data.community.title}</Card.Title>
				<Card.Description class="mt-1 text-sm">
					{#if data.isAuthenticated}
						You've been invited to join this community.
					{:else}
						Create an account to join this community.
					{/if}
				</Card.Description>
			</div>
		</Card.Header>

		<Card.Content class="pt-2">
			{#if data.isAuthenticated}
				<div class="space-y-4">
					<p class="text-center text-sm text-muted-foreground">
						Click below to join <strong>{data.community.title}</strong> with your existing account.
					</p>
					<form
						method="POST"
						action="?/joinExisting"
						use:enhance={() => {
							submitting = true;
							return async ({ result, update }) => {
								if (result.type === 'success') {
									toast.success('Joined community successfully!');
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
						<Button type="submit" class="w-full" disabled={submitting}>
							{#if submitting}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								Joining...
							{:else}
								Join Community
							{/if}
						</Button>
					</form>
				</div>
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
					class="space-y-4"
				>
					<div class="space-y-2">
						<Label for="username">Username</Label>
						<Input
							id="username"
							name="username"
							placeholder="e.g. gamer123"
							bind:value={username}
						/>
					</div>
					<input type="hidden" id="displayName" name="displayName" bind:value={displayName} />
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input id="email" name="email" type="email" placeholder="you@example.com" />
					</div>
					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input id="password" name="password" type="password" placeholder="Min. 8 characters" />
					</div>
					<div class="space-y-2">
						<Label for="confirmPassword">Confirm Password</Label>
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							placeholder="Re-enter your password"
						/>
					</div>

					{#if form?.message}
						<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{form.message}
						</p>
					{/if}

					<Button type="submit" class="w-full" disabled={submitting}>
						{#if submitting}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							Creating account...
						{:else}
							Create Account &amp; Join
						{/if}
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
