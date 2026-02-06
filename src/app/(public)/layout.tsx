import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Resume Comparison Engine
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Make better hiring decisions, faster
            </div>
          </div>
          <div className="hidden text-xs text-slate-500 md:block">
            Consulting-grade · Excel-ready
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </>
  );
}

