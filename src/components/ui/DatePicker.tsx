"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { forwardRef, useEffect, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
  id?: string;
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  maxDate?: Date;
}

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  placeholder?: string;
  error?: string;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, placeholder, error, className, ...props }, ref) => (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        value={value ?? ""}
        onClick={onClick}
        placeholder={placeholder}
        readOnly
        aria-invalid={!!error}
        className={cn("cursor-pointer pr-10", className)}
      />

      <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
    </div>
  ),
);

CustomInput.displayName = "CustomInput";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1899 }, (_, index) =>
  String(currentYear - index),
);

function DatePickerHeader({
  date,
  changeMonth,
  changeYear,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  onVisibleMonthChange,
  maxDate,
}: {
  date: Date;
  changeMonth: (month: number) => void;
  changeYear: (year: number) => void;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
  onVisibleMonthChange: (date: Date) => void;
  maxDate?: Date;
}) {
  const [openMenu, setOpenMenu] = useState<"month" | "year" | null>(null);
  const selectedMonth = date.getMonth();
  const selectedYear = date.getFullYear();
  const maxYear = maxDate ? maxDate.getFullYear() : undefined;
  const filteredYears = maxYear
    ? YEARS.filter((y) => Number(y) <= maxYear)
    : YEARS;

  const closeMenu = () => setOpenMenu(null);

  useEffect(() => {
    onVisibleMonthChange(new Date(selectedYear, selectedMonth, 1));
  }, [onVisibleMonthChange, selectedMonth, selectedYear]);

  return (
    <div className="relative mb-3 flex h-10 items-center justify-center rounded-lg bg-gray-50 px-1 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => {
          closeMenu();
          decreaseMonth();
        }}
        disabled={prevMonthButtonDisabled}
        className="absolute left-1 flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu((current) => (current === "month" ? null : "month"))
            }
            className="flex h-8 items-center gap-1 rounded-md px-2 text-sm font-semibold text-gray-900 transition hover:bg-white focus:bg-white focus:outline-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
            aria-expanded={openMenu === "month"}
            aria-haspopup="listbox"
          >
            {MONTHS[selectedMonth]}
            <ChevronDown className="size-3.5 text-gray-500 dark:text-gray-300" />
          </button>

          {openMenu === "month" && (
            <div className="absolute left-1/2 top-9 z-[10000] w-36 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="max-h-56 overflow-y-auto scrollbar-thin">
                {MONTHS.map((month, index) => {
                  const isSelected = index === selectedMonth;

                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => {
                        changeMonth(index);
                        closeMenu();
                      }}
                      className={cn(
                        "flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5",
                        isSelected &&
                          "bg-brand-50 font-semibold text-brand-600 hover:bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300",
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {month}
                      {isSelected && <Check className="size-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu((current) => (current === "year" ? null : "year"))
            }
            className="flex h-8 items-center gap-1 rounded-md px-2 text-sm font-semibold text-gray-900 transition hover:bg-white focus:bg-white focus:outline-none dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
            aria-expanded={openMenu === "year"}
            aria-haspopup="listbox"
          >
            {selectedYear}
            <ChevronDown className="size-3.5 text-gray-500 dark:text-gray-300" />
          </button>

          {openMenu === "year" && (
            <div className="absolute left-1/2 top-9 z-[10000] w-28 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="max-h-56 overflow-y-auto scrollbar-thin">
                {filteredYears.map((year) => {
                  const numericYear = Number(year);
                  const isSelected = numericYear === selectedYear;

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        changeYear(numericYear);
                        closeMenu();
                      }}
                      className={cn(
                        "flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5",
                        isSelected &&
                          "bg-brand-50 font-semibold text-brand-600 hover:bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300",
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {year}
                      {isSelected && <Check className="size-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          closeMenu();
          increaseMonth();
        }}
        disabled={nextMonthButtonDisabled}
        className="absolute right-1 flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-white hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  label,
  required,
  error,
  placeholder = "Select date",
  className = "",
  maxDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    value ? new Date(value) : new Date(),
  );

  const handleDateChange = (date: Date | null): void => {
    const isOutsideVisibleMonth =
      !!date &&
      (date.getMonth() !== visibleMonth.getMonth() ||
        date.getFullYear() !== visibleMonth.getFullYear());

    onChange(date?.toISOString().split("T")[0] || "");

    if (date) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }

    setIsOpen(isOutsideVisibleMonth);
  };

  const handleInputClick = () => {
    setVisibleMonth(value ? new Date(value) : (maxDate ?? new Date()));
    setIsOpen(true);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span>*</span>}
        </Label>
      )}

      <ReactDatePicker
        selected={value ? new Date(value) : null}
        onChange={handleDateChange}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        maxDate={maxDate ?? new Date()}
        open={isOpen}
        openToDate={visibleMonth}
        onInputClick={handleInputClick}
        onClickOutside={() => setIsOpen(false)}
        renderCustomHeader={({
          date,
          changeMonth,
          changeYear,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <DatePickerHeader
            date={date}
            changeMonth={changeMonth}
            changeYear={changeYear}
            decreaseMonth={decreaseMonth}
            increaseMonth={increaseMonth}
            prevMonthButtonDisabled={prevMonthButtonDisabled}
            nextMonthButtonDisabled={nextMonthButtonDisabled}
            onVisibleMonthChange={setVisibleMonth}
            maxDate={maxDate}
          />
        )}
        customInput={
          <CustomInput id={id} error={error} placeholder={placeholder} />
        }
        wrapperClassName="w-full"
        showPopperArrow={false}
        popperPlacement="bottom-start"
        popperClassName="tm-datepicker-popper z-30 [&_.react-datepicker__triangle]:!hidden"
        calendarClassName="
          tm-datepicker-calendar !w-auto !rounded-xl !border !border-gray-200 !bg-white !p-3 !font-outfit !text-gray-900 !shadow-theme-lg dark:!border-gray-700 dark:!bg-gray-800 dark:!text-white
          [&_.react-datepicker__header]:!border-0 [&_.react-datepicker__header]:!bg-white [&_.react-datepicker__header]:!p-0 dark:[&_.react-datepicker__header]:!bg-gray-800
          [&_.react-datepicker__current-month]:!text-gray-900 dark:[&_.react-datepicker__current-month]:!text-white
          [&_.react-datepicker__month-container]:!float-none [&_.react-datepicker__month-container]:!w-[14.75rem]
          [&_.react-datepicker__month]:!m-0 [&_.react-datepicker__month]:!w-full
          [&_.react-datepicker__week]:!grid [&_.react-datepicker__week]:!grid-cols-7 [&_.react-datepicker__week]:!gap-0.5
          [&_.react-datepicker__day-names]:!mb-1.5 [&_.react-datepicker__day-names]:!grid [&_.react-datepicker__day-names]:!grid-cols-7 [&_.react-datepicker__day-names]:!gap-0.5 [&_.react-datepicker__day-names]:!w-full
          [&_.react-datepicker__day-name]:!m-0 [&_.react-datepicker__day-name]:!flex [&_.react-datepicker__day-name]:!h-7 [&_.react-datepicker__day-name]:!w-auto [&_.react-datepicker__day-name]:!items-center [&_.react-datepicker__day-name]:!justify-center [&_.react-datepicker__day-name]:!text-[11px] [&_.react-datepicker__day-name]:!font-medium [&_.react-datepicker__day-name]:!text-gray-600 dark:[&_.react-datepicker__day-name]:!text-gray-300
          [&_.react-datepicker__day]:!m-0 [&_.react-datepicker__day]:!flex [&_.react-datepicker__day]:!size-8 [&_.react-datepicker__day]:!items-center [&_.react-datepicker__day]:!justify-center [&_.react-datepicker__day]:!rounded-md [&_.react-datepicker__day]:!border [&_.react-datepicker__day]:!border-transparent [&_.react-datepicker__day]:!text-sm [&_.react-datepicker__day]:!font-medium [&_.react-datepicker__day]:!leading-none [&_.react-datepicker__day]:!text-gray-800 [&_.react-datepicker__day]:!transition-colors dark:[&_.react-datepicker__day]:!text-gray-100
          [&_.react-datepicker__day:hover]:!bg-gray-100 [&_.react-datepicker__day:hover]:!text-gray-900 dark:[&_.react-datepicker__day:hover]:!bg-white/10 dark:[&_.react-datepicker__day:hover]:!text-white
          [&_.react-datepicker__day--outside-month]:!text-gray-400 dark:[&_.react-datepicker__day--outside-month]:!text-gray-500
          [&_.react-datepicker__day--disabled]:!cursor-not-allowed [&_.react-datepicker__day--disabled]:!text-gray-300 dark:[&_.react-datepicker__day--disabled]:!text-gray-600
          [&_.react-datepicker__day--selected]:!border-brand-500 [&_.react-datepicker__day--selected]:!bg-brand-500 [&_.react-datepicker__day--selected]:!text-white [&_.react-datepicker__day--selected]:!shadow-theme-xs
          [&_.react-datepicker__day--keyboard-selected]:!border-brand-500 [&_.react-datepicker__day--keyboard-selected]:!bg-brand-500 [&_.react-datepicker__day--keyboard-selected]:!text-white
        "
        dayClassName={(date) => {
          const today = new Date();
          const isToday = date.toDateString() === today.toDateString();
          const isSelected =
            value && date.toDateString() === new Date(value).toDateString();
          const isOutsideVisibleMonth =
            date.getMonth() !== visibleMonth.getMonth() ||
            date.getFullYear() !== visibleMonth.getFullYear();

          return [
            isOutsideVisibleMonth && !isSelected
              ? "!text-gray-300 hover:!text-gray-500 dark:!text-white/25 dark:hover:!text-white/50"
              : "",
            isToday && !isSelected
              ? "!border-brand-200 !bg-brand-50 !text-brand-600 dark:!border-brand-500/30 dark:!bg-brand-500/10 dark:!text-brand-300"
              : "",
            isSelected ? "!bg-brand-500 !text-white" : "",
          ].join(" ");
        }}
      />

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default DatePicker;
