"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function categoryLabel(category: string) {
  return category.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function PublicToolList() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) return <p className="text-stone-500">Loading tools…</p>;
  if (tools.length === 0) {
    return <p className="text-stone-500">No tools listed yet. Be the first to lend one.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {tools.map((tool, i) => (
        <li key={i} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          <p className="font-medium">{tool.name}</p>
          <p className="text-sm text-stone-500">{categoryLabel(tool.category)}</p>
        </li>
      ))}
    </ul>
  );
}
