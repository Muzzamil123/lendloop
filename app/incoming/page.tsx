import { AppShell } from "@/components/AppShell";
import { IncomingView } from "@/components/views/IncomingView";

export default function Page() {
  return (
    <AppShell title="Incoming requests" subtitle="Requests to borrow your tools.">
      <IncomingView />
    </AppShell>
  );
}
