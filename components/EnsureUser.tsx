"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/labels";

// Syncs the signed-in Clerk user into Convex once auth is ready.
export function useEnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.ensureCurrentUser);
  const me = useQuery(api.users.me);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    ensure()
      .then(() => setError(null))
      .catch((e: unknown) => setError(errorMessage(e)));
  }, [isAuthenticated, ensure]);

  return { me, error };
}

export function EnsureUser() {
  const { me, error } = useEnsureUser();
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!me) return <p className="text-sm text-stone-500">Setting up your account…</p>;
  return (
    <p className="text-sm text-stone-600">
      Signed in as <span className="font-medium">{me.name}</span> ({me.role})
    </p>
  );
}
