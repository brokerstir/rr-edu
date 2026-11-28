#!/usr/bin/env node

/**
 * scripts/add_stats_diagrams.mjs
 *
 * Adds or updates declarative `statsSpec` metadata for Topic 4 questions
 * across both individual question files (`public/data/<courseId>/questions/<questionId>.json`)
 * and topic bundle files (`public/data/<courseId>/topic_<topicNum>.json`).
 *
 * Supports attaching stats specifications at either:
 *  - Top-level question object (`topLevel` key in STATS_SPECS) -> sets `statsSpec`
 *  - Specific subparts (`subparts: { a: spec, b: spec }` in STATS_SPECS) -> sets `statsSpec` or `answerStatsSpec`
 *
 * Usage:
 *   ./scripts/add_stats_diagrams.mjs <courseId> [questionId ...]
 *   node scripts/add_stats_diagrams.mjs ib_math_aa_sl topic_4_q17
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Registry of statistical diagram specifications by question ID
export const STATS_SPECS = {
  // Topic 4, Question 17: Parallel box plots of fungus weights across 3 sites
  topic_4_q17: {
    topLevel: {
      chartType: 'boxplot',
      orientation: 'vertical',
      axisLabel: 'Weight (grams)',
      domain: [0, 80],
      step: 10,
      plots: [
        {
          label: 'Site 1',
          min: 15,
          q1: 30,
          median: 50,
          q3: 60,
          max: 70,
          color: '#818cf8',
        },
        {
          label: 'Site 2',
          min: 20,
          q1: 25,
          median: 30,
          q3: 35,
          max: 45,
          color: '#34d399',
        },
        {
          label: 'Site 3',
          min: 5,
          q1: 15,
          median: 25,
          q3: 35,
          max: 75,
          color: '#fbbf24',
        },
      ],
    },
  },
};

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: ./scripts/add_stats_diagrams.mjs <courseId> [questionId ...]');
    console.error('Available questions in registry:', Object.keys(STATS_SPECS).join(', '));
    process.exit(1);
  }

  const courseId = args[0];
  const targetQuestionIds = args.length > 1 ? args.slice(1) : Object.keys(STATS_SPECS);

  const courseDir = path.join(REPO_ROOT, 'public', 'data', courseId);
  const questionsDir = path.join(courseDir, 'questions');

  if (!fs.existsSync(courseDir)) {
    console.error(`Course directory does not exist: ${courseDir}`);
    process.exit(1);
  }

  const touchedTopics = new Set();
  let updatedCount = 0;

  for (const qId of targetQuestionIds) {
    const qSpecConfig = STATS_SPECS[qId];
    if (!qSpecConfig) {
      console.warn(`No statsSpec defined in registry for question ID: "${qId}". Skipping.`);
      continue;
    }

    const qFilePath = path.join(questionsDir, `${qId}.json`);
    if (!fs.existsSync(qFilePath)) {
      console.warn(`Question file not found at: ${qFilePath}. Skipping.`);
      continue;
    }

    // 1. Update standalone question file
    const qData = JSON.parse(fs.readFileSync(qFilePath, 'utf8'));
    let qModified = false;

    // Attach top-level statsSpec if configured
    if (qSpecConfig.topLevel) {
      qData.statsSpec = qSpecConfig.topLevel;
      qModified = true;
    }

    // Attach subpart statsSpecs / answerStatsSpecs if configured
    if (qSpecConfig.subparts && Array.isArray(qData.subparts)) {
      qData.subparts = qData.subparts.map((sp) => {
        const subLetter = (sp.subpart || '').toLowerCase();
        const subConfig = qSpecConfig.subparts[subLetter];
        if (subConfig) {
          qModified = true;
          const updatedSp = { ...sp };
          if (subConfig.statsSpec !== undefined) {
            updatedSp.statsSpec = subConfig.statsSpec;
          }
          if (subConfig.answerStatsSpec !== undefined) {
            updatedSp.answerStatsSpec = subConfig.answerStatsSpec;
          }
          // Shorthand support where subConfig itself is the statsSpec
          if (!subConfig.statsSpec && !subConfig.answerStatsSpec) {
            updatedSp.statsSpec = subConfig;
          }
          return updatedSp;
        }
        return sp;
      });
    }

    if (qModified) {
      fs.writeFileSync(qFilePath, JSON.stringify(qData, null, 2) + '\n', 'utf8');
      console.log(`✅ Updated ${path.relative(REPO_ROOT, qFilePath)}`);
      updatedCount++;

      if (qData.topic_number !== undefined) {
        touchedTopics.add(qData.topic_number);
      }
    }
  }

  // 2. Sync updated questions into corresponding topic bundle files (topic_<topicNumber>.json)
  for (const topicNum of touchedTopics) {
    const topicBundlePath = path.join(courseDir, `topic_${topicNum}.json`);
    if (!fs.existsSync(topicBundlePath)) {
      console.warn(`Topic bundle not found: ${topicBundlePath}`);
      continue;
    }

    const bundleData = JSON.parse(fs.readFileSync(topicBundlePath, 'utf8'));
    let bundleModified = false;

    if (Array.isArray(bundleData)) {
      for (let i = 0; i < bundleData.length; i++) {
        const item = bundleData[i];
        const qSpecConfig = STATS_SPECS[item.id];
        if (qSpecConfig) {
          if (qSpecConfig.topLevel) {
            item.statsSpec = qSpecConfig.topLevel;
            bundleModified = true;
          }

          if (qSpecConfig.subparts && Array.isArray(item.subparts)) {
            item.subparts = item.subparts.map((sp) => {
              const subLetter = (sp.subpart || '').toLowerCase();
              const subConfig = qSpecConfig.subparts[subLetter];
              if (subConfig) {
                bundleModified = true;
                const updatedSp = { ...sp };
                if (subConfig.statsSpec !== undefined) {
                  updatedSp.statsSpec = subConfig.statsSpec;
                }
                if (subConfig.answerStatsSpec !== undefined) {
                  updatedSp.answerStatsSpec = subConfig.answerStatsSpec;
                }
                if (!subConfig.statsSpec && !subConfig.answerStatsSpec) {
                  updatedSp.statsSpec = subConfig;
                }
                return updatedSp;
              }
              return sp;
            });
          }
        }
      }
    }

    if (bundleModified) {
      fs.writeFileSync(topicBundlePath, JSON.stringify(bundleData, null, 2) + '\n', 'utf8');
      console.log(`✅ Synced into bundle ${path.relative(REPO_ROOT, topicBundlePath)}`);
    }
  }

  console.log(`Done! Patched ${updatedCount} question(s) with statistics diagrams.`);
}

main();
