<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Separator from '$lib/components/ui/separator/index';
	import { cn } from '$lib/utils';

	let { children }: { children: Snippet } = $props();

	const navItems = [
		{ path: '/docs', label: 'Overview' },
		{ path: '/docs/updates', label: 'Recent Updates' },
		{ path: '/docs/getting-started', label: 'Getting Started' },
		{ path: '/docs/communities', label: 'Communities' },
		{ path: '/docs/voting', label: 'Voting' },
		{ path: '/docs/collections', label: 'Collections' },
		{ path: '/docs/admin', label: 'Admin Guide' }
	] as const;
</script>

<!-- Mobile nav strip -->
<div class="border-b sm:hidden">
	<nav class="flex gap-1 overflow-x-auto px-4 py-2">
		{#each navItems as item (item.path)}
			<a
				href={resolve(item.path)}
				class={cn(
					buttonVariants({ variant: 'ghost', size: 'sm' }),
					'shrink-0',
					page.url.pathname === resolve(item.path) && 'bg-accent font-medium text-accent-foreground'
				)}
			>
				{item.label}
			</a>
		{/each}
	</nav>
</div>

<div class="container mx-auto flex max-w-6xl gap-10 px-4 py-8">
	<!-- Desktop sidebar -->
	<aside class="hidden w-52 shrink-0 sm:block">
		<div class="sticky top-20 flex flex-col gap-1">
			<p class="mb-2 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Documentation
			</p>
			<Separator.Root class="mb-2" />
			{#each navItems as item (item.path)}
				<a
					href={resolve(item.path)}
					class={cn(
						buttonVariants({ variant: 'ghost' }),
						'justify-start',
						page.url.pathname === resolve(item.path) &&
							'bg-accent font-medium text-accent-foreground'
					)}
				>
					{item.label}
				</a>
			{/each}
		</div>
	</aside>

	<!-- Content -->
	<main class="prose max-w-3xl min-w-0 flex-1 pb-16 prose-neutral dark:prose-invert">
		{@render children()}
	</main>
</div>
