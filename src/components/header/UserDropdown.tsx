/* eslint-disable @next/next/no-img-element */
"use client";

import { useAuthContext } from "@/context";
import { useFetchUserByIdQuery } from "@/store/api/splits/users";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import React, { useEffect, useState } from "react";
import { SignOutConfirmationModal } from "../shared/SignOutConfirmationModal";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

export default function UserDropdown() {
  const { user: authUser, logout } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageError, setIsImageError] = useState(false);

  const { data: fullUser } = useFetchUserByIdQuery(authUser?.id ?? "", {
    skip: !authUser?.id,
  });

  const user = fullUser ??
    authUser ?? {
      name: "Guest",
      email: "guest@example.com",
      avatar: "/images/user/user.png",
    };

  useEffect(() => {
    setIsImageError(false);
  }, [user?.avatar]);

  const initial = (user.name?.[0] || "A").toUpperCase();

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleSignOutClick = () => {
    closeDropdown();
    setIsModalOpen(true);
  };

  const handleSignOutConfirm = () => {
    logout();
    setIsModalOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="dropdown-toggle flex min-w-0 items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-2.5 text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800"
      >
        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-gray-900">
          {!isImageError && user.avatar ? (
            <img
              src={user.avatar}
              alt="User"
              className="h-full w-full object-cover"
              onError={() => setIsImageError(true)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-blue-600 text-sm font-bold text-white select-none">
              {initial}
            </span>
          )}
        </span>

        <span className="hidden max-w-36 truncate text-theme-sm font-medium sm:block">
          {user.name}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="right-0 mt-3 flex w-[min(calc(100vw-2rem),18rem)] flex-col rounded-2xl border border-gray-200 bg-white p-2.5 shadow-theme-xl ring-1 ring-black/5 dark:!border-white/10 dark:!bg-[#202532] dark:shadow-[0_22px_55px_rgba(0,0,0,0.46)] dark:ring-white/5"
      >
        <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100 dark:bg-brand-500/[0.12] dark:ring-brand-400/20">
          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-white/15">
            {!isImageError && user.avatar ? (
              <img
                src={user.avatar}
                alt="User"
                className="h-full w-full object-cover"
                onError={() => setIsImageError(true)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-blue-600 text-base font-bold text-white select-none">
                {initial}
              </span>
            )}
          </span>

          <span className="min-w-0">
            <span className="block truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {user.email}
            </span>
          </span>
        </div>

        <ul className="mt-2 flex flex-col gap-1 border-b border-gray-100 pb-2 dark:border-gray-800">
          <li>
            <DropdownItem
              baseClassName=""
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-theme-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-[#2a3040] dark:hover:text-white"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-200 dark:bg-white/[0.08] dark:text-gray-300 dark:ring-white/10">
                <UserRound className="h-4 w-4" />
              </span>
              <span>User profile</span>
            </DropdownItem>
          </li>
        </ul>

        <button
          type="button"
          onClick={handleSignOutClick}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-theme-sm font-medium text-error-600 transition hover:bg-error-50 dark:text-error-300 dark:hover:bg-error-500/[0.12]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error-50 text-error-500 ring-1 ring-error-100 dark:bg-error-500/15 dark:ring-error-400/25">
            <LogOut className="h-4 w-4" />
          </span>
          <span>Sign out</span>
        </button>
      </Dropdown>

      <SignOutConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSignOutConfirm}
      />
    </div>
  );
}
