import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Resume Comparison Engine",
  description: "Make better hiring decisions, faster"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50">{children}</div>
      </body>
    </html>
  );
}
