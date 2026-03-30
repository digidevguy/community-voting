<script lang="ts">
	import '../app.css';
	import type { LayoutProps } from './$types';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index';
	import { ModeWatcher } from 'mode-watcher';
	import DarkModeToggle from '$lib/components/custom/DarkModeToggle.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet/index';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { LogIn, LogOut, Menu } from '@lucide/svelte';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children, data }: LayoutProps = $props();

	let mobileMenuOpen = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode="dark" />
<Toaster position="bottom-center" richColors />
<header class="flex items-center justify-between border-b p-4">
	<a href={resolve('/')} class="text-lg font-bold">Community Voting</a>

	<!-- Desktop nav -->
	<div class="hidden items-center gap-4 sm:flex">
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

	<!-- Mobile controls -->
	<div class="flex items-center gap-2 sm:hidden">
		<DarkModeToggle />

		<Sheet.Root bind:open={mobileMenuOpen}>
			<Sheet.Trigger
				class={buttonVariants({ variant: 'ghost', size: 'icon' })}
				aria-label="Open menu"
			>
				<Menu />
			</Sheet.Trigger>
			<Sheet.Content side="right" class="w-72 p-0">
				<Sheet.Header class="border-b px-6 py-4">
					<Sheet.Title>
						<a
							href={resolve('/')}
							onclick={() => (mobileMenuOpen = false)}
							class="text-lg font-bold"
						>
							Community Voting
						</a>
					</Sheet.Title>
				</Sheet.Header>

				<nav class="flex flex-col gap-1 px-4 py-4">
					{#each data.navigation as item (item.href)}
						<Button
							variant="ghost"
							href={item.href}
							class="justify-start"
							onclick={() => (mobileMenuOpen = false)}
						>
							{item.label}
						</Button>
					{/each}
				</nav>

				<Sheet.Footer class="border-t px-4 py-4">
					{#if data?.user}
						<form
							action="/auth?/logout"
							method="POST"
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									if (result.type === 'redirect') {
										mobileMenuOpen = false;
										toast.success('Signed out successfully!');
									}
								};
							}}
						>
							<Button type="submit" variant="ghost" class="w-full justify-start">
								<LogOut />Sign out
							</Button>
						</form>
					{:else}
						<Button
							variant="ghost"
							href="/auth"
							class="w-full justify-start"
							onclick={() => (mobileMenuOpen = false)}
						>
							<LogIn />Sign in
						</Button>
					{/if}
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
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
