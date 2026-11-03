"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

// Syncs the signed-in Clerk user into Convex once auth is ready, then shows
// who Convex thinks the caller is (a quick end-to-end auth check).
export function EnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.ensureCurrentUser);
  const me = useQuery(api.users.me);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    ensure()
      .then(() => setError(null))
      .catch((e: unknown) =>
        setError(e instanceof ConvexError ? String(e.data) : "Could not set up your account."),
      );
  }, [isAuthenticated, ensure]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!me) return <p className="text-sm text-stone-500">Setting up your account…</p>;
  return (
    <p className="text-sm text-stone-600">
      Signed in as <span className="font-medium">{me.name}</span> ({me.role})
    </p>
  );
}
