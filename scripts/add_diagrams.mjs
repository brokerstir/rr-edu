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
  // Topic 3, Question 1: Surface area of 3D solids
  topic_3_q1: {
    subparts: {
      // Subpart (a): Right Square-Based Pyramid (base 10 cm, vertical height 20 cm)
      a: {
        title: 'Right Square-Based Pyramid',
        caption: 'Diagram not to scale',
        points: [
          { id: 'Apex', x: 0, y: 15, label: '', dot: false },
          { id: 'FL', x: -5, y: -3, label: '', dot: false },
          { id: 'FR', x: 3, y: -3, label: '', dot: false },
          { id: 'BR', x: 5, y: 1, label: '', dot: false },
          { id: 'BL', x: -3, y: 1, label: '', dot: false },
          { id: 'Center', x: 0, y: -1, label: '', dot: false },
          { id: 'RightArm', x: 1, y: -1, label: '', dot: false },
        ],
        segments: [
          // Base visible front/right edges
          { from: 'FL', to: 'FR', label: '10 cm', labelOffset: [0, 14], color: '#f8fafc', strokeWidth: 2 },
          { from: 'FR', to: 'BR', label: '10 cm', labelOffset: [16, 4], color: '#f8fafc', strokeWidth: 2 },
          // Base hidden back/left edges (dashed)
          { from: 'BR', to: 'BL', dashed: true, color: '#64748b', strokeWidth: 1.5 },
          { from: 'BL', to: 'FL', dashed: true, color: '#64748b', strokeWidth: 1.5 },
          // Slant edges from Apex
          { from: 'Apex', to: 'FL', color: '#f8fafc', strokeWidth: 2 },
          { from: 'Apex', to: 'FR', color: '#f8fafc', strokeWidth: 2 },
          { from: 'Apex', to: 'BR', color: '#f8fafc', strokeWidth: 2 },
          { from: 'Apex', to: 'BL', dashed: true, color: '#64748b', strokeWidth: 1.5 },
          // Vertical altitude from Apex to base center (dashed)
          { from: 'Apex', to: 'Center', label: '20 cm', labelOffset: [-18, 0], dashed: true, color: '#38bdf8', strokeWidth: 1.6 },
          // Guide segment on base to support right angle marker
          { from: 'Center', to: 'RightArm', dashed: true, color: '#38bdf8', strokeWidth: 1.2 },
        ],
        rightAngles: [
          { vertex: 'Center', arm1: 'RightArm', arm2: 'Apex', size: 10, color: '#38bdf8' },
        ],
      },

      // Subpart (b): Prism with a 230° Major-Sector Cross-Section (r = 5 cm, length = 6 cm)
      b: {
        title: 'Sector Prism',
        caption: 'Diagram not to scale',
        points: [
          // Front sector center and radial endpoints
          { id: 'O1', x: -2, y: 0, label: '', dot: true },
          { id: 'A1', x: -6.53, y: 2.11, label: '', dot: false }, // 5*cos(155°), 5*sin(155°) relative to O1
          { id: 'B1', x: 2.53, y: 2.11, label: '', dot: false },  // 5*cos(25°), 5*sin(25°) relative to O1
          // Back sector center and radial endpoints (offset by dx = 4, dy = 3)
          { id: 'O2', x: 2, y: 3, label: '', dot: false },
          { id: 'A2', x: -2.53, y: 5.11, label: '', dot: false },
          { id: 'B2', x: 6.53, y: 5.11, label: '', dot: false },
          // Reference point for angle arc orientation
          { id: 'ArcRef', x: -2, y: -5, label: '', dot: false },
        ],
        segments: [
          // Front flat face radius arms
          { from: 'O1', to: 'A1', label: '5 cm', labelOffset: [-12, -10], color: '#f8fafc', strokeWidth: 2 },
          { from: 'O1', to: 'B1', label: '', color: '#f8fafc', strokeWidth: 2 },
          // Back flat face radius arms
          { from: 'O2', to: 'A2', color: '#f8fafc', strokeWidth: 1.8 },
          { from: 'O2', to: 'B2', color: '#f8fafc', strokeWidth: 1.8 },
          // Longitudinal straight edges (depth = 6 cm)
          { from: 'O1', to: 'O2', label: '6 cm', labelOffset: [12, -10], color: '#f8fafc', strokeWidth: 1.8 },
          { from: 'A1', to: 'A2', color: '#f8fafc', strokeWidth: 2 },
          { from: 'B1', to: 'B2', color: '#f8fafc', strokeWidth: 2 },
          // Bottom silhouette connector edge
          { from: 'ArcRef', to: 'O2', dashed: true, color: '#64748b', strokeWidth: 1.2 },
        ],
        circles: [
          // Front major sector arc (230° reflex arc from 155° around bottom to 25°)
          { cx: -2, cy: 0, r: 5, startAngle: 155, endAngle: 385, color: '#f8fafc', strokeWidth: 2 },
          // Back major sector arc
          { cx: 2, cy: 3, r: 5, startAngle: 155, endAngle: 385, color: '#94a3b8', strokeWidth: 1.8 },
        ],
        angles: [
          // Reflex central angle arc (230°)
          { vertex: 'O1', from: 'B1', to: 'A1', label: '230°', radius: 24, color: '#818cf8' },
        ],
      },

      // Subpart (c): Composite Solid (Cone on Top of a Hemisphere)
      c: {
        title: 'Composite Solid (Cone on Hemisphere)',
        caption: 'Diagram not to scale',
        points: [
          { id: 'Apex', x: 0, y: 6, label: '', dot: false },
          { id: 'O', x: 0, y: 0, label: '', dot: true },
          { id: 'RightEdge', x: 4, y: 0, label: '', dot: false },
          { id: 'LeftEdge', x: -4, y: 0, label: '', dot: false },
        ],
        segments: [
          // Cone outer slant edges
          { from: 'Apex', to: 'LeftEdge', label: '7 cm', labelOffset: [-14, -6], color: '#f8fafc', strokeWidth: 2 },
          { from: 'Apex', to: 'RightEdge', color: '#f8fafc', strokeWidth: 2 },
          // Dashed base radius from center O to RightEdge
          { from: 'O', to: 'RightEdge', label: '4 cm', labelOffset: [0, -12], dashed: true, color: '#38bdf8', strokeWidth: 1.6 },
        ],
        ellipses: [
          // Shared circular interface: solid front half-ellipse, dashed back half-ellipse
          { cx: 0, cy: 0, rx: 4, ry: 1.3, startAngle: 180, endAngle: 360, color: '#f8fafc', strokeWidth: 1.8 },
          { cx: 0, cy: 0, rx: 4, ry: 1.3, startAngle: 0, endAngle: 180, dashed: true, color: '#64748b', strokeWidth: 1.5 },
        ],
        circles: [
          // Hemisphere bottom curved outline
          { cx: 0, cy: 0, r: 4, startAngle: 180, endAngle: 360, color: '#f8fafc', strokeWidth: 2 },
        ],
      },
    },
  },

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
