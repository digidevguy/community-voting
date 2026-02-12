<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import DarkModeToggle from '$lib/components/custom/DarkModeToggle.svelte';
	import { Button } from '$lib/components/ui/button';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<header class="flex items-center justify-between border-b bg-white p-4">
	<a href="/" class="text-lg font-bold">Community Voting</a>
	<div class="flex items-center gap-4">
		<nav>
			{#each data.navigation as item}
				<Button variant="ghost" href={item.href} class="mr-4 last:mr-0">{item.label}</Button>
			{/each}
		</nav>

		{#if data?.user}
			<form action="/auth?/logout" method="POST">
				<Button type="submit" variant="ghost">Logout</Button>
			</form>
		{:else}
			<Button variant="ghost" href="/auth">Auth</Button>
		{/if}

		<DarkModeToggle />
	</div>
</header>
<main
	class="mx-auto my-2 min-h-screen w-full max-w-5xl rounded-md bg-amber-50 px-4 py-4 sm:px-6 md:px-8"
>
	{@render children?.()}
</main>

<style>
	:global(body) {
		background-color: oklch(68.5% 0.169 237.323);
	}
</style>
