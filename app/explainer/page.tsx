"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

type KeyFact = { label: string; value: string };

type ExplainResult = {
  documentType: string;
  summary: string;
  keyFacts: KeyFact[];
  keyClause: string;
  watchOut: string;
  questionsToAsk: string[];
  needsProfessional: boolean;
};

export default function ExplainerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

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
    handleFileChange(e.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/explainer", { method: "POST", body: fd });
      if (!res.ok) throw new Error("API error");
      const data: ExplainResult = await res.json();
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
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "16px 0 4px",
            fontSize: 13,
            color: "var(--hf-secondary-l2)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>

        <section style={{ paddingTop: 8, paddingBottom: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--hf-blue)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}
          >
            Document Explainer
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "var(--hf-secondary)",
              margin: "0 0 10px",
              lineHeight: 1.3,
            }}
          >
            What does this document{" "}
            <em style={{ fontStyle: "normal", color: "var(--hf-blue)" }}>
              mean?
            </em>
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--hf-secondary-l2)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Upload any contract or legal letter in any language — we&apos;ll
            explain what it means, extract the key facts, and flag what to watch
            out for.
          </p>
        </section>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "var(--hf-blue)" : "var(--hf-primary-l4)"}`,
            borderRadius: 10,
            padding: "32px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: isDragging ? "#f0fbfd" : "#fafbfc",
            transition: "border-color 0.15s, background 0.15s",
            marginBottom: 20,
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
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--hf-blue-l2)",
                  borderRadius: 20,
                  padding: "6px 14px",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {file.type === "application/pdf" ? "📄" : "🖼️"}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--hf-secondary)",
                    fontWeight: 500,
                  }}
                >
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "var(--hf-secondary-l2)",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--hf-secondary-l2)",
                  margin: 0,
                }}
              >
                Click to change file
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📎</div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--hf-secondary)",
                  margin: "0 0 4px",
                }}
              >
                Drop your file here, or click to browse
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--hf-secondary-l2)",
                  margin: 0,
                }}
              >
                PDF, JPG or PNG · max 10 MB
              </p>
            </div>
          )}
        </div>

        {status === "error" && (
          <p
            style={{
              fontSize: 13,
              color: "var(--hf-error)",
              margin: "0 0 12px",
            }}
          >
            {errorMsg}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || status === "loading"}
          style={{
            width: "100%",
            padding: "14px 0",
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor: !file || status === "loading" ? "not-allowed" : "pointer",
            background:
              !file || status === "loading"
                ? "var(--hf-primary-l4)"
                : "var(--hf-blue)",
            color:
              !file || status === "loading" ? "var(--hf-secondary-l2)" : "#fff",
            transition: "background 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {status === "loading" ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid #fff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Analysing…
            </>
          ) : (
            "Explain this document"
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <p
          style={{
            fontSize: 11,
            color: "var(--hf-secondary-l2)",
            lineHeight: 1.5,
            margin: "12px 0 0",
            textAlign: "center",
          }}
        >
          For best results, upload one document at a time. For long contracts,
          uploading smaller sections gives more accurate results. Your file is
          sent securely to Claude AI and is not stored.
        </p>
      </div>
    </div>
  );
}

function ResultView({
  result,
  onReset,
}: {
  result: ExplainResult;
  onReset: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AppHeader />
      <div className="page-container">
        <button
          onClick={onReset}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "16px 0 4px",
            fontSize: 13,
            color: "var(--hf-secondary-l2)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Explain another
        </button>

        {/* Needs professional banner */}
        {result.needsProfessional && (
          <div
            style={{
              background: "var(--hf-error-l1)",
              borderLeft: "3px solid var(--hf-error)",
              borderRadius: "0 8px 8px 0",
              padding: "12px 14px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--hf-error)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              This document likely requires professional review before you sign
              or act on it. Consider consulting your Notary or a lawyer.
            </p>
          </div>
        )}

        {/* Document type + summary */}
        <section style={{ marginBottom: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--hf-blue)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              margin: "0 0 6px",
            }}
          >
            {result.documentType}
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--hf-secondary)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {result.summary}
          </p>
        </section>

        {/* Key facts grid */}
        {result.keyFacts?.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {result.keyFacts.map((fact, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "var(--card-shadow)",
                  padding: "10px 12px",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--hf-secondary-l2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: "0 0 3px",
                  }}
                >
                  {fact.label}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--hf-secondary)",
                    margin: 0,
                    lineHeight: 1.4,
                    fontWeight: 500,
                  }}
                >
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Key clause */}
        <div
          style={{
            background: "var(--hf-primary-l5)",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--hf-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: "0 0 6px",
            }}
          >
            Key clause to understand
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--hf-secondary)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {result.keyClause}
          </p>
        </div>

        {/* Watch out */}
        {result.watchOut && (
          <div
            style={{
              background: "var(--hf-warning-l2)",
              borderLeft: "3px solid var(--hf-warning)",
              borderRadius: "0 8px 8px 0",
              padding: "12px 14px",
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--hf-warning-dark)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 6px",
              }}
            >
              Watch out for
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--hf-secondary)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {result.watchOut}
            </p>
          </div>
        )}

        {/* Questions to ask */}
        {result.questionsToAsk?.length > 0 && (
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "var(--card-shadow)",
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--hf-secondary-l2)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 10px",
              }}
            >
              Questions to ask your notary or lawyer
            </p>
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {result.questionsToAsk.map((q, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 13,
                    color: "var(--hf-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {q}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Disclaimer */}
        <p
          style={{
            fontSize: 11,
            color: "var(--hf-secondary-l2)",
            lineHeight: 1.6,
            margin: "0 0 20px",
            padding: "12px 14px",
            background: "#f5f7f9",
            borderRadius: 8,
          }}
        >
          <strong>Disclaimer:</strong> This analysis is AI-generated and
          informational only. It is not legal or financial advice. When in
          doubt, consult your notary or a qualified professional before making
          any payment.
        </p>

        <button
          onClick={onReset}
          style={{
            width: "100%",
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            border: "1px solid var(--hf-primary-l4)",
            cursor: "pointer",
            background: "#fff",
            color: "var(--hf-secondary)",
          }}
        >
          Explain another document
        </button>
      </div>
    </div>
  );
}
