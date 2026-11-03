import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

// ADMIN_EMAILS is a comma-separated Convex env var. The role always comes from
// the server; a client can never choose its own role.
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// Called once after sign-in. Creates or refreshes the caller's users row from
// the verified Clerk token, never from client-supplied arguments.
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You must be signed in.");
    if (!identity.email) {
      throw new ConvexError("Your account needs an email address.");
    }

    const email = identity.email.toLowerCase();
    const name = identity.name ?? identity.givenName ?? email.split("@")[0];
    const role = adminEmails().has(email) ? "admin" : "user";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { name, email, role });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
      role,
      trustedLender: false,
    });
  },
});

// Minimal profile for the signed-in user's own UI.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      name: user.name,
      role: user.role,
      trustedLender: user.trustedLender,
    };
  },
});
