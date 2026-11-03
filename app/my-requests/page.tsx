import { AppShell } from "@/components/AppShell";
import { MyRequestsView } from "@/components/views/MyRequestsView";

export default function Page() {
  return (
    <AppShell title="My requests" subtitle="Tools you've asked to borrow.">
      <MyRequestsView />
    </AppShell>
  );
}
