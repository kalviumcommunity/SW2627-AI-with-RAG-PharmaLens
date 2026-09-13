import dotenv from 'dotenv';
dotenv.config();

import { llmService } from '../src/services/llm.service';
import { vectorService } from '../src/services/vector.service';
import { rerankChunks, RerankMatch } from '../src/utils/reranker';
import { env } from '../src/config/env';

const TEST_QUERIES = [
  "What are the side effects of this medication?",
  "What is the recommended dosage for adults?",
  "Can I take this on an empty stomach?",
  "Tell me a joke about a penguin." // Deliberate failure test
];

async function runEvaluation() {
  console.log('🧪 Starting Retrieval Evaluation Harness...\n');

  // Initialize Pinecone
  if (!env.pineconeApiKey || !env.pineconeIndex) {
    console.error('❌ Missing Pinecone credentials in .env');
    process.exit(1);
  }

  console.log('⏳ Initializing Vector DB connection...');
  await vectorService.initializeDatabase();
  console.log('✅ Connected to Pinecone.\n');

  let totalQueries = 0;
  let successfulRecalls = 0;

  for (const query of TEST_QUERIES) {
    totalQueries++;
    console.log(`\n======================================================`);
    console.log(`🔎 QUERY [${totalQueries}]: "${query}"`);
    console.log(`======================================================`);

    try {
      console.log(`  [1] Generating embedding for query...`);
      const vectors = await llmService.generateEmbeddings([query]);
      
      if (!vectors || vectors.length === 0) {
        console.error(`  ❌ Failed to generate embedding.`);
        continue;
      }

      console.log(`  [2] Performing Semantic Search (Top K = 10)...`);
      const rawMatches = await vectorService.queryVectors(vectors[0], 10);
      
      console.log(`  [3] Applying Relevance Threshold (Score >= 0.4)...`);
      const relevantMatches = rawMatches.filter((m: any) => m.score && m.score >= 0.4);
      console.log(`      -> ${relevantMatches.length} chunks survived the semantic threshold.`);

      if (relevantMatches.length === 0) {
        console.log(`  ⚠️  NO RELEVANT CONTEXT FOUND. LLM will respond from baseline knowledge.`);
        continue;
      }

      successfulRecalls++;

      console.log(`  [4] Executing Lexical Re-Ranking...`);
      const finalChunks = rerankChunks(query, relevantMatches as RerankMatch[], 3);

      console.log(`\n  ✅ TOP RESULT:`);
      const bestMatch = finalChunks[0];
      console.log(`      File:       ${bestMatch.metadata.filename}`);
      console.log(`      Base Score: ${bestMatch.score.toFixed(4)}`);
      console.log(`      Re-Ranked:  ${(bestMatch as any).hybridScore.toFixed(4)}`);
      console.log(`      Preview:    "${bestMatch.metadata.text.substring(0, 100)}..."`);
      
    } catch (err: any) {
      console.error(`  ❌ Error processing query: ${err.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 EVALUATION SUMMARY`);
  console.log(`======================================================`);
  console.log(`Total Test Queries:   ${totalQueries}`);
  console.log(`Queries with Context: ${successfulRecalls}`);
  console.log(`Recall Rate:          ${((successfulRecalls / totalQueries) * 100).toFixed(1)}%`);
  console.log(`======================================================`);
  
  process.exit(0);
}

runEvaluation();
