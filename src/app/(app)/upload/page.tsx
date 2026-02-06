"use client";

import { useEffect, useRef, useState } from "react";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allowedTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]);

  useEffect(() => {
    try {
      // Session-scoped only: survives refresh, but never persists across logout/login.
      const stored = window.sessionStorage.getItem("uploadContextText") || "";
      if (stored.trim().length > 0) setContextText(stored);
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
    // New selection resets any prior session/upload state.
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

      // Persist context for this session so compare page can immediately use it.
      const trimmedContext = contextText.trim();
      if (trimmedContext.length > 0) {
        try {
          window.localStorage.setItem(`jdText:${currentSessionId}`, trimmedContext);
        } catch {
          // ignore
        }
      }

      const uploaded: UploadedDoc[] = [];

      for (const file of selectedFiles) {
        setCurrentUploadName(file.name);
        const signResponse = await fetch(
          `/api/sessions/${currentSessionId}/documents/sign-upload`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              sizeBytes: file.size
            })
          }
        );

        if (signResponse.status === 401) {
          window.location.href = "/login";
          return false;
        }
        if (!signResponse.ok) {
          const body = await signResponse.json();
          throw new Error(body.error || "Failed to sign upload.");
        }

        const signData = await signResponse.json();
        const uploadResponse = await fetch(signData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error("S3 upload failed.");
        }

        const completeResponse = await fetch(
          `/api/sessions/${currentSessionId}/documents/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              s3Key: signData.s3Key,
              filename: file.name,
              mimeType: file.type,
              sizeBytes: file.size
            })
          }
        );

        if (completeResponse.status === 401) {
          window.location.href = "/login";
          return false;
        }
        if (!completeResponse.ok) {
          const body = await completeResponse.json();
          throw new Error(body.error || "Failed to finalize upload.");
        }

        const completeData = await completeResponse.json();
        uploaded.push({ id: completeData.documentId, filename: file.name });
        setUploadedDocs([...uploaded]);
      }

      setCurrentUploadName(null);
      setIsUploaded(true);
      setStatus("idle");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStatus("error");
      return false;
    }
  }

  async function generateInsights() {
    setError(null);
    const id = sessionIdRef.current || sessionId;
    if (!id) {
      setError("Upload files first (or click “Generate insights” again after upload completes).");
      return false;
    }
    setStatus("processing");
    try {
      const processResponse = await fetch(`/api/sessions/${id}/process`, {
        method: "POST"
      });
      if (processResponse.status === 401) {
        window.location.href = "/login";
        return false;
      }
      if (!processResponse.ok) {
        const body = await processResponse.json();
        throw new Error(body.error || "Failed to start processing.");
      }
      setStatus("complete");
      window.location.href = `/compare/${id}`;
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
    // If user clicks Generate first, we auto-run Step 1 then Step 2.
    if (!isUploaded || !sessionId) {
      const ok = await uploadSelectedFiles();
      if (!ok) return;
    }
    await generateInsights();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Upload documents</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload 2–5 documents (PDF or DOCX). Then generate a decision dashboard.
        </p>
      </div>

      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Context (paste text)
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Recommended for paid value. Paste one of: Job Description, RFP requirements, or Sales buyer context.
            </div>
          </div>
          {contextText.trim().length > 0 ? (
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setContextText("")}
              disabled={status === "uploading" || status === "processing"}
            >
              Clear context
            </button>
          ) : null}
        </div>
        <textarea
          className="mt-3 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
          rows={5}
          value={contextText}
          placeholder="Paste JD / requirements / buyer brief here. (This will be used for ranking + risks + interview questions.)"
          onChange={(e) => setContextText(e.target.value)}
          disabled={status === "uploading" || status === "processing"}
        />
        <div className="mt-2 text-xs text-slate-500">
          Tip: Paste the “Must have” bullets. Avoid personal data you don’t want stored in your browser.
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
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
          className={
            isDragging
              ? "rounded border-2 border-dashed border-emerald-400 bg-emerald-50 p-6 text-center"
              : "rounded border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
          }
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
          <div className="text-sm font-semibold text-slate-900">
            Drag & drop files here
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Upload 2–5 files (PDF or DOCX).
          </div>
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              type="button"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={openFilePicker}
              disabled={status === "uploading" || status === "processing"}
            >
              Browse files
            </button>
            {selectedFiles.length > 0 ? (
              <div className="text-xs text-slate-600">
                Selected {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"}.
              </div>
            ) : (
              <div className="text-xs text-slate-500">No files selected yet.</div>
            )}
          </div>
        </div>

        {selectedFiles.length > 0 ? (
          <div className="mt-4 rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Files ready</div>
                <div className="mt-1 text-xs text-slate-500">
                  Step 1: Upload files securely. Step 2: Generate insights.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => {
                    resetFlow();
                    setSelectedFiles([]);
                  }}
                  disabled={status === "uploading" || status === "processing"}
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => void uploadSelectedFiles()}
                  disabled={
                    status === "uploading" ||
                    status === "processing" ||
                    isUploaded ||
                    selectedFiles.length === 0
                  }
                >
                  {status === "uploading" ? "Uploading..." : isUploaded ? "Uploaded" : "Upload files"}
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => void runGenerateInsights()}
                  disabled={status === "uploading" || status === "processing" || selectedFiles.length === 0}
                >
                  {status === "processing" ? "Generating..." : "Generate insights"}
                </button>
              </div>
            </div>

            {!isUploaded ? (
              <div className="mt-3 text-xs text-slate-500">
                Tip: You can click <span className="font-semibold">Generate insights</span> now — it will upload the files first, then generate the dashboard.
              </div>
            ) : null}

            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {selectedFiles.map((f) => {
                const isDone = uploadedDocs.some((d) => d.filename === f.name);
                const isActive = currentUploadName === f.name && status === "uploading";
                return (
                  <li key={f.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate">{f.name}</div>
                    <div className="shrink-0 text-xs">
                      {isDone ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          Uploaded
                        </span>
                      ) : isActive ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          Uploading…
                        </span>
                      ) : (
                        <span className="rounded bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                          Pending
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {isUploaded ? (
              <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Files uploaded successfully. Click <span className="font-semibold">Generate insights</span> to produce the decision dashboard.
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="mt-2 text-xs text-slate-500">
          Files are validated and stored temporarily. Documents are removed after the session TTL.
        </p>
        {error ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded border border-slate-200 bg-white p-4 text-sm">
        <div className="font-medium text-slate-700">Progress</div>
        <div className="mt-2 text-slate-600">
          {status === "idle" && "Waiting for upload."}
          {status === "uploading" && "Uploading files securely..."}
          {status === "processing" && "Generating insights (extracting and scoring) ..."}
          {status === "complete" && "Completed."}
          {status === "error" && "Stopped due to error."}
        </div>
        {sessionId ? (
          <div className="mt-2 text-xs text-slate-500">
            Session ID: {sessionId}
          </div>
        ) : null}
        {uploadedDocs.length > 0 && selectedFiles.length > 0 ? (
          <ul className="mt-3 text-xs text-slate-500">
            <li>
              Uploaded {uploadedDocs.length}/{selectedFiles.length} files.
            </li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}
