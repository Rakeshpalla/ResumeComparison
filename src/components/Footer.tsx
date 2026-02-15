import Link from "next/link";
import { SocialShare } from "./SocialShare";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-center">
          <SocialShare className="justify-center" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-sm text-slate-500">
          <Link href="/terms" className="hover:text-indigo-600 hover:underline">
            Terms of Service
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/privacy" className="hover:text-indigo-600 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
