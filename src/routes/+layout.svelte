<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index';
	import { ModeWatcher } from 'mode-watcher';
	import DarkModeToggle from '$lib/components/custom/DarkModeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import type { Snippet } from 'svelte';
	import { LogIn, LogOut } from '@lucide/svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode="dark" />
<Toaster position="bottom-center" richColors />
<header class="flex items-center justify-between border-b p-4">
	<a href={resolve('/')} class="text-lg font-bold">Community Voting</a>
	<div class="flex items-center gap-4">
		<nav>
			{#each data.navigation as item (item.href)}
				<Button variant="ghost" href={item.href} class="mr-4 last:mr-0">{item.label}</Button>
			{/each}
		</nav>

		{#if data?.user}
			<form
				action="/auth?/logout"
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'redirect') {
							console.log('Signed out');
							toast.success('Signed out successfully!');
						}
					};
				}}
			>
				<Button type="submit" variant="ghost"><LogOut /></Button>
			</form>
		{:else}
			<Button variant="ghost" href="/auth"><LogIn /></Button>
		{/if}

		<DarkModeToggle />
	</div>
</header>
<main class="mx-auto my-2 min-h-screen w-full max-w-5xl rounded-md px-4 py-4 sm:px-6 md:px-8">
	{@render children?.()}
</main>

<style>
	/* :global(body) {
		background-color: oklch(68.5% 0.169 237.323);
	} */
</style>
