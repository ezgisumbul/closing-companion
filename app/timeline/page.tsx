"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { generateTimeline, Timeline, TimelineItem } from "@/lib/generateTimeline";

/* ── Diff types ── */
type DiffAdd = { afterWeekIndex: number; item: TimelineItem };
type DiffModify = { weekIndex: number; itemIndex: number; changes: Partial<TimelineItem> };
type DiffRemove = { weekIndex: number; itemIndex: number };
type TimelineDiff = { add: DiffAdd[]; modify: DiffModify[]; remove: DiffRemove[] };

/* ── Item type display config ── */
const TYPE_CONFIG = {
  action: { badge: "ACT", bg: "var(--hf-primary-l5)", color: "var(--hf-primary)" },
  payment: { badge: "€", bg: "var(--hf-peach-l4)", color: "var(--hf-peach-dark)" },
  document: { badge: "DOC", bg: "var(--hf-grey-l1)", color: "var(--hf-secondary-l2)" },
  info: { badge: "INFO", bg: "var(--hf-blue-l2)", color: "var(--hf-blue)" },
} as const;

/* ── Shared form sub-components ── */
function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--hf-primary-l4)", borderRadius: 6, overflow: "hidden" }}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: "11px 16px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              borderRight: "1px solid var(--hf-primary-l4)",
              background: selected ? "var(--hf-secondary)" : "#fff",
              color: selected ? "#fff" : "var(--hf-secondary)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--hf-secondary-l2)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

/* ── Diff application ── */
function applyDiff(
  base: Timeline,
  diff: TimelineDiff
): { timeline: Timeline; highlighted: Set<string>; pulsed: Set<string> } {
  const weeks = base.weeks.map((w) => ({ ...w, items: [...w.items] }));
  const highlighted = new Set<string>();
  const pulsed = new Set<string>();

  const byWeek = new Map<number, number[]>();
  for (const r of diff.remove ?? []) {
    if (!byWeek.has(r.weekIndex)) byWeek.set(r.weekIndex, []);
    byWeek.get(r.weekIndex)!.push(r.itemIndex);
  }
  for (const [wi, idxs] of Array.from(byWeek)) {
    idxs.sort((a: number, b: number) => b - a);
    for (const ii of idxs) {
      if (weeks[wi]) weeks[wi].items.splice(ii, 1);
    }
  }

  for (const m of diff.modify ?? []) {
    if (weeks[m.weekIndex]?.items[m.itemIndex]) {
      weeks[m.weekIndex].items[m.itemIndex] = {
        ...weeks[m.weekIndex].items[m.itemIndex],
        ...m.changes,
      };
      pulsed.add(`${m.weekIndex}-${m.itemIndex}`);
    }
  }

  for (const a of diff.add ?? []) {
    if (weeks[a.afterWeekIndex]) {
      weeks[a.afterWeekIndex].items.push(a.item);
      highlighted.add(`${a.afterWeekIndex}-${weeks[a.afterWeekIndex].items.length - 1}`);
    }
  }

  return { timeline: { weeks }, highlighted, pulsed };
}

/* ── Page ── */
export default function TimelinePage() {
  const router = useRouter();

  // Form state
  const [notaryDate, setNotaryDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [hasMakler, setHasMakler] = useState<"yes" | "no">("yes");
  const [hasLifeInsurance, setHasLifeInsurance] = useState<"yes" | "no">("no");
  const [specialContext, setSpecialContext] = useState("");

  // Result state
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set());
  const [pulsedKeys, setPulsedKeys] = useState<Set<string>>(new Set());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("cc_price", purchasePrice);
      localStorage.setItem("cc_makler", hasMakler);
      localStorage.setItem("cc_notary_date", notaryDate);
    }
    const base = generateTimeline(
      notaryDate,
      Number(purchasePrice),
      hasMakler === "yes",
      hasLifeInsurance === "yes",
      "en"
    );
    setTimeline(base);
    setAiStatus("idle");
    setHighlightedKeys(new Set());
    setPulsedKeys(new Set());

    if (specialContext.trim()) {
      fetchAIDiff(base);
    }
  }

  async function fetchAIDiff(base: Timeline) {
    setAiStatus("loading");
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notaryDate,
          purchasePrice: Number(purchasePrice),
          hasMakler: hasMakler === "yes",
          hasLifeInsurance: hasLifeInsurance === "yes",
          language: "en",
          specialContext,
          existingTimeline: base,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const diff: TimelineDiff = await res.json();

      const { timeline: patched, highlighted, pulsed } = applyDiff(base, diff);
      setTimeline(patched);
      setHighlightedKeys(highlighted);
      setPulsedKeys(pulsed);
      setAiStatus("done");

      setTimeout(() => {
        setHighlightedKeys(new Set());
        setPulsedKeys(new Set());
      }, 3000);
    } catch {
      setAiStatus("error");
    }
  }

  const showingResult = timeline !== null;

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AppHeader />

      <div className="page-container">
        {/* Back button */}
        <button
          type="button"
          onClick={showingResult ? () => setTimeline(null) : () => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "16px 0 4px",
            color: "var(--hf-secondary-l2)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {!showingResult ? (
          /* ── Form view ── */
          <>
            <section style={{ paddingTop: 12, paddingBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--hf-primary)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Smart Timeline
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 500, color: "var(--hf-secondary)", margin: "0 0 8px", lineHeight: 1.3 }}>
                Your personalised closing checklist
              </h1>
              <p style={{ fontSize: 13, color: "var(--hf-secondary-l2)", lineHeight: 1.6, margin: 0 }}>
                Tell us a few details and we&apos;ll build a week-by-week plan tailored to your situation.
              </p>
            </section>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <FieldLabel>Notary appointment date</FieldLabel>
                <input
                  type="date"
                  value={notaryDate}
                  onChange={(e) => setNotaryDate(e.target.value)}
                  required
                  style={{ width: "100%", border: "1px solid var(--hf-primary-l4)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--hf-secondary)", background: "#fff", outline: "none" }}
                />
              </div>

              <div>
                <FieldLabel>Purchase price</FieldLabel>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--hf-primary-l4)", borderRadius: 6, padding: "9px 12px", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--hf-secondary-l2)" }}>€</span>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    min={0}
                    placeholder="400000"
                    required
                    style={{ border: "none", outline: "none", width: "100%", fontSize: 13, color: "var(--hf-secondary)", background: "transparent" }}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Using a Makler (estate agent)?</FieldLabel>
                <ToggleGroup
                  options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
                  value={hasMakler}
                  onChange={setHasMakler}
                />
              </div>

              <div>
                <FieldLabel>Life insurance required by lender?</FieldLabel>
                <ToggleGroup
                  options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
                  value={hasLifeInsurance}
                  onChange={setHasLifeInsurance}
                />
              </div>

              <div>
                <FieldLabel>
                  Anything unusual about your situation?{" "}
                  <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--hf-secondary-l2)", fontSize: 11 }}>
                    (optional)
                  </span>
                </FieldLabel>
                <textarea
                  value={specialContext}
                  onChange={(e) => setSpecialContext(e.target.value)}
                  rows={3}
                  placeholder="e.g. buying with a non-EU partner, new build not yet finished, self-employed income"
                  style={{ width: "100%", border: "1px solid var(--hf-primary-l4)", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "var(--hf-secondary)", background: "#fff", outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
                />
              </div>

              <button
                type="submit"
                style={{ width: "100%", padding: "14px 24px", background: "var(--hf-secondary)", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Generate my timeline
              </button>
            </form>
          </>
        ) : (
          /* ── Result view ── */
          <>
            <section style={{ paddingTop: 12, paddingBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--hf-primary)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Smart Timeline
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 500, color: "var(--hf-secondary)", margin: 0, lineHeight: 1.3 }}>
                Your closing plan
              </h1>
            </section>

            {/* AI status banner */}
            {(aiStatus === "loading" || aiStatus === "done") && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: aiStatus === "loading" ? "8px 12px" : "4px 0",
                  background: aiStatus === "loading" ? "var(--hf-primary-l5)" : "transparent",
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                {aiStatus === "loading" && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="4" stroke="var(--hf-primary)" strokeWidth="2" fill="none" opacity="0.3" />
                    <path d="M6 2a4 4 0 014 4" stroke="var(--hf-primary)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                <span
                  style={{
                    fontSize: aiStatus === "loading" ? 12 : 11,
                    color: aiStatus === "loading" ? "var(--hf-primary)" : "var(--hf-secondary-l2)",
                    fontWeight: aiStatus === "loading" ? 500 : 400,
                  }}
                >
                  {aiStatus === "loading"
                    ? "✦ Personalising for your situation..."
                    : "✦ Personalised for your situation · Generated by AI"}
                </span>
              </div>
            )}

            {/* Timeline cards with mask */}
            <div style={{ position: "relative" }}>
              {timeline.weeks.map((week, wi) => (
                <div
                  key={wi}
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "var(--card-shadow)",
                    padding: "14px 16px",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--hf-primary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        {week.weekLabel}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--hf-secondary-l2)" }}>
                        {week.approximateDate}
                      </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 500, color: "var(--hf-secondary)", margin: 0, lineHeight: 1.3 }}>
                      {week.title}
                    </p>
                  </div>

                  <div>
                    {week.items.map((item, ii) => {
                      const itemKey = `${wi}-${ii}`;
                      const isHighlighted = highlightedKeys.has(itemKey);
                      const isPulsed = pulsedKeys.has(itemKey);
                      const conf = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;

                      return (
                        <div
                          key={ii}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "8px 0 8px 8px",
                            borderBottom: ii < week.items.length - 1 ? "1px solid var(--hf-grey-l1)" : "none",
                            borderLeft: isHighlighted ? "3px solid var(--hf-primary)" : "3px solid transparent",
                            animation: isPulsed ? "itemPulse 0.8s ease-out" : undefined,
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              padding: "2px 5px",
                              borderRadius: 3,
                              background: conf.bg,
                              color: conf.color,
                              marginTop: 2,
                              minWidth: 30,
                              textAlign: "center",
                            }}
                          >
                            {conf.badge}
                          </span>

                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, color: "var(--hf-secondary)", margin: 0, lineHeight: 1.5 }}>
                              {item.text}
                              {item.important && (
                                <span style={{ color: "var(--hf-primary)", marginLeft: 5, fontWeight: 700 }}>·</span>
                              )}
                            </p>
                            {item.amount && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--hf-peach-dark)",
                                  background: "var(--hf-peach-l5)",
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                }}
                              >
                                {item.amount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Loading mask */}
              {aiStatus === "loading" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: 8,
                    animation: "maskPulse 2s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes maskPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes itemPulse {
          0% { background: var(--hf-blue-l2); }
          100% { background: transparent; }
        }
      `}</style>
    </div>
  );
}
