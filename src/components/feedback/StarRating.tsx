"use client";

import { useState } from "react";

/**
 * Clickable 1–5 star rating. Highlights on hover and selection.
 */
export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex gap-1" role="group" aria-label="Rate 1 to 5 stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-60 disabled:pointer-events-none"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-pressed={value === star}
        >
          <span
            className={`text-2xl ${
              star <= display
                ? "text-amber-400"
                : "text-zinc-600"
            }`}
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
