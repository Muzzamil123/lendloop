"use client";

// Sign-in-dependent parts of the public page. Rendering them on the client
// keeps the landing page itself static (no request headers at prerender).
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { EnsureUser } from "./EnsureUser";

export function HeaderAuth() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-lg px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <div className="flex items-center gap-3">
          <Link href="/tools" className="rounded-lg px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
            Open app
          </Link>
          <UserButton />
        </div>
      </Show>
    </>
  );
}

export function HeroAuth() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-teal-800">
            Sign in to lend or borrow
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/tools"
            className="rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-teal-800"
          >
            Browse and lend tools →
          </Link>
          <EnsureUser />
        </div>
      </Show>
    </>
  );
}
