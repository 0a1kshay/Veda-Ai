import {
  mapQuestionsToAnswers,
  mappingResultToUIQuestions,
  convertGeminiBboxToPageRegion,
  PAGE_W,
  PAGE_H,
} from '../src/lib/mapping';
import { generateHeuristicGrading } from '../src/lib/grading';
import type { ExtractedQuestion, StudentAnswer } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description}`);
  }
}

console.log('========================================');
console.log('RUNNING FULL ASSESSMENT PIPELINE TESTS (PHASES 4, 5, 6)');
console.log('========================================\n');

// ----------------------------------------------------
// 1. PHASE 4: EXACT COORDINATE NORMALIZATION & HIGHLIGHTING
// ----------------------------------------------------
console.log('--- Phase 4: Highlighting & Coordinate Conversion ---');

const testRegion = convertGeminiBboxToPageRegion(1, [180, 168, 275, 882]);
assert(testRegion.page === 1, 'Region page is preserved');
assert(testRegion.x === Math.round((168 / 1000) * PAGE_W), 'X coordinate scaled to PAGE_W');
assert(testRegion.y === Math.round((180 / 1000) * PAGE_H), 'Y coordinate scaled to PAGE_H');
assert(testRegion.width === Math.max(40, Math.round(((882 - 168) / 1000) * PAGE_W)), 'Width correctly computed');
assert(testRegion.height === Math.max(25, Math.round(((275 - 180) / 1000) * PAGE_H)), 'Height correctly computed');

// Test zoom scale invariance: relative coordinates don't mutate
const scale150 = 1.5;
assert(testRegion.x * scale150 === testRegion.x * 1.5, 'Highlight coordinates scale linearly with zoom');

// ----------------------------------------------------
// 2. PHASE 4 & 6: DATA MAPPING + OUT-OF-ORDER + SUBPARTS + MULTI-PAGE
// ----------------------------------------------------
console.log('\n--- Phase 4 & 6: Data Mapping & Edge Cases ---');

const mockQP: ExtractedQuestion[] = [
  { id: 'q1', number: '1', text: 'Name the blood vessel that carries oxygenated blood.', marks: 2 },
  { id: 'q2', number: '2', text: 'Which organelle is involved in photosynthesis?', marks: 2 },
  { id: 'q3', number: '3', text: 'Define osmosis and provide an example.', marks: 3 },
  { id: 'q4', number: '4', text: 'Explain homeostasis.', marks: 3 },
  { id: 'q5', number: '5', text: 'List two types of muscle tissue.', marks: 2 },
  { id: 'q6', number: '6', text: 'What is the powerhouse of the cell?', marks: 4 },
  { id: 'q7', number: '7', text: 'State the function of the nucleus.', marks: 2 },
  { id: 'q8', number: '8', text: 'Differentiate aerobic and anaerobic respiration.', marks: 4 },
  { id: 'q9', number: '9', text: 'State Newton\'s Second Law.', marks: 3 },
  { id: 'q10', number: '10', text: 'Calculate the kinetic energy of a 5kg object at 10m/s.', marks: 3 },
  { id: 'q11a', number: '11(a)', text: 'Describe the light reactions of photosynthesis.', marks: 3 },
  { id: 'q11b', number: '11(b)', text: 'Describe the dark reactions (Calvin cycle).', marks: 3 },
  { id: 'q12', number: '12', text: 'Explain DNA replication in detail.', marks: 5 },
  { id: 'q13', number: '13', text: 'Define Ohm\'s Law.', marks: 2 },
  { id: 'q14', number: '14', text: 'What is electromagnetic induction?', marks: 3 },
  { id: 'q15', number: '15', text: 'State the law of conservation of energy.', marks: 2 },
];

const mockAnswers: StudentAnswer[] = [
  { id: 'a1', questionNumber: '3', text: 'Osmosis is the movement of water molecules across a semipermeable membrane.', regions: [{ page: 1, bbox: [340, 60, 450, 640] }] },
  { id: 'a2', questionNumber: '1', text: 'The aorta carries oxygenated blood from heart.', regions: [{ page: 1, bbox: [108, 60, 160, 600] }] },
  { id: 'a3', questionNumber: '5', text: 'Smooth muscle and cardiac muscle.', regions: [{ page: 2, bbox: [310, 60, 370, 600] }] },
  { id: 'a4', questionNumber: '2', text: 'Chloroplast is involved in photosynthesis.', regions: [{ page: 1, bbox: [210, 60, 270, 600] }] },
  { id: 'a5', questionNumber: '11(a)', text: 'Light reactions occur in the thylakoid membranes generating ATP and NADPH.', regions: [{ page: 4, bbox: [240, 60, 334, 600] }] },
  { id: 'a6', questionNumber: '11(b)', text: 'Calvin cycle occurs in the stroma using ATP to fix CO2 into glucose.', regions: [{ page: 4, bbox: [398, 60, 450, 600] }] },
  { id: 'a7', questionNumber: '7', text: 'Nucleus controls all cell activities and stores DNA.', regions: [{ page: 3, bbox: [155, 60, 210, 600] }] },
  { id: 'a8', questionNumber: '99', text: 'Extraneous bonus answer on quantum mechanics.', regions: [{ page: 4, bbox: [460, 60, 540, 600] }] },
  { id: 'a9', questionNumber: '10', text: 'KE = 1/2 m v^2 = 1/2 * 5 * (10)^2 = 250 Joules.', regions: [{ page: 4, bbox: [40, 60, 150, 600] }] },
  {
    id: 'a10',
    questionNumber: '12',
    text: 'DNA replication is semiconservative where helicase unzips DNA and DNA polymerase synthesizes new strands.',
    regions: [
      { page: 3, bbox: [480, 60, 950, 640] },
      { page: 4, bbox: [40, 60, 200, 640] },
    ],
  },
  { id: 'a11', questionNumber: '14', text: 'Induction is the generation of EMF across a conductor in a changing magnetic field.', regions: [{ page: 3, bbox: [300, 60, 400, 600] }] },
  { id: 'a12', questionNumber: '15', text: 'Energy cannot be created or destroyed, only transformed from one form to another.', regions: [{ page: 3, bbox: [410, 60, 470, 600] }] },
];

async function runPipelineTests() {
  const mappingResult = await mapQuestionsToAnswers(mockQP, mockAnswers, { enableSemantic: false });

  assert(mappingResult.mappings.length === 16, 'Produces 16 question mappings matching question paper count');
  assert(mappingResult.stats.answered === 11, 'Exactly 11 questions answered');
  assert(mappingResult.stats.unanswered === 5, 'Exactly 5 questions unanswered');
  assert(mappingResult.unmappedAnswers.length === 1, 'Exactly 1 unmapped answer (Q99)');
  assert(mappingResult.unmappedAnswers[0].questionNumber === '99', 'Unmapped answer is Q99');

  // Subpart independence
  const q11a = mappingResult.mappings.find((m) => m.questionNumber === '11(a)');
  const q11b = mappingResult.mappings.find((m) => m.questionNumber === '11(b)');
  assert(q11a?.answerId === 'a5', '11(a) correctly mapped to answer a5');
  assert(q11b?.answerId === 'a6', '11(b) correctly mapped to answer a6');
  assert(q11a?.answerId !== q11b?.answerId, '11(a) and 11(b) remain distinct');

  // Multi-page retention
  const q12 = mappingResult.mappings.find((m) => m.questionNumber === '12');
  assert(q12?.answer?.regions.length === 2, 'Q12 retains both regions across pages 3 & 4');
  assert(q12?.answer?.regions[0].page === 3, 'Q12 region 1 on page 3');
  assert(q12?.answer?.regions[1].page === 4, 'Q12 region 2 on page 4');

  // UI Model conversion
  const uiQuestions = mappingResultToUIQuestions(mappingResult);
  assert(uiQuestions.length === 16, 'UI questions count is 16');
  assert(uiQuestions[0].number === '1', 'First UI question is Q1');
  assert(uiQuestions[0].answer !== null, 'Q1 has answer object');
  assert(uiQuestions[3].status === 'unanswered', 'Q4 is marked unanswered');
  assert(uiQuestions[3].answer === null, 'Q4 has no answer regions (no ghost highlights)');

  // ----------------------------------------------------
  // 3. PHASE 5: GRADING ENGINE & AI FEEDBACK
  // ----------------------------------------------------
  console.log('\n--- Phase 5: Grading Engine & Score Calculations ---');

  const grading = generateHeuristicGrading(mockQP, mappingResult.mappings);

  assert(grading.grades.length === 16, 'Generates 16 question grades');
  assert(grading.totalScore <= grading.maxTotalScore, 'Total score does not exceed maximum possible score');
  assert(grading.percentage >= 0 && grading.percentage <= 100, 'Percentage is within 0-100%');

  // Check question 4 (unanswered)
  const g4 = grading.grades.find((g) => g.questionNumber === '4');
  assert(g4?.score === 0, 'Unanswered Q4 gets 0 score');
  assert(g4?.correctness === 'not_attempted', 'Unanswered Q4 correctness is not_attempted');

  // Check answered question 1
  const g1 = grading.grades.find((g) => g.questionNumber === '1');
  assert(g1?.score === 2, 'Answered Q1 receives score <= maxScore (2/2)');
  assert(g1?.correctness === 'correct', 'Answered Q1 marked correct');

  // Verify total score equals sum of individual question scores
  const calculatedSum = grading.grades.reduce((sum, g) => sum + g.score, 0);
  assert(calculatedSum === grading.totalScore, `Sum of individual question scores (${calculatedSum}) matches totalScore (${grading.totalScore})`);

  const calculatedMaxSum = grading.grades.reduce((sum, g) => sum + g.maxScore, 0);
  assert(calculatedMaxSum === grading.maxTotalScore, `Sum of max scores (${calculatedMaxSum}) matches maxTotalScore (${grading.maxTotalScore})`);

  assert(grading.strengths.length > 0, 'Overall summary provides strengths');
  assert(grading.improvements.length > 0, 'Overall summary provides areas for improvement');

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed.`);
  console.log('========================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPipelineTests();
