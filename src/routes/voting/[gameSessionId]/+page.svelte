<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section>{JSON.stringify(data, null, 2)}</section>
