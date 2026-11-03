import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 renamed middleware.ts to proxy.ts. This only redirects signed-out
// visitors away from app pages; every access rule is enforced in Convex.
const isAppRoute = createRouteMatcher([
  "/tools(.*)",
  "/my-listings(.*)",
  "/my-requests(.*)",
  "/incoming(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isAppRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
