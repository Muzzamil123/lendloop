"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEnsureUser } from "./EnsureUser";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/tools", label: "All tools" },
  { href: "/my-listings", label: "My listings" },
  { href: "/my-requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { me, error } = useEnsureUser();
  const links = me?.role === "admin" ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <UserButton />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 text-sm">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 font-medium ${
                  active
                    ? "border-teal-700 text-teal-800"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-stone-500">{subtitle}</p>}
        </div>
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{error}</p>
        ) : me ? (
          children
        ) : (
          <p className="text-stone-500">Loading…</p>
        )}
      </main>
    </div>
  );
}
