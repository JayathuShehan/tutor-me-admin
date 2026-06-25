/* eslint-disable @typescript-eslint/no-explicit-any */

import { cn } from "@/lib/utils";
import { TABLE_CONFIG } from "@/configs/table";
import { sortByLatestTimestampDesc } from "@/utils/table-sorting";
import { Trash2 } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Checkbox } from "../ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
  headClassName?: string;
  bodyClassName?: string;
  align?: "start" | "center" | "end";
}

export interface BulkDeleteConfig<T> {
  entityName: string;
  deleteRow: (row: T) => Promise<unknown>;
  isRowSelectable?: (row: T) => boolean;
}

const hasStickyLeftClass = (className?: string) =>
  Boolean(
    className?.match(/(^|\s)sticky(\s|$)/) && className.includes("left-"),
  );

const hasStickyRightClass = (className?: string) =>
  Boolean(
    className?.match(/(^|\s)sticky(\s|$)/) && className.includes("right-"),
  );

const CHECKBOX_COLUMN_WIDTH = 52;
const DEFAULT_STICKY_COLUMN_WIDTH = 180;

const getPxValueFromClass = (className: string, prefix: string) => {
  const match = className.match(
    new RegExp(`(?:^|\\s)${prefix}-\\[(\\d+)px\\]`),
  );
  return match ? Number(match[1]) : null;
};

const getStickyColumnWidth = (className: string) => {
  const width = getPxValueFromClass(className, "w");
  const minWidth = getPxValueFromClass(className, "min-w");
  const maxWidth = getPxValueFromClass(className, "max-w");

  if (width) return width;
  if (minWidth && maxWidth && minWidth === maxWidth) return minWidth;
  if (minWidth && maxWidth) return DEFAULT_STICKY_COLUMN_WIDTH;
  return minWidth ?? maxWidth ?? DEFAULT_STICKY_COLUMN_WIDTH;
};

const getRowSurfaceClass = (isSelected: boolean, rowIndex: number) => {
  if (isSelected) return "bg-blue-50 dark:bg-blue-950";
  return rowIndex % 2 === 0
    ? "bg-slate-50 dark:bg-gray-800"
    : "bg-white dark:bg-gray-900";
};

const getBulkStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "approved":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
    case "suspended":
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200";
  }
};

export interface BulkStatusUpdateConfig<T> {
  entityName: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  updateRow: (row: T, status: string) => Promise<unknown>;
  isRowSelectable?: (row: T) => boolean;
  canUpdateRow?: (row: T, status: string) => boolean;
  getBlockedStatusUpdateMessage?: (blockedRows: T[], status: string) => string;
  onCompleted?: () => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalResults?: number;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  preserveDataOrder?: boolean;
  bulkDelete?: BulkDeleteConfig<T>;
  bulkStatusUpdate?: BulkStatusUpdateConfig<T>;
}

function getPaginationRange({
  currentPage,
  totalPages,
  siblingCount = 1,
}: {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
}) {
  const totalPageNumbers = siblingCount * 2 + 5;

  if (totalPageNumbers >= totalPages) {
    return Array.from(
      { length: totalPages },
      (_, currentPage) => currentPage + 1,
    );
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSiblingIndex > 2;
  const showRightDots = rightSiblingIndex < totalPages - 1;

  const pages: (number | "dots")[] = [];

  if (!showLeftDots && showRightDots) {
    const leftRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, currentPage) => currentPage + 1,
    );
    pages.push(...leftRange, "dots", totalPages);
  } else if (showLeftDots && !showRightDots) {
    const rightRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, currentPage) => totalPages - (3 + siblingCount * 2) + currentPage + 1,
    );
    pages.push(1, "dots", ...rightRange);
  } else if (showLeftDots && showRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, currentPage) => leftSiblingIndex + currentPage,
    );
    pages.push(1, "dots", ...middleRange, "dots", totalPages);
  }

  return pages;
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  page = 1,
  totalPages = 1,
  onPageChange,
  totalResults = 0,
  limit = 10,
  onLimitChange,
  isLoading = false,
  emptyMessage = "This is empty. Please create a new one.",
  className,
  preserveDataOrder = false,
  bulkDelete,
  bulkStatusUpdate,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRowsById, setSelectedRowsById] = useState<Map<string, T>>(
    new Map(),
  );
  const [bulkStatusValue, setBulkStatusValue] = useState("");
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const hasRowSelection = Boolean(bulkDelete || bulkStatusUpdate);
  const showPagination = totalResults > limit;
  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  const paginationRange = getPaginationRange({
    currentPage: page,
    totalPages,
    siblingCount: 1,
  });
  const latestSortedData = useMemo(
    () => (preserveDataOrder ? data : sortByLatestTimestampDesc(data)),
    [data, preserveDataOrder],
  );
  const stickyColumnMeta = useMemo(() => {
    let nextLeft = hasRowSelection ? CHECKBOX_COLUMN_WIDTH : 0;
    const metaByColumn = columns.map((col) => {
      const className = `${col.className ?? ""} ${col.headClassName ?? ""} ${col.bodyClassName ?? ""}`;
      const isLeftSticky = hasStickyLeftClass(className);

      if (!isLeftSticky) {
        return {
          isLeftSticky,
          isLastLeftSticky: false,
          left: 0,
          width: undefined,
        };
      }

      const width = getStickyColumnWidth(className);
      const meta = {
        isLeftSticky,
        isLastLeftSticky: false,
        left: nextLeft,
        width,
      };
      nextLeft += width;
      return meta;
    });

    let lastLeftStickyIndex = -1;
    metaByColumn.forEach((meta, index) => {
      if (meta.isLeftSticky) lastLeftStickyIndex = index;
    });

    return metaByColumn.map((meta, index) => ({
      ...meta,
      isLastLeftSticky: index === lastLeftStickyIndex,
    }));
  }, [columns, hasRowSelection]);
  const selectableRows = useMemo(
    () =>
      hasRowSelection
        ? latestSortedData.filter(
            (row) =>
              (bulkDelete?.isRowSelectable?.(row) ?? true) &&
              (bulkStatusUpdate?.isRowSelectable?.(row) ?? true),
          )
        : [],
    [bulkDelete, bulkStatusUpdate, hasRowSelection, latestSortedData],
  );
  const currentPageSelectedRows = useMemo(
    () => selectableRows.filter((row) => selectedIds.has(String(row.id))),
    [selectableRows, selectedIds],
  );
  const selectedRows = useMemo(
    () => [...selectedRowsById.values()],
    [selectedRowsById],
  );
  const selectedBulkStatusOption = bulkStatusUpdate?.options.find(
    (option) => option.value === bulkStatusValue,
  );
  const allRowsSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedIds.has(String(row.id)));
  const someRowsSelected =
    currentPageSelectedRows.length > 0 && !allRowsSelected;

  useEffect(() => {
    if (!hasRowSelection) {
      // Use functional updater so we only create a new reference when the
      // collection is actually non-empty. Without this guard, calling
      // setSelectedIds(new Set()) always produces a new object reference,
      // which is in the dependency array and triggers the effect again → loop.
      setSelectedIds((prev) => (prev.size > 0 ? new Set() : prev));
      setSelectedRowsById((prev) => (prev.size > 0 ? new Map() : prev));
      return;
    }

    setSelectedRowsById((current) => {
      let changed = false;
      const next = new Map(current);

      latestSortedData.forEach((row) => {
        const rowId = String(row.id);
        const isSelectable =
          (bulkDelete?.isRowSelectable?.(row) ?? true) &&
          (bulkStatusUpdate?.isRowSelectable?.(row) ?? true);

        if (!isSelectable) {
          if (next.delete(rowId)) {
            changed = true;
          }
          return;
        }

        if (selectedIds.has(rowId)) {
          next.set(rowId, row);
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [
    bulkDelete,
    bulkStatusUpdate,
    hasRowSelection,
    latestSortedData,
    selectedIds,
  ]);

  useEffect(() => {
    setBulkStatusValue("");
    setIsBulkStatusDialogOpen(false);
  }, [bulkStatusUpdate?.options]);

  useEffect(() => {
    setSelectedIds((current) => {
      const next = new Set(
        [...current].filter((selectedId) => selectedRowsById.has(selectedId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [selectedRowsById]);

  useEffect(() => {
    if (selectedRows.length === 0) {
      setBulkStatusValue("");
      setIsBulkStatusDialogOpen(false);
    }
  }, [selectedRows.length]);

  const toggleAllRows = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      selectableRows.forEach((row) => {
        const rowId = String(row.id);
        if (checked) next.add(rowId);
        else next.delete(rowId);
      });
      return next;
    });
    setSelectedRowsById((current) => {
      const next = new Map(current);
      selectableRows.forEach((row) => {
        const rowId = String(row.id);
        if (checked) next.set(rowId, row);
        else next.delete(rowId);
      });
      return next;
    });
  };

  const toggleRow = (row: T, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const id = String(row.id);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    setSelectedRowsById((current) => {
      const next = new Map(current);
      const id = String(row.id);
      if (checked) next.set(id, row);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedRowsById(new Map());
  };

  const resetBulkStatusSelection = () => {
    setBulkStatusValue("");
    setIsBulkStatusDialogOpen(false);
  };

  const getBlockedBulkStatusRows = (status: string) => {
    if (!bulkStatusUpdate?.canUpdateRow) return [];

    return selectedRows.filter(
      (row) => !bulkStatusUpdate.canUpdateRow?.(row, status),
    );
  };

  const showBlockedBulkStatusMessage = (blockedRows: T[], status: string) => {
    if (!bulkStatusUpdate || blockedRows.length === 0) return;

    toast.error(
      bulkStatusUpdate.getBlockedStatusUpdateMessage?.(blockedRows, status) ??
        `${blockedRows.length} selected ${bulkStatusUpdate.entityName}${blockedRows.length === 1 ? "" : "s"} cannot be updated to ${status}.`,
    );
  };

  const handleBulkStatusSelect = (status: string) => {
    const blockedRows = getBlockedBulkStatusRows(status);

    if (blockedRows.length > 0) {
      setBulkStatusValue("");
      setIsBulkStatusDialogOpen(false);
      showBlockedBulkStatusMessage(blockedRows, status);
      return;
    }

    setBulkStatusValue(status);

    if (status && selectedRows.length > 0) {
      setIsBulkStatusDialogOpen(true);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDelete || selectedRows.length === 0) return;

    setIsBulkDeleting(true);
    const results = await Promise.allSettled(
      selectedRows.map((row) => bulkDelete.deleteRow(row)),
    );
    const succeededIds = results.flatMap((result, index) =>
      result.status === "fulfilled" ? [String(selectedRows[index].id)] : [],
    );
    const failedCount = results.length - succeededIds.length;

    setSelectedIds((current) => {
      const next = new Set(current);
      succeededIds.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedRowsById((current) => {
      const next = new Map(current);
      succeededIds.forEach((id) => next.delete(id));
      return next;
    });
    setIsBulkDeleting(false);

    if (succeededIds.length > 0) {
      toast.success(
        `${succeededIds.length} ${bulkDelete.entityName}${succeededIds.length === 1 ? "" : "s"} deleted successfully`,
      );
    }
    if (failedCount > 0) {
      toast.error(
        `Failed to delete ${failedCount} ${bulkDelete.entityName}${failedCount === 1 ? "" : "s"}`,
      );
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusUpdate || selectedRows.length === 0 || !bulkStatusValue) {
      return;
    }

    const blockedRows = getBlockedBulkStatusRows(bulkStatusValue);

    if (blockedRows.length > 0) {
      resetBulkStatusSelection();
      showBlockedBulkStatusMessage(blockedRows, bulkStatusValue);
      return;
    }

    setIsBulkStatusUpdating(true);
    const results = await Promise.allSettled(
      selectedRows.map((row) =>
        bulkStatusUpdate.updateRow(row, bulkStatusValue),
      ),
    );
    setIsBulkStatusUpdating(false);
    resetBulkStatusSelection();

    const succeededCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const failedCount = results.length - succeededCount;

    if (succeededCount > 0) {
      toast.success(
        `${succeededCount} ${bulkStatusUpdate.entityName}${succeededCount === 1 ? "" : "s"} updated to ${selectedBulkStatusOption?.label ?? bulkStatusValue}`,
      );
      bulkStatusUpdate.onCompleted?.();
    }
    if (failedCount > 0) {
      toast.error(
        `Failed to update ${failedCount} ${bulkStatusUpdate.entityName}${failedCount === 1 ? "" : "s"}`,
      );
    }
  };

  const rowsToRender = isLoading
    ? Array.from({ length: limit }).map((_, currentPage) => ({
        id: `skeleton-${currentPage}`,
      }))
    : latestSortedData;

  if (!isLoading && (!data || data.length === 0)) {
    return (
      <div className="flex justify-center items-center h-48 rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3 dark:text-white/90">
        <p className="text-gray-500 dark:text-white/70">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-gray-900 dark:text-white/90 w-full",
        className,
      )}
    >
      {(hasRowSelection || onLimitChange) && (
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-2 dark:border-white/5 dark:bg-white/3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Bulk actions
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasRowSelection && selectedRows.length > 0
                ? `${selectedRows.length} row${selectedRows.length === 1 ? "" : "s"} selected`
                : `(${totalResults}) Records Found`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {onLimitChange && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="hidden whitespace-nowrap sm:inline">
                  Rows per page
                </span>
                <select
                  value={limit}
                  onChange={(event) => {
                    onPageChange?.(1);
                    onLimitChange(Number(event.target.value));
                  }}
                  aria-label="Rows per page"
                  className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {TABLE_CONFIG.PAGINATION_LIMITS.map((rowLimit) => (
                    <option key={rowLimit} value={rowLimit}>
                      {rowLimit}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {hasRowSelection && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={
                    selectedRows.length === 0 ||
                    isBulkDeleting ||
                    isBulkStatusUpdating
                  }
                  className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent"
                >
                  Clear
                </button>
                {bulkStatusUpdate && (
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkStatusValue}
                      onChange={(event) =>
                        handleBulkStatusSelect(event.target.value)
                      }
                      aria-label={`Bulk ${bulkStatusUpdate.entityName} status`}
                      disabled={
                        selectedRows.length === 0 ||
                        isBulkDeleting ||
                        isBulkStatusUpdating
                      }
                      className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="" disabled>
                        Update status
                      </option>
                      {bulkStatusUpdate.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <AlertDialog
                      open={isBulkStatusDialogOpen}
                      onOpenChange={(open) => {
                        if (isBulkStatusUpdating) return;

                        if (!open) {
                          resetBulkStatusSelection();
                          return;
                        }

                        setIsBulkStatusDialogOpen(open);
                      }}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Update {selectedRows.length} selected{" "}
                            {bulkStatusUpdate.entityName}
                            {selectedRows.length === 1 ? "" : "s"}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            You are about to update {selectedRows.length}{" "}
                            selected row{selectedRows.length === 1 ? "" : "s"}{" "}
                            to{" "}
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold align-middle",
                                getBulkStatusBadgeClass(bulkStatusValue),
                              )}
                            >
                              {selectedBulkStatusOption?.label ??
                                bulkStatusValue}
                            </span>
                            . Existing individual row edit actions will remain
                            available after this bulk update.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            disabled={isBulkStatusUpdating}
                            onClick={resetBulkStatusSelection}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(event) => {
                              event.preventDefault();
                              void handleBulkStatusUpdate();
                            }}
                            disabled={isBulkStatusUpdating}
                          >
                            {isBulkStatusUpdating
                              ? "Updating..."
                              : "Update status"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                {bulkDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        disabled={
                          selectedRows.length === 0 ||
                          isBulkDeleting ||
                          isBulkStatusUpdating
                        }
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-white dark:border-red-500/30 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10 dark:disabled:border-gray-700 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete selected
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete {selectedRows.length} selected{" "}
                          {bulkDelete.entityName}
                          {selectedRows.length === 1 ? "" : "s"}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          You are about to delete {selectedRows.length} selected{" "}
                          row{selectedRows.length === 1 ? "" : "s"}. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          disabled={isBulkDeleting}
                          className="bg-red-500 text-white hover:bg-red-600"
                        >
                          {isBulkDeleting ? "Deleting..." : "Delete selected"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="custom-scrollbar relative isolate max-w-full overflow-x-auto">
        <div className="min-w-[600px]">
          <Table className="w-full border-separate border-spacing-0">
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/5 dark:text-white/90">
              <TableRow>
                {hasRowSelection && (
                  <TableCell
                    isHeader
                    className="sticky left-0 z-50 w-[52px] min-w-[52px] max-w-[52px] overflow-hidden bg-white px-4 py-3 dark:bg-gray-900"
                    style={{
                      left: 0,
                      width: CHECKBOX_COLUMN_WIDTH,
                      minWidth: CHECKBOX_COLUMN_WIDTH,
                      maxWidth: CHECKBOX_COLUMN_WIDTH,
                    }}
                  >
                    <Checkbox
                      checked={
                        allRowsSelected
                          ? true
                          : someRowsSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        toggleAllRows(checked === true)
                      }
                      aria-label="Select all rows on this page"
                      disabled={selectableRows.length === 0}
                    />
                  </TableCell>
                )}
                {columns.map((col, colIndex) => {
                  const stickyMeta = stickyColumnMeta[colIndex];
                  const isRightStickyColumn = hasStickyRightClass(
                    `${col.className ?? ""} ${col.headClassName ?? ""} ${col.bodyClassName ?? ""}`,
                  );

                  return (
                    <TableCell
                      key={col.key}
                      isHeader
                      className={cn(
                        "px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-white/90",
                        col.align ? `text-${col.align}` : "text-start",
                        col.className,
                        col.headClassName,
                        stickyMeta?.isLeftSticky &&
                          "sticky z-50 overflow-hidden whitespace-nowrap bg-white dark:bg-gray-900",
                        isRightStickyColumn &&
                          "sticky z-50 overflow-hidden whitespace-nowrap bg-white dark:bg-gray-900",
                      )}
                      style={
                        stickyMeta?.isLeftSticky
                          ? {
                              left: stickyMeta.left,
                              width: stickyMeta.width,
                              minWidth: stickyMeta.width,
                              maxWidth: stickyMeta.width,
                            }
                          : undefined
                      }
                    >
                      {col.header}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
              {rowsToRender.map((row: any, rowIndex) => {
                const isRowSelected = selectedIds.has(String(row.id));
                const rowSurfaceClass = getRowSurfaceClass(
                  isRowSelected,
                  rowIndex,
                );

                return (
                  <TableRow key={row.id} className="group">
                    {hasRowSelection && (
                      <TableCell
                        className={cn(
                          "relative sticky left-0 z-40 w-[52px] min-w-[52px] max-w-[52px] overflow-hidden px-4 py-3 transition-colors",
                          rowSurfaceClass,
                          isRowSelected &&
                            "after:absolute after:left-0 after:top-0 after:h-full after:w-1 after:bg-blue-600 after:content-[''] dark:after:bg-blue-400",
                        )}
                        style={{
                          left: 0,
                          width: CHECKBOX_COLUMN_WIDTH,
                          minWidth: CHECKBOX_COLUMN_WIDTH,
                          maxWidth: CHECKBOX_COLUMN_WIDTH,
                        }}
                      >
                        {isLoading ? (
                          <Skeleton className="h-4 w-4" />
                        ) : (
                          <Checkbox
                            checked={selectedIds.has(String(row.id))}
                            onCheckedChange={(checked) =>
                              toggleRow(row, checked === true)
                            }
                            aria-label={`Select row ${row.id}`}
                            disabled={
                              !(
                                (bulkDelete?.isRowSelectable?.(row) ?? true) &&
                                (bulkStatusUpdate?.isRowSelectable?.(row) ??
                                  true)
                              )
                            }
                          />
                        )}
                      </TableCell>
                    )}
                    {columns.map((col, colIndex) => {
                      const stickyMeta = stickyColumnMeta[colIndex];
                      const isRightStickyColumn = hasStickyRightClass(
                        `${col.className ?? ""} ${col.headClassName ?? ""} ${col.bodyClassName ?? ""}`,
                      );
                      const isStickyColumn = Boolean(
                        stickyMeta?.isLeftSticky || isRightStickyColumn,
                      );

                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "relative z-0 max-w-[15.5vw] px-4 py-3 text-gray-500 text-theme-sm transition-colors dark:text-white/90",
                            col.align ? `text-${col.align}` : "text-start",
                            col.className,
                            col.bodyClassName,
                            rowSurfaceClass,
                            stickyMeta?.isLeftSticky &&
                              "sticky z-30 overflow-hidden whitespace-nowrap",
                            isRightStickyColumn &&
                              "sticky z-40 overflow-hidden whitespace-nowrap",
                          )}
                          style={
                            stickyMeta?.isLeftSticky
                              ? {
                                  left: stickyMeta.left,
                                  width: stickyMeta.width,
                                  minWidth: stickyMeta.width,
                                  maxWidth: stickyMeta.width,
                                }
                              : undefined
                          }
                        >
                          {isLoading ? (
                            <Skeleton className="h-4 w-[120px]" />
                          ) : col.render ? (
                            <div
                              className={cn(
                                "flex items-center",
                                col.align
                                  ? `justify-${col.align}`
                                  : "justify-start",
                                isStickyColumn &&
                                  "w-full min-w-0 max-w-full overflow-hidden whitespace-nowrap text-ellipsis",
                              )}
                            >
                              {col.render(row)}
                            </div>
                          ) : (
                            <div className="overflow-hidden whitespace-nowrap overflow-ellipsis fade-out">
                              {(row as Record<string, string>)[col.key]}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!isLoading && showPagination && (
        <Pagination className="text-gray-500 mt-2 dark:text-white/90 mb-3">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={isFirstPage} // <-- Add this
                onClick={() =>
                  !isFirstPage && onPageChange && onPageChange(page - 1)
                }
              />
            </PaginationItem>
            {paginationRange.map((pageNumber, index) => {
              if (pageNumber === "dots") {
                return (
                  <PaginationItem key={`dots-${index}`}>
                    <span className="px-3 text-gray-400 select-none">...</span>
                  </PaginationItem>
                );
              }
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={pageNumber === page}
                    onClick={() => onPageChange && onPageChange(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                disabled={isLastPage} // <-- Add this
                onClick={() =>
                  !isLastPage && onPageChange && onPageChange(page + 1)
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
