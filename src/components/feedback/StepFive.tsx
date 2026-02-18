"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { FeedbackFormData } from "@/lib/validations/feedback";
import { DISAPPEAR_OPTIONS, WOULD_RECOMMEND_OPTIONS } from "@/lib/validations/feedback";

type Props = {
  control: Control<FeedbackFormData>;
  errors: FieldErrors<FeedbackFormData>;
};

/**
 * Step 5: Value Exchange & Contact — disappear reaction, would recommend, optional email.
 */
export function StepFive({ control, errors }: Props) {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Last step — and we&apos;ll give you something useful</h2>

      <div>
        <label htmlFor="disappear_reaction" className="mb-2 block text-sm font-medium text-slate-700">
          If this tool disappeared tomorrow, what would you do? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="disappear_reaction"
          control={control}
          rules={{ required: "Required" }}
          render={({ field }) => (
            <select
              id="disappear_reaction"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900"
              {...field}
            >
              <option value="">Select…</option>
              {DISAPPEAR_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        />
        {errors.disappear_reaction && <p className="mt-1 text-sm text-red-600">{errors.disappear_reaction.message}</p>}
      </div>

      <div>
        <label htmlFor="would_recommend" className="mb-2 block text-sm font-medium text-slate-700">
          Would you recommend Resume Comparison Engine to a colleague? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="would_recommend"
          control={control}
          rules={{ required: "Required" }}
          render={({ field }) => (
            <select
              id="would_recommend"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900"
              {...field}
            >
              <option value="">Select…</option>
              {WOULD_RECOMMEND_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        />
        {errors.would_recommend && <p className="mt-1 text-sm text-red-600">{errors.would_recommend.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Drop your email to receive a personalized hiring tip based on your answers
        </label>
        <p className="mb-2 text-xs text-slate-500">We&apos;ll send one useful email — no spam, ever.</p>
        <Controller
          name="email"
          control={control}
          rules={{
            validate: (v) => {
              if (!v || v.trim() === "") return true;
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Invalid email";
            },
          }}
          render={({ field }) => (
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400"
              {...field}
            />
          )}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>
    </div>
  );
}
