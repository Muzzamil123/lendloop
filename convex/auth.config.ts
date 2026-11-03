import type { AuthConfig } from "convex/server";

// Convex trusts tokens issued by the Clerk "convex" JWT template.
// CLERK_JWT_ISSUER_DOMAIN is set with `npx convex env set`, never committed.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
