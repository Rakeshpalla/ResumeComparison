import { ImageResponse } from "next/og";

export const runtime = "edge";

const SITE_NAME = "Resume Comparison Engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || SITE_NAME;
  const subtitle = searchParams.get("subtitle") || "Compare 2–5 resumes · Consulting-grade";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #5b21b6 100%)",
          padding: 48,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.15)",
            maxWidth: 900,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(to bottom right, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 20,
                color: "rgba(255,255,255,0.85)",
                fontWeight: 600,
              }}
            >
              {SITE_NAME}
            </span>
          </div>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.8)",
                marginTop: 16,
                marginBottom: 0,
                textAlign: "center",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
