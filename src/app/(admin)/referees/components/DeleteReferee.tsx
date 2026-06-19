"use client";

import { Button } from "@/components/ui/button/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteRefereeMutation } from "@/store/api/splits/referees";
import { getErrorInApiResult } from "@/utils/api";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export function DeleteReferee({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [deleteReferee, { isLoading }] = useDeleteRefereeMutation();

  const handleDelete = async () => {
    const result = await deleteReferee(id);

    const error = getErrorInApiResult(result);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Referee deleted successfully");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Delete referee"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px] bg-white dark:bg-gray-800 dark:text-white/90">
        <DialogHeader>
          <DialogTitle>Delete Referee</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to delete <strong>{name}</strong>? This action
          cannot be undone.
        </p>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-500"
            isLoading={isLoading}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
