import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function isOnLoanToday(ctx: QueryCtx, toolId: Id<"tools">) {
  const day = today();
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .collect();
  return loans.some(
    (l) => l.status === "approved" && l.startDate <= day && day <= l.endDate,
  );
}

// Public, unauthenticated. Projects to name and category on the server so no
// owner data ever reaches a signed-out browser.
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").order("desc").take(200);
    const available = [];
    for (const tool of tools) {
      if (!(await isOnLoanToday(ctx, tool._id))) {
        available.push({ name: tool.name, category: tool.category });
      }
    }
    return available;
  },
});
