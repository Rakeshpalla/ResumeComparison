"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { FeedbackFormData } from "@/lib/validations/feedback";
import { MISSING_FEATURES_OPTIONS } from "@/lib/validations/feedback";
import { PillCheckbox } from "./PillCheckbox";

const SOMETHING_ELSE = "Something else";

type Props = {
  control: Control<FeedbackFormData>;
  errors: FieldErrors<FeedbackFormData>;
};

/**
 * Step 4: Gaps & Wishlist — missing features (pills), "Something else" triggers text field, open feedback.
 */
export function StepFour({ control, errors }: Props) {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Help us build what you actually need</h2>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          What&apos;s currently missing that would make this tool indispensable?
        </label>
        <Controller
          name="missing_features"
          control={control}
          render={({ field }) => (
            <PillCheckbox
              options={MISSING_FEATURES_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              name="missing_features"
            />
          )}
        />
      </div>

      <Controller
        name="missing_features"
        control={control}
        render={({ field }) =>
          field.value.includes(SOMETHING_ELSE) ? (
            <div>
              <label htmlFor="missing_other" className="mb-2 block text-sm font-medium text-slate-700">
                Something else (please specify)
              </label>
              <Controller
                name="missing_other"
                control={control}
                render={({ field: f }) => (
                  <input
                    id="missing_other"
                    type="text"
                    maxLength={200}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900"
                    placeholder="e.g. Custom scoring weights"
                    {...f}
                  />
                )}
              />
            </div>
          ) : (
            <></>
          )
        }
      />

      <div>
        <label htmlFor="open_feedback" className="mb-2 block text-sm font-medium text-slate-700">
          Anything else you&apos;d like us to know or build? (optional)
        </label>
        <Controller
          name="open_feedback"
          control={control}
          rules={{ maxLength: { value: 400, message: "Max 400 characters" } }}
          render={({ field }) => (
            <textarea
              id="open_feedback"
              rows={3}
              maxLength={400}
              placeholder="Your idea, complaint, or feature request…"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400"
              {...field}
            />
          )}
        />
        {errors.open_feedback && <p className="mt-1 text-sm text-red-600">{errors.open_feedback.message}</p>}
      </div>
    </div>
  );
}
