<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Checkbox from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { CircleChevronLeft } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();
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

<svelte:head>
	<title>Notification Preferences — Community Voting</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-0">
	<div>
		<Button
			href="/community/{data.communityId}"
			variant="ghost"
			class="mb-2 -ml-2 text-muted-foreground"
		>
			<CircleChevronLeft />Back
		</Button>
		<h1 class="text-2xl font-semibold tracking-tight">Notification Preferences</h1>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Voting Notifications</Card.Title>
			<Card.Description>
				Manage how and when you receive community-related notifications from the app.
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
