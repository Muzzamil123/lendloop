import { ConvexError, v } from "convex/values";
import { scheduleLoanNotification } from "./automation";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { assertCanManageTool, firstName, getLiveTool } from "./lib/access";
import { requireUser } from "./lib/auth";
import { categoryValidator, conditionValidator } from "./lib/constants";
import { today } from "./lib/dates";

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;

function cleanText(value: string, field: string, max: number, required: boolean) {
  const text = value.trim();
  if (required && !text) throw new ConvexError(`${field} is required.`);
  if (text.length > max) throw new ConvexError(`${field} must be at most ${max} characters.`);
  return text;
}

async function loansForTool(ctx: QueryCtx, toolId: Id<"tools">) {
  return await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .collect();
}

function onLoanToday(loans: Doc<"loans">[]) {
  const day = today();
  return loans.some((l) => l.status === "approved" && l.startDate <= day && day <= l.endDate);
}

async function liveTools(ctx: QueryCtx) {
  const tools = await ctx.db.query("tools").order("desc").take(500);
  return tools.filter((t) => t.removedAt === undefined);
}

// Public, unauthenticated. Projects to name and category on the server so no
// owner data ever reaches a signed-out browser.
export const listPublic = query({
  args: {},
  returns: v.array(v.object({ name: v.string(), category: categoryValidator })),
  handler: async (ctx) => {
    const result = [];
    for (const tool of await liveTools(ctx)) {
      if (!onLoanToday(await loansForTool(ctx, tool._id))) {
        result.push({ name: tool.name, category: tool.category });
      }
    }
    return result;
  },
});

const toolView = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
  ownerFirstName: v.string(),
  ownerTrusted: v.boolean(),
  isMine: v.boolean(),
  availableToday: v.boolean(),
});

// Signed-in browse view. Owners are shown by first name only.
export const list = query({
  args: { category: v.optional(categoryValidator) },
  returns: v.array(toolView),
  handler: async (ctx, { category }) => {
    const user = await requireUser(ctx);
    const tools = (await liveTools(ctx)).filter((t) => !category || t.category === category);
    const result = [];
    for (const tool of tools) {
      const owner = await ctx.db.get("users", tool.ownerId);
      result.push({
        _id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        ownerFirstName: owner ? firstName(owner.name) : "Unknown",
        ownerTrusted: owner?.trustedLender ?? false,
        isMine: tool.ownerId === user._id,
        availableToday: !onLoanToday(await loansForTool(ctx, tool._id)),
      });
    }
    return result;
  },
});

export const mine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("tools"),
      name: v.string(),
      category: categoryValidator,
      condition: conditionValidator,
      description: v.string(),
      availableToday: v.boolean(),
      pendingRequests: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const result = [];
    for (const tool of tools.filter((t) => t.removedAt === undefined)) {
      const loans = await loansForTool(ctx, tool._id);
      result.push({
        _id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        availableToday: !onLoanToday(loans),
        pendingRequests: loans.filter((l) => l.status === "pending").length,
      });
    }
    return result;
  },
});

const toolFields = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
};

export const create = mutation({
  args: toolFields,
  returns: v.id("tools"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name: cleanText(args.name, "Name", NAME_MAX, true),
      category: args.category,
      condition: args.condition,
      description: cleanText(args.description, "Description", DESCRIPTION_MAX, false),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...toolFields },
  returns: v.null(),
  handler: async (ctx, { toolId, ...args }) => {
    const user = await requireUser(ctx);
    const tool = await getLiveTool(ctx, toolId);
    assertCanManageTool(user, tool, "edit");
    await ctx.db.patch("tools", toolId, {
      name: cleanText(args.name, "Name", NAME_MAX, true),
      category: args.category,
      condition: args.condition,
      description: cleanText(args.description, "Description", DESCRIPTION_MAX, false),
    });
    return null;
  },
});

// Owners can remove a listing unless it is lent out now or in future; admins
// can always remove one. Open requests and future loans are cancelled.
export const remove = mutation({
  args: { toolId: v.id("tools") },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    const user = await requireUser(ctx);
    const tool = await getLiveTool(ctx, toolId);
    assertCanManageTool(user, tool, "remove");

    const day = today();
    const loans = await loansForTool(ctx, toolId);
    const committed = loans.filter((l) => l.status === "approved" && l.endDate >= day);
    if (committed.length > 0 && tool.ownerId === user._id && user.role !== "admin") {
      throw new ConvexError("This tool has an approved loan. Mark it returned before removing it.");
    }

    const now = Date.now();
    for (const loan of loans) {
      if (loan.status === "pending" || (loan.status === "approved" && loan.startDate > day)) {
        await ctx.db.patch("loans", loan._id, { status: "cancelled", updatedAt: now });
        await scheduleLoanNotification(ctx, loan._id, "cancelled");
      }
    }
    await ctx.db.patch("tools", toolId, { removedAt: now });
    return null;
  },
});
