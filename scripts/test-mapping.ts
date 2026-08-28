import { mapQuestionsToAnswers, normalizeQuestionNumber, isSectionHeader } from '../src/lib/mapping';
import type { ExtractedQuestion, StudentAnswer } from '../src/types';

async function runTests() {
  console.log('========================================');
  console.log('RUNNING PHASE 3 MAPPING ENGINE TESTS');
  console.log('========================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // --- Test 1: Number Normalization ---
  assert(normalizeQuestionNumber('Q1') === '1', 'Normalizes Q1 -> 1');
  assert(normalizeQuestionNumber('Q. 11 (a)') === '11(a)', 'Normalizes Q. 11 (a) -> 11(a)');
  assert(normalizeQuestionNumber('Question 11 b') === '11(b)', 'Normalizes Question 11 b -> 11(b)');
  assert(normalizeQuestionNumber('11 ( B )') === '11(b)', 'Normalizes 11 ( B ) -> 11(b)');
  assert(normalizeQuestionNumber('3(ii)') === '3(ii)', 'Normalizes 3(ii) -> 3(ii)');
  assert(normalizeQuestionNumber('Module-01 Vocab Terms') === null, 'Rejects Module-01 Vocab Terms');
  assert(normalizeQuestionNumber('Section A') === null, 'Rejects Section A');
  assert(isSectionHeader('MODULE - 01'), 'Identifies MODULE - 01 as section');

  // --- Test 2: Full 16-Question Benchmark from Spec (Section 20) ---
  const sampleQuestions: ExtractedQuestion[] = [
    { id: 'q1', number: '1', text: 'Which blood vessel carries blood away from the heart?' },
    { id: 'q2', number: '2', text: 'Which organelle is involved in photosynthesis?' },
    { id: 'q3', number: '3', text: 'Explain osmosis.' },
    { id: 'q4', number: '4', text: 'Define homeostasis.' },
    { id: 'q5', number: '5', text: 'Name two muscle tissue types.' },
    { id: 'q6', number: '6', text: 'Describe mitochondria role in ATP.' },
    { id: 'q7', number: '7', text: 'Function of nucleus?' },
    { id: 'q8', number: '8', text: 'Respiration differences.' },
    { id: 'q9', number: '9', text: 'Newton second law.' },
    { id: 'q10', number: '10', text: 'Calculate kinetic energy.' },
    { id: 'q11a', number: '11(a)', text: 'Photosynthesis details.' },
    { id: 'q11b', number: '11(b)', text: 'Crop yield practical measure.' },
    { id: 'q12', number: '12', text: 'DNA structure and base pairing.' },
    { id: 'q13', number: '13', text: 'Enzyme substrate model.' },
    { id: 'q14', number: '14', text: 'Electric current and Ohm law.' },
    { id: 'q15', number: '15', text: 'Wave speed equation.' },
  ];

  // Intentionally out-of-order, with subparts 11(a)/11(b), extra Q99, and multi-page Q12
  const sampleAnswers: StudentAnswer[] = [
    { id: 'a1', questionNumber: 'Q3', text: 'Osmosis is the movement of water...', regions: [{ page: 1, bbox: [100, 100, 200, 800] }] },
    { id: 'a2', questionNumber: 'Q. 1', text: 'The aorta carries oxygenated blood...', regions: [{ page: 1, bbox: [250, 100, 350, 800] }] },
    { id: 'a3', questionNumber: '5', text: 'Skeletal and smooth muscle...', regions: [{ page: 1, bbox: [400, 100, 500, 800] }] },
    { id: 'a4', questionNumber: 'Question 2', text: 'Chloroplasts absorb light...', regions: [{ page: 1, bbox: [550, 100, 650, 800] }] },
    { id: 'a5', questionNumber: '11(a)', text: 'Photosynthesis occurs in chloroplast stroma...', regions: [{ page: 2, bbox: [100, 100, 300, 800] }] },
    { id: 'a6', questionNumber: '11 (b)', text: 'Farmers can use greenhouses...', regions: [{ page: 2, bbox: [350, 100, 450, 800] }] },
    { id: 'a7', questionNumber: 'Q7', text: 'The nucleus contains genetic material DNA...', regions: [{ page: 2, bbox: [500, 100, 600, 800] }] },
    { id: 'a8', questionNumber: 'Q99', text: 'Extraneous student note on quantum physics...', regions: [{ page: 2, bbox: [650, 100, 750, 800] }] },
    { id: 'a9', questionNumber: '10', text: 'KE = 0.5 * 5 * 10^2 = 250 J...', regions: [{ page: 3, bbox: [100, 100, 250, 800] }] },
    {
      id: 'a10',
      questionNumber: '12',
      text: 'DNA is a double helix with AT and GC base pairing continuing on next page...',
      regions: [
        { page: 3, bbox: [300, 100, 800, 800] },
        { page: 4, bbox: [100, 100, 400, 800] },
      ],
    },
    { id: 'a11', questionNumber: 'Q14', text: 'V = IR, Ohm law states...', regions: [{ page: 4, bbox: [450, 100, 600, 800] }] },
    { id: 'a12', questionNumber: '15', text: 'v = f * lambda...', regions: [{ page: 4, bbox: [650, 100, 800, 800] }] },
  ];

  const result = await mapQuestionsToAnswers(sampleQuestions, sampleAnswers, { enableSemantic: false });

  // Check mappings count and order
  assert(result.mappings.length === 16, 'Produces exactly 16 question mappings');
  assert(result.mappings[0].questionNumber === '1', 'Mappings follow QP order: Q1 is index 0');
  assert(result.mappings[1].questionNumber === '2', 'Mappings follow QP order: Q2 is index 1');
  assert(result.mappings[2].questionNumber === '3', 'Mappings follow QP order: Q3 is index 2');
  assert(result.mappings[10].questionNumber === '11(a)', 'Mappings follow QP order: Q11(a) is index 10');
  assert(result.mappings[11].questionNumber === '11(b)', 'Mappings follow QP order: Q11(b) is index 11');
  assert(result.mappings[15].questionNumber === '15', 'Mappings follow QP order: Q15 is index 15');

  // Check Answered vs Unanswered
  assert(result.stats.answered === 11, 'Exactly 11 questions answered');
  assert(result.stats.unanswered === 5, 'Exactly 5 questions unanswered (Q4, Q6, Q8, Q9, Q13)');

  // Verify unanswered questions
  const q4 = result.mappings.find((m) => m.questionNumber === '4');
  assert(q4?.status === 'unanswered' && q4.answerId === null, 'Q4 is marked unanswered');
  const q6 = result.mappings.find((m) => m.questionNumber === '6');
  assert(q6?.status === 'unanswered' && q6.answerId === null, 'Q6 is marked unanswered');

  // Verify subquestions remain distinct
  const q11a = result.mappings.find((m) => m.questionNumber === '11(a)');
  const q11b = result.mappings.find((m) => m.questionNumber === '11(b)');
  assert(q11a?.answerId === 'a5', '11(a) mapped to answer a5');
  assert(q11b?.answerId === 'a6', '11(b) mapped to answer a6');
  assert(q11a?.answerId !== q11b?.answerId, '11(a) and 11(b) remain distinct');

  // Verify Multi-page answer Q12
  const q12 = result.mappings.find((m) => m.questionNumber === '12');
  assert(q12?.answerId === 'a10', 'Q12 mapped to a10');
  assert(q12?.answer?.regions.length === 2, 'Q12 preserves both multi-page regions (pages 3 and 4)');

  // Verify Unmapped extra answer Q99
  assert(result.unmappedAnswers.length === 1, 'Exactly 1 unmapped answer (Q99)');
  assert(result.unmappedAnswers[0].answerId === 'a8', 'Q99 is correctly categorized as unmapped');
  assert(result.unmappedAnswers[0].questionNumber === 'Q99', 'Q99 retains original question number');

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed.`);
  console.log('========================================');
}

runTests().catch(console.error);
