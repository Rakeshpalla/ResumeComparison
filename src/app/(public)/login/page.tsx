"use client";

import { useState } from "react";

type FormState = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<FormState>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || "")
    };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Authentication failed.");
      }

      window.location.href = "/upload";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">
          {mode === "login" ? "Sign in" : "Create your workspace"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "login"
            ? "Access your decision dashboards and exports."
            : "Start generating decision-grade comparisons and Excel exports."}
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
          />
        </label>
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading
            ? "Processing..."
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>
      </form>

      <button
        className="text-sm text-slate-600 underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        type="button"
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
