"use client";

import type { FunctionReturnType } from "convex/server";
import { CalendarRange, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { ActivityLine, Card, Empty, SectionHeading, Skeleton, StatusBadge } from "../ui";

export type LoanRow = FunctionReturnType<typeof api.loans.myRequests>[number];

function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function LoanCard({ loan, who, actions }: { loan: LoanRow; who: string; actions?: ReactNode }) {
  return (
    <Card className={loan.overdue ? "border-l-4 border-l-red-400" : loan.status === "pending" ? "border-l-4 border-l-amber-400" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{loan.toolName}</p>
            <StatusBadge status={loan.status} overdue={loan.overdue} />
            {loan.toolRemoved && <span className="text-xs text-stone-400">listing removed</span>}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
            <CalendarRange className="h-4 w-4" aria-hidden />
            {formatDay(loan.startDate)} – {formatDay(loan.endDate)} · {who}
          </p>
          <ActivityLine activity={loan.lastActivity} />
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </Card>
  );
}

// Splits loans into open ones (pending or approved) and history, so the
// items that need attention are always at the top.
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
  if (loans === undefined) return <Skeleton rows={3} />;
  if (loans.length === 0) return <Empty icon={<Inbox className="h-8 w-8" />} title={empty} />;

  const open = loans.filter((l) => l.status === "pending" || l.status === "approved");
  const past = loans.filter((l) => l.status !== "pending" && l.status !== "approved");
  const groups = [
    { title: "Open", items: open },
    { title: "History", items: past },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group.title}>
          <SectionHeading title={group.title} count={group.items.length} />
          <div className="grid gap-3">
            {group.items.map((loan) => (
              <LoanCard key={loan._id} loan={loan} who={who(loan)} actions={actions?.(loan)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
