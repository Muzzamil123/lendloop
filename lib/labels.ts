import { CATEGORIES, CONDITIONS } from "@/convex/lib/constants";

export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];
export { CATEGORIES, CONDITIONS };

export function labelFor(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "data" in error && typeof error.data === "string") {
    return error.data;
  }
  return "Something went wrong. Please try again.";
}

export function timeAgo(timestamp: number) {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
