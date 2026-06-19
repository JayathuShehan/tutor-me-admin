/**
 * Cambridge O/L Past Paper Uploader
 * Reads manifest.json files created by scrape-cambridge-ol-papers.mjs,
 * uploads each PDF to Azure Blob Storage, then creates a paper record
 * in the backend API under the "Cambridge Ordinary Level" grade.
 *
 * Usage: node scripts/upload-cambridge-ol-papers.mjs <email> <password>
 */

import fs from "fs";
import path from "path";
import readline from "readline";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE =
  "https://tutorme-backend-api-d7a6cjdkgnedbxf0.southeastasia-01.azurewebsites.net";
const PAPERS_DIR = process.env.PAPERS_DIR ?? "D:/Download/Cambridge-OL-Papers";

const AZURE_ACCOUNT = "tutormeuploads";
const AZURE_CONTAINER = "uploads";
const AZURE_KEY = process.env.AZURE_STORAGE_KEY ?? "";

const GRADE_TITLE = "Cambridge Ordinary Level";
const MEDIUM = "English";
const MIN_YEAR = 2020;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function login(email, password, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const text = await res.text();
    if (text.startsWith("Too many")) {
      const wait = (i + 1) * 10000;
      console.log(`  Rate limited — waiting ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(`Login failed: ${data.message}`);
    return data.tokens.access.token;
  }
  throw new Error("Login failed after retries");
}

async function fetchGrade(token) {
  const res = await fetch(`${API_BASE}/v1/grades?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const grades = data.results ?? [];
  return (
    grades.find((g) => g.title.toLowerCase().includes("cambridge ordinary")) ??
    null
  );
}

async function fetchExistingPapers(token) {
  const res = await fetch(`${API_BASE}/v1/papers?page=1&limit=10000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return new Set((data.results ?? []).map((p) => p.title.toLowerCase().trim()));
}

async function createPaper(token, paper) {
  const res = await fetch(`${API_BASE}/v1/papers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(paper),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create paper failed: ${JSON.stringify(data)}`);
  return data;
}

// ─── Azure SAS upload ─────────────────────────────────────────────────────────

async function generateSasUrl(blobName, fileType) {
  const { createHmac } = await import("crypto");
  const now = new Date();
  const expires = new Date(now.getTime() + 60 * 60 * 1000);
  const toIso = (d) => d.toISOString().replace(/\.\d+Z$/, "Z");
  const start = toIso(now);
  const end = toIso(expires);
  const permissions = "cw";
  const signedFields = [
    permissions,
    start,
    end,
    `/blob/${AZURE_ACCOUNT}/${AZURE_CONTAINER}/${blobName}`,
    "",
    "",
    "https",
    "2024-11-04",
    "b",
    "",
    "",
    "",
    "",
    "",
    "",
    fileType,
  ];
  const sig = createHmac("sha256", Buffer.from(AZURE_KEY, "base64"))
    .update(signedFields.join("\n"), "utf8")
    .digest("base64");
  const params = new URLSearchParams({
    sp: permissions,
    st: start,
    se: end,
    spr: "https",
    sv: "2024-11-04",
    sr: "b",
    rsct: fileType,
    sig,
  });
  return `https://${AZURE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}/${blobName}?${params}`;
}

async function uploadToAzure(filePath, fileName) {
  const fileType = "application/pdf";
  const blobName = `${Date.now()}-${fileName}`;
  const sasUrl = await generateSasUrl(blobName, fileType);
  const fileBuffer = fs.readFileSync(filePath);
  const res = await fetch(sasUrl, {
    method: "PUT",
    headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": fileType },
    body: fileBuffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure upload failed (${res.status}): ${text}`);
  }
  return sasUrl.split("?")[0];
}

// ─── Subject matching ─────────────────────────────────────────────────────────

function normalise(str) {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

function findSubjectId(grade, subjectName) {
  const target = normalise(subjectName);
  const match = (grade.subjects ?? []).find((s) => {
    const db = normalise(s.title);
    return db === target || db.includes(target) || target.includes(db);
  });
  return match?.id ?? null;
}

function shouldUploadYear(year) {
  const numericYear = Number(year);
  return Number.isInteger(numericYear) && numericYear >= MIN_YEAR;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Cambridge O/L Paper Uploader ===\n");

  if (!AZURE_KEY) {
    console.error("AZURE_STORAGE_KEY env variable is not set.");
    console.error(
      "Run: $env:AZURE_STORAGE_KEY='your-key' ; node scripts/upload-cambridge-ol-papers.mjs",
    );
    process.exit(1);
  }

  const email = process.argv[2] ?? (await prompt("Admin email: "));
  const password = process.argv[3] ?? (await prompt("Admin password: "));

  console.log("\n🔐 Logging in...");
  const token = await login(email, password);
  console.log("✓ Logged in\n");

  console.log("🎓 Fetching Cambridge Ordinary Level grade...");
  const grade = await fetchGrade(token);
  if (!grade)
    throw new Error(
      `Grade "${GRADE_TITLE}" not found. Run add-cambridge-ol-subjects.mjs first.`,
    );
  console.log(
    `   Found: ${grade.title} (${(grade.subjects ?? []).length} subjects)\n`,
  );

  console.log("📋 Fetching existing papers (dedup check)...");
  const existingTitles = await fetchExistingPapers(token);
  console.log(`   ${existingTitles.size} papers already in DB\n`);

  // Find all subject folders with a manifest.json
  const subjectFolders = fs.readdirSync(PAPERS_DIR).filter((name) => {
    const manifestPath = path.join(PAPERS_DIR, name, "manifest.json");
    return (
      fs.statSync(path.join(PAPERS_DIR, name)).isDirectory() &&
      fs.existsSync(manifestPath)
    );
  });

  if (subjectFolders.length === 0) {
    console.log(
      "No manifest.json files found. Run scrape-cambridge-ol-papers.mjs first.",
    );
    return;
  }

  console.log(`Found ${subjectFolders.length} subject folder(s)\n`);

  let successCount = 0,
    skipCount = 0,
    errorCount = 0;
  const uploadedThisRun = new Set();

  for (const folderName of subjectFolders) {
    const subjectDir = path.join(PAPERS_DIR, folderName);
    const manifestPath = path.join(subjectDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    console.log(`\n📚 ${folderName} (${manifest.length} papers)`);

    const subjectId = findSubjectId(grade, folderName);
    if (!subjectId) {
      const available =
        (grade.subjects ?? []).map((s) => s.title).join(", ") || "none";
      console.log(
        `   ⚠ SKIP — subject "${folderName}" not found in grade. Available: ${available}`,
      );
      console.log(
        `   → Run add-cambridge-ol-subjects.mjs first to add missing subjects.`,
      );
      skipCount += manifest.length;
      continue;
    }

    for (const entry of manifest) {
      const { filename, title, year } = entry;
      const titleKey = title.toLowerCase().trim();

      if (!shouldUploadYear(year)) {
        process.stdout.write(`   ⏩ SKIP (before ${MIN_YEAR}): ${title}\n`);
        skipCount++;
        continue;
      }

      if (existingTitles.has(titleKey) || uploadedThisRun.has(titleKey)) {
        process.stdout.write(`   ⏩ SKIP (exists): ${title}\n`);
        skipCount++;
        continue;
      }

      const filePath = path.join(subjectDir, filename);
      if (!fs.existsSync(filePath)) {
        console.log(`   ✗ SKIP (file missing): ${filename}`);
        skipCount++;
        continue;
      }

      process.stdout.write(`   ↑ ${title} ... `);
      try {
        const publicUrl = await uploadToAzure(filePath, filename);
        await createPaper(token, {
          title,
          medium: MEDIUM,
          subject: subjectId,
          grade: grade.id,
          year,
          url: publicUrl,
        });
        console.log("✓");
        uploadedThisRun.add(titleKey);
        successCount++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log("\n=== Done ===");
  console.log(`  ✓ Uploaded : ${successCount}`);
  console.log(`  ⚠ Skipped  : ${skipCount}`);
  console.log(`  ✗ Errors   : ${errorCount}`);
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
