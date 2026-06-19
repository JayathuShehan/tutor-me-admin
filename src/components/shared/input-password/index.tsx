import { getNestedError } from "@/utils/form";
import { renderRequiredLabel } from "@/components/form/required-label";
import React, { InputHTMLAttributes, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import Icon from "../icon";

interface InputPasswordProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  name: string;
}

const InputPassword: React.FC<InputPasswordProps> = ({
  label,
  helperText,
  className = "",
  name,
  ...props
}) => {
  const { control, formState } = useFormContext();
  const [showPassword, setShowPassword] = useState(false);

  const error = getNestedError(formState.errors, name);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-white/90">
          {renderRequiredLabel(label)}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <>
            <div className="relative">
              <input
                {...field}
                {...props}
                value={field.value ?? ""}
                type={showPassword ? "text" : "password"}
                className={`block w-full appearance-none rounded-md border px-3 py-[0.625rem] pr-10 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:text-white/90 ${
                  error ? "border-red-500" : "border-gray-300"
                } ${className}`}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword((prev) => !prev);
                }}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none dark:text-white/90"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPassword ? <Icon name="Eye" /> : <Icon name="EyeClosed" />}
              </button>
            </div>

            {(error || helperText) && (
              <span
                className={`text-xs ${
                  error ? "text-red-500" : "text-gray-500 dark:text-white/90"
                }`}
              >
                {String(error || helperText)}
              </span>
            )}
          </>
        )}
      />
    </div>
  );
};

export default InputPassword;
