/**
 * Cambridge A/L Past Paper Scraper (platinumacademy.lk)
 * Downloads 2020+ past papers for available Cambridge A Level subjects.
 *
 * Output folder structure:
 *   D:/Download/Cambridge-AL-Papers/{SubjectName}/
 *     {filename}.pdf
 *     manifest.json
 *
 * Usage:
 *   node scripts/scrape-cambridge-al-papers.mjs
 *   node scripts/scrape-cambridge-al-papers.mjs Physics
 */

import fs from "fs";
import path from "path";

const OUTPUT_DIR = process.env.PAPERS_DIR ?? "D:/Download/Cambridge-AL-Papers";
const DELAY_MS = 1500;
const MIN_YEAR = Number(process.env.CAMBRIDGE_AL_MIN_YEAR ?? 2020);

const SUBJECTS = [
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-accounting/",
    systemName: "Accounting",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-biology/",
    systemName: "Biology",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-business-studies/",
    systemName: "Business Studies",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-chemistry/",
    systemName: "Chemistry",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-computer-science/",
    systemName: "Computer Science",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-economics/",
    systemName: "Economics",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-english/",
    systemName: "English Language",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-maths/",
    systemName: "Mathematics",
  },
  {
    url: "https://platinumacademy.lk/past-papers-cambridge-al-physics/",
    systemName: "Physics",
  },
];

const requestedSubjects = process.argv
  .slice(2)
  .map((subject) => subject.toLowerCase().trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html"))
      throw new Error("Response was HTML, not PDF");
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    return true;
  } catch (err) {
    if (attempt < 4) {
      await sleep(attempt * 3000);
      return downloadBinary(url, destPath, attempt + 1);
    }
    throw err;
  }
}

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
    if (/cambridge/i.test(text)) {
      headings.push({ text, end: match.index + match[0].length });
    }
  }

  for (let index = 0; index < headings.length; index++) {
    const from = headings[index].end;
    const to =
      index + 1 < headings.length ? headings[index + 1].end : html.length;
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

    if (links.length > 0)
      sections.push({ heading: headings[index].text, links });
  }

  return sections;
}

function parseHeading(heading) {
  const sessionMatch = heading.match(
    /\b(Feb\s+Mar|May\s+Jun(?:e)?|Oct\s+Nov)\s+(\d{4})\b/i,
  );
  if (sessionMatch) {
    const sessionName = sessionMatch[1].replace(/\s+/g, " ");
    const session = /^may\s+june$/i.test(sessionName) ? "May Jun" : sessionName;
    return { session: `${session} ${sessionMatch[2]}`, year: sessionMatch[2] };
  }

  const yearMatch = heading.match(/\b(20\d{2}|19\d{2})\b/);
  return yearMatch ? { session: yearMatch[1], year: yearMatch[1] } : null;
}

function parseFilenameCode(filename) {
  const base = path.basename(filename, ".pdf");
  const match = base.match(/^[a-z0-9]+_([smw])(\d{2})_(qp|ms)_(\d+)/i);
  if (!match) {
    const unitMatch = base.match(/^Unit-(\d+)-(\d+)-(QP|MS)$/i);
    if (!unitMatch) return null;
    return {
      year: null,
      session: null,
      type: unitMatch[3].toUpperCase(),
      paper: `${unitMatch[1]}${unitMatch[2]}`,
    };
  }

  const season = match[1].toLowerCase();
  const year2 = Number(match[2]);
  const fullYear = year2 >= 90 ? 1900 + year2 : 2000 + year2;
  const sessionBySeason = {
    m: `Feb Mar ${fullYear}`,
    s: `May Jun ${fullYear}`,
    w: `Oct Nov ${fullYear}`,
  };

  return {
    year: String(fullYear),
    session: sessionBySeason[season],
    type: match[3].toUpperCase(),
    paper: match[4],
  };
}

function parseLabelInfo(label) {
  const paperMatch = label.match(/\b(?:Paper\s+)?(\d+(?:-\d+)?)\b/);
  const typeMatch = label.match(
    /\b(QP|MS|Question\s+Paper|Mark(?:ing)?\s+Scheme|Mark\s+Sheet)\b/i,
  );
  if (!paperMatch && !typeMatch) return null;

  return {
    paper: paperMatch?.[1]?.replace("-", "") ?? null,
    type: typeMatch && /^(MS|Mark)/i.test(typeMatch[1]) ? "MS" : "QP",
  };
}

function formatTypeForFilename(type) {
  return type === "MS" ? "mark-sheet" : "question-paper";
}

function buildTitle(subjectName, session, paper, type) {
  const documentType = type === "MS" ? "Mark Sheet" : "Question Paper";
  return `Cambridge A Level ${subjectName} ${session} Paper ${paper} ${documentType}`;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shouldIncludeYear(year) {
  const numericYear = Number(year);
  return Number.isInteger(numericYear) && numericYear >= MIN_YEAR;
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

async function main() {
  console.log("=== Cambridge A/L Paper Scraper (platinumacademy.lk) ===");
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Year limit: ${MIN_YEAR} and newer\n`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const { url, systemName } of subjectsToScrape) {
    console.log(`\n${systemName}`);
    console.log(`   ${url}`);

    let html;
    try {
      html = await fetchHtml(url);
      await sleep(DELAY_MS);
    } catch (err) {
      console.log(`   Failed to fetch page: ${err.message}`);
      totalErrors++;
      continue;
    }

    const sections = extractSections(html);
    if (sections.length === 0) {
      console.log("   No paper sections found");
      totalSkipped++;
      continue;
    }

    const subjectDir = path.join(OUTPUT_DIR, systemName);
    fs.mkdirSync(subjectDir, { recursive: true });

    const manifestPath = path.join(subjectDir, "manifest.json");
    const manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      : [];
    const existingUrls = new Set(manifest.map((entry) => entry.sourceUrl));
    const usedFilenames = new Set(manifest.map((entry) => entry.filename));
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

        const session =
          filenameMeta?.session ?? headingMeta?.session ?? "Unknown";
        const year = filenameMeta?.year ?? headingMeta?.year ?? "0000";
        const paper = filenameMeta?.paper ?? labelMeta?.paper ?? "0";
        const type = filenameMeta?.type ?? labelMeta?.type ?? "QP";

        if (!shouldIncludeYear(year)) {
          totalSkipped++;
          continue;
        }

        const baseFilename = `cambridge-al-${slugify(systemName)}-${slugify(session)}-paper-${paper}-${formatTypeForFilename(type)}.pdf`;
        const localFilename = makeUniqueFilename(baseFilename, usedFilenames);
        const localPath = path.join(subjectDir, localFilename);
        const title = buildTitle(systemName, session, paper, type);

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

        process.stdout.write(`   Downloading ${title} ... `);
        try {
          await downloadBinary(pdfUrl, localPath);
          console.log("done");
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
          console.log(`failed: ${err.message}`);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          totalErrors++;
        }

        await sleep(DELAY_MS);
      }
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`   ${newEntries} entries in manifest`);
  }

  console.log("\n=== Done ===");
  console.log(`Downloaded: ${totalDownloaded}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(
    "\nNext step: node scripts/add-cambridge-al-subjects.mjs <email> <password>",
  );
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
