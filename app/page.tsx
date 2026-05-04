"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import {
  STATE_TAX_RATES,
  DEFAULT_STATE,
  NOTARKOSTEN_RATE,
  GRUNDBUCH_RATE,
  MAKLER_RATE,
} from "@/lib/taxRates";

function fmt(n: number) {
  return "€" + Math.round(n).toLocaleString("de-DE");
}

export default function Home() {
  const router = useRouter();
  const [price, setPrice] = useState(400000);
  const [stateName, setStateName] = useState(DEFAULT_STATE);

  const stateRate = useMemo(
    () => STATE_TAX_RATES.find((s) => s.name === stateName)?.rate ?? 0.06,
    [stateName]
  );

  const grunderwerbsteuer = price * stateRate;
  const notarkosten = price * NOTARKOSTEN_RATE;
  const grundbuch = price * GRUNDBUCH_RATE;
  const makler = price * MAKLER_RATE;
  const totalWithMakler = grunderwerbsteuer + notarkosten + grundbuch + makler;

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AppHeader />

      <div className="page-container">
        {/* ── Hero ── */}
        <section style={{ paddingTop: 28, paddingBottom: 8 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--hf-primary)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}
          >
            After mortgage approval
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "var(--hf-secondary)",
              margin: "0 0 12px",
              lineHeight: 1.3,
            }}
          >
            Your guide to the{" "}
            <em style={{ fontStyle: "normal", color: "var(--hf-primary)" }}>
              6 weeks
            </em>{" "}
            that follow
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--hf-secondary-l2)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Mortgage approved — congratulations. Now comes the part no one explains: notary appointments, payment requests, official letters in German. We&apos;ve got you.
          </p>
        </section>

        {/* ── Feature Cards ── */}
        <section style={{ paddingTop: 24, paddingBottom: 8 }}>
          <div
            className="feature-grid"
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <FeatureCard
              iconBg="var(--hf-primary)"
              icon={<TimelineIcon />}
              title="Smart timeline"
              description="Personalised week-by-week checklist of everything after signing"
              onClick={() => router.push("/timeline")}
            />
            <FeatureCard
              iconBg="var(--hf-peach)"
              icon={<ShieldIcon />}
              title="Check a letter"
              description="Upload any payment request — we'll tell you if it looks legitimate"
              onClick={() => router.push("/validator")}
            />
            <FeatureCard
              iconBg="var(--hf-blue)"
              icon={<ExplainerIcon />}
              title="Explain a document"
              description="Upload any contract or legal letter — we'll explain what it means in plain English"
              onClick={() => router.push("/explainer")}
            />
          </div>
        </section>

        {/* ── Closing Cost Estimator ── */}
        <section style={{ paddingTop: 24 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--hf-secondary-l2)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}
          >
            Closing Cost Estimator
          </p>

          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "var(--card-shadow)",
              padding: "14px 16px",
            }}
          >
            <div
              className="cost-controls"
            style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {/* Purchase price */}
              <div style={{ flex: "1 1 140px", minWidth: 120 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--hf-secondary-l2)",
                    marginBottom: 4,
                  }}
                >
                  Purchase price
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--hf-primary-l4)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    gap: 4,
                  }}
                >
                  <input
                    type="number"
                    value={price}
                    min={0}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: 13,
                      color: "var(--hf-secondary)",
                      background: "transparent",
                    }}
                  />
                  <span style={{ fontSize: 13, color: "var(--hf-secondary-l2)" }}>
                    €
                  </span>
                </div>
              </div>

              {/* Federal state */}
              <div style={{ flex: "1 1 140px", minWidth: 140 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--hf-secondary-l2)",
                    marginBottom: 4,
                  }}
                >
                  Federal state
                </label>
                <div
                  style={{
                    border: "1px solid var(--hf-primary-l4)",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}
                >
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: 13,
                      color: "var(--hf-secondary)",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {STATE_TAX_RATES.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Cost table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <CostRow
                  label="Grunderwerbsteuer"
                  rate={`${(stateRate * 100).toFixed(1)}%`}
                  amount={fmt(grunderwerbsteuer)}
                />
                <CostRow label="Notarkosten" rate="~1.5%" amount={fmt(notarkosten)} />
                <CostRow label="Grundbucheintrag" rate="~0.5%" amount={fmt(grundbuch)} />
                <CostRow label="Maklergebühr (if applicable)" rate="3.57%" amount={fmt(makler)} />
                <tr style={{ background: "var(--hf-primary-l5)" }}>
                  <td
                    style={{
                      padding: "8px 6px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--hf-secondary)",
                      borderTop: "1px solid var(--hf-primary-l4)",
                    }}
                  >
                    Total (incl. Makler)
                  </td>
                  <td
                    className="cost-rate-col"
                    style={{
                      padding: "8px 6px",
                      fontSize: 12,
                      color: "var(--hf-secondary-l2)",
                      borderTop: "1px solid var(--hf-primary-l4)",
                      textAlign: "center",
                    }}
                  />
                  <td
                    style={{
                      padding: "8px 6px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--hf-secondary)",
                      borderTop: "1px solid var(--hf-primary-l4)",
                      textAlign: "right",
                    }}
                  >
                    {fmt(totalWithMakler)}
                  </td>
                </tr>
              </tbody>
            </table>

            <p
              style={{
                fontSize: 11,
                color: "var(--hf-secondary-l2)",
                marginTop: 10,
                marginBottom: 0,
                lineHeight: 1.5,
              }}
            >
              Grunderwerbsteuer rate varies by state. Notarkosten and Grundbucheintrag are approximate. Maklergebühr is typically split equally between buyer and seller.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function FeatureCard({
  iconBg,
  icon,
  title,
  description,
  onClick,
}: {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: hovered ? "var(--card-shadow-hover)" : "var(--card-shadow)",
        padding: "20px 16px",
        cursor: "pointer",
        transition: "box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          background: iconBg,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "var(--hf-secondary)",
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "var(--hf-secondary-l2)",
          margin: 0,
          lineHeight: 1.5,
          flexGrow: 1,
        }}
      >
        {description}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 16,
          color: "var(--hf-primary-l2)",
          alignSelf: "flex-end",
        }}
      >
        →
      </p>
    </div>
  );
}

function CostRow({
  label,
  rate,
  amount,
}: {
  label: string;
  rate: string;
  amount: string;
}) {
  return (
    <tr>
      <td
        style={{
          padding: "7px 6px",
          fontSize: 12,
          color: "var(--hf-secondary)",
          borderBottom: "1px solid var(--hf-grey-l1)",
        }}
      >
        {label}
      </td>
      <td
        className="cost-rate-col"
        style={{
          padding: "7px 6px",
          fontSize: 12,
          color: "var(--hf-secondary-l2)",
          borderBottom: "1px solid var(--hf-grey-l1)",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {rate}
      </td>
      <td
        style={{
          padding: "7px 6px",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--hf-secondary)",
          borderBottom: "1px solid var(--hf-grey-l1)",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {amount}
      </td>
    </tr>
  );
}

/* ── Icons ── */

function TimelineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="5" width="8" height="1.5" rx="0.75" fill="#fff" />
      <rect x="4" y="9" width="12" height="1.5" rx="0.75" fill="#fff" />
      <rect x="4" y="13" width="10" height="1.5" rx="0.75" fill="#fff" />
      <circle cx="2.5" cy="5.75" r="1" fill="#fff" opacity="0.6" />
      <circle cx="2.5" cy="9.75" r="1" fill="#fff" opacity="0.6" />
      <circle cx="2.5" cy="13.75" r="1" fill="#fff" opacity="0.6" />
    </svg>
  );
}

function ExplainerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="10" height="13" rx="1.5" stroke="#fff" strokeWidth="1.5" fill="none" />
      <path d="M6 6h4M6 9h4M6 12h2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="14.5" cy="13.5" r="3" stroke="#fff" strokeWidth="1.4" fill="none" />
      <path d="M16.6 15.6L18 17" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2L4 4.5V9.5C4 13 6.5 16 10 17.5C13.5 16 16 13 16 9.5V4.5L10 2Z"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M7.5 10L9 11.5L12.5 8"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
