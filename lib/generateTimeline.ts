import { STATE_TAX_RATES, NOTARKOSTEN_RATE, GRUNDBUCH_RATE, MAKLER_RATE } from "./taxRates";

export type TimelineItemType = "action" | "payment" | "document" | "info";

export type TimelineItem = {
  type: TimelineItemType;
  text: string;
  amount: string | null;
  important: boolean;
};

export type TimelineWeek = {
  weekLabel: string;
  approximateDate: string;
  title: string;
  items: TimelineItem[];
};

export type Timeline = { weeks: TimelineWeek[] };

export function generateTimeline(
  notaryDate: string,
  purchasePrice: number,
  hasMakler: boolean,
  hasLifeInsurance: boolean,
  _language: string,
  stateRate?: number
): Timeline {
  const base = new Date(notaryDate);

  const addDays = (days: number): string => {
    const r = new Date(base);
    r.setDate(r.getDate() + days);
    return r.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  const rate = stateRate ?? STATE_TAX_RATES.find((s) => s.name === "Berlin")?.rate ?? 0.06;
  const fmt = (n: number) => "~€" + Math.round(n).toLocaleString("de-DE");

  return {
    weeks: [
      {
        weekLabel: "Notary Week",
        approximateDate: addDays(0),
        title: "The signing appointment",
        items: [
          { type: "action", text: "Bring your passport or ID — the notary verifies your identity before signing.", amount: null, important: false },
          { type: "document", text: "You receive the Kaufvertrag (purchase contract) — store it safely.", amount: null, important: false },
          { type: "info", text: "The notary registers the Auflassungsvormerkung within days, protecting your ownership claim in the land register.", amount: null, important: true },
          ...(hasMakler ? [{ type: "payment" as const, text: "Maklergebühr invoice from your estate agent is due around the notary date.", amount: fmt(purchasePrice * MAKLER_RATE), important: false }] : []),
        ],
      },
      {
        weekLabel: "Week 2–4",
        approximateDate: addDays(14),
        title: "Tax office contacts you",
        items: [
          { type: "document", text: "Grunderwerbsteuer-Bescheid (property transfer tax notice) arrives by post from the Finanzamt.", amount: null, important: false },
          { type: "payment", text: "Pay Grunderwerbsteuer to the Finanzamt — required before the land registry will transfer ownership.", amount: fmt(purchasePrice * rate), important: true },
          { type: "payment", text: "Notarkosten invoice arrives by post and is due within two weeks of receipt.", amount: fmt(purchasePrice * NOTARKOSTEN_RATE), important: true },
        ],
      },
      {
        weekLabel: "Week 3–5",
        approximateDate: addDays(21),
        title: "Bank payout conditions",
        items: [
          { type: "document", text: "Your bank sends the Auszahlungsvoraussetzungen — the conditions you must meet before they release the loan funds.", amount: null, important: true },
          { type: "action", text: "Submit any remaining documents your bank has requested.", amount: null, important: false },
          ...(hasLifeInsurance ? [{ type: "action" as const, text: "Confirm your Risikolebensversicherung is active and assigned to your lender — this is typically a payout condition.", amount: null, important: true }] : []),
        ],
      },
      {
        weekLabel: "Week 5–7",
        approximateDate: addDays(35),
        title: "Funds released to seller",
        items: [
          { type: "info", text: "Once all payout conditions are met, your bank transfers the purchase amount directly to the seller.", amount: null, important: false },
          { type: "info", text: "The notary instructs the land register to complete the title transfer after confirming the funds were received.", amount: null, important: false },
          { type: "payment", text: "Grundbucheintrag fee charged by the land registry to record your ownership.", amount: fmt(purchasePrice * GRUNDBUCH_RATE), important: false },
        ],
      },
      {
        weekLabel: "Week 6–8",
        approximateDate: addDays(42),
        title: "Key handover (Übergabe)",
        items: [
          { type: "action", text: "Attend the Schlüsselübergabe — inspect the property and document its condition with the seller.", amount: null, important: true },
          { type: "document", text: "Collect meter readings (electricity, gas, water) and notify utility providers of the ownership change.", amount: null, important: false },
          { type: "action", text: "Ensure Wohngebäudeversicherung (building insurance) is in place from the Besitzübergang date.", amount: null, important: true },
        ],
      },
      {
        weekLabel: "Week 8–10",
        approximateDate: addDays(56),
        title: "Ownership confirmed",
        items: [
          { type: "document", text: "Grundbuchauszug arrives by post confirming you are the registered legal owner.", amount: null, important: false },
          { type: "action", text: "Register your new address at the Bürgeramt (Anmeldung) within two weeks of moving in.", amount: null, important: true },
          ...(!hasLifeInsurance ? [{ type: "action" as const, text: "Consider a Risikolebensversicherung — it protects your household if you pass away before the mortgage is fully repaid.", amount: null, important: false }] : []),
        ],
      },
    ],
  };
}
