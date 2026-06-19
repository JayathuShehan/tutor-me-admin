"use client";

/* eslint-disable @next/next/no-img-element */
import FileUploadDropzone from "@/components/fileUploader";
import Select from "@/components/form/Select";
import { Button } from "@/components/ui/button/Button";
import DatePicker from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useAuthContext } from "@/context";
import {
  useFetchUserByIdQuery,
  useUpdateUserMutation,
} from "@/store/api/splits/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { updateUserSchema, UpdateUserSchema } from "./schema";

const normalizeTextField = (value: string) =>
  value
    .replace(/[^A-Za-z ]/g, "") // allow only letters and spaces
    .replace(/\s+/g, " ") // collapse multiple spaces into one
    .trim(); // remove leading/trailing spaces

const normalizeTextFieldInput = (value: string) =>
  value
    .replace(/[^A-Za-z ]/g, "") // allow only letters and spaces
    .replace(/\s{2,}/g, " ") // collapse repeated spaces while typing
    .trimStart(); // keep a single trailing space so users can type the next word

const normalizePhoneNumber = (value: string) =>
  value.replace(/\D/g, "").slice(0, 10);

const normalizeZipCode = (value: string) => {
  const cleaned = value.replace(/\s/g, "").replace(/[^\d-]/g, "");

  if (cleaned.includes("-")) {
    const [first = "", second = ""] = cleaned.split("-");
    return `${first.slice(0, 5)}-${second.slice(0, 4)}`;
  }

  if (cleaned.length > 5) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
  }

  return cleaned.slice(0, 5);
};

export default function UpdateUser() {
  const { user: authUser } = useAuthContext();
  const userId = authUser?.id;
  const { data: user, isLoading } = useFetchUserByIdQuery(userId ?? "", {
    skip: !userId,
  });

  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateUserSchema>({
    resolver: zodResolver(updateUserSchema),
    mode: "onChange",
  });

  const genderValue = watch("gender") || "not specified";
  const avatarUrl = watch("avatar");

  const [hasImageError, setHasImageError] = useState(false);
  const [dropzoneKey, setDropzoneKey] = useState(0);

  const resetDropzone = () => setDropzoneKey((k) => k + 1);

  useEffect(() => {
    if (user && isModalOpen) {
      let formattedBirthday = "";
      if (user.birthday) {
        try {
          const date = new Date(user.birthday);
          if (!isNaN(date.getTime())) {
            formattedBirthday = date.toISOString().split("T")[0];
          }
        } catch {
          console.warn("Invalid birthday format:", user.birthday);
        }
      }

      reset({
        avatar: user.avatar || "",
        name: normalizeTextField(user.name || ""),
        email: user.email,
        phoneNumber: normalizePhoneNumber(user.phoneNumber || ""),
        birthday: formattedBirthday,
        country: normalizeTextField(user.country || ""),
        city: normalizeTextField(user.city || ""),
        state: normalizeTextField(user.state || ""),
        region: normalizeTextField(user.region || ""),
        zip: normalizeZipCode(user.zip || ""),
        address: user.address?.trim() || "",
        gender: (user.gender as "male" | "female" | "other") ?? "other",
      });

      setHasImageError(false);
    }
  }, [user, isModalOpen, reset]);

  const [initialValues, setInitialValues] = useState<UpdateUserSchema | null>(
    null,
  );

  useEffect(() => {
    if (user && isModalOpen) {
      const formattedBirthday = user.birthday
        ? new Date(user.birthday).toISOString().split("T")[0]
        : "";

      const defaultValues: UpdateUserSchema = {
        avatar: user.avatar || "",
        name: normalizeTextField(user.name || ""),
        email: user.email,
        phoneNumber: normalizePhoneNumber(user.phoneNumber || ""),
        birthday: formattedBirthday,
        country: normalizeTextField(user.country || ""),
        city: normalizeTextField(user.city || ""),
        state: normalizeTextField(user.state || ""),
        region: normalizeTextField(user.region || ""),
        zip: normalizeZipCode(user.zip || ""),
        address: user.address?.trim() || "",
        gender: (user.gender as "male" | "female" | "other") ?? "other",
      };

      reset(defaultValues);
      setInitialValues(defaultValues);

      setHasImageError(false);
    }
  }, [user, isModalOpen, reset]);

  const watchedValues = watch();
  const isFormChanged = initialValues
    ? (Object.keys(initialValues) as (keyof UpdateUserSchema)[]).some(
        (key) => watchedValues[key] !== initialValues[key],
      )
    : false;

  const onSubmit = async (data: UpdateUserSchema) => {
    if (!user) return;

    const payload: UpdateUserSchema = {
      ...data,
      name: normalizeTextField(data.name),
      phoneNumber: normalizePhoneNumber(data.phoneNumber),
      country: normalizeTextField(data.country),
      city: normalizeTextField(data.city),
      state: normalizeTextField(data.state),
      region: normalizeTextField(data.region),
      zip: normalizeZipCode(data.zip),
      address: data.address.trim(),
    };

    try {
      await updateUser({ id: user.id, ...payload }).unwrap();
      toast.success("Profile updated successfully");
      setIsModalOpen(false);
    } catch (err: unknown) {
      const errorMessage =
        (err as { data?: { message?: string } })?.data?.message ||
        "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  if (isLoading) return <p>Loading user data...</p>;
  if (!user) return <p>No user data found</p>;

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
      >
        <Pencil />
        Edit Profile
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-2xl"
        overlayClassName="bg-black/50 backdrop-blur-none"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-6 max-h-[85vh] px-2"
        >
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl font-semibold">Edit Profile</h2>
            <p className="text-sm text-gray-600 italic">
              <span className="text-red-500">*</span> Required
            </p>
          </div>

          <div className="max-h-[75vh] overflow-y-auto scrollbar-thin space-y-4 px-4 ">
            <Label className="text-md font-semibold">
              Personal Information
            </Label>

            <div className="grid gap-3">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register("name", {
                  onChange: (e) => {
                    e.target.value = normalizeTextFieldInput(e.target.value);
                  },
                })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                className="cursor-not-allowed"
                disabled
                readOnly
              />
            </div>

            <div className="grid gap-3">
              <Label className="font-semibold">
                Profile Image <span className="text-red-500">*</span>
              </Label>

              <FileUploadDropzone
                key={dropzoneKey}
                imageOnly
                onUploaded={(url) => {
                  setValue("avatar", url || user.avatar || "", {
                    shouldValidate: true,
                  });
                  setHasImageError(false);
                }}
              />

              {errors.avatar && (
                <p className="text-sm text-red-500">{errors.avatar.message}</p>
              )}

              <div className="mt-3 flex flex-col items-center justify-center gap-3 text-center">
                <div className="relative inline-block">
                  {avatarUrl && !hasImageError ? (
                    <img
                      src={avatarUrl}
                      alt="avatar preview"
                      className="w-28 h-28 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                      onError={() => setHasImageError(true)}
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-blue-600 flex items-center justify-center border-2 border-blue-500">
                      <span className="text-4xl font-bold text-white select-none">
                        {(user.name?.[0] || "A").toUpperCase()}
                      </span>
                    </div>
                  )}

                  {avatarUrl && (
                    <button
                      type="button"
                      title="Remove photo"
                      onClick={() => {
                        setValue("avatar", "", { shouldValidate: true });
                        setHasImageError(false);
                        resetDropzone();
                      }}
                      className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-red-500 hover:bg-red-50 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {avatarUrl && avatarUrl !== (user.avatar || "") && (
                    <button
                      type="button"
                      title="Revert to saved"
                      onClick={() => {
                        setValue("avatar", user.avatar || "", {
                          shouldValidate: true,
                        });
                        setHasImageError(false);
                        resetDropzone();
                      }}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {hasImageError && (
                  <p className="text-sm text-red-500">
                    Failed to load image. Please upload a new one.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <Label htmlFor="gender" className="mb-3">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ]}
                  value={genderValue}
                  onChange={(value) =>
                    setValue("gender", value as "male" | "female" | "other", {
                      shouldValidate: true,
                    })
                  }
                />
                <div className="mt-1">
                  {errors.gender && (
                    <p className="text-sm text-red-500">
                      {errors.gender.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <Label htmlFor="phoneNumber" className="mb-3">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  inputMode="numeric"
                  maxLength={10}
                  {...register("phoneNumber", {
                    onChange: (e) => {
                      e.target.value = normalizePhoneNumber(e.target.value);
                    },
                  })}
                />
                <div className="mt-1">
                  {errors.phoneNumber && (
                    <p className="text-sm text-red-500">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <Label htmlFor="birthday" className="mb-3">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  value={watch("birthday")}
                  onChange={(date) =>
                    setValue("birthday", date, {
                      shouldValidate: true,
                    })
                  }
                  error={errors.birthday?.message}
                  placeholder="DD/MM/YYYY"
                  label=""
                  required
                  maxDate={
                    new Date(
                      new Date().getFullYear() - 18,
                      new Date().getMonth(),
                      new Date().getDate(),
                    )
                  }
                />
              </div>
            </div>

            <Label className="text-md font-semibold">
              Location Information
            </Label>

            <div className="grid gap-3">
              <Label htmlFor="address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                {...register("address", {
                  onChange: (e) => {
                    e.target.value = e.target.value
                      .replace(/\s+/g, " ")
                      .trimStart();
                  },
                })}
              />
              <div className="mt-1">
                {errors.address && (
                  <p className="text-sm text-red-500">
                    {errors.address.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <Label htmlFor="city" className="mb-3">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  {...register("city", {
                    onChange: (e) => {
                      e.target.value = normalizeTextFieldInput(e.target.value);
                    },
                  })}
                />
                <div className="mt-1">
                  {errors.city && (
                    <p className="text-sm text-red-500">
                      {errors.city.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <Label htmlFor="country" className="mb-3">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="country"
                  {...register("country", {
                    onChange: (e) => {
                      e.target.value = normalizeTextFieldInput(e.target.value);
                    },
                  })}
                />
                <div className="mt-1">
                  {errors.country && (
                    <p className="text-sm text-red-500">
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <Label htmlFor="zip" className="mb-3">
                  Zip / Postal Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zip"
                  inputMode="numeric"
                  maxLength={10}
                  {...register("zip", {
                    onChange: (e) => {
                      e.target.value = normalizeZipCode(e.target.value);
                    },
                  })}
                />
                <div className="mt-1">
                  {errors.zip && (
                    <p className="text-sm text-red-500">{errors.zip.message}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <Label htmlFor="state" className="mb-3">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="state"
                  {...register("state", {
                    onChange: (e) => {
                      e.target.value = normalizeTextFieldInput(e.target.value);
                    },
                  })}
                />
                <div className="mt-1">
                  {errors.state && (
                    <p className="text-sm text-red-500">
                      {errors.state.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:col-span-2">
                <Label htmlFor="region" className="mb-3">
                  Region <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="region"
                  {...register("region", {
                    onChange: (e) => {
                      e.target.value = normalizeTextFieldInput(e.target.value);
                    },
                  })}
                />
                <div className="mt-1">
                  {errors.region && (
                    <p className="text-sm text-red-500">
                      {errors.region.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 py-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isUpdating}
                disabled={!isFormChanged}
                className="bg-blue-700 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
