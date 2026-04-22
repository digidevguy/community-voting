<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Users, Library, Trophy } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Community Voting — Vote on games with your friends</title>
	<meta
		name="description"
		content="Create a community, build a shared game collection, and vote together on what to play next."
	/>
	<meta property="og:title" content="Community Voting — Vote on games with your friends" />
	<meta
		property="og:description"
		content="Create a community, build a shared game collection, and vote together on what to play next."
	/>
	<meta property="og:type" content="website" />
	<meta name="twitter:title" content="Community Voting — Vote on games with your friends" />
	<meta
		name="twitter:description"
		content="Create a community, build a shared game collection, and vote together on what to play next."
	/>
</svelte:head>

<div class="flex flex-col gap-16 pb-16">
	<!-- Hero -->
	<section class="flex flex-col items-center gap-6 pt-10 text-center sm:pt-16">
		<h1 class="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
			Vote on what to play,&nbsp;together.
		</h1>
		<p class="max-w-md text-base text-muted-foreground sm:text-lg">
			Create a community, add games to a shared collection, and let everyone vote on what to play
			next.
		</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button href="/auth" size="lg" data-sveltekit-preload-data="tap">Get started</Button>
		</div>
	</section>

	<!-- How it works -->
	<section class="flex flex-col gap-6">
		<h2 class="text-center">How it works</h2>
		<ul class="grid gap-4 sm:grid-cols-3">
			<li>
				<Card.Root class="h-full">
					<Card.Header>
						<Users class="mb-2 h-6 w-6 text-muted-foreground" />
						<Card.Title class="text-base">Create a community</Card.Title>
						<Card.Description>
							Invite friends and manage your group's game library in one place.
						</Card.Description>
					</Card.Header>
				</Card.Root>
			</li>
			<li>
				<Card.Root class="h-full">
					<Card.Header>
						<Library class="mb-2 h-6 w-6 text-muted-foreground" />
						<Card.Title class="text-base">Build a collection</Card.Title>
						<Card.Description>
							Add board games or video games to your community's shared collection.
						</Card.Description>
					</Card.Header>
				</Card.Root>
			</li>
			<li>
				<Card.Root class="h-full">
					<Card.Header>
						<Trophy class="mb-2 h-6 w-6 text-muted-foreground" />
						<Card.Title class="text-base">Vote and decide</Card.Title>
						<Card.Description>
							Start a voting session, let everyone have their say, and the majority picks the
							winner.
						</Card.Description>
					</Card.Header>
				</Card.Root>
			</li>
		</ul>
	</section>
</div>
