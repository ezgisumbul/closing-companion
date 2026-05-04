"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { STATE_TAX_RATES } from "@/lib/taxRates";

type CheckResult = {
  label: string;
  status: "ok" | "warn" | "unknown";
  explanation: string | null;
};

type ValidateResult = {
  verdict: "legitimate" | "suspicious" | "unclear";
  confidence: "high" | "medium" | "low";
  paymentType: string;
  isOffer: boolean;
  whatThisIs: string;
  isAmountCorrect: string | null;
  checks: CheckResult[];
  whatToDoNext: string;
  selfVerificationSteps: string[];
};

const VERDICT_STYLE = {
  legitimate: { bg: "var(--hf-green)", lightBg: "#f0faf5", border: "#c3e8d8" },
  suspicious: { bg: "var(--hf-warning)", lightBg: "#fffbef", border: "#ffe9a0" },
  unclear: { bg: "var(--hf-secondary-l2)", lightBg: "#f5f7f9", border: "#dde3ea" },
};

export default function ValidatorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context from localStorage
  const [ccPrice, setCcPrice] = useState<string | null>(null);
  const [ccMakler, setCcMakler] = useState<string | null>(null);
  const [ccState, setCcState] = useState<string | null>(null);
  const [ccNotaryDate, setCcNotaryDate] = useState<string | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [accuracyOpen, setAccuracyOpen] = useState(false);
  const [manualState, setManualState] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualMakler, setManualMakler] = useState<"yes" | "no">("yes");
  const [manualNotaryDate, setManualNotaryDate] = useState("");

  // Result state
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const price = localStorage.getItem("cc_price");
      const makler = localStorage.getItem("cc_makler");
      const state = localStorage.getItem("cc_state");
      const notaryDate = localStorage.getItem("cc_notary_date");
      setCcPrice(price);
      setCcMakler(makler);
      setCcState(state);
      setCcNotaryDate(notaryDate);
      if (state) setManualState(state);
      if (price) setManualPrice(price);
      if (makler === "no") setManualMakler("no");
    }
  }, []);

  function buildFormData() {
    const fd = new FormData();
    fd.append("file", file!);
    fd.append("language", "en");
    const state = manualState || ccState || "";
    const price = manualPrice || ccPrice || "";
    const makler = manualMakler || ccMakler || "";
    const notaryDate = manualNotaryDate || ccNotaryDate || "";
    if (state) fd.append("state", state);
    if (price) fd.append("purchasePrice", price);
    if (makler) fd.append("hasMakler", makler);
    if (notaryDate) fd.append("notaryDate", notaryDate);
    return fd;
  }

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      alert("File is too large — maximum 10 MB.");
      return;
    }
    const ok = ["application/pdf", "image/jpeg", "image/png"].includes(f.type);
    if (!ok) {
      alert("Please upload a PDF, JPG, or PNG file.");
      return;
    }
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    handleFileChange(f ?? null);
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/validate", { method: "POST", body: buildFormData() });
      if (!res.ok) throw new Error("API error");
      const data: ValidateResult = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
  }

  if (status === "done" && result) {
    return <ResultView result={result} onReset={reset} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AppHeader />
      <div className="page-container">
        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "16px 0 4px", fontSize: 13, color: "var(--hf-secondary-l2)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {/* Header */}
        <section style={{ paddingTop: 8, paddingBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--hf-peach)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Letter checker
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--hf-secondary)", margin: "0 0 10px", lineHeight: 1.3 }}>
            Is this payment request{" "}
            <em style={{ fontStyle: "normal", color: "var(--hf-peach)" }}>legitimate?</em>
          </h1>
          <p style={{ fontSize: 13, color: "var(--hf-secondary-l2)", lineHeight: 1.6, margin: 0 }}>
            Upload any invoice or payment request you received. We&apos;ll check it against what&apos;s expected in a German property closing.
          </p>
        </section>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "var(--hf-peach)" : "var(--hf-primary-l4)"}`,
            borderRadius: 10, padding: "32px 20px", textAlign: "center",
            cursor: "pointer", background: isDragging ? "#fef9f7" : "#fafbfc",
            transition: "border-color 0.15s, background 0.15s", marginBottom: 16,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "var(--hf-primary-l5)", borderRadius: 20,
                padding: "6px 14px", marginBottom: 8,
              }}>
                <span style={{ fontSize: 16 }}>{file.type === "application/pdf" ? "📄" : "🖼️"}</span>
                <span style={{ fontSize: 13, color: "var(--hf-secondary)", fontWeight: 500 }}>{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--hf-secondary-l2)", padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--hf-secondary-l2)", margin: 0 }}>Click to change file</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📎</div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--hf-secondary)", margin: "0 0 4px" }}>
                Drop your file here, or click to browse
              </p>
              <p style={{ fontSize: 12, color: "var(--hf-secondary-l2)", margin: 0 }}>PDF, JPG or PNG · max 10 MB</p>
            </div>
          )}
        </div>

        {/* Improve accuracy expander */}
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setAccuracyOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "var(--hf-primary)", fontWeight: 500, padding: 0,
            }}
          >
            <span style={{ fontSize: 10, transform: accuracyOpen ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▶</span>
            Improve accuracy — add your property context
          </button>

          {accuracyOpen && (
            <div style={{
              marginTop: 12, padding: "14px 16px",
              background: "var(--hf-primary-l5)", borderRadius: 8,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                  Federal state
                </label>
                <div style={{ border: "1px solid var(--hf-primary-l4)", borderRadius: 6, padding: "8px 10px", background: "#fff" }}>
                  <select
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value)}
                    style={{ border: "none", outline: "none", width: "100%", fontSize: 13, color: manualState ? "var(--hf-secondary)" : "var(--hf-secondary-l2)", background: "transparent", cursor: "pointer" }}
                  >
                    <option value="">Select a state…</option>
                    {STATE_TAX_RATES.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                  Purchase price (€)
                </label>
                <input
                  type="number"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="e.g. 450000"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    border: "1px solid var(--hf-primary-l4)", borderRadius: 6,
                    padding: "8px 10px", fontSize: 13, color: "var(--hf-secondary)",
                    background: "#fff", outline: "none",
                  }}
                />
              </div>
              {!ccNotaryDate && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                    Notary appointment date
                  </label>
                  <input
                    type="date"
                    value={manualNotaryDate}
                    onChange={(e) => setManualNotaryDate(e.target.value)}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: "1px solid var(--hf-primary-l4)", borderRadius: 6,
                      padding: "8px 10px", fontSize: 13, color: "var(--hf-secondary)",
                      background: "#fff", outline: "none",
                    }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                  Did you use an estate agent?
                </label>
                <div style={{ display: "flex", border: "1px solid var(--hf-primary-l4)", borderRadius: 6, overflow: "hidden", maxWidth: 160 }}>
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setManualMakler(v)}
                      style={{
                        flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 500,
                        cursor: "pointer", border: "none",
                        background: manualMakler === v ? "var(--hf-secondary)" : "#fff",
                        color: manualMakler === v ? "#fff" : "var(--hf-secondary)",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      {v === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {status === "error" && (
          <p style={{ fontSize: 13, color: "var(--hf-error)", margin: "0 0 12px" }}>{errorMsg}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!file || status === "loading"}
          style={{
            width: "100%", padding: "14px 0", fontSize: 15, fontWeight: 600,
            borderRadius: 8, border: "none",
            cursor: !file || status === "loading" ? "not-allowed" : "pointer",
            background: !file || status === "loading" ? "var(--hf-primary-l4)" : "var(--hf-secondary)",
            color: !file || status === "loading" ? "var(--hf-secondary-l2)" : "#fff",
            transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {status === "loading" ? (
            <>
              <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Checking…
            </>
          ) : (
            "Check this letter"
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <p style={{ fontSize: 11, color: "var(--hf-secondary-l2)", lineHeight: 1.5, margin: "12px 0 0", textAlign: "center" }}>
          Your file is sent securely to Claude AI and is not stored.
        </p>
      </div>
    </div>
  );
}

/* ── Result view ── */
function ResultView({
  result,
  onReset,
}: {
  result: ValidateResult;
  onReset: () => void;
}) {
  const cfg = VERDICT_STYLE[result.verdict];
  const showWarnDetails = result.verdict === "suspicious" || result.verdict === "unclear";

  const verdictLabel = {
    legitimate: "Looks legitimate",
    suspicious: "Something looks off",
    unclear: "Cannot determine",
  }[result.verdict];

  const confidenceLabel = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  }[result.confidence];

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AppHeader />
      <div className="page-container">
        <button
          onClick={onReset}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "16px 0 4px", fontSize: 13, color: "var(--hf-secondary-l2)", display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Check another
        </button>

        {/* isOffer banner */}
        {result.isOffer && (
          <div style={{
            background: "var(--hf-warning-l1, #fffbef)",
            borderLeft: "3px solid var(--hf-warning)",
            borderRadius: "0 8px 8px 0",
            padding: "12px 14px",
            marginBottom: 14,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--hf-warning-dark, #9a6400)", margin: 0, lineHeight: 1.5 }}>
              This appears to be an offer, not an invoice. You are not obligated to pay.
            </p>
          </div>
        )}

        {/* Verdict card */}
        <div style={{
          background: cfg.lightBg,
          border: `1px solid ${cfg.border}`,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 20,
        }}>
          {/* Header strip */}
          <div style={{ background: cfg.bg, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{verdictLabel}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {confidenceLabel}
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: "16px 18px" }}>
            <p style={{ fontSize: 13, color: "var(--hf-secondary)", margin: "0 0 14px", lineHeight: 1.6 }}>
              {result.whatThisIs}
            </p>

            {result.isAmountCorrect !== null && (
              <div style={{
                background: "#fff", borderRadius: 8, padding: "10px 12px",
                border: "1px solid rgba(0,0,0,0.06)", marginBottom: 14,
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                  Amount
                </p>
                <p style={{ fontSize: 13, color: "var(--hf-secondary)", margin: 0, lineHeight: 1.5 }}>
                  {result.isAmountCorrect}
                </p>
              </div>
            )}

            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
              What we checked
            </p>

            {result.verdict === "legitimate" ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {result.checks.map((c, i) => (
                  <div key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "#e8f5ee", border: "1px solid #c3e8d8",
                    borderRadius: 20, padding: "4px 10px",
                  }}>
                    <span style={{ fontSize: 11, color: "var(--hf-green)" }}>✓</span>
                    <span style={{ fontSize: 12, color: "var(--hf-secondary)", whiteSpace: "nowrap" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {result.checks.map((c, i) => {
                  const isWarn = c.status === "warn";
                  const isUnknown = c.status === "unknown";
                  const chipBg = isWarn ? "#fef4f3" : isUnknown ? "#f5f7f9" : "#e8f5ee";
                  const chipBorder = isWarn ? "#f5c9c5" : isUnknown ? "#dde3ea" : "#c3e8d8";
                  const icon = isWarn ? "✗" : isUnknown ? "?" : "✓";
                  const iconColor = isWarn ? "var(--hf-error)" : isUnknown ? "var(--hf-secondary-l2)" : "var(--hf-green)";
                  return (
                    <div key={i}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: chipBg, border: `1px solid ${chipBorder}`,
                        borderRadius: 20, padding: "4px 10px",
                      }}>
                        <span style={{ fontSize: 11, color: iconColor, fontWeight: 700 }}>{icon}</span>
                        <span style={{ fontSize: 12, color: "var(--hf-secondary)" }}>{c.label}</span>
                      </div>
                      {showWarnDetails && isWarn && c.explanation && (
                        <p style={{ fontSize: 12, color: "var(--hf-error)", margin: "3px 0 0 10px", lineHeight: 1.5 }}>
                          {c.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", border: "1px solid rgba(0,0,0,0.06)", marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
                What to do next
              </p>
              <p style={{ fontSize: 13, color: "var(--hf-secondary)", margin: 0, lineHeight: 1.6 }}>
                {result.whatToDoNext}
              </p>
            </div>

            {result.selfVerificationSteps?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", border: "1px solid rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--hf-secondary-l2)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
                  You should always verify too
                </p>
                <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.selfVerificationSteps.map((step, i) => (
                    <li key={i} style={{ fontSize: 13, color: "var(--hf-secondary)", lineHeight: 1.6 }}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 11, color: "var(--hf-secondary-l2)", lineHeight: 1.6, margin: "0 0 20px", padding: "12px 14px", background: "#f5f7f9", borderRadius: 8 }}>
          <strong>Disclaimer:</strong> This analysis is AI-generated and informational only. It is not legal or financial advice. When in doubt, consult your notary or a qualified professional before making any payment.
        </p>

        <button
          onClick={onReset}
          style={{
            width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 600,
            borderRadius: 8, border: "1px solid var(--hf-primary-l4)",
            cursor: "pointer", background: "#fff", color: "var(--hf-secondary)",
          }}
        >
          Check another letter
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
