"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Cloud } from "lucide-react";
import { DocumentAnalyzer } from "../../../components/DocumentAnalyzer";
import { EmailCaptureModal } from "../../../components/EmailCaptureModal";
import { trackUpload } from "../../../lib/analytics-events";

type UploadStatus = "idle" | "uploading" | "processing" | "complete" | "error";

type UploadedDoc = {
  id: string;
  filename: string;
};

const glassCard =
  "rounded-3xl border border-white/40 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl";

export default function UploadPage() {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploaded, setIsUploaded] = useState(false);
  const [currentUploadName, setCurrentUploadName] = useState<string | null>(null);
  const [contextText, setContextText] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [showJdInput, setShowJdInput] = useState(true);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const pendingSessionIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allowedTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem("uploadContextText") || "";
      if (stored.trim().length > 0) {
        setContextText(stored);
        setShowJdInput(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const trimmed = contextText.trim();
      if (!trimmed) window.sessionStorage.removeItem("uploadContextText");
      else window.sessionStorage.setItem("uploadContextText", trimmed);
    } catch {
      // ignore
    }
  }, [contextText]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function resetFlow() {
    setError(null);
    setStatus("idle");
    setSessionId(null);
    sessionIdRef.current = null;
    setUploadedDocs([]);
    setIsUploaded(false);
    setCurrentUploadName(null);
  }

  function validateFiles(fileArray: File[]) {
    if (fileArray.length < 2 || fileArray.length > 25) {
      return "Upload between 2 and 25 files (PDF or DOCX).";
    }
    if (fileArray.some((file) => !allowedTypes.has(file.type))) {
      return "Only PDF and DOCX files are supported.";
    }
    return null;
  }

  function handleSelectFiles(files: FileList | null) {
    setError(null);
    const fileArray = files ? Array.from(files) : [];
    if (fileArray.length === 0) return;
    const validationError = validateFiles(fileArray);
    if (validationError) {
      setSelectedFiles([]);
      setError(validationError);
      return;
    }
    resetFlow();
    setSelectedFiles(fileArray);
  }

  async function uploadSelectedFiles() {
    setError(null);
    setUploadedDocs([]);
    setCurrentUploadName(null);
    if (selectedFiles.length === 0) {
      setError("Select 2–25 files first.");
      return false;
    }
    const validationError = validateFiles(selectedFiles);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setStatus("uploading");
    try {
      let sessionResponse = await fetch("/api/sessions", { method: "POST", credentials: "include" });
      if (sessionResponse.status === 401) {
        const guestRes = await fetch("/api/auth/guest", { method: "POST", credentials: "include" });
        if (!guestRes.ok) {
          setError("Unable to start session. Please try again.");
          setStatus("error");
          return false;
        }
        sessionResponse = await fetch("/api/sessions", { method: "POST", credentials: "include" });
      }
      if (sessionResponse.status === 401) {
        setError("Session expired. Please try again.");
        setStatus("error");
        return false;
      }
      if (!sessionResponse.ok) {
        const body = await sessionResponse.json();
        throw new Error(body.error || "Failed to create session.");
      }
      const sessionData = await sessionResponse.json();
      const currentSessionId = sessionData.sessionId as string;
      setSessionId(currentSessionId);
      sessionIdRef.current = currentSessionId;

      const trimmedContext = contextText.trim();
      if (trimmedContext.length > 0) {
        try {
          window.localStorage.setItem(`jdText:${currentSessionId}`, trimmedContext);
        } catch {
          // ignore
        }
      }

      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(
          `/api/sessions/${currentSessionId}/documents/upload`,
          {
            method: "POST",
            credentials: "include",
            body: formData
          }
        );

        if (uploadResponse.status === 401) {
          window.location.href = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === "true" ? "/login" : "/upload";
          throw new Error("Unauthorized");
        }
        if (!uploadResponse.ok) {
          const body = await uploadResponse.json();
          throw new Error(body.error || `Upload failed for ${file.name}.`);
        }

        const data = await uploadResponse.json();
        return { id: data.documentId, filename: file.name };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedDocs(results);
      setCurrentUploadName(null);
      setIsUploaded(true);
      setStatus("idle");

      trackUpload(selectedFiles.length, contextText.trim().length > 0);

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error.";
      const isNetwork =
        msg === "Failed to fetch" ||
        msg.includes("network") ||
        msg.includes("abort") ||
        msg.includes("Load failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("connection");
      setError(
        isNetwork
          ? "Upload failed (connection reset or network error). Ensure Docker is running and MinIO is up (run in project folder: docker compose up -d). Try again or use fewer/smaller files."
          : msg
      );
      setStatus("error");
      return false;
    }
  }

  async function generateInsights() {
    setError(null);
    const id = sessionIdRef.current || sessionId;
    if (!id) {
      setError("Upload files first (or click \"Generate insights\" again after upload completes).");
      return false;
    }
    setStatus("processing");
    try {
      const processResponse = await fetch(`/api/sessions/${id}/process`, {
        method: "POST"
      });
      if (processResponse.status === 401) {
        window.location.href = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === "true" ? "/login" : "/upload";
        return false;
      }
      const body = await processResponse.json().catch(() => ({}));
      if (!processResponse.ok) {
        throw new Error(body.error || "Failed to process resumes.");
      }
      if (body.status === "FAILED") {
        throw new Error("Analysis failed for one or more resumes. Please try again.");
      }
      setStatus("complete");
      // Show email gate before revealing results
      pendingSessionIdRef.current = id;
      setShowEmailGate(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStatus("error");
      return false;
    }
  }

  async function runGenerateInsights() {
    setError(null);
    if (selectedFiles.length === 0) {
      setError("Select 2–25 files first.");
      return;
    }
    if (!isUploaded || !sessionId) {
      const ok = await uploadSelectedFiles();
      if (!ok) return;
    }
    await generateInsights();
  }

  function handleEmailSuccess() {
    setShowEmailGate(false);
    const id = pendingSessionIdRef.current;
    if (id) window.location.replace(`/compare/${id}`);
  }

  const currentStep = selectedFiles.length === 0 ? 1 : isUploaded ? 3 : 2;

  const stepItems = [
    { num: 1, label: "Add JD", sub: "Optional", icon: "📝" },
    { num: 2, label: "Upload", sub: "Resumes", icon: "📤" },
    { num: 3, label: "Generate", sub: "Analysis", icon: "🎯" }
  ] as const;

  return (
    <>
    {showEmailGate && <EmailCaptureModal onSuccess={handleEmailSuccess} />}
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-36 -right-40 h-[560px] w-[560px] rounded-full bg-[#EFF6FF] blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 h-[560px] w-[560px] rounded-full bg-[#F3E8FF] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <motion.div
          className="mb-10 text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Upload Resumes
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base font-medium text-slate-600">
            Upload 2–25 resumes and get instant side-by-side comparison with AI-powered insights
          </p>
        </motion.div>

        {/* Progress: glass spheres + glowing line */}
        <div className="mb-10 px-2">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {stepItems.map((step, idx) => (
              <div key={step.num} className="flex min-w-0 flex-1 items-center">
                <div className="flex w-full flex-col items-center">
                  <div
                    className={[
                      "relative flex h-12 w-12 items-center justify-center rounded-full border text-lg shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all sm:h-14 sm:w-14",
                      currentStep >= step.num
                        ? "border-white/60 bg-white/80 ring-2 ring-indigo-400/35"
                        : "border-slate-200/80 bg-slate-100/80 text-slate-400"
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute inset-0 rounded-full bg-gradient-to-br opacity-40",
                        currentStep >= step.num ? "from-white to-indigo-100/50" : "from-transparent to-transparent"
                      ].join(" ")}
                      aria-hidden
                    />
                    <span className="relative z-[1] font-bold text-slate-800">
                      {currentStep > step.num ? "✓" : step.icon}
                    </span>
                  </div>
                  <p className="mt-2 hidden text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:block md:text-xs">
                    <span className="block text-slate-900">{step.label}</span>
                    <span className="font-medium text-slate-500">{step.sub}</span>
                  </p>
                </div>
                {idx < 2 && (
                  <div className="mx-1 h-1.5 min-w-[12px] flex-1 overflow-hidden rounded-full bg-slate-200/90 sm:mx-3">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 shadow-[0_0_24px_rgba(99,102,241,0.45)]"
                      initial={false}
                      animate={{
                        width: currentStep > step.num ? "100%" : currentStep === step.num ? "55%" : "0%"
                      }}
                      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: JD */}
          <motion.div
            className={`${glassCard} overflow-hidden transition hover:shadow-[0_24px_60px_rgba(0,0,0,0.07)]`}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45 }}
          >
            <button
              type="button"
              onClick={() => setShowJdInput(!showJdInput)}
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-white/50"
              disabled={status === "uploading" || status === "processing"}
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-inner shadow-white/60">
                  <span className="text-xl">📝</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">
                    Step 1: Job description{" "}
                    <span className="text-sm font-medium text-slate-500">(optional)</span>
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {contextText.trim().length > 0
                      ? `JD added (${contextText.trim().length} chars) — tap to edit`
                      : "Adds keyword fit scores and sharper interview prompts"}
                  </p>
                </div>
              </div>
              <svg
                className={`h-6 w-6 shrink-0 text-slate-400 transition-transform ${showJdInput ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showJdInput && (
              <div className="border-t border-white/40 bg-white/40 px-6 pb-6 pt-2">
                <div className="relative mt-4">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-[#fafafa] shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
                    <textarea
                      className="relative z-[1] w-full resize-y rounded-2xl border-0 bg-transparent px-5 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                      rows={6}
                      value={contextText}
                      placeholder="Paste the job description here (requirements, skills, responsibilities). This helps the AI match candidates to your specific needs and generate targeted interview questions."
                      onChange={(e) => setContextText(e.target.value)}
                      disabled={status === "uploading" || status === "processing"}
                    />
                    <div
                      className="pointer-events-none absolute bottom-0 right-0 z-[2] h-12 w-12 rounded-tl-2xl bg-gradient-to-br from-white/90 to-slate-100/90 shadow-[-6px_-6px_16px_rgba(0,0,0,0.06)]"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute bottom-1 right-1 z-[3] h-7 w-7 rotate-[-6deg] rounded-sm border border-slate-200/80 bg-white shadow-md"
                      aria-hidden
                    />
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-xs font-medium text-slate-500">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      <strong className="text-slate-700">Tip:</strong> Paste the full JD or just must-haves. More
                      detail improves role-fit scoring.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Step 2: Upload */}
          <motion.div
            className={`${glassCard} transition hover:shadow-[0_24px_60px_rgba(0,0,0,0.07)]`}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 shadow-inner shadow-white/60">
                  <span className="text-xl">📤</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Step 2: Upload resumes</h3>
                  <p className="mt-1 text-sm font-medium text-slate-600">2–25 candidate files (PDF or DOCX)</p>
                </div>
              </div>

              <input
                id="resume-file-input"
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                onChange={(event) => {
                  const files = event.target.files;
                  handleSelectFiles(files);
                  event.target.value = "";
                }}
                disabled={status === "uploading" || status === "processing"}
              />

              <div
                role="button"
                tabIndex={0}
                className={[
                  "group relative overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all",
                  isDragging
                    ? "border-indigo-400 bg-indigo-50/80 shadow-[0_20px_50px_rgba(99,102,241,0.15)]"
                    : "border-slate-200/90 bg-white/50 hover:border-indigo-200 hover:bg-white/80"
                ].join(" ")}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (status === "uploading" || status === "processing") return;
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (status === "uploading" || status === "processing") return;
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (status === "uploading" || status === "processing") return;
                  const dt = e.dataTransfer;
                  if (!dt) return;
                  let fileList: FileList | null = dt.files;
                  if ((!fileList || fileList.length === 0) && dt.items?.length) {
                    const files: File[] = [];
                    for (let i = 0; i < dt.items.length; i++) {
                      const item = dt.items[i];
                      if (item.kind === "file") {
                        const f = item.getAsFile();
                        if (f) files.push(f);
                      }
                    }
                    if (files.length > 0) {
                      const dataTransfer = new DataTransfer();
                      files.forEach((file) => dataTransfer.items.add(file));
                      fileList = dataTransfer.files;
                    }
                  }
                  handleSelectFiles(fileList);
                }}
                onClick={() => {
                  if (status === "uploading" || status === "processing") return;
                  openFilePicker();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (status === "uploading" || status === "processing") return;
                    openFilePicker();
                  }
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-violet-500/[0.05] opacity-0 transition-opacity group-hover:opacity-100" />

                <motion.div
                  className="relative z-[1] mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 to-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_40px_rgba(15,23,42,0.08)] ring-1 ring-white/80"
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          y: [0, -5, 0],
                          scale: [1, 1.03, 1]
                        }
                  }
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Cloud
                    className={`h-10 w-10 ${isDragging ? "text-indigo-600" : "text-indigo-500"}`}
                    strokeWidth={1.25}
                    aria-hidden
                  />
                </motion.div>

                <h4 className="relative z-[1] mt-5 font-display text-base font-semibold text-slate-900">
                  {isDragging ? "Drop files here" : "Drag & drop resumes"}
                </h4>
                <p className="relative z-[1] mt-1 text-sm font-medium text-slate-600">or click to browse</p>

                <button
                  type="button"
                  className="relative z-[1] mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-14px_rgba(37,99,235,0.55)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFilePicker();
                  }}
                  disabled={status === "uploading" || status === "processing"}
                >
                  <Cloud className="h-5 w-5" strokeWidth={2} aria-hidden />
                  Select files
                </button>

                <p className="relative z-[1] mt-4 text-xs font-medium text-slate-500">
                  PDF &amp; DOCX · min 2 · max 25 files
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Selected ({selectedFiles.length})</p>
                    {!isUploaded && status !== "uploading" && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        onClick={() => {
                          resetFlow();
                          setSelectedFiles([]);
                        }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {selectedFiles.map((file) => {
                      const isDone = uploadedDocs.some((d) => d.filename === file.name);
                      const isActive = currentUploadName === file.name && status === "uploading";
                      return (
                        <div
                          key={file.name}
                          className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/60 p-3 shadow-sm backdrop-blur-sm"
                        >
                          <div
                            className={[
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner",
                              isDone
                                ? "bg-emerald-100 text-emerald-700"
                                : isActive
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-500"
                            ].join(" ")}
                          >
                            {isDone ? (
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isActive ? (
                              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                            <p className="text-xs font-medium text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <span
                            className={[
                              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                              isDone
                                ? "border border-emerald-200/60 bg-emerald-50/90 text-emerald-800"
                                : isActive
                                  ? "border border-indigo-200/60 bg-indigo-50/90 text-indigo-800"
                                  : "border border-slate-200/60 bg-slate-50 text-slate-600"
                            ].join(" ")}
                          >
                            {isDone ? "Uploaded" : isActive ? "Uploading…" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 p-4 text-rose-900 shadow-sm backdrop-blur-sm">
                  <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {isUploaded && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm backdrop-blur-sm">
                  <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Files uploaded successfully</p>
                    <p className="mt-1 text-xs font-medium text-emerald-800/90">
                      Run <span className="font-semibold">Generate Analysis</span> below to compare candidates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Step 3 */}
          {selectedFiles.length > 0 && (
            <motion.div
              className={`${glassCard} p-6 transition hover:shadow-[0_24px_60px_rgba(0,0,0,0.07)] sm:p-8`}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 shadow-inner shadow-white/60">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Step 3: Generate analysis</h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {status === "processing"
                        ? "Analyzing resumes… (usually 15–30 seconds)"
                        : "Ready to score and compare candidates"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-[0_18px_45px_-14px_rgba(37,99,235,0.55)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                  onClick={() => void runGenerateInsights()}
                  disabled={status === "uploading" || status === "processing" || selectedFiles.length === 0}
                >
                  {status === "processing" ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing…
                    </>
                  ) : status === "uploading" ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <span>Generate Analysis</span>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {status === "uploading" && (
                <div className="mt-6">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200/90">
                    <div
                      className="h-full animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{ width: "60%" }}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs font-medium text-slate-500">
                    {currentUploadName ? `Uploading ${currentUploadName}…` : "Uploading…"}
                  </p>
                </div>
              )}
              {status === "processing" && (
                <div className="mt-6">
                  <DocumentAnalyzer
                    compact
                    title="Analyzing resumes"
                    subtitle="Usually 15–30 seconds. Extracting text, scoring dimensions, and generating insights."
                  />
                </div>
              )}
            </motion.div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Instant analysis",
                body: "Side-by-side comparison in seconds",
                icon: (
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              {
                title: "Structured insights",
                body: "Decision-ready scores and evidence",
                icon: (
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                )
              },
              {
                title: "Secure & private",
                body: "Encrypted; auto-deleted after 7 days",
                icon: (
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )
              }
            ].map((card) => (
              <motion.div
                key={card.title}
                className={`${glassCard} p-5`}
                whileHover={reduceMotion ? undefined : { y: -6, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/80">
                  {card.icon}
                </div>
                <h4 className="font-display font-bold tracking-tight text-slate-900">{card.title}</h4>
                <p className="mt-1 text-xs font-medium text-slate-600">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
