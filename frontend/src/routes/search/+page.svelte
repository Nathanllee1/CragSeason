<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import SvelteMarkdown from "svelte-markdown";
  import Suggestions from "./suggestions.svelte";
  import Header from "./header.svelte";
  import Followup from "./followup.svelte";
  import {
    AnswerHandler,
    AnswerHandlerStore,
    createAnswerHandler,
    type answerStore,
  } from "./answerMaker";
  import { get, type Writable } from "svelte/store";
  import Answer from "./answer.svelte";
  import type { AgentInputItem } from "@openai/agents";
  import { historyStore, loadingStore } from "./history";

  export let initialQuery = "";

  let askScreen = true;

  async function askQuestion(question = "") {
    loadingStore.set(true)
    askScreen = false;
    let history: AgentInputItem[];
    historyStore.subscribe((h) => (history = h))(); // one-shot read

    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }, 100);

    // call the helper that handles SSE
    const newHistory = await AnswerHandlerStore.ask(question, history);
    historyStore.set(newHistory); // replace with the authoritative copy
    loadingStore.set(false)
  }

  async function newQuestion() {
    AnswerHandlerStore.reset();
    askScreen = true;
  }
</script>

<div class="h-full flex flex-col items-center justify-center pt-24">
  {#if askScreen}
    <div class="w-full max-w-screen-sm px-4">
      {#if !$loadingStore}
        <Header />
        <div class="text-xs mb-4">
          Powered by Generative AI using data sourced from Mountain Project.
          Take results with a grain of salt :p
        </div>
        <!-- 2) let the input stretch, keep the button auto-sized -->
        <form on:submit|preventDefault={() => askQuestion(initialQuery)}>
          <div class="flex gap-2">
            <input
              class="input flex-1 w-full"
              bind:value={initialQuery}
              placeholder="Ask for a guide…"
            />
            <button type="submit" class="btn btn-primary" disabled={$loadingStore}>
              {$loadingStore ? "Thinking…" : "Get guide"}
            </button>
          </div>
        </form>

        <Suggestions askInitialQuestion={askQuestion} />
      {/if}
    </div>
  {:else}
    {#each $AnswerHandlerStore as answer}
      <div class="text-2xl font-semibold">{answer.question}</div>
      <pre
        class="bg-zinc-900 text-green-400 p-4 rounded-lg overflow-y-auto max-h-60 mt-4 mb-4 max-w-screen-sm">
        {#each answer.toolCalls as line}
          <div>{line.name} - {line.args}</div>
        {/each}
      </pre>
      <!-- Live markdown answer -->
      {#if answer}
        <Answer answer={answer.text} />
      {/if}
    {/each}
    <Followup {newQuestion} {askQuestion} />
  {/if}
</div>
