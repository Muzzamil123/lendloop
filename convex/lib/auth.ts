import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

// ADMIN_EMAILS is a comma-separated Convex env var. The role always comes from
// the server; a client can never choose its own role.
export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// The caller's users row, or null when signed out or not yet synced. The role
// is re-derived from ADMIN_EMAILS and the verified token email on every call,
// so removing an email from the list revokes admin rights immediately.
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) return null;
  const email = identity.email?.toLowerCase();
  return { ...user, role: email && adminEmails().has(email) ? "admin" : "user" };
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("You must be signed in.");
  return user;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw new ConvexError("Admins only.");
  return user;
}

export function isAdmin(user: Doc<"users">): boolean {
  return user.role === "admin";
}
