<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { buttonVariants } from '$lib/components/ui/button';
	import { CalendarPlus } from '@lucide/svelte';

	let {
		title,
		description = null,
		startDate,
		durationMinutes = 60
	}: {
		title: string;
		description?: string | null;
		startDate: Date;
		durationMinutes?: number;
	} = $props();

	function toGoogleDate(d: Date): string {
		return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
	}

	function toICSDate(d: Date): string {
		return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
	}

	function escapeICS(str: string): string {
		return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
	}

	const endDate = $derived(new Date(startDate.getTime() + durationMinutes * 60 * 1000));

	const googleUrl = $derived.by(() => {
		const params = new URLSearchParams({
			action: 'TEMPLATE',
			text: title,
			dates: `${toGoogleDate(startDate)}/${toGoogleDate(endDate)}`,
			...(description ? { details: description } : {})
		});
		return `https://calendar.google.com/calendar/render?${params.toString()}`;
	});

	const outlookUrl = $derived.by(() => {
		const params = new URLSearchParams({
			path: '/calendar/action/compose',
			rru: 'addevent',
			subject: title,
			startdt: startDate.toISOString(),
			enddt: endDate.toISOString(),
			...(description ? { body: description } : {})
		});
		return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
	});

	function downloadICS() {
		const lines = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Community Voting//EN',
			'CALSCALE:GREGORIAN',
			'METHOD:PUBLISH',
			'BEGIN:VEVENT',
			`DTSTART:${toICSDate(startDate)}`,
			`DTEND:${toICSDate(endDate)}`,
			`SUMMARY:${escapeICS(title)}`,
			...(description ? [`DESCRIPTION:${escapeICS(description)}`] : []),
			`DTSTAMP:${toICSDate(new Date())}`,
			`UID:${crypto.randomUUID()}@community-voting`,
			'END:VEVENT',
			'END:VCALENDAR'
		];

		const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
		<CalendarPlus class="h-4 w-4" />
		Add to calendar
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" class="min-w-48">
		<DropdownMenu.Item onclick={() => window.open(googleUrl, '_blank', 'noopener,noreferrer')}>
			Google Calendar
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => window.open(outlookUrl, '_blank', 'noopener,noreferrer')}>
			Outlook.com
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={downloadICS} class="flex-col items-start">
			<span>Download .ics</span>
			<span class="text-xs text-muted-foreground">Apple · Outlook Desktop</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
