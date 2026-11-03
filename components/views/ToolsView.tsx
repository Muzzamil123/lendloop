"use client";

import { useQuery } from "convex/react";
import { BadgeCheck, Check, Search } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, labelFor, type Category } from "@/lib/labels";
import { CategoryIcon } from "../CategoryIcon";
import { RequestForm } from "../RequestForm";
import { Availability, Button, Card, Empty } from "../ui";

export function ToolsView() {
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const tools = useQuery(api.tools.list, { category });
  const [requesting, setRequesting] = useState<Id<"tools"> | null>(null);
  const [sent, setSent] = useState<Id<"tools"> | null>(null);

  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 text-sm">
        {[undefined, ...CATEGORIES].map((c) => (
          <button
            key={c ?? "all"}
            onClick={() => setCategory(c)}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 font-medium transition-colors ${
              category === c
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
            }`}
          >
            {c ? labelFor(c) : "All"}
          </button>
        ))}
      </div>

      {tools === undefined ? (
        <p className="text-stone-500">Loading…</p>
      ) : tools.length === 0 ? (
        <Empty icon={<Search className="h-8 w-8" />} title="Nothing here yet">
          No tools in this category. Try another one, or list your own.
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Card key={tool._id}>
              <div className="flex gap-4">
                <CategoryIcon category={tool.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{tool.name}</p>
                    <Availability available={tool.availableToday} />
                  </div>
                  <p className="text-sm text-stone-500">
                    {labelFor(tool.category)} · {labelFor(tool.condition)} condition
                  </p>
                  {tool.description && <p className="mt-2 text-sm text-stone-700">{tool.description}</p>}
                  <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                    Lent by {tool.isMine ? "you" : tool.ownerFirstName}
                    {tool.ownerTrusted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-800">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Trusted Lender
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {!tool.isMine &&
                (requesting === tool._id ? (
                  <RequestForm
                    toolId={tool._id}
                    onDone={(ok) => {
                      setRequesting(null);
                      setSent(ok ? tool._id : null);
                    }}
                  />
                ) : (
                  <div className="mt-4 flex items-center gap-3 border-t border-stone-100 pt-4">
                    <Button variant="secondary" onClick={() => { setRequesting(tool._id); setSent(null); }}>
                      Request to borrow
                    </Button>
                    {sent === tool._id && (
                      <span className="inline-flex items-center gap-1 text-sm text-teal-700">
                        <Check className="h-4 w-4" aria-hidden /> Request sent
                      </span>
                    )}
                  </div>
                ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
