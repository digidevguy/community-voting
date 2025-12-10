<script lang="ts">
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input/index.js';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { PageProps } from './$types';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	let { data, form }: PageProps = $props();

	let selectValue: 'videoGame' | 'boardGame' | 'mixed' | undefined = $state(undefined);
	$inspect(selectValue);
</script>

<section>
	<h1 class="text-3xl font-semibold">Create a voting session</h1>
	<form action="?/create" method="POST" use:enhance>
		<div>
			<Label for="title">Event title</Label>
			<Input id="title" name="title" />
		</div>
		<div>
			<Label for="description">Description</Label>
			<Textarea id="description" name="description" placeholder="Add your description here." />
		</div>
		<div>
			<Label for="type">Game Type</Label>
			<Select.Root type="single" bind:value={selectValue} name="type">
				<Select.Trigger>Select a game type</Select.Trigger>
				<Select.Content>
					<Select.Item value="videoGame">Video Games</Select.Item>
					<Select.Item value="boardGame">Board Games</Select.Item>
					<Select.Item value="mixed">Mixed</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
		<!-- Obtain voting start date here -->
		<!-- Game day date here -->
		<Separator />
		<!-- Area to handle added games -->
	</form>
</section>
