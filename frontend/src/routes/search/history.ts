import type { AgentInputItem } from '@openai/agents';
import { writable } from 'svelte/store';

/** The full, growing conversation history */
export const historyStore = writable<AgentInputItem[]>([]);

export const loadingStore = writable<boolean>(false);