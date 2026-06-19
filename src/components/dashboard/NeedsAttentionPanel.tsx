"use client";

import { Skeleton } from "@/components/ui/skeleton";

import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  LucideIcon,
  Mail,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import type { DashboardAnalytics } from "./useDashboardAnalytics";

type AttentionItem = {
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  tone: string;
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

export default function NeedsAttentionPanel({
  analytics,
  className = "",
}: {
  analytics: DashboardAnalytics;
  className?: string;
}) {
  const openTutorRequests = analytics.attention?.openTutorRequestsTotal ?? 0;
  const latestInquirySenderName =
    analytics.attention?.latestInquirySenderName ?? null;

  const items: AttentionItem[] = [
    {
      title: "Pending tutor applications",
      description: "Review and approve new tutor registrations.",
      count: analytics.pendingTutorApplicationsTotal,
      href: "/tutors",
      icon: UserPlus,
      tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    },
    {
      title: "Open tutor requests",
      description: "Assign tutors or update request status.",
      count: openTutorRequests,
      href: "/request-tutor",
      icon: ClipboardList,
      tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    },
    {
      title: "Recent contact inquiries",
      description: latestInquirySenderName
        ? `Latest message from ${latestInquirySenderName}.`
        : "Check new messages from the contact form.",
      count: analytics.attention?.inquiriesTotal ?? analytics.inquiriesTotal,
      href: "/inquiries/contactus",
      icon: Mail,
      tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    },
  ];

  const isLoading = analytics.isAttentionLoading;
  const isRefetching = analytics.isAttentionFetching;
  const isError = analytics.isAttentionError;

  const activeItems = items.filter((item) => item.count > 0);
  const refetchAttentionItems = analytics.refetchAttention;

  if (isLoading) {
    return (
      <div
        className={`flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
      >
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="h-[3px] bg-blue-600" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      <div className="flex-1 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Needs Attention
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Admin items that may need review or follow-up.
              </p>
            </div>
          </div>

          {isError && (
            <button
              type="button"
              onClick={refetchAttentionItems}
              disabled={isRefetching}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:pointer-events-none disabled:opacity-60 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 sm:w-fit"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              />
              Retry
            </button>
          )}
        </div>

        {isError && activeItems.length === 0 ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300">
            <p className="font-medium">Could not load attention items.</p>
            <p className="mt-1 text-red-600/80 dark:text-red-300/80">
              Retry to check pending tutor applications, open tutor requests,
              and recent inquiries.
            </p>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                No urgent admin items right now.
              </p>
              <p className="mt-0.5">
                Pending applications, open tutor requests, and new inquiries
                will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {items.map(
              ({ title, description, count, href, icon: Icon, tone }) => (
                <Link
                  key={title}
                  href={href}
                  className="group flex min-h-[96px] items-start gap-3 p-4 outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-gray-800/50 dark:focus-visible:ring-blue-400"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="break-words text-sm font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {title}
                      </h3>
                      <span className="shrink-0 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {formatNumber(count)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400">
                      {description}
                    </p>
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </div>

      <div className="h-[3px] bg-amber-500" />
    </div>
  );
}
