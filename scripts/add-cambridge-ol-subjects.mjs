/**
 * Add Cambridge O Level subjects to the "Cambridge Ordinary Level" grade.
 *
 * - Fetches all existing subjects; skips creation for any that already exist (matched by normalised title).
 * - Creates missing subjects, then updates the grade's subjects list with all IDs.
 *
 * Usage: node scripts/add-cambridge-ol-subjects.mjs <email> <password>
 */

import fs from "fs";
import readline from "readline";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE =
  "https://tutorme-backend-api-d7a6cjdkgnedbxf0.southeastasia-01.azurewebsites.net";
const PAPERS_DIR = process.env.PAPERS_DIR ?? "D:/Download/Cambridge-OL-Papers";

// Cambridge O Level subjects from https://www.cambridgeinternational.org/.../cambridge-o-level/subjects/
const CAMBRIDGE_OL_SUBJECTS = [
  { title: "Accounting", code: "7707" },
  { title: "Agriculture", code: "5038" },
  { title: "Arabic", code: "3180" },
  { title: "Art & Design", code: "6090" },
  { title: "Bangladesh Studies", code: "7094" },
  { title: "Bengali", code: "3204" },
  { title: "Biblical Studies", code: "2035" },
  { title: "Biology", code: "5090" },
  { title: "Business", code: "7081" },
  { title: "Business Studies", code: "7115" },
  { title: "Chemistry", code: "5070" },
  { title: "Commerce", code: "7100" },
  { title: "Computer Science", code: "2210" },
  { title: "Economics", code: "2281" },
  { title: "English Language", code: "1123" },
  { title: "Environmental Management", code: "5014" },
  { title: "Fashion & Textiles", code: "6130" },
  { title: "Food & Nutrition", code: "6065" },
  { title: "Geography", code: "2217" },
  { title: "Global Perspectives", code: "2069" },
  { title: "Hinduism", code: "2055" },
  { title: "History", code: "2147" },
  { title: "ICT", code: "0417" },
  { title: "Islamic Studies", code: "2068" },
  { title: "Islamiyat", code: "2058" },
  { title: "Literature in English", code: "2010" },
  { title: "Mathematics - Additional", code: "4037" },
  { title: "Mathematics (Syllabus D)", code: "4024" },
  { title: "Pakistan Studies", code: "2059" },
  { title: "Physics", code: "5054" },
  { title: "Science - Combined", code: "5129" },
  { title: "Setswana", code: "3158" },
  { title: "Sinhala", code: "3205" },
  { title: "Sociology", code: "2251" },
  { title: "Statistics", code: "4040" },
  { title: "Tamil", code: "3226" },
  { title: "Travel & Tourism", code: "7096" },
  { title: "Urdu - First Language", code: "3247" },
  { title: "Urdu - Second Language", code: "3248" },
];

const TARGET_GRADE_TITLE = "Cambridge Ordinary Level";
const SUBJECT_CODE_BY_TITLE = new Map(
  CAMBRIDGE_OL_SUBJECTS.map((subject) => [
    normalise(subject.title),
    subject.code,
  ]),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(str) {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

function getDownloadedSubjects() {
  if (!fs.existsSync(PAPERS_DIR)) {
    throw new Error(`Downloaded papers folder not found: ${PAPERS_DIR}`);
  }

  const subjects = fs
    .readdirSync(PAPERS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (subjects.length === 0) {
    throw new Error(`No subject folders found in ${PAPERS_DIR}`);
  }

  return subjects.map((title) => ({
    title,
    code: SUBJECT_CODE_BY_TITLE.get(normalise(title)) ?? "",
  }));
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
  const downloadedSubjects = getDownloadedSubjects();
  console.log("✅ Logged in\n");

  console.log(`Subjects found in downloads: ${downloadedSubjects.length}`);
  for (const { title } of downloadedSubjects) {
    console.log(`   - ${title}`);
  }
  console.log("");

  // 1. Fetch existing subjects
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

  for (const { title, code } of downloadedSubjects) {
    const key = normalise(title);
    if (existingMap.has(key)) {
      const id = existingMap.get(key);
      console.log(`   ⏩ Skip  "${title}" (already exists: ${id})`);
      subjectIds.push(id);
      skipped++;
    } else {
      const description = code
        ? `Cambridge O Level ${title} (Syllabus ${code})`
        : `Cambridge O Level ${title}`;
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

  // 3. Find the Cambridge Ordinary Level grade
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

  // Include any subjects already on the grade that we aren't adding
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
