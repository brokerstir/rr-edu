#!/usr/bin/env node

/**
 * scripts/add_diagrams.mjs
 *
 * Adds or updates declarative `diagramSpec` metadata for target questions
 * across both individual question files (`public/data/<courseId>/questions/<questionId>.json`)
 * and topic bundle files (`public/data/<courseId>/topic_<topicNum>.json`).
 *
 * Supports attaching `diagramSpec` at either:
 *  - Top-level question object (`topLevel` key in DIAGRAM_SPECS)
 *  - Specific subparts (`subparts: { a: spec, b: spec }` in DIAGRAM_SPECS)
 *
 * Usage:
 *   ./scripts/add_diagrams.mjs <courseId> [questionId ...]
 *   node scripts/add_diagrams.mjs ib_math_aa_sl topic_3_q11
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Registry of diagram specifications by question ID
export const DIAGRAM_SPECS = {
  // Topic 3, Question 11: Perimeter and area of triangle ABC
  topic_3_q11: {
    subparts: {
      // Subpart (a): Right-angled triangle ABC with right angle at C, AC = 7 cm, angle B = 41°
      a: {
        caption: 'Diagram not to scale',
        points: [
          { id: 'C', x: 0, y: 0, label: 'C', labelOffset: [-14, 12] },
          { id: 'B', x: 8.053, y: 0, label: 'B', labelOffset: [16, 12] },
          { id: 'A', x: 0, y: 7, label: 'A', labelOffset: [-14, -12] },
        ],
        segments: [
          { from: 'C', to: 'A', label: '7 cm', labelOffset: [-22, 0] },
          { from: 'C', to: 'B', label: '', labelOffset: [0, 14] },
          { from: 'B', to: 'A', label: '', labelOffset: [12, -12] },
        ],
        rightAngles: [
          { vertex: 'C', arm1: 'B', arm2: 'A', size: 14 },
        ],
        angles: [
          { vertex: 'B', from: 'A', to: 'C', label: '41°', radius: 30, color: '#818cf8' },
        ],
      },

      // Subpart (b): Right-angled triangle ABC (right angle at C, AC = 9 m) with altitude CD forming right-angled sub-triangle BCD (right angle at D, angle BCD = 28°)
      b: {
        caption: 'Diagram not to scale',
        points: [
          { id: 'C', x: 0, y: 0, label: 'C', labelOffset: [-14, 12] },
          { id: 'B', x: 4.785, y: 0, label: 'B', labelOffset: [16, 12] },
          { id: 'A', x: 0, y: 9, label: 'A', labelOffset: [-14, -12] },
          { id: 'D', x: 3.731, y: 1.984, label: 'D', labelOffset: [14, -12] },
        ],
        segments: [
          { from: 'C', to: 'A', label: '9 m', labelOffset: [-22, 0] },
          { from: 'C', to: 'B', label: '', labelOffset: [0, 14] },
          { from: 'B', to: 'A', label: '', labelOffset: [12, -12] },
          { from: 'C', to: 'D', dashed: true, color: '#94a3b8' },
        ],
        rightAngles: [
          { vertex: 'C', arm1: 'B', arm2: 'A', size: 14 },
          { vertex: 'D', arm1: 'C', arm2: 'B', size: 12, color: '#94a3b8' },
        ],
        angles: [
          { vertex: 'C', from: 'D', to: 'B', label: '28°', radius: 26, color: '#818cf8' },
        ],
      },
    },
  },

  // Topic 3, Question 13: Rhombus with diagonals of length 5 cm and 8 cm
  topic_3_q13: {
    subparts: {
      // Subpart (a): Draw a diagram and label with half-diagonals 4 cm, 2.5 cm and sides x cm
      a: {
        answerDiagramSpec: {
          title: 'Rhombus with Perpendicular Diagonals',
          caption: 'Diagonals intersect perpendicularly at center O and bisect each other into 4 cm and 2.5 cm legs.',
          points: [
            { id: 'O', x: 0, y: 0, label: 'O', labelOffset: [-10, -10], dot: true },
            { id: 'Left', x: -4, y: 0, label: '', dot: false },
            { id: 'Right', x: 4, y: 0, label: '', dot: false },
            { id: 'Top', x: 0, y: 2.5, label: '', dot: false },
            { id: 'Bottom', x: 0, y: -2.5, label: '', dot: false },
          ],
          segments: [
            // Outer Rhombus Sides (hypotenuses x cm)
            { from: 'Left', to: 'Top', label: 'x cm', labelOffset: [-14, -8], color: '#f8fafc', strokeWidth: 2 },
            { from: 'Top', to: 'Right', label: 'x cm', labelOffset: [14, -8], color: '#f8fafc', strokeWidth: 2 },
            { from: 'Right', to: 'Bottom', label: 'x cm', labelOffset: [14, 8], color: '#f8fafc', strokeWidth: 2 },
            { from: 'Bottom', to: 'Left', label: 'x cm', labelOffset: [-14, 8], color: '#f8fafc', strokeWidth: 2 },
            // Inner Perpendicular Diagonals (dashed)
            { from: 'Left', to: 'O', label: '4 cm', labelOffset: [0, 12], dashed: true, color: '#94a3b8', strokeWidth: 1.5 },
            { from: 'O', to: 'Right', label: '4 cm', labelOffset: [0, 12], dashed: true, color: '#94a3b8', strokeWidth: 1.5 },
            { from: 'Bottom', to: 'O', label: '2.5 cm', labelOffset: [18, 0], dashed: true, color: '#94a3b8', strokeWidth: 1.5 },
            { from: 'O', to: 'Top', label: '2.5 cm', labelOffset: [18, 0], dashed: true, color: '#94a3b8', strokeWidth: 1.5 },
          ],
          rightAngles: [
            { vertex: 'O', arm1: 'Right', arm2: 'Top', size: 14, color: '#cbd5e1' },
          ],
        },
      },
    },
  },
};

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/add_diagrams.mjs <courseId> [questionId ...]');
    console.error('Available questions in registry:', Object.keys(DIAGRAM_SPECS).join(', '));
    process.exit(1);
  }

  const courseId = args[0];
  const targetQuestionIds = args.length > 1 ? args.slice(1) : Object.keys(DIAGRAM_SPECS);

  const courseDir = path.join(REPO_ROOT, 'public', 'data', courseId);
  const questionsDir = path.join(courseDir, 'questions');

  if (!fs.existsSync(courseDir)) {
    console.error(`Course directory does not exist: ${courseDir}`);
    process.exit(1);
  }

  const touchedTopics = new Set();
  let updatedCount = 0;

  for (const qId of targetQuestionIds) {
    const qSpecConfig = DIAGRAM_SPECS[qId];
    if (!qSpecConfig) {
      console.warn(`No diagramSpec defined in registry for question ID: "${qId}". Skipping.`);
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

    // Attach top-level diagramSpec if configured
    if (qSpecConfig.topLevel) {
      qData.diagramSpec = qSpecConfig.topLevel;
      qModified = true;
    }

    // Attach subpart diagramSpecs / answerDiagramSpecs if configured
    if (qSpecConfig.subparts && Array.isArray(qData.subparts)) {
      qData.subparts = qData.subparts.map((sp) => {
        const subLetter = (sp.subpart || '').toLowerCase();
        const subConfig = qSpecConfig.subparts[subLetter];
        if (subConfig) {
          qModified = true;
          const updatedSp = { ...sp };
          if (subConfig.diagramSpec !== undefined) {
            updatedSp.diagramSpec = subConfig.diagramSpec;
          }
          if (subConfig.answerDiagramSpec !== undefined) {
            updatedSp.answerDiagramSpec = subConfig.answerDiagramSpec;
          }
          // Also handle shorthand where subConfig itself is the diagramSpec
          if (!subConfig.diagramSpec && !subConfig.answerDiagramSpec) {
            updatedSp.diagramSpec = subConfig;
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
        const qSpecConfig = DIAGRAM_SPECS[item.id];
        if (qSpecConfig) {
          if (qSpecConfig.topLevel) {
            item.diagramSpec = qSpecConfig.topLevel;
            bundleModified = true;
          }

          if (qSpecConfig.subparts && Array.isArray(item.subparts)) {
            item.subparts = item.subparts.map((sp) => {
              const subLetter = (sp.subpart || '').toLowerCase();
              const subConfig = qSpecConfig.subparts[subLetter];
              if (subConfig) {
                bundleModified = true;
                const updatedSp = { ...sp };
                if (subConfig.diagramSpec !== undefined) {
                  updatedSp.diagramSpec = subConfig.diagramSpec;
                }
                if (subConfig.answerDiagramSpec !== undefined) {
                  updatedSp.answerDiagramSpec = subConfig.answerDiagramSpec;
                }
                if (!subConfig.diagramSpec && !subConfig.answerDiagramSpec) {
                  updatedSp.diagramSpec = subConfig;
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

  console.log(`Done! Patched ${updatedCount} question(s) with diagrams.`);
}

main();
