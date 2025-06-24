<script lang="ts">
	import SvelteMarkdown from 'svelte-markdown';

	export let answer = '';
	let followup = '';

	let scroller: HTMLDivElement;
</script>

<!-- ▸ The markdown area owns the scrollbar ◂ -->
<div class="flex-1 min-h-0 relative overflow-hidden">
	<!-- SCROLLER -->
	<div
		bind:this={scroller}
		class="h-full overflow-y-auto px-4 pb-28" 
	>
		<article
			class="prose lg:prose-lg max-w-screen-md mx-auto break-words"
		>
			<SvelteMarkdown source={answer} />
		</article>
	</div>

</div>
