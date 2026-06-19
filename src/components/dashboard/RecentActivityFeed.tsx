"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardRecentActivityItem } from "@/store/api/splits/dashboard";
import { useFetchGradesQuery } from "@/store/api/splits/grades";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  LucideIcon,
  Mail,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { DashboardAnalytics } from "./useDashboardAnalytics";

type ActivityDisplayItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  timestamp: string;
  status?: string;
  icon: LucideIcon;
  tone: string;
};

const formatActivityTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!timestamp || Number.isNaN(timestamp)) return "Unknown time";

  const now = Date.now();
  const diffInSeconds = Math.round((timestamp - now) / 1000);
  const absoluteDiff = Math.abs(diffInSeconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteDiff < 60) return formatter.format(diffInSeconds, "second");
  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60)
    return formatter.format(diffInMinutes, "minute");
  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) return formatter.format(diffInHours, "hour");
  const diffInDays = Math.round(diffInHours / 24);
  if (Math.abs(diffInDays) < 7) return formatter.format(diffInDays, "day");

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const normalizeRequestStatus = (status: string) => {
  if (status === "Tutor Assigned" || status === "Assiged") return "Assigned";
  return status || "Pending";
};

type GradeReference = Extract<
  DashboardRecentActivityItem,
  { type: "tutorRequest" }
>["grade"];

const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

const getGradeDisplayName = (
  grade: GradeReference,
  gradeTitlesById: Map<string, string>,
) => {
  if (!grade) return "";

  if (typeof grade === "object") {
    const title = (grade.title || grade.name || "").trim();
    if (title) return title;

    const id = (grade.id || "").trim();
    return gradeTitlesById.get(id) ?? (isObjectId(id) ? "" : id);
  }

  const gradeValue = grade.trim();
  return (
    gradeTitlesById.get(gradeValue) ??
    (isObjectId(gradeValue) ? "" : gradeValue)
  );
};

const toDisplayItem = (
  item: DashboardRecentActivityItem,
  gradeTitlesById: Map<string, string>,
): ActivityDisplayItem => {
  if (item.type === "tutor") {
    return {
      id: `tutor-${item.id}`,
      title: item.name || "New tutor application",
      description: item.email
        ? `Tutor registration from ${item.email}`
        : "Tutor registration submitted.",
      href: "/tutors",
      timestamp: item.timestamp,
      status: capitalize(item.status || "pending"),
      icon: UserPlus,
      tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    };
  }

  if (item.type === "tutorRequest") {
    const gradeName = getGradeDisplayName(item.grade, gradeTitlesById);

    return {
      id: `request-${item.id}`,
      title: item.name || "New tutor request",
      description:
        [gradeName, item.medium].filter(Boolean).join(" - ") ||
        "Tutor request submitted.",
      href: "/request-tutor",
      timestamp: item.timestamp,
      status: normalizeRequestStatus(item.status),
      icon: ClipboardList,
      tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    };
  }

  // inquiry
  return {
    id: `inquiry-${item.id}`,
    title: item.senderName || "New contact inquiry",
    description: item.senderEmail
      ? `Message from ${item.senderEmail}`
      : item.message || "Contact inquiry received.",
    href: "/inquiries/contactus",
    timestamp: item.timestamp,
    status: "Inquiry",
    icon: Mail,
    tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  };
};

export default function RecentActivityFeed({
  analytics,
}: {
  analytics: DashboardAnalytics;
}) {
  const { data: gradesData } = useFetchGradesQuery({
    page: 1,
    limit: 10000,
    sortBy: "title:asc",
  });
  const gradeTitlesById = useMemo(() => {
    const gradeMap = new Map<string, string>();

    for (const grade of gradesData?.results ?? []) {
      if (grade.id) {
        gradeMap.set(grade.id, grade.title || String(grade.id));
      }
    }

    return gradeMap;
  }, [gradesData?.results]);

  // Backend already returns the 8 most-recent items merged and sorted
  const activities = useMemo(
    () =>
      analytics.recentActivity.map((activity) =>
        toDisplayItem(activity, gradeTitlesById),
      ),
    [analytics.recentActivity, gradeTitlesById],
  );

  const isLoading = analytics.isRecentLoading;
  const isRefetching = analytics.isRecentFetching;
  const isError = analytics.isRecentError;
  const refetchActivity = analytics.refetchRecent;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="mt-5 divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 py-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3.5 w-64" />
                </div>
                <Skeleton className="hidden h-6 w-20 rounded-lg sm:block" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-[3px] bg-emerald-500" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Latest tutor, request, and inquiry updates.
              </p>
            </div>
          </div>

          {isError && (
            <button
              type="button"
              onClick={refetchActivity}
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

        {isError && activities.length === 0 ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">Could not load recent activity.</p>
                <p className="mt-1 text-red-600/80 dark:text-red-300/80">
                  Retry to refresh the latest tutor, request, and inquiry
                  updates.
                </p>
              </div>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <p className="font-medium text-gray-700 dark:text-gray-300">
              No recent activity yet.
            </p>
            <p className="mt-1">
              Tutor registrations, tutor requests, and contact inquiries will
              appear here once records are added.
            </p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {activities.map(
              ({
                id,
                title,
                description,
                href,
                timestamp,
                status,
                icon: Icon,
                tone,
              }) => (
                <Link
                  key={id}
                  href={href}
                  className="group flex items-start gap-3 p-4 outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-gray-800/50 dark:focus-visible:ring-blue-400 sm:items-center"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <h3 className="break-words text-sm font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 sm:truncate">
                        {title}
                      </h3>
                      {status && (
                        <span className="w-fit rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400 sm:truncate">
                      {description}
                    </p>
                    <p className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500 sm:hidden">
                      {formatActivityTime(timestamp)}
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 text-sm text-gray-400 dark:text-gray-500 sm:flex">
                    <span>{formatActivityTime(timestamp)}</span>
                    <ArrowUpRight className="h-4 w-4 transition group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </div>

      <div className="h-[3px] bg-emerald-500" />
    </div>
  );
}
