// src/routes/api/guide/+server.ts
import { run, user, type AgentInputItem } from '@openai/agents';
import { planner } from '$lib/search/searchAgent';
import { error, type RequestHandler } from '@sveltejs/kit';
import { string, z } from "zod"

const Submission = z.object({
  question: z.string().min(1),
  context: z.array(z.unknown()).optional() 
});

export const POST: RequestHandler = async ({ url, request }) => {

  const body = await request.json();
  const parse = Submission.safeParse(body);
  if (!parse.success) {
    return new Response('Malformed body', { status: 422 });
  }
  const { question, context = [] } = parse.data;

  const input: AgentInputItem[] = [
    ...(context as AgentInputItem[]),
    user(question)
  ];

  const ac = new AbortController();
  request.signal.addEventListener('abort', () => ac.abort());

  try {
    const stream = await run(planner, input, { stream: true, maxTurns: 20, signal: ac.signal });
    const encoder = new TextEncoder();

    const sse = new ReadableStream({
      async start(controller) {
        /* Single consumer for the whole event stream */
        try {
          for await (const ev of stream) {
            /* assistant text tokens ------------------------------------- */
            if (
              ev.type === 'raw_model_stream_event' &&
              ev.data.type === 'output_text_delta'
            ) {
              controller.enqueue(
                encoder.encode(`event: delta\ndata:${JSON.stringify(ev.data.delta)}\n\n`
                )
              );
              continue;
            }

            /* tool-call announcements ----------------------------------- */
            if (
              ev.type === 'run_item_stream_event' &&
              ev.item.type === 'tool_call_item'
            ) {
              controller.enqueue(
                encoder.encode(
                  `event: tool_call\ndata:${JSON.stringify({
                    name: ev.item.rawItem.name,
                    args: ev.item.rawItem.arguments
                  })}\n\n`
                )
              );
            }
          }

          /* stream is finished */
          await stream.completed;
          controller.enqueue(encoder.encode(`event: final\ndata:${JSON.stringify(stream.history)}\n\n`));
        } catch (err) {
          controller.enqueue(
            encoder.encode(`event: error\ndata:${JSON.stringify((err as Error).message)}\n\n`)
          );
        } finally {
          controller.close();
        }
      },

      cancel() {
        // ac.abort()
      }
    });

    return new Response(sse, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error in API/guide:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
