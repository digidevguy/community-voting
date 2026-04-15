<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index';
	import { signIn } from '$lib/auth-client';
	import { MessageCircle } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Community Voting — Sign In</title>
	<meta
		name="description"
		content="Sign in to Community Voting to vote on games with your friends."
	/>
	<meta property="og:title" content="Community Voting — Sign In" />
	<meta
		property="og:description"
		content="Sign in to Community Voting to vote on games with your friends."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<div class="-mt-6 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
	<Card.Root class="w-full max-w-md shadow-lg">
		<Card.Header class="space-y-3 pb-4 text-center">
			<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
				<MessageCircle class="h-6 w-6 text-primary" />
			</div>
			<div>
				<Card.Title class="text-2xl font-bold">Welcome</Card.Title>
				<Card.Description class="mt-1 text-sm">
					Sign in with Discord to start voting with your friends.
				</Card.Description>
			</div>
		</Card.Header>
		<Card.Content class="pt-2">
			<Button
				class="w-full bg-[#5865F2] text-white hover:bg-[#4752C4]"
				onclick={() => signIn.social({ provider: 'discord', callbackURL: '/community' })}
			>
				<svg
					role="img"
					viewBox="0 0 24 24"
					class="mr-2 h-4 w-4 fill-current"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
					/>
				</svg>
				Continue with Discord
			</Button>
		</Card.Content>
	</Card.Root>
</div>
