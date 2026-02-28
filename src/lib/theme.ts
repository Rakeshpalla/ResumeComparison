/**
 * Design system tokens — premium SaaS (Stripe/Linear/Vercel).
 * Max 6 base colors. 8px spacing. Single gradient family (primary only).
 */

export const theme = {
  colors: {
    bg: "#0f0f14",
    surface: "rgba(30, 30, 40, 0.6)",
    surfaceRaised: "rgba(40, 40, 55, 0.8)",
    primary: "#6366f1",
    primaryHover: "#818cf8",
    muted: "#94a3b8",
    mutedDim: "#64748b",
    foreground: "#f8fafc",
    border: "rgba(148, 163, 184, 0.12)",
  },
  gradient: {
    accent: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
    subtle: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)",
  },
  spacing: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
  },
  shadow: {
    card: "0 1px 3px 0 rgba(0, 0, 0, 0.12), 0 4px 12px -4px rgba(0, 0, 0, 0.2)",
    raised: "0 4px 6px -2px rgba(0, 0, 0, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.25)",
    glow: "0 0 32px -8px rgba(99, 102, 241, 0.35)",
  },
  typography: {
    display: ["Outfit", "system-ui", "sans-serif"],
    sans: ["DM Sans", "system-ui", "sans-serif"],
  },
} as const;
