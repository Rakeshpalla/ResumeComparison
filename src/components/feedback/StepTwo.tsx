"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { FeedbackFormData } from "@/lib/validations/feedback";
import { PREVIOUS_METHOD_OPTIONS } from "@/lib/validations/feedback";

type Props = {
  control: Control<FeedbackFormData>;
  errors: FieldErrors<FeedbackFormData>;
};

/**
 * Step 2: Problem & Pain — previous method, pain point textarea.
 */
export function StepTwo({ control, errors }: Props) {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Before you used Resume Comparison Engine…</h2>

      <div>
        <label htmlFor="previous_method" className="mb-2 block text-sm font-medium text-slate-700">
          How were you comparing resumes before this tool? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="previous_method"
          control={control}
          rules={{ required: "Required" }}
          render={({ field }) => (
            <select
              id="previous_method"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900"
              {...field}
            >
              <option value="">Select…</option>
              {PREVIOUS_METHOD_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        />
        {errors.previous_method && <p className="mt-1 text-sm text-red-600">{errors.previous_method.message}</p>}
      </div>

      <div>
        <label htmlFor="pain_point" className="mb-2 block text-sm font-medium text-slate-700">
          What was the most frustrating part of your old process? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="pain_point"
          control={control}
          rules={{ required: "Required", maxLength: { value: 300, message: "Max 300 characters" } }}
          render={({ field }) => (
            <textarea
              id="pain_point"
              rows={4}
              maxLength={300}
              placeholder="e.g. It took hours and I still wasn't confident in my shortlist…"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400"
              {...field}
            />
          )}
        />
        {errors.pain_point && <p className="mt-1 text-sm text-red-600">{errors.pain_point.message}</p>}
      </div>
    </div>
  );
}
