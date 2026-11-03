import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed middleware.ts to proxy.ts. Clerk only attaches the session
// here; every access rule is enforced in Convex functions, not in this file.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
