<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Checkbox from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CircleChevronLeft, Bell, ChevronLeft, ChevronRight, Settings2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import { cn, formatDate } from '$lib/utils';
	import { fly } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	// ── Tab state
	type Tab = 'activity' | 'preferences';
	let activeTab = $state<Tab>('activity');

	// ── Preferences state
	type PrefKey = 'notifyVoteStarted' | 'notifyVoteEnded' | 'notifyVoteReminder';
	let formRefs = $state<Partial<Record<PrefKey, HTMLFormElement>>>({});
	let overrides = $state<Partial<NonNullable<PageData['communityNotificationPreferences']>>>({});

	const prefs = $derived(
		data.communityNotificationPreferences || {
			notifyVoteStarted: false,
			notifyVoteEnded: false,
			notifyVoteReminder: false
		}
	);

	const notifyVoteStarted = $derived(overrides.notifyVoteStarted ?? prefs.notifyVoteStarted);
	const notifyVoteEnded = $derived(overrides.notifyVoteEnded ?? prefs.notifyVoteEnded);
	const notifyVoteReminder = $derived(overrides.notifyVoteReminder ?? prefs.notifyVoteReminder);

	// ── Activity feed state
	const LIMIT = 20;
	const readOverrides = new SvelteMap<string, boolean>();
	let markingAllRead = $state(false);

	const localNotifications = $derived(
		data.notifications.map((n) => ({
			...n,
			isRead: readOverrides.has(n.id) ? readOverrides.get(n.id)! : n.isRead
		}))
	);

	const totalPages = $derived(Math.ceil(data.total / LIMIT));
	const hasUnread = $derived(localNotifications.some((n) => !n.isRead));

	function pageUrl(p: number) {
		return (
			resolve(`/community/${data.communityId}/notifications`) + `?filter=${data.filter}&page=${p}`
		);
	}

	async function markAsRead(id: string) {
		readOverrides.set(id, true);
		try {
			const res = await fetch('/api/notifications/read', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) throw new Error();
		} catch {
			readOverrides.set(id, false);
		}
	}

	async function openNotification(n: (typeof localNotifications)[0]) {
		if (!n.isRead) await markAsRead(n.id);
		await goto(resolve(`/voting/${n.relatedEntityId}`));
	}

	async function handleNoEntityClick(n: (typeof localNotifications)[0]) {
		if (!n.isRead) {
			await markAsRead(n.id);
			await invalidateAll();
		}
	}

	async function markAllRead() {
		const ids = localNotifications.filter((n) => !n.isRead).map((n) => n.id);
		for (const id of ids) readOverrides.set(id, true);
		markingAllRead = true;
		try {
			const res = await fetch('/api/notifications/read', { method: 'PATCH' });
			if (!res.ok) throw new Error();
			await invalidateAll();
			toast.success('All notifications marked as read');
		} catch {
			for (const id of ids) readOverrides.delete(id);
			toast.error('Failed to mark notifications as read');
		} finally {
			markingAllRead = false;
		}
	}

	// ── Tab pill styling
	const tabClass = (active: boolean) =>
		cn(
			'inline-flex items-center gap-1 h-7 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]',
			active
				? 'bg-background text-foreground shadow-sm'
				: 'text-muted-foreground hover:text-foreground'
		);
</script>

{#snippet notificationToggle(
	preferenceKey: 'notifyVoteStarted' | 'notifyVoteEnded' | 'notifyVoteReminder',
	currentValue: boolean,
	label: string,
	description: string
)}
	<form
		bind:this={formRefs[preferenceKey]}
		action="?/togglePreference"
		method="POST"
		use:enhance={({ formData }) => {
			const next = !currentValue;
			formData.set('value', String(next));
			overrides[preferenceKey] = next;
			return async ({ result, update }) => {
				if (result.type === 'failure') {
					overrides[preferenceKey] = undefined;
					toast.error('Failed to update preference');
				} else {
					await update({ reset: false });
					overrides[preferenceKey] = undefined;
				}
			};
		}}
		class="flex flex-col gap-1 py-4 first:pt-0 last:pb-0"
	>
		<input type="hidden" name="preference" value={preferenceKey} />
		<div class="flex items-center gap-3">
			<Label for={preferenceKey} class="cursor-pointer leading-none font-medium">{label}</Label>
			<Checkbox.Root
				id={preferenceKey}
				checked={currentValue}
				onCheckedChange={() => formRefs[preferenceKey]?.requestSubmit()}
				class="shrink-0"
			/>
		</div>
		<p class="text-sm text-muted-foreground">{description}</p>
	</form>
{/snippet}

{#snippet notificationCard(n: (typeof localNotifications)[0])}
	<div
		class={cn(
			'rounded-lg border px-3.5 py-3 text-left transition-colors',
			n.isRead
				? 'border-border bg-card hover:bg-muted/40'
				: 'border-l-2 border-border border-l-primary bg-primary/[0.04] hover:bg-primary/[0.07]'
		)}
	>
		<div class="flex items-start gap-2">
			<div class="min-w-0 flex-1 space-y-0.5">
				<p
					class={cn(
						'truncate text-sm leading-snug',
						n.isRead ? 'text-muted-foreground' : 'font-medium'
					)}
				>
					{n.title}
				</p>
				<p class="line-clamp-2 text-sm leading-snug text-muted-foreground">{n.message}</p>
			</div>
			{#if !n.isRead}
				<span class="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread"></span>
			{/if}
		</div>
		<time class="mt-2 block text-xs text-muted-foreground/60" datetime={n.createdAt.toISOString()}>
			{formatDate(n.createdAt)}
		</time>
	</div>
{/snippet}

<svelte:head>
	<title>Notifications — Community Voting</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-0">
	<!-- Page header -->
	<div>
		<Button
			href="/community/{data.communityId}"
			variant="ghost"
			class="mb-2 -ml-2 text-muted-foreground"
		>
			<CircleChevronLeft />Back
		</Button>
		<h1 class="text-2xl font-semibold tracking-tight">Notifications</h1>
	</div>

	<!-- Tab bar -->
	<div class="inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground">
		<button class={tabClass(activeTab === 'activity')} onclick={() => (activeTab = 'activity')}>
			Activity
			{#if data.filter === 'unread' && data.total > 0 && activeTab !== 'activity'}
				<Badge class="ml-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
					{data.total}
				</Badge>
			{/if}
		</button>
		<button
			class={tabClass(activeTab === 'preferences')}
			onclick={() => (activeTab = 'preferences')}
		>
			<Settings2 class="h-3.5 w-3.5" />Preferences
		</button>
	</div>

	<!-- ── Activity tab ──────────────────────────────────────────────────── -->
	{#if activeTab === 'activity'}
		<div transition:fly={{ x: -16, duration: 180 }}>
			<!-- Filter + mark-all toolbar -->
			<div class="mb-4 flex items-center justify-between gap-4">
				<div class="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
					<Button
						href={resolve(`/community/${data.communityId}/notifications?filter=unread&page=1`)}
						variant="ghost"
						size="sm"
						class={tabClass(data.filter === 'unread')}
					>
						Unread
						{#if data.filter === 'unread' && data.total > 0}
							<Badge class="ml-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
								{data.total}
							</Badge>
						{/if}
					</Button>
					<Button
						href={resolve(`/community/${data.communityId}/notifications?filter=all&page=1`)}
						variant="ghost"
						size="sm"
						class={tabClass(data.filter === 'all')}
					>
						All
					</Button>
				</div>

				{#if data.filter === 'unread' && hasUnread}
					<Button variant="ghost" size="sm" onclick={markAllRead} disabled={markingAllRead}>
						Mark all as read
					</Button>
				{/if}
			</div>

			<!-- Notification list -->
			{#if localNotifications.length === 0}
				{#if data.filter === 'unread'}
					<div class="py-12 text-center">
						<Bell class="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
						<p class="text-sm text-muted-foreground">All caught up in this community!</p>
						<Button
							href={resolve(`/community/${data.communityId}/notifications?filter=all`)}
							variant="link"
							class="mt-1 h-auto p-0 text-sm"
						>
							View all activity
						</Button>
					</div>
				{:else}
					<div class="py-12 text-center">
						<Bell class="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
						<p class="text-sm text-muted-foreground">No community notifications yet.</p>
					</div>
				{/if}
			{:else}
				<ul class="flex flex-col gap-2">
					{#each localNotifications as n (n.id)}
						<li>
							{#if n.relatedEntityId}
								<button
									class="w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									onclick={() => openNotification(n)}
								>
									{@render notificationCard(n)}
								</button>
							{:else}
								<button
									class="w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									onclick={() => handleNoEntityClick(n)}
								>
									{@render notificationCard(n)}
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="mt-6 flex items-center justify-center gap-3">
					<Button
						href={pageUrl(data.page - 1)}
						variant="outline"
						size="sm"
						disabled={data.page <= 1}
						aria-label="Previous page"
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<span class="text-sm text-muted-foreground">Page {data.page} of {totalPages}</span>
					<Button
						href={pageUrl(data.page + 1)}
						variant="outline"
						size="sm"
						disabled={data.page >= totalPages}
						aria-label="Next page"
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			{/if}
		</div>

		<!-- ── Preferences tab ───────────────────────────────────────────────── -->
	{:else}
		<div transition:fly={{ x: 16, duration: 180 }}>
			<Card.Root>
				<Card.Header>
					<Card.Title>Voting Notifications</Card.Title>
					<Card.Description>
						Manage how and when you receive notifications from this community.
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col divide-y">
					{@render notificationToggle(
						'notifyVoteStarted',
						notifyVoteStarted,
						'Vote started',
						'Notified when a new voting session opens.'
					)}
					{@render notificationToggle(
						'notifyVoteEnded',
						notifyVoteEnded,
						'Vote ended',
						'Notified when a voting session closes.'
					)}
					{@render notificationToggle(
						'notifyVoteReminder',
						notifyVoteReminder,
						'Vote reminder',
						'Reminded to vote before a session closes.'
					)}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
