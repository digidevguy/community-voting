<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { CircleChevronLeft } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const session = data.sessionDetails.session;
	const options = data.sessionDetails.options;
	const votingSessionId = data.sessionDetails.session.id;
</script>

<h1>Update a Voting Session</h1>

<Button href="/voting/{votingSessionId}" variant="outline"
	><CircleChevronLeft></CircleChevronLeft>Back</Button
>
<Separator class="my-4" />
