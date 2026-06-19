"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFetchRefereesQuery } from "@/store/api/splits/referees";
import { Referee } from "@/types/response-types";
import { Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { AddReferee } from "./AddReferee";
import { DeleteReferee } from "./DeleteReferee";
import { EditReferee } from "./EditReferee";
import { RefereeDetails } from "./RefereeDetails";

export default function RefereesList() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isFetching } = useFetchRefereesQuery({ page, limit });

  const referees: Referee[] = data?.results ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalResults = data?.totalResults ?? 0;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Referral code copied!");
    });
  };

  return (
    <div className="max-w-full p-5 lg:p-6">
      <div className="mb-5 lg:mb-7 flex items-center justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 dark:text-white/90">
            Referees
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Members who bring tutors to us using their referral code.
          </p>
        </div>
        <AddReferee />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {isFetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : referees.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No referees yet. Click &quot;Add Member&quot; to create one.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-white/5">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Contact Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Referral Code
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Referral Count
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      View Details
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referees.map((referee) => (
                    <TableRow
                      key={referee.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {referee.name}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                          {referee.email}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {referee.contactNumber}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        {referee.referralCode ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm text-gray-800 dark:text-gray-100 tracking-wider">
                              {referee.referralCode}
                            </span>
                            <button
                              type="button"
                              title="Copy referral code"
                              onClick={() => copyCode(referee.referralCode)}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-sm">
                            No code
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2">
                          {referee.referralCount}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <RefereeDetails
                            name={referee.name}
                            email={referee.email}
                            contactNumber={referee.contactNumber}
                            gender={referee.gender}
                            avatar={referee.avatar}
                            referralCode={referee.referralCode}
                            referralCount={referee.referralCount}
                            createdAt={referee.createdAt}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex justify-center items-center gap-3">
                          <EditReferee referee={referee} />
                          <DeleteReferee id={referee.id} name={referee.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">
                  {totalResults} referee{totalResults !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
