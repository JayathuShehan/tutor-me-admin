import { Check, ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Spinner } from "../ui/spinner";
import { renderRequiredLabel } from "./required-label";

interface Option {
  value: string;
  text: string;
  selected?: boolean;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
  searchable?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  defaultSelected = [],
  onChange,
  disabled = false,
  isLoading = false,
  searchable = false,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    defaultSelected.length > 0
      ? defaultSelected
      : options.filter((o) => o.selected).map((o) => o.value),
  );

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedOptions(
      defaultSelected.length > 0
        ? defaultSelected
        : options.filter((o) => o.selected).map((o) => o.value),
    );
  }, [defaultSelected, options]);

  const filteredOptions =
    searchable && searchText
      ? options.filter((o) =>
          o.text.toLowerCase().includes(searchText.toLowerCase()),
        )
      : options;

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      if (prev) setSearchText("");
      return !prev;
    });
  };

  const handleSelect = (optionValue: string) => {
    const newSelectedOptions = selectedOptions.includes(optionValue)
      ? selectedOptions.filter((value) => value !== optionValue)
      : [...selectedOptions, optionValue];

    setSelectedOptions(newSelectedOptions);
    onChange?.(newSelectedOptions);
  };

  const removeOption = (value: string) => {
    const newSelectedOptions = selectedOptions.filter((opt) => opt !== value);
    setSelectedOptions(newSelectedOptions);
    onChange?.(newSelectedOptions);
  };

  const selectedValuesText = selectedOptions.map(
    (value) => options.find((option) => option.value === value)?.text || "",
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchText("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full" ref={dropdownRef}>
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">
          {renderRequiredLabel(label)}
        </label>
      ) : null}

      <div className="relative w-full">
        <div
          onClick={toggleDropdown}
          className={`relative flex min-h-11 w-full items-center rounded-lg border border-gray-300 bg-transparent px-3 py-2 shadow-theme-xs transition focus-within:border-brand-300 focus-within:shadow-focus-ring dark:border-gray-700 dark:bg-gray-900 ${
            disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
          }`}
        >
          <div className="flex flex-1 flex-wrap items-center gap-2 pr-8">
            {selectedValuesText.length > 0 ? (
              selectedValuesText.map((text, index) => (
                <div
                  key={`${text}-${index}`}
                  className="group flex items-center rounded-full bg-gray-100 py-1 pl-2.5 pr-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-white/90"
                >
                  <span className="max-w-full">{text}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (disabled) return;
                      removeOption(selectedOptions[index]);
                    }}
                    className={`pl-2 text-gray-500 dark:text-gray-400 ${
                      disabled
                        ? "cursor-not-allowed"
                        : "hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <span className="text-sm text-gray-400 dark:text-white/30">
                Select option
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              toggleDropdown();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 disabled:cursor-not-allowed dark:text-gray-400"
          >
            {isLoading ? (
              <Spinner />
            ) : (
              <ChevronDown
                className={
                  isOpen
                    ? "transition-transform rotate-180"
                    : "transition-transform"
                }
              />
            )}
          </button>
        </div>

        {isOpen && (
          <div
            className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-brand-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="flex max-h-60 flex-col overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No results found
                </p>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className="w-full cursor-pointer border-b border-gray-200 hover:bg-primary/5 dark:border-gray-800"
                    onClick={() => handleSelect(option.value)}
                  >
                    <div
                      className={`relative flex w-full items-center p-2 pl-2 ${
                        selectedOptions.includes(option.value)
                          ? "bg-primary/10"
                          : ""
                      }`}
                    >
                      <div className="mx-2 flex w-full justify-between leading-6 text-gray-800 dark:text-white/90">
                        <span>{option.text}</span>
                        {selectedOptions.includes(option.value) && <Check />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
