"use client";

import DataTable, { type Column } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import { TABLE_CONFIG } from "@/configs/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_FAQ_CATEGORY,
  FAQ_CATEGORY_OPTIONS,
  getFaqCategoryLabel,
  type FaqCategory,
} from "@/lib/faq-categories";
import {
  useDeleteFaqMutation,
  useFetchFaqsQuery,
} from "@/store/api/splits/faqs";
import { fadeUp, staggerContainer } from "@/types/animation-types";
import { sortByLatestTimestampDesc } from "@/utils/table-sorting";
import { Layers3, RotateCcw, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { DeleteFAQ } from "./DeleteFAQ";
import { UpdateFAQ } from "./edit-faq/UpdateFAQ";
import { FAQDetails } from "./FAQDetails";
import { cn } from "@/lib/utils";

interface FAQ {
  id: string;
  category?: FaqCategory;
  question?: string;
  answer?: string;
  createdAt: string;
}

const ALL_CATEGORIES = "all";

type CategoryFilter = typeof ALL_CATEGORIES | FaqCategory;

export default function FAQTable() {
  const [page, setPage] = useState<number>(TABLE_CONFIG.DEFAULT_PAGE);
  const [deleteFaq] = useDeleteFaqMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>(ALL_CATEGORIES);
  const [limit, setLimit] = useState<number>(TABLE_CONFIG.DEFAULT_LIMIT);

  // TODO:Best for small/medium datasets. For very large datasets, move search to the backend.
  const { data, isLoading } = useFetchFaqsQuery({
    page: 1,
    limit: 1000,
    sortBy: "updatedAt:desc",
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const hasFilters =
    Boolean(searchTerm.trim()) || categoryFilter !== ALL_CATEGORIES;

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter(ALL_CATEGORIES);
    setPage(TABLE_CONFIG.DEFAULT_PAGE);
  };

  const getSafeValue = (
    value: string | undefined | null,
    fallback = "N/A",
  ): string => {
    if (value === undefined || value === null || value.trim() === "") {
      return fallback;
    }
    return value;
  };

  const getFaqCategoryValue = (category?: FaqCategory): FaqCategory =>
    category ?? DEFAULT_FAQ_CATEGORY;

  // Filter against the full fetched dataset
  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const faqs = data?.results || [];

    return sortByLatestTimestampDesc(
      faqs.filter((faq: FAQ) => {
        const matchesCategory =
          categoryFilter === ALL_CATEGORIES ||
          getFaqCategoryValue(faq.category) === categoryFilter;

        if (!matchesCategory) {
          return false;
        }

        if (!query) {
          return true;
        }

        const question = getSafeValue(faq.question, "").toLowerCase();
        const answer = getSafeValue(faq.answer, "").toLowerCase();
        const category = getFaqCategoryLabel(faq.category).toLowerCase();

        return (
          question.includes(query) ||
          answer.includes(query) ||
          category.includes(query)
        );
      }),
    );
  }, [categoryFilter, data, searchTerm]);

  // Apply pagination after filtering
  const paginatedFaqs = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredFaqs.slice(startIndex, endIndex);
  }, [filteredFaqs, page, limit]);

  const totalResults = filteredFaqs.length;
  const totalPages = Math.ceil(totalResults / limit);

  const columns: Column<FAQ>[] = [
    {
      key: "question",
      header: "Question",
      className:
        "min-w-[200px] max-w-[300px] truncate overflow-hidden cursor-default",
      render: (row: FAQ) => {
        const safeQuestion = getSafeValue(row.question, "No question provided");
        return (
          <span
            title={`Question: ${safeQuestion}`}
            className={`block truncate ${!row.question ? "text-gray-400 italic" : ""}`}
          >
            {safeQuestion}
          </span>
        );
      },
    },
    {
      key: "answer",
      header: "Answer",
      className:
        "min-w-[200px] max-w-[300px] truncate overflow-hidden cursor-default",
      bodyClassName: "text-left",
      render: (row: FAQ) => {
        const safeAnswer = getSafeValue(row.answer, "No answer provided");
        return (
          <span
            title={`Answer: ${safeAnswer}`}
            className={`block truncate ${!row.answer ? "text-gray-400 italic" : ""}`}
          >
            {safeAnswer}
          </span>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      className:
        "min-w-[140px] max-w-[160px] truncate overflow-hidden cursor-default",
      render: (row: FAQ) => (
        <span
          title={`Category: ${getFaqCategoryLabel(row.category)}`}
          className="inline-flex min-w-[6.5rem] justify-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
        >
          {getFaqCategoryLabel(row.category)}
        </span>
      ),
    },
    {
      key: "view",
      header: "View",
      align: "center",
      className:
        "min-w-[80px] max-w-[80px] sticky right-[160px] z-20 bg-white dark:bg-gray-900",
      render: (row: FAQ) => (
        <FAQDetails
          id={row.id}
          category={row.category}
          question={getSafeValue(row.question, "No question provided")}
          answer={getSafeValue(row.answer, "No answer provided")}
          createdAt={row.createdAt}
        />
      ),
    },
    {
      key: "edit",
      header: "Edit",
      align: "center",
      className:
        "min-w-[80px] max-w-[80px] sticky right-[80px] z-20 bg-white dark:bg-gray-900",
      render: (row: FAQ) => (
        <UpdateFAQ
          id={row.id}
          category={row.category}
          question={getSafeValue(row.question, "")}
          answer={getSafeValue(row.answer, "")}
        />
      ),
    },
    {
      key: "delete",
      header: "Delete",
      align: "center",
      className:
        "min-w-[80px] max-w-[80px] sticky right-0 z-20 bg-white dark:bg-gray-900",
      render: (row: FAQ) => <DeleteFAQ faqId={row.id} />,
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="space-y-4"
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            FAQs
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Filter FAQs across the full dataset and manage them across desktop
            and mobile.
          </p>
        </div>

        <motion.div
          layout
          className={cn(
            "grid w-full gap-3 sm:max-w-xl",
            hasFilters
              ? "sm:grid-cols-[minmax(0,1fr)_minmax(160px,0.65fr)_44px]"
              : "sm:grid-cols-[minmax(0,1fr)_minmax(160px,0.65fr)]",
          )}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(TABLE_CONFIG.DEFAULT_PAGE);
              }}
              placeholder="Filter by question, answer, or category..."
              className="h-11 w-full pl-10 pr-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(TABLE_CONFIG.DEFAULT_PAGE);
                }}
                aria-label="Clear FAQ search"
                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select
            value={categoryFilter}
            onValueChange={(value: CategoryFilter) => {
              setCategoryFilter(value);
              setPage(TABLE_CONFIG.DEFAULT_PAGE);
            }}
          >
            <SelectTrigger className="h-11 min-h-11 w-full sm:w-44">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {FAQ_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              aria-label="Reset filters"
              title="Reset filters"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="hidden md:block">
        <motion.div layout className="overflow-hidden rounded-2xl">
          <DataTable
            columns={columns}
            data={paginatedFaqs}
            page={page}
            totalPages={totalPages}
            totalResults={totalResults}
            limit={limit}
            onLimitChange={setLimit}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            bulkDelete={{
              entityName: "FAQ",
              deleteRow: (row) => deleteFaq(String(row.id)).unwrap(),
            }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:hidden"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 h-9 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            </motion.div>
          ))
        ) : paginatedFaqs.length > 0 ? (
          paginatedFaqs.map((row) => {
            const safeQuestion = getSafeValue(
              row.question,
              "No question provided",
            );
            const safeAnswer = getSafeValue(row.answer, "No answer provided");
            const safeCategory = getFaqCategoryLabel(row.category);

            return (
              <motion.div
                key={row.id}
                variants={fadeUp}
                layout
                whileHover={{ y: -3 }}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {safeQuestion}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-sm text-gray-500 dark:text-gray-400">
                      {safeAnswer}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <Layers3 className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Category
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {safeCategory}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="flex justify-center rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                    <FAQDetails
                      id={row.id}
                      category={row.category}
                      question={safeQuestion}
                      answer={safeAnswer}
                      createdAt={row.createdAt}
                    />
                  </div>
                  <div className="flex justify-center rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                    <UpdateFAQ
                      id={row.id}
                      category={row.category}
                      question={getSafeValue(row.question, "")}
                      answer={getSafeValue(row.answer, "")}
                    />
                  </div>
                  <div className="flex justify-center rounded-xl border border-gray-200 p-2 dark:border-gray-700">
                    <DeleteFAQ faqId={row.id} />
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                No FAQs found
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try a different search term.
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>

      {!isLoading && paginatedFaqs.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900 md:block"
        >
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            No FAQs found
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try a different search term.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
