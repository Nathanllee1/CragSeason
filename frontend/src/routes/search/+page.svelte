<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import SvelteMarkdown from "svelte-markdown";
  import Suggestions from "./suggestions.svelte";
  import Header from "./header.svelte";
  import Answer from "./answer.svelte";
    import Followup from "./followup.svelte";

  export let query = "";

  /** live state */
  let answer = "";
  let log: string[] = [];
  let loading = false;
  let es: EventSource | null = null;

  let askScreen = true;

  async function fetchGuide(passedInAnswer: string | undefined) {
    // reset UI
    answer = "";
    log = [];
    loading = true;

    /* Close any previous stream */
    es?.close();

    let submittedQuery = passedInAnswer ?? query;
    console.log(submittedQuery)

    const qs = new URLSearchParams({ prompt: submittedQuery }).toString();
    es = new EventSource(`/api/guide?${qs}`);

    /* 1️⃣  tool-call chatter */
    es.addEventListener("tool_call", (e) => {
      const { name, args } = JSON.parse((e as MessageEvent).data);
      log = [...log, `🔧 ${name}`];
    });

    /* 2️⃣  incremental answer tokens  (event: delta) */
    es.addEventListener("delta", (e) => {
      askScreen = false;
      answer += JSON.parse((e as MessageEvent).data); // each chunk is raw markdown text
    });

    /* 3️⃣  final cleanup */
    es.addEventListener("final", () => {
      console.log(answer);
      loading = false;
      es?.close();
      es = null;
    });

    es.onerror = () => {
      loading = false;
      es?.close();
      es = null;
    };
  }

  async function newQuestion() {
    answer = "";
    log = [];
    loading = false;
    askScreen = true;
  }

  /* optional: auto-fetch once component mounts */
  onDestroy(() => es?.close());
</script>

<div class="h-full flex flex-col items-center justify-center pt-24">
  {#if askScreen}
    <!-- 1) limit overall width to md breakpoint -->
    <div class="w-full max-w-screen-sm px-4">
      {#if !loading}
        <Header />
        <div class="text-xs mb-4">
          Powered by Generative AI using data sourced from Mountain Project.
          Take results with a grain of salt :p
        </div>
        <!-- 2) let the input stretch, keep the button auto-sized -->
        <form on:submit|preventDefault={() => fetchGuide(undefined)}>
          <div class="flex gap-2">
            <input
              class="input flex-1 w-full"
              bind:value={query}
              placeholder="Ask for a guide…"
            />
            <button type="submit" class="btn btn-primary" disabled={loading}>
              {loading ? "Thinking…" : "Get guide"}
            </button>
          </div>
        </form>

        <Suggestions {fetchGuide} />
      {:else}
        <div>
          Generating your report <span
            class="loading loading-spinner loading-sm"
          ></span>
        </div>

        <pre
          class="bg-zinc-900 text-green-400 p-4 rounded-lg overflow-y-auto max-h-60 mt-4">
        {#each log as line}
            <div>{line}</div>
          {/each}
      </pre>
      {/if}
    </div>
  {:else}
    <!-- Live markdown answer -->
    {#if answer}
      <Answer {answer} />

      <Followup {newQuestion} />
    {/if}
  {/if}
</div>
