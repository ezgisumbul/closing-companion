"use client";

export default function AppHeader() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 20px",
        background: "#fff",
        borderBottom: "1px solid var(--hf-primary-l4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: 24,
            height: 24,
            background: "var(--hf-primary)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1l1.545 3.13L12 4.635l-2.5 2.435.59 3.44L7 8.885l-3.09 1.625L4.5 7.07 2 4.635l3.455-.505L7 1z"
              fill="#fff"
            />
          </svg>
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--hf-secondary)",
            letterSpacing: "-0.01em",
          }}
        >
          Closing Companion
        </span>
      </div>
    </header>
  );
}
