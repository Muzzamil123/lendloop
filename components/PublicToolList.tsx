"use client";

import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { labelFor } from "@/lib/labels";
import { CategoryIcon } from "./CategoryIcon";
import { Empty } from "./ui";

export function PublicToolList() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) return <p className="text-stone-500">Loading tools…</p>;
  if (tools.length === 0) {
    return <Empty icon={<Package className="h-8 w-8" />} title="No tools listed yet">Be the first to lend one.</Empty>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <CategoryIcon category={tool.category} />
          <div>
            <p className="font-medium">{tool.name}</p>
            <p className="text-sm text-stone-500">{labelFor(tool.category)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
