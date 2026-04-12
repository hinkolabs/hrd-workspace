import { openai } from "@/lib/openai";

// Allow up to 10MB request bodies (crawled HTML with base64 images can be large)
export const maxDuration = 60; // 60s timeout for long AI responses

const SYSTEM_PROMPT = `You are an expert React/Next.js engineer. Your task is to DIRECTLY CONVERT the provided HTML+CSS into a React component — NOT recreate it from memory.

CONVERSION RULES (strict):
- Output ONLY raw TypeScript React code — NO markdown, NO code fences (\`\`\`), NO explanation whatsoever
- First line must be exactly: "use client";
- Export a single default function component named after the provided page name
- PRESERVE STRUCTURE: Convert every HTML element to its JSX equivalent, keeping the same nesting, order, and hierarchy
- PRESERVE ALL TEXT: Copy every Korean/English/number string exactly character-by-character from the HTML — never paraphrase or translate
- PRESERVE STYLES: Convert every HTML inline style="..." to a React style={{...}} object with identical values. Do NOT approximate with Tailwind — use exact pixel values, hex colors, font-sizes from the source
- PRESERVE CLASS-BASED STYLES: For every CSS class used in the HTML, look it up in the inlined <style> blocks and apply those exact values as inline style props on the element
- IMAGES: Use the EXACT absolute src URL from each <img> tag — never use placeholders. Apply exact width/height/style from the original
- BACKGROUND IMAGES: Reproduce using style={{ backgroundImage: "url('EXACT_URL_HERE')" }} — use the exact URL from the HTML
- FORMS: Reproduce every <input>, <select>, <button> with exact placeholder text, type, name, and styling from the source
- NAVIGATION: Use <Link href="/clone/[page-name]"> from next/link for <a> tags — NEVER nest <a> inside <Link>
- MODALS/TOGGLES: Buttons that open popups → useState boolean + overlay div
- IMPORTS: Only import from react, next/link, next/image. No other external libraries
- INTERACTIVITY: Remove all server-side logic, form submissions, and API calls — UI only

The screenshot is provided as a visual VERIFICATION reference. Your primary source of truth is the HTML/CSS source code.`;

const EDIT_HTML_PROMPT = `You are an HTML/CSS text editor. Given an HTML document and a change request, return ONLY a JSON array of minimal search-replace operations.

OUTPUT FORMAT — return ONLY valid JSON starting with [ and ending with ], no markdown, no explanation:
[
  {"find": "exact substring from the HTML", "replace": "modified substring"}
]

RULES:
1. Return ONLY the JSON array — nothing else
2. Each "find" MUST be an exact substring present in the provided HTML (copy-paste exact characters)
3. Keep "find" as small as possible but unique — include a few chars of surrounding context if needed to be unique
4. "replace" should be identical to "find" except for the requested change
5. Multiple independent changes → multiple objects in the array
6. If the change requires CSS: find the exact style attribute value or CSS declaration and modify only the relevant property value
7. If unable to identify the target, return []

EXAMPLES:
- "버튼 배경색을 파란색으로" → [{"find":"background-color: #00b3ba","replace":"background-color: #0066cc"}]
- "제목 폰트를 3px 키워줘" → [{"find":"font-size: 20px","replace":"font-size: 23px"}]
- "로그인 텍스트를 SIGN IN으로" → [{"find":">로그인<","replace":">SIGN IN<"}]`;

const EDIT_PROMPT = `You are an expert React/Next.js front-end engineer editing a cloned page component.

STRICT OUTPUT RULES:
- Output ONLY raw TypeScript React code — absolutely NO markdown, NO code fences (\`\`\`), NO explanation
- The very first line must be "use client"; or an import statement
- Preserve ALL existing functionality; only apply the requested change
- Keep all imports, state, and structure intact
- NEVER nest <a> inside <Link> — use <Link href="..." className="..."> directly
- The output must be a complete, valid React component file`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, screenshot, html, code, prompt, pageName } = body;

    if (mode === "edit-html") {
      // Targeted HTML edit using search-replace diffs.
      // AI returns a tiny JSON array of {find, replace} pairs — NOT the full HTML.
      // This avoids max_tokens issues and keeps responses fast.
      if (!html || !prompt) {
        return new Response(JSON.stringify({ error: "html and prompt required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        stream: false,
        max_tokens: 2000, // only the tiny JSON diff is needed
        temperature: 0.1,
        messages: [
          { role: "system", content: EDIT_HTML_PROMPT },
          {
            role: "user",
            // base64 images are already stripped client-side
            content: `HTML:\n\`\`\`html\n${html.slice(0, 80000)}\n\`\`\`\n\nCHANGE REQUEST: ${prompt}`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? "[]";
      // Robustly extract the JSON array even if AI adds surrounding text
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const json = jsonMatch ? jsonMatch[0] : "[]";

      return new Response(json, {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    if (mode === "generate-from-html") {
      // Convert HTML base page to React — no screenshot required.
      // Optionally incorporates a user edit request (prompt).
      if (!html) {
        return new Response(JSON.stringify({ error: "html required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const componentName = pageName
        ? pageName
            .split(/[-_]/)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join("")
        : "ClonePage";

      const extraInstruction = prompt ? `\n\nAdditional user request: ${prompt}` : "";

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        stream: true,
        max_tokens: 16000,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Component name: ${componentName}\n\nHTML SOURCE (convert this directly — primary source of truth):\n\`\`\`html\n${html.slice(0, 30000)}\n\`\`\`\n\nConvert the above HTML into a complete React component named ${componentName}.${extraInstruction}`,
          },
        ],
      });

      return streamResponse(stream);
    }

    if (mode === "edit") {
      if (!code || !prompt) {
        return new Response(JSON.stringify({ error: "code and prompt required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        stream: true,
        max_tokens: 16000,
        messages: [
          { role: "system", content: EDIT_PROMPT },
          {
            role: "user",
            content: `Current component code:\n\n${code}\n\nEdit request: ${prompt}\n\nReturn the complete updated component file.`,
          },
        ],
      });

      return streamResponse(stream);
    }

    // mode === "generate"
    if (!screenshot || !html) {
      return new Response(JSON.stringify({ error: "screenshot and html required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const componentName = pageName
      ? pageName
          .split(/[-_]/)
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("")
      : "ClonePage";

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      max_tokens: 16000,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Component name: ${componentName}\n\nHTML SOURCE (convert this directly — primary source of truth):\n\`\`\`html\n${html.slice(0, 30000)}\n\`\`\`\n\nConvert the above HTML into a React component named ${componentName}. The screenshot below is your visual verification — cross-check that the output matches it.`,
            },
            {
              type: "image_url",
              image_url: { url: screenshot, detail: "high" },
            },
          ],
        },
      ],
    });

    return streamResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function streamResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: AsyncIterable<any>
) {
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
}
