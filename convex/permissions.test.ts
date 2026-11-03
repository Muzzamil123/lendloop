/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { signHeaders } from "./lib/hmac";
import { addDays, today } from "./lib/dates";

const modules = import.meta.glob("./**/*.ts");
const HTTP_SECRET = "test-http-secret";

beforeEach(() => {
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.CONVEX_HTTP_SECRET = HTTP_SECRET;
});

// Signs in a user the same way the app does after Clerk sign-in.
async function signIn(t: ReturnType<typeof convexTest>, key: string, email = `${key}@example.com`) {
  const as = t.withIdentity({ subject: `clerk_${key}`, email, name: `${key} Tester` });
  await as.mutation(api.users.ensureCurrentUser, {});
  return as;
}

async function setup() {
  const t = convexTest(schema, modules);
  const owner = await signIn(t, "owner");
  const borrower = await signIn(t, "borrower");
  const stranger = await signIn(t, "stranger");
  const admin = await signIn(t, "admin", "admin@example.com");
  const toolId = await owner.mutation(api.tools.create, {
    name: "Hammer",
    category: "hand_tools",
    condition: "good",
    description: "Claw hammer",
  });
  const start = addDays(today(), 1);
  const loanId = await borrower.mutation(api.loans.request, {
    toolId,
    startDate: start,
    endDate: addDays(start, 2),
  });
  return { t, owner, borrower, stranger, admin, toolId, loanId };
}

describe("public access", () => {
  test("public list exposes only name and category", async () => {
    const { t } = await setup();
    const tools = await t.query(api.tools.listPublic, {});
    expect(tools).toEqual([{ name: "Hammer", category: "hand_tools" }]);
  });

  test("signed-out callers can't use member functions", async () => {
    const { t } = await setup();
    await expect(t.query(api.tools.list, {})).rejects.toThrow(/signed in/);
  });
});

describe("tool ownership", () => {
  test("a user can't edit or remove another user's tool", async () => {
    const { stranger, toolId } = await setup();
    const fields = { name: "Mine now", category: "hand_tools", condition: "good", description: "" } as const;
    await expect(stranger.mutation(api.tools.update, { toolId, ...fields })).rejects.toThrow();
    await expect(stranger.mutation(api.tools.remove, { toolId })).rejects.toThrow();
  });

  test("an admin can remove any listing", async () => {
    const { t, admin, toolId } = await setup();
    await admin.mutation(api.tools.remove, { toolId });
    expect(await t.query(api.tools.listPublic, {})).toEqual([]);
  });

  test("an owner can't borrow their own tool", async () => {
    const { owner, toolId } = await setup();
    const start = addDays(today(), 5);
    await expect(
      owner.mutation(api.loans.request, { toolId, startDate: start, endDate: start }),
    ).rejects.toThrow(/own tool/);
  });
});

describe("loan decisions", () => {
  test("only the tool owner can approve or decline", async () => {
    const { borrower, stranger, admin, loanId } = await setup();
    for (const caller of [borrower, stranger, admin]) {
      await expect(caller.mutation(api.loans.approve, { loanId })).rejects.toThrow();
      await expect(caller.mutation(api.loans.decline, { loanId })).rejects.toThrow();
    }
  });

  test("only the borrower can cancel their request", async () => {
    const { owner, stranger, loanId } = await setup();
    await expect(owner.mutation(api.loans.cancel, { loanId })).rejects.toThrow();
    await expect(stranger.mutation(api.loans.cancel, { loanId })).rejects.toThrow();
  });

  test("an approved request can't be approved again", async () => {
    const { owner, loanId } = await setup();
    await owner.mutation(api.loans.approve, { loanId });
    await expect(owner.mutation(api.loans.approve, { loanId })).rejects.toThrow(/already approved/);
  });

  test("requests can't overlap an approved loan", async () => {
    const { owner, stranger, toolId, loanId } = await setup();
    await owner.mutation(api.loans.approve, { loanId });
    const start = addDays(today(), 2);
    await expect(
      stranger.mutation(api.loans.request, { toolId, startDate: start, endDate: start }),
    ).rejects.toThrow(/already lent out/);
  });
});

describe("admin-only functions", () => {
  test("regular users can't see all loans or mark trusted lenders", async () => {
    const { t, stranger } = await setup();
    await expect(stranger.query(api.loans.listAll, {})).rejects.toThrow(/Admins only/);
    const ownerRow = await t.run((ctx) =>
      ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", "clerk_owner")).first(),
    );
    await expect(
      stranger.mutation(api.users.setTrustedLender, { userId: ownerRow!._id, trusted: true }),
    ).rejects.toThrow(/Admins only/);
  });

  test("the admin role comes from ADMIN_EMAILS, not the client", async () => {
    const { admin, stranger } = await setup();
    expect((await admin.query(api.users.me, {}))?.role).toBe("admin");
    expect((await stranger.query(api.users.me, {}))?.role).toBe("user");
  });
});

describe("n8n HTTP endpoints", () => {
  test("unsigned or wrongly signed requests are rejected", async () => {
    const { t } = await setup();
    expect((await t.fetch("/overdue-loans", { method: "GET" })).status).toBe(401);
    const forged = await signHeaders("wrong-secret", "");
    expect((await t.fetch("/overdue-loans", { method: "GET", headers: forged })).status).toBe(401);
  });

  test("a reminder write-back is recorded once, however often it's retried", async () => {
    const { t, loanId } = await setup();
    const body = JSON.stringify({ reminderKey: `reminder:${loanId}:${today()}`, status: "ok" });
    const send = async () =>
      (
        await t.fetch("/reminder-status", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await signHeaders(HTTP_SECRET, body)) },
          body,
        })
      ).json();
    expect(await send()).toMatchObject({ recorded: true });
    expect(await send()).toMatchObject({ recorded: false, duplicate: true });
    const events = await t.run((ctx) => ctx.db.query("automationEvents").collect());
    expect(events).toHaveLength(1);
  });
});
