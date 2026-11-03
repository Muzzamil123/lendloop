"use client";

import type { FunctionReturnType } from "convex/server";
import { CalendarRange, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { ActivityLine, Card, Empty, StatusBadge } from "../ui";

export type LoanRow = FunctionReturnType<typeof api.loans.myRequests>[number];

function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function LoanList({
  loans,
  empty,
  who,
  actions,
}: {
  loans: LoanRow[] | undefined;
  empty: string;
  who: (loan: LoanRow) => string;
  actions?: (loan: LoanRow) => ReactNode;
}) {
  if (loans === undefined) return <p className="text-stone-500">Loading…</p>;
  if (loans.length === 0) return <Empty icon={<Inbox className="h-8 w-8" />} title={empty} />;
  return (
    <div className="grid gap-3">
      {loans.map((loan) => (
        <Card key={loan._id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{loan.toolName}</p>
                <StatusBadge status={loan.status} overdue={loan.overdue} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
                <CalendarRange className="h-4 w-4" aria-hidden />
                {formatDay(loan.startDate)} – {formatDay(loan.endDate)} · {who(loan)}
              </p>
              <ActivityLine activity={loan.lastActivity} />
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions(loan)}</div>}
          </div>
        </Card>
      ))}
    </div>
  );
}
