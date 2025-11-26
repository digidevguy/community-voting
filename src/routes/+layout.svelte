<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import DarkModeToggle from '$lib/components/custom/DarkModeToggle.svelte';
	import { Button } from '$lib/components/ui/button';

	const navigation = [
		{ href: '/search', label: 'Search' },
		{ href: '/auth', label: 'Auth' }
	];

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<header class="flex items-center justify-between border-b p-4">
	<a href="/" class="text-lg font-bold">Community Voting</a>
	<div class="flex items-center gap-4">
		<nav>
			{#each navigation as item}
				<Button variant="ghost" href={item.href} class="mr-4 last:mr-0">{item.label}</Button>
			{/each}
		</nav>
		<DarkModeToggle />
	</div>
</header>
<main class="mx-auto h-svh w-full max-w-5xl px-4 py-4 sm:px-6 md:px-8">
	{@render children?.()}
</main>
