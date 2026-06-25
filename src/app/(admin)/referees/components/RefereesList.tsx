"use client";

import DataTable, { Column } from "@/components/tables/DataTable";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TABLE_CONFIG } from "@/configs/table";
import { useFetchRefereesQuery } from "@/store/api/splits/referees";
import { Referee } from "@/types/response-types";
import { Copy } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { AddReferee } from "./AddReferee";
import { DeleteReferee } from "./DeleteReferee";
import { EditReferee } from "./EditReferee";
import { RefereeDetails } from "./RefereeDetails";
import { RegisteredUsersTab } from "./RegisteredUsersTab";

type TabValue = "manual" | "registered";

export default function RefereesList() {
  const [page, setPage] = useState(TABLE_CONFIG.DEFAULT_PAGE);
  const [limit, setLimit] = useState(TABLE_CONFIG.DEFAULT_LIMIT);
  const [activeTab, setActiveTab] = useState<TabValue>("manual");

  const { data, isFetching } = useFetchRefereesQuery(
    { page, limit },
    { refetchOnMountOrArgChange: true },
  );

  const referees: Referee[] = data?.results ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalResults = data?.totalResults ?? 0;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success("Referral code copied!");
    });
  };

  const columns: Column<Referee>[] = [
    {
      key: "name",
      header: "Name",
      className:
        "min-w-[150px] max-w-[200px] truncate overflow-hidden sticky left-0 z-20 bg-white dark:bg-gray-900",
      render: (row) => (
        <span
          title={row.name}
          className="block truncate text-sm font-medium text-gray-900 dark:text-white"
          style={{ width: "inherit" }}
        >
          {row.name}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      className: "min-w-[180px] max-w-[220px] truncate overflow-hidden",
      render: (row) => (
        <span
          title={row.email}
          className="block truncate text-xs text-gray-600 dark:text-gray-400"
        >
          {row.email}
        </span>
      ),
    },
    {
      key: "contactNumber",
      header: "Contact Number",
      className: "min-w-[130px] max-w-[160px] whitespace-nowrap",
      render: (row) => (
        <span className="text-xs text-gray-700 dark:text-gray-300">
          {row.contactNumber}
        </span>
      ),
    },
    {
      key: "gender",
      header: "Gender",
      className: "min-w-[80px] max-w-[100px] whitespace-nowrap",
      render: (row) => (
        <span className="text-xs capitalize text-gray-700 dark:text-gray-300">
          {row.gender || "—"}
        </span>
      ),
    },
    {
      key: "referralCode",
      header: "Referral Code",
      className: "min-w-[140px] max-w-[180px]",
      render: (row) =>
        row.referralCode ? (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm tracking-wider text-gray-800 dark:text-gray-100">
              {row.referralCode}
            </span>
            <button
              type="button"
              title="Copy referral code"
              onClick={() => copyCode(row.referralCode)}
              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="italic text-sm text-gray-400">No code</span>
        ),
    },
    {
      key: "referralCount",
      header: "Referral Count",
      align: "center",
      className: "min-w-[110px] max-w-[130px]",
      render: (row) => (
        <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2">
          {row.referralCount}
        </span>
      ),
    },
    {
      key: "actions",
      header: <div className="text-center w-full">Actions</div>,
      align: "center",
      className:
        "min-w-[120px] max-w-[120px] sticky right-0 z-20 bg-white dark:bg-gray-900",
      render: (row) => (
        <div className="flex justify-center items-center gap-2">
          <RefereeDetails
            name={row.name}
            email={row.email}
            contactNumber={row.contactNumber}
            gender={row.gender}
            avatar={row.avatar}
            referralCode={row.referralCode}
            referralCount={row.referralCount}
            createdAt={row.createdAt}
            accountName={row.accountName}
            accountNumber={row.accountNumber}
            bankName={row.bankName}
          />
          <EditReferee referee={row} />
          <DeleteReferee id={row.id} name={row.name} />
        </div>
      ),
    },
  ];

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

        {activeTab === "manual" && <AddReferee />}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabValue);
          setPage(TABLE_CONFIG.DEFAULT_PAGE);
        }}
      >
        <TabsList className="mb-5">
          <TabsTrigger value="manual">Manual Referees</TabsTrigger>
          <TabsTrigger value="registered">Registered Users</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <DataTable
            columns={columns}
            data={referees}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalResults={totalResults}
            limit={limit}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(TABLE_CONFIG.DEFAULT_PAGE);
            }}
            isLoading={isFetching}
            emptyMessage="No referees yet. Click 'Add Member' to create one."
            preserveDataOrder
          />
        </TabsContent>

        <TabsContent value="registered">
          <RegisteredUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
