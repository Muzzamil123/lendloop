import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { requireEnv, verifySignature } from "./lib/hmac";

const http = httpRouter();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Called daily by n8n. Signed GET (empty body).
http.route({
  path: "/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await verifySignature(requireEnv("CONVEX_HTTP_SECRET"), request.headers, ""))) {
      return json(401, { error: "invalid signature" });
    }
    const loans = await ctx.runQuery(internal.automation.overdueLoans, {});
    return json(200, { loans });
  }),
});

const REMINDER_KEY = /^reminder:([a-z0-9]+):(\d{4}-\d{2}-\d{2})$/;

// n8n writes back each reminder it sent. Idempotent on the reminder key, so a
// retried write-back never records a second reminder.
http.route({
  path: "/reminder-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const raw = await request.text();
    if (!(await verifySignature(requireEnv("CONVEX_HTTP_SECRET"), request.headers, raw))) {
      return json(401, { error: "invalid signature" });
    }

    let body: { reminderKey?: unknown; status?: unknown; detail?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { error: "invalid JSON" });
    }
    const key = typeof body.reminderKey === "string" ? body.reminderKey : "";
    const match = REMINDER_KEY.exec(key);
    if (!match || (body.status !== "ok" && body.status !== "failed")) {
      return json(400, { error: "expected reminderKey and status ok|failed" });
    }
    const loanId = await ctx.runQuery(internal.automation.loanExists, { loanId: match[1] });
    if (!loanId) return json(404, { error: "unknown loan" });

    const recorded = await ctx.runMutation(internal.automation.recordEvent, {
      loanId,
      type: "reminder_sent",
      status: body.status,
      idempotencyKey: body.status === "ok" ? key : `${key}:failed`,
      detail: typeof body.detail === "string" ? body.detail.slice(0, 200) : undefined,
    });
    return json(200, { recorded, duplicate: !recorded });
  }),
});

export default http;
