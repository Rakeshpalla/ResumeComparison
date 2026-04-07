import Link from "next/link";
import { SocialShare } from "./SocialShare";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-center">
          <SocialShare theme="light" className="justify-center" />
        </div>
        <p className="mb-4 text-center font-sans text-xs text-slate-500">
          Your 30 seconds of feedback help us build what you need →
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm">
          <Link
            href="/feedback"
            className="font-medium text-indigo-600 transition hover:text-indigo-800 hover:underline"
          >
            Give feedback
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/terms" className="text-slate-600 transition hover:text-slate-900 hover:underline">
            Terms of Service
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/privacy" className="text-slate-600 transition hover:text-slate-900 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
