import Link from "next/link";
import { SocialShare } from "./SocialShare";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#1d1d1f] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-center">
          <SocialShare theme="dark" className="justify-center" />
        </div>
        <p className="mb-4 text-center font-sans text-xs text-slate-400">
          Your 30 seconds of feedback help us build what you need →
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm">
          <Link
            href="/feedback"
            className="font-medium text-indigo-300 transition hover:text-indigo-200 hover:underline"
          >
            Give feedback
          </Link>
          <span className="text-slate-600">|</span>
          <Link href="/terms" className="text-slate-400 transition hover:text-slate-200 hover:underline">
            Terms of Service
          </Link>
          <span className="text-slate-500">|</span>
          <Link href="/privacy" className="text-slate-400 transition hover:text-slate-200 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
