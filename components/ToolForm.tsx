"use client";

import { useState } from "react";
import { CATEGORIES, CONDITIONS, labelFor, type Category, type Condition } from "@/lib/labels";
import { Button, ErrorText, Field, inputClass } from "./ui";

export type ToolValues = {
  name: string;
  category: Category;
  condition: Condition;
  description: string;
};

const EMPTY: ToolValues = { name: "", category: "power_tools", condition: "good", description: "" };

export function ToolForm({
  initial = EMPTY,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ToolValues;
  submitLabel: string;
  onSubmit: (values: ToolValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<ToolValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const message = await onSubmit(values);
    setSaving(false);
    setError(message);
    if (!message && initial === EMPTY) setValues(EMPTY);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Tool name">
        <input
          className={inputClass}
          placeholder="e.g. Cordless drill"
          value={values.name}
          maxLength={80}
          required
          onChange={(e) => setValues({ ...values, name: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            className={inputClass}
            value={values.category}
            onChange={(e) => setValues({ ...values, category: e.target.value as Category })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelFor(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Condition">
          <select
            className={inputClass}
            value={values.condition}
            onChange={(e) => setValues({ ...values, condition: e.target.value as Condition })}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {labelFor(c)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description (optional)">
        <textarea
          className={inputClass}
          placeholder="Anything a borrower should know"
          rows={3}
          maxLength={500}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <ErrorText message={error} />
    </form>
  );
}
