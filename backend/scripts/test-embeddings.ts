import { vectorService } from '../src/services/vector.service';

interface TestCase {
  textA: string;
  textB: string;
  expectedMinScore: number;
  expectedMaxScore: number;
  description: string;
}

const testCases: TestCase[] = [
  {
    description: 'Highly related medical terms (Synonyms)',
    textA: 'Ibuprofen is an NSAID used to treat pain and inflammation.',
    textB: 'Advil is a nonsteroidal anti-inflammatory drug prescribed for swelling and pain.',
    expectedMinScore: 0.75, // Should be very high
    expectedMaxScore: 1.0,
  },
  {
    description: 'Somewhat related (Different drugs, same category)',
    textA: 'Lisinopril is an ACE inhibitor used for high blood pressure.',
    textB: 'Amlodipine is a calcium channel blocker used to treat hypertension.',
    expectedMinScore: 0.50, // Should be moderately high
    expectedMaxScore: 0.85,
  },
  {
    description: 'Completely unrelated (Medical vs non-medical)',
    textA: 'The patient was prescribed amoxicillin for a bacterial infection.',
    textB: 'The recipe calls for two cups of flour and a tablespoon of sugar.',
    expectedMinScore: -1.0,
    expectedMaxScore: 0.30, // Should be very low
  }
];

import { env } from '../src/config/env';

async function runSanityChecks() {
  console.log('--- Starting Embedding Quality Sanity Checks ---\n');

  if (!env.openAiApiKey) {
    console.log('\x1b[33m[SKIP]\x1b[0m OPENAI_API_KEY is not set. Skipping live embedding tests.\n');
    console.log('--- Summary ---');
    console.log(`Total: 0 | Passed: \x1b[32m0\x1b[0m | Failed: \x1b[31m0\x1b[0m`);
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}: ${testCase.description}`);
    console.log(`- Text A: "${testCase.textA}"`);
    console.log(`- Text B: "${testCase.textB}"`);

    try {
      const score = await vectorService.calculateTextSimilarity(testCase.textA, testCase.textB);
      
      console.log(`- Calculated Similarity Score: ${score.toFixed(4)}`);
      
      if (score >= testCase.expectedMinScore && score <= testCase.expectedMaxScore) {
        console.log(`\x1b[32m[PASS]\x1b[0m Score is within expected range (${testCase.expectedMinScore} to ${testCase.expectedMaxScore})\n`);
        passed++;
      } else {
        console.log(`\x1b[31m[FAIL]\x1b[0m Score is outside expected range (${testCase.expectedMinScore} to ${testCase.expectedMaxScore})\n`);
        failed++;
      }
    } catch (error: any) {
      console.log(`\x1b[31m[ERROR]\x1b[0m Failed to calculate similarity: ${error.message}\n`);
      failed++;
    }
  }

  console.log('--- Summary ---');
  console.log(`Total: ${testCases.length} | Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[31m${failed}\x1b[0m`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSanityChecks();
