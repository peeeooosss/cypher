"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f4f4f4",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <p style={{ color: "#ff2b2b", fontSize: "12px", letterSpacing: "0.2em", fontWeight: 700 }}>
            SOMETHING BROKE
          </p>
          <h1 style={{ fontSize: "2rem", textTransform: "uppercase", margin: "8px 0" }}>
            The circle dropped
          </h1>
          <p style={{ color: "#9a9a9a", fontSize: "14px" }}>
            {error.digest ? `Reference ${error.digest}. ` : ""}Reload to get back in.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "16px",
              height: "44px",
              padding: "0 20px",
              borderRadius: "8px",
              border: "none",
              background: "#ff2b2b",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
