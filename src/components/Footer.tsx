import Link from "next/link";
import { SocialShare } from "./SocialShare";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-center">
          <SocialShare className="justify-center" />
        </div>
        <p className="mb-3 text-center text-xs text-slate-500">
          Your 30 seconds of feedback help us build what you need →
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm">
          <Link
            href="/feedback"
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Give feedback
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/terms" className="text-slate-500 hover:text-indigo-600 hover:underline">
            Terms of Service
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/privacy" className="text-slate-500 hover:text-indigo-600 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
