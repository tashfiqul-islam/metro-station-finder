#!/usr/bin/env node
/**
 * Auto-generates adrs/README.md as an index of ADRs.
 * Pure Node (>=18). No deps.
 *
 * Usage:
 *   node scripts/update-adr-index.mjs
 *
 * Behavior:
 * - Scans ./adrs for files named NNNN-*.md (excludes README.md)
 * - Extracts: ID (from filename), Title (# H1 or from filename), Date, Status, Supersedes, Superseded by
 * - Sorts by ID ascending
 * - Writes a tidy README.md with an index table + conventions + workflow
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADR_DIR = path.resolve(__dirname, "../adrs");
const README_PATH = path.join(ADR_DIR, "README.md");

const ADR_FILE_RE = /^(\d{4})-(.+)\.md$/i;

// Regex patterns for metadata extraction
const H1_TITLE_RE = /^#\s+(.+?)\s*$/m;
const DATE_TABLE_RE = /^\s*\|?\s*Date\s*\|?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*\|?/im;
const DATE_COLON_RE = /^\s*Date\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/im;
const STATUS_TABLE_RE = /^\s*\|?\s*Status\s*\|?\s*([A-Za-z]+)\s*\|?/im;
const STATUS_COLON_RE = /^\s*Status\s*:\s*([A-Za-z]+)/im;
const SUPERSEDES_RE = /^\s*\|?\s*Supersedes\s*\|?\s*(.+?)\s*\|?$/im;
const SUPERSEDED_BY_RE = /^\s*\|?\s*Superseded by\s*\|?\s*(.+?)\s*\|?$/im;
const DASH_CLEANUP_RE = /^-+$/g;

async function safeRead(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function titleCaseFromSlug(slug) {
  return slug
    .split("-")
    .map((x) => (x ? x[0].toUpperCase() + x.slice(1) : x))
    .join(" ");
}

function extractMetadata(md) {
  // Try to pull metadata from common patterns used in our ADRs.
  // 1) H1 title
  const h1 = md.match(H1_TITLE_RE)?.[1]?.trim();

  // 2) Table-style metadata rows
  const date = md.match(DATE_TABLE_RE)?.[1] || md.match(DATE_COLON_RE)?.[1] || "";

  const status = md.match(STATUS_TABLE_RE)?.[1] || md.match(STATUS_COLON_RE)?.[1] || "";

  const supersedes = md.match(SUPERSEDES_RE)?.[1]?.replace(DASH_CLEANUP_RE, "").trim() || "";

  const supersededBy = md.match(SUPERSEDED_BY_RE)?.[1]?.replace(DASH_CLEANUP_RE, "").trim() || "";

  return { h1, date, status, supersedes, supersededBy };
}

function renderReadme(rows) {
  const indexTable = [
    "| ADR ID | Title | Date | Status | Supersedes | Superseded by |",
    "|--------|-------|------|--------|------------|----------------|",
    ...rows.map((r) => {
      const idLink = `[${r.id}](./${r.filename})`;
      const titleLink = `[${r.title}](./${r.filename})`;
      const sup = r.supersedes || "–";
      const supBy = r.supersededBy || "–";
      return `| ${idLink} | ${titleLink} | ${r.date || "—"} | ${r.status || "Accepted"} | ${sup} | ${supBy} |`;
    }),
  ].join("\n");

  // README content (kept aligned with the one we provided earlier)
  return `# Architecture Decision Records (ADRs)

This directory contains decision logs for the **Metro Station Finder** project.  
Each ADR documents a single architectural or product decision, the context, and the consequences.

---

## Index

${indexTable}

---

## Conventions

- **Date**: ISO format (\`YYYY-MM-DD\`) of decision acceptance.  
- **Status**: \`Proposed\`, \`Accepted\`, \`Superseded\`, or \`Rejected\`.  
- **Links**: Each ADR is a markdown file in this folder.  
- **Supersedes / Superseded by**: Used when one ADR replaces or updates another.  

---

## Workflow

1. Create a new ADR file: \`adrs/NNNN-title.md\`  
   - Increment \`NNNN\` sequentially.  
   - Use lowercase-kebab-case for title.  

2. Run the index generator:
   - \`npm run adr:index\` (or run via CI)  

3. Status lifecycle:
   - \`Proposed\` → pending review.  
   - \`Accepted\` → merged and binding.  
   - \`Superseded\` → replaced by a newer ADR.  
   - \`Rejected\` → considered but declined.  

---

## References

- Michael Nygard: Documenting Architecture Decisions  
- adr-tools (format inspiration)  
- ThoughtWorks: Lightweight ADRs in practice  
`;
}

async function main() {
  const entries = await readdir(ADR_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.toLowerCase() !== "readme.md")
    .filter((name) => ADR_FILE_RE.test(name));

  const rows = [];

  for (const filename of files) {
    const match = filename.match(ADR_FILE_RE);
    if (!match) {
      continue;
    }
    const id = match[1];
    const slug = match[2];

    const fullPath = path.join(ADR_DIR, filename);
    const md = await safeRead(fullPath);

    const { h1, date, status, supersedes, supersededBy } = extractMetadata(md);
    const title = (h1 || titleCaseFromSlug(slug)).trim();

    rows.push({
      id,
      filename,
      title,
      date,
      status,
      supersedes,
      supersededBy,
    });
  }

  rows.sort((a, b) => Number(a.id) - Number(b.id));

  const out = renderReadme(rows);
  await writeFile(README_PATH, out, "utf8");

  console.log(`ADR index updated: ${path.relative(process.cwd(), README_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
