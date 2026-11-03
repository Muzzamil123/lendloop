"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Undo2, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage, todayUtc } from "@/lib/labels";
import { Button, ErrorText } from "../ui";
import { LoanList } from "./LoanList";

export function IncomingView() {
  const loans = useQuery(api.loans.incoming);
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const [error, setError] = useState<string | null>(null);

  function run(action: (args: { loanId: Id<"loans"> }) => Promise<null>, loanId: Id<"loans">) {
    action({ loanId }).then(() => setError(null), (e) => setError(errorMessage(e)));
  }

  return (
    <div>
      <ErrorText message={error} />
      <LoanList
        loans={loans}
        empty="No requests for your tools yet."
        who={(l) => `requested by ${l.borrowerFirstName}`}
        actions={(l) => (
          <>
            {l.status === "pending" && (
              <>
                <Button onClick={() => run(approve, l._id)}>
                  <Check className="h-4 w-4" aria-hidden /> Approve
                </Button>
                <Button variant="secondary" onClick={() => run(decline, l._id)}>
                  <X className="h-4 w-4" aria-hidden /> Decline
                </Button>
              </>
            )}
            {l.status === "approved" && l.startDate <= todayUtc() && (
              <Button variant="secondary" onClick={() => run(markReturned, l._id)}>
                <Undo2 className="h-4 w-4" aria-hidden /> Mark returned
              </Button>
            )}
          </>
        )}
      />
    </div>
  );
}
