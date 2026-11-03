"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage, labelFor } from "@/lib/labels";
import { Button, Card, ConfirmButton, ErrorText, SectionHeading, Skeleton, Stat } from "../ui";
import { LoanList } from "./LoanList";
import { useEnsureUser } from "../EnsureUser";

export function AdminView() {
  const { me } = useEnsureUser();
  if (me?.role !== "admin") return <p className="text-stone-600">This page is for admins.</p>;
  return <AdminPanels />;
}

function AdminPanels() {
  const users = useQuery(api.users.listForAdmin);
  const loans = useQuery(api.loans.listAll);
  const tools = useQuery(api.tools.list, {});
  const setTrusted = useMutation(api.users.setTrustedLender);
  const remove = useMutation(api.tools.remove);
  const [error, setError] = useState<string | null>(null);
  const report = (p: Promise<unknown>) => p.then(() => setError(null), (e) => setError(errorMessage(e)));

  return (
    <div className="grid gap-10">
      <ErrorText message={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Members" value={users?.length} />
        <Stat label="Listings" value={tools?.length} />
        <Stat label="Open loans" value={loans?.filter((l) => l.status === "pending" || l.status === "approved").length} />
        <Stat label="Overdue" value={loans?.filter((l) => l.overdue).length} tone="warn" />
      </div>

      <section>
        <SectionHeading title="Members" count={users?.length} />
        {users === undefined && <Skeleton rows={2} />}
        <div className="grid gap-2">
          {users?.map((u) => (
            <Card key={u._id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {u.name} <span className="text-sm font-normal text-stone-500">({labelFor(u.role)})</span>
                  </p>
                  <p className="text-sm text-stone-500">
                    {u.email} · {u.activeListings} listing(s)
                    {u.trustedLender && " · Trusted Lender"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => report(setTrusted({ userId: u._id, trusted: !u.trustedLender }))}
                >
                  {u.trustedLender ? "Remove Trusted Lender" : "Mark Trusted Lender"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="All listings" count={tools?.length} />
        {tools === undefined && <Skeleton rows={2} />}
        <div className="grid gap-2">
          {tools?.map((t) => (
            <Card key={t._id}>
              <div className="flex items-center justify-between gap-2">
                <p>
                  <span className="font-medium">{t.name}</span>{" "}
                  <span className="text-sm text-stone-500">
                    {labelFor(t.category)} · by {t.isMine ? "you" : t.ownerFirstName}
                  </span>
                </p>
                <ConfirmButton confirmLabel="Remove for everyone" onConfirm={() => report(remove({ toolId: t._id }))}>
                  Remove listing
                </ConfirmButton>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="All loans" count={loans?.length} />
        <LoanList
          loans={loans}
          empty="No loans yet."
          who={(l) => `${l.borrowerFirstName} borrowing from ${l.ownerFirstName}`}
        />
      </section>
    </div>
  );
}
