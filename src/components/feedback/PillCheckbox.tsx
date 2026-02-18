"use client";

/**
 * Multi-select as pill/tag buttons (not raw checkboxes).
 */
export function PillCheckbox<T extends string>({
  options,
  value,
  onChange,
  disabled,
  name,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  disabled?: boolean;
  name?: string;
}) {
  function toggle(option: T) {
    if (disabled) return;
    const next = value.includes(option)
      ? value.filter((x) => x !== option)
      : [...value, option];
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => toggle(option)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 ${
              selected
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            aria-pressed={selected}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
