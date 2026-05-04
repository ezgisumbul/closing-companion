import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fromBuffer } from "pdf2pic";

const client = new Anthropic({ timeout: 60000 });

const SYSTEM_PROMPT = `Respond with raw JSON only. No markdown, no code fences, no backticks, no explanation. Just the JSON object.

You are a German real estate fraud detection expert helping expats verify payment requests received after buying property in Germany. The document image may be in German — that is expected and normal. Always respond in the language specified by the language parameter (en = English, de = German).

Analyse the uploaded document image carefully and run ALL of the following checks:

SENDER IDENTITY — Does the sender name match a known legitimate German authority or service provider? Finanzamt must include the specific office name (e.g. Finanzamt Tempelhof-Schöneberg) — just "Finanzamt" alone is suspicious. Check for known legitimacy for Notar, Grundbuchamt, Makler, and banks.
IBAN FORMAT — Strip all spaces. Flag only if: (1) it does not start with DE, or (2) the total length after stripping is not exactly 22 characters. Do not comment on spacing groupings or formatting — these vary and are irrelevant to validity. A German IBAN is valid if and only if it starts with DE and is 22 characters long after stripping spaces.
AMOUNT PLAUSIBILITY — Does the stated amount match expected rates for this payment type in Germany? If purchasePrice is provided cross-check: Grunderwerbsteuer should be stateRate × price, Notarkosten ~1.5%, Grundbucheintrag ~0.5%, Maklergebühr ~3.57%. Flag significant deviations.
ADDRESS AND STATE CONSISTENCY — Does the sender address look like a real German address? If state is provided, check whether the sender is in the correct state. A Berlin Finanzamt must have a Berlin address — a München address on a Berlin property notice is suspicious.
EMAIL DOMAIN — If an email appears, does the domain match the claimed sender? Official German authorities use government domains. Flag gmail, web.de, gmx, or domains that mimic official ones (e.g. finanzamt-berlin-service.com).
PHONE NUMBER — If appears, does it have a valid German format (+49 or 0 prefix) and does the area code match the sender region?
DOCUMENT STRUCTURE AND REFERENCE NUMBERS — Does the document contain expected elements: Aktenzeichen or Steuernummer, formal German bureaucratic language, correct date format (DD.MM.YYYY)? Is the reference number consistent throughout the entire document — in header, body, and payment reference? Inconsistent or missing reference numbers are suspicious.
VISUAL ALIGNMENT AND QUALITY — Does the document layout look professional? Are headers centered correctly, margins consistent, text aligned properly? Misalignment, inconsistent fonts, or pixelated elements suggest tampering or low-quality forgery.
LOGO AND OFFICIAL SEAL — Is a logo or official seal present? Based on your knowledge of German official document design, does the logo match what would be expected for the claimed authority and state? Flag if logo appears pixelated, stretched, inconsistent with official design standards, or does not match the claimed issuing authority.
SIGNATURE FORMAT — Notary documents must be signed with full name and title (Notar/Notarin) and include an official seal (Dienstsiegel). Finanzamt letters are typically signed with full name and title (Sachbearbeiter/in) or department stamp. Makler letters should show full name, title, and company name. Flag missing or incorrect signature formats.
LANGUAGE AND GRAMMAR QUALITY — Is the German professional, formal, and consistent with official German bureaucratic register? Poor grammar, informal language, or unusual phrasing are scam signals.
PRESSURE TACTICS — Does the document use aggressive urgency language (sofort, unverzüglich) or threaten Mahngebühren without proper legal basis? Legitimate German authorities use formal measured language.
PAYMENT METHOD — Legitimate German authorities only request bank transfer to a DE IBAN. Flag any request for cash, PayPal, crypto, or any non-standard payment method.
DOCUMENT TYPE — Is this actually an invoice (Rechnung) or an offer (Angebot/Kostenvoranschlag)? If it is an offer the recipient is not obligated to pay. Check for opt-out scams disguised as one-time registration fees. Check for fine print about recurring charges. Any offer from an official-sounding authority is automatically suspicious — legitimate authorities never send unsolicited offers.
MAKLER CROSS-CHECK — If hasMakler is false and the document appears to be a Maklergebühr invoice, flag as suspicious since no agent was used.
DATE CONSISTENCY — Check the document date and due date. If notaryDate is provided: a Grunderwerbsteuer notice should arrive 2-4 weeks after notary date, Notarkosten within 1-2 weeks, Maklergebühr around the notary date. Flag if the document date is before the notary date (impossible), more than 3 months after (suspicious), or if the due date has already passed (note this to the user without flagging as suspicious — they may simply need to act quickly). If no date appears on the document at all, flag as suspicious — all official German documents are dated.

For each check, return its label, status (ok, warn, or unknown), and if status is warn return a one-sentence explanation of exactly what is wrong.

Respond ONLY with this exact JSON shape:
{
  "verdict": "legitimate" | "suspicious" | "unclear",
  "confidence": "high" | "medium" | "low",
  "paymentType": "string describing what this document appears to be",
  "isOffer": true | false,
  "checks": [
    {
      "label": "string",
      "status": "ok" | "warn" | "unknown",
      "explanation": "string if status is warn, null otherwise"
    }
  ],
  "whatThisIs": "one paragraph plain language explanation of what this document is",
  "isAmountCorrect": "explanation of whether amount looks right, or null if no amount present",
  "whatToDoNext": "specific actionable advice",
  "selfVerificationSteps": ["step 1", "step 2", "step 3", "step 4"]
}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) ?? "en";
    const state = (formData.get("state") as string) ?? null;
    const purchasePrice = (formData.get("purchasePrice") as string) ?? null;
    const hasMakler = (formData.get("hasMakler") as string) ?? null;
    const notaryDate = (formData.get("notaryDate") as string) ?? null;

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
        console.log("pdf2pic buffer size:", page.buffer?.length ?? 0);
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

    const contextLines: string[] = [];
    if (state) contextLines.push(`Federal state: ${state}`);
    if (purchasePrice) contextLines.push(`Purchase price: €${purchasePrice}`);
    if (hasMakler) contextLines.push(`Used estate agent (Makler): ${hasMakler}`);
    if (notaryDate) contextLines.push(`Notary appointment date: ${notaryDate}`);
    if (language === "de") contextLines.push("The buyer's preferred language is German.");

    const userText = contextLines.length > 0
      ? `Buyer context:\n${contextLines.join("\n")}\n\nPlease analyse the attached document.`
      : "Please analyse the attached document.";

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
          content: [docBlock as any, { type: "text", text: userText }],
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
    console.error("Validate API error:", err);
    return NextResponse.json({ error: "Failed to analyse document" }, { status: 500 });
  }
}
