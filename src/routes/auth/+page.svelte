<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { signIn } from '$lib/auth-client';
</script>

<svelte:head>
	<title>Game Voting - Sign In</title>
	<meta name="description" content="Sign in to vote on games with your friends" />
</svelte:head>

<article class="flex flex-col items-center gap-6 py-8 sm:py-12">
	<div class="text-center">
		<h1 class="text-2xl font-semibold">Welcome</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Sign in or register to start voting with your friends!
		</p>
	</div>
	<div class="w-full max-w-sm">
		<Button onclick={() => signIn.social({ provider: 'discord', callbackURL: '/community' })}>
			Continue with Discord
		</Button>
	</div>
</article>
