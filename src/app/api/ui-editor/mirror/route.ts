import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const { screenshot, html } = await req.json();
    if (!screenshot || !html) {
      return new Response(JSON.stringify({ error: "screenshot and html required" }), {
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
          content: `You are an expert front-end engineer. 
Given a screenshot and the source HTML of a web page, reproduce the page as a complete, self-contained HTML file.
Requirements:
- Output ONLY valid HTML starting with <!DOCTYPE html> – no markdown, no code fences, no explanation
- Embed all CSS inline (use a <style> tag in <head>)
- Recreate the visual appearance as closely as possible using only HTML/CSS
- Use flexbox/grid for layout
- Make the page fully static (no JS required for rendering)
- Replace any external images with solid-color placeholder divs of the same size
- Korean text must be preserved exactly`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here is the source HTML of the page:\n\n${html.slice(0, 20000)}\n\nPlease reproduce this page as a standalone HTML file.`,
            },
            {
              type: "image_url",
              image_url: { url: screenshot, detail: "high" },
            },
          ],
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
    const message = err instanceof Error ? err.message : "Mirror failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
