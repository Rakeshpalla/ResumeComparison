"use client";

import { useEffect } from "react";

export default function UploadError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Upload page error:", error);
  }, [error]);

  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-800">{error.message}</p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Try again
        </button>
        <a
          href="/login"
          className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
