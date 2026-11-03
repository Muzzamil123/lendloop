import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { firstName } from "./lib/access";
import { daysBetween, today } from "./lib/dates";
import { requireEnv, signHeaders } from "./lib/hmac";

const MAX_ATTEMPTS = 4;
const eventValidator = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);
type LoanEvent = "requested" | "approved" | "declined" | "cancelled" | "returned";

// Called from loan mutations. Mutations can't make network calls, so the
// webhook call runs in a scheduled action after the mutation commits.
export async function scheduleLoanNotification(ctx: MutationCtx, loanId: Id<"loans">, event: LoanEvent) {
  await ctx.scheduler.runAfter(0, internal.automation.sendLoanNotification, {
    loanId,
    event,
    attempt: 1,
  });
}

// Idempotent insert: an existing key means the event was already recorded.
export const recordEvent = internalMutation({
  args: {
    loanId: v.id("loans"),
    type: v.union(v.literal("request_notified"), v.literal("reminder_sent")),
    status: v.union(v.literal("ok"), v.literal("failed")),
    idempotencyKey: v.string(),
    detail: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();
    if (existing) return false;
    await ctx.db.insert("automationEvents", { ...args, createdAt: Date.now() });
    return true;
  },
});

export const eventRecorded = internalQuery({
  args: { idempotencyKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { idempotencyKey }) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();
    return existing !== null;
  },
});

// Builds the minimal payload n8n needs: who to notify and about what. No user
// IDs, no owner contact details for the borrower, no descriptions.
export const notificationPayload = internalQuery({
  args: { loanId: v.id("loans"), event: eventValidator },
  returns: v.union(
    v.null(),
    v.object({
      event: eventValidator,
      loanId: v.id("loans"),
      recipient: v.object({ firstName: v.string(), email: v.string() }),
      otherPartyFirstName: v.string(),
      toolName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
    }),
  ),
  handler: async (ctx, { loanId, event }) => {
    const loan = await ctx.db.get("loans", loanId);
    if (!loan) return null;
    const [tool, owner, borrower] = await Promise.all([
      ctx.db.get("tools", loan.toolId),
      ctx.db.get("users", loan.ownerId),
      ctx.db.get("users", loan.borrowerId),
    ]);
    if (!tool || !owner || !borrower) return null;
    // Requests and cancellations go to the owner; decisions go to the borrower.
    const toOwner = event === "requested" || event === "cancelled";
    const recipient = toOwner ? owner : borrower;
    const other = toOwner ? borrower : owner;
    return {
      event,
      loanId,
      recipient: { firstName: firstName(recipient.name), email: recipient.email },
      otherPartyFirstName: firstName(other.name),
      toolName: tool.name,
      startDate: loan.startDate,
      endDate: loan.endDate,
    };
  },
});

export const sendLoanNotification = internalAction({
  args: { loanId: v.id("loans"), event: eventValidator, attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { loanId, event, attempt }) => {
    // A loan reaches each status at most once, so this key is unique per event.
    const idempotencyKey = `notify:${loanId}:${event}`;
    if (await ctx.runQuery(internal.automation.eventRecorded, { idempotencyKey })) return null;

    const payload = await ctx.runQuery(internal.automation.notificationPayload, { loanId, event });
    if (!payload) return null;

    const body = JSON.stringify({ idempotencyKey, ...payload });
    let failure: string | null = null;
    try {
      const response = await fetch(requireEnv("N8N_WEBHOOK_URL"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await signHeaders(requireEnv("N8N_WEBHOOK_SECRET"), body)),
        },
        body,
      });
      if (!response.ok) failure = `n8n responded ${response.status}`;
    } catch (error) {
      failure = error instanceof Error ? error.message : "network error";
    }

    if (!failure) {
      await ctx.runMutation(internal.automation.recordEvent, {
        loanId,
        type: "request_notified",
        status: "ok",
        idempotencyKey,
      });
      return null;
    }

    if (attempt < MAX_ATTEMPTS) {
      // Exponential backoff: 30s, 60s, 120s.
      const delayMs = 30_000 * 2 ** (attempt - 1);
      await ctx.scheduler.runAfter(delayMs, internal.automation.sendLoanNotification, {
        loanId,
        event,
        attempt: attempt + 1,
      });
      return null;
    }

    console.error(`Notification ${idempotencyKey} failed after ${attempt} attempts: ${failure}`);
    await ctx.runMutation(internal.automation.recordEvent, {
      loanId,
      type: "request_notified",
      status: "failed",
      idempotencyKey: `${idempotencyKey}:failed`,
      detail: failure.slice(0, 200),
    });
    return null;
  },
});

// Approved loans whose end date has passed. Minimal fields for a reminder.
export const overdueLoans = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      loanId: v.id("loans"),
      borrowerFirstName: v.string(),
      borrowerEmail: v.string(),
      toolName: v.string(),
      endDate: v.string(),
      daysOverdue: v.number(),
      reminderKey: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const day = today();
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_endDate", (q) => q.eq("status", "approved").lt("endDate", day))
      .take(200);
    const result = [];
    for (const loan of loans) {
      const [tool, borrower] = await Promise.all([
        ctx.db.get("tools", loan.toolId),
        ctx.db.get("users", loan.borrowerId),
      ]);
      if (!borrower) continue;
      result.push({
        loanId: loan._id,
        borrowerFirstName: firstName(borrower.name),
        borrowerEmail: borrower.email,
        toolName: tool?.name ?? "a tool",
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, day),
        // One reminder per loan per day; n8n echoes this key back.
        reminderKey: `reminder:${loan._id}:${day}`,
      });
    }
    return result;
  },
});

export const loanExists = internalQuery({
  args: { loanId: v.string() },
  returns: v.union(v.null(), v.id("loans")),
  handler: async (ctx, { loanId }) => {
    const id = ctx.db.normalizeId("loans", loanId);
    if (!id) return null;
    return (await ctx.db.get("loans", id)) ? id : null;
  },
});
