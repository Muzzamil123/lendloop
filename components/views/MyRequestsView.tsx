"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/labels";
import { Button, ErrorText } from "../ui";
import { LoanList } from "./LoanList";

export function MyRequestsView() {
  const loans = useQuery(api.loans.myRequests);
  const cancel = useMutation(api.loans.cancel);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Id<"loans"> | null>(null);

  function cancelRequest(loanId: Id<"loans">) {
    setBusy(loanId);
    cancel({ loanId })
      .then(() => setError(null), (e) => setError(errorMessage(e)))
      .finally(() => setBusy(null));
  }

  return (
    <div>
      <ErrorText message={error} />
      <LoanList
        loans={loans}
        empty="You haven't asked to borrow anything yet."
        who={(l) => `from ${l.ownerFirstName}`}
        actions={(l) =>
          l.status === "pending" ? (
            <Button variant="secondary" disabled={busy === l._id} onClick={() => cancelRequest(l._id)}>
              Cancel request
            </Button>
          ) : null
        }
      />
    </div>
  );
}
