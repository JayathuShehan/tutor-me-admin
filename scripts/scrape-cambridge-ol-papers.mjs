/**
 * Cambridge O/L Past Paper Scraper (platinumacademy.lk)
 * Downloads past papers for all available Cambridge O Level subjects.
 *
 * Output folder structure:
 *   D:/Download/Cambridge-OL-Papers/{SubjectName}/
 *     {filename}.pdf
 *     manifest.json   ← metadata used by upload-cambridge-ol-papers.mjs
 *
 * Usage: node scripts/scrape-cambridge-ol-papers.mjs
 */

import fs from "fs";
import path from "path";

// ─── Config ───────────────────────────────────────────────────────────────────

const OUTPUT_DIR = process.env.PAPERS_DIR ?? "D:/Download/Cambridge-OL-Papers";
const DELAY_MS = 1500;
const MIN_YEAR = 2020;

// Subject pages available on platinumacademy.lk → mapped to our system subject name
const SUBJECTS = [
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-accounting",
    systemName: "Accounting",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-biology",
    systemName: "Biology",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-business-studies/",
    systemName: "Business Studies",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-chemistry",
    systemName: "Chemistry",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-commerce/",
    systemName: "Commerce",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-computer-science",
    systemName: "Computer Science",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-economics/",
    systemName: "Economics",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-english",
    systemName: "English Language",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-eng-literature",
    systemName: "Literature in English",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-geography/",
    systemName: "Geography",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-ict/",
    systemName: "ICT",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-maths/",
    systemName: "Mathematics (Syllabus D)",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-ol-physics/",
    systemName: "Physics",
  },
];

const requestedSubjects = process.argv
  .slice(2)
  .map((subject) => subject.toLowerCase().trim())
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

// ─── Parsers ──────────────────────────────────────────────────────────────────

// Extract sections (heading + PDF links) from subject page HTML
function extractSections(html) {
  const sections = [];

  // Find all headings that look like "Cambridge OL - Subject - Session"
  const headingRe = /<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi;
  const allHeadings = [];
  let m;
  while ((m = headingRe.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (/cambridge/i.test(text)) {
      allHeadings.push({ text, end: m.index + m[0].length });
    }
  }

  for (let i = 0; i < allHeadings.length; i++) {
    const from = allHeadings[i].end;
    const to =
      i + 1 < allHeadings.length
        ? allHeadings[i + 1].end - allHeadings[i + 1].text.length - 10
        : html.length;
    const chunk = html.substring(from, to);

    const linkRe = /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
    const links = [];
    while ((m = linkRe.exec(chunk)) !== null) {
      const pdfUrl = m[1];
      const label = m[2].replace(/<[^>]+>/g, "").trim();
      if (pdfUrl) links.push({ pdfUrl, label });
    }

    if (links.length > 0) {
      sections.push({ heading: allHeadings[i].text, links });
    }
  }

  return sections;
}

// "Cambridge OL - Accounting - Oct Nov 2025" → { session: "Oct Nov 2025", year: "2025" }
function parseHeading(heading) {
  // Try "- Session" at the end
  const m = heading.match(/[-–]\s*([A-Za-z]+\s+[A-Za-z]+\s+\d{4}|\d{4})$/);
  if (!m) {
    const yearOnly = heading.match(/(\d{4})/);
    return yearOnly ? { session: yearOnly[1], year: yearOnly[1] } : null;
  }
  const sessionStr = m[1].trim();
  const yearMatch = sessionStr.match(/(\d{4})/);
  return { session: sessionStr, year: yearMatch ? yearMatch[1] : null };
}

// "7707_w25_qp_12.pdf" → { session: "Oct Nov 2025", year: "2025", type: "QP", paper: "12" }
function parseFilenameCode(filename) {
  const base = path.basename(filename, ".pdf");
  const m = base.match(/^[a-z0-9]+_([ws])(\d{2})_(qp|ms)_(\d+)/i);
  if (!m) {
    const unitMatch = base.match(/^Unit-(\d+)-(\d+)-(QP|MS)$/i);
    if (!unitMatch) return null;

    return {
      year: null,
      session: null,
      type: unitMatch[3].toUpperCase(),
      paper: `${unitMatch[1]}${unitMatch[2]}`,
    };
  }

  const season = m[1].toLowerCase();
  const year2 = parseInt(m[2], 10);
  const fullYear = year2 >= 90 ? 1900 + year2 : 2000 + year2;
  return {
    year: String(fullYear),
    session: season === "w" ? `Oct Nov ${fullYear}` : `May Jun ${fullYear}`,
    type: m[3].toUpperCase(),
    paper: m[4],
  };
}

// "Paper 12 – QP" or "Paper 12 – MS" from display label
function parseLabelInfo(label) {
  const m = label.match(/Paper\s+(\d+)\s*[-–]\s*(QP|MS)/i);
  if (!m) return null;
  return { paper: m[1], type: m[2].toUpperCase() };
}

function buildTitle(subjectName, session, paper, type) {
  const documentType = type === "MS" ? "Mark Sheet" : "Question Paper";
  return `Cambridge O Level ${subjectName} ${session} Paper ${paper} ${documentType}`;
}

function formatTypeForFilename(type) {
  return type === "MS" ? "mark-sheet" : "question-paper";
}

function shouldIncludeYear(year) {
  const numericYear = Number(year);
  return Number.isInteger(numericYear) && numericYear >= MIN_YEAR;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Cambridge O/L Paper Scraper (platinumacademy.lk) ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalDownloaded = 0,
    totalSkipped = 0,
    totalErrors = 0;
  const subjectsToScrape = requestedSubjects.length
    ? SUBJECTS.filter((subject) =>
        requestedSubjects.includes(subject.systemName.toLowerCase()),
      )
    : SUBJECTS;

  if (subjectsToScrape.length === 0) {
    throw new Error(
      `No matching subjects found for: ${requestedSubjects.join(", ")}`,
    );
  }

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
      console.log("   ⚠ No sections found — page structure may have changed");
      totalSkipped++;
      continue;
    }

    const subjectDir = path.join(OUTPUT_DIR, systemName);
    fs.mkdirSync(subjectDir, { recursive: true });

    // Load existing manifest if any
    const manifestPath = path.join(subjectDir, "manifest.json");
    const manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      : [];
    const existingUrls = new Set(manifest.map((e) => e.sourceUrl));
    const usedFilenames = new Set(manifest.map((e) => e.filename));

    let newEntries = 0;

    for (const { heading, links } of sections) {
      const headingMeta = parseHeading(heading);

      for (const { pdfUrl, label } of links) {
        if (existingUrls.has(pdfUrl)) {
          totalSkipped++;
          continue;
        }

        const urlFilename = path.basename(new URL(pdfUrl).pathname);
        const filenameMeta = parseFilenameCode(urlFilename);
        const labelMeta = parseLabelInfo(label);

        // Determine session/year: prefer filename parse, fall back to heading
        const session =
          filenameMeta?.session ?? headingMeta?.session ?? "Unknown";
        const year = filenameMeta?.year ?? headingMeta?.year ?? "0000";
        const paper = filenameMeta?.paper ?? labelMeta?.paper ?? "0";
        const type = filenameMeta?.type ?? labelMeta?.type ?? "QP";

        if (!shouldIncludeYear(year)) {
          totalSkipped++;
          continue;
        }

        const baseFilename = `cambridge-ol-${slugify(systemName)}-${slugify(session)}-paper-${paper}-${formatTypeForFilename(type)}.pdf`;
        const localFilename = makeUniqueFilename(baseFilename, usedFilenames);
        const localPath = path.join(subjectDir, localFilename);
        const title = buildTitle(systemName, session, paper, type);

        // Skip if already downloaded
        if (fs.existsSync(localPath)) {
          manifest.push({
            filename: localFilename,
            title,
            subject: systemName,
            session,
            year,
            paper,
            type,
            sourceUrl: pdfUrl,
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
          console.log("✓");
          manifest.push({
            filename: localFilename,
            title,
            subject: systemName,
            session,
            year,
            paper,
            type,
            sourceUrl: pdfUrl,
          });
          existingUrls.add(pdfUrl);
          usedFilenames.add(localFilename);
          totalDownloaded++;
          newEntries++;
        } catch (err) {
          console.log(`✗ ${err.message}`);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          totalErrors++;
        }

        await sleep(DELAY_MS);
      }
    }

    // Save updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`   ✓ ${newEntries} entries in manifest`);
  }

  console.log("\n=== Done ===");
  console.log(`  ✓ Downloaded : ${totalDownloaded}`);
  console.log(`  ⚠ Skipped   : ${totalSkipped}`);
  console.log(`  ✗ Errors    : ${totalErrors}`);
  console.log(
    `\nNext step: node scripts/upload-cambridge-ol-papers.mjs <email> <password>`,
  );
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
