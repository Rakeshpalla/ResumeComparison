"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function clearClientState() {
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
}

export function HeaderActions() {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Hide on the auth screen to reduce clutter.
  if (pathname.startsWith("/login")) return null;

  const showHomeButton = !pathname.startsWith("/upload");

  return (
    <div className="flex items-center gap-2">
      {showHomeButton && (
        <Link
          href="/upload"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Home
        </Link>
      )}
      <button
        type="button"
        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLoggingOut}
        onClick={async () => {
          setIsLoggingOut(true);
          // Client-side state destruction first (no user data should survive).
          clearClientState();
          // Use a top-level navigation for logout so cookie clearing is handled
          // reliably by the browser, and applies across tabs.
          window.location.href = "/api/auth/logout";
        }}
      >
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}

