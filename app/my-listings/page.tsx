import { AppShell } from "@/components/AppShell";
import { MyListingsView } from "@/components/views/MyListingsView";

export default function Page() {
  return (
    <AppShell title="My listings" subtitle="Tools you lend to others.">
      <MyListingsView />
    </AppShell>
  );
}
