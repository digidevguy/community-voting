<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import DarkModeToggle from '$lib/components/custom/DarkModeToggle.svelte';
	import { Button } from '$lib/components/ui/button';

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
			<a href="/search">Search</a>
			<a href="/auth">Auth</a>
		</nav>
		<DarkModeToggle />
	</div>
</header>
<main class="grid h-svh place-content-center">
	{@render children?.()}
</main>
