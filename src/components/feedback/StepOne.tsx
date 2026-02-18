"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { FeedbackFormData } from "@/lib/validations/feedback";
import { ROLE_OPTIONS, RESUMES_PER_ROLE_OPTIONS } from "@/lib/validations/feedback";

type Props = {
  control: Control<FeedbackFormData>;
  errors: FieldErrors<FeedbackFormData>;
};

/**
 * Step 1: Role & Context — role, resumes per role.
 */
export function StepOne({ control, errors }: Props) {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Tell us a little about yourself</h2>

      <div>
        <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-700">
          What best describes your role? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="role"
          control={control}
          rules={{ required: "Required" }}
          render={({ field }) => (
            <select
              id="role"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900"
              {...field}
            >
              <option value="">Select…</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        />
        {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
      </div>

      <div>
        <label htmlFor="resumes_per_role" className="mb-2 block text-sm font-medium text-slate-700">
          How many resumes do you typically review per open role? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="resumes_per_role"
          control={control}
          rules={{ required: "Required" }}
          render={({ field }) => (
            <select
              id="resumes_per_role"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900"
              {...field}
            >
              <option value="">Select…</option>
              {RESUMES_PER_ROLE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        />
        {errors.resumes_per_role && <p className="mt-1 text-sm text-red-600">{errors.resumes_per_role.message}</p>}
      </div>
    </div>
  );
}
