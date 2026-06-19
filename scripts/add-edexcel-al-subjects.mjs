/**
 * Add Edexcel A Level subjects to the "Edexcel Advanced Level" grade.
 *
 * - Uses the hardcoded subject list below (independent of the scrape script).
 * - Creates any missing subjects in the API.
 * - Updates the grade's subjects list, preserving any already-linked subjects.
 *
 * Usage: node scripts/add-edexcel-al-subjects.mjs <email> <password>
 */

import readline from "readline";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE =
  "https://tutorme-backend-api-d7a6cjdkgnedbxf0.southeastasia-01.azurewebsites.net";

// Edexcel International A Level (IAL) subjects available on platinumacademy.lk
const EDEXCEL_AL_SUBJECTS = [
  { title: "Accounting", code: "WAC" },
  { title: "Biology", code: "WBI" },
  { title: "Business Studies", code: "WBS" },
  { title: "Chemistry", code: "WCH" },
  { title: "Economics", code: "WEC" },
  { title: "Physics", code: "WPH" },
];

const TARGET_GRADE_TITLE = "Edexcel Advanced Level";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(str) {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${data.message}`);
  return data.tokens.access.token;
}

async function fetchAllSubjects(token) {
  const res = await fetch(`${API_BASE}/v1/subjects?page=1&limit=10000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.results ?? [];
}

async function createSubject(token, title, description) {
  const res = await fetch(`${API_BASE}/v1/subjects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description }),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(`Create subject failed: ${JSON.stringify(data)}`);
  return data;
}

async function fetchAllGrades(token) {
  const res = await fetch(`${API_BASE}/v1/grades?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.results ?? [];
}

async function updateGrade(token, gradeId, subjectIds) {
  const res = await fetch(`${API_BASE}/v1/grades/${gradeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subjects: subjectIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Update grade failed: ${JSON.stringify(data)}`);
  return data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let [, , email, password] = process.argv;
  if (!email) email = await prompt("Email: ");
  if (!password) password = await prompt("Password: ");

  console.log("\n🔐 Logging in...");
  const token = await login(email, password);
  console.log("✅ Logged in\n");

  console.log(`Subjects to add: ${EDEXCEL_AL_SUBJECTS.length}`);
  for (const { title } of EDEXCEL_AL_SUBJECTS) {
    console.log(`   - ${title}`);
  }
  console.log("");

  // 1. Fetch all existing subjects
  console.log("📋 Fetching existing subjects...");
  const existingSubjects = await fetchAllSubjects(token);
  const existingMap = new Map(
    existingSubjects.map((s) => [normalise(s.title), s.id]),
  );
  console.log(`   Found ${existingSubjects.length} existing subjects\n`);

  // 2. Create missing subjects
  const subjectIds = [];
  let created = 0;
  let skipped = 0;

  for (const { title, code } of EDEXCEL_AL_SUBJECTS) {
    const key = normalise(title);
    if (existingMap.has(key)) {
      const id = existingMap.get(key);
      console.log(`   ⏩ Skip  "${title}" (already exists: ${id})`);
      subjectIds.push(id);
      skipped++;
    } else {
      const description = `Edexcel International A Level ${title} (${code})`;
      try {
        const subject = await createSubject(token, title, description);
        const id = subject.id ?? subject._id;
        console.log(`   ✅ Create "${title}" → ${id}`);
        subjectIds.push(id);
        existingMap.set(key, id);
        created++;
      } catch (err) {
        console.error(`   ❌ Failed "${title}": ${err.message}`);
      }
    }
  }

  console.log(`\n📊 Subjects: ${created} created, ${skipped} skipped\n`);

  // 3. Find the Edexcel Advanced Level grade
  console.log("🎓 Fetching grades...");
  const grades = await fetchAllGrades(token);
  const grade = grades.find(
    (g) => normalise(g.title) === normalise(TARGET_GRADE_TITLE),
  );

  if (!grade) {
    const titles = grades.map((g) => `  • ${g.title}`).join("\n");
    throw new Error(
      `Grade "${TARGET_GRADE_TITLE}" not found. Available grades:\n${titles}`,
    );
  }

  console.log(`   Found grade: "${grade.title}" (${grade.id})`);

  // Merge with subjects already linked to the grade
  const existingGradeSubjectIds = (grade.subjects ?? []).map((s) =>
    typeof s === "string" ? s : (s.id ?? s._id),
  );
  const mergedIds = [...new Set([...existingGradeSubjectIds, ...subjectIds])];

  console.log(`\n🔗 Updating grade with ${mergedIds.length} subject(s)...`);
  await updateGrade(token, grade.id, mergedIds);
  console.log(`✅ Grade "${TARGET_GRADE_TITLE}" updated successfully.\n`);
}

main().catch((err) => {
  console.error("\n💥", err.message);
  process.exit(1);
});
