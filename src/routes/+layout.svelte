<script lang="ts">
	import '../app.css';
	import type { LayoutProps } from './$types';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index';
	import { ModeWatcher } from 'mode-watcher';
	import DarkModeToggle from '$lib/components/custom/DarkModeToggle.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet/index';
	import { resolve } from '$app/paths';
	import { signOut } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';
	import { LogIn, LogOut, Menu, TestTubeDiagonal } from '@lucide/svelte';
	import GithubIcon from '$lib/components/custom/GithubIcon.svelte';
	import DiscordIcon from '$lib/components/custom/DiscordIcon.svelte';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import GlobalNotice from '$lib/components/custom/GlobalNotice.svelte';
	import { beforeNavigate } from '$app/navigation';
	import { updated } from '$app/state';
	import * as Sentry from '@sentry/sveltekit';
	import PushSubscribeButton from '$lib/components/custom/PushSubscribeButton.svelte';

	injectSpeedInsights();
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children, data }: LayoutProps = $props();

	$effect(() => {
		if (data.user) {
			Sentry.setUser({ id: data.user.id, email: data.user.email, name: data.user.name });
		} else {
			Sentry.setUser(null);
		}

		if ('serviceWorker' in navigator) {
			(async () => {
				await navigator.serviceWorker.register('/sw.js');
			})();
		}
	});

	let mobileMenuOpen = $state(false);

	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});

	$effect(() => {
		if (updated.current) {
			toast('A new version is available.', {
				action: { label: 'Reload', onClick: () => location.reload() },
				duration: Infinity
			});
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Community Voting</title>
	<meta property="og:site_name" content="Community Voting" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<ModeWatcher defaultMode="dark" />
<Toaster position="bottom-center" richColors />
<header class="flex items-center justify-between border-b p-4">
	<div>
		<a href={resolve('/')} class="text-lg font-bold">Community Voting</a>
		<Badge class="bg-green-600 dark:bg-green-800"><TestTubeDiagonal />Beta</Badge>
	</div>

	<!-- Desktop nav -->
	<div class="hidden items-center gap-4 sm:flex">
		<nav>
			{#each data.navigation as item (item.href)}
				<Button variant="ghost" href={item.href} class="mr-4 last:mr-0">{item.label}</Button>
			{/each}
		</nav>

		{#if data?.user}
			<PushSubscribeButton />
			<Button
				variant="ghost"
				onclick={async () => {
					await signOut();
					toast.success('Signed out successfully!');
					setTimeout(() => (window.location.href = '/auth'), 500);
				}}
			>
				<LogOut />
			</Button>
		{:else}
			<Button variant="ghost" href="/auth" data-sveltekit-preload-data="tap"><LogIn /></Button>
		{/if}

		<Button
			variant="ghost"
			size="icon"
			href="https://github.com/digidevguy/community-voting"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="GitHub Repository"
		>
			<GithubIcon />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			href="https://discord.gg/Gr4ZwVKdjy"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Discord Server"
		>
			<DiscordIcon />
		</Button>

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
						<Badge class="bg-green-600 dark:bg-green-800"><TestTubeDiagonal />Beta</Badge>
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
					<Button
						variant="ghost"
						href="https://github.com/digidevguy/community-voting"
						target="_blank"
						rel="noopener noreferrer"
						class="w-full justify-start"
						onclick={() => (mobileMenuOpen = false)}
					>
						<GithubIcon /> GitHub
					</Button>
					<Button
						variant="ghost"
						href="https://discord.gg/Gr4ZwVKdjy"
						target="_blank"
						rel="noopener noreferrer"
						class="w-full justify-start"
						onclick={() => (mobileMenuOpen = false)}
					>
						<DiscordIcon /> Discord
					</Button>
					<div class="my-1 border-t"></div>
					{#if data?.user}
						<Button
							variant="ghost"
							class="w-full justify-start"
							onclick={async () => {
								await signOut();
								toast.success('Signed out successfully!');
								setTimeout(() => (window.location.href = '/auth'), 500);
							}}
						>
							<LogOut />Sign out
						</Button>
					{:else}
						<Button
							variant="ghost"
							href="/auth"
							data-sveltekit-preload-data="tap"
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
{#if data.banner?.enabled}
	<GlobalNotice
		message={data.banner.message}
		type={data.banner.type}
		link={data.banner.link}
		storageKey={data.banner.storageKey}
	/>
{/if}
<main class="mx-auto my-2 min-h-screen w-full max-w-5xl rounded-md px-4 py-4 sm:px-6 md:px-8">
	{@render children?.()}
</main>

<footer class="border-t px-4 py-4">
	<div
		class="mx-auto flex max-w-5xl items-center justify-center gap-6 text-sm text-muted-foreground"
	>
		<a
			href="https://github.com/digidevguy/community-voting"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-1.5 transition-colors hover:text-foreground"
			aria-label="View project on GitHub"
		>
			<GithubIcon class="h-4 w-4" />
			<span>GitHub</span>
		</a>
		<a
			href="https://discord.gg/Gr4ZwVKdjy"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-1.5 transition-colors hover:text-foreground"
			aria-label="Join our Discord server"
		>
			<DiscordIcon class="h-4 w-4" />
			<span>Discord</span>
		</a>
	</div>
</footer>

<style>
	/* :global(body) {
		background-color: oklch(68.5% 0.169 237.323);
	} */
</style>
