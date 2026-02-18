"use client";

/**
 * Progress bar for the multi-step feedback form.
 * Fills as steps complete (e.g. Step 2 of 5 → 40%).
 */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const percent = total > 0 ? Math.round((step / total) * 100) : 0;
  return (
    <div className="w-full" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${step} of ${total}`}>
      <div className="mb-1 flex justify-between text-sm text-slate-600">
        <span>Step {step} of {total}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
