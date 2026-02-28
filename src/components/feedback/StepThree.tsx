"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { FeedbackFormData } from "@/lib/validations/feedback";
import { VALUABLE_FEATURES_OPTIONS, CONFIDENCE_OPTIONS } from "@/lib/validations/feedback";
import { StarRating } from "./StarRating";
import { PillCheckbox } from "./PillCheckbox";

type Props = {
  control: Control<FeedbackFormData>;
  errors: FieldErrors<FeedbackFormData>;
};

/**
 * Step 3: Product Experience — usefulness (star), valuable features (pills), confidence.
 */
export function StepThree({ control, errors }: Props) {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-lg font-semibold text-white">About your experience with the tool</h2>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Overall, how useful was the comparison output? <span className="text-red-400">*</span>
        </label>
        <p className="mb-2 text-xs text-zinc-500">1 = Not useful at all, 5 = Extremely useful</p>
        <Controller
          name="usefulness_rating"
          control={control}
          rules={{ required: "Required", min: { value: 1, message: "Select 1–5" } }}
          render={({ field }) => (
            <StarRating value={field.value || 0} onChange={field.onChange} />
          )}
        />
        {errors.usefulness_rating && <p className="mt-1 text-sm text-red-400">{errors.usefulness_rating.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Which parts of the comparison were most valuable to you? <span className="text-red-400">*</span> (at least one)
        </label>
        <Controller
          name="valuable_features"
          control={control}
          rules={{ required: "Select at least one", minLength: { value: 1, message: "Select at least one" } }}
          render={({ field }) => (
            <PillCheckbox
              options={VALUABLE_FEATURES_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              name="valuable_features"
            />
          )}
        />
        {errors.valuable_features && <p className="mt-1 text-sm text-red-400">{errors.valuable_features.message}</p>}
      </div>

      <div>
        <label htmlFor="confidence_after" className="mb-2 block text-sm font-medium text-zinc-300">
          After using the tool, how confident did you feel in your shortlist? <span className="text-red-400">*</span>
        </label>
        <Controller
          name="confidence_after"
          control={control}
          rules={{ required: "Required" }}
          render={({ field }) => (
            <select
              id="confidence_after"
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2.5 text-white"
              {...field}
            >
              <option value="">Select…</option>
              {CONFIDENCE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        />
        {errors.confidence_after && <p className="mt-1 text-sm text-red-400">{errors.confidence_after.message}</p>}
      </div>
    </div>
  );
}
