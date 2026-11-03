"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Inbox, Package, Send, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { useEnsureUser } from "./EnsureUser";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import { Skeleton } from "./ui";

type NavLink = { href: string; label: string; icon: LucideIcon };

const LINKS: NavLink[] = [
  { href: "/tools", label: "All tools", icon: Wrench },
  { href: "/my-listings", label: "My listings", icon: Package },
  { href: "/my-requests", label: "My requests", icon: Send },
  { href: "/incoming", label: "Incoming", icon: Inbox },
];
const ADMIN_LINK: NavLink = { href: "/admin", label: "Admin", icon: ShieldCheck };

function NavLinks({ links, pending }: { links: NavLink[]; pending: number }) {
  const pathname = usePathname();
  return (
    <>
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-teal-50 text-teal-800" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            {href === "/incoming" && pending > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white" aria-label={`${pending} pending`}>
                {pending}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { me, error } = useEnsureUser();
  const incoming = useQuery(api.loans.incoming, me ? {} : "skip");
  const pending = incoming?.filter((l) => l.status === "pending").length ?? 0;
  const links = me?.role === "admin" ? [...LINKS, ADMIN_LINK] : LINKS;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLinks links={links} pending={pending} />
          </nav>
          <UserButton />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          <NavLinks links={links} pending={pending} />
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
          <Skeleton rows={3} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
