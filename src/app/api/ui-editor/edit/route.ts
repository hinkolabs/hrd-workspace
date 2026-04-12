import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const { html, prompt } = await req.json();
    if (!html || !prompt) {
      return new Response(JSON.stringify({ error: "html and prompt required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      max_tokens: 16000,
      messages: [
        {
          role: "system",
          content: `You are an expert front-end engineer editing HTML files.
Rules:
- Output ONLY the complete, modified HTML – no markdown, no code fences, no explanation
- Keep ALL existing content and structure; only apply the requested change
- Preserve all inline CSS and existing styles
- The output must be a valid, self-contained HTML file starting with <!DOCTYPE html>`,
        },
        {
          role: "user",
          content: `Current HTML:\n\n${html}\n\nEdit request: ${prompt}\n\nReturn the complete updated HTML file.`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
