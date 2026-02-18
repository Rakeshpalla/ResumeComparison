"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { feedbackFormSchema, type FeedbackFormData } from "@/lib/validations/feedback";
import { ProgressBar } from "@/components/feedback/ProgressBar";
import { StepOne } from "@/components/feedback/StepOne";
import { StepTwo } from "@/components/feedback/StepTwo";
import { StepThree } from "@/components/feedback/StepThree";
import { StepFour } from "@/components/feedback/StepFour";
import { StepFive } from "@/components/feedback/StepFive";
import Link from "next/link";

const TOTAL_STEPS = 5;

const defaultValues: Partial<FeedbackFormData> = {
  role: undefined,
  resumes_per_role: undefined,
  previous_method: undefined,
  pain_point: "",
  usefulness_rating: 0,
  valuable_features: [],
  confidence_after: undefined,
  missing_features: [],
  missing_other: "",
  open_feedback: "",
  disappear_reaction: undefined,
  would_recommend: undefined,
  email: "",
};

export default function FeedbackPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema) as never,
    defaultValues,
    mode: "onChange",
  });

  const { control, handleSubmit, watch, trigger } = form;
  const errors = form.formState.errors;
  const values = watch();
  const canGoNext =
    step === 1
      ? !!(values.role && values.resumes_per_role)
      : step === 2
        ? !!(values.previous_method && (values.pain_point?.trim()?.length ?? 0) > 0)
        : step === 3
          ? (values.usefulness_rating ?? 0) >= 1 &&
            (values.valuable_features?.length ?? 0) >= 1 &&
            !!values.confidence_after
          : step === 4
            ? true
            : !!(values.disappear_reaction && values.would_recommend);

  /** Whether current step's required fields are valid */
  const canProceed = async (): Promise<boolean> => {
    const stepFields: (keyof FeedbackFormData)[][] = [
      ["role", "resumes_per_role"],
      ["previous_method", "pain_point"],
      ["usefulness_rating", "valuable_features", "confidence_after"],
      [],
      ["disappear_reaction", "would_recommend"],
    ];
    const fields = stepFields[step - 1];
    if (fields.length === 0) return true;
    const result = await trigger(fields);
    return result;
  };

  const onNext = async () => {
    const ok = await canProceed();
    if (ok && step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const onBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const onSubmit = async (data: FeedbackFormData) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        email: data.email?.trim() || null,
        missing_other: data.missing_other || "",
        open_feedback: data.open_feedback || "",
      };
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }
      const result = await res.json();
      const params = new URLSearchParams();
      if (result.usefulness_rating != null) params.set("rating", String(result.usefulness_rating));
      window.location.href = `/feedback/thank-you?${params.toString()}`;
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to app
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Product feedback</h1>
        <p className="mt-1 text-slate-600">Help us improve the Resume Comparison Engine.</p>
      </div>

      <ProgressBar step={step} total={TOTAL_STEPS} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        {step === 1 && <StepOne control={control} errors={errors} />}
        {step === 2 && <StepTwo control={control} errors={errors} />}
        {step === 3 && <StepThree control={control} errors={errors} />}
        {step === 4 && <StepFour control={control} errors={errors} />}
        {step === 5 && <StepFive control={control} errors={errors} />}

        {submitError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          ) : null}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting…
                </span>
              ) : (
                "Submit"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
