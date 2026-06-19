/**
 * Deduplicate TuitionRate documents.
 *
 * Multiple TuitionRate documents can exist for the same grade + subject pair,
 * causing duplicate rows in the client-portal tuition rates table.
 *
 * This script:
 *  1. Fetches every TuitionRate document.
 *  2. Groups them by gradeId + subjectId.
 *  3. Within each group, keeps the most recently updated document.
 *  4. In dry-run mode: logs what would be deleted, makes no writes.
 *  5. With --apply: deletes the duplicate documents.
 *
 * Usage:
 *   API_URL="https://..." node scripts/dedup-tuition-rates.mjs <email> <password>           # dry run
 *   API_URL="https://..." node scripts/dedup-tuition-rates.mjs <email> <password> --apply   # apply
 */

import readline from "readline";

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE) {
  console.error("Error: API_URL environment variable is not set.");
  console.error(
    'Usage: API_URL="https://..." node scripts/dedup-tuition-rates.mjs <email> <password> [--apply]',
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
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
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

async function deleteRate(token, rateId) {
  return apiFetch(`/v1/tuitionRates/${rateId}`, token, { method: "DELETE" });
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
    console.log("DRY RUN — no deletes will happen. Pass --apply to apply.\n");
  }

  console.log("Fetching tuition rates…");
  const rates = await fetchAll(token, "/v1/tuitionRates");
  console.log(`  ${rates.length} tuition rate(s) found\n`);

  // ── group by gradeId + subjectId ──────────────────────────────────────────
  const groups = new Map();

  for (const rate of rates) {
    const gradeId = rate.grade?.id ?? rate.grade;
    const subjectId = rate.subject?.id ?? rate.subject;
    if (!gradeId || !subjectId) continue;

    const key = `${gradeId}::${subjectId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rate);
  }

  // ── find duplicates ───────────────────────────────────────────────────────
  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("All tuition rates are clean — no duplicates found.");
    return;
  }

  console.log(`Found ${duplicateGroups.length} duplicate group(s):\n`);
  console.log("─".repeat(64));

  let totalToDelete = 0;

  for (const group of duplicateGroups) {
    // Sort: most recently updated first → keep index 0, delete the rest
    group.sort((a, b) => {
      const da = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const db = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return db - da;
    });

    const keep = group[0];
    const toDelete = group.slice(1);
    const gradeTitle = keep.grade?.title ?? keep.grade;
    const subjectTitle = keep.subject?.title ?? keep.subject;

    console.log(`  Grade:   "${gradeTitle}"`);
    console.log(`  Subject: "${subjectTitle}"`);
    console.log(
      `  Keep:    ${keep.id} (updated ${keep.updatedAt ?? keep.createdAt})`,
    );

    for (const dup of toDelete) {
      totalToDelete++;
      if (DRY_RUN) {
        console.log(
          `  [DRY] Would delete: ${dup.id} (updated ${dup.updatedAt ?? dup.createdAt})`,
        );
      } else {
        await deleteRate(token, dup.id);
        console.log(`  [DEL] Deleted:      ${dup.id}`);
      }
    }

    console.log("");
  }

  // ── summary ───────────────────────────────────────────────────────────────
  console.log("═".repeat(64));

  if (DRY_RUN) {
    console.log(
      `${totalToDelete} duplicate rate document(s) would be deleted across ${duplicateGroups.length} group(s).`,
    );
    console.log("\nRun with --apply to apply:\n");
    console.log(
      "  node scripts/dedup-tuition-rates.mjs <email> <password> --apply\n",
    );
  } else {
    console.log(
      `Deleted ${totalToDelete} duplicate rate document(s) across ${duplicateGroups.length} group(s).`,
    );
    console.log("\nDone.");
  }
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
