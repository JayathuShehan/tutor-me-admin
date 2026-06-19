/**
 * Edexcel A/L Past Paper Scraper (platinumacademy.lk)
 * Downloads 2020+ past papers for Edexcel International A Level subjects.
 *
 * Output folder structure:
 *   D:/Download/Edexcel-AL-Papers/{SubjectName}/
 *     {filename}.pdf
 *     manifest.json
 *
 * Usage:
 *   node scripts/scrape-edexcel-al-papers.mjs
 *   node scripts/scrape-edexcel-al-papers.mjs Economics
 */

import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const OUTPUT_DIR = process.env.PAPERS_DIR ?? "D:/Download/Edexcel-AL-Papers";
const DELAY_MS = 1200;
const MIN_YEAR = Number(process.env.EDEXCEL_AL_MIN_YEAR ?? 2020);

const SUBJECTS = [
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-al-accounting/",
    systemName: "Accounting",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-al-biology/",
    systemName: "Biology",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-al-business-studies/",
    systemName: "Business Studies",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-al-chemistry/",
    systemName: "Chemistry",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-al-economics/",
    systemName: "Economics",
  },
  {
    url: "https://platinumacademy.lk/past-papers-edexcel-al-physics/",
    systemName: "Physics",
  },
];

const requestedSubjects = process.argv
  .slice(2)
  .map((s) => s.toLowerCase().trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// ─── Network ──────────────────────────────────────────────────────────────────

async function fetchHtml(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt < 4) {
      await sleep(attempt * 3000);
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

// ─── Content-hash dedup ───────────────────────────────────────────────────────

function computeFileHash(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function buildGlobalHashSet(outputDir) {
  const globalHashes = new Map();
  if (!fs.existsSync(outputDir)) return globalHashes;
  for (const name of fs.readdirSync(outputDir)) {
    const subjectDir = path.join(outputDir, name);
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
        const fp = path.join(subjectDir, entry.filename);
        if (fs.existsSync(fp)) {
          entry.hash = computeFileHash(fp);
          dirty = true;
        }
      }
      if (entry.hash && !globalHashes.has(entry.hash)) {
        globalHashes.set(entry.hash, {
          subject: name,
          filename: entry.filename,
        });
      }
    }
    if (dirty)
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  }
  return globalHashes;
}

// ─── HTML section parsing ─────────────────────────────────────────────────────

function extractSections(html) {
  const sections = [];
  const headingRe = /<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi;
  const headings = [];
  let match;

  while ((match = headingRe.exec(html)) !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (
      /20\d{2}/.test(text) ||
      /\b(jan(?:uary)?|feb(?:ruary)?|may|june?|oct(?:ober)?|nov(?:ember)?)\b/i.test(
        text,
      )
    ) {
      headings.push({
        text,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  for (let i = 0; i < headings.length; i++) {
    const from = headings[i].end;
    const to = i + 1 < headings.length ? headings[i + 1].start : html.length;
    const chunk = html.substring(from, to);
    const linkRe = /<a[^>]+href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links = [];
    while ((match = linkRe.exec(chunk)) !== null) {
      links.push({
        pdfUrl: match[1],
        label: match[2]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
    if (links.length > 0) sections.push({ heading: headings[i].text, links });
  }

  // Fallback: all PDF links on the page when no section headings are found
  if (sections.length === 0) {
    const linkRe = /<a[^>]+href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links = [];
    while ((match = linkRe.exec(html)) !== null) {
      links.push({
        pdfUrl: match[1],
        label: match[2]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
    if (links.length > 0) sections.push({ heading: "", links });
  }

  return sections;
}

function parseHeading(heading) {
  const yearM = heading.match(/\b(20\d{2})\b/);
  const year = yearM ? yearM[1] : null;
  const lower = heading.toLowerCase();
  let session = null;
  if (/\b(may|june?)\b/.test(lower)) session = "May Jun";
  else if (/\b(jan(?:uary)?|feb(?:ruary)?)\b/.test(lower)) session = "Jan Feb";
  else if (/\b(oct(?:ober)?|nov(?:ember)?)\b/.test(lower)) session = "Oct Nov";
  return year || session ? { year, session } : null;
}

// ─── Filename parsing ─────────────────────────────────────────────────────────

function expandYear(s) {
  const n = parseInt(s, 10);
  return String(n < 100 ? (n < 50 ? 2000 + n : 1900 + n) : n);
}

// month → broad session (QP month and MS release month both handled)
function monthToSession(month) {
  if (month <= 4) return "Jan Feb";
  if (month <= 9) return "May Jun"; // includes Aug/Sep MS release for May/Jun exam
  return "Oct Nov";
}

/**
 * Returns { unit, type, isPaper?,
 *           explicitYear?, explicitSession?,   // from OCT/MAY/JAN keywords
 *           dateYear?, derivedSession? }        // from 8-digit date
 * Returns null for pef/SB files or unrecognised patterns.
 */
function parseFilenameInfo(filename) {
  const base = path.basename(filename, ".pdf");

  // ── IAL code format (both cases, both separators) ──────────────────────────
  // wec11-01-que-20230510  wbi14-01-rms-20230302  WBS11_01_que_20200305
  // WBI14_01_que_20230111-1  wac12-01-rms-20230817
  const ialM = base.match(
    /^[a-z]{2,4}(\d)(\d)[-_]\d{2}[-_](que|rms|msc|pef)[-_](\d{8})/i,
  );
  if (ialM) {
    const rawType = ialM[3].toLowerCase();
    if (rawType === "pef") return null;
    const type = rawType === "que" ? "QP" : "MS";
    const dateStr = ialM[4];
    const year = dateStr.slice(0, 4);
    const month = parseInt(dateStr.slice(4, 6), 10);
    return {
      unit: ialM[2],
      type,
      dateYear: year,
      derivedSession: monthToSession(month),
    };
  }

  // ── OCT with explicit year ──────────────────────────────────────────────────
  // OCT-2022-UNIT-1-QP-2  OCT-21-UNIT-3-MS  OCT-2022-UNIT-1-QP
  const octYearM = base.match(/^OCT[-_](\d{2,4})[-_]UNIT[-_](\d+)[-_](QP|MS)/i);
  if (octYearM) {
    return {
      unit: octYearM[2],
      type: octYearM[3].toUpperCase(),
      explicitYear: expandYear(octYearM[1]),
      explicitSession: "Oct Nov",
    };
  }

  // ── OCT without year (year comes from HTML section) ─────────────────────────
  // OCT-UNIT-1-QP-1
  const octNoYearM = base.match(/^OCT[-_]UNIT[-_](\d+)[-_](QP|MS)/i);
  if (octNoYearM) {
    return {
      unit: octNoYearM[1],
      type: octNoYearM[2].toUpperCase(),
      explicitSession: "Oct Nov",
    };
  }

  // ── MAY named ───────────────────────────────────────────────────────────────
  // May-22-U1-QP  MAY-21-U5-MS  MAY-22-U3-QP
  const mayM = base.match(/^MAY?[-_](\d{2,4})[-_]U(\d+)[-_](QP|MS|SB)/i);
  if (mayM) {
    if (mayM[3].toUpperCase() === "SB") return null; // skip study booklets
    return {
      unit: mayM[2],
      type: mayM[3].toUpperCase(),
      explicitYear: expandYear(mayM[1]),
      explicitSession: "May Jun",
    };
  }

  // ── JAN named with 4-digit year ─────────────────────────────────────────────
  // JAN-2022-ECO-UNIT-1-QP  JAN-2022-BIO-U1-QP  JAN-2021-BUSINESS-U1-QP
  // JAN-2022-ACC-UNIT-1-QP  JAN-2022-BUS-UNIT-1-QP
  const janFullM = base.match(
    /^JAN(?:[-_]FEB)?[-_](\d{4})[-_][A-Z]+[-_]U(?:NIT[-_])?(\d+)[-_](QP|MS)/i,
  );
  if (janFullM) {
    return {
      unit: janFullM[2],
      type: janFullM[3].toUpperCase(),
      explicitYear: janFullM[1],
      explicitSession: "Jan Feb",
    };
  }

  // ── JAN named with 2-digit year ─────────────────────────────────────────────
  // Jan-21-U1-QP-1  Jan-Feb-21-U1-MS  Jan-21-U4-QP
  const janShortM = base.match(
    /^Jan(?:[-_]Feb)?[-_](\d{2})[-_]U(\d+)[-_](QP|MS)/i,
  );
  if (janShortM) {
    return {
      unit: janShortM[2],
      type: janShortM[3].toUpperCase(),
      explicitYear: expandYear(janShortM[1]),
      explicitSession: "Jan Feb",
    };
  }

  // ── IAL named (no year in filename; relies on HTML section) ─────────────────
  // IAL-Chemistry-Unit-1-Question-Paper  IAL-Physics-Unit-3-Marking-Scheme-1
  const ialNamedM = base.match(
    /^IAL-\w+[-_]Unit[-_](\d+)[-_](Question[-_]Paper|Marking[-_]Scheme)(?:[-_]\d+)?$/i,
  );
  if (ialNamedM) {
    const type = /marking/i.test(ialNamedM[2]) ? "MS" : "QP";
    return { unit: ialNamedM[1], type }; // year / session must come from HTML section
  }

  // ── IGCSE 4XX format (mostly pre-2020; included for 2020 papers) ─────────────
  // 4BI1_1B_que_20200305  4CH1_1C_rms_20190520
  const igcseM = base.match(
    /^4[A-Z]{2}[01]_([0-9][A-Z]{1,2}R?)_(que|rms|msc|pef)_(\d{8})/i,
  );
  if (igcseM) {
    const rawType = igcseM[2].toLowerCase();
    if (rawType === "pef") return null;
    const type = rawType === "que" ? "QP" : "MS";
    const dateStr = igcseM[3];
    const year = dateStr.slice(0, 4);
    const month = parseInt(dateStr.slice(4, 6), 10);
    return {
      unit: igcseM[1],
      type,
      dateYear: year,
      derivedSession: monthToSession(month),
      isPaper: true,
    };
  }

  return null;
}

// ─── Title / filename builders ────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTypeForFilename(type) {
  return type === "MS" ? "mark-scheme" : "question-paper";
}

function buildTitle(subjectName, year, session, unit, type, isPaper) {
  const docType = type === "MS" ? "Mark Scheme" : "Question Paper";
  const unitLabel = isPaper ? `Paper ${unit}` : `Unit ${unit}`;
  const sessionStr = session ? ` ${session}` : "";
  return `Edexcel A Level ${subjectName} ${year}${sessionStr} ${unitLabel} ${docType}`;
}

function buildLocalFilename(subjectName, year, session, unit, type) {
  const sessionSlug = session ? `-${slugify(session)}` : "";
  return `edexcel-al-${slugify(subjectName)}-${year}${sessionSlug}-unit-${slugify(String(unit))}-${formatTypeForFilename(type)}.pdf`;
}

function makeUniqueFilename(filename, usedNames) {
  if (!usedNames.has(filename)) return filename;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let i = 2;
  let candidate = `${base}-${i}${ext}`;
  while (usedNames.has(candidate)) {
    i++;
    candidate = `${base}-${i}${ext}`;
  }
  return candidate;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Edexcel A/L Paper Scraper (platinumacademy.lk) ===");
  console.log(`Output : ${OUTPUT_DIR}`);
  console.log(`Min year: ${MIN_YEAR}\n`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

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
      console.log("   No PDF links found");
      continue;
    }

    const subjectDir = path.join(OUTPUT_DIR, systemName);
    fs.mkdirSync(subjectDir, { recursive: true });

    const manifestPath = path.join(subjectDir, "manifest.json");
    const manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      : [];
    const existingUrls = new Set(manifest.map((e) => e.sourceUrl));
    const usedFilenames = new Set(manifest.map((e) => e.filename));
    let newEntries = 0;

    for (const { heading, links } of sections) {
      const sectionMeta = parseHeading(heading);

      for (const { pdfUrl } of links) {
        if (existingUrls.has(pdfUrl)) {
          totalSkipped++;
          continue;
        }

        const urlFilename = path.basename(new URL(pdfUrl).pathname);
        const fileInfo = parseFilenameInfo(urlFilename);

        if (!fileInfo) {
          // pef / SB / unrecognised → skip silently
          totalSkipped++;
          continue;
        }

        const { unit, type, isPaper } = fileInfo;

        // Year priority: explicit keyword > HTML section > filename date
        const year =
          fileInfo.explicitYear ??
          sectionMeta?.year ??
          fileInfo.dateYear ??
          "0";
        // Session priority: explicit keyword > HTML section > filename-derived
        const session =
          fileInfo.explicitSession ??
          sectionMeta?.session ??
          fileInfo.derivedSession ??
          null;

        if (!unit || !type) {
          totalSkipped++;
          continue;
        }

        const numericYear = Number(year);
        if (!Number.isInteger(numericYear) || numericYear < MIN_YEAR) {
          totalSkipped++;
          continue;
        }

        const title = buildTitle(
          systemName,
          year,
          session,
          unit,
          type,
          isPaper,
        );
        const baseFilename = buildLocalFilename(
          systemName,
          year,
          session,
          unit,
          type,
        );
        const localFilename = makeUniqueFilename(baseFilename, usedFilenames);
        const localPath = path.join(subjectDir, localFilename);

        if (fs.existsSync(localPath)) {
          manifest.push({
            filename: localFilename,
            title,
            subject: systemName,
            session,
            year,
            unit,
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
              unit,
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
    "\nNext step: node scripts/add-edexcel-al-subjects.mjs <email> <password>",
  );
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
