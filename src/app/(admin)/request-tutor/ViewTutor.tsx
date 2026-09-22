"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFetchGradeByIdQuery } from "@/store/api/splits/grades";
import {
  useDownloadTutorMatchReportPdfMutation,
  useFetchRequestForTutorsByIdQuery,
  useGenerateTutorMatchReportMutation,
  useSendTelegramOutreachMutation,
} from "@/store/api/splits/request-tutor";
import { useFetchSubjectsQuery } from "@/store/api/splits/subjects";
import {
  useFetchTutorByIdQuery,
  useFetchTutorsQuery,
} from "@/store/api/splits/tutors";
import type { GenerateTutorMatchReportResponse } from "@/types/response-types";
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileDown,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatTutorMatchReportSummaryText } from "./match-report";

type ApiErrorPayload = {
  data?: { message?: string };
  payload?: { message?: string };
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const err = error as ApiErrorPayload;
  return err?.data?.message || err?.payload?.message || fallback;
};

interface ViewTutorProps {
  tutorId: string;
}

type AssignedTutorDisplayItem = {
  id?: string;
  name?: string;
};

const getAssignedTutorIds = (assignedTutor: unknown): string[] => {
  if (!assignedTutor) {
    return [];
  }

  if (typeof assignedTutor === "string") {
    const tutorId = assignedTutor.trim();
    return tutorId ? [tutorId] : [];
  }

  if (Array.isArray(assignedTutor)) {
    return assignedTutor.flatMap((item) => getAssignedTutorIds(item));
  }

  if (typeof assignedTutor === "object") {
    const tutorRecord = assignedTutor as { id?: unknown; _id?: unknown };
    const tutorId =
      typeof tutorRecord.id === "string"
        ? tutorRecord.id.trim()
        : typeof tutorRecord._id === "string"
          ? tutorRecord._id.trim()
          : "";

    return tutorId ? [tutorId] : [];
  }

  return [];
};

const getAssignedTutorDisplayItems = (
  assignedTutor: unknown,
): AssignedTutorDisplayItem[] => {
  if (!assignedTutor) {
    return [];
  }

  if (typeof assignedTutor === "string") {
    const tutorId = assignedTutor.trim();
    return tutorId ? [{ id: tutorId }] : [];
  }

  if (Array.isArray(assignedTutor)) {
    return assignedTutor.flatMap((item) => getAssignedTutorDisplayItems(item));
  }

  if (typeof assignedTutor === "object") {
    const tutorRecord = assignedTutor as {
      id?: unknown;
      _id?: unknown;
      fullName?: unknown;
      name?: unknown;
    };
    const tutorId =
      typeof tutorRecord.id === "string"
        ? tutorRecord.id.trim()
        : typeof tutorRecord._id === "string"
          ? tutorRecord._id.trim()
          : "";
    const tutorName =
      typeof tutorRecord.fullName === "string" && tutorRecord.fullName.trim()
        ? tutorRecord.fullName.trim()
        : typeof tutorRecord.name === "string" && tutorRecord.name.trim()
          ? tutorRecord.name.trim()
          : "";

    return tutorId || tutorName ? [{ id: tutorId, name: tutorName }] : [];
  }

  return [];
};

const hasAssignedTutor = (assignedTutor: unknown) =>
  getAssignedTutorIds(assignedTutor).length > 0;

const getRequestReference = (id?: string | null) => {
  const safeId = String(id || "").trim();
  return safeId ? safeId.slice(-6).toUpperCase() : "N/A";
};

const isRequestFullyAssigned = (
  tutorBlocks?: Array<{ assignedTutor?: unknown }>,
) => {
  if (!Array.isArray(tutorBlocks) || tutorBlocks.length === 0) {
    return false;
  }

  return tutorBlocks.every((block) => hasAssignedTutor(block.assignedTutor));
};

const getEffectiveStatus = (request?: {
  status?: string;
  tutors?: Array<{ assignedTutor?: unknown }>;
}) => {
  if (request?.status === "Rejected") {
    return "Rejected";
  }

  if (
    request?.status === "Tutor Assigned" ||
    request?.status === "Assigned" ||
    request?.status === "Assiged" ||
    isRequestFullyAssigned(request?.tutors)
  ) {
    return "Assigned";
  }

  return "Pending";
};

function AssignedTutorBadge({
  item,
  tutorNameById,
  isFetchingTutorList,
  tagClass,
}: {
  item: AssignedTutorDisplayItem;
  tutorNameById: Map<string, string>;
  isFetchingTutorList: boolean;
  tagClass: string;
}) {
  const listName = item.id ? tutorNameById.get(item.id) : "";
  const shouldFetchTutorById = Boolean(
    item.id && !item.name && !listName && !isFetchingTutorList,
  );
  const { data: tutorById, isFetching: isFetchingTutorById } =
    useFetchTutorByIdQuery(item.id || "", {
      skip: !shouldFetchTutorById,
    });
  const fetchedName = tutorById?.fullName || tutorById?.name || "";
  const label =
    item.name ||
    listName ||
    fetchedName ||
    (isFetchingTutorList || isFetchingTutorById
      ? "Loading assigned tutor..."
      : "Tutor name unavailable");

  return (
    <span
      className={`${tagClass} bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200`}
    >
      {label}
    </span>
  );
}

export function ViewTutorRequests({ tutorId }: ViewTutorProps) {
  const [open, setOpen] = useState(false);
  const [reportSummary, setReportSummary] =
    useState<GenerateTutorMatchReportResponse | null>(null);
  const [telegramOutreachSent, setTelegramOutreachSent] = useState(false);
  const [showWhatsAppTemplate, setShowWhatsAppTemplate] = useState(false);
  const [whatsAppCopied, setWhatsAppCopied] = useState(false);
  const [generateTutorMatchReport, { isLoading: isGeneratingReport }] =
    useGenerateTutorMatchReportMutation();
  const [downloadTutorMatchReportPdf, { isLoading: isDownloadingPdf }] =
    useDownloadTutorMatchReportPdfMutation();
  const [sendTelegramOutreach, { isLoading: isSendingTelegramOutreach }] =
    useSendTelegramOutreachMutation();

  const { data: tutor, isLoading } = useFetchRequestForTutorsByIdQuery(
    tutorId,
    {
      skip: !open || !tutorId,
    },
  );
  const gradeId = typeof tutor?.grade === "string" ? tutor.grade.trim() : "";
  const isGradeId = /^[a-f\d]{24}$/i.test(gradeId);
  const { data: grade, isFetching: isFetchingGrade } = useFetchGradeByIdQuery(
    gradeId,
    {
      skip: !open || !isGradeId,
    },
  );
  const { data: subjectsData, isFetching: isFetchingSubjects } =
    useFetchSubjectsQuery(
      {
        page: 1,
        limit: 10000,
      },
      {
        skip: !open,
      },
    );
  const assignedTutorIds = useMemo(
    () =>
      (Array.isArray(tutor?.tutors) ? tutor.tutors : []).flatMap((request) =>
        getAssignedTutorIds(request.assignedTutor),
      ),
    [tutor?.tutors],
  );
  const { data: tutorsData, isFetching: isFetchingTutors } =
    useFetchTutorsQuery(
      {
        page: 1,
        limit: 10000,
      },
      {
        skip: !open || assignedTutorIds.length === 0,
      },
    );
  const tutorNameById = useMemo(
    () =>
      new Map(
        (tutorsData?.results || []).flatMap((tutorRecord) => {
          const tutorName = tutorRecord.fullName || tutorRecord.name || "";
          const entries: Array<[string, string]> = [];

          if (tutorRecord.id && tutorName) {
            entries.push([tutorRecord.id, tutorName]);
          }

          return entries;
        }),
      ),
    [tutorsData?.results],
  );
  const subjectTitleById = useMemo(
    () =>
      new Map(
        (subjectsData?.results || []).map((subject) => [
          subject.id,
          subject.title,
        ]),
      ),
    [subjectsData?.results],
  );
  const effectiveStatus = useMemo(() => getEffectiveStatus(tutor), [tutor]);
  const requestId = String(tutor?.id || tutorId || "").trim();
  const requestReference = getRequestReference(requestId);
  const isTelegramOutreachSent =
    Boolean(tutor?.telegramOutreachSentAt) || telegramOutreachSent;
  const canSendTelegramOutreach =
    effectiveStatus === "Pending" && !isTelegramOutreachSent && !isLoading;

  // §3.2 / FR-6/FR-7: both report buttons disable with zero matched tutors; Generate also
  // needs a student email address, Download PDF doesn't.
  const totalMatchedTutors =
    tutor?.totalMatchedTutors ??
    (Array.isArray(tutor?.tutors)
      ? tutor.tutors.reduce(
          (sum, block) => sum + (block.matchedTutorCount || 0),
          0,
        )
      : 0);
  const hasStudentEmail = Boolean(tutor?.email && tutor.email.trim());
  const hasNoMatchedTutors = !isLoading && totalMatchedTutors === 0;
  const canDownloadPdf = !isLoading && totalMatchedTutors > 0;
  const canGenerate = canDownloadPdf && hasStudentEmail;
  const noMatchesTooltip = "No matched tutors yet. Report unavailable.";
  const generateTooltip = hasNoMatchedTutors
    ? noMatchesTooltip
    : !hasStudentEmail
      ? "This request has no student email address"
      : "Email the report to the student and the internal inbox";
  const downloadPdfTooltip = hasNoMatchedTutors
    ? noMatchesTooltip
    : "Download the report as a PDF";

  const displayFieldClass =
    "w-full rounded-md border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-700 dark:text-white/90 min-h-[2rem] overflow-auto scrollbar-thin";

  const tagClass =
    "inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium mr-1 mb-1 px-2 py-1 rounded";

  const getSafeValue = (value: unknown, fallback = "N/A") => {
    if (value === undefined || value === null) {
      return fallback;
    }

    const stringValue = String(value).trim();
    return stringValue === "" ? fallback : stringValue;
  };

  const getGradeDisplayValue = (value: unknown) => {
    if (value && typeof value === "object") {
      const gradeRecord = value as {
        id?: string;
        title?: string;
        name?: string;
      };
      return getSafeValue(
        gradeRecord.title || gradeRecord.name || gradeRecord.id,
        "",
      );
    }

    const safeGrade = getSafeValue(value, "");
    if (!safeGrade) {
      return "";
    }

    if (!isGradeId) {
      return safeGrade;
    }

    return (
      grade?.title || (isFetchingGrade ? "Loading grade..." : "Unknown grade")
    );
  };

  const getSubjectDisplayValue = (value: unknown) => {
    if (value && typeof value === "object") {
      const subjectRecord = value as {
        id?: string;
        title?: string;
        name?: string;
      };
      return getSafeValue(
        subjectRecord.title || subjectRecord.name || subjectRecord.id,
        "",
      );
    }

    const subjectId = getSafeValue(value, "");
    if (!subjectId) {
      return "";
    }

    const subjectTitle = subjectTitleById.get(subjectId);
    if (subjectTitle) {
      return subjectTitle;
    }

    return isFetchingSubjects ? "Loading subject..." : "Unknown subject";
  };

  const getClassTypeDisplayValue = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((item) => getSafeValue(item, "")).filter(Boolean);
    }

    const classType = getSafeValue(value, "");
    return classType ? [classType] : [];
  };

  const handleGenerateTutorMatchReport = async () => {
    try {
      const response = await generateTutorMatchReport({
        requestId: tutorId,
      }).unwrap();
      setReportSummary(response);
      setShowWhatsAppTemplate(true);

      const summaryText = formatTutorMatchReportSummaryText(response);
      if (response.outcome === "success") {
        toast.success(
          `Tutor match report sent${summaryText ? `: ${summaryText}` : ""}`,
        );
      } else {
        // Edge case: partial failure — report it, don't claim full success (§8).
        toast.error(
          response.message ||
            `Tutor match report only partly sent${summaryText ? `: ${summaryText}` : ""}`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(
        getApiErrorMessage(error, "Failed to generate tutor match report"),
      );
    }
  };

  const handleDownloadTutorMatchReportPdf = async () => {
    try {
      const blob = await downloadTutorMatchReportPdf({
        requestId: tutorId,
      }).unwrap();
      const fileName = `TuitionLanka-Match-Report-${requestReference}-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setShowWhatsAppTemplate(true);
      toast.success("Tutor match report PDF downloaded");
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to download tutor match report PDF"));
    }
  };

  const buildWhatsAppMessage = () => {
    const studentName = getSafeValue(tutor?.name, "there");
    const subjects = Array.from(
      new Set(
        (Array.isArray(tutor?.tutors) ? tutor.tutors : [])
          .map((t) => getSubjectDisplayValue(t.subject))
          .filter(Boolean),
      ),
    ).join(", ");
    const gradeLabel = getGradeDisplayValue(tutor?.grade) || "N/A";

    return [
      `Hi ${studentName},`,
      "",
      `Your tutor match report for Request ${requestReference} is ready. We found ${totalMatchedTutors} tutor${totalMatchedTutors === 1 ? "" : "s"} for ${subjects || "N/A"}, ${gradeLabel}.`,
      "",
      "The PDF is attached. Each tutor has an ID, experience, availability and fees.",
      "",
      "Reply here or to your email with the Tutor ID you want and we will send you their contact details.",
      "",
      "Matches are free until 30 September. After that we charge a fixed fee per match.",
      "",
      "TuitionLanka",
    ].join("\n");
  };

  const handleCopyWhatsAppMessage = async () => {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage());
      setWhatsAppCopied(true);
      toast.success("WhatsApp message copied");
      setTimeout(() => setWhatsAppCopied(false), 2000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to copy WhatsApp message");
    }
  };

  const handleSendTelegramOutreach = async () => {
    try {
      await sendTelegramOutreach({
        requestId: tutorId,
      }).unwrap();
      setTelegramOutreachSent(true);
      toast.success("Tutor request sent to Telegram");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send tutor request to Telegram");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Eye className="cursor-pointer text-blue-500 hover:text-blue-700" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-[625px] max-h-[80vh] overflow-hidden bg-white dark:bg-gray-800 dark:text-white/90 p-0 [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden [&>div:last-child]:p-0">
        <DialogHeader className="shrink-0 bg-white dark:bg-gray-800 px-6 py-4 border-b">
          <DialogTitle>Tutor Request Details</DialogTitle>
          <DialogDescription>
            Review the request details, generate a tutor match report, and
            inspect the suggested tutor blocks.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 scrollbar-thin">
          {isLoading && (
            <div className="text-sm text-gray-500 dark:text-white/70">
              Loading request details...
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label>Tutor Request Ref</Label>
              <div className={displayFieldClass}>{requestReference}</div>
            </div>

            <div className="grid gap-3">
              <Label>Full Name</Label>
              <div className={displayFieldClass}>
                {getSafeValue(tutor?.name)}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Email</Label>
              <div className={displayFieldClass}>
                {getSafeValue(tutor?.email)}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Contact Number</Label>
              <div className={displayFieldClass}>
                {getSafeValue(tutor?.phoneNumber)}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Medium</Label>
              <div className={displayFieldClass}>
                {getSafeValue(tutor?.medium)}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>District / City</Label>
              <div className={displayFieldClass}>
                {[
                  getSafeValue(tutor?.district, ""),
                  getSafeValue(tutor?.city, ""),
                ]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Grade</Label>
              <div className={displayFieldClass}>
                {getGradeDisplayValue(tutor?.grade) || (
                  <span className="text-gray-400 italic">No grade</span>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Status</Label>
              <div className={displayFieldClass}>
                <span className="text-gray-900 dark:text-white/90">
                  {effectiveStatus}
                </span>
              </div>
            </div>

            {(tutor?.telegramOutreachSentAt || telegramOutreachSent) && (
              <div className="grid gap-3">
                <Label>Telegram Outreach</Label>
                <div className={displayFieldClass}>
                  {tutor?.telegramOutreachSentAt
                    ? `Sent at ${new Date(tutor.telegramOutreachSentAt).toLocaleString()}`
                    : "Sent to Telegram"}
                </div>
              </div>
            )}

            <div className="grid gap-3">
              <Label>Tutors</Label>
              <div className="flex flex-col gap-2">
                {Array.isArray(tutor?.tutors) && tutor.tutors.length ? (
                  tutor.tutors.map((t, idx) => {
                    const assignedTutorItems = getAssignedTutorDisplayItems(
                      t.assignedTutor,
                    );
                    const classTypeLabels = getClassTypeDisplayValue(
                      t.classType ?? t.preferredClassType,
                    );

                    return (
                      <div
                        key={t._id || idx}
                        className="p-3 border rounded space-y-1 bg-gray-50 dark:bg-gray-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong>Request {idx + 1}</strong>
                          <span className="text-xs text-gray-500 dark:text-white/60">
                            Request Ref: {getRequestReference(t.id || t._id)}
                          </span>
                        </div>

                        <div>
                          Subject:{" "}
                          <span className={tagClass}>
                            {getSubjectDisplayValue(t.subject)}
                          </span>
                        </div>

                        {assignedTutorItems.length > 0 && (
                          <div>
                            Assigned Tutor:{" "}
                            {assignedTutorItems.map((assignedTutorItem) => (
                              <AssignedTutorBadge
                                key={
                                  assignedTutorItem.id ||
                                  assignedTutorItem.name ||
                                  "assigned-tutor"
                                }
                                item={assignedTutorItem}
                                tutorNameById={tutorNameById}
                                isFetchingTutorList={isFetchingTutors}
                                tagClass={tagClass}
                              />
                            ))}
                          </div>
                        )}

                        {t.preferredTutorType && (
                          <div>
                            Preferred Type:{" "}
                            <strong>
                              {getSafeValue(t.preferredTutorType)}
                            </strong>
                          </div>
                        )}
                        <div>
                          Class Type:{" "}
                          {classTypeLabels.length ? (
                            <strong>{classTypeLabels.join(", ")}</strong>
                          ) : (
                            <strong>N/A</strong>
                          )}
                        </div>
                        <div>
                          Duration: <strong>{getSafeValue(t.duration)}</strong>
                        </div>
                        <div>
                          Frequency:{" "}
                          <strong>{getSafeValue(t.frequency)}</strong>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-gray-400 italic">No tutors</span>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Created At</Label>
              <div className={displayFieldClass}>
                {tutor?.createdAt
                  ? new Date(tutor.createdAt).toLocaleString()
                  : "N/A"}
              </div>
            </div>
          </div>
          {reportSummary && (
            <div
              className={`grid mt-4 gap-3 rounded-lg border p-4 ${
                reportSummary.outcome === "success"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
              }`}
            >
              <div
                className={`flex items-center gap-2 ${
                  reportSummary.outcome === "success"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-semibold">
                  {reportSummary.outcome === "success"
                    ? "Tutor Match Report sent"
                    : "Tutor Match Report only partly sent"}
                </p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Report Ref:{" "}
                <span className="font-medium">{reportSummary.reportRef}</span>
              </p>
              <div className="space-y-1">
                {reportSummary.recipients.map((recipient) => (
                  <p
                    key={recipient.channel}
                    className="text-sm text-gray-700 dark:text-gray-200"
                  >
                    {recipient.channel === "student" ? "Student" : "Internal inbox"}:{" "}
                    <span className="font-medium">{recipient.address}</span>{" "}
                    <span
                      className={
                        recipient.status === "sent"
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-red-600 dark:text-red-300"
                      }
                    >
                      ({recipient.status})
                    </span>
                  </p>
                ))}
              </div>
              <div className="space-y-2">
                {reportSummary.matchedBlocks.map((block) => (
                  <div
                    key={block.subject}
                    className="flex items-center justify-between rounded-md bg-white/80 px-3 py-2 text-sm text-gray-900 dark:bg-white/10 dark:text-gray-100"
                  >
                    <span className="font-medium">{block.subject}</span>
                    <span>
                      {block.matchedTutors} matched tutor
                      {block.matchedTutors === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showWhatsAppTemplate && (
            <div className="grid mt-4 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                  WhatsApp message
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWhatsAppMessage}
                  className="gap-1.5"
                >
                  {whatsAppCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {whatsAppCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-white/60">
                Optional manual step for when a student misses the email —
                download the PDF above, then paste this alongside it.
              </p>
              <textarea
                readOnly
                value={buildWhatsAppMessage()}
                rows={7}
                className={`${displayFieldClass} resize-none font-mono text-xs`}
              />
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 flex-wrap bg-white dark:bg-gray-800 px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleSendTelegramOutreach}
            disabled={!canSendTelegramOutreach || isSendingTelegramOutreach}
            title={
              isTelegramOutreachSent
                ? "This request has already been sent to Telegram"
                : effectiveStatus === "Pending"
                  ? "Send this request to the verified tutors Telegram group"
                  : "Only pending requests can be sent to Telegram"
            }
            className="gap-2"
          >
            {isSendingTelegramOutreach ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSendingTelegramOutreach
              ? "Sending..."
              : isTelegramOutreachSent
                ? "Sent to Telegram"
                : "Send to Telegram"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadTutorMatchReportPdf}
            disabled={!canDownloadPdf || isDownloadingPdf}
            title={downloadPdfTooltip}
            className="gap-2"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {isDownloadingPdf ? "Downloading..." : "Download PDF"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateTutorMatchReport}
            disabled={!canGenerate || isGeneratingReport}
            title={generateTooltip}
            className="gap-2"
          >
            {isGeneratingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {isGeneratingReport
              ? "Generating..."
              : "Generate Tutor Match Report"}
          </Button>

          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
