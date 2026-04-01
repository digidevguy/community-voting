<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { PageServerData } from './$types';
	import { toast } from 'svelte-sonner';
	import { LoaderCircle, Users } from '@lucide/svelte';
	import { page } from '$app/state';
	import { signIn } from '$lib/auth-client';

	let { data }: { data: PageServerData } = $props();
	let submitting = $state(false);
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
				<Button
					onclick={() => signIn.social({ provider: 'discord', callbackURL: page.url.pathname })}
				>
					Continue with Discord
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
