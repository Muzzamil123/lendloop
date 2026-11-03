import { AppShell } from "@/components/AppShell";
import { AdminView } from "@/components/views/AdminView";

export default function Page() {
  return (
    <AppShell title="Admin" subtitle="Manage lenders, listings and loans.">
      <AdminView />
    </AppShell>
  );
}
