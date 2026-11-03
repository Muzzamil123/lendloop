import { AppShell } from "@/components/AppShell";
import { ToolsView } from "@/components/views/ToolsView";

export default function Page() {
  return (
    <AppShell title="All tools" subtitle="Everything your neighbours are lending.">
      <ToolsView />
    </AppShell>
  );
}
