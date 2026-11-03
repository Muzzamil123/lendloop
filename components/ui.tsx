"use client";

import { AlertTriangle, Bell } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { labelFor, timeAgo } from "@/lib/labels";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-teal-700 text-white shadow-sm hover:bg-teal-800",
    secondary: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    ghost: "text-stone-600 hover:bg-stone-100",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-stone-400">{icon}</div>}
      <p className="font-medium text-stone-700">{title}</p>
      {children && <p className="mt-1 text-sm text-stone-500">{children}</p>}
    </div>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-teal-50 text-teal-800 ring-teal-200",
  declined: "bg-stone-100 text-stone-600 ring-stone-200",
  returned: "bg-sky-50 text-sky-800 ring-sky-200",
  cancelled: "bg-stone-100 text-stone-600 ring-stone-200",
  overdue: "bg-red-50 text-red-800 ring-red-200",
};

export function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const key = overdue ? "overdue" : status;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[key] ?? ""}`}>
      {labelFor(key)}
    </span>
  );
}

export function Availability({ available }: { available: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${available ? "text-teal-700" : "text-amber-700"}`}>
      <span className={`h-2 w-2 rounded-full ${available ? "bg-teal-500" : "bg-amber-500"}`} />
      {available ? "Available" : "On loan"}
    </span>
  );
}

type Activity = {
  type: "request_notified" | "reminder_sent";
  status: "ok" | "failed";
  createdAt: number;
} | null;

export function ActivityLine({ activity }: { activity: Activity }) {
  if (!activity) return null;
  const what = activity.type === "reminder_sent" ? "Reminder" : "Notification";
  const ok = activity.status === "ok";
  return (
    <p className={`mt-2 inline-flex items-center gap-1.5 text-xs ${ok ? "text-stone-500" : "text-red-700"}`}>
      <Bell className="h-3.5 w-3.5" aria-hidden />
      {what} {ok ? "sent" : "failed"} {timeAgo(activity.createdAt)}
    </p>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-stone-700">
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
