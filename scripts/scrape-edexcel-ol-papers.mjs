/**
 * Edexcel O/L Past Paper Scraper (platinumacademy.lk)
 * Downloads 2020+ past papers for available Edexcel O Level subjects.
 *
 * Output folder structure:
 *   D:/Download/Edexcel-OL-Papers/{SubjectName}/
 *     {filename}.pdf
 *     manifest.json   ← metadata used by upload-edexcel-ol-papers.mjs
 *
 * Usage:
 *   node scripts/scrape-edexcel-ol-papers.mjs
 *   node scripts/scrape-edexcel-ol-papers.mjs Physics
 *   node scripts/scrape-edexcel-ol-papers.mjs Biology Chemistry
 */

import fs from "fs";
import path from "path";
import { createHash } from "crypto";

// ─── Config ───────────────────────────────────────────────────────────────────

const OUTPUT_DIR = process.env.PAPERS_DIR ?? "D:/Download/Edexcel-OL-Papers";
const DELAY_MS = 1500;
const MIN_YEAR = Number(process.env.EDEXCEL_OL_MIN_YEAR ?? 2020);

const SUBJECTS = [
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-accounting/",
    systemName: "Accounting",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-biology/",
    systemName: "Biology",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-business-studies/",
    systemName: "Business Studies",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-chemistry/",
    systemName: "Chemistry",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-commerce/",
    systemName: "Commerce",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-economics/",
    systemName: "Economics",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-english/",
    systemName: "English Language",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-ict/",
    systemName: "ICT",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-maths/",
    systemName: "Mathematics",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-ol-physics/",
    systemName: "Physics",
  },
];

const requestedSubjects = process.argv
  .slice(2)
  .map((s) => s.toLowerCase().trim())
  .filter(Boolean);

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchHtml(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt < 4) {
      const wait = attempt * 3000;
      console.log(`    Retrying in ${wait / 1000}s... (${err.message})`);
      await sleep(wait);
      return fetchHtml(url, attempt + 1);
    }
    throw err;
  }
}

async function downloadBinary(url, destPath, attempt = 1) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) throw new Error("Response was HTML, not PDF");
    const buf = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buf));
    return true;
  } catch (err) {
    if (attempt < 4) {
      await sleep(attempt * 3000);
      return downloadBinary(url, destPath, attempt + 1);
    }
    throw err;
  }
}

// ─── HTML parser ──────────────────────────────────────────────────────────────

// Extract sections (heading + PDF links) from a subject page.
// Headings must contain "Edexcel"; zip files and non-PDF links are ignored.
function extractSections(html) {
  const sections = [];
  const headingRe = /<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi;
  const headings = [];
  let m;

  while ((m = headingRe.exec(html)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (/edexcel/i.test(text)) {
      headings.push({ text, end: m.index + m[0].length });
    }
  }

  for (let i = 0; i < headings.length; i++) {
    const from = headings[i].end;
    const to = i + 1 < headings.length ? headings[i + 1].end : html.length;
    const chunk = html.substring(from, to);

    const linkRe = /<a[^>]+href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links = [];

    while ((m = linkRe.exec(chunk)) !== null) {
      const pdfUrl = m[1];
      const label = m[2]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (pdfUrl) links.push({ pdfUrl, label });
    }

    if (links.length > 0) {
      sections.push({ heading: headings[i].text, links });
    }
  }

  return sections;
}

// ─── Metadata parsers ─────────────────────────────────────────────────────────

// "Edexcel OL - Maths - 2020"          → { year: "2020", session: "2020" }
// "Edexcel OL - ICT - 2023 May/June"   → { year: "2023", session: "May Jun 2023" }
// "Edexcel OL - ICT - 2021 November"   → { year: "2021", session: "November 2021" }
// "Edexcel OL - ICT - Sample ..."      → null  (no year → skip section)
function parseHeading(heading) {
  const yearMatch = heading.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = yearMatch[1];

  const SESSION_MAP = [
    { re: /may\s*[/\\]?\s*june/i, name: "May Jun" },
    { re: /jan(?:uary)?\s*[/\\]?\s*feb(?:ruary)?/i, name: "Jan Feb" },
    { re: /\bnovember\b/i, name: "November" },
    { re: /\boctober\b/i, name: "October" },
    { re: /\bjanuary\b/i, name: "January" },
    { re: /\bjuly\b/i, name: "July" },
  ];

  for (const { re, name } of SESSION_MAP) {
    if (re.test(heading)) return { year, session: `${name} ${year}` };
  }

  return { year, session: year };
}

// Pattern 1 — Standard Edexcel code:  4ma1_1h_que_20200305  or  4bs1-02r-rms-20220825
// Type: que → QP, rms / msc → MS
// Paper: 1H, 01, 02R, 1P, 2P …
function parseStandardCode(base) {
  const m = base.match(
    /^[a-z0-9]{3,6}[-_]([0-9]{1,2}[a-z]?r?)[-_](que|rms|msc)[-_]/i,
  );
  if (!m) return null;
  return {
    paper: m[1].toUpperCase(),
    type: /^(rms|msc)/i.test(m[2]) ? "MS" : "QP",
  };
}

// Pattern 2 — Chemistry:  Jan-22-P1-QP  or  May-22-P1R-MS
function parseChemistryFilename(base) {
  const m = base.match(/^[a-z]+-\d{2}-p(\d+r?)-(qp|ms)$/i);
  if (!m) return null;
  return { paper: m[1].toUpperCase(), type: m[2].toUpperCase() };
}

// Pattern 3 — Biology unit:  May-June-Unit-1-1-QP-2  or  May-June-Unit-2-MS
function parseBiologyUnit(base) {
  const two = base.match(/unit[-_](\d+)[-_](\d+)[-_](qp|ms)/i);
  if (two) return { paper: `${two[1]}-${two[2]}`, type: two[3].toUpperCase() };

  const one = base.match(/unit[-_](\d+)[-_](qp|ms)/i);
  if (one) return { paper: one[1], type: one[2].toUpperCase() };

  return null;
}

// Pattern 4 — Economics / Commerce URL:  Edexcel-OL-May-June-Unit-1-QP-2
//             or  Edexcel-OL-May-Unit-1-QP-Reading  (Commerce 2022)
// Also extracts the session embedded in the filename (May-June, Jan-Feb, Oct-Nov …)
// so that multi-session years produce unique titles.
function parseEdexcelUrl(base) {
  if (!/edexcel[-_]ol/i.test(base)) return null;

  // Session is embedded in the filename itself, not just the heading
  const SESSION_PATTERNS = [
    { re: /may[-_]june/i, name: "May Jun" },
    { re: /jan[-_]feb/i, name: "Jan Feb" },
    { re: /oct[-_]nov/i, name: "Oct Nov" },
    { re: /\bmay\b(?![-_]june)/i, name: "May" },
    { re: /\bjan\b(?![-_]feb)/i, name: "Jan" },
  ];
  let filenameSession = null;
  for (const { re, name } of SESSION_PATTERNS) {
    if (re.test(base)) {
      filenameSession = name;
      break;
    }
  }

  const unitM = base.match(/unit[-_](\d+)/i);
  const typeM = base.match(/[-_](qp|ms)(?:[-_]|$)/i);
  const readingM = /[-_]reading(?:[-_]|$)/i.test(base);

  if (!unitM && !typeM) return null;

  const paper = unitM ? `Unit ${unitM[1]}${readingM ? " Reading" : ""}` : "0";

  return {
    paper,
    type: typeM ? typeM[1].toUpperCase() : "QP",
    filenameSession,
  };
}

// Tries all filename patterns in order of specificity.
// parseEdexcelUrl MUST come before parseBiologyUnit — both match "Unit-N-QP" patterns,
// but parseEdexcelUrl is narrower (requires "Edexcel-OL" prefix).
function parseFilenameMetadata(filename) {
  const base = path.basename(filename, ".pdf");
  return (
    parseStandardCode(base) ||
    parseChemistryFilename(base) ||
    parseEdexcelUrl(base) ||
    parseBiologyUnit(base) ||
    null
  );
}

// Fallback: detect QP/MS from label text
function detectTypeFromLabel(label) {
  if (/\bqp\b|\bquestion\s+paper\b/i.test(label)) return "QP";
  if (/\bms\b|\bmark(?:ing)?\s+(?:scheme|sheet)\b/i.test(label)) return "MS";
  return "QP";
}

// Fallback: extract a paper identifier from label text
function detectPaperFromLabel(label) {
  // "Paper 1H", "Paper 01"
  const paperM = label.match(/\bpaper\s+(\d+[a-z]?r?)\b/i);
  if (paperM) return paperM[1].toUpperCase();

  // "Unit 1 Reading", "Unit 2"
  const unitM = label.match(/\bunit\s+(\d+(?:\s+reading)?)\b/i);
  if (unitM) return `Unit ${unitM[1]}`;

  // "Practical"
  if (/\bpractical\b/i.test(label)) return "Practical";

  // "Theory"
  if (/\btheory\b/i.test(label)) return "Theory";

  // Bare number as last resort
  const numM = label.match(/\b(\d+[a-z]?)\b/);
  if (numM) return numM[1].toUpperCase();

  return "0";
}

// ─── Title / filename builders ────────────────────────────────────────────────

// "Unit 1" and "Practical" get no "Paper" prefix; numbered papers do.
// filenameSession (e.g. "May Jun", "Jan Feb") is included when present so that
// multi-session years produce distinct titles (e.g. Economics 2023 May Jun vs Jan Feb).
function buildTitle(subjectName, year, paper, type, filenameSession) {
  const docType = type === "MS" ? "Mark Scheme" : "Question Paper";
  const paperLabel =
    /^unit\s/i.test(paper) ||
    /^practical$/i.test(paper) ||
    /^theory$/i.test(paper)
      ? paper
      : `Paper ${paper}`;
  const sessionStr = filenameSession ? ` ${filenameSession}` : "";
  return `Edexcel O Level ${subjectName} ${year}${sessionStr} ${paperLabel} ${docType}`;
}

function formatTypeForFilename(type) {
  return type === "MS" ? "mark-scheme" : "question-paper";
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildLocalFilename(subjectName, year, paper, type, filenameSession) {
  const sessionSlug = filenameSession ? `-${slugify(filenameSession)}` : "";
  return `edexcel-ol-${slugify(subjectName)}-${year}${sessionSlug}-${slugify(paper)}-${formatTypeForFilename(type)}.pdf`;
}

function shouldIncludeYear(year) {
  const n = Number(year);
  return Number.isInteger(n) && n >= MIN_YEAR;
}

function makeUniqueFilename(filename, usedNames) {
  if (!usedNames.has(filename)) return filename;

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let index = 2;
  let candidate = `${base}-${index}${ext}`;

  while (usedNames.has(candidate)) {
    index++;
    candidate = `${base}-${index}${ext}`;
  }

  return candidate;
}

// ─── Content-hash deduplication ──────────────────────────────────────────────
// Prevents the same PDF content from being stored twice even when hosted at
// different URLs (e.g. Commerce and Economics pages sharing the same files).

function computeFileHash(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// Scan every subject folder in outputDir, load hashes from manifests (and
// compute them for entries that pre-date hash tracking).  Returns a Map of
// hash → { subject, filename } so callers can report which subject owns the file.
function buildGlobalHashSet(outputDir) {
  const globalHashes = new Map();
  if (!fs.existsSync(outputDir)) return globalHashes;

  for (const subjectName of fs.readdirSync(outputDir)) {
    const subjectDir = path.join(outputDir, subjectName);
    const manifestPath = path.join(subjectDir, "manifest.json");
    if (!fs.statSync(subjectDir).isDirectory() || !fs.existsSync(manifestPath))
      continue;

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      continue;
    }

    let dirty = false;
    for (const entry of manifest) {
      if (!entry.hash) {
        const filePath = path.join(subjectDir, entry.filename);
        if (fs.existsSync(filePath)) {
          entry.hash = computeFileHash(filePath);
          dirty = true;
        }
      }
      if (entry.hash && !globalHashes.has(entry.hash)) {
        globalHashes.set(entry.hash, {
          subject: subjectName,
          filename: entry.filename,
        });
      }
    }

    // Persist newly-computed hashes so future runs are faster
    if (dirty) {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    }
  }

  return globalHashes;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Edexcel O/L Paper Scraper (platinumacademy.lk) ===");
  console.log(`Output : ${OUTPUT_DIR}`);
  console.log(`Min year: ${MIN_YEAR}\n`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Build a cross-subject hash index so we never store the same PDF twice
  const globalHashes = buildGlobalHashSet(OUTPUT_DIR);
  console.log(
    `Content-hash index: ${globalHashes.size} unique file(s) tracked\n`,
  );

  const subjectsToScrape = requestedSubjects.length
    ? SUBJECTS.filter((s) =>
        requestedSubjects.includes(s.systemName.toLowerCase()),
      )
    : SUBJECTS;

  if (subjectsToScrape.length === 0) {
    throw new Error(
      `No matching subjects found for: ${requestedSubjects.join(", ")}`,
    );
  }

  let totalDownloaded = 0,
    totalSkipped = 0,
    totalErrors = 0;

  for (const { url, systemName } of subjectsToScrape) {
    console.log(`\n📚 ${systemName}`);
    console.log(`   ${url}`);

    let html;
    try {
      html = await fetchHtml(url);
      await sleep(DELAY_MS);
    } catch (err) {
      console.log(`   ✗ Failed to fetch page: ${err.message}`);
      totalErrors++;
      continue;
    }

    const sections = extractSections(html);
    if (sections.length === 0) {
      console.log(
        "   ⚠ No paper sections found — page structure may have changed",
      );
      totalSkipped++;
      continue;
    }

    const subjectDir = path.join(OUTPUT_DIR, systemName);
    const manifestPath = path.join(subjectDir, "manifest.json");
    fs.mkdirSync(subjectDir, { recursive: true });

    const manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      : [];
    const existingUrls = new Set(manifest.map((e) => e.sourceUrl));
    const usedFilenames = new Set(manifest.map((e) => e.filename));

    let newEntries = 0;

    for (const { heading, links } of sections) {
      const headingMeta = parseHeading(heading);

      // Skip sections without a recognisable year (e.g. "Sample Assessment Material")
      if (!headingMeta) continue;

      const { year, session } = headingMeta;

      if (!shouldIncludeYear(year)) continue;

      for (const { pdfUrl, label } of links) {
        if (existingUrls.has(pdfUrl)) {
          totalSkipped++;
          continue;
        }

        const urlFilename = path.basename(new URL(pdfUrl).pathname);
        const filenameMeta = parseFilenameMetadata(urlFilename);

        const paper = filenameMeta?.paper ?? detectPaperFromLabel(label);
        const type = filenameMeta?.type ?? detectTypeFromLabel(label);
        const filenameSession = filenameMeta?.filenameSession ?? null;

        // Skip entries that couldn't produce meaningful metadata
        if (!paper || paper === "0") {
          console.log(`   ⚠ Skipping (no paper id): ${urlFilename}`);
          totalSkipped++;
          continue;
        }

        const baseFilename = buildLocalFilename(
          systemName,
          year,
          paper,
          type,
          filenameSession,
        );
        const localFilename = makeUniqueFilename(baseFilename, usedFilenames);
        const localPath = path.join(subjectDir, localFilename);
        const title = buildTitle(
          systemName,
          year,
          paper,
          type,
          filenameSession,
        );

        // Already downloaded; register in manifest if not a duplicate
        if (fs.existsSync(localPath)) {
          const hash = computeFileHash(localPath);
          const dupe = globalHashes.get(hash);
          if (dupe && dupe.subject !== systemName) {
            console.log(
              `   ⚠ SKIP (same content as ${dupe.subject}/${dupe.filename}): ${title}`,
            );
            fs.unlinkSync(localPath);
            totalSkipped++;
            continue;
          }
          if (!globalHashes.has(hash))
            globalHashes.set(hash, {
              subject: systemName,
              filename: localFilename,
            });
          manifest.push({
            filename: localFilename,
            title,
            subject: systemName,
            session,
            year,
            paper,
            type,
            sourceUrl: pdfUrl,
            hash,
          });
          existingUrls.add(pdfUrl);
          usedFilenames.add(localFilename);
          totalSkipped++;
          newEntries++;
          continue;
        }

        process.stdout.write(`   ↓ ${title} ... `);
        try {
          await downloadBinary(pdfUrl, localPath);
          const hash = computeFileHash(localPath);
          const dupe = globalHashes.get(hash);
          if (dupe) {
            console.log(
              `⚠ SKIP (same content as ${dupe.subject}/${dupe.filename})`,
            );
            fs.unlinkSync(localPath);
            totalSkipped++;
          } else {
            console.log("✓");
            globalHashes.set(hash, {
              subject: systemName,
              filename: localFilename,
            });
            manifest.push({
              filename: localFilename,
              title,
              subject: systemName,
              session,
              year,
              paper,
              type,
              sourceUrl: pdfUrl,
              hash,
            });
            existingUrls.add(pdfUrl);
            usedFilenames.add(localFilename);
            totalDownloaded++;
            newEntries++;
          }
        } catch (err) {
          console.log(`✗ ${err.message}`);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          totalErrors++;
        }

        await sleep(DELAY_MS);
      }
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`   ✓ ${newEntries} entries in manifest`);
  }

  console.log("\n=== Done ===");
  console.log(`  ✓ Downloaded : ${totalDownloaded}`);
  console.log(`  ⚠ Skipped   : ${totalSkipped}`);
  console.log(`  ✗ Errors    : ${totalErrors}`);
  console.log(
    `\nNext step: node scripts/add-edexcel-ol-subjects.mjs <email> <password>`,
  );
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
