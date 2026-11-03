import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertLoanBorrower,
  assertLoanOwner,
  firstName,
  getLiveTool,
  getLoan,
} from "./lib/access";
import { scheduleLoanNotification } from "./automation";
import { requireAdmin, requireUser } from "./lib/auth";
import { loanStatusValidator } from "./lib/constants";
import {
  MAX_DAYS_AHEAD,
  MAX_LOAN_DAYS,
  addDays,
  daysBetween,
  isValidDay,
  rangesOverlap,
  today,
} from "./lib/dates";

async function approvedOverlap(
  ctx: QueryCtx,
  toolId: Id<"tools">,
  startDate: string,
  endDate: string,
  ignore?: Id<"loans">,
) {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .collect();
  return loans.some(
    (l) =>
      l._id !== ignore &&
      l.status === "approved" &&
      rangesOverlap(l.startDate, l.endDate, startDate, endDate),
  );
}

async function setStatus(
  ctx: MutationCtx,
  loan: Doc<"loans">,
  from: Doc<"loans">["status"][],
  to: Doc<"loans">["status"],
) {
  if (!from.includes(loan.status)) {
    throw new ConvexError(`This request is already ${loan.status}.`);
  }
  await ctx.db.patch("loans", loan._id, { status: to, updatedAt: Date.now() });
  if (to !== "pending") await scheduleLoanNotification(ctx, loan._id, to);
}

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  returns: v.id("loans"),
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const user = await requireUser(ctx);
    const tool = await getLiveTool(ctx, toolId);
    if (tool.ownerId === user._id) throw new ConvexError("You can't borrow your own tool.");

    if (!isValidDay(startDate) || !isValidDay(endDate)) {
      throw new ConvexError("Dates must be valid calendar days.");
    }
    const day = today();
    if (startDate < day) throw new ConvexError("The start date can't be in the past.");
    if (endDate < startDate) throw new ConvexError("The end date must be on or after the start date.");
    if (startDate > addDays(day, MAX_DAYS_AHEAD)) {
      throw new ConvexError(`Requests can start at most ${MAX_DAYS_AHEAD} days ahead.`);
    }
    if (daysBetween(startDate, endDate) + 1 > MAX_LOAN_DAYS) {
      throw new ConvexError(`Loans can last at most ${MAX_LOAN_DAYS} days.`);
    }
    if (await approvedOverlap(ctx, toolId, startDate, endDate)) {
      throw new ConvexError("The tool is already lent out for some of those days.");
    }

    const mine = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
    const duplicate = mine.some(
      (l) =>
        l.toolId === toolId &&
        l.status === "pending" &&
        rangesOverlap(l.startDate, l.endDate, startDate, endDate),
    );
    if (duplicate) throw new ConvexError("You already have a pending request for those days.");

    const now = Date.now();
    const loanId = await ctx.db.insert("loans", {
      toolId,
      borrowerId: user._id,
      ownerId: tool.ownerId,
      startDate,
      endDate,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await scheduleLoanNotification(ctx, loanId, "requested");
    return loanId;
  },
});

// Approving re-checks availability and declines other pending requests that
// overlap, so a tool is never promised to two borrowers at once.
export const approve = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanOwner(user, loan);
    await getLiveTool(ctx, loan.toolId);
    if (loan.endDate < today()) throw new ConvexError("This request's dates have already passed.");
    if (await approvedOverlap(ctx, loan.toolId, loan.startDate, loan.endDate, loan._id)) {
      throw new ConvexError("Another approved loan already covers some of those days.");
    }
    await setStatus(ctx, loan, ["pending"], "approved");

    const others = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", loan.toolId))
      .collect();
    for (const other of others) {
      if (
        other._id !== loan._id &&
        other.status === "pending" &&
        rangesOverlap(other.startDate, other.endDate, loan.startDate, loan.endDate)
      ) {
        await setStatus(ctx, other, ["pending"], "declined");
      }
    }
    return null;
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanOwner(user, loan);
    await setStatus(ctx, loan, ["pending"], "declined");
    return null;
  },
});

export const cancel = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanBorrower(user, loan);
    await setStatus(ctx, loan, ["pending"], "cancelled");
    return null;
  },
});

// The lender confirms the tool came back.
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanOwner(user, loan);
    if (loan.startDate > today()) throw new ConvexError("This loan hasn't started yet.");
    await setStatus(ctx, loan, ["approved"], "returned");
    return null;
  },
});

const activityView = v.union(
  v.null(),
  v.object({
    type: v.union(v.literal("request_notified"), v.literal("reminder_sent")),
    status: v.union(v.literal("ok"), v.literal("failed")),
    createdAt: v.number(),
  }),
);

const loanView = v.object({
  _id: v.id("loans"),
  toolName: v.string(),
  toolRemoved: v.boolean(),
  borrowerFirstName: v.string(),
  ownerFirstName: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  status: loanStatusValidator,
  overdue: v.boolean(),
  lastActivity: activityView,
});

async function toView(ctx: QueryCtx, loan: Doc<"loans">) {
  const [tool, borrower, owner] = await Promise.all([
    ctx.db.get("tools", loan.toolId),
    ctx.db.get("users", loan.borrowerId),
    ctx.db.get("users", loan.ownerId),
  ]);
  const last = await ctx.db
    .query("automationEvents")
    .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
    .order("desc")
    .first();
  return {
    _id: loan._id,
    toolName: tool?.name ?? "Removed tool",
    toolRemoved: !tool || tool.removedAt !== undefined,
    borrowerFirstName: borrower ? firstName(borrower.name) : "Unknown",
    ownerFirstName: owner ? firstName(owner.name) : "Unknown",
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: loan.status,
    overdue: loan.status === "approved" && loan.endDate < today(),
    lastActivity: last ? { type: last.type, status: last.status, createdAt: last.createdAt } : null,
  };
}

async function views(ctx: QueryCtx, loans: Doc<"loans">[]) {
  const sorted = [...loans].sort((a, b) => b.createdAt - a.createdAt);
  return await Promise.all(sorted.map((l) => toView(ctx, l)));
}

export const myRequests = query({
  args: {},
  returns: v.array(loanView),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
    return await views(ctx, loans);
  },
});

export const incoming = query({
  args: {},
  returns: v.array(loanView),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return await views(ctx, loans);
  },
});

export const listAll = query({
  args: {},
  returns: v.array(loanView),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").order("desc").take(500);
    return await views(ctx, loans);
  },
});
