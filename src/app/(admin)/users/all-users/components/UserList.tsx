/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import DataTable from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TABLE_CONFIG } from "@/configs/table";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useDeleteUserMutation,
  useFetchUsersQuery,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
} from "@/store/api/splits/users";
import { getErrorInApiResult } from "@/utils/api";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronsUpDown,
  Copy,
  Loader2,
  Mail,
  Search,
  ShieldOff,
  SquarePen,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { DeleteUser } from "./DeleteUser";
import { UpdateUser } from "./edit-user/UpdateUser";
import { ResetPassword } from "./ResetPassword";
import { SendReferralCode } from "./SendReferralCode";
import { UserDetails } from "./ViewDetails";
interface User {
  id: string;
  tutorId?: string;
  tutor?: {
    id?: string;
    _id?: string;
  };
  name?: string;
  role?: "admin" | "user" | "tutor";
  status?: "pending" | "approved" | "rejected" | "suspended";
  email?: string;
  password?: string;
  phoneNumber?: string;
  birthday?: string;
  country?: string;
  city?: string;
  zip?: string;
  address?: string;
  state?: string;
  region?: string;
  gender?: "male" | "female" | "other";
  avatar?: string;
  createdAt?: string;
  referralCode?: string;
}

type UserRoleFilter = "all" | "admin" | "tutor";
type UserStatus = "pending" | "approved" | "rejected" | "suspended";
type UserSortField = "name" | "email";
type SortDirection = "asc" | "desc";
type UserSort = {
  field: UserSortField;
  direction: SortDirection;
} | null;

const STATUS_MENU_WIDTH = 176;
const STATUS_MENU_HEIGHT = 148;
const STATUS_MENU_GAP = 6;
const STATUS_MENU_VIEWPORT_PADDING = 8;

const USER_STATUS_BADGE_CLASSES: Record<UserStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  suspended: "bg-gray-200 text-gray-600 border-gray-300",
};

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = (status?.toLowerCase() as UserStatus) || "pending";
  const cls =
    USER_STATUS_BADGE_CLASSES[normalizedStatus] ??
    USER_STATUS_BADGE_CLASSES.pending;

  return (
    <span
      className={`inline-block min-w-22 text-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {normalizedStatus}
    </span>
  );
}

function SortableHeader({
  label,
  field,
  sort,
  onToggleSort,
}: {
  label: string;
  field: UserSortField;
  sort: UserSort;
  onToggleSort: (field: UserSortField) => void;
}) {
  const isActive = sort?.field === field;
  const isAscending = isActive && sort.direction === "asc";
  const isDescending = isActive && sort.direction === "desc";

  return (
    <button
      type="button"
      onClick={() => onToggleSort(field)}
      title={`Sort ${label}`}
      aria-label={`Sort ${label}`}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white ${
        isActive ? "text-brand-500 dark:text-brand-400" : ""
      }`}
    >
      <span className="truncate">{label}</span>
      {isAscending ? (
        <ArrowUp className="h-3.5 w-3.5 shrink-0" />
      ) : isDescending ? (
        <ArrowDown className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      )}
    </button>
  );
}

function UserStatusActions({ user }: { user: User }) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const status = (user.status || "pending").toLowerCase() as UserStatus;
  const isTutor = user.role === "tutor";

  const updateMenuPosition = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const hasSpaceBelow =
        rect.bottom + STATUS_MENU_GAP + STATUS_MENU_HEIGHT <=
        window.innerHeight - STATUS_MENU_VIEWPORT_PADDING;
      const top = hasSpaceBelow
        ? rect.bottom + STATUS_MENU_GAP
        : Math.max(
            STATUS_MENU_VIEWPORT_PADDING,
            rect.top - STATUS_MENU_GAP - STATUS_MENU_HEIGHT,
          );
      const left = Math.min(
        Math.max(STATUS_MENU_VIEWPORT_PADDING, rect.left),
        window.innerWidth - STATUS_MENU_WIDTH - STATUS_MENU_VIEWPORT_PADDING,
      );

      setMenuPos({ top, left });
    }
  }, []);

  const openDropdown = () => {
    if (isTutor || isLoading) return;

    updateMenuPosition();
    setDropdownOpen((current) => !current);
  };

  useEffect(() => {
    if (!dropdownOpen) return;

    const closeDropdown = () => setDropdownOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        btnRef.current?.contains(target)
      ) {
        return;
      }

      closeDropdown();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen, updateMenuPosition]);

  const updateStatus = async (nextStatus: UserStatus) => {
    setDropdownOpen(false);

    if (nextStatus === "rejected") {
      setShowReject(true);
      return;
    }
    if (nextStatus === "suspended") {
      setShowSuspend(true);
      return;
    }

    const result = await updateUser({
      id: user.id,
      status: nextStatus,
    } as never);

    const error = getErrorInApiResult(result);
    if (error) {
      toast.error(`Failed to update status: ${error}`);
      return;
    }

    const label = user.name || user.email || "User";
    toast.success(
      nextStatus === "approved"
        ? `"${label}" has been approved and notified by email.`
        : `${label} status changed to ${nextStatus}.`,
    );
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />

        <button
          ref={btnRef}
          type="button"
          title={
            isTutor
              ? "Tutor accounts must be managed from the Tutors table"
              : "Change status"
          }
          disabled={isTutor || isLoading}
          onClick={openDropdown}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
          Change
        </button>
      </div>

      {dropdownOpen &&
        !isTutor &&
        createPortal(
          <>
            <div
              ref={menuRef}
              style={{ top: menuPos.top, left: menuPos.left }}
              className="fixed z-[9999] w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            >
              {(status === "rejected" || status === "suspended") && (
                <button
                  type="button"
                  onClick={() => updateStatus("approved")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-700 transition hover:bg-green-50 dark:hover:bg-green-950/40"
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Approved
                </button>
              )}

              {status !== "rejected" && (
                <button
                  type="button"
                  onClick={() => updateStatus("rejected")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <XCircle className="h-4 w-4 shrink-0" />
                  Rejected
                </button>
              )}

              {status !== "suspended" && (
                <button
                  type="button"
                  onClick={() => updateStatus("suspended")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <ShieldOff className="h-4 w-4 shrink-0" />
                  Suspended
                </button>
              )}
            </div>
          </>,
          document.body,
        )}

      {showReject && (
        <RejectDialog user={user} onClose={() => setShowReject(false)} />
      )}
      {showSuspend && (
        <SuspendDialog user={user} onClose={() => setShowSuspend(false)} />
      )}
    </>
  );
}

// ─── Shared modal wrapper ─────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[900000] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ─── Reject dialog ────────────────────────────────────────────────────────────

function RejectDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const [updateUserStatus, { isLoading }] = useUpdateUserStatusMutation();
  const [message, setMessage] = useState("");

  const handleReject = async () => {
    const result = await updateUserStatus({
      id: user.id,
      status: "rejected",
      rejectionMessage: message.trim(),
    });
    const error = getErrorInApiResult(result);
    if (error) {
      toast.error(`Failed to reject: ${error}`);
      return;
    }
    toast.success(
      `"${user.name || user.email}" has been rejected and notified by email.`,
    );
    onClose();
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Reject Admin Account
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {user.name} · {user.email}
          </p>
        </div>
      </div>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        Reason / Message{" "}
        <span className="text-gray-400 font-normal">
          (optional — sent in the email)
        </span>
      </label>
      <textarea
        rows={4}
        maxLength={1000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. Your account details could not be verified. Please contact support."
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                   text-sm text-gray-900 dark:text-gray-100 p-3 resize-none
                   focus:outline-none focus:ring-2 focus:ring-red-400 transition"
      />
      <p className="text-xs text-gray-400 text-right mt-1">
        {message.length}/1000
      </p>

      <div className="flex justify-end gap-3 mt-5">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                     disabled:opacity-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold
                     disabled:opacity-50 transition flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Reject
        </button>
      </div>
    </Modal>
  );
}

// ─── Suspend dialog ───────────────────────────────────────────────────────────

function SuspendDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const [updateUserStatus, { isLoading }] = useUpdateUserStatusMutation();

  const handleSuspend = async () => {
    const result = await updateUserStatus({
      id: user.id,
      status: "suspended",
    });
    const error = getErrorInApiResult(result);
    if (error) {
      toast.error(`Failed to suspend: ${error}`);
      return;
    }
    toast.success(
      `"${user.name || user.email}" has been suspended and notified by email.`,
    );
    onClose();
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <ShieldOff className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Suspend Admin Account
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {user.name} · {user.email}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        This will suspend <strong>{user.name || user.email}</strong> and send
        them an email notification. They will not be able to log in until the
        account is reinstated.
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                     disabled:opacity-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSuspend}
          disabled={isLoading}
          className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-semibold
                     disabled:opacity-50 transition flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Suspend
        </button>
      </div>
    </Modal>
  );
}

export default function UsersTable() {
  const [page, setPage] = useState<number>(TABLE_CONFIG.DEFAULT_PAGE);
  const [deleteUser] = useDeleteUserMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [sortCriteria, setSortCriteria] = useState<UserSort>(null);
  const [limit, setLimit] = useState<number>(TABLE_CONFIG.DEFAULT_LIMIT);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  useEffect(() => {
    setPage(TABLE_CONFIG.DEFAULT_PAGE);
  }, [debouncedSearchTerm, roleFilter, sortCriteria]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      sortBy: sortCriteria
        ? `${sortCriteria.field}:${sortCriteria.direction}`
        : "createdAt:desc",
      ...(debouncedSearchTerm.trim()
        ? { search: debouncedSearchTerm.trim() }
        : {}),
      ...(roleFilter !== "all" ? { role: roleFilter } : {}),
    }),
    [debouncedSearchTerm, limit, page, roleFilter, sortCriteria],
  );

  const { data, isFetching } = useFetchUsersQuery(queryParams);

  const users = data?.results || [];
  const totalPages = data?.totalPages || 1;
  const totalResults = data?.totalResults || 0;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const hasFilters = Boolean(searchTerm || roleFilter !== "all");

  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setPage(TABLE_CONFIG.DEFAULT_PAGE);
  };

  const getSafeValue = (value: string | undefined | null, fallback = "N/A") => {
    if (!value || value.trim() === "") return fallback;
    return value;
  };

  const handleToggleSort = useCallback((field: UserSortField) => {
    setSortCriteria((current) => {
      if (current?.field !== field) {
        return { field, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { field, direction: "desc" };
      }

      return null;
    });
    setPage(TABLE_CONFIG.DEFAULT_PAGE);
  }, []);

  const columns = [
    {
      key: "name",
      header: (
        <SortableHeader
          label="Full Name"
          field="name"
          sort={sortCriteria}
          onToggleSort={handleToggleSort}
        />
      ),
      className:
        "min-w-[150px] max-w-[250px] truncate overflow-hidden sticky left-0 z-20 bg-white dark:bg-gray-900",
      render: (row: User) => (
        <span
          title={row.name || "No name provided"}
          className={`truncate block ${!row.name ? "text-gray-400 italic" : ""}`}
          style={{ width: "inherit" }}
        >
          {getSafeValue(row.name, "No name provided")}
        </span>
      ),
    },
    {
      key: "email",
      header: (
        <SortableHeader
          label="Email"
          field="email"
          sort={sortCriteria}
          onToggleSort={handleToggleSort}
        />
      ),
      className:
        "min-w-[150px] max-w-[250px] truncate overflow-hidden cursor-default",
      render: (row: User) => (
        <span
          title={row.email || "No email provided"}
          className={`truncate block ${!row.email ? "text-gray-400 italic" : ""}`}
        >
          {getSafeValue(row.email, "No email provided")}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      className:
        "min-w-[96px] max-w-[96px] truncate overflow-hidden cursor-default",
      render: (row: User) => {
        const role = row.role
          ? row.role.charAt(0).toUpperCase() + row.role.slice(1)
          : null;

        return (
          <span
            title={role || "No role provided"}
            className={`block w-full truncate whitespace-nowrap ${!role ? "text-gray-400 italic" : ""}`}
          >
            {getSafeValue(role, "No role provided")}
          </span>
        );
      },
    },
    {
      key: "referralCode",
      header: "Referral Code",
      className: "min-w-[160px] max-w-[200px] overflow-hidden cursor-default",
      render: (row: User) => {
        if (!row.referralCode) {
          return <span className="text-gray-400 italic text-sm">No code</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm text-gray-800 dark:text-gray-100 tracking-wider">
              {row.referralCode}
            </span>
            <button
              type="button"
              title="Copy referral code"
              onClick={() => {
                navigator.clipboard.writeText(row.referralCode!).then(() => {
                  toast.success("Referral code copied!");
                });
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status / Actions",
      className:
        "min-w-[190px] max-w-[190px] px-2 sticky right-[440px] z-20 bg-white dark:bg-gray-900",
      render: (row: User) => <UserStatusActions user={row} />,
    },

    {
      key: "view",
      header: <div className="flex justify-center w-full">View</div>,
      className:
        "min-w-[80px] max-w-[80px] sticky right-[360px] z-20 bg-white dark:bg-gray-900",
      render: (row: User) => (
        <div className="w-full flex justify-center ">
          <UserDetails
            id={row.id}
            email={row.email || ""}
            password={row.password || ""}
            name={row.name || ""}
            role={row.role || "tutor"}
            phoneNumber={row.phoneNumber || ""}
            birthday={row.birthday || ""}
            status={row.status || "pending"}
            country={row.country || ""}
            city={row.city || ""}
            zip={row.zip || ""}
            address={row.address || ""}
            state={row.state}
            region={row.region}
            gender={row.gender}
            avatar={row.avatar}
            referralCode={row.referralCode}
          />
        </div>
      ),
    },
    {
      key: "edit",
      header: <div className="flex justify-center w-full">Edit</div>,
      className:
        "min-w-[80px] max-w-[80px] sticky right-[280px] z-20 bg-white dark:bg-gray-900",
      render: (row: User) => {
        const isTutor = row.role === "tutor";

        return (
          <div className="flex justify-center items-center w-full">
            {isTutor ? (
              <SquarePen
                aria-disabled="true"
                title="Tutor details can be edited from the Tutor page"
                className="text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
              />
            ) : (
              <UpdateUser
                id={row.id}
                email={row.email || ""}
                name={row.name || ""}
                phoneNumber={row.phoneNumber || ""}
                birthday={row.birthday || ""}
                status={row.status || "pending"}
                country={row.country || ""}
                city={row.city || ""}
                zip={row.zip || ""}
                address={row.address || ""}
                state={row.state}
                region={row.region}
                gender={row.gender}
                avatar={row.avatar}
                role="admin"
              />
            )}
          </div>
        );
      },
    },
    {
      key: "resetPassword",
      header: (
        <span
          className="block w-full text-center leading-tight"
          title="Reset Password"
        >
          Reset Password
        </span>
      ),
      className:
        "min-w-[120px] max-w-[120px] sticky right-[160px] z-20 bg-white dark:bg-gray-900",
      render: (row: User) => {
        const isApproved = row.status?.toLowerCase() === "approved";
        return (
          <div className="flex justify-center items-center w-full">
            <div
              className={!isApproved ? "cursor-not-allowed opacity-50" : ""}
              title={
                !isApproved
                  ? "Password reset is only available for approved admins"
                  : ""
              }
            >
              <ResetPassword userId={row.id} disabled={!isApproved} />
            </div>
          </div>
        );
      },
    },
    {
      key: "sendReferralCode",
      header: (
        <span
          className="block w-full text-center leading-tight"
          title="Send Referral Code"
        >
          Send Code
        </span>
      ),
      className:
        "min-w-[80px] max-w-[80px] sticky right-[80px] z-20 bg-white dark:bg-gray-900",
      render: (row: User) => {
        const isTutor = row.role === "tutor";
        const isAdmin = row.role === "admin";
        const isApproved = row.status?.toLowerCase() === "approved";
        const tutorId = row.tutorId ?? row.tutor?.id ?? row.tutor?._id;

        if (!isTutor && !isAdmin) {
          return (
            <div className="flex justify-center items-center w-full">
              <Mail
                title="Referral codes are only available for tutors and admins"
                className="text-gray-300 dark:text-gray-600"
              />
            </div>
          );
        }

        const disabled = isTutor ? !isApproved || !tutorId : !isApproved;

        return (
          <div className="flex justify-center items-center w-full">
            <div
              className={disabled ? "cursor-not-allowed opacity-50" : ""}
              title={
                !isApproved
                  ? "Send code is only available for approved accounts"
                  : ""
              }
            >
              <SendReferralCode
                id={isTutor ? tutorId || "" : row.id}
                recipientType={isTutor ? "tutor" : "admin"}
                disabled={disabled}
                sent={!!row.referralCode}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "delete",
      header: <div className="text-center w-full">Delete</div>,
      align: "center",
      className:
        "min-w-[80px] max-w-[80px] sticky right-0 z-20 bg-white dark:bg-gray-900",
      render: (row: User) => {
        const isTutor = row.role === "tutor";

        return (
          <div className="flex justify-center w-full">
            {isTutor ? (
              <button
                type="button"
                disabled
                title="Tutor accounts cannot be deleted from the Users table"
                className="inline-flex items-center justify-center border-0 bg-transparent p-0 cursor-not-allowed opacity-40"
              >
                <Trash2 className="text-gray-400" />
              </button>
            ) : (
              <DeleteUser
                userId={row.id}
                tutorId={row.tutorId ?? row.tutor?.id ?? row.tutor?._id}
                userEmail={row.email}
                userRole={row.role}
                userStatus={row.status}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">
              User filters
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
              Search by name or email, then narrow results by role.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[32rem]">
            <div className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name or email"
                  className="h-11 w-full pl-10 pr-10"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="w-full">
                <Select
                  value={roleFilter}
                  onValueChange={(value) =>
                    setRoleFilter(value as UserRoleFilter)
                  }
                >
                  <SelectTrigger className="h-11 min-h-11 w-full">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasFilters}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5 sm:w-auto"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalResults={totalResults}
        limit={limit}
        onLimitChange={setLimit}
        isLoading={isFetching}
        emptyMessage="No users found for the current search or role filter."
        className="w-full max-w-full"
        preserveDataOrder
        bulkDelete={{
          entityName: "user",
          isRowSelectable: (row: User) =>
            row.role === "admin" && row.status === "rejected",
          deleteRow: (row: User) => deleteUser(row.id).unwrap(),
        }}
      />
    </div>
  );
}
