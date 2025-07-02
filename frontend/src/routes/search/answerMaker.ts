import { writable, type Invalidator, type Subscriber, type Unsubscriber, type Writable } from "svelte/store";
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { AgentInputItem } from "@openai/agents";

export type AnswerState = {
    text: string,
    loading: boolean,
    toolCalls: {
        name: string,
        args: string
    }[],
    question: string
}

export type answerStore = {
    subscribe: (this: void, run: Subscriber<AnswerState[]>, invalidate?: Invalidator<AnswerState[]> | undefined) => Unsubscriber,
    ask: (question: string, context: AgentInputItem[]) => Promise<AgentInputItem[]>,
    reset: () => void
}

export function createAnswerHandler(): answerStore {

    const emptyState = {
        loading: false,
        text: "",
        toolCalls: [],
        question: ""
    }

    const { subscribe, update, set } = writable<AnswerState[]>([])

    function patchAnswer(
        index: number,
        updater: (prev: AnswerState) => AnswerState
    ) {
        update(list => {
            const next = [...list];
            next[index] = updater(next[index]);
            return next;
        });
    }

    function addEmptyAnswer(initial: Partial<AnswerState> = {}): number {
        let newIndex: number;
        update(list => {
            newIndex = list.length;
            return [...list, { ...emptyState, ...initial }];
        });
        // @ts-ignore – newIndex is definitely set inside the callback
        return newIndex!;
    }

    return {
        subscribe,
        reset: () => {
            set([])
        },
        ask: (question: string, context: AgentInputItem[]): Promise<AgentInputItem[]> => {
            const index = addEmptyAnswer({ loading: true, question });

            patchAnswer(index, (curr) => ({
                ...curr,
                question,
                loading: true,
            }))

            const { promise, resolve, reject } = Promise.withResolvers<AgentInputItem[]>()

            const stream = fetchEventSource('/api/guide', {
                method: "POST",
                body: JSON.stringify({
                    question,
                    context
                }),
                onmessage: (ev) => {
                    switch (ev.event) {
                        case "tool_call":
                            const { name, args } = JSON.parse(ev.data)

                            patchAnswer(index, (curr) => ({
                                ...curr,
                                toolCalls: [...curr.toolCalls, { name, args }]
                            }))

                            break;

                        case "delta":
                            const chunk = JSON.parse(ev.data)
                            patchAnswer(index, (curr) => ({
                                ...curr,
                                text: curr.text + chunk
                            }))

                            break;

                        case "final":
                            const updated: AgentInputItem[] = JSON.parse(ev.data);
                            patchAnswer(index, (curr) => ({
                                ...curr,
                                loading: false
                            }))
                            resolve(updated);

                            break;
                    }

                }
            })

            return promise;
        }
    }

}

export class AnswerHandler {

    toolCalls: Writable<{
        name: string,
        args: string
    }[]>

    text: Writable<string>
    loading: Writable<boolean> = writable(false);
    question: string = ""

    constructor() {
        this.toolCalls = writable([])
        this.text = writable("")
    }

    ask(question: string, context: string) {
        this.loading.set(true)

        this.question = question;

        const { promise, resolve, reject } = Promise.withResolvers()

        const stream = fetchEventSource('/api/guide', {
            method: "POST",
            body: JSON.stringify({
                question,
                context
            }),
            onmessage: (ev) => {
                switch (ev.event) {
                    case "tool_call":
                        const { name, args } = JSON.parse(ev.data)
                        this.toolCalls.update(calls => [...calls, { name, args }])

                        break;

                    case "delta":
                        const chunk = JSON.parse(ev.data) as string;
                        this.text.update(text => text + chunk)
                        console.log(ev.data)

                        break;

                    case "final":
                        console.log(ev.data)
                        this.loading.set(false)
                        break;
                }

            }
        })

        return promise;
    }
}

export const AnswerHandlerStore = createAnswerHandler();