/**
 * QA data fix — connects directly to MongoDB.
 *
 * Fixes in order:
 *  1. Deduplicates grade.subjects arrays (keeps first occurrence).
 *  2. Removes duplicate TuitionRate documents for the same grade+subject pair (keeps newest).
 *  3. Fills TuitionRate documents that have null/empty rate values using a complete
 *     rate from the same grade as a template.
 *  4. Creates missing TuitionRate documents (grade+subject has no rate at all)
 *     using a complete rate from the same grade as a template.
 *
 * Requirements:
 *   pnpm add mongodb   (or: npm install mongodb)
 *
 * Usage:
 *   MONGODB_URL="mongodb+srv://..." node scripts/fix-qa-data.mjs           # dry run
 *   MONGODB_URL="mongodb+srv://..." node scripts/fix-qa-data.mjs --apply   # apply
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URL = process.env.MONGODB_URL;
const DRY_RUN = !process.argv.includes("--apply");

if (!MONGODB_URL) {
  console.error("Error: MONGODB_URL environment variable is not set.");
  console.error(
    'Usage: MONGODB_URL="mongodb+srv://..." node scripts/fix-qa-data.mjs [--apply]',
  );
  process.exit(1);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function toStr(id) {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (id instanceof ObjectId) return id.toHexString();
  return id.toString();
}

function hasValidRate(rate) {
  if (!rate) return false;
  const min = rate.minimumRate;
  const max = rate.maximumRate;
  return min != null && min !== "" && max != null && max !== "";
}

function isRateComplete(doc) {
  return (
    hasValidRate(doc.universityStudentsRate) &&
    hasValidRate(doc.partTimeTutorRate) &&
    hasValidRate(doc.fullTimeTutorRate) &&
    hasValidRate(doc.moeTeacherRate)
  );
}

function rateValuesFrom(template) {
  return {
    universityStudentsRate: {
      minimumRate: template.universityStudentsRate.minimumRate,
      maximumRate: template.universityStudentsRate.maximumRate,
    },
    partTimeTutorRate: {
      minimumRate: template.partTimeTutorRate.minimumRate,
      maximumRate: template.partTimeTutorRate.maximumRate,
    },
    fullTimeTutorRate: {
      minimumRate: template.fullTimeTutorRate.minimumRate,
      maximumRate: template.fullTimeTutorRate.maximumRate,
    },
    moeTeacherRate: {
      minimumRate: template.moeTeacherRate.minimumRate,
      maximumRate: template.moeTeacherRate.maximumRate,
    },
  };
}

function sep(char = "─", len = 64) {
  console.log(char.repeat(len));
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    const db = client.db();

    const colNames = (await db.listCollections().toArray()).map((c) => c.name);
    const gradeCol = colNames.find((n) => /^grades?$/i.test(n)) ?? "grades";
    const rateCol = colNames.find((n) => /tuition/i.test(n)) ?? "tuitionrates";
    const subjectCol =
      colNames.find((n) => /^subjects?$/i.test(n)) ?? "subjects";

    console.log(`\nConnected to: ${db.databaseName}`);
    console.log(
      `Collections — grades: "${gradeCol}", rates: "${rateCol}", subjects: "${subjectCol}"`,
    );
    console.log(
      DRY_RUN
        ? "\nDRY RUN — no writes. Pass --apply to apply.\n"
        : "\nAPPLY MODE — writing changes.\n",
    );

    const grades = await db.collection(gradeCol).find({}).toArray();
    const rates = await db.collection(rateCol).find({}).toArray();
    const allSubjects = await db.collection(subjectCol).find({}).toArray();

    console.log(`Grades:   ${grades.length}`);
    console.log(`Rates:    ${rates.length}`);
    console.log(`Subjects: ${allSubjects.length}\n`);

    const subjectById = new Map(allSubjects.map((s) => [toStr(s._id), s]));

    // ── STEP 1 — Deduplicate grade.subjects ───────────────────────────────
    sep();
    console.log("STEP 1 — Deduplicate grade.subjects arrays\n");

    let gradeFixCount = 0;

    for (const grade of grades) {
      const subjects = grade.subjects ?? [];
      const seen = new Set();
      const deduped = [];

      for (const s of subjects) {
        const key = toStr(s);
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(s);
        }
      }

      const dupCount = subjects.length - deduped.length;
      if (dupCount === 0) {
        console.log(
          `  [OK]  "${grade.title}" — ${subjects.length} subjects, clean`,
        );
        continue;
      }

      gradeFixCount++;
      if (DRY_RUN) {
        console.log(
          `  [DRY] "${grade.title}" — ${dupCount} duplicate(s) would be removed (${subjects.length} → ${deduped.length})`,
        );
      } else {
        await db
          .collection(gradeCol)
          .updateOne({ _id: grade._id }, { $set: { subjects: deduped } });
        console.log(
          `  [FIX] "${grade.title}" — removed ${dupCount} duplicate(s) (${subjects.length} → ${deduped.length})`,
        );
      }
    }

    if (gradeFixCount === 0)
      console.log("  All grade subject arrays are clean.");

    // ── STEP 2 — Remove duplicate rate documents ──────────────────────────
    sep();
    console.log("\nSTEP 2 — Remove duplicate TuitionRate documents\n");

    const rateGroups = new Map();
    for (const r of rates) {
      const key = `${toStr(r.grade)}::${toStr(r.subject)}`;
      if (!rateGroups.has(key)) rateGroups.set(key, []);
      rateGroups.get(key).push(r);
    }

    const dupeGroups = [...rateGroups.values()].filter((g) => g.length > 1);
    let dupeDeleted = 0;

    if (dupeGroups.length === 0) {
      console.log("  No duplicate rate documents found.");
    } else {
      for (const group of dupeGroups) {
        group.sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.createdAt ?? 0) -
            new Date(a.updatedAt ?? a.createdAt ?? 0),
        );
        const keep = group[0];
        const toDelete = group.slice(1);
        const gradeDoc = grades.find((g) => toStr(g._id) === toStr(keep.grade));
        const subDoc = subjectById.get(toStr(keep.subject));

        for (const dup of toDelete) {
          dupeDeleted++;
          if (DRY_RUN) {
            console.log(
              `  [DRY] "${gradeDoc?.title} / ${subDoc?.title}" — would delete ${dup._id}`,
            );
          } else {
            await db.collection(rateCol).deleteOne({ _id: dup._id });
            console.log(
              `  [DEL] "${gradeDoc?.title} / ${subDoc?.title}" — deleted ${dup._id}`,
            );
          }
        }
      }
    }

    // Refresh after dedup (use originals in dry run)
    const activeRates = DRY_RUN
      ? rates
      : await db.collection(rateCol).find({}).toArray();

    // Build key → rate lookup
    const rateByKey = new Map();
    for (const r of activeRates) {
      const key = `${toStr(r.grade)}::${toStr(r.subject)}`;
      if (!rateByKey.has(key)) rateByKey.set(key, r);
    }

    // ── STEP 3 & 4 — Fill incomplete + create missing rates ───────────────
    sep();
    console.log(
      "\nSTEP 3 — Fill incomplete rate values & create missing rates\n",
    );

    let incompleteFixed = 0;
    let missingCreated = 0;

    for (const grade of grades) {
      const gradeId = toStr(grade._id);
      const gradeRates = activeRates.filter((r) => toStr(r.grade) === gradeId);
      const template = gradeRates.find((r) => isRateComplete(r));

      if (!template) {
        if ((grade.subjects ?? []).length > 0) {
          console.log(
            `  [WARN] "${grade.title}" — no complete rate to use as template, skipping`,
          );
        }
        continue;
      }

      for (const sRef of grade.subjects ?? []) {
        const subjectId = toStr(sRef);
        const subject = subjectById.get(subjectId);

        // Skip orphaned subject references (no subject document exists)
        if (!subject) {
          console.log(
            `  [SKIP] "${grade.title}" — subject ID ${subjectId} has no subject document, skipping`,
          );
          continue;
        }

        const subTitle = subject.title;
        const key = `${gradeId}::${subjectId}`;
        const existing = rateByKey.get(key);

        if (!existing) {
          // Rate document is completely missing
          missingCreated++;
          if (DRY_RUN) {
            console.log(
              `  [DRY] "${grade.title} / ${subTitle}" — no rate doc, would create`,
            );
          } else {
            const newDoc = {
              grade: new ObjectId(gradeId),
              subject: new ObjectId(subjectId),
              ...rateValuesFrom(template),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            const result = await db.collection(rateCol).insertOne(newDoc);
            rateByKey.set(key, { ...newDoc, _id: result.insertedId });
            console.log(`  [NEW] "${grade.title} / ${subTitle}" — created`);
          }
        } else if (!isRateComplete(existing)) {
          // Rate document exists but has null/empty values
          incompleteFixed++;
          if (DRY_RUN) {
            console.log(
              `  [DRY] "${grade.title} / ${subTitle}" — incomplete values, would fill from template`,
            );
            console.log(
              `         template: uni=${template.universityStudentsRate?.minimumRate}-${template.universityStudentsRate?.maximumRate}, part=${template.partTimeTutorRate?.minimumRate}-${template.partTimeTutorRate?.maximumRate}, full=${template.fullTimeTutorRate?.minimumRate}-${template.fullTimeTutorRate?.maximumRate}, moe=${template.moeTeacherRate?.minimumRate}-${template.moeTeacherRate?.maximumRate}`,
            );
          } else {
            await db
              .collection(rateCol)
              .updateOne(
                { _id: existing._id },
                {
                  $set: { ...rateValuesFrom(template), updatedAt: new Date() },
                },
              );
            console.log(
              `  [UPD] "${grade.title} / ${subTitle}" — filled from template`,
            );
          }
        }
      }
    }

    if (incompleteFixed === 0 && missingCreated === 0) {
      console.log("  All rate values are complete — nothing to fix.");
    }

    // ── SUMMARY ───────────────────────────────────────────────────────────
    sep("═");
    console.log("\nSUMMARY\n");
    console.log(`  Grade subject arrays fixed:  ${gradeFixCount}`);
    console.log(`  Duplicate rate docs removed: ${dupeDeleted}`);
    console.log(`  Incomplete rates filled:     ${incompleteFixed}`);
    console.log(`  Missing rates created:       ${missingCreated}`);

    if (DRY_RUN) {
      console.log(
        "\nDRY RUN complete — no data was changed. Run with --apply to apply:\n",
      );
      console.log(
        '  MONGODB_URL="<url>" node scripts/fix-qa-data.mjs --apply\n',
      );
    } else {
      console.log(
        "\nAll fixes applied. Refresh qa.tuitionlanka.com/tuition-rates to verify.",
      );
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
