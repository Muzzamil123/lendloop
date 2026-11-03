import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { adminEmails, getCurrentUser, requireAdmin } from "./lib/auth";
import { roleValidator } from "./lib/constants";

// Called once after sign-in. Creates or refreshes the caller's users row from
// the verified Clerk token, never from client-supplied arguments.
export const ensureCurrentUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You must be signed in.");
    if (!identity.email) {
      throw new ConvexError("Your account needs an email address.");
    }

    const email = identity.email.toLowerCase();
    // Never fall back to the email prefix: names are shown to other users.
    const name = identity.name?.trim() || identity.givenName?.trim() || "Neighbour";
    const role = adminEmails().has(email) ? "admin" : "user";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch("users", existing._id, { name, email, role });
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
  returns: v.union(
    v.null(),
    v.object({ name: v.string(), role: roleValidator, trustedLender: v.boolean() }),
  ),
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

export const listForAdmin = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: roleValidator,
      trustedLender: v.boolean(),
      activeListings: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(500);
    const result = [];
    for (const user of users) {
      const tools = await ctx.db
        .query("tools")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();
      result.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        trustedLender: user.trustedLender,
        activeListings: tools.filter((t) => t.removedAt === undefined).length,
      });
    }
    return result;
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get("users", userId);
    if (!target) throw new ConvexError("User not found.");
    await ctx.db.patch("users", userId, { trustedLender: trusted });
    return null;
  },
});
