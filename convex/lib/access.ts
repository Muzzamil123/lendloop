import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isAdmin } from "./auth";

type Ctx = QueryCtx | MutationCtx;

export async function getLiveTool(ctx: Ctx, toolId: Id<"tools">): Promise<Doc<"tools">> {
  const tool = await ctx.db.get("tools", toolId);
  if (!tool || tool.removedAt !== undefined) throw new ConvexError("Tool not found.");
  return tool;
}

// Owners manage their own listings; admins may remove any listing.
export function assertCanManageTool(user: Doc<"users">, tool: Doc<"tools">, action: "edit" | "remove") {
  if (tool.ownerId === user._id) return;
  if (action === "remove" && isAdmin(user)) return;
  throw new ConvexError("You can only change your own listings.");
}

export async function getLoan(ctx: Ctx, loanId: Id<"loans">): Promise<Doc<"loans">> {
  const loan = await ctx.db.get("loans", loanId);
  if (!loan) throw new ConvexError("Request not found.");
  return loan;
}

export function assertLoanOwner(user: Doc<"users">, loan: Doc<"loans">) {
  if (loan.ownerId !== user._id) throw new ConvexError("Only the tool's owner can do that.");
}

export function assertLoanBorrower(user: Doc<"users">, loan: Doc<"loans">) {
  if (loan.borrowerId !== user._id) throw new ConvexError("Only the borrower can do that.");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
