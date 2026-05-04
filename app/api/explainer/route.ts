import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fromBuffer } from "pdf2pic";

const client = new Anthropic({ timeout: 60000 });

const SYSTEM_PROMPT = `Respond with raw JSON only. No markdown, no code fences, no backticks. You are a plain-language legal document expert helping non-lawyers understand contracts and official letters. The document may be in any language — always respond in English. Analyse the uploaded document and return this exact JSON shape:
{
  "documentType": "string describing what this document is",
  "summary": "string of 2-3 sentences explaining what this document is and why the user received it",
  "keyFacts": [{ "label": "string", "value": "string" }],
  "keyClause": "string explaining the single most important clause or term the user should understand",
  "watchOut": "string describing anything the user should be cautious about or pay attention to, or empty string if nothing notable",
  "questionsToAsk": ["string", "string", "string"],
  "needsProfessional": true | false
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    type DocBlock =
      | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png"; data: string } }
      | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

    let docBlock: DocBlock;

    if (file.type === "application/pdf") {
      try {
        const converter = fromBuffer(buffer, {
          density: 150,
          format: "png",
          width: 1200,
          height: 1600,
        });
        const page = await converter(1, { responseType: "buffer" });
        if (!page.buffer || page.buffer.length === 0) {
          throw new Error("Empty buffer from pdf2pic");
        }
        docBlock = {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: page.buffer.toString("base64") },
        };
      } catch (convErr) {
        console.warn("pdf2pic conversion failed, falling back to native PDF document:", convErr);
        docBlock = {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
        };
      }
    } else {
      docBlock = {
        type: "image",
        source: {
          type: "base64",
          media_type: file.type === "image/png" ? "image/png" : "image/jpeg",
          data: buffer.toString("base64"),
        },
      };
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: [docBlock as any, { type: "text", text: "Please analyse the attached document." }],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    const cleaned = textBlock.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Explainer API error:", err);
    return NextResponse.json({ error: "Failed to analyse document" }, { status: 500 });
  }
}
