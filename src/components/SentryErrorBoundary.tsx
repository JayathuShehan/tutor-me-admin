"use client";

import * as Sentry from "@sentry/nextjs";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type FallbackProps = {
  resetError: () => void;
};

const ErrorFallback = ({ resetError }: FallbackProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12 text-gray-900 dark:bg-gray-900 dark:text-white">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-500">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          We hit an unexpected error.
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
          The admin dashboard could not finish loading this view. Try again, or
          refresh the page if the issue keeps happening.
        </p>
        <button
          type="button"
          onClick={resetError}
          className="mt-6 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
        >
          Try again
        </button>
      </div>
    </div>
  );
};

export const SentryErrorBoundary = ({ children }: Props) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};
