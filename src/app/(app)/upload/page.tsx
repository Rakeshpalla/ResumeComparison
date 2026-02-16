"use client";

import { useEffect, useRef, useState } from "react";
import { DocumentAnalyzer } from "../../../components/DocumentAnalyzer";

type UploadStatus = "idle" | "uploading" | "processing" | "complete" | "error";

type UploadedDoc = {
  id: string;
  filename: string;
};

export default function UploadPage() {
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
    if (fileArray.length < 2 || fileArray.length > 5) {
      return "Upload between 2 and 5 files (PDF or DOCX).";
    }
    if (fileArray.some((file) => !allowedTypes.has(file.type))) {
      return "Only PDF and DOCX files are supported.";
    }
    return null;
  }

  function handleSelectFiles(files: FileList | null) {
    setError(null);
    const fileArray = files ? Array.from(files) : [];
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
      setError("Select 2–5 files first.");
      return false;
    }
    const validationError = validateFiles(selectedFiles);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setStatus("uploading");
    try {
      const sessionResponse = await fetch("/api/sessions", {
        method: "POST"
      });
      if (sessionResponse.status === 401) {
        window.location.href = "/login";
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

      // Server-side proxy upload (avoids CORS with MinIO; more reliable)
      const uploadPromises = selectedFiles.map(async (file) => {
        try {
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
            window.location.href = "/login";
            throw new Error("Unauthorized");
          }
          if (!uploadResponse.ok) {
            const body = await uploadResponse.json();
            throw new Error(body.error || `Upload failed for ${file.name}.`);
          }

          const data = await uploadResponse.json();
          setUploadedDocs(prev => [...prev, { id: data.documentId, filename: file.name }]);
          return { id: data.documentId, filename: file.name };
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err);
          throw err;
        }
      });

      // Wait for all uploads to complete in parallel
      await Promise.all(uploadPromises);

      setCurrentUploadName(null);
      setIsUploaded(true);
      setStatus("idle");
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
      // Run extraction in the request; wait for completion so compare page loads with results (no long "Analyzing" wait there)
      const processResponse = await fetch(`/api/sessions/${id}/process`, {
        method: "POST"
      });
      if (processResponse.status === 401) {
        window.location.href = "/login";
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
      window.location.replace(`/compare/${id}`);
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
      setError("Select 2–5 files first.");
      return;
    }
    if (!isUploaded || !sessionId) {
      const ok = await uploadSelectedFiles();
      if (!ok) return;
    }
    await generateInsights();
  }

  const currentStep = selectedFiles.length === 0 ? 1 : isUploaded ? 3 : 2;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Upload Resumes</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
          Upload 2–5 resumes and get instant side-by-side comparison with data-driven insights
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Add JD (Optional)", icon: "📝" },
            { num: 2, label: "Upload Resumes", icon: "📤" },
            { num: 3, label: "Generate Analysis", icon: "🎯" }
          ].map((step, idx) => (
            <div key={step.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all sm:h-14 sm:w-14 ${
                    currentStep >= step.num
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > step.num ? "✓" : step.icon}
                </div>
                <p className="mt-2 hidden text-xs font-semibold text-slate-700 sm:block md:text-sm">
                  {step.label}
                </p>
              </div>
              {idx < 2 && (
                <div className="mx-2 h-1 flex-1 rounded-full bg-slate-200 sm:mx-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      currentStep > step.num
                        ? "w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                        : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Step 1: Job Description (Optional) */}
        <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <button
            type="button"
            onClick={() => setShowJdInput(!showJdInput)}
            className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-slate-50"
            disabled={status === "uploading" || status === "processing"}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <span className="text-xl">📝</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Step 1: Add Job Description{" "}
                  <span className="text-sm font-normal text-slate-500">(Optional)</span>
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {contextText.trim().length > 0
                    ? `JD added (${contextText.trim().length} chars) • Click to edit`
                    : "Get keyword-aligned fit scores and targeted interview questions"}
                </p>
              </div>
            </div>
            <svg
              className={`h-6 w-6 text-slate-400 transition-transform ${showJdInput ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showJdInput && (
            <div className="border-t border-slate-200 bg-slate-50 p-6">
              <textarea
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                rows={6}
                value={contextText}
                placeholder="Paste the job description here (requirements, skills, responsibilities). This helps the AI match candidates to your specific needs and generate targeted interview questions."
                onChange={(e) => setContextText(e.target.value)}
                disabled={status === "uploading" || status === "processing"}
              />
              <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Tip:</strong> Paste the full JD or just the "Must have" requirements. The more detail you provide, the better the analysis.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Upload Files */}
        <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <span className="text-xl">📤</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Step 2: Upload Resumes</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Upload 2–5 candidate resumes (PDF or DOCX format)
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={(event) => handleSelectFiles(event.target.files)}
              disabled={status === "uploading" || status === "processing"}
            />

            <div
              className={`group relative overflow-hidden rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-slate-100"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                if (status === "uploading" || status === "processing") return;
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (status === "uploading" || status === "processing") return;
                const files = e.dataTransfer.files;
                handleSelectFiles(files);
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />

              <svg
                className={`mx-auto h-16 w-16 transition-colors ${
                  isDragging ? "text-indigo-500" : "text-slate-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>

              <h4 className="mt-4 text-base font-semibold text-slate-900">
                {isDragging ? "Drop files here" : "Drag & drop resumes here"}
              </h4>
              <p className="mt-1 text-sm text-slate-500">or click to browse from your computer</p>

              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={openFilePicker}
                disabled={status === "uploading" || status === "processing"}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Select Files
              </button>

              <p className="mt-4 text-xs text-slate-500">
                Supported: PDF, DOCX • Max: 5 files • Min: 2 files
              </p>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Selected Files ({selectedFiles.length})
                  </p>
                  {!isUploaded && status !== "uploading" && (
                    <button
                      type="button"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
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
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all"
                      >
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                            isDone
                              ? "bg-green-100"
                              : isActive
                              ? "bg-indigo-100"
                              : "bg-slate-100"
                          }`}
                        >
                          {isDone ? (
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isActive ? (
                            <svg className="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isDone
                              ? "bg-green-100 text-green-700"
                              : isActive
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isDone ? "Uploaded" : isActive ? "Uploading..." : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 animate-fade-in flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {isUploaded && (
              <div className="mt-4 animate-fade-in flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900">Files uploaded successfully!</p>
                  <p className="mt-1 text-xs text-green-700">
                    Click "Generate Analysis" below to start comparing resumes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Generate Insights */}
        {selectedFiles.length > 0 && (
          <div className="animate-fade-in rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                  <span className="text-2xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Step 3: Generate Analysis
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {status === "processing"
                      ? "Analyzing resumes… (usually 15–30 seconds)"
                      : "Ready to analyze and compare candidates"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-500/30 transition-all hover:shadow-2xl hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void runGenerateInsights()}
                disabled={status === "uploading" || status === "processing" || selectedFiles.length === 0}
              >
                {status === "processing" ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : status === "uploading" ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Generate Analysis</span>
                    <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>
            </div>

            {status === "uploading" && (
              <div className="mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-white/50">
                  <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-indigo-600 to-purple-600" style={{ width: "60%" }} />
                </div>
                <p className="mt-2 text-center text-xs font-medium text-slate-600">
                  {currentUploadName ? `Uploading ${currentUploadName}...` : "Uploading..."}
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
          </div>
        )}

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900">Instant Analysis</h4>
            <p className="mt-1 text-xs text-slate-600">
              Get comprehensive candidate comparisons in seconds
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900">Excel Export</h4>
            <p className="mt-1 text-xs text-slate-600">
              Download decision-ready Excel files with all insights
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900">Secure & Private</h4>
            <p className="mt-1 text-xs text-slate-600">
              Your data is encrypted and automatically deleted after 7 days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
