"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="relative border-t border-white/5 bg-[#1d1d1f] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
              <FileText className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-display text-base font-semibold text-white">
              Resume Comparison Engine
            </span>
          </div>

          {/* Tagline */}
          <p className="text-center text-sm text-zinc-500 md:text-left">
            Built to make hiring faster, fairer, and smarter.
          </p>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/feedback"
              className="text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Give feedback
            </Link>
            <Link
              href="/terms"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Privacy
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} Resume Comparison Engine. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
