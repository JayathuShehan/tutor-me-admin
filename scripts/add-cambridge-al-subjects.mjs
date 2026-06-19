/**
 * Add downloaded Cambridge A/L subjects to the "Cambridge Advanced Level" grade.
 *
 * - Reads subject folders from D:/Download/Cambridge-AL-Papers.
 * - Creates any missing subjects.
 * - Updates the Cambridge Advanced Level grade with existing + downloaded subjects.
 *
 * Usage: node scripts/add-cambridge-al-subjects.mjs <email> <password>
 */

import fs from "fs";
import readline from "readline";

const API_BASE =
  "https://tutorme-backend-api-d7a6cjdkgnedbxf0.southeastasia-01.azurewebsites.net";
const PAPERS_DIR = process.env.PAPERS_DIR ?? "D:/Download/Cambridge-AL-Papers";
const TARGET_GRADE_TITLE = "Cambridge Advanced Level";

const SUBJECT_CODE_BY_TITLE = new Map([
  ["accounting", "9706"],
  ["biology", "9700"],
  ["business studies", "9609"],
  ["chemistry", "9701"],
  ["computer science", "9618"],
  ["economics", "9708"],
  ["english language", "9093"],
  ["mathematics", "9709"],
  ["physics", "9702"],
]);

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
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
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

async function main() {
  let [, , email, password] = process.argv;
  if (!email) email = await prompt("Email: ");
  if (!password) password = await prompt("Password: ");

  console.log("\nLogging in...");
  const token = await login(email, password);
  const downloadedSubjects = getDownloadedSubjects();
  console.log("Logged in\n");

  console.log(`Subjects found in downloads: ${downloadedSubjects.length}`);
  for (const { title } of downloadedSubjects) {
    console.log(`   - ${title}`);
  }
  console.log("");

  console.log("Fetching existing subjects...");
  const existingSubjects = await fetchAllSubjects(token);
  const existingMap = new Map(
    existingSubjects.map((subject) => [normalise(subject.title), subject.id]),
  );
  console.log(`   Found ${existingSubjects.length} existing subjects\n`);

  const subjectIds = [];
  let created = 0;
  let skipped = 0;

  for (const { title, code } of downloadedSubjects) {
    const key = normalise(title);
    if (existingMap.has(key)) {
      const id = existingMap.get(key);
      console.log(`   Skip "${title}" (already exists: ${id})`);
      subjectIds.push(id);
      skipped++;
      continue;
    }

    const description = code
      ? `Cambridge A Level ${title} (Syllabus ${code})`
      : `Cambridge A Level ${title}`;

    try {
      const subject = await createSubject(token, title, description);
      const id = subject.id ?? subject._id;
      console.log(`   Create "${title}" -> ${id}`);
      subjectIds.push(id);
      existingMap.set(key, id);
      created++;
    } catch (err) {
      console.error(`   Failed "${title}": ${err.message}`);
    }
  }

  console.log(`\nSubjects: ${created} created, ${skipped} skipped\n`);

  console.log("Fetching grades...");
  const grades = await fetchAllGrades(token);
  const grade = grades.find(
    (item) => normalise(item.title) === normalise(TARGET_GRADE_TITLE),
  );

  if (!grade) {
    const titles = grades.map((item) => `  - ${item.title}`).join("\n");
    throw new Error(
      `Grade "${TARGET_GRADE_TITLE}" not found. Available grades:\n${titles}`,
    );
  }

  console.log(`   Found grade: "${grade.title}" (${grade.id})`);

  const existingGradeSubjectIds = (grade.subjects ?? []).map((subject) =>
    typeof subject === "string" ? subject : (subject.id ?? subject._id),
  );
  const mergedIds = [...new Set([...existingGradeSubjectIds, ...subjectIds])];

  console.log(`\nUpdating grade with ${mergedIds.length} subject(s)...`);
  await updateGrade(token, grade.id, mergedIds);
  console.log(`Grade "${TARGET_GRADE_TITLE}" updated successfully.\n`);
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
