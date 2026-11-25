#!/usr/bin/env node

/**
 * scripts/add_answer_graphs.mjs
 *
 * Adds or updates declarative `graphSpec` metadata for target questions
 * across both individual question files (`public/data/<courseId>/questions/<questionId>.json`)
 * and topic bundle files (`public/data/<courseId>/topic_<topicNum>.json`).
 *
 * Usage:
 *   node scripts/add_answer_graphs.mjs <courseId> [questionId ...]
 *   node scripts/add_answer_graphs.mjs ib_math_aa_sl topic_2_q30
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Registry of graph specifications by question ID and subpart
export const GRAPH_SPECS = {
  // Topic 2, Question 30: k(t) = 2t - 4 for 0 <= t < 4, t in Z
  topic_2_q30: {
    c: {
      domain: [-1, 5],
      range: [-5, 4],
      xStep: 1,
      yStep: 1,
      xLabel: 't',
      yLabel: 'k(t)',
      title: 'k(t) = 2t - 4,  t ∈ {0, 1, 2, 3}',
      caption: 'Discrete points at (0, -4), (1, -2), (2, 0), and (3, 2). Points are unconnected because domain is restricted to integers.',
      points: [
        { x: 0, y: -4, label: '(0, -4)', labelPos: 'right', color: '#818cf8' },
        { x: 1, y: -2, label: '(1, -2)', labelPos: 'right', color: '#818cf8' },
        { x: 2, y: 0, label: '(2, 0)', labelPos: 'top', color: '#818cf8' },
        { x: 3, y: 2, label: '(3, 2)', labelPos: 'left', color: '#818cf8' },
      ],
    },
  },

  // Topic 2, Question 32: f(x) = 2 + 4/(x + 1)
  // Subpart d asks to sketch y = 2 + 4/(x + 1), labeling intercepts and asymptotes
  topic_2_q32: {
    d: {
      domain: [-6, 4],
      range: [-5, 8],
      xStep: 1,
      yStep: 1,
      xLabel: 'x',
      yLabel: 'y',
      title: 'f(x) = 2 + \\frac{4}{x + 1}',
      caption: 'Hyperbola with vertical asymptote x = -1, horizontal asymptote y = 2, intercepts (-3, 0) and (0, 6), and point (-2, -2).',
      functions: [
        {
          expr: '2 + 4/(x + 1)',
          label: 'y = 2 + \\frac{4}{x + 1}',
          color: '#38bdf8',
          strokeWidth: 2.2,
        },
      ],
      asymptotes: [
        { axis: 'x', value: -1, label: 'x = -1', color: '#f43f5e' },
        { axis: 'y', value: 2, label: 'y = 2', color: '#f43f5e' },
      ],
      points: [
        { x: -3, y: 0, label: '(-3, 0)', labelPos: 'bottom', color: '#818cf8' },
        { x: 0, y: 6, label: '(0, 6)', labelPos: 'right', color: '#818cf8' },
        { x: -2, y: -2, label: '(-2, -2)', labelPos: 'left', color: '#818cf8' },
      ],
    },
  },

  // Topic 2, Question 41: y = -1 + 2^(-x)
  // Subpart d asks to sketch the function
  topic_2_q41: {
    d: {
      domain: [-3, 4],
      range: [-2, 5],
      xStep: 1,
      yStep: 1,
      xLabel: 'x',
      yLabel: 'y',
      title: 'y = -1 + 2^{-x}',
      caption: 'Decreasing exponential curve passing through (0, 0), with horizontal asymptote y = -1.',
      functions: [
        {
          expr: '-1 + 2^(-x)',
          label: 'y = -1 + 2^{-x}',
          color: '#38bdf8',
          strokeWidth: 2.2,
        },
      ],
      asymptotes: [
        { axis: 'y', value: -1, label: 'y = -1', color: '#f43f5e' },
      ],
      points: [
        { x: 0, y: 0, label: '(0, 0)', labelPos: 'top', color: '#818cf8' },
        { x: -1, y: 1, label: '(-1, 1)', labelPos: 'right', color: '#818cf8' },
        { x: 1, y: -0.5, label: '(1, -0.5)', labelPos: 'bottom', color: '#818cf8' },
      ],
    },
  },

  // Topic 2, Question 50: f(x) = 2^(x-1) and f^-1(x) = log_2(x) + 1
  // Subpart b asks to graph y = f(x) and its inverse on the same set of axes
  topic_2_q50: {
    b: {
      domain: [-1, 5],
      range: [-1, 5],
      xStep: 1,
      yStep: 1,
      xLabel: 'x',
      yLabel: 'y',
      title: 'y = 2^{x-1} \\text{ and } y = f^{-1}(x)',
      caption: 'Curves f(x) = 2^{x-1} and f^{-1}(x) = \\log_2(x) + 1 reflected across the dashed line y = x, intersecting at (1, 1) and (2, 2).',
      functions: [
        // Line of reflection y = x
        {
          expr: 'x',
          label: 'y = x',
          color: '#94a3b8',
          strokeWidth: 1.5,
          dashed: true,
        },
        // f(x) = 2^(x - 1)
        {
          expr: '2^(x - 1)',
          label: 'y = 2^{x-1}',
          color: '#38bdf8', // sky-400
          strokeWidth: 2.2,
        },
        // f^-1(x) = log_2(x) + 1 (defined for x > 0)
        {
          expr: 'log2(x) + 1',
          domain: [0.03, 5],
          label: 'y = \\log_2(x) + 1',
          color: '#a855f7', // purple-500
          strokeWidth: 2.2,
        },
      ],
      asymptotes: [
        { axis: 'y', value: 0, label: 'y = 0', color: '#f43f5e' },
        { axis: 'x', value: 0, label: 'x = 0', color: '#f43f5e' },
      ],
      points: [
        { x: 1, y: 1, label: '(1, 1)', labelPos: 'top', color: '#38bdf8' },
        { x: 2, y: 2, label: '(2, 2)', labelPos: 'left', color: '#38bdf8' },
        { x: 0, y: 0.5, label: '(0, 0.5)', labelPos: 'left', color: '#38bdf8' },
        { x: 0.5, y: 0, label: '(0.5, 0)', labelPos: 'bottom', color: '#a855f7' },
      ],
    },
  },
};

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/add_answer_graphs.mjs <courseId> [questionId ...]');
    console.error('Available questions in registry:', Object.keys(GRAPH_SPECS).join(', '));
    process.exit(1);
  }

  const courseId = args[0];
  const targetQuestionIds = args.length > 1 ? args.slice(1) : Object.keys(GRAPH_SPECS);

  const courseDir = path.join(REPO_ROOT, 'public', 'data', courseId);
  const questionsDir = path.join(courseDir, 'questions');

  if (!fs.existsSync(courseDir)) {
    console.error(`Course directory does not exist: ${courseDir}`);
    process.exit(1);
  }

  const touchedTopics = new Set();
  let updatedCount = 0;

  for (const qId of targetQuestionIds) {
    const specsBySubpart = GRAPH_SPECS[qId];
    if (!specsBySubpart) {
      console.warn(`No graphSpec defined in registry for question ID: "${qId}". Skipping.`);
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

    if (Array.isArray(qData.subparts)) {
      qData.subparts = qData.subparts.map((sp) => {
        const subLetter = (sp.subpart || '').toLowerCase();
        if (specsBySubpart[subLetter]) {
          qModified = true;
          return {
            ...sp,
            graphSpec: specsBySubpart[subLetter],
          };
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
        if (GRAPH_SPECS[item.id]) {
          const specsBySubpart = GRAPH_SPECS[item.id];
          if (Array.isArray(item.subparts)) {
            item.subparts = item.subparts.map((sp) => {
              const subLetter = (sp.subpart || '').toLowerCase();
              if (specsBySubpart[subLetter]) {
                bundleModified = true;
                return {
                  ...sp,
                  graphSpec: specsBySubpart[subLetter],
                };
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

  console.log(`Done! Patched ${updatedCount} question(s).`);
}

main();
