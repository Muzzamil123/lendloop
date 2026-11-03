"use client";

import { useMutation, useQuery } from "convex/react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage, labelFor } from "@/lib/labels";
import { CategoryIcon } from "../CategoryIcon";
import { ToolForm, type ToolValues } from "../ToolForm";
import { Availability, Button, Card, Empty, ErrorText } from "../ui";

export function MyListingsView() {
  const tools = useQuery(api.tools.mine);
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Id<"tools"> | null>(null);
  const [rowError, setRowError] = useState<{ id: Id<"tools">; message: string } | null>(null);

  async function save(action: () => Promise<unknown>) {
    try {
      await action();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  return (
    <div className="grid gap-6">
      {adding ? (
        <Card>
          <h2 className="mb-4 font-medium">List a tool</h2>
          <ToolForm
            submitLabel="Add listing"
            onCancel={() => setAdding(false)}
            onSubmit={async (v: ToolValues) => {
              const message = await save(() => create(v));
              if (!message) setAdding(false);
              return message;
            }}
          />
        </Card>
      ) : (
        <div>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden /> List a tool
          </Button>
        </div>
      )}

      {tools === undefined ? (
        <p className="text-stone-500">Loading…</p>
      ) : tools.length === 0 ? (
        <Empty icon={<Package className="h-8 w-8" />} title="You haven't listed any tools yet">
          List something you&apos;re happy to lend.
        </Empty>
      ) : (
        <div className="grid gap-3">
          {tools.map((tool) => (
            <Card key={tool._id}>
              {editing === tool._id ? (
                <ToolForm
                  initial={{
                    name: tool.name,
                    category: tool.category,
                    condition: tool.condition,
                    description: tool.description,
                  }}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (v) => {
                    const message = await save(() => update({ toolId: tool._id, ...v }));
                    if (!message) setEditing(null);
                    return message;
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-start gap-4">
                  <CategoryIcon category={tool.category} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium">{tool.name}</p>
                      <Availability available={tool.availableToday} />
                      {tool.pendingRequests > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {tool.pendingRequests} pending request{tool.pendingRequests === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500">
                      {labelFor(tool.category)} · {labelFor(tool.condition)} condition
                    </p>
                    {tool.description && <p className="mt-1 text-sm text-stone-700">{tool.description}</p>}
                    {rowError?.id === tool._id && <ErrorText message={rowError.message} />}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setEditing(tool._id)}>
                      <Pencil className="h-4 w-4" aria-hidden /> Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={async () => {
                        const message = await save(() => remove({ toolId: tool._id }));
                        setRowError(message ? { id: tool._id, message } : null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
