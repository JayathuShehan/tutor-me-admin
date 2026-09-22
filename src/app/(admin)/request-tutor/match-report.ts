import type { GenerateTutorMatchReportResponse } from "@/types/response-types";

// The backend response shape is fixed now (see requestTutor.service.js ->
// generateAndSendTutorMatchReport / GenerateTutorMatchReportResponse), so the RTK Query
// mutation result is already typed — no more defensive field-name guessing here, just a
// summary line for the success/failure toast.
export const formatTutorMatchReportSummaryText = (
  summary: GenerateTutorMatchReportResponse,
): string => {
  const parts: string[] = [];

  const failedRecipients = summary.recipients.filter(
    (recipient) => recipient.status === "failed",
  );

  if (failedRecipients.length > 0) {
    parts.push(
      `Failed to send to: ${failedRecipients.map((recipient) => recipient.address).join(", ")}`,
    );
  }

  if (summary.matchedBlocks.length > 0) {
    parts.push(
      summary.matchedBlocks
        .map((block) => `${block.subject}: ${block.matchedTutors}`)
        .join(", "),
    );
  }

  return parts.join(" | ");
};
