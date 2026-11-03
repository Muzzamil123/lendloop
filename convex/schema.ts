import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  categoryValidator,
  conditionValidator,
  loanStatusValidator,
  roleValidator,
} from "./lib/constants";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: roleValidator,
    trustedLender: v.boolean(),
  }).index("by_clerkId", ["clerkId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    createdAt: v.number(),
    // Soft delete keeps loan history intact when a listing is removed.
    removedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  // Dates are calendar days (YYYY-MM-DD) so ranges compare as strings.
  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    ownerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_owner", ["ownerId"])
    .index("by_status_endDate", ["status", "endDate"]),

  // One row per automation side effect. idempotencyKey is checked before
  // every insert, so an n8n retry never records the same event twice.
  automationEvents: defineTable({
    loanId: v.id("loans"),
    type: v.union(v.literal("request_notified"), v.literal("reminder_sent")),
    status: v.union(v.literal("ok"), v.literal("failed")),
    idempotencyKey: v.string(),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_key", ["idempotencyKey"])
    .index("by_loan", ["loanId"]),
});
