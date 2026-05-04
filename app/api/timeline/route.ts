import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `Respond with raw JSON only. No markdown, no code fences, no backticks, no explanation. Just the JSON object.

You are an expert on the German real estate closing process. You receive an existing week-by-week closing timeline and a special situation described by the buyer. Your task is to return a minimal diff — only the targeted changes needed to personalise the timeline for their situation.

Return this exact JSON shape:
{
  "add": [{ "afterWeekIndex": <0-based week index>, "item": { "type": "action"|"payment"|"document"|"info", "text": "<one sentence>", "amount": "<~€X,XXX>" | null, "important": true|false } }],
  "modify": [{ "weekIndex": <0-based>, "itemIndex": <0-based>, "changes": { <partial item fields to update> } }],
  "remove": [{ "weekIndex": <0-based>, "itemIndex": <0-based> }]
}

Rules:
1. Output ONLY the JSON diff object. No other text.
2. weekIndex and itemIndex are 0-based integers referencing the existing timeline weeks array.
3. Only add, modify, or remove items that are genuinely needed for the special situation.
4. Prefer targeted additions over modifying or removing existing items.
5. Keep all text to one sentence.
6. If no changes are needed, return {"add":[],"modify":[],"remove":[]}.

Be concise. Keep each item description to one sentence. Do not over-explain.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { specialContext, existingTimeline } = body as {
      specialContext: string;
      existingTimeline: unknown;
    };

    const userMessage = [
      `Special situation: ${specialContext}`,
      ``,
      `Existing timeline for reference:`,
      JSON.stringify(existingTimeline, null, 2),
      ``,
      `Return only the diff needed to personalise this timeline for the special situation above.`,
    ].join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    const cleaned = textBlock.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const diff = JSON.parse(cleaned);
    return NextResponse.json(diff);
  } catch (err) {
    console.error("Timeline diff API error:", err);
    return NextResponse.json({ error: "Failed to generate diff" }, { status: 500 });
  }
}
