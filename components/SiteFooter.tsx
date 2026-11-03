import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-stone-500">Borrow what you need. Lend what you don&apos;t.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <Link href="/tools" className="text-stone-600 hover:text-stone-900">All tools</Link>
          <Link href="/my-listings" className="text-stone-600 hover:text-stone-900">My listings</Link>
          <Link href="/my-requests" className="text-stone-600 hover:text-stone-900">My requests</Link>
          <Link href="/incoming" className="text-stone-600 hover:text-stone-900">Incoming</Link>
        </nav>
      </div>
      <div className="border-t border-stone-100">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-stone-400">
          LendLoop is a demo project built with Next.js, Clerk, Convex and n8n.
        </p>
      </div>
    </footer>
  );
}
