/**
 * Add tuition rates for Cambridge OL, Cambridge AL, Edexcel OL, Edexcel AL.
 *
 * Rate templates:
 *   Cambridge OL / Edexcel OL → same as G.C.E Advanced Level (Physical Science Stream)
 *   Cambridge AL / Edexcel AL → same as Diplomas
 *
 * Usage: node scripts/add-cambridge-edexcel-tuition-rates.mjs <email> <password>
 */

import readline from "readline";

const API_BASE =
  "https://tutorme-backend-api-d7a6cjdkgnedbxf0.southeastasia-01.azurewebsites.net";

const OL_RATES = {
  universityStudentsRate: { minimumRate: 1000, maximumRate: 2500 },
  partTimeTutorRate: { minimumRate: 1500, maximumRate: 3500 },
  fullTimeTutorRate: { minimumRate: 2000, maximumRate: 5000 },
  moeTeacherRate: { minimumRate: 2500, maximumRate: 6000 },
};

const AL_RATES = {
  universityStudentsRate: { minimumRate: 1500, maximumRate: 3000 },
  partTimeTutorRate: { minimumRate: 2000, maximumRate: 4000 },
  fullTimeTutorRate: { minimumRate: 2000, maximumRate: 6000 },
  moeTeacherRate: { minimumRate: 2500, maximumRate: 8000 },
};

const TARGET_GRADES = [
  { titleMatch: "Cambridge Ordinary Level", rates: OL_RATES },
  { titleMatch: "Edexcel Ordinary Level", rates: OL_RATES },
  { titleMatch: "Cambridge Advanced Level", rates: AL_RATES },
  { titleMatch: "Edexcel Advanced Level", rates: AL_RATES },
];

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

async function fetchAllGrades(token) {
  const res = await fetch(`${API_BASE}/v1/grades?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.results ?? [];
}

async function fetchGradeById(token, id) {
  const res = await fetch(`${API_BASE}/v1/grades/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function fetchExistingRates(token) {
  const res = await fetch(`${API_BASE}/v1/tuitionRates?page=1&limit=500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return new Set(
    (data.results ?? []).map((r) => `${r.grade?.id}|${r.subject?.id}`),
  );
}

async function createRate(token, payload) {
  const res = await fetch(`${API_BASE}/v1/tuitionRates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function main() {
  console.log("=== Add Tuition Rates: Cambridge & Edexcel ===\n");

  const email = process.argv[2] ?? (await prompt("Admin email: "));
  const password = process.argv[3] ?? (await prompt("Admin password: "));

  console.log("\nLogging in...");
  const token = await login(email, password);
  console.log("✓ Logged in\n");

  console.log("Fetching grades...");
  const grades = await fetchAllGrades(token);
  console.log(`✓ ${grades.length} grades fetched\n`);

  console.log("Fetching existing tuition rates to skip duplicates...");
  const existing = await fetchExistingRates(token);
  console.log(`✓ ${existing.size} existing rate entries\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const target of TARGET_GRADES) {
    const grade = grades.find(
      (g) =>
        g.title.toLowerCase().trim() === target.titleMatch.toLowerCase().trim(),
    );

    if (!grade) {
      console.log(`  SKIP — grade not found: "${target.titleMatch}"`);
      continue;
    }

    console.log(`\n📚 ${grade.title} (${grade.id})`);

    const gradeDetails = await fetchGradeById(token, grade.id);
    const subjects = gradeDetails.subjects ?? [];

    if (subjects.length === 0) {
      console.log("  ⚠ No subjects found for this grade.");
      continue;
    }

    for (const subject of subjects) {
      const key = `${grade.id}|${subject.id}`;
      if (existing.has(key)) {
        console.log(`  SKIP (already exists): ${subject.title}`);
        skipCount++;
        continue;
      }

      process.stdout.write(`  Creating rate for: ${subject.title} ... `);
      try {
        await createRate(token, {
          grade: grade.id,
          subject: subject.id,
          ...target.rates,
        });
        console.log("✓");
        existing.add(key);
        successCount++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log("\n=== Done ===");
  console.log(`  ✓ Created : ${successCount}`);
  console.log(`  ⚠ Skipped : ${skipCount}`);
  console.log(`  ✗ Errors  : ${errorCount}`);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
