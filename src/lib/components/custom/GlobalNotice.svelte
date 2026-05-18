<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Info, TriangleAlert, OctagonX } from '@lucide/svelte';

	type NoticeType = 'info' | 'warning' | 'caution';

	let {
		message,
		type = 'warning',
		link,
		storageKey = 'global-notice-dismissed'
	}: {
		message: string;
		type?: NoticeType;
		link?: { href: string; label: string };
		storageKey?: string;
	} = $props();

	let visible = $state(false);

	// Full-width strip styles per type — intentionally outside the max-w constraint
	const stripStyleMap: Record<NoticeType, string> = {
		info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-100',
		warning:
			'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-100',
		caution:
			'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-100'
	};

	// Separate link color per type so it stays readable on the tinted background
	const linkStyleMap: Record<NoticeType, string> = {
		info: 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100',
		warning: 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100',
		caution: 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100'
	};

	onMount(() => {
		if (localStorage.getItem(storageKey) !== 'true') {
			visible = true;
		}
	});

	function dismiss() {
		visible = false;
		localStorage.setItem(storageKey, 'true');
	}
</script>

{#if visible}
	<!--
		Full-width strip that sits between the site header and page content.
		Uses items-start so the icon and dismiss button stay anchored at the top
		when the message wraps to multiple lines on narrow viewports.
	-->
	<div
		role="status"
		aria-live="polite"
		aria-label="Site notice"
		class="flex items-start gap-3 border-b px-4 py-2.5 text-sm sm:items-center {stripStyleMap[
			type
		]}"
	>
		<!-- Icon: top-aligned on mobile (mt-0.5), vertically centred on sm+ -->
		{#if type === 'info'}
			<Info class="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
		{:else if type === 'warning'}
			<TriangleAlert class="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
		{:else}
			<OctagonX class="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
		{/if}

		<!-- Message text — wraps naturally; link sits inline after the message -->
		<p class="min-w-0 flex-1 leading-snug">
			{message}
			{#if link}
				<a
					href={link.href}
					class="ml-1 font-medium whitespace-nowrap underline underline-offset-2 transition-colors hover:no-underline {linkStyleMap[
						type
					]}"
				>
					{link.label} →
				</a>
			{/if}
		</p>

		<!-- Dismiss — top-aligned on mobile, centred on sm+ -->
		<button
			onclick={dismiss}
			aria-label="Dismiss notice"
			class="mt-0.5 shrink-0 rounded p-0.5 opacity-60 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current/50 sm:mt-0"
		>
			<X class="size-4" />
		</button>
	</div>
{/if}
