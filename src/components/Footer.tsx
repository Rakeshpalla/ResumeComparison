import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
        <Link href="/terms" className="hover:text-indigo-600 hover:underline">
          Terms of Service
        </Link>
        <span className="text-slate-300">|</span>
        <Link href="/privacy" className="hover:text-indigo-600 hover:underline">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
