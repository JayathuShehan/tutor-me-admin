"use client";

import {
  type DashboardChartDay,
  type DashboardFullResponse,
  type DashboardRecentActivityItem,
  useFetchFullDashboardQuery,
} from "@/store/api/splits/dashboard";
import { useCallback } from "react";

// Public types

export type TrendEntry = {
  today: number;
  last7Days: number;
  prev7Days: number;
};

export type DashboardAnalytics = {
  // Summary counts (for stat cards)
  summary: DashboardFullResponse["summary"] | undefined;

  // Trends per stat key (for "Today: +X" and "±Y% vs prev 7d" badges)
  trends: DashboardFullResponse["trends"] | undefined;

  // Pre-aggregated daily chart history, per metric
  chartData: DashboardFullResponse["chart"] | undefined;

  // Attention panel data
  attention: DashboardFullResponse["attention"] | undefined;

  // Recent activity feed (up to 8 items, pre-merged & sorted by backend)
  recentActivity: DashboardRecentActivityItem[];

  // Loading / error states
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;

  // Granular states (kept for backward-compatibility with component prop shapes)
  isCoreLoading: boolean;
  isCoreFetching: boolean;
  isCoreError: boolean;
  isAttentionLoading: boolean;
  isAttentionFetching: boolean;
  isAttentionError: boolean;
  isRecentLoading: boolean;
  isRecentFetching: boolean;
  isRecentError: boolean;

  refetchCore: () => void;
  refetchAttention: () => void;
  refetchRecent: () => void;
  refetchAll: () => void;

  // Convenience accessors kept so TutorGrowthChart / stat-trend logic can stay largely unchanged
  approvedTutors: Pick<DashboardChartDay, "date" | "count">[];
  tutorRequests: Pick<DashboardChartDay, "date" | "count">[];
  tutorApplications: Pick<DashboardChartDay, "date" | "count">[];
  approvedTutorsTotal: number;
  tutorRequestsTotal: number;
  tutorApplicationsTotal: number;
  pendingTutorApplicationsTotal: number;
  inquiriesTotal: number;
};

// Hook

export const useDashboardAnalytics = (): DashboardAnalytics => {
  const query = useFetchFullDashboardQuery();
  const { data, isLoading, isFetching, isError, refetch } = query;

  const refetchAll = useCallback(() => refetch(), [refetch]);

  return {
    // Raw structured data
    summary: data?.summary,
    trends: data?.trends,
    chartData: data?.chart,
    attention: data?.attention,
    recentActivity: data?.recentActivity ?? [],

    // Loading / error
    isLoading,
    isFetching,
    isError,

    // All granular flags map to the same single query
    isCoreLoading: isLoading,
    isCoreFetching: isFetching,
    isCoreError: isError,
    isAttentionLoading: isLoading,
    isAttentionFetching: isFetching,
    isAttentionError: isError,
    isRecentLoading: isLoading,
    isRecentFetching: isFetching,
    isRecentError: isError,

    // Single refetch for all sections
    refetchCore: refetchAll,
    refetchAttention: refetchAll,
    refetchRecent: refetchAll,
    refetchAll,

    // Convenience chart accessors (used by TutorGrowthChart)
    approvedTutors: data?.chart.approvedTutors ?? [],
    tutorRequests: data?.chart.tutorRequests ?? [],
    tutorApplications: data?.chart.tutorApplications ?? [],
    approvedTutorsTotal: data?.chart.totals.approvedTutors ?? 0,
    tutorRequestsTotal: data?.chart.totals.tutorRequests ?? 0,
    tutorApplicationsTotal: data?.chart.totals.tutorApplications ?? 0,
    pendingTutorApplicationsTotal:
      data?.attention.pendingTutorApplicationsTotal ?? 0,
    inquiriesTotal: data?.attention.inquiriesTotal ?? 0,
  };
};
