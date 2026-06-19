/**
 * Fix Grade subjects arrays — remove duplicates, sort alphabetically, and
 * cross-check against existing tuition rates to catch orphaned rates.
 *
 * What this script does:
 *  1. Fetches every Grade (subjects fully populated).
 *  2. Deduplicates the subjects array for each grade (keeps first occurrence).
 *  3. Sorts the deduped subjects alphabetically by title.
 *  4. Fetches every TuitionRate and warns if a rate's subject is missing from
 *     its grade's subjects list (informational only — no rate is modified).
 *  5. In dry-run mode: logs what would change, makes no writes.
 *  6. With --apply: PATCHes affected grades with the cleaned subject ID array.
 *
 * Tuition rate documents are NEVER modified — they reference grade and subject
 * by ID directly and are unaffected by changes to grade.subjects.
 *
 * Usage:
 *   API_URL="https://..." node scripts/fix-grade-subjects.mjs <email> <password>           # dry run
 *   API_URL="https://..." node scripts/fix-grade-subjects.mjs <email> <password> --apply   # apply
 */

import readline from "readline";

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE) {
  console.error("Error: API_URL environment variable is not set.");
  console.error(
    'Usage: API_URL="https://..." node scripts/fix-grade-subjects.mjs <email> <password> [--apply]',
  );
  process.exit(1);
}

const DRY_RUN = !process.argv.includes("--apply");

// ─── helpers ────────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    }),
  );
}

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      `${options.method ?? "GET"} ${path} failed: ${JSON.stringify(data)}`,
    );
  return data;
}

async function login(email, password) {
  const data = await apiFetch("/v1/auth/login", null, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.tokens.access.token;
}

async function fetchAll(token, path) {
  const data = await apiFetch(`${path}?page=1&limit=10000`, token);
  return data.results ?? [];
}

async function patchGrade(token, gradeId, subjectIds) {
  return apiFetch(`/v1/grades/${gradeId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ subjects: subjectIds }),
  });
}

// ─── dedup + sort ────────────────────────────────────────────────────────────

function normaliseSubjectId(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry.id ?? entry._id?.toString() ?? null;
}

function deduplicateAndSort(subjects) {
  const seen = new Set();
  const unique = [];

  for (const s of subjects) {
    const id = normaliseSubjectId(s);
    if (id && !seen.has(id)) {
      seen.add(id);
      unique.push(s);
    }
  }

  // Sort alphabetically by title (case-insensitive)
  unique.sort((a, b) => {
    const ta = (typeof a === "object" ? a.title : "") ?? "";
    const tb = (typeof b === "object" ? b.title : "") ?? "";
    return ta.localeCompare(tb, undefined, { sensitivity: "base" });
  });

  return unique;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  let [, , email, password] = process.argv;
  if (!email) email = await prompt("Email: ");
  if (!password) password = await prompt("Password: ");

  console.log("\nLogging in…");
  const token = await login(email, password);
  console.log("Logged in\n");

  if (DRY_RUN) {
    console.log(
      "DRY RUN — no writes will be made. Pass --apply to apply fixes.\n",
    );
  }

  // ── fetch grades ──────────────────────────────────────────────────────────
  console.log("Fetching grades…");
  const grades = await fetchAll(token, "/v1/grades");
  console.log(`  ${grades.length} grade(s) found\n`);

  // ── fetch tuition rates (for cross-check) ─────────────────────────────────
  console.log("Fetching tuition rates…");
  const rates = await fetchAll(token, "/v1/tuitionRates");
  console.log(`  ${rates.length} tuition rate(s) found\n`);

  // Build a map: gradeId → Set of subjectIds referenced by rates
  const rateSubjectsByGrade = new Map();
  for (const rate of rates) {
    const gId = rate.grade?.id ?? rate.grade;
    const sId = rate.subject?.id ?? rate.subject;
    if (!gId || !sId) continue;
    if (!rateSubjectsByGrade.has(gId)) rateSubjectsByGrade.set(gId, new Set());
    rateSubjectsByGrade.get(gId).add(sId);
  }

  // ── process each grade ────────────────────────────────────────────────────
  let gradesToFix = 0;
  let totalDuplicatesRemoved = 0;
  let totalReordered = 0;
  const orphanWarnings = [];

  console.log("─".repeat(64));

  for (const grade of grades) {
    const gradeId = grade.id ?? grade._id;
    const gradeTitle = grade.title ?? gradeId;
    const subjects = grade.subjects ?? [];

    const original = subjects.map(normaliseSubjectId).filter(Boolean);
    const fixed = deduplicateAndSort(subjects);
    const fixedIds = fixed.map(normaliseSubjectId).filter(Boolean);

    const duplicatesRemoved = original.length - fixedIds.length;
    const orderChanged =
      fixedIds.some((id, i) => id !== original[i]) && duplicatesRemoved === 0;
    const needsFix = duplicatesRemoved > 0 || orderChanged;

    // ── cross-check: any rate's subject missing from this grade? ────────────
    const rateSubjects = rateSubjectsByGrade.get(gradeId) ?? new Set();
    const fixedIdSet = new Set(fixedIds);
    const missingFromGrade = [...rateSubjects].filter(
      (sid) => !fixedIdSet.has(sid),
    );

    if (missingFromGrade.length > 0) {
      orphanWarnings.push({ gradeTitle, gradeId, missingFromGrade });
    }

    // ── log ─────────────────────────────────────────────────────────────────
    if (!needsFix && missingFromGrade.length === 0) {
      console.log(
        `  [ OK ] "${gradeTitle}" — ${fixedIds.length} subject(s), clean`,
      );
      continue;
    }

    const parts = [];
    if (duplicatesRemoved > 0)
      parts.push(`${duplicatesRemoved} duplicate(s) removed`);
    if (orderChanged) parts.push(`order corrected`);

    if (DRY_RUN) {
      console.log(
        `  [DRY] "${gradeTitle}" — ${parts.join(", ")} (${original.length} → ${fixedIds.length})`,
      );
      if (fixedIds.length <= 30) {
        for (const s of fixed) {
          const title = typeof s === "object" ? s.title : s;
          console.log(`         • ${title}`);
        }
      }
    } else if (needsFix) {
      await patchGrade(token, gradeId, fixedIds);
      console.log(
        `  [FIX] "${gradeTitle}" — ${parts.join(", ")} (${original.length} → ${fixedIds.length})`,
      );
      if (fixedIds.length <= 30) {
        for (const s of fixed) {
          const title = typeof s === "object" ? s.title : s;
          console.log(`         • ${title}`);
        }
      }
    }

    gradesToFix++;
    totalDuplicatesRemoved += duplicatesRemoved;
    if (orderChanged) totalReordered++;
  }

  // ── orphan warnings ───────────────────────────────────────────────────────
  if (orphanWarnings.length > 0) {
    console.log("\n" + "─".repeat(64));
    console.log(
      "⚠  RATE/SUBJECT MISMATCH — tuition rates reference subjects not in grade:",
    );
    for (const { gradeTitle, missingFromGrade } of orphanWarnings) {
      console.log(`\n   Grade: "${gradeTitle}"`);
      for (const sid of missingFromGrade) {
        console.log(
          `     - Subject ID ${sid} has a rate but is NOT in grade.subjects`,
        );
      }
    }
    console.log(
      "\n   These subjects should be added back to the grade manually via the admin panel.",
    );
  }

  // ── summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(64));

  if (gradesToFix === 0 && orphanWarnings.length === 0) {
    console.log("All grades are clean — no changes needed.");
  } else if (DRY_RUN) {
    console.log(`${gradesToFix} grade(s) need fixing:`);
    if (totalDuplicatesRemoved > 0)
      console.log(
        `  • ${totalDuplicatesRemoved} duplicate subject reference(s) would be removed`,
      );
    if (totalReordered > 0)
      console.log(
        `  • ${totalReordered} grade(s) would be reordered alphabetically`,
      );
    console.log("\nRun with --apply to apply:\n");
    console.log(
      "  node scripts/fix-grade-subjects.mjs <email> <password> --apply\n",
    );
  } else {
    console.log(`Fixed ${gradesToFix} grade(s):`);
    if (totalDuplicatesRemoved > 0)
      console.log(
        `  • ${totalDuplicatesRemoved} duplicate subject reference(s) removed`,
      );
    if (totalReordered > 0)
      console.log(`  • ${totalReordered} grade(s) reordered alphabetically`);
    console.log("\nDone.");
  }
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
