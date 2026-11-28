#!/usr/bin/env node

/**
 * scripts/fix_unwrapped_text_math.mjs
 *
 * Cleans plain-English strings that were accidentally wrapped in `$ ... $` math delimiters
 * without `\text{...}` (which causes KaTeX to render them in italic math font with spaces removed,
 * e.g., `"$Discrete variable$"` -> `"Discrete variable"`).
 *
 * Usage:
 *   ./scripts/fix_unwrapped_text_math.mjs <course_id> <topic_number> [--dry-run | --apply]
 *
 * Examples:
 *   ./scripts/fix_unwrapped_text_math.mjs ib_math_aa_sl 4 --dry-run
 *   ./scripts/fix_unwrapped_text_math.mjs ib_math_aa_sl 4 --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Determines whether a span of text inside `$ ... $` is plain English rather than LaTeX math.
 * Criteria:
 *  1. Contains at least one whitespace character (`\s`) and alphabetic words (`[A-Za-z]{2,}`)
 *  2. Contains NO LaTeX backslashes (`\`), math operators (`=`, `+`, `-`, `*`, `/`, `^`, `_`, `<`, `>`, `\vert{}`, `{`, `}`), or digits (`0-9`).
 *     Hyphens inside words (e.g., "time-consuming", "non-response") are permitted, while minus operators are not.
 */
export function isPlainEnglishSpan(inner) {
  if (typeof inner !== 'string') return false;

  // 1. Must contain at least one whitespace character and alphabetic words of length >= 2
  if (!/\s/.test(inner) || !/[A-Za-z]{2,}/.test(inner)) {
    return false;
  }

  // 2. Must contain NO LaTeX backslashes, braces, digits, or standard math operators
  if (/[\\=+*\/^_<>{}0-9|]/.test(inner)) {
    return false;
  }

  // Hyphen check: allow English hyphenated words, but reject if used as a math minus operator
  if (inner.includes('-')) {
    if (/(?<![A-Za-z])-|-(?![A-Za-z])/.test(inner)) {
      return false;
    }
  }

  return true;
}

/**
 * Cleans unwrapped plain-English math spans within a string while leaving genuine LaTeX untouched.
 */
export function cleanUnwrappedTextMath(str) {
  if (typeof str !== 'string') return str;

  // Case 1: Entire string is wrapped in a single `$ ... $` pair
  if (/^\$[^$]+\$$/.test(str)) {
    const inner = str.slice(1, -1);
    if (isPlainEnglishSpan(inner)) {
      return inner;
    }
  }

  // Case 2: Entire string was wrapped in outer `$` or `$$` around an answer that already contained inline math
  // (e.g. `"$Exhibit A: $54.8\text{ visitors}$, Exhibit B: $57.0\text{ visitors}$$"`
  //  or `"$Regression line of $x$ against $y$$"`
  //  or `"$Mean point $(27, 40)$ plotted with line of best fit$"`)
  if (/^\$[A-Za-z]{2,}\s/.test(str)) {
    if (str.endsWith('$$')) {
      const unwrapped = str.slice(1, -1);
      return unwrapped;
    }
    if (str.endsWith('$') && !str.endsWith('\\$')) {
      const inner = str.slice(1, -1);
      if (inner.includes('$')) {
        return inner;
      }
    }
  }

  // Case 3: Embedded `$ ... $` spans within a sentence
  return str.replace(/(\\\$|\$\$[\s\S]*?\$\$|(?<!\\)\$([^$\n]+?)(?<!\\)\$)/g, (match, p1, inlineMath) => {
    if (match === '\\$' || match.startsWith('$$')) {
      return match;
    }
    const inner = inlineMath;
    if (inner && isPlainEnglishSpan(inner)) {
      return inner;
    }
    return match;
  });
}

/**
 * Scans and cleans target fields in a question object.
 * Target fields: `question_text`, `stem`, and `final_answer` (both top-level and in subparts).
 */
export function cleanQuestionObject(qData) {
  const changes = [];

  function checkField(parent, fieldName, fieldPath) {
    const val = parent[fieldName];
    if (typeof val === 'string') {
      const cleaned = cleanUnwrappedTextMath(val);
      if (cleaned !== val) {
        changes.push({
          path: fieldPath,
          before: val,
          after: cleaned,
        });
        parent[fieldName] = cleaned;
      }
    }
  }

  checkField(qData, 'question_text', 'question_text');
  checkField(qData, 'stem', 'stem');
  checkField(qData, 'final_answer', 'final_answer');

  if (Array.isArray(qData.subparts)) {
    qData.subparts.forEach((sp, idx) => {
      checkField(sp, 'question_text', `subparts[${idx}].question_text`);
      checkField(sp, 'stem', `subparts[${idx}].stem`);
      checkField(sp, 'final_answer', `subparts[${idx}].final_answer`);
    });
  }

  return changes;
}

function printUsageAndExit() {
  console.error(`
Usage:
  ./scripts/fix_unwrapped_text_math.mjs <course_id> <topic_number> [--dry-run | --apply]

Parameters:
  <course_id>     Directory name of course under public/data/ (e.g. ib_math_aa_sl)
  <topic_number>  Integer topic number to clean (e.g. 4)
  --dry-run       Preview changes without writing to disk (default)
  --apply         Write changes to question files and sync the topic bundle

Examples:
  ./scripts/fix_unwrapped_text_math.mjs ib_math_aa_sl 4 --dry-run
  ./scripts/fix_unwrapped_text_math.mjs ib_math_aa_sl 4 --apply
`);
  process.exit(1);
}

function main() {
  const rawArgs = process.argv.slice(2);
  const flags = new Set(rawArgs.filter((arg) => arg.startsWith('--')));
  const positionalArgs = rawArgs.filter((arg) => !arg.startsWith('--'));

  if (positionalArgs.length < 2) {
    console.error('❌ Error: Both <course_id> and <topic_number> are required positional arguments.');
    printUsageAndExit();
  }

  const [courseId, topicArg] = positionalArgs;
  const topicNumber = Number(topicArg);

  if (Number.isNaN(topicNumber) || !Number.isInteger(topicNumber) || topicNumber <= 0) {
    console.error(`❌ Error: <topic_number> must be a positive integer, received: "${topicArg}"`);
    printUsageAndExit();
  }

  const isApply = flags.has('--apply');
  const modeLabel = isApply ? 'APPLY' : 'DRY-RUN';

  const courseDir = path.resolve(REPO_ROOT, 'public', 'data', courseId);
  const questionsDir = path.join(courseDir, 'questions');
  const topicBundlePath = path.join(courseDir, `topic_${topicNumber}.json`);

  if (!fs.existsSync(courseDir)) {
    console.error(`❌ Course directory not found: ${courseDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(questionsDir)) {
    console.error(`❌ Questions directory not found: ${questionsDir}`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`[${modeLabel}] Cleaning unwrapped math text`);
  console.log(`Course:       ${courseId}`);
  console.log(`Topic:        ${topicNumber}`);
  console.log(`Mode:         ${isApply ? 'Apply changes to files' : 'Dry run (preview only)'}`);
  console.log(`======================================================\n`);

  // Scan standalone question files matching Topic
  const allQuestionFiles = fs.readdirSync(questionsDir);
  const topicFiles = allQuestionFiles
    .filter((f) => f.startsWith(`topic_${topicNumber}_q`) && f.endsWith('.json'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/_q(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/_q(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  if (topicFiles.length === 0) {
    console.log(`⚠️ No question files found matching topic_${topicNumber}_q*.json in ${questionsDir}`);
    process.exit(0);
  }

  console.log(`🔍 Found ${topicFiles.length} question files for Topic ${topicNumber}. Scanning...\n`);

  let totalChanges = 0;
  const modifiedFiles = [];
  const updatedQuestionsMap = new Map();

  for (const filename of topicFiles) {
    const filePath = path.join(questionsDir, filename);
    let qData;
    try {
      qData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`❌ Failed to parse ${filename}: ${err.message}`);
      continue;
    }

    // Verify question topic number matches
    if (qData.topic_number !== undefined && qData.topic_number !== topicNumber) {
      continue;
    }

    const changes = cleanQuestionObject(qData);
    if (changes.length > 0) {
      totalChanges += changes.length;
      modifiedFiles.push({
        filename,
        filePath,
        qData,
        changes,
      });
      updatedQuestionsMap.set(qData.id, qData);

      console.log(`📄 ${filename} (${changes.length} change${changes.length > 1 ? 's' : ''}):`);
      for (const change of changes) {
        console.log(`   Field: ${change.path}`);
        console.log(`     - ${JSON.stringify(change.before)}`);
        console.log(`     + ${JSON.stringify(change.after)}`);
      }
      console.log('');
    }
  }

  if (totalChanges === 0) {
    console.log(`✨ All Topic ${topicNumber} questions are already clean. No changes needed.`);
    return;
  }

  console.log(`Summary: Identified ${totalChanges} change(s) across ${modifiedFiles.length} question file(s).`);

  if (!isApply) {
    console.log(`\n💡 [DRY-RUN] No files were modified on disk.`);
    console.log(`   To apply these changes, rerun with --apply:`);
    console.log(`   ./scripts/fix_unwrapped_text_math.mjs ${courseId} ${topicNumber} --apply\n`);
    return;
  }

  // In --apply mode:
  // 1. Write cleaned standalone question files
  for (const item of modifiedFiles) {
    fs.writeFileSync(item.filePath, JSON.stringify(item.qData, null, 2) + '\n', 'utf8');
    console.log(`✅ Saved ${item.filename}`);
  }

  // 2. Sync corresponding topic bundle
  if (fs.existsSync(topicBundlePath)) {
    try {
      const bundleData = JSON.parse(fs.readFileSync(topicBundlePath, 'utf8'));
      let bundleUpdatedCount = 0;

      if (Array.isArray(bundleData)) {
        for (let i = 0; i < bundleData.length; i++) {
          const item = bundleData[i];
          if (updatedQuestionsMap.has(item.id)) {
            bundleData[i] = updatedQuestionsMap.get(item.id);
            bundleUpdatedCount++;
          }
        }
        fs.writeFileSync(topicBundlePath, JSON.stringify(bundleData, null, 2) + '\n', 'utf8');
        console.log(`\n📦 Synced ${bundleUpdatedCount} question(s) into topic bundle: ${path.relative(REPO_ROOT, topicBundlePath)}`);
      }
    } catch (err) {
      console.error(`❌ Failed to update topic bundle ${topicBundlePath}: ${err.message}`);
    }
  } else {
    console.warn(`⚠️ Topic bundle file not found: ${topicBundlePath}`);
  }

  console.log(`\n🎉 Successfully applied ${totalChanges} change(s) to Topic ${topicNumber} questions and synced bundle.\n`);
}

main();
