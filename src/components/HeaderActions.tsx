"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

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
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-20" />
      </div>
    );
  }

  const path = pathname ?? "";
  const showHomeButton = !path.startsWith("/upload");

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
          clearClientState();
          window.location.href = "/api/auth/logout";
        }}
      >
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}

