"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage, todayUtc } from "@/lib/labels";
import { Button, ErrorText, Field, inputClass } from "./ui";

export function RequestForm({ toolId, onDone }: { toolId: Id<"tools">; onDone: (sent: boolean) => void }) {
  const request = useMutation(api.loans.request);
  const today = todayUtc();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await request({ toolId, startDate, endDate });
      onDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <input type="date" className={inputClass} min={today} value={startDate} required
            onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" className={inputClass} min={startDate} value={endDate} required
            onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Sending…" : "Send request"}</Button>
        <Button type="button" variant="ghost" onClick={() => onDone(false)}>Cancel</Button>
      </div>
      <ErrorText message={error} />
    </form>
  );
}
