<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { CircleChevronLeft } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	let { children, data } = $props();

	const isAdmin = $derived(data.userRole === 'admin');
	const base = $derived(`/community/${data.community.id}/admin`);

	const navItems = $derived([
		{ href: base, label: 'Overview', exact: true },
		{ href: `${base}/users`, label: 'Users', exact: false },
		{ href: `${base}/sessions`, label: 'Sessions', exact: false },
		{ href: `${base}/collection`, label: 'Collection', exact: false },
		...(isAdmin ? [{ href: `${base}/settings`, label: 'Settings', exact: false }] : [])
	]);

	function isActive(href: string, exact: boolean) {
		return exact ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	const currentIndex = $derived(
		navItems.findIndex((item) =>
			item.exact ? page.url.pathname === item.href : page.url.pathname.startsWith(item.href)
		)
	);

	let prevIndex = $state(-1);
	let flyX = $state(0);

	$effect.pre(() => {
		const curr = currentIndex;
		if (prevIndex !== -1 && curr !== prevIndex) {
			flyX = curr > prevIndex ? 16 : -16;
		}
		prevIndex = curr;
	});
</script>

<svelte:head>
	<title>Admin — {data.community.title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mb-4">
	<Button
		variant="ghost"
		size="sm"
		href="/community/{data.community.id}"
		class="mb-1 -ml-2 text-muted-foreground"
	>
		<CircleChevronLeft />Back
	</Button>
	<h1 class="text-xl font-semibold sm:text-2xl">
		{data.community.title} — Admin
	</h1>
</div>

<nav aria-label="Admin dashboard navigation" class="mb-6 border-b">
	<ul class="flex overflow-x-auto">
		{#each navItems as item (item.href)}
			<li>
				<Button
					variant="ghost"
					href={item.href}
					class="rounded-none border-b-2 px-4 {isActive(item.href, item.exact)
						? 'border-primary text-foreground'
						: 'border-transparent text-muted-foreground'}"
				>
					{item.label}
				</Button>
			</li>
		{/each}
	</ul>
</nav>

<div class="grid overflow-hidden">
	{#key page.url.pathname}
		<div
			class="col-start-1 row-start-1 w-full"
			in:fly={{ x: flyX, duration: 180 }}
			out:fly={{ x: -flyX, duration: 180 }}
		>
			{@render children()}
		</div>
	{/key}
</div>
